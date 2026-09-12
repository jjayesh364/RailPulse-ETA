import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
} from 'lucide-react';
import { Alert } from '../../types';
import * as api from '../../services/api';
import { wsService } from '../../services/websocket';
import { formatDistanceToNow } from 'date-fns';

const AlertsList = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    let mounted = true;

    api
      .getAlerts()
      .then((data) => {
        if (mounted) setAlerts(data.slice(0, 5));
      })
      .catch(console.error);

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const unsub = wsService.onAlert((data) => {
      setAlerts((prev) => [data.alert, ...prev].slice(0, 5));
    });

    return () => unsub();
  }, []);

  const getIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return (
          <AlertCircle className="h-4 w-4 text-red-600" />
        );
      case 'warning':
        return (
          <AlertTriangle className="h-4 w-4 text-amber-600" />
        );
      case 'info':
        return (
          <Info className="h-4 w-4 text-blue-600" />
        );
      case 'success':
        return (
          <CheckCircle className="h-4 w-4 text-emerald-600" />
        );
      default:
        return (
          <Info className="h-4 w-4 text-slate-400" />
        );
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Recent Alerts
          </h3>
          <p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">
            Latest operational events
          </p>
        </div>

        <div className="flex h-7 min-w-7 items-center justify-center rounded-md bg-slate-50 px-2 text-[10px] font-bold text-slate-500">
          {alerts.length}
        </div>
      </div>

      {/* Alert list */}
      <div className="flex-1 overflow-y-auto p-3">
        {alerts.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-slate-50">
              <Info className="h-4 w-4 text-slate-300" />
            </div>

            <p className="text-xs font-medium text-slate-500">
              No recent alerts
            </p>

            <p className="mt-1 text-[10px] text-slate-400">
              Operational events will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex gap-3 rounded-md border border-slate-200 bg-white p-3 transition-colors hover:bg-slate-50"
              >
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-50">
                  {getIcon(alert.severity)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <span className="truncate text-xs font-semibold text-slate-800">
                      {alert.train_name}
                    </span>

                    <span className="whitespace-nowrap text-[10px] text-slate-400">
                      {alert.created_at
                        ? (() => {
                            try {
                              return formatDistanceToNow(
                                new Date(alert.created_at),
                                { addSuffix: true }
                              );
                            } catch {
                              return 'just now';
                            }
                          })()
                        : 'just now'}
                    </span>
                  </div>

                  <p className="line-clamp-2 text-xs leading-4 text-slate-500">
                    {alert.message}
                  </p>
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