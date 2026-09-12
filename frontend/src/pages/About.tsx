import {
  AlertTriangle,
  Brain,
  Database,
  Radio,
  ShieldCheck,
  Train,
  Zap,
} from 'lucide-react';

const About = () => {
  return (
    <div className="flex flex-col gap-8 pb-12">

      {/* PAGE HEADER */}
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-700">
            Platform Overview
          </p>

          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              RailPulse ETA
            </h1>

            <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
              SIH 2026
            </span>
          </div>

          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            AI-powered dynamic forecasting of Expected Time of Arrival for
            coaching trains.
          </p>
        </div>
      </div>

      {/* HERO */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_0.6fr]">

          <div className="p-7 lg:p-9">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50">
              <Train className="h-6 w-6 text-red-600" />
            </div>

            <h2 className="max-w-2xl text-2xl font-bold tracking-tight text-slate-900">
              Turning static train schedules into dynamic ETA intelligence.
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
              RailPulse ETA continuously evaluates the current train state and
              operational conditions to forecast expected arrival times more
              dynamically than traditional timetable-based estimation.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                Dynamic ETA
              </span>

              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                ML Forecasting
              </span>

              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                Operational Intelligence
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center border-t border-slate-100 bg-slate-50 p-8 lg:border-l lg:border-t-0">
            <div className="text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-red-600 shadow-sm">
                <Train className="h-10 w-10 text-white" />
              </div>

              <p className="mt-4 text-sm font-semibold text-slate-900">
                Smart India Hackathon 2026
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Problem Statement 26028
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* THE PROBLEM */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
              The Problem
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-900">
              Why traditional ETA estimation falls short
            </h2>

            <p className="mt-3 text-sm leading-7 text-slate-600">
              Traditional ETA systems often rely heavily on scheduled timings
              and simple propagation of current delays. This can produce
              sudden changes in predicted arrival times and does not adequately
              represent the changing conditions of a railway network.
            </p>

            <p className="mt-3 text-sm leading-7 text-slate-600">
              Factors such as downstream congestion, preceding train delays,
              speed restrictions, weather conditions and operational events can
              influence how a train progresses through its remaining route.
            </p>
          </div>
        </div>
      </section>

      {/* SOLUTION */}
      <section>
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-red-700">
            How RailPulse Works
          </p>

          <h2 className="mt-1 text-xl font-bold text-slate-900">
            From train state to dynamic ETA
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            The system combines operational information with machine learning
            to continuously update forecasts.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

          {/* STEP 1 */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
                <Database className="h-5 w-5 text-blue-600" />
              </div>

              <span className="text-xs font-bold text-slate-300">
                01
              </span>
            </div>

            <h3 className="mt-5 text-base font-bold text-slate-900">
              Data & State
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              RailPulse evaluates train position, speed, current delay,
              remaining distance, historical patterns and operational
              conditions.
            </p>
          </div>

          {/* STEP 2 */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50">
                <Brain className="h-5 w-5 text-violet-600" />
              </div>

              <span className="text-xs font-bold text-slate-300">
                02
              </span>
            </div>

            <h3 className="mt-5 text-base font-bold text-slate-900">
              ML Inference
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              The prediction pipeline estimates additional expected delay
              using dynamic operational features and historical patterns.
            </p>
          </div>

          {/* STEP 3 */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
                <Radio className="h-5 w-5 text-emerald-600" />
              </div>

              <span className="text-xs font-bold text-slate-300">
                03
              </span>
            </div>

            <h3 className="mt-5 text-base font-bold text-slate-900">
              Continuous Updates
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Updated predictions can be delivered to operational dashboards
              and passenger-facing interfaces through the application API and
              live update channel.
            </p>
          </div>

        </div>
      </section>

      {/* KEY CAPABILITIES */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-red-700">
            Core Capabilities
          </p>

          <h2 className="mt-1 text-xl font-bold text-slate-900">
            Built for operational decision-making
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-lg bg-slate-50 p-4">
            <Zap className="h-5 w-5 text-red-600" />

            <h3 className="mt-3 text-sm font-bold text-slate-900">
              Dynamic ETA
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Forecasts can adapt when operational conditions change.
            </p>
          </div>

          <div className="rounded-lg bg-slate-50 p-4">
            <Brain className="h-5 w-5 text-violet-600" />

            <h3 className="mt-3 text-sm font-bold text-slate-900">
              ML Prediction
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Machine learning estimates additional expected delay.
            </p>
          </div>

          <div className="rounded-lg bg-slate-50 p-4">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />

            <h3 className="mt-3 text-sm font-bold text-slate-900">
              Operational Alerts
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Important changes can be surfaced for operational attention.
            </p>
          </div>

          <div className="rounded-lg bg-slate-50 p-4">
            <Train className="h-5 w-5 text-blue-600" />

            <h3 className="mt-3 text-sm font-bold text-slate-900">
              Network View
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Monitor trains and congestion across the simulated network.
            </p>
          </div>

        </div>
      </section>

      {/* PROTOTYPE STATUS */}
      <section className="rounded-xl border border-amber-200 bg-amber-50/50 p-6">

        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white">
            <Radio className="h-5 w-5 text-amber-600" />
          </div>

          <div>
            <h2 className="text-base font-bold text-slate-900">
              Prototype Data Mode
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              RailPulse is designed to integrate real-time railway telemetry.
              In the current prototype, GPS/telemetry is simulated because an
              authorized live Indian Railways feed is not available.
            </p>
          </div>
        </div>

      </section>

      {/* FOOTER */}
      <div className="border-t border-slate-200 pt-6 text-center">
        <p className="text-xs text-slate-400">
          RailPulse ETA · Smart India Hackathon 2026 · Problem Statement 26028
        </p>
      </div>

    </div>
  );
};

export default About;