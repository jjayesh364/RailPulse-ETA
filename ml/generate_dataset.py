import os
import numpy as np
import pandas as pd
from pathlib import Path
import json

def get_project_root():
    return Path(__file__).parent.parent

def generate_dataset(num_records, is_validation=False):
    np.random.seed(42 if not is_validation else 420)
    
    # Train IDs from seed
    train_ids = ['12951', '12301', '12002', '12622', '12860', '12903', '12627', '12723', '12259', '12433']
    train_types = ['rajdhani', 'shatabdi', 'express', 'superfast', 'mail']
    zones = ['WR', 'CR', 'NR', 'SR', 'ER', 'NER', 'SWR', 'SCR', 'SER', 'NFR']
    
    # Generate base features
    data = {
        'train_id': np.random.choice(train_ids, num_records),
        'route_id': [f"R_{np.random.randint(1, 20)}" for _ in range(num_records)],
        'section_id': [f"S_{np.random.randint(1, 100)}" for _ in range(num_records)],
        'current_delay_minutes': np.clip(np.random.exponential(scale=20, size=num_records), 0, 120),
        'current_speed_kmph': np.random.uniform(0, 160, num_records),
        'avg_speed_section_kmph': np.random.uniform(40, 130, num_records),
        'distance_to_next_station_km': np.random.uniform(5, 200, num_records),
        'distance_to_destination_km': np.random.uniform(10, 2000, num_records),
        'historical_avg_delay_minutes': np.random.uniform(0, 60, num_records),
        'historical_section_delay_minutes': np.random.uniform(0, 30, num_records),
        'station_dwell_minutes': np.random.uniform(1, 15, num_records),
        'congestion_score': np.random.beta(a=2, b=5, size=num_records),
        'weather_severity': np.random.beta(a=1, b=9, size=num_records),
        'speed_restriction_active': np.random.binomial(1, p=0.2, size=num_records),
        'speed_restriction_severity': np.random.uniform(0, 1, num_records),
        'preceding_train_delay_minutes': np.random.exponential(scale=15, size=num_records),
        'hour_of_day': np.random.randint(0, 24, num_records),
        'day_of_week': np.random.randint(0, 7, num_records),
        'number_of_stops_remaining': np.random.randint(1, 31, num_records),
        'train_type': np.random.choice(train_types, num_records),
        'zone': np.random.choice(zones, num_records),
        'is_holiday': np.random.binomial(1, p=0.05, size=num_records),
        'recent_speed_trend': np.random.uniform(-1, 1, num_records),
        'recent_delay_trend': np.random.uniform(-1, 1, num_records)
    }

    # Add chronological ordering metadata for time-series / temporal validation
    # Starting from a reference epoch and incrementing chronologically
    base_timestamp = pd.Timestamp('2026-01-01 00:00:00')
    # Random incremental steps of 1 to 15 minutes to simulate continuous train observations
    time_deltas = np.random.randint(1, 15, size=num_records)
    cumulative_deltas = np.cumsum(time_deltas)
    timestamps = [base_timestamp + pd.Timedelta(minutes=int(m)) for m in cumulative_deltas]
    
    data['run_order'] = np.arange(1, num_records + 1)
    data['timestamp'] = [ts.strftime('%Y-%m-%d %H:%M:%S') for ts in timestamps]
    
    # Calculate target variable (additional_delay_minutes)
    # Target should be correlated with features
    
    base_additional = np.zeros(num_records)
    
    # 1. Congestion impact
    base_additional += data['congestion_score'] * 30
    
    # 2. Weather impact
    base_additional += data['weather_severity'] * 45
    
    # 3. Speed restriction
    base_additional += data['speed_restriction_active'] * data['speed_restriction_severity'] * 25
    
    # 4. Night time vs Day time
    is_night = (data['hour_of_day'] >= 22) | (data['hour_of_day'] <= 5)
    base_additional -= is_night * 5 # trains run slightly faster at night
    
    is_peak = ((data['hour_of_day'] >= 8) & (data['hour_of_day'] <= 11)) | ((data['hour_of_day'] >= 17) & (data['hour_of_day'] <= 20))
    base_additional += is_peak * 10
    
    # 5. Preceding train delay
    base_additional += data['preceding_train_delay_minutes'] * 0.4
    
    # 6. Trend recovery (if currently delayed and speed trend is positive, recover some delay)
    recovery_factor = (data['current_delay_minutes'] > 30) * (data['recent_speed_trend'] > 0.5) * -15
    base_additional += recovery_factor
    
    # 7. Add some noise
    noise = np.random.normal(0, 5, num_records)
    base_additional += noise
    
    data['additional_delay_minutes'] = base_additional
    
    df = pd.DataFrame(data)
    
    # Make directory if not exists
    output_dir = get_project_root() / 'data' / 'generated'
    os.makedirs(output_dir, exist_ok=True)
    
    if is_validation:
        output_path = output_dir / 'validation_data.csv'
        print(f"Generating validation data (5000 records) to {output_path}")
    else:
        output_path = output_dir / 'historical_train_data.csv'
        print(f"Generating historical data (55000 records) to {output_path}")
        
    df.to_csv(output_path, index=False)
    print("Generation complete!")

if __name__ == '__main__':
    generate_dataset(55000, is_validation=False)
    generate_dataset(5000, is_validation=True)
