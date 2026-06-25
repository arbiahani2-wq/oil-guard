import geopandas as gpd
from shapely.geometry import shape


class OGIMDistance:

    def __init__(self, gdf):

        self.gdf = gdf.to_crs(epsg=3857)

    def min_distance(self, polygon):

        # convert input polygon
        geom = shape(polygon)

        geom_gdf = gpd.GeoSeries([geom], crs="EPSG:4326").to_crs(epsg=3857)

        geom_proj = geom_gdf.iloc[0]

        distances = self.gdf.distance(geom_proj)

        return float(distances.min())