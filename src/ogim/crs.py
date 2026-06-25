def normalize_crs(gdf, target_epsg=3857):

    if gdf.crs.to_epsg() != target_epsg:

        gdf = gdf.to_crs(epsg=target_epsg)

    return gdf