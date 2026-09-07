import { useState, useEffect } from 'react';
import { Search, Train, Clock, MapPin, Map, Info, ChevronRight } from 'lucide-react';
import * as api from '../services/api';
import { wsService } from '../services/websocket';
import { ETAPrediction } from '../types';

const PassengerView = () => {
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [selectedTrain, setSelectedTrain] = useState<any>(null);
  const [eta, setEta] = useState<ETAPrediction[]>([]);
  const [route, setRoute] = useState<any[]>([]);
  const [lastUpdate, setLastUpdate] = useState(0); // seconds ago

  // Search for train across Real and Demo databases
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!search) return;
    setSearching(true);
    
    try {
      const trains = await api.getTrains(search);
      if (trains.length > 0) {
        const train = trains[0];
        const [position, etas, trainRoute] = await Promise.all([
          api.getTrainPosition(train.train_id).catch(() => null),
          api.getTrainETA(train.train_id).catch(() => []),
          api.getTrainRoute(train.train_id).catch(() => []),
        ]);
        
        setSelectedTrain({ ...train, position });
        setEta(etas);
        setRoute(trainRoute);
        setLastUpdate(0);
      } else {
        setSelectedTrain(null);
      }
    } catch (e) {
      console.error(e);
    }
    setSearching(false);
  };

  useEffect(() => {
    if (!selectedTrain) return;
    const unsub = wsService.onETAUpdate((data) => {
      if (data.train_id === selectedTrain.train_id) {
        setEta(data.predictions);
        setLastUpdate(0);
      }
    });
    return () => unsub();
  }, [selectedTrain]);

  useEffect(() => {
    if (!selectedTrain) return;
    const interval = setInterval(() => setLastUpdate(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [selectedTrain]);

  const nextStation = eta.length > 0 ? eta[0] : (route.length > 0 ? route[0] : null);
  const finalStation = eta.length > 0 ? eta[eta.length - 1] : (route.length > 0 ? route[route.length - 1] : null);

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '--:--';
    if (timeStr.includes(':') && timeStr.length <= 5) return timeStr;
    try {
      const d = new Date(timeStr);
      if (isNaN(d.getTime())) return timeStr;
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return timeStr;
    }
  };

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-4rem)] -mx-4 -my-6 sm:mx-0 sm:my-0 sm:rounded-xl text-slate-900 p-4 sm:p-8 flex flex-col items-center">
      <div className="w-full max-w-2xl mb-8">
        <h1 className="text-3xl font-bold text-center text-indigo-900 mb-2">Track Your Train</h1>
        <p className="text-center text-slate-500 mb-8">Real Indian Railways Timetable with AI-Powered Dynamic ETA</p>
        
        <form onSubmit={handleSearch} className="relative shadow-xl shadow-indigo-100 rounded-full">
          <input 
            type="text" 
            placeholder="Enter Train Number (e.g., 20491, 12951) or Name..." 
            className="w-full pl-6 pr-16 py-4 rounded-full text-lg border-2 border-indigo-100 focus:border-indigo-500 focus:ring-0 outline-none transition-colors"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button 
            type="submit" 
            disabled={searching}
            className="absolute right-2 top-2 bottom-2 bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-full transition-colors flex items-center justify-center"
          >
            {searching ? <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin"></div> : <Search className="w-5 h-5" />}
          </button>
        </form>
        <div className="flex justify-center gap-2 mt-3 text-xs text-slate-400">
          <span>Quick try:</span>
          <button type="button" onClick={() => setSearch('20491')} className="underline hover:text-indigo-600 font-semibold">20491 (Jaisalmer SF)</button>
          <span>•</span>
          <button type="button" onClick={() => setSearch('12951')} className="underline hover:text-indigo-600 font-semibold">12951 (Mumbai Rajdhani)</button>
          <span>•</span>
          <button type="button" onClick={() => setSearch('22436')} className="underline hover:text-indigo-600 font-semibold">22436 (Vande Bharat)</button>
        </div>
      </div>

      {selectedTrain && (
        <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
            {/* Header */}
            <div className="bg-indigo-900 text-white p-6 relative overflow-hidden">
              <div className="absolute right-0 top-0 opacity-10">
                <Train className="w-48 h-48 -mt-8 -mr-8" />
              </div>
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold tracking-wider inline-block">
                        {selectedTrain.train_number}
                      </span>
                      <span className="bg-indigo-700/80 text-indigo-100 text-xs px-2.5 py-0.5 rounded-full font-medium">
                        {selectedTrain.train_type || 'Superfast'}
                      </span>
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs px-2 py-0.5 rounded-full font-semibold">
                        REAL TRAIN DATA
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold">{selectedTrain.train_name}</h2>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                    nextStation?.predicted_delay_minutes > 15 ? 'bg-red-500' :
                    nextStation?.predicted_delay_minutes > 0 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}>
                    {nextStation?.predicted_delay_minutes > 0 ? `${nextStation.predicted_delay_minutes} min late` : 'On Time'}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-indigo-200 text-sm font-medium">
                  <div className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {selectedTrain.source}</div>
                  <ChevronRight className="w-4 h-4" />
                  <div className="flex items-center gap-1"><Map className="w-4 h-4" /> {selectedTrain.destination}</div>
                </div>
                <div className="mt-3 pt-3 border-t border-indigo-800/60 flex flex-wrap items-center gap-3 text-xs text-indigo-200">
                  <span>Runs: <strong>{selectedTrain.days_of_run || 'Daily'}</strong></span>
                  <span>•</span>
                  <span>Distance: <strong>{selectedTrain.total_distance_km} km</strong></span>
                  <span>•</span>
                  <span>Stops: <strong>{route.length} Stations</strong></span>
                </div>
              </div>
            </div>

            {/* Telemetry & Transparency Notice */}
            <div className="bg-amber-50 border-b border-amber-100 px-6 py-2.5 flex items-center justify-between text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                <span><strong>Telemetry:</strong> <span className="uppercase tracking-wider font-semibold">Simulated</span> (No Authorized Live Railway GPS Feed)</span>
              </div>
              <div className="font-semibold text-indigo-700">
                ETA: <span className="underline">AI Forecast</span>
              </div>
            </div>

            {/* Main ETA Card */}
            {nextStation && (
              <div className="p-6 md:p-8 border-b border-slate-100">
                <div className="text-center mb-8">
                  <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Next Stop</div>
                  <h3 className="text-4xl font-bold text-slate-800 mb-2">{nextStation.station_name}</h3>
                  
                  <div className="flex justify-center items-end gap-4 mt-6">
                    <div className="text-right">
                      <div className="text-xs text-slate-400 mb-1">Scheduled</div>
                      <div className="text-xl text-slate-400 line-through">
                        {formatTime(nextStation.scheduled_arrival || nextStation.arrival)}
                      </div>
                    </div>
                    <div className="pb-1 text-slate-300">
                      <ChevronRight className="w-8 h-8" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div> AI Predicted
                      </div>
                      <div className="text-5xl font-black text-indigo-900 tracking-tighter">
                        {formatTime(nextStation.predicted_arrival || nextStation.arrival)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Destination ETA preview */}
                {finalStation && finalStation !== nextStation && (
                  <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-500 font-medium">Destination Arrival ({finalStation.station_name})</div>
                      <div className="text-sm font-bold text-slate-700">Scheduled: {formatTime(finalStation.scheduled_arrival || finalStation.arrival)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-indigo-600 font-bold uppercase tracking-wider">AI Forecast</div>
                      <div className="text-xl font-extrabold text-indigo-900">{formatTime(finalStation.predicted_arrival || finalStation.arrival)}</div>
                    </div>
                  </div>
                )}

                {/* Progress */}
                <div className="relative pt-6">
                  <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
                    <span>{selectedTrain.source}</span>
                    <span>{selectedTrain.destination}</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden relative">
                    <div 
                      className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full transition-all duration-1000"
                      style={{ width: `${selectedTrain.position?.journey_progress || 15}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            {/* Route Stops Accordion / List */}
            {route.length > 0 && (
              <div className="p-6 border-b border-slate-100">
                <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-4 flex items-center justify-between">
                  <span>Full Route Timetable ({route.length} Stops)</span>
                  <span className="text-xs font-normal text-slate-500">Source: {selectedTrain.data_source || 'Real Train Master'}</span>
                </h4>
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 text-sm pr-1">
                  {route.map((st, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between hover:bg-slate-50 px-2 rounded">
                      <div className="flex items-center gap-3">
                        <span className="w-5 text-center text-xs font-bold text-slate-400">{st.stop_number || idx + 1}</span>
                        <div>
                          <div className="font-semibold text-slate-800">{st.station_name} <span className="text-xs text-slate-400 font-mono">({st.station_code})</span></div>
                          <div className="text-xs text-slate-400">Day {st.day || 1} • {st.distance_from_source !== null && st.distance_from_source !== undefined ? `${st.distance_from_source} km` : (st.distance !== null && st.distance !== undefined ? `${st.distance} km` : '—')}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-slate-700 font-medium">Arr: {formatTime(st.arrival)} | Dep: {formatTime(st.departure)}</div>
                        {st.halt_minutes ? <div className="text-xs text-indigo-600 font-semibold">{st.halt_minutes} min halt</div> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Reasoning */}
            {nextStation && nextStation.predicted_delay_minutes > 0 && nextStation.factors?.[0] && (
              <div className="bg-indigo-50/50 p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-indigo-100 text-indigo-600 p-2 rounded-full shrink-0">
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 mb-1">Why is my ETA different from the schedule?</h4>
                    <p className="text-sm text-slate-600">
                      Our AI model has analyzed the network and predicted a {nextStation.predicted_delay_minutes} minute delay 
                      primarily due to <span className="font-semibold text-indigo-700">{nextStation.factors[0].factor_name.toLowerCase()}</span>.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-slate-50 p-4 text-center text-xs text-slate-400 border-t border-slate-100 flex items-center justify-center gap-2">
              <Clock className="w-3 h-3" /> Timetable refreshed from Real Railway Master. Telemetry simulated for SIH demo.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PassengerView;
