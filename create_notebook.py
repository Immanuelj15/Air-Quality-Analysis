import nbformat as nbf

nb = nbf.v4.new_notebook()
cells = []

# Header
cells.append(nbf.v4.new_markdown_cell("# Air Quality and Health Risk Analysis\n**End-to-End Artificial Intelligence Product Pipeline**"))

# 2.1 Data Collection
cells.append(nbf.v4.new_markdown_cell("## 2.1 Data collection: (Dataset description)\nThis dataset contains 100,000 synthetically generated, mathematically corrected records representing global air quality metrics and localized health impacts. Features include core pollutants (PM10, PM2.5, NO2, SO2, O3), meteorological states, and hospital admission counts. The target is a discrete `HealthImpactClass`."))
cells.append(nbf.v4.new_code_cell("""import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

df = pd.read_csv('CRT_AirQuality_1Lakh_Realistic.csv')
df.head()"""))

# 2.2 Pre-processing
cells.append(nbf.v4.new_markdown_cell("## 2.2 Pre-processing\nHandling missing values via mean imputation and explicitly removing statistically irrelevant identifier columns."))
cells.append(nbf.v4.new_code_cell("""# Drop non-predictive columns
df = df.drop(columns=['RecordID'], errors='ignore')

# Impute missing continuous variables with column means
df.fillna(df.mean(), inplace=True)
df.info()"""))

# 2.3 Standardisation
cells.append(nbf.v4.new_markdown_cell("## 2.3 Standardisation\nNormalizing continuous feature data so that models and dimensionality reduction techniques (like PCA) operate uniformly without variable dominance due to distinct scales."))
cells.append(nbf.v4.new_code_cell("""from sklearn.preprocessing import StandardScaler

# Separate features from target
X = df.drop(columns=['HealthImpactClass'])
y = df['HealthImpactClass']

scaler = StandardScaler()
X_scaled = pd.DataFrame(scaler.fit_transform(X), columns=X.columns)
X_scaled.head()"""))

# 2.4 PCA
cells.append(nbf.v4.new_markdown_cell("## 2.4 Principal Component Analysis (PCA)\nReducing dimensionality to explore cumulative explained variance and structure. *Note: PCA is for EDA. The final estimator utilizes raw features to securely accept unscaled API geocoding data in the production Streamlit UI.*"))
cells.append(nbf.v4.new_code_cell("""from sklearn.decomposition import PCA

pca = PCA(n_components=2)
principal_components = pca.fit_transform(X_scaled)
pca_df = pd.DataFrame(data=principal_components, columns=['PC1', 'PC2'])
pca_df['Target'] = y

plt.figure(figsize=(8,6))
sns.scatterplot(x='PC1', y='PC2', hue='Target', data=pca_df, palette='viridis', alpha=0.5)
plt.title('2D PCA Projection of Air Quality Features')
plt.show()

print("Explained Variance Ratio:", pca.explained_variance_ratio_)"""))

# 2.5 Model building
cells.append(nbf.v4.new_markdown_cell("## 2.5 Model building\nSplitting the original data and training a robust ensemble algorithm (Random Forest) capable of modeling complex nonlinear interactions. The final model is serialized to instantiate the Dashboard."))
cells.append(nbf.v4.new_code_cell("""from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
import joblib

# Using original unscaled X so that live Streamlit API data matches seamlessly
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
model.fit(X_train, y_train)

# Save inference artifact for app.py
joblib.dump(model, 'air_quality_health_model.pkl')
print("Model mathematically converged and correctly persisted to .pkl!")"""))

# 2.6 Evaluating results
cells.append(nbf.v4.new_markdown_cell("## 2.6 Evaluating results\nComputing test set inferences and establishing statistical success against multiple evaluation metrics (Accuracy, F1-Score, Confusion Matrix)."))
cells.append(nbf.v4.new_code_cell("""from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

y_pred = model.predict(X_test)
print(f"Algorithm Accuracy: {accuracy_score(y_test, y_pred) * 100:.2f}%\n")
print("Classification Report:")
print(classification_report(y_test, y_pred))"""))

cells.append(nbf.v4.new_code_cell("""# Confusion Matrix Plot
cm = confusion_matrix(y_test, y_pred)
plt.figure(figsize=(6,4))
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues')
plt.title('Prediction Validation Matrix')
plt.xlabel('Predicted Class')
plt.ylabel('Actual Class')
plt.show()"""))

# 2.7 Prediction
cells.append(nbf.v4.new_markdown_cell("## 2.7 Prediction\nSimulating an isolated inference request (representing a single city's current conditions)."))
cells.append(nbf.v4.new_code_cell("""sample_city = X_test.iloc[[0]]
pred = model.predict(sample_city)
print("Input Features:", sample_city.to_dict(orient='records')[0])
print(f"\\n--> Predicted Health Impact Class: {pred[0]}")"""))

# 2.8 Visualization
cells.append(nbf.v4.new_markdown_cell("## 2.8 Visualization\nGlobal Feature EDA via Correlation Heatmap and Model Explainability via Feature Importance."))
cells.append(nbf.v4.new_code_cell("""# Correlation Matrix
plt.figure(figsize=(12,8))
corr = df.corr()
sns.heatmap(corr, annot=True, fmt='.2f', cmap='coolwarm', linewidths=0.5)
plt.title('Full Synthetic Variable Correlation Profile')
plt.show()"""))

cells.append(nbf.v4.new_code_cell("""# Feature Importance Interpretation
importances = model.feature_importances_
indices = np.argsort(importances)[::-1]

plt.figure(figsize=(10,6))
sns.barplot(x=importances[indices], y=X.columns[indices], palette='magma')
plt.title('Random Forest AI Decision Weights (Explainability)')
plt.show()"""))

# 2.9 Dashboard
cells.append(nbf.v4.new_markdown_cell("## 2.9 Dashboard\n\nThe ML backend is now primed. To initiate the dynamic interface featuring Live Geographic Open-Meteo API Fetching, Counterfactual Prescriptive AI, and PDF Med-Report Generation:\n\n1. Open your terminal in this directory.\n2. Execute: `streamlit run app.py`"))

nb['cells'] = cells

with open('Air_Quality_and_Health_Risk_Final.ipynb', 'w', encoding='utf-8') as f:
    nbf.write(nb, f)

print("Notebook generated successfully!")
