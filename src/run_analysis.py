import sys
from src.pipeline.pipeline import OilSpillPipeline


def main():

    image_path = sys.argv[1]

    pipeline = OilSpillPipeline({
        "model_path": "models/best_deeplabv3plus_resnet50.pth"
    })

    result = pipeline.run(image_path)

    print(result)


if __name__ == "__main__":
    main()