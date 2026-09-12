import {
  Play,
  Pause,
  AlertTriangle,
  CloudRain,
  Clock,
  Activity,
  RefreshCw,
  WifiOff,
  Wifi,
  Loader2,
  Gauge,
} from 'lucide-react';
import { useSimulation } from '../../hooks/useSimulation';
import { Train, TrainPosition } from '../../types';
import * as api from '../../services/api';
import React, { useState, useEffect, useMemo } from 'react';

const EVENT_CONFIGS: Record<
  string,
  {
    label: string;
    icon: any;
    color: string;
    description: string;
  }
> = {
  signal_congestion: {
    label: 'Signal Congestion',
    icon: AlertTriangle,
    color: 'text-orange-600',
    description:
      'Heavy signal delay & block section congestion detected',
  },
  weather: {
    label: 'Weather Impact',
    icon: CloudRain,
    color: 'text-blue-600',
    description:
      'Heavy torrential rain & poor visibility affecting operations',
  },
  speed_restriction: {
    label: 'Speed Restriction',
    icon: Gauge,
    color: 'text-amber-600',
    description:
      'Temporary 30 km/h speed restriction imposed on section',
  },
  delay: {
    label: 'Unscheduled Halt',
    icon: Clock,
    color: 'text-red-600',
    description:
      'Unscheduled operational halt on main running line',
  },
};

interface SimulationControlsProps {
  activeTrains?: Train[];
  positions?: { [id: string]: TrainPosition };
}

const SimulationControls: React.FC<SimulationControlsProps> = ({
  activeTrains,
  positions,
}) => {
  const {
    status,
    toggleSimulation,
    loading,
    error,
    connected,
  } = useSimulation();

  const [eventMsg, setEventMsg] = useState<string | null>(null);
  const [injectingType, setInjectingType] = useState<string | null>(null);
  const [selectedTrainId, setSelectedTrainId] =
    useState<string>('12951');
  const [fallbackTrains, setFallbackTrains] = useState<Train[]>([]);

  useEffect(() => {
    if (!activeTrains || activeTrains.length === 0) {
      api
        .getTrains()
        .then((trains) => {
          setFallbackTrains(trains);
        })
        .catch(() => {});
    }
  }, [activeTrains]);

  const activeFleet = useMemo(() => {
    const candidateList =
      activeTrains && activeTrains.length > 0
        ? activeTrains
        : fallbackTrains;

    if (positions && Object.keys(positions).length > 0) {
      const activePositions = candidateList.filter(
        (t) => positions[t.train_id]?.is_simulated === true
      );

      if (activePositions.length > 0) {
        return activePositions;
      }
    }

    const demoOnly = candidateList.filter(
      (t: any) =>
        t.data_source?.includes('Demo') || !t.data_source
    );

    if (demoOnly.length > 0) {
      return demoOnly;
    }

    return candidateList.slice(0, 10);
  }, [activeTrains, fallbackTrains, positions]);

  useEffect(() => {
    if (activeFleet.length > 0) {
      const exists = activeFleet.some(
        (t) => t.train_id === selectedTrainId
      );

      if (!exists) {
        setSelectedTrainId(activeFleet[0].train_id);
      }
    }
  }, [activeFleet, selectedTrainId]);

  const handleInjectEvent = async (
    e: React.MouseEvent,
    type: string
  ) => {
    e.preventDefault();
    e.stopPropagation();

    setEventMsg(null);
    setInjectingType(type);

    try {
      const target =
        activeFleet.find(
          (t) => t.train_id === selectedTrainId
        ) || activeFleet[0];

      if (!target) {
        setEventMsg(
          'No active train available for event injection'
        );
        setInjectingType(null);
        return;
      }

      const targetPos = positions
        ? positions[target.train_id]
        : undefined;

      let location = '';

      if (
        targetPos?.current_station &&
        targetPos?.next_station &&
        targetPos.current_station !== targetPos.next_station
      ) {
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
        description:
          cfg?.description ||
          `Operational disruption: ${type}`,
      });

      setEventMsg(
        result.message ||
          `${cfg?.label || type} applied to Train ${target.train_number} (${target.train_name})!`
      );

      setTimeout(() => setEventMsg(null), 5000);
    } catch (err: any) {
      setEventMsg(
        'Failed to inject event — backend may be down'
      );

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
    <div className="overflow-visible rounded-lg border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-red-50">
            <Activity className="h-4 w-4 text-red-700" />
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Simulation Engine
            </h3>

            <p className="text-[10px] uppercase tracking-wide text-slate-400">
              Operational scenario control
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {connected ? (
            <span
              title="Connected to backend"
              className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600"
            >
              <Wifi className="h-3.5 w-3.5" />
              LIVE
            </span>
          ) : (
            <span
              title="Backend not reachable"
              className="flex items-center gap-1.5 text-[10px] font-semibold text-red-600"
            >
              <WifiOff className="h-3.5 w-3.5 animate-pulse" />
              OFFLINE
            </span>
          )}

          <span className="border-l border-slate-200 pl-2 text-[10px] font-medium text-slate-400">
            Tick {status?.tick_count || 0}
          </span>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {/* Error */}
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <span className="font-semibold">Warning:</span>{' '}
            {error}
          </div>
        )}

        {/* Simulation Control */}
        <div>
          <button
            type="button"
            onClick={handleToggle}
            disabled={loading}
            className={`flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-sm font-semibold transition-colors ${
              loading
                ? 'cursor-wait border-slate-200 bg-slate-100 text-slate-400'
                : status?.running
                  ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : status?.running ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}

            {loading
              ? 'Processing...'
              : status?.running
                ? 'Pause Simulation'
                : 'Start Simulation'}
          </button>

          <div
            className={`mt-2 rounded-md border px-3 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider ${
              status?.running
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-slate-50 text-slate-400'
            }`}
          >
            {status?.running ? '● Running' : '○ Stopped'}
          </div>
        </div>

        {/* Target Train */}
        <div>
          <label
            htmlFor="target-train-select"
            className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500"
          >
            Target Train
          </label>

          <select
            id="target-train-select"
            value={selectedTrainId}
            onChange={(e) =>
              setSelectedTrainId(e.target.value)
            }
            className="w-full cursor-pointer rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
          >
            {activeFleet.map((train) => (
              <option
                key={train.train_id}
                value={train.train_id}
              >
                {train.train_number} - {train.train_name}
              </option>
            ))}
          </select>
        </div>

        {/* Events */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Inject Event
            </h4>

            <span className="text-[10px] text-slate-400">
              Scenario testing
            </span>
          </div>

          <div className="space-y-2">
            {Object.entries(EVENT_CONFIGS).map(
              ([typeKey, cfg]) => {
                const Icon = cfg.icon;
                const isInjecting =
                  injectingType === typeKey;

                return (
                  <button
                    key={typeKey}
                    type="button"
                    onClick={(e) =>
                      handleInjectEvent(e, typeKey)
                    }
                    disabled={isInjecting}
                    className="flex w-full items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-50"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-50">
                      {isInjecting ? (
                        <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                      ) : (
                        <Icon
                          className={`h-4 w-4 ${cfg.color}`}
                        />
                      )}
                    </span>

                    <span>{cfg.label}</span>
                  </button>
                );
              }
            )}
          </div>
        </div>

        {/* Feedback */}
        {eventMsg && (
          <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
            {eventMsg}
          </div>
        )}

        {/* Recalculate */}
        <button
          type="button"
          onClick={handleRecalculate}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Recalculate Network ETA
        </button>
      </div>
    </div>
  );
};

export default SimulationControls;