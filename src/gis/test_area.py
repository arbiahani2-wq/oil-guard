from src.inference.predictor import OilSpillPredictor
from src.gis.area import compute_area

MODEL_PATH = r"D:\oil-spill-detection2\models\best_deeplabv3plus_resnet50.pth"

IMAGE_PATH = r"TON_IMAGE.tif"

predictor = OilSpillPredictor(
    MODEL_PATH
)

mask = predictor.predict(
    IMAGE_PATH
)

result = compute_area(
    mask,
    IMAGE_PATH
)

print(result)