import streamlit as st
import pandas as pd
import joblib
import matplotlib.pyplot as plt
import seaborn as sns
import requests
from fpdf import FPDF
import os
import plotly.express as px

# ==========================================
# 1. Configuration & Initial Loading
# ==========================================
st.set_page_config(page_title="AI Health Navigator", page_icon="🌍", layout="wide")

@st.cache_resource
def load_model():
    return joblib.load('air_quality_health_model.pkl')

@st.cache_data
def load_data():
    df = pd.read_csv('CRT_AirQuality_1Lakh_Realistic.csv')
    df.fillna(df.mean(), inplace=True)
    df = df.drop(columns=['RecordID'], errors='ignore')
    return df

try:
    model = load_model()
except FileNotFoundError:
    st.error("Error: 'air_quality_health_model.pkl' not found. Please ensure it's in the same folder.")
    st.stop()


# ==========================================
# 2. Advanced Feature Functions
# ==========================================
def fetch_city_data(city_name):
    """Fetches Live Geospatial and AQI data from free Open-Meteo APIs."""
    try:
        # Geo-locate city
        geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={city_name}&count=1&format=json"
        res = requests.get(geo_url).json()
        if 'results' not in res: return None
        lat = res['results'][0]['latitude']
        lon = res['results'][0]['longitude']
        
        # Fetch Real-time AQI and Weather
        aqi_url = f"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lat}&longitude={lon}&current=pm10,pm2_5,nitrogen_dioxide,sulphur_dioxide,ozone,us_aqi"
        aqi_res = requests.get(aqi_url).json()
        
        w_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m"
        w_res = requests.get(w_url).json()
        
        curr_aqi = aqi_res['current']
        curr_w = w_res['current']
        
        return {
            'AQI': float(curr_aqi.get('us_aqi', 50)),
            'PM10': float(curr_aqi.get('pm10', 20)),
            'PM2_5': float(curr_aqi.get('pm2_5', 10)),
            'NO2': float(curr_aqi.get('nitrogen_dioxide', 15)),
            'SO2': float(curr_aqi.get('sulphur_dioxide', 5)),
            'O3': float(curr_aqi.get('ozone', 40)),
            'Temperature': float(curr_w.get('temperature_2m', 25)),
            'Humidity': float(curr_w.get('relative_humidity_2m', 60)),
            'WindSpeed': float(curr_w.get('wind_speed_10m', 10))
        }
    except Exception as e:
        return None

def create_pdf(risk_class, advice, input_dict):
    """Generates a professional PDF report containing AI predictions."""
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", size=16, style='B')
    pdf.cell(200, 10, txt="Official Air Quality & Health Risk Report", ln=1, align="C")
    pdf.ln(10)
    
    pdf.set_font("Arial", size=12, style='B')
    pdf.cell(200, 10, txt=f"AI Prediction Alert: Class {risk_class}", ln=1)
    
    pdf.set_font("Arial", size=11)
    pdf.multi_cell(0, 10, txt=f"Medical Advice: {advice}")
    pdf.ln(10)
    
    pdf.set_font("Arial", size=14, style='B')
    pdf.cell(200, 10, txt="Environmental Data Log:", ln=1)
    
    pdf.set_font("Arial", size=10)
    for key, value in input_dict.items():
        pdf.cell(200, 8, txt=f"- {key}: {value}", ln=1)
        
    pdf.ln(10)
    pdf.set_font("Arial", size=10, style='I')
    pdf.cell(200, 10, txt="Generated automatically by the AI Health Navigator", ln=1, align="C")
    
    # Save the PDF temporally and read it into memory for the download button
    pdf_file = "Health_Report.pdf"
    pdf.output(pdf_file)
    with open(pdf_file, "rb") as f:
        pdf_bytes = f.read()
    return pdf_bytes

# Initialize Streamlit Session state for dynamically changing the sliders from API
if 'api_data' not in st.session_state:
    st.session_state.api_data = {
        'AQI': 50.0, 'PM10': 20.0, 'PM2_5': 10.0, 'NO2': 15.0, 'SO2': 5.0, 'O3': 40.0,
        'Temperature': 25.0, 'Humidity': 60.0, 'WindSpeed': 10.0
    }

# ==========================================
# 3. Streamlit Core UI
# ==========================================
st.title("🌍 Advanced AI Air Quality & Health Risk Dashboard")
st.markdown("This platform integrates **Live API Data**, Prescriptive **'What-If' Optimization**, and Automated **Medical PDF Generation** for an end-to-end Data Science product.")
st.divider()

tab1, tab2 = st.tabs(["🤖 AI Predictor & Live Dashboard", "📊 Historical Data Insights"])

with tab1:
    # --- Live API Integration Feature ---
    st.sidebar.header("📍 Live City Tracker (API)")
    city_input = st.sidebar.text_input("Enter City Name (e.g., 'London', 'Chennai'):")
    if st.sidebar.button("Fetch Live Global Data", width='stretch'):
        with st.spinner("Connecting to Open-Meteo Environmental Satellites..."):
            fetched_data = fetch_city_data(city_input)
            if fetched_data:
                st.session_state.api_data = fetched_data
                st.sidebar.success(f"Real-time parameters successfully loaded for **{city_input}**!")
            else:
                st.sidebar.error("City not found or API is unavailable. Try another city.")
                
    st.sidebar.divider()
    
    # --- Standard Input Panel ---
    st.sidebar.header("🌬️ Environmental Metrics")
    d = st.session_state.api_data
    
    aqi = st.sidebar.slider("Air Quality Index (AQI)", 0.0, 500.0, d['AQI'])
    pm10 = st.sidebar.number_input("PM10 Level (µg/m³)", value=d['PM10'])
    pm2_5 = st.sidebar.number_input("PM2.5 Level (µg/m³)", value=d['PM2_5'])
    no2 = st.sidebar.number_input("NO2 Level (ppb)", value=d['NO2'])
    so2 = st.sidebar.number_input("SO2 Level (ppb)", value=d['SO2'])
    o3 = st.sidebar.slider("Ozone (O3) Level (ppb)", 0.0, 200.0, d['O3'])

    st.sidebar.subheader("⛅ Weather Conditions")
    temp = st.sidebar.slider("Temperature (°C)", -20.0, 50.0, d['Temperature'])
    humidity = st.sidebar.slider("Humidity (%)", 0.0, 100.0, d['Humidity'])
    wind = st.sidebar.slider("Wind Speed (km/h)", 0.0, 100.0, d['WindSpeed'])

    st.subheader("🏥 Regional Health Statistics")
    col1, col2 = st.columns(2)
    with col1:
        resp_cases = st.number_input("Number of Respiratory Cases", value=50)
        cardio_cases = st.number_input("Number of Cardiovascular Cases", value=20)
    with col2:
        hospital_adm = st.number_input("Total Hospital Admissions", value=10)
        health_score = st.slider("Historical Health Impact Score", 0.0, 100.0, 20.0)

    st.divider()

    if st.button("Predict Health Risk & Generate Report", width='stretch', type="primary"):
        input_dict = {
            'AQI': aqi, 'PM10': pm10, 'PM2_5': pm2_5, 'NO2': no2, 'SO2': so2, 'O3': o3, 
            'Temperature': temp, 'Humidity': humidity, 'WindSpeed': wind, 
            'RespiratoryCases': resp_cases, 'CardiovascularCases': cardio_cases, 
            'HospitalAdmissions': hospital_adm, 'HealthImpactScore': health_score
        }
        input_data = pd.DataFrame([input_dict])
        
        # Main AI Prediction
        prediction = model.predict(input_data)[0]
        
        st.subheader("💡 Personalized Health Guidance")
        advice = ""
        
        if prediction == 0: 
            st.success(f"### Predicted Class: **{prediction}** (Safe / Low Risk) ✅")
            advice = "Air quality is excellent. It is a great day for outdoor activities. No special precautions needed."
            st.info(f"**Medical Advice:** {advice}")
            st.balloons()
        elif prediction == 1: 
            st.warning(f"### Predicted Class: **{prediction}** (Moderate Risk) ⚠️")
            advice = "Air quality is acceptable. Unusually sensitive people should consider limiting prolonged outdoor exertion."
            st.info(f"**Medical Advice:** {advice}")
        else: 
            st.error(f"### Predicted Class: **{prediction}** (Dangerous / High Risk) 🚨")
            advice = "Dangerous pollution levels. Wear an N95 mask outside, keep windows closed, and run indoor air purifiers."
            st.info(f"**Medical Advice:** {advice}")

        # --- Automated PDF Generator Feature ---
        pdf_bytes = create_pdf(prediction, advice, input_dict)
        st.download_button(
            label="📄 Download Official Medical Report (PDF)",
            data=pdf_bytes,
            file_name="Health_Risk_Report.pdf",
            mime="application/pdf",
        )
        
        # --- Counterfactual What-If Optimizer Feature ---
        if prediction > 0:
            st.divider()
            st.subheader("🔮 What-If Scenario Optimizer (Prescriptive AI)")
            st.markdown("The AI is running reverse-simulations to calculate exactly how much pollution must be reduced to mathematically achieve a **Safe** status...")
            
            sim_data = input_data.copy()
            reduction = 0
            # Loop until prediction is 0 (Safe) or reduction caps at 80% out of bounds
            while model.predict(sim_data)[0] > 0 and reduction <= 80:
                reduction += 5
                sim_data['PM2_5'] *= 0.95
                sim_data['PM10'] *= 0.95
                sim_data['AQI'] *= 0.95
                
            if model.predict(sim_data)[0] == 0:
                st.success(f"✅ **Optimization Computed!** The AI has determined that if local authorities enforce a **{reduction}%** immediate reduction in PM10, PM2.5, and primary AQI factors, your region's Health Impact Class will mathematically drop to **Safe (Class 0)**.")
            else:
                st.error("⚠️ **Alert:** Even with a massive 80% reduction in primary pollutants, the AI predicts the health risk remains high due to other lingering environmental factors or extremely high baseline cardiovascular/respiratory cases.")


# ==========================================
# 4. TAB 2: Historical Data Dashboard
# ==========================================
with tab2:
    st.subheader("📊 Dataset Explorer & Correlation Analysis")
    data = load_data()
    st.dataframe(data.head(10), width='stretch')

    st.divider()
    st.markdown("#### Correlation Matrix Heatmap")
    corr_matrix = data.corr().round(2)
    fig = px.imshow(
        corr_matrix,
        text_auto=True,
        aspect="auto",
        color_continuous_scale="YlGnBu"
    )
    fig.update_layout(
        margin=dict(l=20, r=20, t=20, b=20),
        height=600
    )
    st.plotly_chart(fig, use_container_width=True)
