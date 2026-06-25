import os
import json
from src.pipeline.types import PipelineResult, RiskReport
from src.reports.pdf_report import generate_pdf_report
from types import SimpleNamespace

OUTPUTS_DIR = r"d:\oil-spill-detection2\outputs"

def regenerate_pdfs():
    for item in os.listdir(OUTPUTS_DIR):
        report_path = os.path.join(OUTPUTS_DIR, item, "reports", "report.json")
        pdf_path = os.path.join(OUTPUTS_DIR, item, "reports", "report.pdf")
        
        if os.path.exists(report_path):
            with open(report_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                
            # Reconstruct PipelineResult mock
            risk_data = data.get("risk_report", {})
            risk_report = RiskReport(
                level=risk_data.get("level", "LOW"),
                score=risk_data.get("score", 0),
                infrastructure_level=risk_data.get("infrastructure_level", "LOW"),
                infrastructure_score=risk_data.get("infrastructure_score", 0),
                pollution_level=risk_data.get("pollution_level", "LOW"),
                pollution_score=risk_data.get("pollution_score", 0),
                reasons=risk_data.get("reasons", [])
            )
            
            infras = []
            for inf in data.get("nearest_infrastructures", []):
                infras.append(SimpleNamespace(
                    name=inf.get("name", ""),
                    fac_type=inf.get("fac_type", inf.get("type", "")),
                    operator=inf.get("operator", ""),
                    distance_km=inf.get("distance_km", 0.0)
                ))
                
            # Check mask path
            mask_path = os.path.join(OUTPUTS_DIR, item, "masks", "mask.png")
            if not os.path.exists(mask_path):
                mask_path = None
                
            result = PipelineResult(
                image_path=data.get("image_path", "Unknown"),
                mask_path=mask_path,
                spill_polygons=[],  # not needed for PDF except for total area
                total_area_km2=data.get("total_area_km2", 0.0),
                center_lat=data.get("center_lat", 0.0),
                center_lon=data.get("center_lon", 0.0),
                nearest_infrastructures=infras,
                risk_report=risk_report,
                pdf_report_path=""
            )
            
            generate_pdf_report(result, pdf_path)
            print(f"Regenerated PDF for {item}")

if __name__ == "__main__":
    regenerate_pdfs()
