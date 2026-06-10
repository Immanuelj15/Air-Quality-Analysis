import os
import sys
# Add current directory to path to allow root imports on deployment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import joblib
import pandas as pd
import requests
import json
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import database
import io

app = FastAPI(title="AI Air Quality & Health Risk API")

# Add CORS Middleware to communicate with React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")

# Input Schema for Predictions
class PredictRequest(BaseModel):
    model: str # random_forest, logistic_regression, decision_tree
    aqi: float
    pm10: float
    pm2_5: float
    no2: float
    so2: float
    o3: float
    temperature: float
    humidity: float
    windSpeed: float
    respiratoryCases: int
    cardiovascularCases: int
    hospitalAdmissions: int
    healthImpactScore: float
    cityName: Optional[str] = "Unknown"
    emailAlertRecipient: Optional[str] = ""
    emailAlertThreshold: Optional[float] = 150.0

# Schema for generating reports
class ReportRequest(BaseModel):
    predictionClass: int
    advice: str
    aqi: float
    pm10: float
    pm2_5: float
    no2: float
    so2: float
    o3: float
    temperature: float
    humidity: float
    windSpeed: float
    respiratoryCases: int
    cardiovascularCases: int
    hospitalAdmissions: int
    healthImpactScore: float
    cityName: str

# Helper to load trained pipelines
def load_model_pipeline(model_name: str):
    model_path = os.path.join(MODELS_DIR, f"{model_name}.pkl")
    if not os.path.exists(model_path):
        raise HTTPException(status_code=404, detail=f"Model {model_name} not found.")
    return joblib.load(model_path)

@app.get("/api/models")
def get_models_metrics():
    metrics_path = os.path.join(MODELS_DIR, "metrics.json")
    if not os.path.exists(metrics_path):
        return {}
    with open(metrics_path, "r") as f:
        return json.load(f)

@app.get("/api/history")
def get_search_history():
    return database.get_history(limit=50)

@app.get("/api/alerts")
def get_triggered_alerts():
    return database.get_alerts(limit=50)

@app.get("/api/city")
def search_city(name: str = Query(..., description="Name of the city to lookup")):
    try:
        # Step 1: Geocode
        geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={name}&count=1&format=json"
        geo_res = requests.get(geo_url).json()
        if 'results' not in geo_res or len(geo_res['results']) == 0:
            raise HTTPException(status_code=404, detail="City not found")
            
        city = geo_res['results'][0]
        lat = city['latitude']
        lon = city['longitude']
        
        # Step 2: Fetch Current AQI & Weather
        aqi_url = f"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lat}&longitude={lon}&current=pm10,pm2_5,nitrogen_dioxide,sulphur_dioxide,ozone,us_aqi"
        aqi_res = requests.get(aqi_url).json()
        
        w_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m"
        w_res = requests.get(w_url).json()
        
        current_aqi = aqi_res.get('current', {})
        current_weather = w_res.get('current', {})
        
        # Step 3: Fetch 7-Day Historical Timeseries
        hist_url = f"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lat}&longitude={lon}&hourly=pm2_5,pm10,us_aqi&past_days=7"
        hist_res = requests.get(hist_url).json()
        
        hourly = hist_res.get('hourly', {})
        timeseries = []
        if 'time' in hourly:
            for idx in range(len(hourly['time'])):
                timeseries.append({
                    "time": hourly['time'][idx],
                    "pm2_5": hourly.get('pm2_5', [])[idx],
                    "pm10": hourly.get('pm10', [])[idx],
                    "aqi": hourly.get('us_aqi', [])[idx],
                })
        
        return {
            "name": city.get('name'),
            "country": city.get('country'),
            "latitude": lat,
            "longitude": lon,
            "current": {
                "aqi": float(current_aqi.get('us_aqi', 50)),
                "pm10": float(current_aqi.get('pm10', 20)),
                "pm2_5": float(current_aqi.get('pm2_5', 10)),
                "no2": float(current_aqi.get('nitrogen_dioxide', 15)),
                "so2": float(current_aqi.get('sulphur_dioxide', 5)),
                "o3": float(current_aqi.get('ozone', 40)),
                "temperature": float(current_weather.get('temperature_2m', 25)),
                "humidity": float(current_weather.get('relative_humidity_2m', 60)),
                "windSpeed": float(current_weather.get('wind_speed_10m', 10)),
            },
            "timeseries": timeseries
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/predict")
def predict_and_optimize(req: PredictRequest):
    try:
        pipeline = load_model_pipeline(req.model)
        
        # Reconstruct DataFrame with exact training columns
        input_dict = {
            'AQI': req.aqi, 'PM10': req.pm10, 'PM2_5': req.pm_2_5 if hasattr(req, 'pm_2_5') else req.pm2_5, 
            'NO2': req.no2, 'SO2': req.so2, 'O3': req.o3, 
            'Temperature': req.temperature, 'Humidity': req.humidity, 'WindSpeed': req.windSpeed, 
            'RespiratoryCases': req.respiratoryCases, 'CardiovascularCases': req.cardiovascularCases, 
            'HospitalAdmissions': req.hospitalAdmissions, 'HealthImpactScore': req.healthImpactScore
        }
        input_df = pd.DataFrame([input_dict])
        
        # ML Inference
        prediction = int(pipeline.predict(input_df)[0])
        
        # Define personalized advice
        if prediction == 0:
            advice = "Air quality is excellent. Great day for outdoor activities. No precautions required."
        elif prediction == 1:
            advice = "Air quality is moderate. Sensitive individuals (asthma, COPD) should limit prolonged outdoor exertion."
        else:
            advice = "Dangerous pollution levels. Limit outdoor exposure. Wear N95 masks, close windows, and run air purifiers."
            
        # Logging history to SQL
        database.log_search(req.cityName, req.aqi, req.pm2_5, req.pm10, prediction, req.model)
        
        # Counterfactual optimizer
        reduction = 0
        optimized_computed = False
        opt_message = ""
        
        if prediction > 0:
            sim_df = input_df.copy()
            while int(pipeline.predict(sim_df)[0]) > 0 and reduction <= 80:
                reduction += 5
                sim_df['PM2_5'] *= 0.95
                sim_df['PM10'] *= 0.95
                sim_df['AQI'] *= 0.95
            
            if int(pipeline.predict(sim_df)[0]) == 0:
                optimized_computed = True
                opt_message = f"Optimization Computed! A {reduction}% immediate reduction in PM10, PM2.5, and core AQI variables will lower the Health Risk to Safe (Class 0)."
            else:
                optimized_computed = False
                opt_message = "Even with an 80% pollutant reduction, health risk remains high due to other metrics (e.g. high baseline cases)."
        else:
            opt_message = "Region is already at Safe level (Class 0). No counterfactual reductions required."
            
        # Email Alerts check
        alert_triggered = False
        alert_status = "N/A"
        if req.emailAlertRecipient and req.aqi >= req.emailAlertThreshold:
            alert_triggered = True
            # Simulate email alert logging
            try:
                database.log_alert(req.cityName, req.aqi, req.emailAlertThreshold, req.emailAlertRecipient, "SENT")
                alert_status = "SENT"
            except Exception:
                alert_status = "FAILED"
                
        return {
            "prediction": prediction,
            "advice": advice,
            "optimizer": {
                "success": optimized_computed,
                "reduction_needed_percent": reduction,
                "message": opt_message
            },
            "alert": {
                "triggered": alert_triggered,
                "status": alert_status
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/report")
def generate_report(req: ReportRequest):
    try:
        from fpdf import FPDF
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Arial", size=16, style='B')
        pdf.cell(200, 10, txt="Official Air Quality & Health Risk Report", ln=1, align="C")
        pdf.ln(10)
        
        pdf.set_font("Arial", size=12, style='B')
        pdf.cell(200, 10, txt=f"City: {req.cityName}", ln=1)
        pdf.cell(200, 10, txt=f"AI Prediction Alert: Class {req.predictionClass} (0=Safe, 1=Moderate, 2=Dangerous)", ln=1)
        pdf.ln(5)
        
        pdf.set_font("Arial", size=11)
        pdf.multi_cell(0, 10, txt=f"Medical Advice: {req.advice}")
        pdf.ln(10)
        
        pdf.set_font("Arial", size=14, style='B')
        pdf.cell(200, 10, txt="Environmental & Clinical Log:", ln=1)
        
        pdf.set_font("Arial", size=10)
        metrics = {
            "Air Quality Index (AQI)": req.aqi,
            "PM10 Level (ug/m3)": req.pm10,
            "PM2.5 Level (ug/m3)": req.pm2_5,
            "NO2 Level (ppb)": req.no2,
            "SO2 Level (ppb)": req.so2,
            "O3 Level (ppb)": req.o3,
            "Temperature (C)": req.temperature,
            "Humidity (%)": req.humidity,
            "Wind Speed (km/h)": req.windSpeed,
            "Respiratory Cases": req.respiratoryCases,
            "Cardiovascular Cases": req.cardiovascularCases,
            "Hospital Admissions": req.hospitalAdmissions,
            "Health Impact Score": req.healthImpactScore
        }
        for key, value in metrics.items():
            pdf.cell(200, 8, txt=f"- {key}: {value}", ln=1)
            
        pdf.ln(10)
        pdf.set_font("Arial", size=10, style='I')
        pdf.cell(200, 10, txt="Generated automatically by the AI Health Navigator Pipeline", ln=1, align="C")
        
        # Write to byte buffer
        pdf_bytes = pdf.output(dest='S').encode('latin-1', 'replace')
        
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment;filename=Health_Risk_Report.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
