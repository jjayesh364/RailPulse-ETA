import os
import json
import joblib
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

try:
    from ml.feature_engineering import prepare_features
except ImportError:
    from feature_engineering import prepare_features

class StatisticalBaseline:
    """
    Domain-Realistic Statistical Baseline for Railway Delay Accumulation.
    Calculates stratified historical conditional averages on the training slice
    using key operational condition attributes with hierarchical fallback.
    """
    def __init__(self, min_samples=10):
        self.min_samples = min_samples
        self.l1_means = {}
        self.l2_means = {}
        self.l3_means = {}
        self.l4_means = {}
        self.l5_means = {}
        self.global_mean = 0.0

    @staticmethod
    def _discretize(df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        # Time of day bucket
        df['time_bucket'] = 'normal'
        if 'hour_of_day' in df.columns:
            df.loc[df['hour_of_day'].isin([22, 23, 0, 1, 2, 3, 4, 5]), 'time_bucket'] = 'night'
            df.loc[df['hour_of_day'].isin([8, 9, 10, 11, 17, 18, 19, 20]), 'time_bucket'] = 'peak'

        # Congestion bucket
        df['cong_bucket'] = 'low'
        if 'congestion_score' in df.columns:
            df.loc[df['congestion_score'] > 0.20, 'cong_bucket'] = 'med'
            df.loc[df['congestion_score'] > 0.45, 'cong_bucket'] = 'high'

        # Caution order
        df['speed_restr'] = df['speed_restriction_active'].fillna(0).astype(int) if 'speed_restriction_active' in df.columns else 0

        # Weather bucket
        df['weather_bucket'] = 'clear'
        if 'weather_severity' in df.columns:
            df.loc[df['weather_severity'] > 0.08, 'weather_bucket'] = 'adverse'

        # Preceding headway delay bucket
        df['preceding_delay_bucket'] = 'none'
        if 'preceding_train_delay_minutes' in df.columns:
            df.loc[df['preceding_train_delay_minutes'] > 5.0, 'preceding_delay_bucket'] = 'moderate'
            df.loc[df['preceding_train_delay_minutes'] > 20.0, 'preceding_delay_bucket'] = 'severe'

        return df

    def fit(self, train_df: pd.DataFrame, target_col='additional_delay_minutes'):
        train_disc = self._discretize(train_df)
        self.global_mean = float(train_df[target_col].mean())

        # Level 1: All 5 operational dimensions
        l1_grp = train_disc.groupby(['time_bucket', 'cong_bucket', 'speed_restr', 'weather_bucket', 'preceding_delay_bucket'])[target_col].agg(['mean', 'count'])
        self.l1_means = l1_grp[l1_grp['count'] >= self.min_samples]['mean'].to_dict()

        # Level 2: 4 operational dimensions (drop weather)
        l2_grp = train_disc.groupby(['time_bucket', 'cong_bucket', 'speed_restr', 'preceding_delay_bucket'])[target_col].agg(['mean', 'count'])
        self.l2_means = l2_grp[l2_grp['count'] >= self.min_samples]['mean'].to_dict()

        # Level 3: 3 operational dimensions (time, congestion, speed restriction)
        l3_grp = train_disc.groupby(['time_bucket', 'cong_bucket', 'speed_restr'])[target_col].agg(['mean', 'count'])
        self.l3_means = l3_grp[l3_grp['count'] >= self.min_samples]['mean'].to_dict()

        # Level 4: 2 operational dimensions (time, congestion)
        l4_grp = train_disc.groupby(['time_bucket', 'cong_bucket'])[target_col].agg(['mean', 'count'])
        self.l4_means = l4_grp[l4_grp['count'] >= self.min_samples]['mean'].to_dict()

        # Level 5: 1 operational dimension (time)
        l5_grp = train_disc.groupby(['time_bucket'])[target_col].agg(['mean', 'count'])
        self.l5_means = l5_grp[l5_grp['count'] >= self.min_samples]['mean'].to_dict()

        return self

    def predict(self, test_df: pd.DataFrame) -> np.ndarray:
        test_disc = self._discretize(test_df)
        preds = []
        for _, row in test_disc.iterrows():
            k1 = (row['time_bucket'], row['cong_bucket'], row['speed_restr'], row['weather_bucket'], row['preceding_delay_bucket'])
            if k1 in self.l1_means:
                preds.append(self.l1_means[k1])
                continue
            k2 = (row['time_bucket'], row['cong_bucket'], row['speed_restr'], row['preceding_delay_bucket'])
            if k2 in self.l2_means:
                preds.append(self.l2_means[k2])
                continue
            k3 = (row['time_bucket'], row['cong_bucket'], row['speed_restr'])
            if k3 in self.l3_means:
                preds.append(self.l3_means[k3])
                continue
            k4 = (row['time_bucket'], row['cong_bucket'])
            if k4 in self.l4_means:
                preds.append(self.l4_means[k4])
                continue
            k5 = (row['time_bucket'],)
            if k5 in self.l5_means:
                preds.append(self.l5_means[k5])
                continue
            preds.append(self.global_mean)
        return np.array(preds)


def get_project_root():
    return Path(__file__).parent.parent

def evaluate_model():
    root = get_project_root()
    data_path = root / 'data' / 'generated' / 'historical_train_data.csv'
    model_dir = root / 'ml' / 'model'
    
    if not data_path.exists():
        print(f"Dataset not found at {data_path}")
        return
        
    if not (model_dir / 'eta_model.joblib').exists():
        print("Model not found. Train the model first.")
        return
        
    print("Loading model, preprocessor, and historical dataset...")
    df = pd.read_csv(data_path)
    gb_model = joblib.load(model_dir / 'eta_model.joblib')
    scaler = joblib.load(model_dir / 'preprocessor.joblib')

    # Load Random Forest model if trained, or instantiate/fit if needed
    rf_model = None
    if (model_dir / 'rf_model.joblib').exists():
        try:
            rf_model = joblib.load(model_dir / 'rf_model.joblib')
        except Exception:
            rf_model = None

    # Temporal split: Sort chronologically by timestamp / run_order if present
    if 'timestamp' in df.columns:
        df = df.sort_values(by='timestamp').reset_index(drop=True)
    elif 'run_order' in df.columns:
        df = df.sort_values(by='run_order').reset_index(drop=True)

    n_records = len(df)
    train_size = int(n_records * 0.8) # 80% earlier for training, 20% later for evaluation
    train_df = df.iloc[:train_size].copy()
    test_df = df.iloc[train_size:].copy()

    print(f"\n--- Temporal Time-Series Split ---")
    print(f"Total Records:      {n_records}")
    print(f"Training Window:    0 to {train_size - 1} ({train_size} records, {train_size/n_records*100:.0f}%)")
    print(f"Evaluation Window:  {train_size} to {n_records - 1} ({len(test_df)} unseen subsequent records, {len(test_df)/n_records*100:.0f}%)")

    X_train_raw = train_df.drop(columns=['additional_delay_minutes'], errors='ignore')
    X_test_raw = test_df.drop(columns=['additional_delay_minutes'], errors='ignore')

    X_train = prepare_features(X_train_raw)
    X_test = prepare_features(X_test_raw)

    y_train = train_df['additional_delay_minutes']
    y_test = test_df['additional_delay_minutes']

    X_test_scaled = scaler.transform(X_test)

    # 1. Non-ML Naive Baseline: Assume no additional delay accumulates (predicted additional delay = 0)
    # Train is expected to progress with only its current delay.
    y_pred_naive = np.zeros_like(y_test)
    naive_mae = mean_absolute_error(y_test, y_pred_naive)
    naive_rmse = np.sqrt(mean_squared_error(y_test, y_pred_naive))
    naive_r2 = r2_score(y_test, y_pred_naive)

    # 2. Domain-Realistic Statistical Baseline: Hierarchical Operational Stratified Conditional Mean
    # Conditioned strictly on historical training slice (time bucket, congestion bucket, speed restriction, weather, preceding delay)
    stat_baseline = StatisticalBaseline(min_samples=10)
    stat_baseline.fit(train_df)
    y_pred_stat = stat_baseline.predict(test_df)

    stat_mae = mean_absolute_error(y_test, y_pred_stat)
    stat_rmse = np.sqrt(mean_squared_error(y_test, y_pred_stat))
    stat_r2 = r2_score(y_test, y_pred_stat)

    # 3. Gradient Boosting model predictions
    y_pred_gb = gb_model.predict(X_test_scaled)
    gb_mae = mean_absolute_error(y_test, y_pred_gb)
    gb_rmse = np.sqrt(mean_squared_error(y_test, y_pred_gb))
    gb_r2 = r2_score(y_test, y_pred_gb)

    # 4. Random Forest model predictions
    rf_mae, rf_rmse, rf_r2 = None, None, None
    if rf_model is not None:
        y_pred_rf = rf_model.predict(X_test_scaled)
        rf_mae = mean_absolute_error(y_test, y_pred_rf)
        rf_rmse = np.sqrt(mean_squared_error(y_test, y_pred_rf))
        rf_r2 = r2_score(y_test, y_pred_rf)
    else:
        # Load from metrics.json if available
        if (model_dir / 'metrics.json').exists():
            try:
                with open(model_dir / 'metrics.json', 'r') as mf:
                    stored_m = json.load(mf)
                    if 'Random Forest' in stored_m:
                        rf_mae = stored_m['Random Forest'].get('mae')
                        rf_rmse = stored_m['Random Forest'].get('rmse')
                        rf_r2 = stored_m['Random Forest'].get('r2')
            except Exception:
                pass

    # Calculate improvements over Naive Baseline
    mae_reduction_naive = naive_mae - gb_mae
    mae_improvement_pct_naive = ((naive_mae - gb_mae) / naive_mae) * 100.0 if naive_mae > 0 else 0.0
    rmse_reduction_naive = naive_rmse - gb_rmse
    rmse_improvement_pct_naive = ((naive_rmse - gb_rmse) / naive_rmse) * 100.0 if naive_rmse > 0 else 0.0

    # Calculate improvements over Statistical Baseline
    mae_reduction_stat = stat_mae - gb_mae
    mae_improvement_pct_stat = ((stat_mae - gb_mae) / stat_mae) * 100.0 if stat_mae > 0 else 0.0
    rmse_reduction_stat = stat_rmse - gb_rmse
    rmse_improvement_pct_stat = ((stat_rmse - gb_rmse) / stat_rmse) * 100.0 if stat_rmse > 0 else 0.0

    temporal_results = {
        "evaluation_methodology": "temporal_walk_forward_split",
        "dataset": "data/generated/historical_train_data.csv",
        "dataset_type": "synthetic_indian_railways_corridor_simulation",
        "total_records": n_records,
        "train_window": {
            "records": train_size,
            "ratio": 0.8,
            "description": "Chronologically earlier records (uninterrupted by future data)"
        },
        "test_window": {
            "records": len(test_df),
            "ratio": 0.2,
            "description": "Chronologically later unseen records (strictly out-of-time)"
        },
        # Backwards compatible alias pointing to naive baseline
        "baseline_model": {
            "description": "Current delay only (zero incremental delay assumed)",
            "mae": round(float(naive_mae), 4),
            "rmse": round(float(naive_rmse), 4),
            "r2": round(float(naive_r2), 4)
        },
        "naive_baseline": {
            "description": "Current delay only (zero incremental delay assumed)",
            "mae": round(float(naive_mae), 4),
            "rmse": round(float(naive_rmse), 4),
            "r2": round(float(naive_r2), 4)
        },
        "statistical_baseline": {
            "description": "Hierarchical operational-condition stratified mean (time bucket, congestion, caution order, weather, headway)",
            "mae": round(float(stat_mae), 4),
            "rmse": round(float(stat_rmse), 4),
            "r2": round(float(stat_r2), 4),
            "fallback_levels": [
                "L1: (time_bucket, cong_bucket, speed_restr, weather_bucket, preceding_delay_bucket)",
                "L2: (time_bucket, cong_bucket, speed_restr, preceding_delay_bucket)",
                "L3: (time_bucket, cong_bucket, speed_restr)",
                "L4: (time_bucket, cong_bucket)",
                "L5: (time_bucket)",
                "L6: global_train_mean"
            ]
        },
        "gradient_boosting": {
            "description": "Trained GradientBoostingRegressor with feature engineering",
            "mae": round(float(gb_mae), 4),
            "rmse": round(float(gb_rmse), 4),
            "r2": round(float(gb_r2), 4)
        },
        "random_forest": {
            "description": "Trained RandomForestRegressor with feature engineering",
            "mae": round(float(rf_mae), 4) if rf_mae is not None else None,
            "rmse": round(float(rf_rmse), 4) if rf_rmse is not None else None,
            "r2": round(float(rf_r2), 4) if rf_r2 is not None else None
        },
        "improvement_over_baseline": {
            "mae_reduction_minutes": round(float(mae_reduction_naive), 4),
            "mae_improvement_percent": round(float(mae_improvement_pct_naive), 2),
            "rmse_reduction_minutes": round(float(rmse_reduction_naive), 4),
            "rmse_improvement_percent": round(float(rmse_improvement_pct_naive), 2)
        },
        "improvement_over_statistical_baseline": {
            "mae_reduction_minutes": round(float(mae_reduction_stat), 4),
            "mae_improvement_percent": round(float(mae_improvement_pct_stat), 2),
            "rmse_reduction_minutes": round(float(rmse_reduction_stat), 4),
            "rmse_improvement_percent": round(float(rmse_improvement_pct_stat), 2)
        }
    }

    print("\n=======================================================")
    print("        TEMPORAL / WALK-FORWARD EVALUATION REPORT       ")
    print("=======================================================")
    print(f"Naive Baseline (Delta=0): MAE = {naive_mae:.4f} min, RMSE = {naive_rmse:.4f} min, R^2 = {naive_r2:.4f}")
    print(f"Statistical Baseline:     MAE = {stat_mae:.4f} min, RMSE = {stat_rmse:.4f} min, R^2 = {stat_r2:.4f}")
    if rf_mae is not None:
        print(f"Random Forest:            MAE = {rf_mae:.4f} min, RMSE = {rf_rmse:.4f} min, R^2 = {rf_r2:.4f}")
    print(f"Gradient Boosting (GB):   MAE = {gb_mae:.4f} min, RMSE = {gb_rmse:.4f} min, R^2 = {gb_r2:.4f}")
    print(f"\nML Improvement over Naive Baseline (Delta=0):")
    print(f"  MAE Reduction:  {mae_reduction_naive:.2f} min ({mae_improvement_pct_naive:.1f}% error reduction)")
    print(f"  RMSE Reduction: {rmse_reduction_naive:.2f} min ({rmse_improvement_pct_naive:.1f}% error reduction)")
    print(f"\nML Improvement over Domain Statistical Baseline:")
    print(f"  MAE Reduction:  {mae_reduction_stat:.2f} min ({mae_improvement_pct_stat:.1f}% error reduction)")
    print(f"  RMSE Reduction: {rmse_reduction_stat:.2f} min ({rmse_improvement_pct_stat:.1f}% error reduction)")
    print("=======================================================\n")

    # Save to both temporal_evaluation_results.json and evaluation_results.json
    out_file = model_dir / 'temporal_evaluation_results.json'
    with open(out_file, 'w') as f:
        json.dump(temporal_results, f, indent=4)
    print(f"Saved temporal evaluation report to {out_file}")

    # Backward compatible evaluation_results.json
    compat_metrics = {
        'mae': round(float(gb_mae), 4),
        'rmse': round(float(gb_rmse), 4),
        'r2': round(float(gb_r2), 4),
        'baseline_mae': round(float(naive_mae), 4),
        'statistical_baseline_mae': round(float(stat_mae), 4),
        'mae_reduction': round(float(mae_reduction_naive), 4),
        'mae_reduction_over_statistical': round(float(mae_reduction_stat), 4),
        'evaluation_type': 'temporal_split'
    }
    with open(model_dir / 'evaluation_results.json', 'w') as f:
        json.dump(compat_metrics, f, indent=4)

    # Generate Plots
    print("Generating updated evaluation diagnostic plots...")
    try:
        # 1. Scatter Plot
        plt.figure(figsize=(10, 6))
        plt.scatter(y_test, y_pred_gb, alpha=0.3, color='#3b82f6')
        plt.plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], 'r--', lw=2)
        plt.xlabel('Actual Additional Delay (minutes)')
        plt.ylabel('Predicted Additional Delay (minutes)')
        plt.title('Gradient Boosting: Prediction vs Actual (Temporal Test Window)')
        plt.savefig(model_dir / 'scatter_plot.png')
        plt.close()
        
        # 2. Error Distribution
        errors = y_pred_gb - y_test
        plt.figure(figsize=(10, 6))
        plt.hist(errors, bins=50, edgecolor='black', color='#10b981')
        plt.xlabel('Prediction Error (minutes)')
        plt.ylabel('Frequency')
        plt.title('Temporal Error Distribution Histogram')
        plt.savefig(model_dir / 'error_distribution.png')
        plt.close()
    except Exception as e:
        print(f"Plot generation notice: {e}")
        
    print("Evaluation routine complete.")

if __name__ == '__main__':
    evaluate_model()
