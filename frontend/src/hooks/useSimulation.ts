import { useState, useEffect, useCallback } from 'react';
import * as api from '../services/api';
import { SimulationStatus } from '../types';

export function useSimulation() {
  const [status, setStatus] = useState<SimulationStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await api.getSimulationStatus();
      setStatus(data);
      setConnected(true);
      setError(null);
    } catch (e: any) {
      setConnected(false);
      // Don't overwrite a more specific error from toggle
      if (!error) {
        setError('Backend not reachable. Start the backend server on port 8000.');
      }
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const toggleSimulation = async () => {
    setLoading(true);
    setError(null);
    try {
      if (status?.running) {
        await api.pauseSimulation();
      } else {
        await api.startSimulation();
      }
      // Immediately fetch updated status
      const data = await api.getSimulationStatus();
      setStatus(data);
      setConnected(true);
    } catch (e: any) {
      const msg = e?.response?.data?.detail
        || e?.message
        || 'Failed to toggle simulation. Is the backend running?';
      setError(msg);
      setConnected(false);
    }
    setLoading(false);
  };

  return { status, loading, error, connected, toggleSimulation, fetchStatus };
}
