import { useEffect, useMemo, useState } from 'react';
import * as api from '../services/api';
import { Alert } from '../types';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  Clock,
  Train,
  MapPin,
  Activity,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const Alerts = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  /* ---------------------------------------------------------
     FETCH ALERTS
  --------------------------------------------------------- */

  useEffect(() => {
    let mounted = true;

    const fetchAlerts = async () => {
      try {
        const data = await api.getAlerts();

        if (mounted) {
          setAlerts(data);
        }
      } catch (error) {
        console.error('Failed to load alerts:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchAlerts();

    const interval = setInterval(fetchAlerts, 10000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  /* ---------------------------------------------------------
     COUNTS
  --------------------------------------------------------- */

  const counts = useMemo(() => {
    return {
      all: alerts.length,
      critical: alerts.filter(
        (a) => a.severity === 'critical'
      ).length,
      warning: alerts.filter(
        (a) => a.severity === 'warning'
      ).length,
      info: alerts.filter(
        (a) => a.severity === 'info'
      ).length,
      success: alerts.filter(
        (a) => a.severity === 'success'
      ).length,
    };
  }, [alerts]);

  const filteredAlerts =
    filter === 'all'
      ? alerts
      : alerts.filter(
          (alert) => alert.severity === filter
        );

  /* ---------------------------------------------------------
     SEVERITY CONFIG
  --------------------------------------------------------- */

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          label: 'Critical',
          icon: AlertCircle,
          iconBg: 'bg-red-50',
          iconColor: 'text-red-600',
          badge:
            'border-red-200 bg-red-50 text-red-700',
          dot: 'bg-red-500',
          accent: 'border-l-red-500',
        };

      case 'warning':
        return {
          label: 'Warning',
          icon: AlertTriangle,
          iconBg: 'bg-amber-50',
          iconColor: 'text-amber-600',
          badge:
            'border-amber-200 bg-amber-50 text-amber-700',
          dot: 'bg-amber-500',
          accent: 'border-l-amber-500',
        };

      case 'success':
        return {
          label: 'Resolved',
          icon: CheckCircle2,
          iconBg: 'bg-emerald-50',
          iconColor: 'text-emerald-600',
          badge:
            'border-emerald-200 bg-emerald-50 text-emerald-700',
          dot: 'bg-emerald-500',
          accent: 'border-l-emerald-500',
        };

      case 'info':
      default:
        return {
          label: 'Information',
          icon: Info,
          iconBg: 'bg-blue-50',
          iconColor: 'text-blue-600',
          badge:
            'border-blue-200 bg-blue-50 text-blue-700',
          dot: 'bg-blue-500',
          accent: 'border-l-blue-500',
        };
    }
  };

  /* ---------------------------------------------------------
     TIME FORMAT
  --------------------------------------------------------- */

  const formatAlertTime = (createdAt: string) => {
    try {
      return formatDistanceToNow(
        new Date(createdAt),
        {
          addSuffix: true,
        }
      );
    } catch {
      return 'Recently';
    }
  };

  /* ---------------------------------------------------------
     FILTER BUTTON
  --------------------------------------------------------- */

  const filterButton = (
    value: string,
    label: string,
    count: number
  ) => {
    const active = filter === value;

    let activeStyle =
      'border-slate-900 bg-slate-900 text-white';

    if (value === 'critical') {
      activeStyle =
        'border-red-600 bg-red-600 text-white';
    }

    if (value === 'warning') {
      activeStyle =
        'border-amber-500 bg-amber-500 text-white';
    }

    if (value === 'info') {
      activeStyle =
        'border-blue-600 bg-blue-600 text-white';
    }

    return (
      <button
        type="button"
        onClick={() => setFilter(value)}
        className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition ${
          active
            ? activeStyle
            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
        }`}
      >
        {label}

        <span
          className={`ml-2 ${
            active
              ? 'opacity-80'
              : 'text-slate-400'
          }`}
        >
          {count}
        </span>
      </button>
    );
  };

  /* ---------------------------------------------------------
     UI
  --------------------------------------------------------- */

  return (
    <div className="flex flex-col gap-6 pb-10">

      {/* ===================================================== */}
      {/* PAGE HEADER */}
      {/* ===================================================== */}

      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

        <div>

          <div className="flex items-center gap-3">

            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              System Alerts
            </h1>

            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Live
            </span>

          </div>

          <p className="mt-2 text-sm text-slate-500">
            Network incidents and automated operational notifications
          </p>

        </div>


        {/* ================================================= */}
        {/* SUMMARY */}
        {/* ================================================= */}

        <div className="grid grid-cols-3 gap-3">

          {/* TOTAL */}

          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">

            <div className="flex items-center gap-2">

              <Activity className="h-4 w-4 text-slate-500" />

              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Total
              </span>

            </div>

            <div className="mt-1 text-xl font-bold text-slate-900">
              {counts.all}
            </div>

          </div>


          {/* CRITICAL */}

          <div className="rounded-xl border border-red-200 bg-red-50/60 px-4 py-3 shadow-sm">

            <div className="flex items-center gap-2">

              <AlertCircle className="h-4 w-4 text-red-600" />

              <span className="text-[10px] font-bold uppercase tracking-wider text-red-600">
                Critical
              </span>

            </div>

            <div className="mt-1 text-xl font-bold text-red-700">
              {counts.critical}
            </div>

          </div>


          {/* WARNING */}

          <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 shadow-sm">

            <div className="flex items-center gap-2">

              <AlertTriangle className="h-4 w-4 text-amber-600" />

              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                Warning
              </span>

            </div>

            <div className="mt-1 text-xl font-bold text-amber-700">
              {counts.warning}
            </div>

          </div>

        </div>

      </div>


      {/* ===================================================== */}
      {/* ALERT FEED HEADER / FILTERS */}
      {/* ===================================================== */}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">

        <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">

          <div>

            <div className="flex items-center gap-2">

              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>

              <h2 className="font-bold text-slate-900">
                Alert Feed
              </h2>

            </div>

            <p className="mt-1 text-xs text-slate-500">
              Showing {filteredAlerts.length} notification
              {filteredAlerts.length !== 1
                ? 's'
                : ''}
            </p>

          </div>


          <div className="flex flex-wrap gap-2">

            {filterButton(
              'all',
              'All',
              counts.all
            )}

            {filterButton(
              'critical',
              'Critical',
              counts.critical
            )}

            {filterButton(
              'warning',
              'Warning',
              counts.warning
            )}

            {filterButton(
              'info',
              'Info',
              counts.info
            )}

          </div>

        </div>

      </div>


      {/* ===================================================== */}
      {/* LOADING */}
      {/* ===================================================== */}

      {loading ? (

        <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">

          <div className="flex flex-col items-center gap-3">

            <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-red-600" />

            <p className="text-sm text-slate-500">
              Loading system alerts...
            </p>

          </div>

        </div>

      ) : filteredAlerts.length === 0 ? (

        /* ================================================= */
        /* EMPTY STATE */
        /* ================================================= */

        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">

          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>

          <h3 className="mt-4 text-lg font-bold text-slate-900">
            No alerts found
          </h3>

          <p className="mt-1 max-w-sm text-center text-sm text-slate-500">
            There are no notifications matching the selected filter.
          </p>

          {filter !== 'all' && (
            <button
              type="button"
              onClick={() => setFilter('all')}
              className="mt-5 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              View All Alerts
            </button>
          )}

        </div>

      ) : (

        /* ================================================= */
        /* ALERT LIST */
        /* ================================================= */

        <div className="flex flex-col gap-3">

          {filteredAlerts.map((alert) => {

            const config =
              getSeverityConfig(
                alert.severity
              );

            const Icon = config.icon;

            return (
              <div
                key={alert.id}
                className={`group rounded-xl border border-slate-200 border-l-4 ${config.accent} bg-white p-5 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md`}
              >

                <div className="flex gap-4">

                  {/* ===================================== */}
                  {/* SEVERITY ICON */}
                  {/* ===================================== */}

                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${config.iconBg}`}
                  >
                    <Icon
                      className={`h-5 w-5 ${config.iconColor}`}
                    />
                  </div>


                  {/* ===================================== */}
                  {/* ALERT CONTENT */}
                  {/* ===================================== */}

                  <div className="min-w-0 flex-1">

                    {/* TOP */}

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                      <div className="min-w-0">

                        <div className="flex flex-wrap items-center gap-2">

                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${config.badge}`}
                          >

                            <span
                              className={`h-1.5 w-1.5 rounded-full ${config.dot}`}
                            />

                            {config.label}

                          </span>


                          <span className="inline-flex items-center gap-1 text-xs text-slate-400">

                            <Clock className="h-3 w-3" />

                            {formatAlertTime(
                              alert.created_at
                            )}

                          </span>

                        </div>


                        {/* TRAIN + LOCATION */}

                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">

                          <h3 className="text-base font-bold text-slate-900">
                            {alert.train_name}
                          </h3>

                          {alert.location && (
                            <span className="flex items-center gap-1 text-xs font-medium text-slate-500">

                              <MapPin className="h-3 w-3 text-red-500" />

                              Near {alert.location}

                            </span>
                          )}

                        </div>

                      </div>


                      {/* TRAIN ALERT LABEL */}

                      <div className="hidden shrink-0 items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 sm:flex">

                        <Train className="h-4 w-4 text-slate-500" />

                        <span className="text-xs font-semibold text-slate-600">
                          Train Alert
                        </span>

                      </div>

                    </div>


                    {/* MESSAGE */}

                    <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
                      {alert.message}
                    </p>


                    {/* ETA IMPACT */}

                    {alert.eta_impact_minutes > 0 && (
                      <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2">

                        <Clock className="h-4 w-4 text-red-600" />

                        <span className="text-xs font-semibold text-red-700">
                          ETA Impact
                        </span>

                        <span className="text-sm font-bold text-red-700">
                          +{alert.eta_impact_minutes} min
                        </span>

                      </div>
                    )}

                  </div>

                </div>

              </div>
            );
          })}

        </div>
      )}

    </div>
  );
};

export default Alerts;