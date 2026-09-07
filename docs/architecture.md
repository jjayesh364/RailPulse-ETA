# RailPulse ETA - Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + TypeScript)                │
│                                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │Dashboard │ │Train     │ │Passenger │ │Control   │ │Analytics │ │
│  │          │ │Details   │ │View      │ │Room      │ │          │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ │
│       │             │            │             │            │       │
│  ┌────┴─────────────┴────────────┴─────────────┴────────────┴────┐ │
│  │              API Service Layer + WebSocket Client              │ │
│  └───────────────────────────┬───────────────────────────────────┘ │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
                    REST API / WebSocket
                               │
┌──────────────────────────────┼──────────────────────────────────────┐
│                     BACKEND (FastAPI + Python)                      │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                      API Layer (FastAPI)                      │  │
│  │  /api/trains  /api/alerts  /api/network  /api/simulation     │  │
│  │  /api/analytics  /api/eta  /ws/live                          │  │
│  └──────────────────────────┬───────────────────────────────────┘  │
│                              │                                      │
│  ┌──────────────┐ ┌─────────┴────────┐ ┌──────────────────────┐  │
│  │  ETA Service │ │  Train Service   │ │  Alert Service       │  │
│  │              │ │                  │ │                      │  │
│  │ ML Predictor │ │  Position Mgmt   │ │  Auto-generation     │  │
│  │ Confidence   │ │  Route Mgmt      │ │  Severity Levels     │  │
│  │ Factors      │ │  History Mgmt    │ │                      │  │
│  └──────┬───────┘ └──────────────────┘ └──────────────────────┘  │
│         │                                                          │
│  ┌──────┴───────────────────────────────────────────────────────┐  │
│  │                  Simulation Engine                            │  │
│  │                                                               │  │
│  │  ┌────────────────┐    ┌─────────────────────────────────┐   │  │
│  │  │ Data Source     │    │  State Manager                  │   │  │
│  │  │ (Abstract)      │    │  - Train positions              │   │  │
│  │  │                 │    │  - Speeds                       │   │  │
│  │  │ ├── MockData    │    │  - Delays                       │   │  │
│  │  │ └── RealData    │    │  - Congestion                   │   │  │
│  │  │     (future)    │    │  - Events                       │   │  │
│  │  └────────────────┘    └─────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│  ┌───────────────────────────┴──────────────────────────────────┐  │
│  │                    Database (SQLite)                          │  │
│  │  Trains | Stations | Routes | Positions | ETAs | Events      │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                               │
                       ┌───────┴───────┐
                       │  ML Pipeline  │
                       │               │
                       │ Dataset Gen   │
                       │ Feature Eng   │
                       │ Model Train   │
                       │ Prediction    │
                       │ Evaluation    │
                       └───────────────┘
```

## Data Flow

### Real-Time ETA Prediction Flow

1. **Simulation Engine** generates train telemetry (position, speed, delay)
2. **Feature Engineering** extracts features from current state + historical data
3. **ML Model** predicts additional delay for each upcoming station
4. **ETA Service** calculates: `predicted_time = current_time + running_time + predicted_delay + dwell_time`
5. **Confidence Score** is computed based on data quality and prediction uncertainty
6. **Prediction Factors** explain what contributed to the delay prediction
7. **WebSocket** broadcasts updates to connected frontend clients
8. **Alerts** are generated for significant ETA changes

### Data Source Abstraction

```
DataSource (Abstract Interface)
    │
    ├── MockRailwayDataSource (Demo/SIH Prototype)
    │   - Simulated GPS coordinates
    │   - Synthetic weather data
    │   - Generated congestion levels
    │   - Randomized operational events
    │
    └── RealRailwayDataSource (Future Production)
        - Real GPS/AVL feeds
        - NTES / authorized railway APIs
        - Signal system integration
        - Weather API integration
        - Track maintenance feeds
```

## Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Frontend | React + TypeScript + Vite | UI application |
| Styling | Tailwind CSS | Responsive design |
| Charts | Recharts | Data visualization |
| Maps | React Leaflet | Train location maps |
| Backend | Python + FastAPI | REST API server |
| Database | SQLite (async) | Data persistence |
| ML | scikit-learn | ETA prediction model |
| Real-time | WebSocket | Live updates |
| Data | pandas + numpy | Data processing |

## Key Design Decisions

1. **SQLite over PostgreSQL**: Simplifies local setup; can be swapped for PostgreSQL in production
2. **Mock Data Engine**: Abstracted behind interface; easily replaceable with real data sources
3. **Async Backend**: FastAPI async for handling concurrent WebSocket connections
4. **Pre-trained Model**: Model is trained offline and loaded at startup for fast predictions
5. **Feature Contributions**: Approximate SHAP-like explanations using feature importance weighting
