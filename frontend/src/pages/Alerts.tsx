import { useEffect, useState } from 'react';
import * as api from '../services/api';
import { Alert } from '../types';
import { AlertCircle, AlertTriangle, Info, CheckCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const Alerts = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api.getAlerts().then(res => setAlerts(res)).catch(console.error);
  }, []);

  const getIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertCircle className="w-6 h-6 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-6 h-6 text-amber-500" />;
      case 'info': return <Info className="w-6 h-6 text-blue-500" />;
      case 'success': return <CheckCircle className="w-6 h-6 text-emerald-500" />;
      default: return <Info className="w-6 h-6 text-slate-500" />;
    }
  };

  const filteredAlerts = filter === 'all' ? alerts : alerts.filter(a => a.severity === filter);

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">System Alerts</h1>
          <p className="text-slate-400">Network incidents and automated notifications</p>
        </div>
        
        <div className="flex gap-2 bg-slate-800 p-1 rounded-lg border border-slate-700">
          {['all', 'critical', 'warning', 'info'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                filter === f ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-12 text-slate-500 bg-slate-800/50 rounded-lg border border-slate-700/50">
            No alerts found matching the criteria.
          </div>
        ) : (
          filteredAlerts.map(alert => (
            <div key={alert.id} className="bg-slate-800 border border-slate-700 rounded-lg p-5 flex gap-4 hover:border-slate-600 transition-colors">
              <div className="shrink-0 mt-1">
                {getIcon(alert.severity)}
              </div>
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                  <h3 className="text-lg font-bold text-slate-200">
                    {alert.train_name}
                    <span className="ml-2 text-sm font-normal text-slate-400">Near {alert.location}</span>
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                  </div>
                </div>
                <p className="text-slate-300">{alert.message}</p>
                {alert.eta_impact_minutes > 0 && (
                  <div className="mt-3 text-sm">
                    <span className="font-semibold text-red-400">ETA Impact: +{alert.eta_impact_minutes} min</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Alerts;
