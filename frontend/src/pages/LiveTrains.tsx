import { useState } from 'react';
import { useTrains } from '../hooks/useTrains';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Clock, Navigation } from 'lucide-react';

const LiveTrains = () => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const { trains, positions, loading } = useTrains();
  const navigate = useNavigate();

  const filteredTrains = trains.filter(t => {
    const p = positions[t.train_id];
    // Strictly display active simulated trains only
    if (!p || p.is_simulated !== true) return false;

    const matchSearch = t.train_number.includes(search) || t.train_name.toLowerCase().includes(search.toLowerCase());
    
    let matchFilter = true;
    if (filter === 'ON_TIME') {
      matchFilter = p.status === 'On Time' || p.status === 'ON_TIME';
    } else if (filter === 'DELAYED') {
      matchFilter = p.status === 'Delayed' || p.status === 'Slight Delay' || p.status === 'DELAYED';
    } else if (filter === 'CRITICAL') {
      matchFilter = p.status === 'Critical Delay' || p.status === 'CRITICAL';
    }

    return matchSearch && matchFilter;
  });

  return (
    <div className="flex flex-col gap-6 pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Live Trains</h1>
          <p className="text-slate-400">Real-time tracking of active simulated trains ({filteredTrains.length} active)</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search train..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white pl-10 pr-4 py-2 rounded-lg w-full sm:w-64 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          
          <select 
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Status</option>
            <option value="ON_TIME">On Time</option>
            <option value="DELAYED">Delayed</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 rounded-full border-4 border-slate-600 border-t-indigo-500 animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTrains.map(train => {
            const pos = positions[train.train_id];
            return (
              <div 
                key={train.train_id}
                onClick={() => navigate(`/trains/${train.train_id}`)}
                className="bg-slate-800 border border-slate-700 rounded-lg p-5 hover:border-indigo-500/50 hover:bg-slate-800/80 cursor-pointer transition-all group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-white group-hover:text-indigo-400 transition-colors">
                      {train.train_number} {train.train_name}
                    </h3>
                    <div className="text-sm text-slate-400 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {train.source} &rarr; {train.destination}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                        {train.data_source?.includes("Real") ? "REAL MASTER DATA" : "DEMO RUNNER"}
                      </span>
                    </div>
                  </div>
                  {pos && (
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      pos.status === 'ON_TIME' || pos.status === 'On Time' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                      pos.status === 'CRITICAL' || pos.status === 'Critical Delay' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                      'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                    }`}>
                      {pos.status.replace('_', ' ')}
                    </span>
                  )}
                </div>

                {pos ? (
                  <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-700">
                    <div>
                      <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                        <Navigation className="w-3 h-3" /> Speed
                      </div>
                      <div className="font-medium text-slate-200">{pos.speed_kmph} km/h</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Delay
                      </div>
                      <div className={`font-medium ${pos.delay_minutes > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {pos.delay_minutes > 0 ? `${pos.delay_minutes} min` : 'On Time'}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-xs text-slate-500 mb-1">Next Station</div>
                      <div className="font-medium text-slate-200 truncate">{pos.next_station}</div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 pt-4 border-t border-slate-700 text-sm text-slate-500 italic">
                    Location data unavailable
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LiveTrains;
