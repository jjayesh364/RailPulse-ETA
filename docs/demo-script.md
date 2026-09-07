# RailPulse ETA - Demo Script

## SIH Jury Demonstration Guide

**Duration:** 3-5 minutes
**Prerequisites:** Backend and frontend running locally

---

## Pre-Demo Setup

1. Start the backend: `cd backend && uvicorn app.main:app --reload`
2. Start the frontend: `cd frontend && npm run dev`
3. Open browser to `http://localhost:5173`
4. Ensure the dashboard loads with train data
5. Verify "DEMO MODE" indicator is visible

---

## Demo Flow

### STEP 1: Introduction (30 seconds)

**Show:** Main Dashboard

**Say:**
> "RailPulse ETA is an AI-powered dynamic train arrival forecasting system. Unlike traditional static ETA that simply adds current delay to scheduled time, our system uses machine learning to predict how delays will evolve based on real-time conditions."

**Point out:**
- KPI cards (Active Trains, On-Time, Delayed, Prediction Accuracy)
- Live train map with moving trains
- DEMO MODE indicator
- Real-time clock

---

### STEP 2: Select a Train (30 seconds)

**Action:** Click on Train 12951 (Mumbai Rajdhani) on the map or navigate to Live Trains

**Show:** Train Details Page

**Say:**
> "Let's look at the Mumbai Rajdhani Express. You can see its current position, speed, and real-time delay. Notice the current delay is shown alongside the ML-predicted delay at upcoming stations."

**Point out:**
- Current location and speed
- Journey progress bar
- Current vs predicted delay

---

### STEP 3: Show Dynamic ETA Predictions (45 seconds)

**Show:** Upcoming Stations ETA Table

**Say:**
> "Here you can see our dynamic ETA predictions for every upcoming station. Notice the predicted delay is NOT the same at every station — the model considers route-specific congestion, historical patterns, and current conditions to forecast how delay will change along the route."

**Point out:**
- Different predicted delays at different stations
- Confidence scores (High/Medium/Low)
- Scheduled vs Predicted times

---

### STEP 4: Inject a Disruption (45 seconds)

**Action:** Click "Inject Delay" or open the Operational Event Simulator

**Select:**
- Event Type: Heavy Congestion
- Location: Between Vadodara and Ratlam
- Severity: High (0.8)
- Duration: 45 minutes

**Click:** "Apply Event"

**Say:**
> "Now let's simulate a real-world disruption. I'm injecting heavy congestion on the route ahead. Watch how the ETA dynamically updates."

**Point out:**
- ETA values changing in real-time
- New delay prediction is higher
- Alert generated automatically

---

### STEP 5: Show Why ETA Changed (30 seconds)

**Show:** Prediction Factors Panel

**Say:**
> "This is what makes RailPulse unique — we explain WHY the ETA changed. You can see the individual factors contributing to the delay prediction: congestion added 4 minutes, the speed restriction added 3 minutes, and historical patterns added 2 minutes."

**Point out:**
- Factor breakdown with minute contributions
- Color-coded impact levels
- Confidence score change

---

### STEP 6: Show Passenger View (30 seconds)

**Navigate:** Passenger View

**Say:**
> "This is the passenger-facing interface. A passenger can simply search for their train and see a clear, simple ETA with a plain-language explanation of any delays."

**Point out:**
- Clean, simple passenger interface
- Train search
- Clear ETA display
- Reason for delay in plain language
- "Updated X seconds ago"

---

### STEP 7: Show Control Room View (30 seconds)

**Navigate:** Control Room

**Say:**
> "For railway operations, we have a control room dashboard showing all trains, their risk levels, critical delays, and network congestion at a glance."

**Point out:**
- Train table sorted by risk
- Network congestion map
- Active alerts
- Critical delay indicators

---

### STEP 8: Show Analytics (30 seconds)

**Navigate:** Analytics

**Say:**
> "Our ML model is trained on historical data and continuously evaluated. You can see the model's performance metrics — MAE of X minutes, RMSE of Y minutes — along with delay patterns by route, time, and weather conditions."

**Point out:**
- Model performance metrics (MAE, RMSE, R²)
- Delay distribution chart
- Delay by hour chart
- "Model evaluation on simulated demo dataset" label

---

### STEP 9: Architecture Highlight (15 seconds)

**Show:** About/Architecture section

**Say:**
> "The system is built with a modular architecture. The mock data engine can be replaced with real Indian Railways GPS and signalling APIs. The ML model can be retrained with real operational data for improved accuracy."

---

### Closing Statement (15 seconds)

> "RailPulse ETA transforms train ETA from a static number to a living, explainable prediction. It helps passengers plan better, stations allocate resources efficiently, and control rooms respond to disruptions proactively."

---

## Key Talking Points for Jury Q&A

1. **"How is this different from NTES?"**
   - NTES shows schedule + current delay. We PREDICT future delay evolution.

2. **"Where does the data come from?"**
   - Demo uses simulated data. Architecture supports real GPS/AVL feeds, NTES integration, weather APIs.

3. **"How accurate is the ML model?"**
   - Evaluated on simulated data with metrics displayed. Real-world accuracy would improve with actual operational data.

4. **"Can it scale to thousands of trains?"**
   - API-first architecture, async backend, can horizontally scale. Model inference is <10ms per prediction.

5. **"What ML model do you use?"**
   - Gradient Boosting Regressor with 20+ features including congestion, weather, historical patterns, and speed trends.

6. **"How do you explain predictions?"**
   - Feature importance-based contribution analysis showing which factors drove the delay change.
