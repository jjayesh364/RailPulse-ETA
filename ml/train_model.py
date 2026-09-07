import os
import json
import joblib
import pandas as pd
from pathlib import Path
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import numpy as np

try:
    from ml.feature_engineering import prepare_features, get_feature_columns
except ImportError:
    from feature_engineering import prepare_features, get_feature_columns

def get_project_root():
    return Path(__file__).parent.parent

def train_and_evaluate():
    root = get_project_root()
    data_path = root / 'data' / 'generated' / 'historical_train_data.csv'
    model_dir = root / 'ml' / 'model'
    
    os.makedirs(model_dir, exist_ok=True)
    
    print("Loading data...")
    df = pd.read_csv(data_path)
    
    # Prepare features
    print("Engineering features...")
    X_raw = df.drop(columns=['additional_delay_minutes'])
    X = prepare_features(X_raw)
    y = df['additional_delay_minutes']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    print("Training Random Forest...")
    rf_model = RandomForestRegressor(n_estimators=50, max_depth=10, n_jobs=-1, random_state=42)
    rf_model.fit(X_train_scaled, y_train)
    
    print("Training Gradient Boosting...")
    gb_model = GradientBoostingRegressor(n_estimators=100, learning_rate=0.1, max_depth=5, random_state=42)
    gb_model.fit(X_train_scaled, y_train)
    
    # Evaluate
    models = {'Random Forest': rf_model, 'Gradient Boosting': gb_model}
    best_model = None
    best_r2 = -float('inf')
    best_name = ""
    
    metrics_dict = {}
    
    for name, model in models.items():
        y_pred = model.predict(X_test_scaled)
        mae = mean_absolute_error(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        r2 = r2_score(y_test, y_pred)
        
        print(f"\n{name} Results:")
        print(f"MAE:  {mae:.4f}")
        print(f"RMSE: {rmse:.4f}")
        print(f"R²:   {r2:.4f}")
        
        metrics_dict[name] = {'mae': mae, 'rmse': rmse, 'r2': r2}
        
        if r2 > best_r2:
            best_r2 = r2
            best_model = model
            best_name = name
            
    print(f"\nBest Model: {best_name}")
    
    # Save everything
    print("Saving model, preprocessor, and metadata...")
    
    joblib.dump(best_model, model_dir / 'eta_model.joblib')
    joblib.dump(rf_model, model_dir / 'rf_model.joblib')
    joblib.dump(scaler, model_dir / 'preprocessor.joblib')
    
    # Feature importance
    importance = best_model.feature_importances_
    features = get_feature_columns()
    feat_imp = {f: float(i) for f, i in zip(features, importance)}
    # sort
    feat_imp = dict(sorted(feat_imp.items(), key=lambda item: item[1], reverse=True))
    
    with open(model_dir / 'feature_importance.json', 'w') as f:
        json.dump(feat_imp, f, indent=4)
        
    with open(model_dir / 'metrics.json', 'w') as f:
        json.dump(metrics_dict, f, indent=4)
        
    print("Done!")

if __name__ == '__main__':
    train_and_evaluate()
