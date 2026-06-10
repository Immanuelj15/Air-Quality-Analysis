import os
import json
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import joblib

def main():
    print("[INFO] Starting Model Arena Training Pipeline...")
    
    # Paths setup
    current_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(current_dir, "..", "CRT_AirQuality_1Lakh_Realistic.csv")
    models_dir = os.path.join(current_dir, "models")
    os.makedirs(models_dir, exist_ok=True)
    
    # Load dataset
    print(f"[INFO] Reading dataset from {csv_path}...")
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Dataset not found at {csv_path}")
        
    df = pd.read_csv(csv_path)
    df = df.drop(columns=['RecordID'], errors='ignore')
    df.fillna(df.mean(), inplace=True)
    
    # Split features and target
    X = df.drop(columns=['HealthImpactClass'])
    y = df['HealthImpactClass']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    print(f"[INFO] Dataset split complete. Train shape: {X_train.shape}, Test shape: {X_test.shape}")
    
    # Define models to train
    classifiers = {
        "random_forest": {
            "name": "Random Forest Classifier",
            "model": RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
        },
        "logistic_regression": {
            "name": "Logistic Regression",
            "model": LogisticRegression(max_iter=1000, random_state=42)
        },
        "decision_tree": {
            "name": "Decision Tree Classifier",
            "model": DecisionTreeClassifier(max_depth=10, random_state=42)
        }
    }
    
    metrics_summary = {}
    
    for key, info in classifiers.items():
        print(f"[INFO] Training {info['name']}...")
        
        # Build scaler + model pipeline
        pipeline = Pipeline([
            ('scaler', StandardScaler()),
            ('classifier', info['model'])
        ])
        
        # Train
        pipeline.fit(X_train, y_train)
        
        # Save model pipeline
        model_save_path = os.path.join(models_dir, f"{key}.pkl")
        joblib.dump(pipeline, model_save_path)
        print(f"[SUCCESS] Saved model pipeline to {model_save_path}")
        
        # Evaluate
        y_pred = pipeline.predict(X_test)
        
        acc = accuracy_score(y_test, y_pred)
        prec = precision_score(y_test, y_pred, average='weighted', zero_division=0)
        rec = recall_score(y_test, y_pred, average='weighted', zero_division=0)
        f1 = f1_score(y_test, y_pred, average='weighted', zero_division=0)
        
        metrics_summary[key] = {
            "name": info['name'],
            "accuracy": float(acc),
            "precision": float(prec),
            "recall": float(rec),
            "f1_score": float(f1)
        }
        
        print(f"[RESULTS] Results for {info['name']}: Accuracy = {acc:.4f}, F1-Score = {f1:.4f}")
        
    # Copy random forest to the legacy model spot so app.py / Jupyter fallback works
    legacy_model_path = os.path.join(current_dir, "..", "air_quality_health_model.pkl")
    joblib.dump(joblib.load(os.path.join(models_dir, "random_forest.pkl")), legacy_model_path)
    
    # Save metrics JSON
    metrics_path = os.path.join(models_dir, "metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(metrics_summary, f, indent=4)
    print(f"[INFO] Saved performance metrics summary to {metrics_path}")
    print("[SUCCESS] All models trained and saved successfully!")

if __name__ == "__main__":
    main()
