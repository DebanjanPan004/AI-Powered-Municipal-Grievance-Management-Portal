import streamlit as st
from ultralytics import YOLO
from PIL import Image
import os
from pathlib import Path

# Get current file directory
current_dir = os.path.dirname(os.path.abspath(__file__))

# Use absolute path to the model - this path works
model_path = r"D:\SIH Dataset_Split\runs\classify\train\weights\best.pt"

# Print debug info
print(f"Loading model from: {model_path}")
print(f"File exists: {os.path.exists(model_path)}")

# Load the model
model = YOLO(model_path)

st.title("🚧 Disaster Image Classifier")
st.write("Upload an image to classify it into one of the 4 classes: *Potholes, Fallen Trees, Garbage Overflow, Waterlogging*")

# Upload image
uploaded_file = st.file_uploader("Choose an image...", type=["jpg", "jpeg", "png"])

if uploaded_file is not None:
    # Display uploaded image
    image = Image.open(uploaded_file)
    st.image(image, caption="Uploaded Image", use_container_width=True)

    # Run prediction (quiet mode)
    results = model.predict(image, verbose=False)

    # Get top prediction
    probs = results[0].probs
    class_names = results[0].names
    top_class = class_names[int(probs.top1)]
    confidence = probs.top1conf.item() * 100

    st.success(f"*Prediction:* {top_class} ({confidence:.2f}% confidence)")

    # Show all probabilities
    st.subheader("Class Probabilities")
    for i, prob in enumerate(probs.data):
        st.write(f"{class_names[i]}: {prob*100:.2f}%")