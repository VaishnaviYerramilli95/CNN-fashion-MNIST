import os
import json
import base64
import io
import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, models
from tensorflow.keras.datasets import fashion_mnist
from PIL import Image

def train_and_save():
    print("TensorFlow version:", tf.__version__)
    
    # 1. Load and Preprocess Dataset
    print("Loading Fashion MNIST dataset...")
    (x_train, y_train), (x_test, y_test) = fashion_mnist.load_data()
    
    # Save original test images for creating samples later
    x_test_raw = x_test.copy()
    
    # Normalize images to [0, 1] range
    x_train = x_train / 255.0
    x_test = x_test / 255.0
    
    # Reshape for CNN input: (batch, height, width, channels)
    x_train = x_train.reshape(-1, 28, 28, 1)
    x_test = x_test.reshape(-1, 28, 28, 1)
    
    class_names = ['T-shirt/top', 'Trouser', 'Pullover', 'Dress', 'Coat',
                   'Sandal', 'Shirt', 'Sneaker', 'Bag', 'Ankle boot']
    
    # 2. Build the CNN Model
    print("Building Keras CNN Model...")
    model = models.Sequential([
        tf.keras.Input(shape=(28, 28, 1)),
        layers.Conv2D(32, (3, 3), activation='relu'),
        layers.MaxPooling2D((2, 2)),
        layers.Conv2D(64, (3, 3), activation='relu'),
        layers.MaxPooling2D((2, 2)),
        layers.Flatten(),
        layers.Dense(64, activation='relu'),
        layers.Dense(10, activation='softmax')
    ])
    
    # Compile the model
    model.compile(optimizer='adam',
                  loss='sparse_categorical_crossentropy',
                  metrics=['accuracy'])
    
    model.summary()
    
    # 3. Train the Model
    print("Training the model (10 epochs)...")
    history = model.fit(x_train, y_train, epochs=10, validation_data=(x_test, y_test))
    
    # 4. Evaluate the Model
    test_loss, test_acc = model.evaluate(x_test, y_test, verbose=2)
    print(f"\nTest Accuracy: {test_acc:.4f}")
    
    # 5. Save the Model
    model_path = 'fashion_mnist_model.h5'
    print(f"Saving model to {model_path}...")
    model.save(model_path)
    print("Model saved successfully!")
    
    # 6. Generate JSON of Test Samples for Frontend
    print("Creating static test samples JSON...")
    os.makedirs('static', exist_ok=True)
    
    # Select 24 random test samples
    np.random.seed(42)  # For reproducible random samples
    indices = np.random.choice(len(x_test_raw), 24, replace=False)
    
    samples = []
    for idx in indices:
        pixels = x_test_raw[idx]
        label_id = int(y_test[idx])
        label_name = class_names[label_id]
        
        # Convert to PIL Image and then base64 PNG
        # Resize to 100x100 for better viewing in UI, keeping pixel art sharp (nearest neighbor)
        img = Image.fromarray(pixels.astype('uint8'), mode='L')
        img_resized = img.resize((112, 112), Image.Resampling.NEAREST)
        
        buffered = io.BytesIO()
        img_resized.save(buffered, format="PNG")
        img_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
        
        # We also need the normalized version of raw 28x28 pixel data to do direct verification if needed, 
        # or we will let the backend handle prediction. We'll send the index for identification.
        samples.append({
            "id": int(idx),
            "image": f"data:image/png;base64,{img_base64}",
            "label": label_name,
            "label_id": label_id
        })
        
    with open('static/test_samples.json', 'w') as f:
        json.dump(samples, f, indent=2)
    print("Created static/test_samples.json with 24 images!")
    
    # 7. Save training history metrics as JSON for visual charts in dashboard
    history_dict = {
        "accuracy": [float(val) for val in history.history['accuracy']],
        "val_accuracy": [float(val) for val in history.history['val_accuracy']],
        "loss": [float(val) for val in history.history['loss']],
        "val_loss": [float(val) for val in history.history['val_loss']]
    }
    with open('static/training_history.json', 'w') as f:
        json.dump(history_dict, f, indent=2)
    print("Created static/training_history.json with metrics!")

if __name__ == '__main__':
    train_and_save()
