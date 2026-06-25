import torch
import numpy as np
from typing import List
import logging
import segmentation_models_pytorch as smp

logger = logging.getLogger(__name__)

class OilSpillPredictor:
    def __init__(self, model_path: str, device: str = None):
        if device is None:
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        else:
            self.device = torch.device(device)
            
        logger.info(f"Loading DeepLabV3+ on {self.device}...")
        self.model = smp.DeepLabV3Plus(
            encoder_name="resnet50",
            encoder_weights=None,
            in_channels=2,
            classes=1
        )
        
        self.model.load_state_dict(
            torch.load(model_path, map_location=self.device)
        )
        self.model = self.model.to(self.device)
        self.model.eval()
        logger.info("Model loaded successfully.")

    def predict_patches(self, patches: List[np.ndarray], threshold: float = 0.5) -> List[np.ndarray]:
        """
        Runs inference on a list of patches.
        Returns:
            predicted_patches: List of binary masks (numpy arrays)
        """
        pred_patches = []
        
        for patch in patches:
            # Expected shape from patching is (C, H, W)
            patch_tensor = torch.tensor(patch, dtype=torch.float32).unsqueeze(0).to(self.device)
            
            with torch.no_grad():
                pred = self.model(patch_tensor)
                pred = torch.sigmoid(pred)
                pred = (pred > threshold).float()
            
            # squeeze the batch and channel dimensions
            pred_patches.append(pred.squeeze().cpu().numpy().astype(np.uint8))
            
        return pred_patches