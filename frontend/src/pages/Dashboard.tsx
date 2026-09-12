import { useState, useEffect } from 'react';
import { useTrains } from '../hooks/useTrains';
import { getKPIs } from '../services/api';
import { KPIData } from '../types';
import KPICard from '../components/dashboard/KPICard';
import TrainMap from '../components/dashboard/TrainMap';
import SimulationControls from '../components/dashboard/SimulationControls';
import AlertsList from '../components/dashboard/AlertsList';
import {
  Train,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Target,
  Activity,
} from 'lucide-react';

const Dashboard = () => {
  const { trains, positions } = useTrains();
  const [kpiData, setKpiData] = useState<KPIData | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchKPIs = () => {
      getKPIs()
        .then((data) => {
          if (mounted) {
            setKpiData(data);
          }
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

  const posList = Object.values(positions);

  const activeCount = kpiData
    ? kpiData.active_trains
    : posList.length;

  const onTimeCount = kpiData
    ? kpiData.on_time
    : posList.filter(
        (p) =>
          p.status === 'On Time' ||
          p.status === 'ON_TIME'
      ).length;

  const delayedCount = kpiData
    ? kpiData.delayed
    : posList.filter(
        (p) =>
          p.status === 'Delayed' ||
          p.status === 'Slight Delay' ||
          p.status === 'DELAYED'
      ).length;

  const criticalCount = kpiData
    ? kpiData.critical
    : posList.filter(
        (p) =>
          p.status === 'Critical Delay' ||
          p.status === 'CRITICAL'
      ).length;

  const avgDelayVal =
    kpiData != null && kpiData.avg_delay_minutes != null
      ? Math.round(kpiData.avg_delay_minutes)
      : posList.length > 0
        ? Math.round(
            posList.reduce(
              (acc, p) => acc + (p.delay_minutes || 0),
              0
            ) / posList.length
          )
        : 0;

  // Only display active simulated trains on the Dashboard map.
  const activePositions = Object.fromEntries(
    Object.entries(positions).filter(
      ([_, pos]) => pos.is_simulated === true
    )
  );

  return (
    <div className="flex flex-1 flex-col gap-6 pb-10">

      {/* ========================================================= */}
      {/* HEADER */}
      {/* ========================================================= */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

        <div>
          <div className="flex items-center gap-3">

            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Network Overview
            </h1>

            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Live
            </span>

          </div>

          <p className="mt-2 text-sm text-slate-500">
            Real-time operational view of active coaching trains
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm">
          <Activity className="h-4 w-4 text-emerald-600" />
          Monitoring network
        </div>

      </div>


      {/* ========================================================= */}
      {/* KPI CARDS */}
      {/* ========================================================= */}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">

        <KPICard
          title="Active Trains"
          value={activeCount}
          icon={Train}
          colorClass="bg-red-500 text-red-500"
        />

        <KPICard
          title="On-Time"
          value={onTimeCount}
          icon={CheckCircle}
          colorClass="bg-emerald-500 text-emerald-500"
        />

        <KPICard
          title="Delayed"
          value={delayedCount}
          icon={Clock}
          colorClass="bg-amber-500 text-amber-500"
        />

        <KPICard
          title="Critical"
          value={criticalCount}
          icon={AlertTriangle}
          colorClass="bg-red-500 text-red-500"
        />

        <KPICard
          title="Avg Delay"
          value={`${avgDelayVal}m`}
          icon={TrendingUp}
          colorClass="bg-blue-500 text-blue-500"
        />

        <KPICard
          title="Model MAE"
          value="3.9m"
          icon={Target}
          colorClass="bg-slate-500 text-slate-500"
        />

      </div>


      {/* ========================================================= */}
      {/* MAIN OPERATIONS */}
      {/* ========================================================= */}

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-4">

        {/* ======================================================= */}
        {/* LIVE NETWORK MAP */}
        {/* ======================================================= */}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-3">

          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
                <Train className="h-4 w-4 text-red-600" />
              </div>

              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Live Network
                </h2>

                <p className="text-xs text-slate-500">
                  Active train positions
                </p>
              </div>

            </div>

            <div className="hidden items-center gap-2 text-xs font-medium text-slate-400 sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {activeCount} active
            </div>

          </div>

          <div className="h-[500px] xl:h-[540px]">
            <TrainMap
              positions={activePositions}
              trains={trains}
            />
          </div>

        </div>


        {/* ======================================================= */}
        {/* OPERATIONS SIDEBAR */}
        {/* ======================================================= */}

        <div className="flex flex-col gap-5">

          <SimulationControls
            activeTrains={trains}
            positions={activePositions}
          />

          <div className="h-[300px]">
            <AlertsList />
          </div>

        </div>

      </div>


      {/* ========================================================= */}
      {/* DEMO MODE NOTE */}
      {/* ========================================================= */}

      <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-5 py-4">

        <div className="flex items-start gap-3">

          <Activity className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />

          <div>
            <p className="text-sm font-semibold text-slate-800">
              Simulation Environment
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-600">
              Train positions and operational events are simulated in the
              current prototype. The system is designed to process authorized
              real-time railway telemetry when available.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};

export default Dashboard;