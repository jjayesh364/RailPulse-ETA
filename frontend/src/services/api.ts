import axios from 'axios';
import { 
  Train, TrainPosition, ETAPrediction, RouteStop, 
  Alert, CongestionSection, AnalyticsData, SimulationStatus, OperationalEvent,
  KPIData
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE,
});

export const getHealth = () => api.get('/health').then(res => res.data);
export const getKPIs = () => api.get<KPIData>('/kpis').then(res => res.data);

export const getTrains = (search?: string): Promise<Train[]> => 
  api.get('/trains', { params: { search } }).then(res => {
    if (Array.isArray(res.data)) return res.data;
    if (res.data && Array.isArray(res.data.trains)) return res.data.trains;
    return [];
  });

export const getTrain = (id: string) => 
  api.get<Train>(`/trains/${id}`).then(res => res.data);

export const getTrainPosition = (id: string) => 
  api.get<TrainPosition>(`/trains/${id}/position`).then(res => res.data);

export const getTrainETA = (id: string) => 
  api.get<ETAPrediction[]>(`/trains/${id}/eta`).then(res => res.data);

export const getTrainRoute = (id: string) => 
  api.get<RouteStop[]>(`/trains/${id}/route`).then(res => res.data);

export const getTrainHistory = (id: string) => 
  api.get(`/trains/${id}/history`).then(res => res.data);

export const getAlerts = () => 
  api.get<Alert[]>('/alerts').then(res => res.data);

export const getCongestion = () => 
  api.get<CongestionSection[]>('/network/congestion').then(res => res.data);

export const getAnalytics = () => 
  api.get<AnalyticsData>('/analytics').then(res => res.data);

export const getAnalyticsDelays = () => 
  api.get('/analytics/delays').then(res => res.data);

export const getAnalyticsPredictions = () => 
  api.get('/analytics/predictions').then(res => res.data);

export const getAnalyticsModelPerformance = () => 
  api.get('/analytics/model-performance').then(res => res.data);

export const startSimulation = () => 
  api.post('/simulation/start').then(res => res.data);

export const pauseSimulation = () => 
  api.post('/simulation/pause').then(res => res.data);

export const getSimulationStatus = () => 
  api.get<SimulationStatus>('/simulation/status').then(res => res.data);

export const injectEvent = (event: OperationalEvent) => 
  api.post('/simulation/events', event).then(res => res.data);

export const recalculateETA = () => 
  api.post('/eta/recalculate').then(res => res.data);

export const resolveIssue = (trainId: string) =>
  api.post(`/simulation/resolve/${trainId}`).then(res => res.data);
