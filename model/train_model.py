import os
import joblib
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(BASE_DIR, "dataset", "commands.csv")
SAVE_DIR = os.path.join(BASE_DIR, "model", "saved")

print("BASE_DIR:", BASE_DIR)
print("DATA_PATH:", DATA_PATH)

if not os.path.exists(DATA_PATH):
    raise FileNotFoundError(f"Dataset not found at: {DATA_PATH}")

os.makedirs(SAVE_DIR, exist_ok=True)

df = pd.read_csv(DATA_PATH)

if "text" not in df.columns or "intent" not in df.columns:
    raise ValueError("commands.csv must contain 'text' and 'intent' columns")

df = df.dropna()
df["text"] = df["text"].astype(str).str.strip().str.lower()
df["intent"] = df["intent"].astype(str).str.strip()

print("\nDataset size:", len(df))
print("\nClass counts:\n", df["intent"].value_counts())

label_encoder = LabelEncoder()
X = df["text"]
y = label_encoder.fit_transform(df["intent"])

print("\nLoaded classes:", list(label_encoder.classes_))

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y
)

pipeline = Pipeline([
    ("tfidf", TfidfVectorizer(ngram_range=(1, 2), lowercase=True)),
    ("clf", LogisticRegression(max_iter=2000, class_weight="balanced"))
])

pipeline.fit(X_train, y_train)

y_pred = pipeline.predict(X_test)
acc = accuracy_score(y_test, y_pred)

print("\nAccuracy:", round(acc, 4))
print("\nClassification Report:\n")
print(
    classification_report(
        y_test,
        y_pred,
        target_names=label_encoder.classes_,
        zero_division=0
    )
)

print("Confusion Matrix:\n")
print(confusion_matrix(y_test, y_pred))

joblib.dump(pipeline, os.path.join(SAVE_DIR, "intent_model.joblib"))
joblib.dump(label_encoder, os.path.join(SAVE_DIR, "label_encoder.joblib"))
joblib.dump(
    {
        "classes": list(label_encoder.classes_),
        "accuracy": float(acc),
        "model_type": "TF-IDF + LogisticRegression",
        "dataset_size": int(len(df)),
        "data_path": DATA_PATH
    },
    os.path.join(SAVE_DIR, "metadata.joblib")
)

print("\nSaved model files to:", SAVE_DIR)