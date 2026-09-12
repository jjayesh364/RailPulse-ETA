import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Gauge,
  MapPin,
  Train,
  AlertCircle,
} from 'lucide-react';
import * as api from '../services/api';
import { CongestionSection } from '../types';

const Network = () => {
  const [sections, setSections] = useState<CongestionSection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    api.getCongestion()
      .then((res) => {
        if (mounted) {
          setSections(res);
        }
      })
      .catch((error) => {
        console.error('Failed to load network congestion:', error);
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const sortedSections = useMemo(() => {
    return [...sections].sort(
      (a, b) => b.congestion_score - a.congestion_score
    );
  }, [sections]);

  const severeCount = sections.filter(
    (section) => section.status === 'severe'
  ).length;

  const congestedCount = sections.filter(
    (section) => section.status === 'congested'
  ).length;

  const normalCount = sections.filter(
    (section) =>
      section.status !== 'severe' &&
      section.status !== 'congested'
  ).length;

  const getStatus = (status: string) => {
    if (status === 'severe') {
      return {
        label: 'Severe',
        badge: 'border-red-200 bg-red-50 text-red-700',
        dot: 'bg-red-500',
      };
    }

    if (status === 'congested') {
      return {
        label: 'Congested',
        badge: 'border-amber-200 bg-amber-50 text-amber-700',
        dot: 'bg-amber-500',
      };
    }

    return {
      label: 'Normal',
      badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      dot: 'bg-emerald-500',
    };
  };

  const getScoreColor = (score: number) => {
    if (score > 75) {
      return 'bg-red-500';
    }

    if (score > 50) {
      return 'bg-amber-500';
    }

    return 'bg-emerald-500';
  };

  const getScoreTextColor = (score: number) => {
    if (score > 75) {
      return 'text-red-600';
    }

    if (score > 50) {
      return 'text-amber-600';
    }

    return 'text-emerald-600';
  };

  return (
    <div className="flex flex-col gap-6 pb-8">

      {/* PAGE HEADER */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-700">
            Network Operations
          </p>

          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Network
            </h1>

            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Live
            </span>
          </div>

          <p className="mt-2 text-sm text-slate-500">
            Monitor track sections, congestion levels and operational
            bottlenecks
          </p>
        </div>

        {/* SUMMARY CARDS */}
        <div className="flex flex-wrap items-center gap-3">

          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Sections
              </span>
            </div>

            <div className="mt-1 text-xl font-bold text-slate-900">
              {sections.length}
            </div>
          </div>

          <div className="rounded-lg border border-emerald-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Normal
              </span>
            </div>

            <div className="mt-1 text-xl font-bold text-emerald-600">
              {normalCount}
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Congested
              </span>
            </div>

            <div className="mt-1 text-xl font-bold text-amber-600">
              {congestedCount}
            </div>
          </div>

          <div className="rounded-lg border border-red-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Severe
              </span>
            </div>

            <div className="mt-1 text-xl font-bold text-red-600">
              {severeCount}
            </div>
          </div>

        </div>
      </div>

      {/* NETWORK OVERVIEW */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

        {/* NETWORK STATUS */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Network Status
              </p>

              <p className="mt-2 text-xl font-bold text-slate-900">
                {severeCount > 0
                  ? 'Attention Required'
                  : congestedCount > 0
                    ? 'Moderate Congestion'
                    : 'Operating Normally'}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50">
              <Activity className="h-5 w-5 text-blue-600" />
            </div>
          </div>

          <p className="mt-3 text-sm text-slate-500">
            Current operational condition across monitored sections.
          </p>
        </div>

        {/* CONGESTED SECTIONS */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Congested Sections
              </p>

              <p className="mt-2 text-xl font-bold text-slate-900">
                {congestedCount + severeCount}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50">
              <Gauge className="h-5 w-5 text-amber-600" />
            </div>
          </div>

          <p className="mt-3 text-sm text-slate-500">
            Sections currently requiring operational attention.
          </p>
        </div>

        {/* MONITORING MODE */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Monitoring Mode
              </p>

              <p className="mt-2 text-xl font-bold text-slate-900">
                Simulated Telemetry
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
              <Train className="h-5 w-5 text-emerald-600" />
            </div>
          </div>

          <p className="mt-3 text-sm text-slate-500">
            Operational conditions are updated from the active demo
            environment.
          </p>
        </div>

      </div>

      {/* MAIN NETWORK TABLE */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

        {/* TABLE HEADER */}
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-3">

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
              <MapPin className="h-4 w-4 text-red-600" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Track Section Monitor
              </h2>

              <p className="text-xs text-slate-500">
                Ranked by current congestion score
              </p>
            </div>

          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Live operational view
          </div>

        </div>

        {/* LOADING */}
        {loading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="flex flex-col items-center gap-3">

              <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-red-600" />

              <p className="text-sm text-slate-500">
                Loading network data...
              </p>

            </div>
          </div>

        ) : sortedSections.length === 0 ? (

          /* EMPTY STATE */
          <div className="flex min-h-[400px] flex-col items-center justify-center px-6 text-center">

            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <MapPin className="h-7 w-7 text-slate-400" />
            </div>

            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              No network sections available
            </h3>

            <p className="mt-1 max-w-md text-sm text-slate-500">
              Network congestion data is currently unavailable.
            </p>

          </div>

        ) : (

          /* TABLE */
          <div className="overflow-x-auto">

            <table className="w-full min-w-[850px] text-left text-sm">

              <thead className="border-b border-slate-100 bg-slate-50/80">
                <tr>

                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Track Section
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Status
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Congestion
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Active Trains
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Avg Speed
                  </th>

                </tr>
              </thead>

              <tbody>

                {sortedSections.map((section) => {
                  const status = getStatus(section.status);

                  return (
                    <tr
                      key={section.section_id}
                      className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/70"
                    >

                      {/* SECTION */}
                      <td className="px-6 py-5">

                        <div className="flex items-start gap-3">

                          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                            <MapPin className="h-4 w-4 text-red-500" />
                          </div>

                          <div>

                            <p className="font-semibold text-slate-900">
                              {section.from_station}

                              <span className="mx-2 text-slate-300">
                                →
                              </span>

                              {section.to_station}
                            </p>

                            <p className="mt-1 font-mono text-xs text-slate-400">
                              {section.section_id}
                            </p>

                          </div>

                        </div>

                      </td>

                      {/* STATUS */}
                      <td className="px-6 py-5">

                        <span
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${status.badge}`}
                        >

                          <span
                            className={`h-2 w-2 rounded-full ${status.dot}`}
                          />

                          {status.label}

                        </span>

                      </td>

                      {/* CONGESTION SCORE */}
                      <td className="px-6 py-5">

                        <div className="flex min-w-[220px] items-center gap-3">

                          <div className="h-2.5 w-32 overflow-hidden rounded-full bg-slate-100">

                            <div
                              className={`h-full rounded-full transition-all ${getScoreColor(
                                section.congestion_score
                              )}`}
                              style={{
                                width: `${Math.min(
                                  Math.max(section.congestion_score, 0),
                                  100
                                )}%`,
                              }}
                            />

                          </div>

                          <span
                            className={`font-semibold ${getScoreTextColor(
                              section.congestion_score
                            )}`}
                          >
                            {section.congestion_score}
                          </span>

                          <span className="text-xs text-slate-400">
                            / 100
                          </span>

                        </div>

                      </td>

                      {/* ACTIVE TRAINS */}
                      <td className="px-6 py-5">

                        <div className="flex items-center gap-2">

                          <Train className="h-4 w-4 text-slate-400" />

                          <span className="font-semibold text-slate-700">
                            {section.active_trains}
                          </span>

                          <span className="text-xs text-slate-400">
                            trains
                          </span>

                        </div>

                      </td>

                      {/* SPEED */}
                      <td className="px-6 py-5">

                        <div className="flex items-center gap-2">

                          <Gauge className="h-4 w-4 text-blue-500" />

                          <span className="font-semibold text-slate-700">
                            {section.avg_speed_kmph}
                          </span>

                          <span className="text-xs text-slate-400">
                            km/h
                          </span>

                        </div>

                      </td>

                    </tr>
                  );
                })}

              </tbody>

            </table>

          </div>
        )}

      </div>

      {/* LEGEND / EXPLANATION */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Congestion Score
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Higher scores indicate greater operational pressure on a
              track section.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-xs font-medium">

            <div className="flex items-center gap-2 text-emerald-700">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              0–50 Normal
            </div>

            <div className="flex items-center gap-2 text-amber-700">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              51–75 Congested
            </div>

            <div className="flex items-center gap-2 text-red-700">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
              76–100 Severe
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};

export default Network;