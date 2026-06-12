import os
import io
import base64
import numpy as np
from flask import Flask, request, jsonify
from PIL import Image
import tensorflow as tf

app = Flask(__name__, static_folder='static', static_url_path='/static')

# Disable GPU warning logs
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

# Global variable for the model
model = None
CLASS_NAMES = ['T-shirt/top', 'Trouser', 'Pullover', 'Dress', 'Coat',
               'Sandal', 'Shirt', 'Sneaker', 'Bag', 'Ankle boot']

def load_keras_model():
    global model
    model_path = 'fashion_mnist_model.h5'
    if os.path.exists(model_path):
        print(f"Loading Keras model from {model_path}...")
        model = tf.keras.models.load_model(model_path)
        print("Model loaded successfully!")
    else:
        print(f"Error: Model file '{model_path}' not found! Please run train_model.py first.")

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    if model is None:
        return jsonify({"error": "Model not loaded. Please run train_model.py first."}), 500
        
    try:
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({"error": "Missing 'image' parameter in request."}), 400
            
        # Extract base64 image data
        image_data = data['image']
        if ',' in image_data:
            image_data = image_data.split(',')[1]
            
        decoded_image = base64.b64decode(image_data)
        
        # Open image with PIL
        img = Image.open(io.BytesIO(decoded_image))
        
        # Preprocessing:
        # 1. Convert to grayscale
        img_gray = img.convert('L')
        
        # 2. Resize to 28x28 (Fashion MNIST size) using Lanzcos interpolation
        img_resized = img_gray.resize((28, 28), Image.Resampling.LANCZOS)
        
        img_array = np.array(img_resized)
        
        # 3. Check background brightness and invert if background is white/light.
        # Fashion MNIST features a black background (0) and white foreground (255).
        # We calculate the average intensity of the border pixels.
        border_pixels = np.concatenate([
            img_array[0, :],      # top row
            img_array[-1, :],     # bottom row
            img_array[:, 0],      # left column
            img_array[:, -1]      # right column
        ])
        border_mean = border_pixels.mean()
        
        # If the border (background) is white/light, invert colors
        if border_mean > 127:
            img_array = 255 - img_array
            
        # 4. Normalize pixel values to range [0, 1]
        img_norm = img_array / 255.0
        
        # 5. Reshape to input format expected by model: (1, 28, 28, 1)
        img_input = img_norm.reshape(1, 28, 28, 1)
        
        # 6. Run model prediction
        predictions = model.predict(img_input)[0]
        
        # Format the response
        results = []
        for i, prob in enumerate(predictions):
            results.append({
                "class": CLASS_NAMES[i],
                "probability": float(prob)
            })
            
        # Sort predictions by probability (highest first)
        results = sorted(results, key=lambda x: x['probability'], reverse=True)
        
        return jsonify({
            "success": True,
            "predictions": results,
            "top_class": results[0]['class'],
            "top_probability": results[0]['probability']
        })
        
    except Exception as e:
        print(f"Prediction error: {str(e)}")
        return jsonify({"error": f"Failed to process image: {str(e)}"}), 500

# Load model at startup (works for both gunicorn and direct python run)
load_keras_model()

if __name__ == '__main__':
    # Run server locally on port 5000
    app.run(host='0.0.0.0', port=5000, debug=True)
