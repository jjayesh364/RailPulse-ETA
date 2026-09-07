import { Clock, AlertTriangle } from 'lucide-react';
import { ETAPrediction } from '../../types';

interface ETAPanelProps {
  prediction: ETAPrediction | null;
  lastUpdated: string;
}

const ETAPanel = ({ prediction, lastUpdated }: ETAPanelProps) => {
  if (!prediction) return <div className="p-4 text-center text-slate-500">Loading ETA...</div>;

  const delayColor = prediction.predicted_delay_minutes < 5 ? 'text-emerald-500' : 
                     prediction.predicted_delay_minutes < 15 ? 'text-amber-500' : 'text-red-500';

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '--:--';
    if (timeStr.includes(':') && timeStr.length <= 5) return timeStr;
    try {
      const d = new Date(timeStr);
      if (isNaN(d.getTime())) return timeStr;
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return timeStr;
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-bl-full -z-10"></div>
      
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-slate-400 font-medium mb-1">Next Station</h3>
          <h2 className="text-2xl font-bold text-white">{prediction.station_name}</h2>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500 mb-1">Confidence</div>
          <div className={`text-sm font-bold ${
            prediction.confidence_level === 'High' ? 'text-emerald-500' : 
            prediction.confidence_level === 'Medium' ? 'text-amber-500' : 'text-red-500'
          }`}>
            {prediction.confidence}% {prediction.confidence_level}
          </div>
        </div>
      </div>

      <div className="flex items-end gap-6 mb-6">
        <div>
          <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Predicted Arrival
          </div>
          <div className="text-4xl font-bold text-white tracking-tight">
            {formatTime(prediction.predicted_arrival)}
          </div>
        </div>
        
        <div>
          <div className="text-xs text-slate-500 mb-1">Scheduled</div>
          <div className="text-xl text-slate-400 line-through">
            {formatTime(prediction.scheduled_arrival)}
          </div>
        </div>
      </div>

      {prediction.predicted_delay_minutes > 0 && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 p-3 rounded-md mb-4">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-semibold text-red-400">
              Running {prediction.predicted_delay_minutes} minutes late
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Top factor: {prediction.factors?.[0]?.factor_name || 'Network conditions'}
            </div>
          </div>
        </div>
      )}

      <div className="text-xs text-slate-500 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        Live ETA updated {lastUpdated}
      </div>
    </div>
  );
};

export default ETAPanel;
