import rasterio
import numpy as np
from typing import List, Tuple, Dict
from src.pipeline.types import ImageMetadata

def load_and_patch_image(image_path: str, patch_size: int = 512) -> Tuple[List[np.ndarray], List[Tuple[int, int]], ImageMetadata]:
    """
    Loads a Sentinel-1 GeoTIFF image and cuts it into non-overlapping patches.
    Returns:
        patches: List of image patches [C, H, W]
        coords: List of (y, x) top-left coordinates for each patch
        metadata: Image metadata
    """
    with rasterio.open(image_path) as src:
        img = src.read() # Expected shape: (C, H, W)
        
        # Sometimes image might be only (H, W), we add channel dim if missing
        if len(img.shape) == 2:
            img = np.expand_dims(img, axis=0)
            
        C, H, W = img.shape
        transform = src.transform
        crs = src.crs
        bounds = src.bounds
        pixel_deg = transform.a
        
        metadata = ImageMetadata(
            width=W,
            height=H,
            transform=transform,
            crs=crs,
            bounds=bounds,
            pixel_deg=pixel_deg
        )
        
        patches = []
        coords = []
        
        # Cut into patches (padding could be added if dimensions aren't exact multiples,
        # but the notebook assumes 2048x2048 which divides by 512 perfectly).
        # We will iterate with the patch_size.
        for y in range(0, H, patch_size):
            for x in range(0, W, patch_size):
                # We take slices. If it goes out of bounds, numpy handles it, 
                # but we should ensure the patch is padded to patch_size if needed.
                patch = img[:, y:y+patch_size, x:x+patch_size]
                
                # Pad if the patch is smaller than patch_size
                _, p_h, p_w = patch.shape
                if p_h < patch_size or p_w < patch_size:
                    padded = np.zeros((C, patch_size, patch_size), dtype=img.dtype)
                    padded[:, :p_h, :p_w] = patch
                    patch = padded
                    
                patches.append(patch)
                coords.append((y, x))
                
        return patches, coords, metadata
