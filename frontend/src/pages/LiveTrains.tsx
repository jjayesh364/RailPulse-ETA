import { useState } from 'react';
import { useTrains } from '../hooks/useTrains';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  MapPin,
  Clock,
  Navigation,
  Train,
  ArrowRight,
  Activity,
} from 'lucide-react';

const LiveTrains = () => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');

  const { trains, positions, loading } = useTrains();
  const navigate = useNavigate();

  const filteredTrains = trains.filter((t) => {
    const p = positions[t.train_id];

    // Strictly display active simulated trains only
    if (!p || p.is_simulated !== true) return false;

    const matchSearch =
      t.train_number.includes(search) ||
      t.train_name.toLowerCase().includes(search.toLowerCase());

    let matchFilter = true;

    if (filter === 'ON_TIME') {
      matchFilter =
        p.status === 'On Time' ||
        p.status === 'ON_TIME';
    } else if (filter === 'DELAYED') {
      matchFilter =
        p.status === 'Delayed' ||
        p.status === 'Slight Delay' ||
        p.status === 'DELAYED';
    } else if (filter === 'CRITICAL') {
      matchFilter =
        p.status === 'Critical Delay' ||
        p.status === 'CRITICAL';
    }

    return matchSearch && matchFilter;
  });

  const getStatusStyles = (status: string) => {
    if (
      status === 'ON_TIME' ||
      status === 'On Time'
    ) {
      return {
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
        label: 'On Time',
      };
    }

    if (
      status === 'CRITICAL' ||
      status === 'Critical Delay'
    ) {
      return {
        badge: 'bg-red-50 text-red-700 border-red-200',
        dot: 'bg-red-500',
        label: 'Critical',
      };
    }

    return {
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
      dot: 'bg-amber-500',
      label: 'Delayed',
    };
  };

  return (
    <div className="flex flex-col gap-6 pb-10">

      {/* ========================================================= */}
      {/* PAGE HEADER */}
      {/* ========================================================= */}

      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Live Trains
            </h1>

            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Live
            </span>
          </div>

          <p className="mt-2 text-sm text-slate-500">
            Real-time tracking of active coaching trains
          </p>
        </div>

        {/* SUMMARY */}
        <div className="flex flex-wrap gap-3">

          <div className="flex min-w-[130px] items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
              <Train className="h-4 w-4 text-red-600" />
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Active
              </p>

              <p className="mt-0.5 text-lg font-bold text-slate-900">
                {filteredTrains.length}
              </p>
            </div>
          </div>

          <div className="flex min-w-[150px] items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
              <Activity className="h-4 w-4 text-emerald-600" />
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Monitoring
              </p>

              <p className="mt-0.5 text-lg font-bold text-slate-900">
                Network
              </p>
            </div>
          </div>

        </div>
      </div>


      {/* ========================================================= */}
      {/* SEARCH + FILTERS */}
      {/* ========================================================= */}

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          {/* SEARCH */}
          <div className="relative w-full lg:max-w-md">

            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              placeholder="Search train number or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-300 focus:bg-white focus:ring-2 focus:ring-red-100"
            />

          </div>

          {/* FILTERS */}
          <div className="flex flex-wrap gap-2">

            <button
              type="button"
              onClick={() => setFilter('ALL')}
              className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition ${
                filter === 'ALL'
                  ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              All Trains
            </button>

            <button
              type="button"
              onClick={() => setFilter('ON_TIME')}
              className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition ${
                filter === 'ON_TIME'
                  ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-emerald-50'
              }`}
            >
              On Time
            </button>

            <button
              type="button"
              onClick={() => setFilter('DELAYED')}
              className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition ${
                filter === 'DELAYED'
                  ? 'border-amber-500 bg-amber-500 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-amber-200 hover:bg-amber-50'
              }`}
            >
              Delayed
            </button>

            <button
              type="button"
              onClick={() => setFilter('CRITICAL')}
              className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition ${
                filter === 'CRITICAL'
                  ? 'border-red-600 bg-red-600 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-red-200 hover:bg-red-50'
              }`}
            >
              Critical
            </button>

          </div>

        </div>
      </div>


      {/* ========================================================= */}
      {/* LOADING / EMPTY / TRAIN GRID */}
      {/* ========================================================= */}

      {loading ? (

        <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">

          <div className="flex flex-col items-center gap-3">

            <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-red-600" />

            <p className="text-sm text-slate-500">
              Loading active trains...
            </p>

          </div>

        </div>

      ) : filteredTrains.length === 0 ? (

        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">

          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
            <Train className="h-7 w-7 text-slate-400" />
          </div>

          <h3 className="mt-4 text-lg font-semibold text-slate-900">
            No trains found
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Try changing your search or status filter.
          </p>

          <button
            type="button"
            onClick={() => {
              setSearch('');
              setFilter('ALL');
            }}
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Clear Filters
          </button>

        </div>

      ) : (

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">

          {filteredTrains.map((train) => {

            const pos = positions[train.train_id];

            if (!pos) return null;

            const status = getStatusStyles(pos.status);

            return (
              <div
                key={train.train_id}
                onClick={() =>
                  navigate(`/trains/${train.train_id}`)
                }
                className="group cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-red-200 hover:shadow-md"
              >

                {/* ================================================= */}
                {/* CARD HEADER */}
                {/* ================================================= */}

                <div className="p-5">

                  <div className="flex items-start justify-between gap-4">

                    <div className="min-w-0">

                      <div className="flex items-center gap-2">

                        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                          {train.train_number}
                        </span>

                        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>

                      </div>

                      <h3 className="mt-3 truncate text-lg font-bold text-slate-900 transition-colors group-hover:text-red-700">
                        {train.train_name}
                      </h3>

                    </div>

                    <span
                      className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${status.badge}`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${status.dot}`}
                      />
                      {status.label}
                    </span>

                  </div>


                  {/* ROUTE */}
                  <div className="mt-5 rounded-lg border border-slate-100 bg-slate-50/70 p-4">

                    <div className="flex items-center gap-4">

                      <div className="min-w-0 flex-1">

                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          From
                        </p>

                        <p className="mt-1 truncate text-sm font-semibold text-slate-800">
                          {train.source}
                        </p>

                      </div>

                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white border border-slate-200">
                        <ArrowRight className="h-4 w-4 text-red-500" />
                      </div>

                      <div className="min-w-0 flex-1 text-right">

                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          To
                        </p>

                        <p className="mt-1 truncate text-sm font-semibold text-slate-800">
                          {train.destination}
                        </p>

                      </div>

                    </div>

                  </div>

                </div>


                {/* ================================================= */}
                {/* TELEMETRY */}
                {/* ================================================= */}

                <div className="grid grid-cols-2 border-t border-slate-100">

                  {/* SPEED */}
                  <div className="border-r border-slate-100 p-5">

                    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">

                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50">
                        <Navigation className="h-3.5 w-3.5 text-blue-600" />
                      </div>

                      Speed

                    </div>

                    <div className="mt-3 text-xl font-bold text-slate-900">
                      {Number(pos.speed_kmph).toFixed(1)}
                      <span className="ml-1 text-sm font-medium text-slate-400">
                        km/h
                      </span>
                    </div>

                  </div>


                  {/* DELAY */}
                  <div className="p-5">

                    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">

                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-50">
                        <Clock className="h-3.5 w-3.5 text-amber-600" />
                      </div>

                      Delay

                    </div>

                    <div
                      className={`mt-3 text-xl font-bold ${
                        pos.delay_minutes > 15
                          ? 'text-red-600'
                          : pos.delay_minutes > 0
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                      }`}
                    >
                      {pos.delay_minutes > 0
                        ? `${pos.delay_minutes} min`
                        : 'On Time'}
                    </div>

                  </div>

                </div>


                {/* ================================================= */}
                {/* NEXT STATION */}
                {/* ================================================= */}

                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-4">

                  <div className="flex min-w-0 items-center gap-3">

                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50">
                      <MapPin className="h-4 w-4 text-red-600" />
                    </div>

                    <div className="min-w-0">

                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Next Station
                      </p>

                      <p className="mt-0.5 truncate text-sm font-semibold text-slate-700">
                        {pos.next_station}
                      </p>

                    </div>

                  </div>

                  <span className="ml-3 shrink-0 text-xs font-semibold text-slate-400 transition-colors group-hover:text-red-600">
                    View details →
                  </span>

                </div>

              </div>
            );
          })}

        </div>
      )}

    </div>
  );
};

export default LiveTrains;