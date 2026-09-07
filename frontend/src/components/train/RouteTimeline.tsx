import { RouteStop } from '../../types';
import { MapPin, Check, Train } from 'lucide-react';

interface RouteTimelineProps {
  route: RouteStop[];
  currentStationCode?: string;
}

const RouteTimeline = ({ route, currentStationCode }: RouteTimelineProps) => {
  // Find current index
  let currentIndex = route.findIndex(s => s.status === 'current');
  if (currentIndex === -1 && currentStationCode) {
    currentIndex = route.findIndex(s => s.station_code === currentStationCode);
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
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return t;
    }
  };

  return (
    <div className="relative pl-6 py-4">
      {/* Timeline line */}
      <div className="absolute left-[15px] top-6 bottom-6 w-0.5 bg-slate-700"></div>
      
      {/* Active line portion */}
      <div 
        className="absolute left-[15px] top-6 w-0.5 bg-indigo-500 transition-all duration-1000"
        style={{ 
          height: currentIndex >= 0 ? `${(currentIndex / Math.max(1, route.length - 1)) * 100}%` : '0%',
          bottom: 'auto' 
        }}
      ></div>

      <div className="space-y-6">
        {route.map((stop, idx) => {
          const isPast = stop.status === 'completed' || idx < currentIndex;
          const isCurrent = stop.status === 'current' || idx === currentIndex;
          
          return (
            <div key={`${stop.station_code}-${idx}`} className={`relative ${isPast ? 'opacity-60' : ''}`}>
              {/* Node Icon */}
              <div className={`absolute -left-[30px] w-6 h-6 rounded-full flex items-center justify-center border-2 z-10 ${
                isCurrent ? 'bg-indigo-600 border-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.5)]' :
                isPast ? 'bg-slate-800 border-indigo-500' : 'bg-slate-800 border-slate-600'
              }`}>
                {isCurrent ? <Train className="w-3 h-3 text-white" /> : 
                  isPast ? <Check className="w-3 h-3 text-indigo-400" /> : 
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-500"></div>}
              </div>
              
              {/* Content */}
              <div className="ml-4">
                <div className={`font-semibold ${isCurrent ? 'text-indigo-400 text-lg' : 'text-slate-200'}`}>
                  {stop.station_name} <span className="text-xs text-slate-500 font-mono">({stop.station_code})</span>
                </div>
                <div className="text-sm text-slate-400 flex flex-wrap gap-4 mt-1">
                  <span>Arr: <strong className="text-slate-300">{formatTime(stop.arrival)}</strong></span>
                  {idx !== route.length - 1 && (
                    <span>Dep: <strong className="text-slate-300">{formatTime(stop.departure)}</strong></span>
                  )}
                  {stop.halt_minutes ? <span>Halt: {stop.halt_minutes} min</span> : null}
                  <span>{stop.distance_from_source !== null && stop.distance_from_source !== undefined ? `${stop.distance_from_source} km` : '—'}</span>
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
