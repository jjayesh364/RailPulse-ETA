import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Navigation, Map, AlertTriangle } from 'lucide-react';
import { Train, TrainPosition, ETAPrediction, RouteStop } from '../types';
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
      api.getTrainHistory(trainId).catch(() => [])
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

    return () => { mounted = false; };
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

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full border-4 border-slate-600 border-t-indigo-500 animate-spin"></div></div>;
  }

  if (!train) {
    return <div className="text-center py-20 text-slate-400">Train not found</div>;
  }

  const nextStationEta = eta.length > 0 ? eta[0] : null;

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/trains" className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{train.train_number} - {train.train_name}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {train.data_source || 'Real Train Master'}
            </span>
            {position && (
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                position.status === 'ON_TIME' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                position.status === 'DELAYED' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                'bg-red-500/10 text-red-500 border border-red-500/20'
              }`}>
                {position.status.replace('_', ' ')}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-slate-400 text-sm mt-1">
            <span className="flex items-center gap-1.5"><Map className="w-4 h-4" /> {train.source} to {train.destination}</span>
            <span>•</span>
            <span className="text-amber-400 text-xs flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
              Telemetry: Simulated GPS
            </span>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="text-xs text-slate-500 mb-1">Current Speed</div>
          <div className="text-xl font-bold text-white flex items-baseline gap-1">
            {position?.speed_kmph || 0} <span className="text-sm font-normal text-slate-400">km/h</span>
          </div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="text-xs text-slate-500 mb-1">Current Delay</div>
          <div className={`text-xl font-bold flex items-baseline gap-1 ${position?.delay_minutes ? (position.delay_minutes > 15 ? 'text-red-400' : 'text-amber-400') : 'text-emerald-400'}`}>
            {position?.delay_minutes || 0} <span className="text-sm font-normal opacity-70">min</span>
          </div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="text-xs text-slate-500 mb-1">Distance Covered</div>
          <div className="text-xl font-bold text-white flex items-baseline gap-1">
            {position?.distance_covered_km || 0} <span className="text-sm font-normal text-slate-400">/ {train.total_distance_km} km</span>
          </div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="text-xs text-slate-500 mb-1">Journey Progress</div>
          <div className="text-xl font-bold text-white mb-2">{Math.round(position?.journey_progress || 0)}%</div>
          <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500" style={{ width: `${position?.journey_progress || 0}%` }}></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Route */}
        <div className="lg:col-span-1 bg-slate-800 border border-slate-700 rounded-lg p-6 max-h-[800px] overflow-y-auto">
          <h3 className="font-semibold text-white mb-4 sticky top-0 bg-slate-800 z-10 pb-2">Route & Progress</h3>
          <RouteTimeline route={route} currentStationCode={position?.next_station} />
        </div>

        {/* Right Column - ETA Details */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <ETAPanel prediction={nextStationEta} lastUpdated={lastUpdated} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Prediction Factors
              </h3>
              <PredictionFactors factors={nextStationEta?.factors || []} />
            </div>
            
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <Navigation className="w-4 h-4 text-indigo-400" />
                ETA History
              </h3>
              <ETAHistoryChart data={history} />
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-slate-700 bg-slate-800/80 flex justify-between items-center">
              <h3 className="font-semibold text-white">Upcoming Stations ETA</h3>
            </div>
            <ETATable predictions={eta} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainDetails;
