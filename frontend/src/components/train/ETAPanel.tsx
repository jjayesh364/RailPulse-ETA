import { Clock, AlertTriangle } from 'lucide-react';
import { ETAPrediction } from '../../types';

interface ETAPanelProps {
  prediction: ETAPrediction | null;
  lastUpdated: string;
}

const ETAPanel = ({ prediction, lastUpdated }: ETAPanelProps) => {
  if (!prediction) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
        Loading ETA...
      </div>
    );
  }

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '--:--';

    if (timeStr.includes(':') && timeStr.length <= 5) {
      return timeStr;
    }

    try {
      const d = new Date(timeStr);

      if (isNaN(d.getTime())) {
        return timeStr;
      }

      return d.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return timeStr;
    }
  };

  const confidenceColor =
    prediction.confidence_level === 'High'
      ? 'text-emerald-600'
      : prediction.confidence_level === 'Medium'
        ? 'text-amber-600'
        : 'text-red-600';

  const confidenceBg =
    prediction.confidence_level === 'High'
      ? 'bg-emerald-50 border-emerald-100'
      : prediction.confidence_level === 'Medium'
        ? 'bg-amber-50 border-amber-100'
        : 'bg-red-50 border-red-100';

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

      {/* Subtle decorative background */}
      <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-bl-full bg-slate-50" />

      {/* HEADER */}
      <div className="relative flex items-start justify-between gap-6 border-b border-slate-100 pb-5">

        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
              <Clock className="h-4 w-4 text-red-600" />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Next Station
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-900">
                {prediction.station_name}
              </h2>
            </div>
          </div>
        </div>

        {/* CONFIDENCE */}
        <div
          className={`relative rounded-lg border px-3 py-2 text-right ${confidenceBg}`}
        >
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Confidence
          </div>

          <div className={`mt-1 text-sm font-bold ${confidenceColor}`}>
            {prediction.confidence}% {prediction.confidence_level}
          </div>
        </div>
      </div>

      {/* ARRIVAL TIMES */}
      <div className="relative flex flex-wrap items-end gap-8 py-6">

        <div>
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-400">
            <Clock className="h-3.5 w-3.5" />
            Predicted Arrival
          </div>

          <div className="text-4xl font-bold tracking-tight text-slate-900">
            {formatTime(prediction.predicted_arrival)}
          </div>
        </div>

        <div className="pb-1">
          <div className="mb-1 text-xs font-medium text-slate-400">
            Scheduled
          </div>

          <div className="text-lg font-medium text-slate-400 line-through">
            {formatTime(prediction.scheduled_arrival)}
          </div>
        </div>

      </div>

      {/* DELAY ALERT */}
      {prediction.predicted_delay_minutes > 0 && (
        <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-100 bg-red-50 p-4">

          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white">
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </div>

          <div>
            <div className="text-sm font-semibold text-red-700">
              Running {prediction.predicted_delay_minutes} minutes late
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Top factor:{' '}
              <span className="font-medium text-slate-700">
                {prediction.factors?.[0]?.factor_name || 'Network conditions'}
              </span>
            </div>
          </div>

        </div>
      )}

      {/* LIVE STATUS */}
      <div className="flex items-center gap-2 text-xs text-slate-400">

        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />

        <span>
          Live ETA updated{' '}
          <span className="font-medium text-slate-600">
            {lastUpdated}
          </span>
        </span>

      </div>

    </div>
  );
};

export default ETAPanel;