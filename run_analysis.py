import argparse
import logging
import os
import sys

from src.pipeline.pipeline import OilSpillPipeline

def setup_logging(log_dir: str):
    os.makedirs(log_dir, exist_ok=True)
    log_file = os.path.join(log_dir, "pipeline.log")
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file),
            logging.StreamHandler(sys.stdout)
        ]
    )

def main():
    parser = argparse.ArgumentParser(description="Oil Spill Detection Pipeline")
    parser.add_argument("image", help="Path to the input Sentinel-1 GeoTIFF image")
    parser.add_argument("--model", default=r"data/models/best_deeplabv3plus_resnet50.pth", help="Path to the model weights")
    parser.add_argument("--ogim", default=r"data/ogim/OGIM_v2.7.gpkg", help="Path to OGIM database")
    parser.add_argument("--device", default=None, help="Device to use (cuda or cpu)")
    
    args = parser.parse_args()
    
    # Ensure directories exist
    output_dir = "outputs"
    os.makedirs(os.path.join(output_dir, "masks"), exist_ok=True)
    os.makedirs(os.path.join(output_dir, "geojson"), exist_ok=True)
    os.makedirs(os.path.join(output_dir, "reports"), exist_ok=True)
    os.makedirs(os.path.join(output_dir, "maps"), exist_ok=True)
    os.makedirs(os.path.join(output_dir, "logs"), exist_ok=True)
    
    setup_logging(os.path.join(output_dir, "logs"))
    logger = logging.getLogger("Main")
    
    # Verify input paths
    if not os.path.exists(args.image):
        logger.error(f"Image not found: {args.image}")
        sys.exit(1)
        
    if not os.path.exists(args.model):
        logger.error(f"Model not found: {args.model}. Please update the path or download the model.")
        # For testing purposes, we don't exit here if user provides wrong default paths, they might pass it in CLI
        # But we'll try to find it in the test-fait location if possible:
        fallback_model = r"final_models\DeepLabV3Plus_ResNet50_Dice08712_IoU07761_Epoch7.pth"
        if os.path.exists(fallback_model):
            args.model = fallback_model
            logger.info(f"Using fallback model: {args.model}")
        else:
            sys.exit(1)
            
    if not os.path.exists(args.ogim):
        logger.error(f"OGIM database not found: {args.ogim}.")
        # Fallback check
        if os.path.exists(r"data\ogim\OGIM_v2.7.gpkg"):
            args.ogim = r"data\ogim\OGIM_v2.7.gpkg"
        else:
            sys.exit(1)
            
    try:
        pipeline = OilSpillPipeline(
            model_path=args.model,
            ogim_path=args.ogim,
            device=args.device
        )
        
        pipeline.run(image_path=args.image, output_dir=output_dir)
        
    except Exception as e:
        logger.error(f"Pipeline failed: {e}", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    main()
