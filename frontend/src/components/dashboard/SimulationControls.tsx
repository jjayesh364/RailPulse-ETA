import { Play, Pause, AlertTriangle, CloudRain, Clock, Activity, RefreshCw, WifiOff, Wifi, Loader2, Gauge, Train as TrainIcon } from 'lucide-react';
import { useSimulation } from '../../hooks/useSimulation';
import { Train, TrainPosition } from '../../types';
import * as api from '../../services/api';
import React, { useState, useEffect, useMemo } from 'react';

const EVENT_CONFIGS: Record<string, { label: string; icon: any; color: string; description: string }> = {
  signal_congestion: {
    label: 'Signal Congestion',
    icon: AlertTriangle,
    color: 'text-orange-400',
    description: 'Heavy signal delay & block section congestion detected'
  },
  weather: {
    label: 'Weather Impact',
    icon: CloudRain,
    color: 'text-blue-400',
    description: 'Heavy torrential rain & poor visibility affecting operations'
  },
  speed_restriction: {
    label: 'Speed Restriction',
    icon: Gauge,
    color: 'text-amber-400',
    description: 'Temporary 30 km/h speed restriction imposed on section'
  },
  delay: {
    label: 'Unscheduled Halt',
    icon: Clock,
    color: 'text-red-400',
    description: 'Unscheduled operational halt on main running line'
  }
};

interface SimulationControlsProps {
  activeTrains?: Train[];
  positions?: { [id: string]: TrainPosition };
}

const SimulationControls: React.FC<SimulationControlsProps> = ({ activeTrains, positions }) => {
  const { status, toggleSimulation, loading, error, connected } = useSimulation();
  const [eventMsg, setEventMsg] = useState<string | null>(null);
  const [injectingType, setInjectingType] = useState<string | null>(null);
  const [selectedTrainId, setSelectedTrainId] = useState<string>('12951');
  const [fallbackTrains, setFallbackTrains] = useState<Train[]>([]);

  // If activeTrains prop is not provided, fetch trains on mount as fallback
  useEffect(() => {
    if (!activeTrains || activeTrains.length === 0) {
      api.getTrains().then(trains => {
        setFallbackTrains(trains);
      }).catch(() => {});
    }
  }, [activeTrains]);

  // Determine the active simulated fleet
  const activeFleet = useMemo(() => {
    const candidateList = (activeTrains && activeTrains.length > 0) ? activeTrains : fallbackTrains;
    
    // If positions map is available with is_simulated flag, strictly filter using it
    if (positions && Object.keys(positions).length > 0) {
      const activePositions = candidateList.filter(t => positions[t.train_id]?.is_simulated === true);
      if (activePositions.length > 0) return activePositions;
    }

    // Otherwise filter by data_source containing 'Demo' or without external source
    const demoOnly = candidateList.filter((t: any) => t.data_source?.includes('Demo') || !t.data_source);
    if (demoOnly.length > 0) return demoOnly;

    return candidateList.slice(0, 10);
  }, [activeTrains, fallbackTrains, positions]);

  // Keep selectedTrainId valid among the active fleet
  useEffect(() => {
    if (activeFleet.length > 0) {
      const exists = activeFleet.some(t => t.train_id === selectedTrainId);
      if (!exists) {
        setSelectedTrainId(activeFleet[0].train_id);
      }
    }
  }, [activeFleet, selectedTrainId]);

  const handleInjectEvent = async (e: React.MouseEvent, type: string) => {
    e.preventDefault();
    e.stopPropagation();
    setEventMsg(null);
    setInjectingType(type);

    try {
      // Find the currently selected train
      const target = activeFleet.find(t => t.train_id === selectedTrainId) || activeFleet[0];
      
      if (!target) {
        setEventMsg('No active train available for event injection');
        setInjectingType(null);
        return;
      }

      // Determine corridor location from current telemetry if available, else route endpoints
      const targetPos = positions ? positions[target.train_id] : undefined;
      let location = '';
      if (targetPos?.current_station && targetPos?.next_station && targetPos.current_station !== targetPos.next_station) {
        location = `${targetPos.current_station} - ${targetPos.next_station} Section`;
      } else if (targetPos?.current_station) {
        location = `Near ${targetPos.current_station}`;
      } else if (target.source && target.destination) {
        location = `${target.source} - ${target.destination} Section`;
      } else {
        location = 'En route';
      }

      const cfg = EVENT_CONFIGS[type];
      const result = await api.injectEvent({
        event_type: type,
        train_id: target.train_id,
        location,
        severity: 0.8,
        duration_minutes: 30,
        description: cfg?.description || `Operational disruption: ${type}`
      });

      setEventMsg(result.message || `${cfg?.label || type} applied to Train ${target.train_number} (${target.train_name})!`);
      setTimeout(() => setEventMsg(null), 5000);
    } catch (err: any) {
      setEventMsg('Failed to inject event — backend may be down');
      setTimeout(() => setEventMsg(null), 5000);
    } finally {
      setInjectingType(null);
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleSimulation();
  };

  const handleRecalculate = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.recalculateETA();
      setEventMsg('Network ETAs recalculated!');
      setTimeout(() => setEventMsg(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 flex flex-col shadow-sm">
      <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
        <h3 className="font-semibold text-slate-200 flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-400" />
          Simulation Engine
        </h3>
        <div className="flex items-center gap-2">
          {connected ? (
            <span title="Connected to backend"><Wifi className="w-3.5 h-3.5 text-emerald-400" /></span>
          ) : (
            <span title="Backend not reachable"><WifiOff className="w-3.5 h-3.5 text-red-400 animate-pulse" /></span>
          )}
          <div className="text-xs text-slate-400">
            Tick: {status?.tick_count || 0}
          </div>
        </div>
      </div>
      
      <div className="p-4 flex flex-col gap-3">
        {/* Connection error message */}
        {error && (
          <div className="text-xs text-red-400 bg-red-900/20 border border-red-800/30 rounded px-3 py-2">
            ⚠ {error}
          </div>
        )}

        {/* Start / Pause button */}
        <button 
          type="button"
          onClick={handleToggle}
          disabled={loading}
          className={`w-full py-2.5 rounded-md font-medium flex items-center justify-center gap-2 transition-colors ${
            loading
              ? 'bg-slate-700/30 text-slate-400 border border-slate-600/30 cursor-wait'
              : status?.running 
                ? 'bg-amber-600/20 text-amber-500 hover:bg-amber-600/30 border border-amber-600/30' 
                : 'bg-emerald-600/20 text-emerald-500 hover:bg-emerald-600/30 border border-emerald-600/30'
          }`}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : status?.running ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          {loading ? 'Processing...' : status?.running ? 'Pause Simulation' : 'Start Simulation'}
        </button>

        {/* Status indicator */}
        <div className={`text-center text-xs font-medium py-1 rounded ${
          status?.running 
            ? 'text-emerald-400 bg-emerald-900/20' 
            : 'text-slate-500 bg-slate-700/30'
        }`}>
          {status?.running ? '● RUNNING' : '○ STOPPED'}
        </div>

        {/* Target Train Selection */}
        <div className="space-y-1.5 mt-1">
          <label htmlFor="target-train-select" className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Target Train
          </label>
          <div className="relative">
            <select
              id="target-train-select"
              value={selectedTrainId}
              onChange={(e) => setSelectedTrainId(e.target.value)}
              className="w-full bg-slate-700/80 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors cursor-pointer appearance-none pr-8"
            >
              {activeFleet.map((train) => (
                <option key={train.train_id} value={train.train_id} className="bg-slate-800 text-slate-200">
                  {train.train_number} - {train.train_name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Inject Events Section */}
        <div className="space-y-1.5 mt-1">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Inject Events</h4>
          
          {Object.entries(EVENT_CONFIGS).map(([typeKey, cfg]) => {
            const Icon = cfg.icon;
            const isInjecting = injectingType === typeKey;
            return (
              <button 
                key={typeKey}
                type="button"
                onClick={(e) => handleInjectEvent(e, typeKey)}
                disabled={isInjecting}
                className="w-full flex items-center gap-3 p-2 rounded bg-slate-700/40 hover:bg-slate-700 border border-slate-600/50 text-sm text-left transition-colors text-slate-300 disabled:opacity-50"
              >
                {isInjecting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                ) : (
                  <Icon className={`w-4 h-4 ${cfg.color}`} />
                )}
                <span>{cfg.label}</span>
              </button>
            );
          })}
        </div>

        {/* Event feedback message */}
        {eventMsg && (
          <div className="text-xs text-blue-300 bg-blue-900/30 border border-blue-700/50 rounded px-3 py-2 animate-fade-in">
            {eventMsg}
          </div>
        )}

        <div className="pt-2">
          <button 
            type="button"
            onClick={handleRecalculate} 
            className="w-full flex items-center justify-center gap-2 p-2 rounded bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-600/30 text-indigo-400 text-sm transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Recalculate Network ETA
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimulationControls;
