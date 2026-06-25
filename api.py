import os
import time
import shutil
import logging
import geopandas as gpd
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import json
import websockets
import asyncio

from src.pipeline.pipeline import OilSpillPipeline

# Create necessary directories
UPLOAD_DIR = "data/raw/uploads"
OUTPUTS_DIR = "outputs"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUTS_DIR, exist_ok=True)

# Initialize pipeline lazily to save startup time
pipeline = None

# Helper to find available OGIM candidate paths
def get_ogim_path():
    candidates = [
        r"data/ogim/OGIM_v2.7.gpkg",
        r"data/ogim/OGIM_mediterranean.gpkg",
        r"data\ogim\OGIM_v2.7.gpkg",
        r"data\ogim\OGIM_mediterranean.gpkg"
    ]
    for candidate in candidates:
        if os.path.exists(candidate):
            return candidate
    return candidates[0]

# Function to download model if missing
def download_model_if_missing():
    model_path = r"data/models/best_deeplabv3plus_resnet50.pth"
    if os.path.exists(model_path):
        return
    
    fallback_model = r"final_models\DeepLabV3Plus_ResNet50_Dice08712_IoU07761_Epoch7.pth"
    if os.path.exists(fallback_model):
        return
        
    model_url = os.getenv("MODEL_URL")
    if not model_url:
        logging.warning("Model weights are missing, and no MODEL_URL environment variable is set. API queries will fail.")
        return
        
    logging.info(f"Model weights not found. Downloading from MODEL_URL: {model_url}...")
    try:
        import requests
        os.makedirs(os.path.dirname(model_path), exist_ok=True)
        
        headers = {}
        hf_token = os.getenv("HF_TOKEN")
        if hf_token:
            headers["Authorization"] = f"Bearer {hf_token}"
            
        response = requests.get(model_url, headers=headers, stream=True)
        response.raise_for_status()
        with open(model_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
        logging.info("Model downloaded successfully!")
    except Exception as e:
        logging.error(f"Failed to download model from {model_url}: {e}")

# Trigger model download immediately on startup/import
download_model_if_missing()

# In-memory cache for OGIM Mediterranean data (loaded once on first request)
_ogim_cache = None
OGIM_PATH = get_ogim_path()
MED_BBOX = (10.0, 28.0, 42.0, 47.0)  # Mediterranean: min_lon, min_lat, max_lon, max_lat

def _load_ogim_cache():
    """Load Mediterranean platforms + wells from .gpkg once and cache in memory."""
    global _ogim_cache, OGIM_PATH
    if _ogim_cache is not None:
        return _ogim_cache
    
    OGIM_PATH = get_ogim_path()
    records = []
    for layer, layer_type in [("Offshore_Platforms", "Platform"), ("Oil_and_Natural_Gas_Wells", "Well")]:
        try:
            gdf = gpd.read_file(OGIM_PATH, layer=layer, bbox=MED_BBOX)
            for _, row in gdf.iterrows():
                lat = row.get("LATITUDE") or (row.geometry.y if row.geometry else None)
                lon = row.get("LONGITUDE") or (row.geometry.x if row.geometry else None)
                if lat is None or lon is None:
                    continue
                records.append({
                    "name": str(row.get("FAC_NAME") or "Unknown"),
                    "type": layer_type,
                    "fac_type": str(row.get("FAC_TYPE") or layer_type),
                    "operator": str(row.get("OPERATOR") or "Unknown"),
                    "country": str(row.get("COUNTRY") or "Unknown"),
                    "status": str(row.get("FAC_STATUS") or "Unknown"),
                    "lat": float(lat),
                    "lon": float(lon),
                    "install_date": str(row.get("INSTALL_DATE") or ""),
                    "commodity": str(row.get("COMMODITY") or ""),
                })
        except Exception as e:
            logging.warning(f"Failed loading OGIM layer {layer} from {OGIM_PATH}: {e}")
    _ogim_cache = records
    logging.info(f"OGIM cache loaded: {len(records)} Mediterranean features from {OGIM_PATH}")
    return _ogim_cache

app = FastAPI(title="OilGuard API")

# Enable CORS for the Next.js dashboard
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount outputs for static file access (maps, pdfs, geojson)
app.mount("/outputs", StaticFiles(directory="outputs"), name="outputs")

def get_pipeline():
    global pipeline
    if pipeline is None:
        logging.info("Initializing OilSpillPipeline...")
        
        # Ensure model is present (e.g. if env vars were set post-startup or downloaded asynchronously)
        download_model_if_missing()
        
        model_path = r"data/models/best_deeplabv3plus_resnet50.pth"
        if not os.path.exists(model_path):
            fallback_model = r"final_models\DeepLabV3Plus_ResNet50_Dice08712_IoU07761_Epoch7.pth"
            if os.path.exists(fallback_model):
                model_path = fallback_model
                logging.info(f"Using fallback model: {model_path}")
            else:
                logging.error(f"Model not found at {model_path} or fallback {fallback_model}")
                raise RuntimeError("Model file not found. Please ensure the model exists.")
                
        ogim_path = get_ogim_path()
        if not os.path.exists(ogim_path):
            logging.warning(f"OGIM database not found. Pipeline may fail if it requires it.")
        else:
            logging.info(f"Using OGIM database at: {ogim_path}")
        
        pipeline = OilSpillPipeline(
            model_path=model_path,
            ogim_path=ogim_path
        )
    return pipeline

from fastapi import FastAPI, UploadFile, File, HTTPException, Query, Form

@app.post("/analyze")
async def analyze_image(
    file: UploadFile = File(...),
    confidence: float = Form(0.85),
    min_area: float = Form(0.5),
    infra_critical: float = Form(2.0),
    infra_high: float = Form(5.0),
    infra_medium: float = Form(15.0),
    poll_critical: float = Form(50.0),
    poll_high: float = Form(10.0),
    poll_medium: float = Form(1.0),
    coast_critical: float = Form(5.0),
    coast_warning: float = Form(20.0)
):
    if not file.filename.endswith(('.tif', '.tiff')):
        raise HTTPException(status_code=400, detail="Only .tif or .tiff files are supported.")
        
    analysis_id = time.strftime("%Y%m%d-%H%M%S")
    
    # Save uploaded file
    file_path = os.path.join(UPLOAD_DIR, f"{analysis_id}_{file.filename}")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Setup dedicated output directory for this analysis
    run_output_dir = os.path.join(OUTPUTS_DIR, analysis_id)
    os.makedirs(os.path.join(run_output_dir, "masks"), exist_ok=True)
    os.makedirs(os.path.join(run_output_dir, "geojson"), exist_ok=True)
    os.makedirs(os.path.join(run_output_dir, "reports"), exist_ok=True)
    os.makedirs(os.path.join(run_output_dir, "maps"), exist_ok=True)
    os.makedirs(os.path.join(run_output_dir, "logs"), exist_ok=True)
    
    # Run pipeline
    p = get_pipeline()
    try:
        p.run(
            image_path=file_path, 
            output_dir=run_output_dir, 
            confidence=confidence, 
            min_area=min_area,
            infra_critical=infra_critical,
            infra_high=infra_high,
            infra_medium=infra_medium,
            poll_critical=poll_critical,
            poll_high=poll_high,
            poll_medium=poll_medium,
            coast_critical=coast_critical,
            coast_warning=coast_warning
        )
        return {"id": analysis_id, "status": "success", "message": "Analysis completed successfully."}
    except Exception as e:
        logging.error(f"Analysis failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/reports")
def list_reports():
    """List all available reports."""
    reports = []
    if not os.path.exists(OUTPUTS_DIR):
        return reports
        
    for item in sorted(os.listdir(OUTPUTS_DIR), reverse=True):
        report_path = os.path.join(OUTPUTS_DIR, item, "reports", "report.json")
        if os.path.exists(report_path):
            try:
                with open(report_path, "r") as f:
                    data = json.load(f)
                    # Add the ID for frontend routing
                    data["id"] = item
                    # Also build static paths for maps and pdfs
                    data["map_url"] = f"/outputs/{item}/maps/spill_map.html"
                    data["pdf_url"] = f"/outputs/{item}/reports/report.pdf"
                    data["geojson_url"] = f"/outputs/{item}/geojson/oil_spill.geojson"
                    reports.append(data)
            except Exception as e:
                logging.error(f"Error reading {report_path}: {e}")
    return reports

@app.get("/reports/{analysis_id}")
def get_report(analysis_id: str):
    report_path = os.path.join(OUTPUTS_DIR, analysis_id, "reports", "report.json")
    if not os.path.exists(report_path):
        raise HTTPException(status_code=404, detail="Report not found")
        
    with open(report_path, "r") as f:
        data = json.load(f)
        data["id"] = analysis_id
        data["map_url"] = f"/outputs/{analysis_id}/maps/spill_map.html"
        data["pdf_url"] = f"/outputs/{analysis_id}/reports/report.pdf"
        data["geojson_url"] = f"/outputs/{analysis_id}/geojson/oil_spill.geojson"
        data["mask_url"] = f"/outputs/{analysis_id}/masks/mask.png"
        return data

@app.get("/ogim/stats")
def ogim_stats():
    """Return counts of Mediterranean infrastructure by type."""
    try:
        records = _load_ogim_cache()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    platforms = sum(1 for r in records if r["type"] == "Platform")
    wells = sum(1 for r in records if r["type"] == "Well")
    return {"total": len(records), "platforms": platforms, "wells": wells}

@app.get("/ogim")
def list_ogim(
    q: str = Query(default="", description="Search name, operator, country, fac_type"),
    type: str = Query(default="All", description="All | Platform | Well"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
):
    """Return paginated Mediterranean OGIM infrastructure from the real .gpkg file."""
    if not os.path.exists(OGIM_PATH):
        raise HTTPException(status_code=404, detail="OGIM database file not found")
    try:
        records = _load_ogim_cache()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load OGIM data: {e}")

    q_lower = q.strip().lower()
    filtered = [
        r for r in records
        if (not q_lower or
            q_lower in r["name"].lower() or
            q_lower in r["operator"].lower() or
            q_lower in r["country"].lower() or
            q_lower in r["fac_type"].lower())
        and (type == "All" or r["type"] == type)
    ]

    total = len(filtered)
    start = (page - 1) * page_size
    page_records = filtered[start: start + page_size]

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": max(1, (total + page_size - 1) // page_size),
        "results": page_records,
    }

@app.websocket("/ws/ais")
async def websocket_ais_proxy(websocket: WebSocket):
    await websocket.accept()
    try:
        # Receive subscription request from client (contains bounding box, APIKey, etc.)
        client_data = await websocket.receive_text()
        client_msg = json.loads(client_data)
        
        # Connect to AISStream WebSocket
        async with websockets.connect("wss://stream.aisstream.io/v0/stream") as ais_ws:
            # Send subscription message to AISStream
            await ais_ws.send(json.dumps(client_msg))
            
            # Forward messages from AISStream to client
            async def forward_to_client():
                async for message in ais_ws:
                    await websocket.send_text(message)
                    
            # Listen to client (for closing or updates)
            async def listen_to_client():
                try:
                    async for message in websocket.iter_text():
                        # If client sends a new subscription message, forward it
                        await ais_ws.send(message)
                except Exception:
                    pass
            
            # Run both tasks concurrently and exit as soon as one fails/completes
            forward_task = asyncio.create_task(forward_to_client())
            listen_task = asyncio.create_task(listen_to_client())
            
            done, pending = await asyncio.wait(
                [forward_task, listen_task],
                return_when=asyncio.FIRST_COMPLETED
            )
            
            for task in pending:
                task.cancel()
            
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"AIS Proxy error: {e}. Falling back to simulated AIS stream...", flush=True)
        try:
            # Parse bounding box from client message to center the mock vessels
            bbox = client_msg.get("BoundingBoxes", [[[35.5, 34.8], [35.5, 34.8]]])[0]
            lat_min, lon_min = bbox[0][0], bbox[0][1]
            lat_max, lon_max = bbox[1][0], bbox[1][1]
            center_lat = (lat_min + lat_max) / 2.0
            center_lon = (lon_min + lon_max) / 2.0
            
            # Setup 4 realistic mock ships around the spill
            mock_ships = [
                {"mmsi": "228384000", "name": "MED CORAL", "type": "Cargo", "speed": 12.5, "heading": 45, "lat": center_lat + 0.05, "lon": center_lon - 0.08},
                {"mmsi": "247385000", "name": "NAVIGATOR II", "type": "Tanker", "speed": 8.2, "heading": 180, "lat": center_lat - 0.1, "lon": center_lon + 0.1},
                {"mmsi": "229380000", "name": "STAR EXPLORER", "type": "Passenger", "speed": 15.0, "heading": 270, "lat": center_lat + 0.08, "lon": center_lon + 0.05},
                {"mmsi": "209485000", "name": "OCEAN PROTECTOR", "type": "Support", "speed": 4.1, "heading": 90, "lat": center_lat - 0.05, "lon": center_lon - 0.05}
            ]
            
            # Send warning to map that we are running simulated vessels
            await websocket.send_text(json.dumps({
                "error": "simulated",
                "message": "Real AIS stream rate-limited. Running simulated vessel tracking."
            }))
            
            # Send static names and types first
            for ship in mock_ships:
                static_msg = {
                    "MessageType": "ShipStaticData",
                    "MetaData": {"MMSI": ship["mmsi"]},
                    "Message": {
                        "ShipStaticData": {
                            "Name": ship["name"],
                            "ShipType": ship["type"]
                        }
                    }
                }
                await websocket.send_text(json.dumps(static_msg))
                await asyncio.sleep(0.1)
                
            # Loop sending positions indefinitely
            import math
            while True:
                for ship in mock_ships:
                    # Move ship slightly: speed * scaling factor
                    speed_deg = ship["speed"] * 0.00001
                    rad = math.radians(ship["heading"])
                    ship["lat"] += speed_deg * math.cos(rad)
                    ship["lon"] += speed_deg * math.sin(rad)
                    
                    pos_msg = {
                        "MessageType": "PositionReport",
                        "MetaData": {
                            "MMSI": ship["mmsi"],
                            "Time_UTC": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                        },
                        "Message": {
                            "PositionReport": {
                                "Latitude": ship["lat"],
                                "Longitude": ship["lon"],
                                "Sog": ship["speed"],
                                "TrueHeading": ship["heading"],
                                "NavigationalStatus": "Under Way Using Engine"
                            }
                        }
                    }
                    await websocket.send_text(json.dumps(pos_msg))
                await asyncio.sleep(3.0)
        except WebSocketDisconnect:
            pass
        except Exception as sim_err:
            print(f"AIS Simulation loop ended: {sim_err}", flush=True)

# Start server: uvicorn api:app --reload
