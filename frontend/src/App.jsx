import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  Activity, MapPin, AlertTriangle, ShieldCheck, Heart, 
  Database, RefreshCw, BarChart2, Bell, FileText, Globe, Wind, 
  Thermometer, Droplets, ChevronDown, ChevronUp, AlertOctagon, HelpCircle, 
  TrendingUp, Download, Eye, Settings, Shield
} from 'lucide-react';

// Setup default Leaflet marker icon
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [cityName, setCityName] = useState('Chennai');
  const [searchCity, setSearchCity] = useState('');
  
  // Geolocation states
  const [coords, setCoords] = useState({ lat: 13.0827, lon: 80.2707 }); 
  const [timeseries, setTimeseries] = useState([]);
  
  // Accordion Section States
  const [expandedSection, setExpandedSection] = useState('pollutants'); // 'pollutants', 'weather', 'clinical', 'alerts'

  // Environmental sliders
  const [aqi, setAqi] = useState(50);
  const [pm10, setPm10] = useState(20);
  const [pm2_5, setPm2_5] = useState(10);
  const [no2, setNo2] = useState(15);
  const [so2, setSo2] = useState(5);
  const [o3, setO3] = useState(40);
  
  // Weather
  const [temp, setTemp] = useState(25);
  const [humidity, setHumidity] = useState(60);
  const [windSpeed, setWindSpeed] = useState(10);
  
  // Clinical / Health
  const [respCases, setRespCases] = useState(50);
  const [cardioCases, setCardioCases] = useState(20);
  const [hospitalAdm, setHospitalAdm] = useState(10);
  const [healthScore, setHealthScore] = useState(20.0);
  
  // App Config
  const [selectedModel, setSelectedModel] = useState('random_forest');
  const [emailRecipient, setEmailRecipient] = useState('');
  const [alertThreshold, setAlertThreshold] = useState(150);
  
  // Prediction Outputs
  const [prediction, setPrediction] = useState(null);
  const [advice, setAdvice] = useState('');
  const [optimizer, setOptimizer] = useState(null);
  const [alertResult, setAlertResult] = useState(null);
  
  // Data lists
  const [history, setHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [modelMetrics, setModelMetrics] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);

  // Initialize and Update Leaflet Map
  useEffect(() => {
    if (!mapRef.current) return;
    
    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current, { zoomControl: false }).setView([coords.lat, coords.lon], 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstance.current);
      
      // Put zoom controls in top-right
      L.control.zoom({ position: 'topright' }).addTo(mapInstance.current);
      
      markerRef.current = L.marker([coords.lat, coords.lon], { icon: defaultIcon }).addTo(mapInstance.current);
      
      setTimeout(() => {
        if (mapInstance.current) {
          mapInstance.current.invalidateSize();
        }
      }, 250);
    } else {
      mapInstance.current.setView([coords.lat, coords.lon], 11);
      if (markerRef.current) {
        markerRef.current.setLatLng([coords.lat, coords.lon]);
      }
      setTimeout(() => {
        if (mapInstance.current) {
          mapInstance.current.invalidateSize();
        }
      }, 100);
    }
  }, [coords]);

  useEffect(() => {
    fetchHistory();
    fetchAlerts();
    fetchModelMetrics();
  }, []);

  const fetchCityData = async (name) => {
    if (!name) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_URL}/api/city?name=${encodeURIComponent(name)}`);
      if (!res.ok) throw new Error("City not found or server offline");
      const data = await res.json();
      
      setCoords({ lat: data.latitude, lon: data.longitude });
      setCityName(data.name);
      
      setAqi(data.current.aqi);
      setPm10(data.current.pm10);
      setPm2_5(data.current.pm2_5);
      setNo2(data.current.no2);
      setSo2(data.current.so2);
      setO3(data.current.o3);
      setTemp(data.current.temperature);
      setHumidity(data.current.humidity);
      setWindSpeed(data.current.windSpeed);
      setTimeseries(data.timeseries);
      
      runPrediction(data.current, data.name);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const runPrediction = async (currentValues = null, activeCity = null) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const payload = {
        model: selectedModel,
        aqi: currentValues ? currentValues.aqi : aqi,
        pm10: currentValues ? currentValues.pm10 : pm10,
        pm2_5: currentValues ? currentValues.pm2_5 : pm2_5,
        no2: currentValues ? currentValues.no2 : no2,
        so2: currentValues ? currentValues.so2 : so2,
        o3: currentValues ? currentValues.o3 : o3,
        temperature: currentValues ? currentValues.temperature : temp,
        humidity: currentValues ? currentValues.humidity : humidity,
        windSpeed: currentValues ? currentValues.windSpeed : windSpeed,
        respiratoryCases: respCases,
        cardiovascularCases: cardioCases,
        hospitalAdmissions: hospitalAdm,
        healthImpactScore: healthScore,
        cityName: activeCity || cityName,
        emailAlertRecipient: emailRecipient,
        emailAlertThreshold: alertThreshold
      };

      const res = await fetch(`${API_URL}/api/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Inference failed");
      const data = await res.json();
      
      setPrediction(data.prediction);
      setAdvice(data.advice);
      setOptimizer(data.optimizer);
      setAlertResult(data.alert);
      
      fetchHistory();
      fetchAlerts();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    try {
      const payload = {
        predictionClass: prediction !== null ? prediction : 0,
        advice: advice || "No advice generated yet.",
        aqi, pm10, pm2_5, no2, so2, o3,
        temperature: temp, humidity, windSpeed,
        respiratoryCases: respCases,
        cardiovascularCases: cardioCases,
        hospitalAdmissions: hospitalAdm,
        healthImpactScore: healthScore,
        cityName
      };
      
      const res = await fetch(`${API_URL}/api/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Report generation failed");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Health_Report_${cityName}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert("Error generating PDF: " + err.message);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/api/history`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) { console.error(err); }
  };

  const fetchAlerts = async () => {
    try {
      const res = await fetch(`${API_URL}/api/alerts`);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
      }
    } catch (err) { console.error(err); }
  };

  const fetchModelMetrics = async () => {
    try {
      const res = await fetch(`${API_URL}/api/models`);
      if (res.ok) {
        const data = await res.json();
        setModelMetrics(data);
      }
    } catch (err) { console.error(err); }
  };

  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " - " + date.toLocaleDateString();
    } catch (e) {
      return isoString;
    }
  };

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col relative overflow-hidden">
      
      {/* Background Glowing Blobs */}
      <div className="glow-blob bg-violet-400/15 top-[-100px] right-[-100px]" />
      <div className="glow-blob bg-emerald-400/15 top-[40%] left-[-150px]" />
      <div className="glow-blob bg-sky-400/15 bottom-[-100px] right-[10%]" />

      {/* Header Banner */}
      <header className="glass-header sticky top-0 z-50 border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-tr from-emerald-500/5 to-indigo-500/5 rounded-2xl border border-slate-200/60 shadow-inner">
              <Globe className="w-8 h-8 text-emerald-600 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-emerald-600 via-teal-500 to-indigo-600 bg-clip-text text-transparent">
                AI HEALTH NAVIGATOR
              </h1>
              <p className="text-xs text-slate-500 font-bold tracking-widest uppercase mt-0.5">Environmental Intelligence Pipeline</p>
            </div>
          </div>
          
          {/* Navigation Tabs */}
          <nav className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/50 shadow-inner">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 ${
                activeTab === 'dashboard' 
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/15' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Activity className="w-4 h-4" />
              Realtime Inference
            </button>
            <button 
              onClick={() => setActiveTab('arena')}
              className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 ${
                activeTab === 'arena' 
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/15' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              Classifier Arena
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 ${
                activeTab === 'history' 
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/15' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Database className="w-4 h-4" />
              History SQL
            </button>
            <button 
              onClick={() => setActiveTab('alerts')}
              className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 ${
                activeTab === 'alerts' 
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/15' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Bell className="w-4 h-4" />
              Alarms Inbox
            </button>
          </nav>
        </div>
      </header>

      {/* Main Layout Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        
        {/* Sidebar Inputs (Grid span 4) */}
        <section className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Live Search Card */}
          <div className="glass p-6 rounded-3xl relative overflow-hidden group hover:border-slate-300/50 transition-all duration-300 shadow-md bg-white/70">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full filter blur-xl group-hover:bg-emerald-500/10 transition-all" />
            <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2.5">
              <span className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-600">
                <MapPin className="w-4 h-4" />
              </span>
              City Coordinates Locator
            </h2>
            <div className="flex gap-2.5 mt-4">
              <input 
                type="text" 
                placeholder="Lookup city (e.g. Chennai, London)" 
                value={searchCity}
                onChange={(e) => setSearchCity(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-all focus:ring-1 focus:ring-emerald-500/20"
              />
              <button 
                onClick={() => fetchCityData(searchCity)}
                disabled={loading}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:from-slate-300 disabled:to-slate-400 text-slate-950 font-extrabold px-5 py-2.5 rounded-2xl text-xs transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Fetch"}
              </button>
            </div>
            {errorMsg && <p className="text-rose-600 text-xs mt-2 font-medium">{errorMsg}</p>}
            {cityName && (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <span>Tracking: <strong className="text-emerald-600 font-semibold">{cityName}</strong> ({coords.lat.toFixed(3)}, {coords.lon.toFixed(3)})</span>
              </div>
            )}
          </div>

          {/* Configuration Parameters Card */}
          <div className="glass p-6 rounded-3xl flex flex-col gap-4 shadow-md bg-white/70">
            
            {/* Model Select */}
            <div className="flex flex-col gap-1.5 pb-2">
              <label className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                Active Classifier Model
              </label>
              <select 
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-3 py-3 bg-white border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer font-medium"
              >
                <option value="random_forest">Random Forest Classifier (Ensemble)</option>
                <option value="logistic_regression">Logistic Regression (Linear)</option>
                <option value="decision_tree">Decision Tree Classifier (Rules)</option>
              </select>
            </div>

            <hr className="border-slate-200/60" />

            {/* Togglable Sections */}
            
            {/* SECTION 1: Pollutants */}
            <div className="border border-slate-200/50 rounded-2xl overflow-hidden bg-slate-50/40">
              <button 
                onClick={() => toggleSection('pollutants')}
                className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-slate-100/40 transition-all"
              >
                <span className="flex items-center gap-2">
                  <span className="p-1 bg-amber-500/10 text-amber-600 rounded">
                    <Wind className="w-3.5 h-3.5" />
                  </span>
                  Air Pollutant Levels
                </span>
                {expandedSection === 'pollutants' ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
              </button>
              
              {expandedSection === 'pollutants' && (
                <div className="p-4 flex flex-col gap-4 border-t border-slate-200/40 bg-slate-50/10">
                  <div>
                    <div className="flex justify-between text-xs mb-1.5 font-semibold">
                      <span className="text-slate-500">AQI Index</span>
                      <span className="font-bold text-amber-600">{aqi.toFixed(1)}</span>
                    </div>
                    <input 
                      type="range" min="0" max="500" step="1" value={aqi} 
                      onChange={(e) => setAqi(parseFloat(e.target.value))} 
                      className="w-full h-1 bg-slate-250 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold">PM2.5 (µg/m³)</label>
                      <input 
                        type="number" value={pm2_5} 
                        onChange={(e) => setPm2_5(parseFloat(e.target.value) || 0)} 
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs mt-1 text-slate-800 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold">PM10 (µg/m³)</label>
                      <input 
                        type="number" value={pm10} 
                        onChange={(e) => setPm10(parseFloat(e.target.value) || 0)} 
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs mt-1 text-slate-800 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[9px] text-slate-500 font-bold">NO2 (ppb)</label>
                      <input 
                        type="number" value={no2} 
                        onChange={(e) => setNo2(parseFloat(e.target.value) || 0)} 
                        className="w-full px-2 py-2 bg-white border border-slate-200 rounded-xl text-[11px] mt-1 text-slate-800 text-center focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-500 font-bold">SO2 (ppb)</label>
                      <input 
                        type="number" value={so2} 
                        onChange={(e) => setSo2(parseFloat(e.target.value) || 0)} 
                        className="w-full px-2 py-2 bg-white border border-slate-200 rounded-xl text-[11px] mt-1 text-slate-800 text-center focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-500 font-bold">O3 (ppb)</label>
                      <input 
                        type="number" value={o3} 
                        onChange={(e) => setO3(parseFloat(e.target.value) || 0)} 
                        className="w-full px-2 py-2 bg-white border border-slate-200 rounded-xl text-[11px] mt-1 text-slate-800 text-center focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 2: Weather */}
            <div className="border border-slate-200/50 rounded-2xl overflow-hidden bg-slate-50/40">
              <button 
                onClick={() => toggleSection('weather')}
                className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-slate-100/40 transition-all"
              >
                <span className="flex items-center gap-2">
                  <span className="p-1 bg-sky-500/10 text-sky-600 rounded">
                    <Thermometer className="w-3.5 h-3.5" />
                  </span>
                  Meteorological States
                </span>
                {expandedSection === 'weather' ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
              </button>
              
              {expandedSection === 'weather' && (
                <div className="p-4 flex flex-col gap-4 border-t border-slate-200/40 bg-slate-50/10">
                  <div>
                    <div className="flex justify-between text-xs mb-1.5 font-semibold">
                      <span className="text-slate-500">Temperature</span>
                      <span className="font-bold text-sky-600">{temp.toFixed(1)}°C</span>
                    </div>
                    <input 
                      type="range" min="-20" max="50" step="1" value={temp} 
                      onChange={(e) => setTemp(parseFloat(e.target.value))} 
                      className="w-full h-1 bg-slate-250 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <div className="flex justify-between text-[10px] mb-1.5 font-bold text-slate-500">
                        <span>Humidity</span>
                        <span className="text-slate-700">{humidity}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="100" step="1" value={humidity} 
                        onChange={(e) => setHumidity(parseInt(e.target.value))} 
                        className="w-full h-1 bg-slate-250 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] mb-1.5 font-bold text-slate-500">
                        <span>Wind Speed</span>
                        <span className="text-slate-700">{windSpeed} km/h</span>
                      </div>
                      <input 
                        type="range" min="0" max="100" step="1" value={windSpeed} 
                        onChange={(e) => setWindSpeed(parseInt(e.target.value))} 
                        className="w-full h-1 bg-slate-250 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 3: Clinical */}
            <div className="border border-slate-200/50 rounded-2xl overflow-hidden bg-slate-50/40">
              <button 
                onClick={() => toggleSection('clinical')}
                className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-slate-100/40 transition-all"
              >
                <span className="flex items-center gap-2">
                  <span className="p-1 bg-rose-500/10 text-rose-600 rounded">
                    <Heart className="w-3.5 h-3.5" />
                  </span>
                  Clinical Admissions
                </span>
                {expandedSection === 'clinical' ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
              </button>
              
              {expandedSection === 'clinical' && (
                <div className="p-4 grid grid-cols-2 gap-3 border-t border-slate-200/40 bg-slate-50/10">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                      <Activity className="w-3 h-3 text-rose-500" />
                      Respiratory
                    </label>
                    <input 
                      type="number" value={respCases} 
                      onChange={(e) => setRespCases(parseInt(e.target.value) || 0)} 
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs mt-1 text-slate-800 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                      <Heart className="w-3 h-3 text-rose-500" />
                      Cardio
                    </label>
                    <input 
                      type="number" value={cardioCases} 
                      onChange={(e) => setCardioCases(parseInt(e.target.value) || 0)} 
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs mt-1 text-slate-800 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                      <Globe className="w-3 h-3 text-rose-500" />
                      Hospital Adm
                    </label>
                    <input 
                      type="number" value={hospitalAdm} 
                      onChange={(e) => setHospitalAdm(parseInt(e.target.value) || 0)} 
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs mt-1 text-slate-800 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-rose-500" />
                      Impact Score
                    </label>
                    <input 
                      type="number" value={healthScore} step="0.1"
                      onChange={(e) => setHealthScore(parseFloat(e.target.value) || 0)} 
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs mt-1 text-slate-800 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 4: Alerts */}
            <div className="border border-slate-200/50 rounded-2xl overflow-hidden bg-slate-50/40">
              <button 
                onClick={() => toggleSection('alerts')}
                className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-slate-100/40 transition-all"
              >
                <span className="flex items-center gap-2">
                  <span className="p-1 bg-indigo-500/10 text-indigo-600 rounded">
                    <Bell className="w-3.5 h-3.5" />
                  </span>
                  Threshold Alerts
                </span>
                {expandedSection === 'alerts' ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
              </button>
              
              {expandedSection === 'alerts' && (
                <div className="p-4 flex flex-col gap-3 border-t border-slate-200/40 bg-slate-50/10">
                  <input 
                    type="email" placeholder="Recipient email address" 
                    value={emailRecipient}
                    onChange={(e) => setEmailRecipient(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs placeholder-slate-400 text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-500 font-bold">Trigger Threshold (AQI)</span>
                    <input 
                      type="number" value={alertThreshold} 
                      onChange={(e) => setAlertThreshold(parseInt(e.target.value) || 150)} 
                      className="w-20 px-2 py-1 bg-white border border-slate-200 rounded-xl text-xs text-center text-slate-800 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={() => runPrediction()}
              disabled={loading}
              className="w-full mt-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold py-3.5 rounded-2xl text-sm transition-all shadow-lg active:scale-95 duration-200"
            >
              Evaluate Health Risk
            </button>
          </div>
        </section>

        {/* Dynamic Display (Grid span 8) */}
        <section className="lg:col-span-8 flex flex-col gap-8">
          {activeTab === 'dashboard' && (
            <>
              {/* Prediction Display Banner */}
              {prediction !== null ? (
                <div className={`glass p-7 rounded-3xl relative overflow-hidden transition-all duration-500 border-l-4 bg-white/70 ${
                  prediction === 0 ? 'border-emerald-500 shadow-[0_4px_30px_rgba(16,185,129,0.03)]' :
                  prediction === 1 ? 'border-amber-500 shadow-[0_4px_30px_rgba(245,158,11,0.03)]' :
                  'border-rose-500 shadow-[0_4px_30px_rgba(244,63,94,0.03)]'
                } flex flex-col md:flex-row items-start md:items-center justify-between gap-6`}>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`p-1 rounded-lg ${
                        prediction === 0 ? 'bg-emerald-500/10 text-emerald-600' :
                        prediction === 1 ? 'bg-amber-500/10 text-amber-600' :
                        'bg-rose-500/10 text-rose-600'
                      }`}>
                        {prediction === 0 && <ShieldCheck className="w-4 h-4" />}
                        {prediction === 1 && <AlertTriangle className="w-4 h-4" />}
                        {prediction === 2 && <AlertOctagon className="w-4 h-4" />}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pipeline Inference</span>
                    </div>
                    
                    <h3 className="text-2xl font-black mt-2">
                      {prediction === 0 && <span className="text-emerald-600">Class 0: Clean & Low Risk Environment</span>}
                      {prediction === 1 && <span className="text-amber-650">Class 1: Moderate Ambient Concern</span>}
                      {prediction === 2 && <span className="text-rose-600">Class 2: High Alert (Hazardous Levels)</span>}
                    </h3>
                    
                    <p className="text-slate-650 text-sm mt-2 font-medium leading-relaxed">{advice}</p>
                    
                    {alertResult && alertResult.triggered && (
                      <div className="mt-4 flex items-center gap-2 text-xs text-emerald-600 bg-emerald-500/5 px-3 py-1.5 rounded-xl w-max border border-emerald-500/10">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span>SMTP alarm dispatch to: <strong className="font-semibold text-slate-700">{emailRecipient}</strong> ({alertResult.status})</span>
                      </div>
                    )}
                  </div>
                  
                  <button 
                    onClick={handleDownloadReport}
                    className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-100 font-extrabold px-5 py-3 rounded-2xl text-xs transition-all active:scale-95 duration-200 self-stretch md:self-auto justify-center"
                  >
                    <Download className="w-4 h-4 text-emerald-400 animate-bounce" />
                    Download PDF
                  </button>
                </div>
              ) : (
                <div className="glass p-8 rounded-3xl text-center text-slate-500 shadow-sm bg-white/70">
                  <Activity className="w-12 h-12 mx-auto text-emerald-500/20 mb-3 animate-pulse" />
                  <p className="text-sm font-bold">Assessment System Offline</p>
                  <p className="text-xs text-slate-400 mt-1">Use the Coordinates locator or configure environmental inputs to trigger assessment.</p>
                </div>
              )}

              {/* Optimisation Card */}
              {optimizer && (
                <div className="glass p-6 rounded-3xl shadow-md relative overflow-hidden bg-white/70">
                  <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500/70" />
                  <h3 className="text-sm font-extrabold text-slate-800 mb-3 flex items-center gap-2.5">
                    <span className="p-1 bg-emerald-500/10 text-emerald-600 rounded-lg">
                      <Settings className="w-4 h-4" />
                    </span>
                    Counterfactual What-If Optimisation
                  </h3>
                  <div className="bg-slate-50/50 border border-slate-200/50 p-4 rounded-2xl">
                    <p className="text-sm font-medium text-slate-700 leading-relaxed">{optimizer.message}</p>
                    {optimizer.success && (
                      <div className="mt-4 flex items-center gap-3">
                        <div className="flex-1 bg-slate-200 rounded-full h-2.5 overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2.5 rounded-full transition-all duration-700" 
                            style={{ width: `${100 - optimizer.reduction_needed_percent}%` }}
                          />
                        </div>
                        <span className="text-xs text-emerald-600 font-extrabold tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded">
                          -{optimizer.reduction_needed_percent}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Map & Chart split grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Map Panel */}
                <div className="glass p-6 rounded-3xl flex flex-col gap-3 shadow-md hover:border-slate-350/50 transition-all duration-300 bg-white/70">
                  <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2.5">
                    <span className="p-1 bg-emerald-500/10 text-emerald-600 rounded-lg">
                      <MapPin className="w-4 h-4" />
                    </span>
                    Geographic Visual Pin
                  </h3>
                  <div ref={mapRef} className="leaflet-container" />
                </div>

                {/* 7-Day History Chart Panel */}
                <div className="glass p-6 rounded-3xl flex flex-col gap-3 shadow-md hover:border-slate-350/50 transition-all duration-300 bg-white/70">
                  <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2.5">
                    <span className="p-1 bg-emerald-500/10 text-emerald-600 rounded-lg">
                      <BarChart2 className="w-4 h-4" />
                    </span>
                    Historical 7-Day Timeseries
                  </h3>
                  <div className="flex-1 min-h-[350px] bg-slate-50/35 border border-slate-200/50 rounded-2xl p-4 flex flex-col items-center justify-center">
                    {timeseries.length > 0 ? (
                      <ResponsiveContainer width="100%" height={310}>
                        <LineChart data={timeseries}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.04)" />
                          <XAxis dataKey="time" stroke="#64748b" tickFormatter={(val) => val.split('T')[0]} style={{ fontSize: 9, fontWeight: 600 }} />
                          <YAxis stroke="#64748b" style={{ fontSize: 9, fontWeight: 600 }} />
                          <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: 'rgba(15,23,42,0.08)', color: '#1e293b', fontSize: 11, borderRadius: 12 }} />
                          <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                          <Line type="monotone" dataKey="aqi" name="AQI" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
                          <Line type="monotone" dataKey="pm2_5" name="PM2.5" stroke="#10b981" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="pm10" name="PM10" stroke="#3b82f6" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-center p-6 text-slate-400">
                        <BarChart2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-500">No timeseries loaded</p>
                        <p className="text-[10px] text-slate-400 mt-1">Lookup a city coordinate to fetch 168 hours of environmental sensor metrics.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'arena' && (
            <div className="glass p-6 rounded-3xl flex flex-col gap-6 shadow-md bg-white/70">
              <div>
                <h2 className="text-xl font-black text-slate-800">🤼 Classifier Evaluation Arena</h2>
                <p className="text-xs text-slate-500 mt-1 font-medium">Metrics comparison simulated on 20,000 independent test set records.</p>
              </div>

              {Object.keys(modelMetrics).length > 0 ? (
                <div className="overflow-hidden border border-slate-200/60 rounded-2xl bg-white">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200/60 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                        <th className="py-4 px-5">Model Description</th>
                        <th className="py-4 px-5">Accuracy</th>
                        <th className="py-4 px-5">F1 score</th>
                        <th className="py-4 px-5">Recall</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs">
                      {Object.entries(modelMetrics).map(([key, metrics]) => (
                        <tr key={key} className="border-b border-slate-100 hover:bg-slate-50/50 transition-all">
                          <td className="py-4 px-5 font-bold text-slate-800 flex items-center gap-2">
                            {metrics.name}
                            {key === selectedModel && (
                              <span className="inline-flex items-center gap-1 text-[9px] text-emerald-600 border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wide">
                                Active
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-5 font-mono text-emerald-600 font-extrabold">{(metrics.accuracy * 100).toFixed(2)}%</td>
                          <td className="py-4 px-5 font-mono text-slate-600">{(metrics.f1_score * 100).toFixed(2)}%</td>
                          <td className="py-4 px-5 font-mono text-slate-500">{(metrics.recall * 100).toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-slate-500 text-sm">No models metrics available in SQLite filesystem.</p>
              )}

              <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/60 text-xs flex flex-col gap-2 leading-relaxed text-slate-650">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
                  Model Insights
                </span>
                <p className="text-slate-600">- **Random Forest** converges with higher accuracy score due to ensemble voting that models complex nonlinear environmental and cardiovascular interactions.</p>
                <p className="text-slate-600">- **Logistic Regression** represents linear decision boundaries, showing slightly less precision but very low inference overhead.</p>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="glass p-6 rounded-3xl flex flex-col gap-4 shadow-md bg-white/70">
              <div>
                <h2 className="text-xl font-black text-slate-800">💾 SQLite Database Search Logs</h2>
                <p className="text-xs text-slate-500 mt-1 font-medium">Real-time database queries logged to `database.db`.</p>
              </div>

              {history.length > 0 ? (
                <div className="overflow-hidden border border-slate-200/60 rounded-2xl bg-white">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200/60 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                        <th className="py-4 px-5">Time Logged</th>
                        <th className="py-4 px-5">City Lookup</th>
                        <th className="py-4 px-5">AQI</th>
                        <th className="py-4 px-5">AI Class</th>
                        <th className="py-4 px-5">Model</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs">
                      {history.map((row) => (
                        <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="py-3 px-5 text-slate-500 font-medium">{formatTime(row.timestamp)}</td>
                          <td className="py-3 px-5 font-bold text-slate-850">{row.city_name}</td>
                          <td className="py-3 px-5 font-semibold font-mono text-amber-600">{row.aqi}</td>
                          <td className="py-3 px-5">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                              row.prediction === 0 ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' :
                              row.prediction === 1 ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' :
                              'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                            }`}>
                              Class {row.prediction}
                            </span>
                          </td>
                          <td className="py-3 px-5 font-mono text-slate-500">{row.model_used.replace('_', ' ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center p-8 text-slate-500">
                  <Database className="w-10 h-10 mx-auto text-slate-300 mb-2 animate-bounce" />
                  <p className="text-xs font-semibold text-slate-450">No search logs found</p>
                  <p className="text-[10px] text-slate-400 mt-1">Queries are automatically persisted to SQLite whenever you calculate predictions.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="glass p-6 rounded-3xl flex flex-col gap-4 shadow-md bg-white/70">
              <div>
                <h2 className="text-xl font-black text-slate-800">🚨 Threshold Alarm Logs</h2>
                <p className="text-xs text-slate-500 mt-1 font-medium">Audit trail of triggered automated email warnings.</p>
              </div>

              {alerts.length > 0 ? (
                <div className="overflow-hidden border border-slate-200/60 rounded-2xl bg-white">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200/60 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                        <th className="py-4 px-5">Trigger Time</th>
                        <th className="py-4 px-5">City</th>
                        <th className="py-4 px-5">AQI</th>
                        <th className="py-4 px-5">Threshold Set</th>
                        <th className="py-4 px-5">Recipient</th>
                        <th className="py-4 px-5">SMTP State</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs">
                      {alerts.map((row) => (
                        <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="py-3 px-5 text-slate-500 font-medium">{formatTime(row.timestamp)}</td>
                          <td className="py-3 px-5 font-bold text-slate-850">{row.city_name}</td>
                          <td className="py-3 px-5 font-mono font-bold text-rose-600">{row.aqi}</td>
                          <td className="py-3 px-5 font-mono text-slate-500">{row.threshold}</td>
                          <td className="py-3 px-5 text-slate-650 font-medium">{row.recipient_email}</td>
                          <td className="py-3 px-5">
                            <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center p-8 text-slate-500">
                  <Bell className="w-10 h-10 mx-auto text-slate-350 mb-2" />
                  <p className="text-xs font-semibold text-slate-450">No alarms triggered</p>
                  <p className="text-[10px] text-slate-400 mt-1">Configure threshold alarms on the sidebar. Warnings are dispatched if coordinates AQI crosses settings.</p>
                </div>
              )}
            </div>
          )}

        </section>
      </main>

      {/* Footer Banner */}
      <footer className="border-t border-slate-200 bg-slate-100/50 mt-8 py-6 text-center text-xs text-slate-500 relative z-10">
        <p className="tracking-wide">© 2026 AI Health Navigator Pipeline. Designed for advanced geospatial health risk logging.</p>
      </footer>
    </div>
  );
}
