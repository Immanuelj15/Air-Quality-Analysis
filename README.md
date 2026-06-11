# 🌍 Advanced AI-Driven Air Quality & Health Risk Platform

An end-to-end full-stack web application that combines **Live Environmental Data**, **Multi-Model Machine Learning**, and **Prescriptive AI** to analyze air quality indices (AQI) and dynamically assess associated health risk scores.

### 🔗 Live Deployments
* **Interactive Frontend (Vercel):** [https://air-quality-analysis-seven.vercel.app/](https://air-quality-analysis-seven.vercel.app/)
* **Production API Service (Render):** [https://air-quality-analysis.onrender.com/docs](https://air-quality-analysis.onrender.com/docs)

---

## ✨ Features

1. **📍 Live Interactive Tracking**
   * Fully responsive mapping interface powered by **React Leaflet** with automated geopinned coordinates.
   * Instant geocoding and search for any city globally, pulling live 7-day AQI, pollutant histories, and local weather forecasts.
2. **🤖 Multi-Model Arena**
   * Benchmark predictions between multiple ML models: **Random Forest** (accuracy: ~94.8%), **Decision Tree**, and **Logistic Regression**.
   * Comparative metrics dashboard displaying model precision, recall, and F1-scores based on our dataset of 100,000 environmental records.
3. **🔮 Prescriptive AI (What-If Optimizer)**
   * Slide controls to simulate shifts in pollutants (PM2.5, PM10, $NO_2$, $SO_2$, $O_3$), weather conditions, and clinical base rates.
   * Real-time recommendation engine calculating the target pollutant reductions needed to bring dangerous areas into "Safe" health scores.
4. **📄 Professional PDF Reports**
   * Generate and download professional-grade health risk assessment sheets on the fly, containing all current metrics, coordinates, predictions, and detailed health recommendations.
5. **🗄️ SQLite Analytics Logging**
   * Automated local database logging of geocoding history, prediction queries, and automatic environmental alert triggers.

---

## 🛠️ Architecture & Tech Stack

### Frontend (React/Vite)
* **Framework**: React v18 + Vite (configured with Tailwind CSS v3)
* **Visualizations**: Recharts (smooth, interactive area charts for pollutant trends)
* **Maps**: Leaflet & React Leaflet
* **Iconography**: Lucide React
* **Hosting**: Vercel (Single-page application)

### Backend (FastAPI/Python)
* **Framework**: FastAPI (high-performance asynchronous Python API)
* **Database**: SQLite with SQLAlchemy for structured logging (`query_history`, `alert_logs`)
* **ML Stack**: Scikit-Learn, Joblib, Pandas, NumPy
* **Report Generation**: FPDF (dynamically generated PDF streams)
* **Hosting**: Render (Web Service running Uvicorn)

---

## 📂 Repository Layout

```
Air_Quality_check/
├── backend/
│   ├── main.py            # Main FastAPI endpoints, router & scheduler
│   ├── database.py        # SQLite Database models & engine configurations
│   ├── train_arena.py     # Training script for Random Forest, Decision Tree & Logistic Regression
│   ├── requirements.txt   # Backend python packages
│   └── models/
│       ├── *.pkl          # Serialized models
│       └── metrics.json   # Model performance stats
├── frontend/
│   ├── package.json
│   ├── vite.config.js     # Production build and proxy configs
│   ├── tailwind.config.js # Custom typography & color schemes
│   └── src/
│       ├── App.jsx        # Premium dashboard user interface
│       ├── index.css      # Core styles & glassmorphic custom variables
│       └── main.jsx
└── README.md              # Project Documentation
```

---

## ⚙️ Local Development Setup

### 1. Run the Backend
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run model training to generate the pipeline files:
   ```bash
   python train_arena.py
   ```
4. Start the FastAPI development server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   *The backend will be available at `http://localhost:8000` with interactive API docs at `http://localhost:8000/docs`.*

### 2. Run the Frontend
1. Navigate to the `frontend` directory:
   ```bash
   cd ../frontend
   ```
2. Install Node packages:
   ```bash
   npm install
   ```
3. Run the Vite local dev server:
   ```bash
   npm run dev
   ```
   *The frontend dashboard will load at `http://localhost:5173`.*

---

## 📝 License
This project is built for educational, research, and predictive air safety demonstration purposes.
