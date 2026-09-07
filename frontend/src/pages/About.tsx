const About = () => {
  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">RailPulse ETA</h1>
        <p className="text-xl text-slate-400">Dynamic Forecast of Expected Time of Arrival</p>
        <div className="mt-6 inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-400 px-4 py-2 rounded-full border border-indigo-500/30 font-semibold tracking-wider text-sm">
          SMART INDIA HACKATHON 2026
        </div>
      </div>

      <div className="space-y-12 text-slate-300">
        <section className="bg-slate-800 rounded-xl p-8 border border-slate-700 shadow-lg">
          <h2 className="text-2xl font-bold text-white mb-4 text-indigo-400">The Problem</h2>
          <p className="leading-relaxed mb-4">
            Current railway ETA systems heavily rely on static schedules and simple linear extrapolations of current delays. 
            This results in "ETA jumps" where the estimated arrival time suddenly increases as a train gets closer, 
            frustrating passengers and reducing operational efficiency for control rooms.
          </p>
          <p className="leading-relaxed">
            These legacy systems fail to account for complex network dynamics like downstream congestion, 
            cascading delays from preceding trains, speed restrictions, and weather conditions.
          </p>
        </section>

        <section className="bg-slate-800 rounded-xl p-8 border border-slate-700 shadow-lg">
          <h2 className="text-2xl font-bold text-white mb-6 text-emerald-400">Our Solution</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-slate-900/50 p-5 rounded-lg border border-slate-700/50">
              <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400 font-bold mb-3">1</div>
              <h3 className="font-bold text-white mb-2">Data Fusion</h3>
              <p className="text-sm">RailPulse is designed to integrate real-time railway telemetry. In the current prototype, GPS/telemetry is simulated because an authorized live Indian Railways feed is not available.</p>
            </div>
            <div className="bg-slate-900/50 p-5 rounded-lg border border-slate-700/50">
              <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400 font-bold mb-3">2</div>
              <h3 className="font-bold text-white mb-2">ML Inference</h3>
              <p className="text-sm">Our AI models predict the delay at every upcoming station by analyzing historical patterns and current bottlenecks.</p>
            </div>
            <div className="bg-slate-900/50 p-5 rounded-lg border border-slate-700/50">
              <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400 font-bold mb-3">3</div>
              <h3 className="font-bold text-white mb-2">Live Updates</h3>
              <p className="text-sm">Results are streamed instantly via WebSockets to passenger apps and control room dashboards.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default About;
