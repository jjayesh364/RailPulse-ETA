import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Navigation,
  Map,
  AlertTriangle,
  Train as TrainIcon,
  Gauge,
  Clock3,
  Route,
  Radio,
} from 'lucide-react';

import {
  Train,
  TrainPosition,
  ETAPrediction,
  RouteStop,
} from '../types';

import * as api from '../services/api';
import { wsService } from '../services/websocket';

import ETAPanel from '../components/train/ETAPanel';
import ETATable from '../components/train/ETATable';
import PredictionFactors from '../components/train/PredictionFactors';
import RouteTimeline from '../components/train/RouteTimeline';
import ETAHistoryChart from '../components/train/ETAHistoryChart';

const TrainDetails = () => {
  const { trainId } = useParams<{ trainId: string }>();

  const [train, setTrain] = useState<Train | null>(null);
  const [position, setPosition] = useState<TrainPosition | null>(null);
  const [eta, setEta] = useState<ETAPrediction[]>([]);
  const [route, setRoute] = useState<RouteStop[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('Just now');

  useEffect(() => {
    if (!trainId) return;

    let mounted = true;

    Promise.all([
      api.getTrain(trainId).catch(() => null),
      api.getTrainPosition(trainId).catch(() => null),
      api.getTrainETA(trainId).catch(() => []),
      api.getTrainRoute(trainId).catch(() => []),
      api.getTrainHistory(trainId).catch(() => []),
    ]).then(([t, p, e, r, h]) => {
      if (mounted) {
        setTrain(t);
        setPosition(p);
        setEta(e);
        setRoute(r);
        setHistory(h);
        setLoading(false);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    });

    return () => {
      mounted = false;
    };
  }, [trainId]);

  useEffect(() => {
    if (!trainId) return;

    const unsubTrain = wsService.onTrainUpdate((data) => {
      if (data.position.train_id === trainId) {
        setPosition(data.position);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    });

    const unsubETA = wsService.onETAUpdate((data) => {
      if (data.train_id === trainId) {
        setEta(data.predictions);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    });

    return () => {
      unsubTrain();
      unsubETA();
    };
  }, [trainId]);

  /* LOADING */
  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-red-600" />
          <p className="text-sm text-slate-500">
            Loading train information...
          </p>
        </div>
      </div>
    );
  }

  /* TRAIN NOT FOUND */
  if (!train) {
    return (
      <div className="flex min-h-[500px] flex-col items-center justify-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
          <TrainIcon className="h-7 w-7 text-slate-400" />
        </div>

        <h2 className="mt-4 text-lg font-semibold text-slate-900">
          Train not found
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          The requested train could not be loaded.
        </p>

        <Link
          to="/trains"
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Live Trains
        </Link>
      </div>
    );
  }

  const nextStationEta = eta.length > 0 ? eta[0] : null;

  const isCritical =
    position?.status === 'CRITICAL' ||
    position?.status === 'Critical Delay';

  const isDelayed =
    position?.status === 'DELAYED' ||
    position?.status === 'Delayed' ||
    position?.status === 'Slight Delay';

  const statusLabel = isCritical
    ? 'Critical'
    : isDelayed
      ? 'Delayed'
      : 'On Time';

  const statusClasses = isCritical
    ? 'border-red-200 bg-red-50 text-red-700'
    : isDelayed
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700';

  const statusDot = isCritical
    ? 'bg-red-500'
    : isDelayed
      ? 'bg-amber-500'
      : 'bg-emerald-500';

  const delay = position?.delay_minutes || 0;

  return (
    <div className="flex flex-col gap-6 pb-10">

      {/* ========================================================= */}
      {/* HEADER */}
      {/* ========================================================= */}

      <div className="flex flex-col gap-4">

        <Link
          to="/trains"
          className="inline-flex w-fit items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-red-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Live Trains
        </Link>

        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

          <div>

            <div className="flex flex-wrap items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50">
                <TrainIcon className="h-5 w-5 text-red-600" />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-3">

                  <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                    {train.train_number}
                  </h1>

                  <span
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses}`}
                  >
                    <span className={`h-2 w-2 rounded-full ${statusDot}`} />
                    {statusLabel}
                  </span>

                </div>

                <p className="mt-1 text-base font-semibold text-slate-700">
                  {train.train_name}
                </p>
              </div>

            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-500">

              <span className="inline-flex items-center gap-1.5">
                <Map className="h-4 w-4" />
                {train.source}
                <span className="text-slate-300">→</span>
                {train.destination}
              </span>

              <span className="text-slate-300">•</span>

              <span className="inline-flex items-center gap-1.5">
                <Radio className="h-4 w-4 text-amber-500" />
                Simulated GPS telemetry
              </span>

            </div>

          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">

            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Data Source
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-900">
              {train.data_source || 'Real Train Master'}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Updated {lastUpdated}
            </p>

          </div>

        </div>

      </div>


      {/* ========================================================= */}
      {/* CURRENT TRAIN METRICS */}
      {/* ========================================================= */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

        {/* SPEED */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Current Speed
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-900">
                {Number(position?.speed_kmph || 0).toFixed(1)}
                <span className="ml-1 text-sm font-medium text-slate-400">
                  km/h
                </span>
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Gauge className="h-5 w-5 text-blue-600" />
            </div>

          </div>

        </div>


        {/* DELAY */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Current Delay
              </p>

              <p
                className={`mt-2 text-2xl font-bold ${
                  delay > 15
                    ? 'text-red-600'
                    : delay > 0
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                }`}
              >
                {delay}
                <span className="ml-1 text-sm font-medium opacity-70">
                  min
                </span>
              </p>
            </div>

            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                delay > 15
                  ? 'bg-red-50'
                  : delay > 0
                    ? 'bg-amber-50'
                    : 'bg-emerald-50'
              }`}
            >
              <Clock3
                className={`h-5 w-5 ${
                  delay > 15
                    ? 'text-red-600'
                    : delay > 0
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                }`}
              />
            </div>

          </div>

        </div>


        {/* DISTANCE */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Distance Covered
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-900">
                {Number(position?.distance_covered_km || 0).toFixed(1)}
                <span className="ml-1 text-sm font-medium text-slate-400">
                  km
                </span>
              </p>

              <p className="mt-1 text-xs text-slate-400">
                of {train.total_distance_km} km
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
              <Navigation className="h-5 w-5 text-slate-600" />
            </div>

          </div>

        </div>


        {/* PROGRESS */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Journey Progress
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-900">
                {Math.round(position?.journey_progress || 0)}%
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
              <Route className="h-5 w-5 text-red-600" />
            </div>

          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-red-600 transition-all"
              style={{
                width: `${Math.min(
                  Math.max(position?.journey_progress || 0, 0),
                  100
                )}%`,
              }}
            />
          </div>

        </div>

      </div>


      {/* ========================================================= */}
      {/* CURRENT LOCATION */}
      {/* ========================================================= */}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-4">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50">
              <Map className="h-5 w-5 text-red-600" />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Next Station
              </p>

              <p className="mt-1 text-lg font-bold text-slate-900">
                {position?.next_station || 'Updating...'}
              </p>
            </div>

          </div>

          <div className="text-left sm:text-right">

            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Live Telemetry
            </p>

            <p className="mt-1 text-sm font-semibold text-emerald-600">
              ● Connected
            </p>

          </div>

        </div>

      </div>


      {/* ========================================================= */}
      {/* MAIN CONTENT */}
      {/* ========================================================= */}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* ROUTE */}
        <div className="max-h-[800px] overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="sticky top-0 z-10 border-b border-slate-100 bg-white pb-4">

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
                <Route className="h-4 w-4 text-red-600" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Route & Progress
                </h2>

                <p className="text-xs text-slate-500">
                  Journey timeline
                </p>
              </div>

            </div>

          </div>

          <div className="pt-4">
            <RouteTimeline
              route={route}
              currentStationCode={position?.next_station}
            />
          </div>

        </div>


        {/* RIGHT SIDE */}
        <div className="flex flex-col gap-6 lg:col-span-2">

          {/* ETA */}
          <ETAPanel
            prediction={nextStationEta}
            lastUpdated={lastUpdated}
          />


          {/* FACTORS + HISTORY */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

              <div className="mb-5 flex items-center gap-3">

                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                </div>

                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Prediction Factors
                  </h2>

                  <p className="text-xs text-slate-500">
                    Conditions influencing the ETA
                  </p>
                </div>

              </div>

              <PredictionFactors
                factors={nextStationEta?.factors || []}
              />

            </div>


            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

              <div className="mb-5 flex items-center gap-3">

                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                  <Navigation className="h-4 w-4 text-blue-600" />
                </div>

                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    ETA History
                  </h2>

                  <p className="text-xs text-slate-500">
                    Recent prediction changes
                  </p>
                </div>

              </div>

              <ETAHistoryChart data={history} />

            </div>

          </div>


          {/* UPCOMING STATIONS */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

            <div className="flex items-center justify-between border-b border-slate-100 p-5">

              <div className="flex items-center gap-3">

                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
                  <TrainIcon className="h-4 w-4 text-red-600" />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Upcoming Stations ETA
                  </h2>

                  <p className="text-xs text-slate-500">
                    Dynamic arrival predictions
                  </p>
                </div>

              </div>

              <span className="hidden text-xs font-medium text-slate-400 sm:block">
                Live updates
              </span>

            </div>

            <div className="overflow-x-auto">
              <ETATable predictions={eta} />
            </div>

          </div>

        </div>

      </div>


      {/* ========================================================= */}
      {/* PROTOTYPE NOTE */}
      {/* ========================================================= */}

      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5">

        <div className="flex items-start gap-3">

          <Radio className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

          <div>

            <h3 className="text-sm font-bold text-slate-900">
              Telemetry Mode
            </h3>

            <p className="mt-1 text-sm leading-6 text-slate-600">
              This prototype uses simulated GPS/telemetry data. The system is
              designed to accept authorized real-time railway telemetry when
              such a feed is available.
            </p>

          </div>

        </div>

      </div>

    </div>
  );
};

export default TrainDetails;