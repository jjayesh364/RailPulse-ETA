import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Activity,
  Database,
  CheckCircle2,
  Train,
  MapPin,
  Gauge,
  Clock,
  ShieldAlert,
  Wifi,
  X,
} from 'lucide-react';

import * as api from '../services/api';
import { TrainPosition, Alert } from '../types';
import { useWebSocket } from '../hooks/useWebSocket';
import { wsService } from '../services/websocket';

const ControlRoom = () => {
  const [positions, setPositions] = useState<{
    [id: string]: TrainPosition;
  }>({});

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const { connected } = useWebSocket();

  /* ---------------------------------------------------------
     RESOLVE ISSUE
  --------------------------------------------------------- */

  const handleResolve = async (
    e: React.MouseEvent,
    trainId: string
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (resolvingId) return;

    setResolvingId(trainId);
    setFeedback(null);

    try {
      const res = await api.resolveIssue(trainId);

      if (res && res.success) {
        if (res.position) {
          setPositions((prev) => ({
            ...prev,
            [trainId]: res.position,
          }));
        }

        setFeedback({
          type: 'success',
          message:
            res.message ||
            `Issue resolved for Train ${trainId}`,
        });
      } else {
        setFeedback({
          type: 'error',
          message:
            res?.error ||
            `Failed to resolve issue for Train ${trainId}`,
        });
      }
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ||
        err?.message ||
        'Network error';

      setFeedback({
        type: 'error',
        message: `Error resolving Train ${trainId}: ${detail}`,
      });
    } finally {
      setResolvingId(null);

      setTimeout(() => {
        setFeedback(null);
      }, 5000);
    }
  };

  /* ---------------------------------------------------------
     FETCH DATA
  --------------------------------------------------------- */

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        const [trainsData, alertsData] =
          await Promise.all([
            api.getTrains(),
            api.getAlerts(),
          ]);

        const posMap: {
          [id: string]: TrainPosition;
        } = {};

        await Promise.all(
          trainsData.map(async (t) => {
            try {
              const pos =
                await api.getTrainPosition(t.train_id);

              if (
                pos &&
                pos.is_simulated === true
              ) {
                posMap[t.train_id] = pos;
              }
            } catch (e) {}
          })
        );

        if (mounted) {
          setPositions((prev) => ({
            ...prev,
            ...posMap,
          }));

          setAlerts(
            alertsData.filter(
              (a) => a.severity === 'critical'
            )
          );
        }
      } catch (e) {}
    };

    fetchData();

    const interval = setInterval(
      fetchData,
      10000
    );

    const unsub =
      wsService.onTrainUpdate((data) => {
        const pos =
          data.position as TrainPosition;

        if (
          pos &&
          pos.is_simulated === true
        ) {
          setPositions((prev) => ({
            ...prev,
            [pos.train_id]: pos,
          }));
        }
      });

    return () => {
      mounted = false;
      clearInterval(interval);
      unsub();
    };
  }, []);

  /* ---------------------------------------------------------
     ACTIVE FLEET
  --------------------------------------------------------- */

  const activePositions = Object.values(
    positions
  ).filter(
    (p) => p.is_simulated === true
  );

  const normalCount =
    activePositions.filter(
      (p) =>
        p.status === 'On Time' ||
        p.status === 'ON_TIME'
    ).length;

  const delayedCount =
    activePositions.filter(
      (p) =>
        p.status === 'Delayed' ||
        p.status === 'Slight Delay' ||
        p.status === 'DELAYED'
    ).length;

  const criticalCount =
    activePositions.filter(
      (p) =>
        p.status === 'Critical Delay' ||
        p.status === 'CRITICAL'
    ).length;

  /* ---------------------------------------------------------
     SORT
     Critical → Highest delay → Lowest delay
  --------------------------------------------------------- */

  const sortedTrains = [
    ...activePositions,
  ].sort((a, b) => {
    const isCritA =
      a.status === 'CRITICAL' ||
      a.status === 'Critical Delay';

    const isCritB =
      b.status === 'CRITICAL' ||
      b.status === 'Critical Delay';

    if (isCritA && !isCritB) return -1;
    if (isCritB && !isCritA) return 1;

    return (
      (b.delay_minutes || 0) -
      (a.delay_minutes || 0)
    );
  });

  /* ---------------------------------------------------------
     STATUS HELPERS
  --------------------------------------------------------- */

  const getStatusStyles = (
    status: string
  ) => {
    if (
      status === 'CRITICAL' ||
      status === 'Critical Delay'
    ) {
      return {
        label: 'Critical',
        badge:
          'border-red-200 bg-red-50 text-red-700',
        dot: 'bg-red-500',
      };
    }

    if (
      status === 'DELAYED' ||
      status === 'Delayed' ||
      status === 'Slight Delay'
    ) {
      return {
        label: 'Delayed',
        badge:
          'border-amber-200 bg-amber-50 text-amber-700',
        dot: 'bg-amber-500',
      };
    }

    return {
      label: 'On Time',
      badge:
        'border-emerald-200 bg-emerald-50 text-emerald-700',
      dot: 'bg-emerald-500',
    };
  };

  return (
    <div className="flex flex-col gap-6 pb-10">

      {/* ========================================================= */}
      {/* FEEDBACK */}
      {/* ========================================================= */}

      {feedback && (
        <div
          className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium shadow-sm ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          <div className="flex items-center gap-3">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            )}

            <span>{feedback.message}</span>
          </div>

          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="rounded-md p-1 opacity-60 transition hover:bg-black/5 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* PAGE HEADER */}
      {/* ========================================================= */}

      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

        <div>
          <div className="flex items-center gap-3">

            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Control Room
            </h1>

            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
                connected
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  connected
                    ? 'bg-emerald-500'
                    : 'bg-red-500'
                }`}
              />

              {connected ? 'Live' : 'Disconnected'}
            </span>

          </div>

          <p className="mt-2 text-sm text-slate-500">
            Monitor active trains, delays and operational issues
          </p>
        </div>

        {/* SUMMARY */}

        <div className="grid grid-cols-3 gap-3">

          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">

            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />

              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Normal
              </span>
            </div>

            <div className="mt-1 text-xl font-bold text-slate-900">
              {normalCount}
            </div>

          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />

              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Delayed
              </span>
            </div>

            <div className="mt-1 text-xl font-bold text-slate-900">
              {delayedCount}
            </div>

          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">

            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-600" />

              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Critical
              </span>
            </div>

            <div className="mt-1 text-xl font-bold text-slate-900">
              {criticalCount}
            </div>

          </div>

        </div>
      </div>


      {/* ========================================================= */}
      {/* CRITICAL ALERT */}
      {/* ========================================================= */}

      {alerts.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50/70 p-4 shadow-sm">

          <div className="flex items-start gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-red-100 bg-white">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>

            <div className="min-w-0">

              <div className="flex flex-wrap items-center gap-2">

                <h2 className="font-bold text-red-800">
                  {alerts.length} Critical Network Alert
                  {alerts.length !== 1 ? 's' : ''}
                </h2>

                <span className="rounded-full bg-red-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-red-700">
                  Action Required
                </span>

              </div>

              <p className="mt-1 text-sm text-red-700">
                {alerts[0].message}
              </p>

              {alerts[0].train_name && (
                <p className="mt-1 text-xs font-semibold text-red-600">
                  Affected train: {alerts[0].train_name}
                </p>
              )}

            </div>

          </div>
        </div>
      )}


      {/* ========================================================= */}
      {/* MAIN CONTENT */}
      {/* ========================================================= */}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">

        {/* ======================================================= */}
        {/* TRAIN MONITOR */}
        {/* ======================================================= */}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-200 p-5">

            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

              <div className="flex items-center gap-3">

                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
                  <Train className="h-5 w-5 text-red-600" />
                </div>

                <div>
                  <h2 className="font-bold text-slate-900">
                    Network Operations Monitor
                  </h2>

                  <p className="text-xs text-slate-500">
                    Active simulated fleet
                  </p>
                </div>

              </div>

              <div className="flex flex-wrap gap-2">

                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Normal {normalCount}
                </span>

                <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Delayed {delayedCount}
                </span>

                <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  Critical {criticalCount}
                </span>

              </div>

            </div>
          </div>


          {/* TABLE */}

          <div className="overflow-x-auto">

            <table className="w-full min-w-[900px] text-left">

              <thead className="border-b border-slate-200 bg-slate-50">

                <tr>

                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Train
                  </th>

                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Location
                  </th>

                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Speed
                  </th>

                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Delay
                  </th>

                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Status
                  </th>

                  <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Action
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-slate-100">

                {sortedTrains.map((pos) => {

                  const status =
                    getStatusStyles(pos.status);

                  const isCritical =
                    pos.status === 'CRITICAL' ||
                    pos.status === 'Critical Delay';

                  return (
                    <tr
                      key={pos.train_id}
                      className={`transition-colors hover:bg-slate-50 ${
                        isCritical
                          ? 'bg-red-50/30'
                          : ''
                      }`}
                    >

                      {/* TRAIN */}

                      <td className="px-5 py-4">

                        <div className="flex items-center gap-3">

                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                              isCritical
                                ? 'bg-red-50'
                                : 'bg-slate-100'
                            }`}
                          >
                            <Train
                              className={`h-4 w-4 ${
                                isCritical
                                  ? 'text-red-600'
                                  : 'text-slate-600'
                              }`}
                            />
                          </div>

                          <div>
                            <div className="font-bold text-slate-900">
                              {pos.train_id}
                            </div>

                            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                              Active
                            </div>
                          </div>

                        </div>

                      </td>


                      {/* LOCATION */}

                      <td className="px-5 py-4">

                        <div className="flex items-center gap-2">

                          <MapPin className="h-4 w-4 shrink-0 text-red-500" />

                          <div className="min-w-0">

                            <div className="max-w-[190px] truncate text-sm font-semibold text-slate-700">
                              {pos.next_station}
                            </div>

                            <div className="mt-0.5 text-xs text-slate-400">
                              Progress {Math.round(
                                pos.journey_progress
                              )}%
                            </div>

                          </div>

                        </div>

                      </td>


                      {/* SPEED */}

                      <td className="px-5 py-4">

                        <div className="flex items-center gap-2">

                          <Gauge className="h-4 w-4 text-blue-500" />

                          <span className="text-sm font-semibold text-slate-700">

                            {Number(
                              pos.speed_kmph
                            ).toFixed(1)}

                            <span className="ml-1 text-xs font-medium text-slate-400">
                              km/h
                            </span>

                          </span>

                        </div>

                      </td>


                      {/* DELAY */}

                      <td className="px-5 py-4">

                        <span
                          className={`text-sm font-bold ${
                            pos.delay_minutes > 15
                              ? 'text-red-600'
                              : pos.delay_minutes > 0
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                          }`}
                        >
                          {Number(
                            pos.delay_minutes
                          ).toFixed(1)}{' '}
                          min
                        </span>

                      </td>


                      {/* STATUS */}

                      <td className="px-5 py-4">

                        <span
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${status.badge}`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${status.dot}`}
                          />

                          {status.label}
                        </span>

                      </td>


                      {/* ACTION */}

                      <td className="px-5 py-4 text-right">

                        {isCritical ? (

                          <button
                            type="button"
                            onClick={(e) =>
                              handleResolve(
                                e,
                                pos.train_id
                              )
                            }
                            disabled={
                              resolvingId ===
                              pos.train_id
                            }
                            className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 shadow-sm transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {resolvingId ===
                            pos.train_id
                              ? 'Resolving...'
                              : 'Resolve Issue'}
                          </button>

                        ) : (

                          <span className="text-xs font-medium text-slate-300">
                            No action
                          </span>

                        )}

                      </td>

                    </tr>
                  );
                })}

              </tbody>

            </table>


            {sortedTrains.length === 0 && (
              <div className="flex min-h-[300px] flex-col items-center justify-center p-8">

                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                  <Train className="h-7 w-7 text-slate-400" />
                </div>

                <h3 className="mt-4 font-semibold text-slate-900">
                  No active trains
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  No simulated train telemetry is currently available.
                </p>

              </div>
            )}

          </div>
        </div>


        {/* ======================================================= */}
        {/* SYSTEM SIDEBAR */}
        {/* ======================================================= */}

        <div className="flex flex-col gap-5">

          {/* SYSTEM STATUS */}

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                <Activity className="h-5 w-5 text-slate-700" />
              </div>

              <div>
                <h3 className="font-bold text-slate-900">
                  System Status
                </h3>

                <p className="text-xs text-slate-500">
                  Platform services
                </p>
              </div>

            </div>


            <div className="mt-5 space-y-4">

              <div className="flex items-center justify-between">

                <div className="flex items-center gap-3">
                  <Activity className="h-4 w-4 text-emerald-600" />

                  <span className="text-sm font-medium text-slate-700">
                    API Gateway
                  </span>
                </div>

                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                  99.9% Uptime
                </span>

              </div>


              <div className="flex items-center justify-between">

                <div className="flex items-center gap-3">
                  <Database className="h-4 w-4 text-emerald-600" />

                  <span className="text-sm font-medium text-slate-700">
                    ETA ML Engine
                  </span>
                </div>

                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                  Online
                </span>

              </div>


              <div className="flex items-center justify-between">

                <div className="flex items-center gap-3">

                  <Wifi
                    className={`h-4 w-4 ${
                      connected
                        ? 'text-emerald-600'
                        : 'text-red-600'
                    }`}
                  />

                  <span className="text-sm font-medium text-slate-700">
                    WebSocket
                  </span>

                </div>

                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                    connected
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {connected
                    ? 'Connected'
                    : 'Disconnected'}
                </span>

              </div>

            </div>

          </div>


          {/* FLEET SUMMARY */}

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                <Train className="h-5 w-5 text-blue-600" />
              </div>

              <div>
                <h3 className="font-bold text-slate-900">
                  Fleet Summary
                </h3>

                <p className="text-xs text-slate-500">
                  Current operational state
                </p>
              </div>

            </div>


            <div className="mt-5">

              <div className="flex items-end justify-between">

                <div>

                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Active Trains
                  </p>

                  <p className="mt-1 text-3xl font-bold text-slate-900">
                    {activePositions.length}
                  </p>

                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
                  <Activity className="h-5 w-5 text-emerald-600" />
                </div>

              </div>


              <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">

                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{
                    width:
                      activePositions.length > 0
                        ? `${Math.min(
                            100,
                            (normalCount /
                              activePositions.length) *
                              100
                          )}%`
                        : '0%',
                  }}
                />

              </div>


              <div className="mt-2 flex justify-between text-[11px] text-slate-400">

                <span>
                  {normalCount} operating normally
                </span>

                <span>
                  {activePositions.length} total
                </span>

              </div>

            </div>

          </div>


          {/* OPERATIONAL RESPONSE */}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">

            <div className="flex items-start gap-3">

              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />

              <div>

                <h4 className="text-sm font-bold text-slate-800">
                  Operational Response
                </h4>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Critical trains are automatically prioritized.
                  Use{' '}
                  <span className="font-semibold text-slate-700">
                    Resolve Issue
                  </span>{' '}
                  after the simulated operational condition has been cleared.
                </p>

              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default ControlRoom;