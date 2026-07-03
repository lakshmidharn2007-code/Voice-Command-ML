import os
import joblib
import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(BASE_DIR, "model", "saved")

model = joblib.load(os.path.join(MODEL_DIR, "intent_model.joblib"))
label_encoder = joblib.load(os.path.join(MODEL_DIR, "label_encoder.joblib"))
metadata = joblib.load(os.path.join(MODEL_DIR, "metadata.joblib"))

app = FastAPI(title="Voice Command Intent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PredictRequest(BaseModel):
    text: str

@app.get("/")
def home():
    return {
        "message": "Voice Command Intent API is running",
        "classes": metadata.get("classes", []),
        "model_type": metadata.get("model_type", "Unknown"),
        "accuracy": metadata.get("accuracy", None),
        "dataset_size": metadata.get("dataset_size", None)
    }

@app.get("/debug")
def debug():
    return {
        "loaded_classes": metadata.get("classes", []),
        "dataset_size": metadata.get("dataset_size", None),
        "model_type": metadata.get("model_type", None),
        "accuracy": metadata.get("accuracy", None)
    }

@app.post("/")
def predict(request: PredictRequest):
    text = request.text.strip().lower()

    if not text:
        return {
            "success": False,
            "error": "Empty text received"
        }

    pred_encoded = model.predict([text])[0]
    pred_label = label_encoder.inverse_transform([pred_encoded])[0]

    confidence = None
    top_predictions = []

    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba([text])[0]
        confidence = float(np.max(probabilities))

        top_indices = np.argsort(probabilities)[::-1][:5]
        top_predictions = [
            {
                "intent": label_encoder.inverse_transform([i])[0],
                "probability": float(probabilities[i])
            }
            for i in top_indices
        ]

    return {
        "success": True,
        "input_text": text,
        "predicted_intent": pred_label,
        "confidence": confidence,
        "top_predictions": top_predictions
    }