import { useEffect, useState } from 'react';
import * as api from '../services/api';
import { CongestionSection } from '../types';

const Network = () => {
  const [sections, setSections] = useState<CongestionSection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCongestion()
      .then(res => setSections(res))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-white">Network Congestion</h1>
        <p className="text-slate-400">Live monitoring of track sections and bottlenecks</p>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-500">Loading network data...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-400 uppercase bg-slate-900/50">
                <tr>
                  <th className="px-6 py-4 font-medium">Section</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Congestion Score</th>
                  <th className="px-6 py-4 font-medium">Active Trains</th>
                  <th className="px-6 py-4 font-medium">Avg Speed</th>
                </tr>
              </thead>
              <tbody>
                {sections.sort((a, b) => b.congestion_score - a.congestion_score).map((sec) => (
                  <tr key={sec.section_id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="px-6 py-4 font-medium text-white">
                      {sec.from_station} &rarr; {sec.to_station}
                      <div className="text-xs text-slate-500 mt-1">{sec.section_id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        sec.status === 'severe' ? 'bg-red-500/20 text-red-400' :
                        sec.status === 'congested' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {sec.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${sec.congestion_score > 75 ? 'bg-red-500' : sec.congestion_score > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                            style={{ width: `${sec.congestion_score}%` }}
                          ></div>
                        </div>
                        <span className="font-mono text-slate-300">{sec.congestion_score}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-300">{sec.active_trains}</td>
                    <td className="px-6 py-4 font-medium text-slate-300">{sec.avg_speed_kmph} km/h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Network;
