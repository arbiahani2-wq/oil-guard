from src.inference.predictor import OilSpillPredictor

MODEL_PATH = (
    "models/"
    "best_deeplabv3plus_resnet50.pth"
)

IMAGE_PATH = (
    "image.tif"
)

predictor = OilSpillPredictor(
    MODEL_PATH
)

mask = predictor.predict(
    IMAGE_PATH
)

print(mask.shape)
print(mask.sum())