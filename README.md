# Fashion MNIST CNN Classifier

An interactive web dashboard powered by a Convolutional Neural Network (CNN) that classifies 10 categories of fashion items from the Fashion MNIST dataset.

![Python](https://img.shields.io/badge/Python-3.10+-blue?logo=python&logoColor=white)
![TensorFlow](https://img.shields.io/badge/TensorFlow-2.x-orange?logo=tensorflow&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-2.x-lightgrey?logo=flask&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

- **Draw** — Sketch a clothing item on an interactive canvas
- **Upload** — Drag & drop or browse a clothing image (PNG/JPG)
- **Dataset Sampler** — Pick from 24 real Fashion MNIST test images
- **Real-time Predictions** — See confidence scores across all 10 classes
- **Model Visualization** — Explore the CNN architecture and training metrics

## Fashion Classes

| ID | Category     | ID | Category   |
|----|-------------|----|-----------  |
| 0  | T-shirt/top | 5  | Sandal     |
| 1  | Trouser     | 6  | Shirt      |
| 2  | Pullover    | 7  | Sneaker    |
| 3  | Dress       | 8  | Bag        |
| 4  | Coat        | 9  | Ankle boot |

## Model Architecture

```
Input (28×28×1) → Conv2D(32) → MaxPool → Conv2D(64) → MaxPool → Flatten → Dense(64) → Dense(10, Softmax)
```

- **Optimizer:** Adam
- **Loss:** Sparse Categorical Crossentropy
- **Test Accuracy:** ~90.9%
- **Parameters:** ~93K

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/fashion-mnist-cnn.git
cd fashion-mnist-cnn
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Train the model

```bash
python train_model.py
```

This will:
- Download the Fashion MNIST dataset
- Train the CNN for 10 epochs
- Save the model as `fashion_mnist_model.h5`
- Generate `static/test_samples.json` and `static/training_history.json`

### 4. Run the web app

```bash
python app.py
```

Open [http://localhost:5000](http://localhost:5000) in your browser.

## Deploy to Render

We have optimized the repository configurations to support instant deployment on Render:
- The trained CNN model (`fashion_mnist_model.h5`) and interactive dataset sampler files are pre-built and tracked in Git.
- This ensures Render does not need to compile or train the model during deployment, avoiding build timeouts or memory limit crashes on Render's free tier.

### Step-by-Step Deployment Guide:

1. **Initialize Git & Push to GitHub**:
   In your project directory, run the following commands in your terminal to initialize Git and upload the code:
   ```bash
   git init
   git add .
   git commit -m "Initialize project with pre-trained model and frontend"
   # Create a repository on GitHub first, then run:
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/fashion-mnist-cnn.git
   git push -u origin main
   ```

2. **Deploy on Render**:
   - Go to [render.com](https://render.com) and log in.
   - Click **New** → **Blueprint** (or **Web Service**).
   - Connect your GitHub repository.
   - Render will automatically read `render.yaml` and configure:
     - **Name**: `fashion-mnist-cnn`
     - **Runtime**: `Python`
     - **Build Command**: `pip install -r requirements.txt` (extremely fast!)
     - **Start Command**: `gunicorn app:app --bind 0.0.0.0:$PORT`
   - Click **Deploy** and your interactive fashion classifier will be live!

> [!NOTE]
> If you make changes to the model architecture and want to retrain it, simply run `python train_model.py` locally to regenerate the `.h5` model and JSON files, then commit and push them to GitHub. Render will automatically rebuild and redeploy.

## Project Structure

```
fashion-mnist-cnn/
├── app.py                  # Flask server + prediction API
├── train_model.py          # Model training + data generation script
├── requirements.txt        # Python dependencies
├── Procfile                # Render/Heroku start command
├── render.yaml             # Render Blueprint config
├── .gitignore
├── README.md
├── Fashion_MNIST_CNN_Project.ipynb  # Jupyter notebook exploration
└── static/
    ├── index.html          # Frontend dashboard
    ├── style.css           # Premium dark theme styles
    └── app.js              # Interactive UI logic + charts
```

## Tech Stack

- **Backend:** Python, Flask, TensorFlow/Keras, NumPy, Pillow
- **Frontend:** HTML5, CSS3 (Glassmorphism), JavaScript, Chart.js
- **Deployment:** Gunicorn, Render

## License

MIT License — feel free to use, modify, and distribute.
