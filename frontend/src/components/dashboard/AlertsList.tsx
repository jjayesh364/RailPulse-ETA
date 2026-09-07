import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { Alert } from '../../types';
import * as api from '../../services/api';
import { wsService } from '../../services/websocket';
import { formatDistanceToNow } from 'date-fns';

const AlertsList = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    let mounted = true;
    api.getAlerts().then(data => {
      if (mounted) setAlerts(data.slice(0, 5));
    }).catch(console.error);
    
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const unsub = wsService.onAlert((data) => {
      setAlerts(prev => [data.alert, ...prev].slice(0, 5));
    });
    return () => unsub();
  }, []);

  const getIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'info': return <Info className="w-5 h-5 text-blue-500" />;
      case 'success': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      default: return <Info className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 h-full flex flex-col">
      <div className="p-3 border-b border-slate-700 bg-slate-800/80">
        <h3 className="font-semibold text-slate-200">Recent Alerts</h3>
      </div>
      <div className="p-2 flex-1 overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm">No recent alerts</div>
        ) : (
          <div className="space-y-2">
            {alerts.map(alert => (
              <div key={alert.id} className="flex gap-3 p-3 rounded bg-slate-700/30 border border-slate-600/50 hover:bg-slate-700/50 transition-colors">
                <div className="shrink-0 mt-0.5">
                  {getIcon(alert.severity)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-slate-200 truncate">{alert.train_name}</span>
                    <span className="text-xs text-slate-400 whitespace-nowrap ml-2">
                      {alert.created_at ? (() => {
                        try {
                          return formatDistanceToNow(new Date(alert.created_at), { addSuffix: true });
                        } catch {
                          return 'just now';
                        }
                      })() : 'just now'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 line-clamp-2">{alert.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertsList;
