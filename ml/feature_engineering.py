import pandas as pd
import numpy as np

def encode_train_type(df):
    """One-hot encode train type"""
    if 'train_type' in df.columns:
        dummies = pd.get_dummies(df['train_type'], prefix='type', drop_first=False)
        # Ensure all possible types exist (for prediction phase)
        expected_cols = ['type_rajdhani', 'type_shatabdi', 'type_express', 'type_superfast', 'type_mail']
        for col in expected_cols:
            if col not in dummies.columns:
                dummies[col] = 0
        df = pd.concat([df, dummies[expected_cols]], axis=1)
        df = df.drop('train_type', axis=1)
    return df

def encode_zone(df):
    """One-hot encode railway zone"""
    if 'zone' in df.columns:
        dummies = pd.get_dummies(df['zone'], prefix='zone', drop_first=False)
        expected_cols = [f'zone_{z}' for z in ['WR', 'CR', 'NR', 'SR', 'ER', 'NER', 'SWR', 'SCR', 'SER', 'NFR']]
        for col in expected_cols:
            if col not in dummies.columns:
                dummies[col] = 0
        df = pd.concat([df, dummies[expected_cols]], axis=1)
        df = df.drop('zone', axis=1)
    return df

def create_time_features(df):
    """Cyclical encoding of time features"""
    if 'hour_of_day' in df.columns:
        df['hour_sin'] = np.sin(2 * np.pi * df['hour_of_day'] / 24.0)
        df['hour_cos'] = np.cos(2 * np.pi * df['hour_of_day'] / 24.0)
    if 'day_of_week' in df.columns:
        df['day_sin'] = np.sin(2 * np.pi * df['day_of_week'] / 7.0)
        df['day_cos'] = np.cos(2 * np.pi * df['day_of_week'] / 7.0)
    return df

def create_interaction_features(df):
    """Create interaction features"""
    df['congestion_x_distance'] = df['congestion_score'] * df['distance_to_next_station_km']
    df['weather_x_speed_restr'] = df['weather_severity'] * df['speed_restriction_active']
    df['delay_x_trend'] = df['current_delay_minutes'] * df['recent_delay_trend']
    return df

def normalize_features(df):
    """Normalization logic handled by scaler in train_model, but we can do basic clipping here"""
    df['current_speed_kmph'] = df['current_speed_kmph'].clip(0, 160)
    return df

def handle_missing_values(df):
    """Handle NaNs"""
    df = df.fillna(0)
    return df

def get_feature_columns():
    """Return the final list of feature column names after engineering"""
    base_cols = [
        'current_delay_minutes', 'current_speed_kmph', 'avg_speed_section_kmph',
        'distance_to_next_station_km', 'distance_to_destination_km',
        'historical_avg_delay_minutes', 'historical_section_delay_minutes',
        'station_dwell_minutes', 'congestion_score', 'weather_severity',
        'speed_restriction_active', 'speed_restriction_severity',
        'preceding_train_delay_minutes', 'number_of_stops_remaining',
        'is_holiday', 'recent_speed_trend', 'recent_delay_trend',
        'hour_sin', 'hour_cos', 'day_sin', 'day_cos',
        'congestion_x_distance', 'weather_x_speed_restr', 'delay_x_trend',
        'type_rajdhani', 'type_shatabdi', 'type_express', 'type_superfast', 'type_mail'
    ]
    zone_cols = [f'zone_{z}' for z in ['WR', 'CR', 'NR', 'SR', 'ER', 'NER', 'SWR', 'SCR', 'SER', 'NFR']]
    return base_cols + zone_cols

def prepare_features(df):
    """Full feature engineering pipeline"""
    df_proc = df.copy()
    df_proc = handle_missing_values(df_proc)
    df_proc = encode_train_type(df_proc)
    df_proc = encode_zone(df_proc)
    df_proc = create_time_features(df_proc)
    df_proc = create_interaction_features(df_proc)
    df_proc = normalize_features(df_proc)
    
    # Ensure all required columns are present
    feature_cols = get_feature_columns()
    for col in feature_cols:
        if col not in df_proc.columns:
            df_proc[col] = 0
            
    return df_proc[feature_cols]
