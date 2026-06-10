import sqlite3
import os
from datetime import datetime

DATABASE_NAME = "database.db"

def get_db_path():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(current_dir, DATABASE_NAME)

def init_db():
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Create query_history table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS query_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            city_name TEXT NOT NULL,
            aqi REAL NOT NULL,
            pm2_5 REAL NOT NULL,
            pm10 REAL NOT NULL,
            prediction INTEGER NOT NULL,
            model_used TEXT NOT NULL
        )
    """)
    
    # Create alerts table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS alert_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            city_name TEXT NOT NULL,
            aqi REAL NOT NULL,
            threshold REAL NOT NULL,
            recipient_email TEXT NOT NULL,
            status TEXT NOT NULL
        )
    """)
    
    conn.commit()
    conn.close()
    print("[DB] Database initialized successfully.")

def log_search(city_name, aqi, pm2_5, pm10, prediction, model_used):
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    timestamp = datetime.now().isoformat()
    cursor.execute("""
        INSERT INTO query_history (timestamp, city_name, aqi, pm2_5, pm10, prediction, model_used)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (timestamp, city_name, aqi, pm2_5, pm10, prediction, model_used))
    
    conn.commit()
    conn.close()

def log_alert(city_name, aqi, threshold, email, status):
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    timestamp = datetime.now().isoformat()
    cursor.execute("""
        INSERT INTO alert_logs (timestamp, city_name, aqi, threshold, recipient_email, status)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (timestamp, city_name, aqi, threshold, email, status))
    
    conn.commit()
    conn.close()

def get_history(limit=50):
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    # Return as list of dictionaries
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM query_history ORDER BY id DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    
    history = [dict(row) for row in rows]
    conn.close()
    return history

def get_alerts(limit=50):
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM alert_logs ORDER BY id DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    
    alerts = [dict(row) for row in rows]
    conn.close()
    return alerts

# Initialize database when importing
init_db()
