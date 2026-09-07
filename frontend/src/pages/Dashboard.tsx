import { useState, useEffect } from 'react';
import { useTrains } from '../hooks/useTrains';
import { getKPIs } from '../services/api';
import { KPIData } from '../types';
import KPICard from '../components/dashboard/KPICard';
import TrainMap from '../components/dashboard/TrainMap';
import SimulationControls from '../components/dashboard/SimulationControls';
import AlertsList from '../components/dashboard/AlertsList';
import { Train, Clock, AlertTriangle, CheckCircle, TrendingUp, Target } from 'lucide-react';

const Dashboard = () => {
  const { trains, positions, loading } = useTrains();
  const [kpiData, setKpiData] = useState<KPIData | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchKPIs = () => {
      getKPIs()
        .then(data => {
          if (mounted) setKpiData(data);
        })
        .catch(() => {});
    };

    fetchKPIs();
    const interval = setInterval(fetchKPIs, 3000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Use authoritative backend KPIs from /api/kpis if available, fallback to active telemetry positions
  const posList = Object.values(positions);
  const activeCount = kpiData ? kpiData.active_trains : posList.length;
  const onTimeCount = kpiData ? kpiData.on_time : posList.filter(p => p.status === 'On Time' || p.status === 'ON_TIME').length;
  const delayedCount = kpiData ? kpiData.delayed : posList.filter(p => p.status === 'Delayed' || p.status === 'Slight Delay' || p.status === 'DELAYED').length;
  const criticalCount = kpiData ? kpiData.critical : posList.filter(p => p.status === 'Critical Delay' || p.status === 'CRITICAL').length;
  
  const avgDelayVal = kpiData != null && kpiData.avg_delay_minutes != null
    ? Math.round(kpiData.avg_delay_minutes)
    : (posList.length > 0
        ? Math.round(posList.reduce((acc, p) => acc + (p.delay_minutes || 0), 0) / posList.length)
        : 0);

  // Only display active simulated trains on the Dashboard map (matching SimulationEngine / TrainPosition)
  const activePositions = Object.fromEntries(
    Object.entries(positions).filter(([_, pos]) => pos.is_simulated === true)
  );

  return (
    <div className="flex-1 flex flex-col gap-4 h-full">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard title="Active Trains" value={activeCount} icon={Train} colorClass="bg-blue-500 text-blue-500" />
        <KPICard title="On-Time" value={onTimeCount} icon={CheckCircle} colorClass="bg-emerald-500 text-emerald-500" />
        <KPICard title="Delayed" value={delayedCount} icon={Clock} colorClass="bg-amber-500 text-amber-500" />
        <KPICard title="Critical" value={criticalCount} icon={AlertTriangle} colorClass="bg-red-500 text-red-500" />
        <KPICard title="Avg Delay" value={`${avgDelayVal}m`} icon={TrendingUp} colorClass="bg-indigo-500 text-indigo-500" />
        <KPICard title="Model MAE" value="3.9m" icon={Target} colorClass="bg-purple-500 text-purple-500" />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
        {/* Map */}
        <div className="lg:col-span-3 rounded-lg overflow-hidden flex flex-col h-[520px] xl:h-[600px] border border-slate-700">
          <TrainMap positions={activePositions} trains={trains} />
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          <SimulationControls activeTrains={trains} positions={activePositions} />
          <div className="h-[280px]">
            <AlertsList />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
