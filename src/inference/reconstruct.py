import numpy as np
from typing import List, Tuple

def reconstruct_mask(
    pred_patches: List[np.ndarray], 
    coords: List[Tuple[int, int]], 
    original_height: int, 
    original_width: int, 
    patch_size: int = 512
) -> np.ndarray:
    """
    Reconstructs the full size mask from the predicted patches.
    """
    mask_full = np.zeros((original_height, original_width), dtype=np.uint8)
    
    for idx, (y, x) in enumerate(coords):
        patch = pred_patches[idx]
        
        # Determine how much of the patch goes into the mask (in case of padding)
        h_end = min(y + patch_size, original_height)
        w_end = min(x + patch_size, original_width)
        
        p_h = h_end - y
        p_w = w_end - x
        
        mask_full[y:h_end, x:w_end] = patch[:p_h, :p_w]
        
    return mask_full
