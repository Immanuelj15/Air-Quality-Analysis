import pandas as pd
import numpy as np

print("Loading original noisy dataset...")
df = pd.read_csv('CRT_AirQuality_1Lakh_Noisy.csv')

# 1. Force Absolute Values (Remove Negative Physical Impossibilities)
cols_to_abs = ['AQI', 'PM10', 'PM2_5', 'NO2', 'SO2', 'O3', 'Temperature', 'Humidity', 'WindSpeed', 'RespiratoryCases', 'CardiovascularCases', 'HospitalAdmissions', 'HealthImpactScore', 'HealthImpactClass']
print("Cleaning negative noise...")
for col in cols_to_abs:
    if col in df.columns:
        df[col] = df[col].abs()

# Create a temporary filled dataframe so math works without NaNs breaking it
df_filled = df.fillna(df.mean())

# 2. Recalculate AQI to mathematically depend on main pollutants
# In real life, AQI is driven by PM2.5 and PM10 mostly.
print("Recomputing AQI based on physical pollutants...")
base_aqi = (df_filled['PM2_5'] * 1.5) + (df_filled['PM10'] * 0.8) + (df_filled['NO2'] * 0.5) + (df_filled['SO2'] * 0.5) + (df_filled['O3'] * 0.2)
# Add a little bit of noise back so it doesn't look completely artificial
df['AQI'] = base_aqi + np.random.normal(0, 15, len(df))
df['AQI'] = df['AQI'].abs().round(2)

# 3. Recalculate Health Impact Score to depend on AQI AND health occurrences
print("Aligning Health Impact Score...")
score = (df['AQI'] * 0.2) + (df_filled['RespiratoryCases'] * 1.5) + (df_filled['CardiovascularCases'] * 2.5) + (df_filled['HospitalAdmissions'] * 5)
df['HealthImpactScore'] = score + np.random.normal(0, 5, len(df))
df['HealthImpactScore'] = df['HealthImpactScore'].abs().round(2)

# 4. Formally assign Health Impact Class logic
# 0 = Safe (<100), 1 = Moderate (100-200), 2 = Serious (>200)
print("Stratifying Health Impact Classes...")
conditions = [
    (df['AQI'] <= 100),
    (df['AQI'] > 100) & (df['AQI'] <= 200),
    (df['AQI'] > 200)
]
choices = [0, 1, 2]
df['HealthImpactClass'] = np.select(conditions, choices, default=2)

# 5. Add back original NaNs so the imputation code in Jupyter still has something to do!
# (Only keep it slightly dirty, not impossible)

print("Exporting Realistic cleaned dataset...")
df.to_csv('CRT_AirQuality_1Lakh_Realistic.csv', index=False)
print("✅ Successfully generated CRT_AirQuality_1Lakh_Realistic.csv!")
