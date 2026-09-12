import { RouteStop } from '../../types';
import { Check, Train } from 'lucide-react';

interface RouteTimelineProps {
  route: RouteStop[];
  currentStationCode?: string;
}

const RouteTimeline = ({ route, currentStationCode }: RouteTimelineProps) => {
  // Find current index
  let currentIndex = route.findIndex(s => s.status === 'current');

  if (currentIndex === -1 && currentStationCode) {
    currentIndex = route.findIndex(
      s => s.station_code === currentStationCode
    );
  }

  if (currentIndex === -1) {
    // If not found, assume it's somewhere based on status
    currentIndex = route.findIndex(s => s.status === 'upcoming') - 1;

    if (currentIndex < 0) currentIndex = 0;
  }

  const formatTime = (t?: string | null) => {
    if (!t) return '--:--';

    if (t.includes(':') && t.length <= 5) return t;

    try {
      const d = new Date(t);

      if (isNaN(d.getTime())) return t;

      return d.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return t;
    }
  };

  return (
    <div className="relative py-4 pl-8">
      {/* Timeline base */}
      <div className="absolute left-[15px] top-6 bottom-6 w-px bg-slate-200" />

      {/* Completed portion */}
      <div
        className="absolute left-[15px] top-6 w-px bg-emerald-500 transition-all duration-1000"
        style={{
          height:
            currentIndex >= 0
              ? `${(currentIndex / Math.max(1, route.length - 1)) * 100}%`
              : '0%',
          bottom: 'auto',
        }}
      />

      <div className="space-y-7">
        {route.map((stop, idx) => {
          const isPast =
            stop.status === 'completed' || idx < currentIndex;

          const isCurrent =
            stop.status === 'current' || idx === currentIndex;

          return (
            <div
              key={`${stop.station_code}-${idx}`}
              className={`relative transition-opacity ${
                isPast ? 'opacity-60' : 'opacity-100'
              }`}
            >
              {/* Timeline node */}
              <div
                className={`absolute -left-[30px] top-0 w-7 h-7 rounded-full flex items-center justify-center border-2 z-10 bg-white ${
                  isCurrent
                    ? 'border-red-500 shadow-sm'
                    : isPast
                    ? 'border-emerald-500'
                    : 'border-slate-300'
                }`}
              >
                {isCurrent ? (
                  <Train className="w-3.5 h-3.5 text-red-600" />
                ) : isPast ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-slate-300" />
                )}
              </div>

              {/* Station content */}
              <div
                className={`rounded-lg border p-4 transition-colors ${
                  isCurrent
                    ? 'border-red-200 bg-red-50/60'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div
                      className={`font-semibold ${
                        isCurrent
                          ? 'text-red-700 text-base'
                          : 'text-slate-800'
                      }`}
                    >
                      {stop.station_name}{' '}
                      <span className="text-xs text-slate-400 font-mono font-normal">
                        ({stop.station_code})
                      </span>
                    </div>

                    {isCurrent && (
                      <span className="inline-flex mt-1 text-[11px] font-semibold uppercase tracking-wide text-red-600">
                        Current Station
                      </span>
                    )}
                  </div>

                  {stop.distance_from_source !== null &&
                    stop.distance_from_source !== undefined && (
                      <span className="text-xs font-medium text-slate-400 whitespace-nowrap">
                        {stop.distance_from_source} km
                      </span>
                    )}
                </div>

                {/* Time details */}
                <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3 text-sm">
                  <span className="text-slate-500">
                    Arr:{' '}
                    <strong className="font-semibold text-slate-700">
                      {formatTime(stop.arrival)}
                    </strong>
                  </span>

                  {idx !== route.length - 1 && (
                    <span className="text-slate-500">
                      Dep:{' '}
                      <strong className="font-semibold text-slate-700">
                        {formatTime(stop.departure)}
                      </strong>
                    </span>
                  )}

                  {stop.halt_minutes ? (
                    <span className="text-slate-500">
                      Halt:{' '}
                      <strong className="font-semibold text-slate-700">
                        {stop.halt_minutes} min
                      </strong>
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RouteTimeline;