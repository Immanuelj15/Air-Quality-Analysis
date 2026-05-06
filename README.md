# 🌍 Advanced AI Air Quality & Health Risk Dashboard

An end-to-end Data Science project that integrates **Live API Data**, **Machine Learning Predictions**, and **Prescriptive AI** to monitor air quality and assess health risks.

## 🚀 Overview
This platform provides real-time environmental monitoring and health risk assessment. It uses a machine learning model to predict health impact classes based on air quality metrics, weather conditions, and regional health statistics.

## ✨ Features
- **🤖 AI Predictor**: Predicts health risk levels (Safe, Moderate, Dangerous) using a pre-trained model.
- **📍 Live City Tracker**: Fetches real-time AQI and weather data for any city globally via Open-Meteo APIs.
- **📄 Automated Medical Reports**: Generates professional PDF health reports containing AI predictions and personalized medical advice.
- **🔮 What-If Scenario Optimizer**: A prescriptive AI feature that calculates the required reduction in pollutants to achieve a "Safe" health status.
- **📊 Historical Data Insights**: Interactive dashboard for exploring dataset correlations and environmental trends.

## 🛠️ Tech Stack
- **Language**: Python
- **Framework**: Streamlit (for the interactive dashboard)
- **Machine Learning**: Scikit-learn, Joblib
- **Data Analysis**: Pandas, Matplotlib, Seaborn
- **APIs**: Open-Meteo (Geocoding and Air Quality)
- **Report Generation**: FPDF

## 📂 Project Structure
- `app.py`: The main Streamlit application logic.
- `Air_Quality_and_Health_Risk_Final.ipynb`: Jupyter notebook for model training and analysis.
- `air_quality_health_model.pkl`: Pre-trained machine learning model.
- `CRT_AirQuality_1Lakh_Realistic.csv`: Dataset used for training and exploration.
- `fix_dataset.py` & `create_notebook.py`: Utility scripts for data preparation.

## ⚙️ Installation & Usage
1. Clone the repository:
   ```bash
   git clone https://github.com/Immanuelj15/Air-Quality-Analysis.git
   ```
2. Install dependencies:
   ```bash
   pip install streamlit pandas joblib matplotlib seaborn requests fpdf
   ```
3. Run the application:
   ```bash
   streamlit run app.py
   ```

## 📝 License
This project is for educational and research purposes.
