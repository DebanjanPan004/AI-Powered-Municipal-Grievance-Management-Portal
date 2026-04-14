import os
import sys

model_path = r"D:\SIH Dataset_Split\runs\classify\train\weights\best.pt"

print(f"Checking if model file exists at: {model_path}")
if os.path.exists(model_path):
    print(f"Model file exists at: {model_path}")
    print(f"File size: {os.path.getsize(model_path)} bytes")
else:
    print(f"Model file does not exist at: {model_path}")

try:
    print("Trying to import ultralytics...")
    import ultralytics
    print(f"Ultralytics version: {ultralytics.__version__}")
    
    print("Trying to import PIL (Pillow)...")
    from PIL import Image
    print(f"PIL version: {Image.__version__}")
    
    print("Trying to load the model...")
    from ultralytics import YOLO
    model = YOLO(model_path)
    print("Model loaded successfully!")
    
except Exception as e:
    print(f"Error: {str(e)}")
    import traceback
    traceback.print_exc()