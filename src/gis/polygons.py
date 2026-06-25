import numpy as np
from skimage import measure
from shapely.geometry import Polygon
from typing import List

def extract_polygons_from_mask(mask: np.ndarray, min_points: int = 50, min_area_pixels: int = 1000) -> List[Polygon]:
    """
    Extracts Shapely Polygons from a binary mask.
    Filters out noise based on min_points and min_area_pixels.
    Returns the polygons sorted by area (largest first).
    """
    # find_contours returns list of (N, 2) array of (row, col)
    contours = measure.find_contours(mask, level=0.5)
    
    polygons = []
    
    for contour in contours:
        if len(contour) < min_points:
            continue
            
        # contour is (y, x) -> polygon should be (x, y)
        poly = Polygon([(p[1], p[0]) for p in contour])
        
        if not poly.is_valid:
            poly = poly.buffer(0) # Attempt to fix invalid polygons
            
        if poly.geom_type == 'MultiPolygon':
            for p in poly.geoms:
                if p.area > min_area_pixels:
                    polygons.append(p)
        else:
            if poly.area > min_area_pixels:
                polygons.append(poly)
            
    # Sort by area
    polygons = sorted(polygons, key=lambda p: p.area, reverse=True)
    
    return polygons
