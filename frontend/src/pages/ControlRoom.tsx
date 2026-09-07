import { useState, useEffect } from 'react';
import { AlertTriangle, Activity, Database, CheckCircle2 } from 'lucide-react';
import * as api from '../services/api';
import { TrainPosition, Alert } from '../types';
import { useWebSocket } from '../hooks/useWebSocket';
import { wsService } from '../services/websocket';

const ControlRoom = () => {
  const [positions, setPositions] = useState<{ [id: string]: TrainPosition }>({});
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const { connected } = useWebSocket();

  const handleResolve = async (e: React.MouseEvent, trainId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (resolvingId) return;

    setResolvingId(trainId);
    setFeedback(null);

    try {
      const res = await api.resolveIssue(trainId);
      if (res && res.success) {
        if (res.position) {
          setPositions(prev => ({ ...prev, [trainId]: res.position }));
        }
        setFeedback({
          type: 'success',
          message: res.message || `Issue resolved for Train ${trainId}`
        });
      } else {
        setFeedback({
          type: 'error',
          message: res?.error || `Failed to resolve issue for Train ${trainId}`
        });
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || 'Network error';
      setFeedback({
        type: 'error',
        message: `Error resolving Train ${trainId}: ${detail}`
      });
    } finally {
      setResolvingId(null);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Poll data for control room
    const fetchData = async () => {
      try {
        const [trainsData, alertsData] = await Promise.all([
          api.getTrains(),
          api.getAlerts()
        ]);
        
        // Fetch positions and filter strictly to active simulation fleet
        const posMap: { [id: string]: TrainPosition } = {};
        await Promise.all(
          trainsData.map(async (t) => {
            try {
              const pos = await api.getTrainPosition(t.train_id);
              if (pos && pos.is_simulated === true) {
                posMap[t.train_id] = pos;
              }
            } catch (e) {}
          })
        );

        if (mounted) {
          setPositions(prev => ({ ...prev, ...posMap }));
          setAlerts(alertsData.filter(a => a.severity === 'critical'));
        }
      } catch (e) {}
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);

    // Subscribe to live WebSocket position updates for active trains
    const unsub = wsService.onTrainUpdate((data) => {
      const pos = data.position as TrainPosition;
      if (pos && pos.is_simulated === true) {
        setPositions(prev => ({ ...prev, [pos.train_id]: pos }));
      }
    });

    return () => {
      mounted = false;
      clearInterval(interval);
      unsub();
    };
  }, []);

  // Filter positions to active simulation fleet
  const activePositions = Object.values(positions).filter(p => p.is_simulated === true);

  const normalCount = activePositions.filter(p => p.status === 'On Time' || p.status === 'ON_TIME').length;
  const delayedCount = activePositions.filter(p => p.status === 'Delayed' || p.status === 'Slight Delay' || p.status === 'DELAYED').length;
  const criticalCount = activePositions.filter(p => p.status === 'Critical Delay' || p.status === 'CRITICAL').length;

  const sortedTrains = [...activePositions].sort((a, b) => {
    const isCritA = a.status === 'CRITICAL' || a.status === 'Critical Delay';
    const isCritB = b.status === 'CRITICAL' || b.status === 'Critical Delay';
    if (isCritA && !isCritB) return -1;
    if (isCritB && !isCritA) return 1;
    return (b.delay_minutes || 0) - (a.delay_minutes || 0);
  });

  return (
    <div className="flex flex-col gap-6 h-full pb-8">
      {/* Action feedback toast */}
      {feedback && (
        <div className={`rounded-lg p-3 flex items-center justify-between text-sm font-medium border ${
          feedback.type === 'success' 
            ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' 
            : 'bg-red-500/20 border-red-500/30 text-red-300'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Header Banner for Critical Alerts */}
      {alerts.length > 0 && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
          <div className="text-red-100 font-medium">
            <span className="font-bold">{alerts.length} Critical Network Alerts: </span>
            {alerts[0].message} (Affecting {alerts[0].train_name})
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1">
        {/* Main Panel - Train Operations */}
        <div className="lg:col-span-3 bg-slate-800 rounded-lg border border-slate-700 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center">
            <h2 className="font-bold text-lg text-white">Network Operations Monitor</h2>
            <div className="flex gap-4">
              <span className="text-xs font-semibold px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded">
                Normal: {normalCount}
              </span>
              <span className="text-xs font-semibold px-2 py-1 bg-amber-500/10 text-amber-400 rounded">
                Delayed: {delayedCount}
              </span>
              <span className="text-xs font-semibold px-2 py-1 bg-red-500/10 text-red-400 rounded">
                Critical: {criticalCount}
              </span>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-xs text-slate-400 uppercase bg-slate-800/80 sticky top-0">
                <tr>
                  <th className="px-4 py-3 font-medium">Train ID</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Speed</th>
                  <th className="px-4 py-3 font-medium">Delay</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Action Required</th>
                </tr>
              </thead>
              <tbody>
                {sortedTrains.map((pos) => (
                  <tr key={pos.train_id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="px-4 py-3 font-medium text-white">{pos.train_id}</td>
                    <td className="px-4 py-3 text-slate-300">
                      <div>Next: {pos.next_station}</div>
                      <div className="text-xs text-slate-500">Progress: {Math.round(pos.journey_progress)}%</div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{pos.speed_kmph} km/h</td>
                    <td className={`px-4 py-3 font-bold ${pos.delay_minutes > 15 ? 'text-red-400' : pos.delay_minutes > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {pos.delay_minutes} min
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-[10px] font-bold rounded ${
                        pos.status === 'CRITICAL' || pos.status === 'Critical Delay' ? 'bg-red-500 text-white' : 
                        pos.status === 'DELAYED' || pos.status === 'Delayed' || pos.status === 'Slight Delay' ? 'bg-amber-500/20 text-amber-400' : 
                        'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {pos.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {pos.status === 'CRITICAL' || pos.status === 'Critical Delay' ? (
                        <button 
                          onClick={(e) => handleResolve(e, pos.train_id)}
                          disabled={resolvingId === pos.train_id}
                          className="text-xs bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-3 py-1 rounded transition-colors"
                        >
                          {resolvingId === pos.train_id ? 'Resolving...' : 'Resolve Issue'}
                        </button>
                      ) : (
                        <span className="text-slate-500 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-6">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <h3 className="font-bold text-white mb-4">System Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Activity className="w-4 h-4 text-emerald-500" /> API Gateway
                </div>
                <span className="text-xs font-mono text-emerald-400">99.9% Uptime</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Database className="w-4 h-4 text-emerald-500" /> ETA ML Engine
                </div>
                <span className="text-xs font-mono text-emerald-400">Online</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> WebSocket
                </div>
                <span className={`text-xs font-mono ${connected ? 'text-emerald-400' : 'text-red-400'}`}>
                  {connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlRoom;
