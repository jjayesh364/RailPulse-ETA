import { ETAPrediction } from '../../types';

interface ETATableProps {
  predictions: ETAPrediction[];
}

const ETATable = ({ predictions }: ETATableProps) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-slate-400 uppercase bg-slate-800/50">
          <tr>
            <th className="px-4 py-3 font-medium">Station</th>
            <th className="px-4 py-3 font-medium">Scheduled</th>
            <th className="px-4 py-3 font-medium">Predicted</th>
            <th className="px-4 py-3 font-medium">Delay</th>
            <th className="px-4 py-3 font-medium">Confidence</th>
          </tr>
        </thead>
        <tbody>
          {predictions.map((p, idx) => {
            const delayColor = p.predicted_delay_minutes < 5 ? 'text-emerald-400' : 
                               p.predicted_delay_minutes < 15 ? 'text-amber-400' : 
                               p.predicted_delay_minutes < 30 ? 'text-orange-400' : 'text-red-400';
            
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
              <tr key={p.station_code} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-200">{p.station_name}</div>
                  <div className="text-xs text-slate-500">{p.station_code}</div>
                </td>
                <td className="px-4 py-3 text-slate-400">
                  {formatTime(p.scheduled_arrival)}
                </td>
                <td className="px-4 py-3 font-medium text-white">
                  {formatTime(p.predicted_arrival)}
                </td>
                <td className={`px-4 py-3 font-bold ${delayColor}`}>
                  {p.predicted_delay_minutes > 0 ? `+${p.predicted_delay_minutes}m` : 'On Time'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${p.confidence_level === 'High' ? 'bg-emerald-500' : p.confidence_level === 'Medium' ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${p.confidence}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-slate-400">{p.confidence}%</span>
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
