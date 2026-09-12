import { ETAPrediction } from '../../types';

interface ETATableProps {
  predictions: ETAPrediction[];
}

const ETATable = ({ predictions }: ETATableProps) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm text-left">
        <thead className="border-b border-slate-100 bg-slate-50">
          <tr>
            <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Station
            </th>

            <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Scheduled
            </th>

            <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Predicted
            </th>

            <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Delay
            </th>

            <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Confidence
            </th>
          </tr>
        </thead>

        <tbody>
          {predictions.map((p) => {
            const delayColor =
              p.predicted_delay_minutes < 5
                ? 'text-emerald-600'
                : p.predicted_delay_minutes < 15
                  ? 'text-amber-600'
                  : p.predicted_delay_minutes < 30
                    ? 'text-orange-600'
                    : 'text-red-600';

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
              p.confidence_level === 'High'
                ? 'bg-emerald-500'
                : p.confidence_level === 'Medium'
                  ? 'bg-amber-500'
                  : 'bg-red-500';

            return (
              <tr
                key={p.station_code}
                className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50"
              >
                {/* STATION */}
                <td className="px-5 py-4">
                  <div className="font-semibold text-slate-900">
                    {p.station_name}
                  </div>

                  <div className="mt-1 font-mono text-xs text-slate-400">
                    {p.station_code}
                  </div>
                </td>

                {/* SCHEDULED */}
                <td className="px-5 py-4 text-slate-500">
                  {formatTime(p.scheduled_arrival)}
                </td>

                {/* PREDICTED */}
                <td className="px-5 py-4">
                  <span className="font-semibold text-slate-900">
                    {formatTime(p.predicted_arrival)}
                  </span>
                </td>

                {/* DELAY */}
                <td className="px-5 py-4">
                  <span className={`font-bold ${delayColor}`}>
                    {p.predicted_delay_minutes > 0
                      ? `+${p.predicted_delay_minutes}m`
                      : 'On Time'}
                  </span>
                </td>

                {/* CONFIDENCE */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${confidenceColor}`}
                        style={{
                          width: `${Math.min(
                            Math.max(p.confidence, 0),
                            100
                          )}%`,
                        }}
                      />
                    </div>

                    <span className="text-xs font-medium text-slate-500">
                      {p.confidence}%
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ETATable;