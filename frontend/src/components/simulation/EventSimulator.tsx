import { useState } from 'react';
import { AlertTriangle, X, Play } from 'lucide-react';
import * as api from '../../services/api';

const EVENT_TYPES = [
  'Signal Congestion',
  'Speed Restriction',
  'Unscheduled Halt',
  'Track Maintenance',
  'Heavy Rain',
  'Station Overcrowding',
  'Preceding Train Delay',
  'Level Crossing Delay'
];

interface EventSimulatorProps {
  onClose?: () => void;
  trainId?: string;
}

const EventSimulator = ({ onClose, trainId = '' }: EventSimulatorProps) => {
  const [eventType, setEventType] = useState(EVENT_TYPES[0]);
  const [targetTrain, setTargetTrain] = useState(trainId);
  const [location, setLocation] = useState('');
  const [severity, setSeverity] = useState(0.5);
  const [duration, setDuration] = useState(30);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.injectEvent({
        event_type: eventType.toLowerCase().replace(/ /g, '_'),
        train_id: targetTrain,
        location,
        severity,
        duration_minutes: duration,
        description
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        if (onClose) onClose();
      }, 2000);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md w-full shadow-xl">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          Inject Operational Event
        </h3>
        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {success ? (
        <div className="bg-emerald-500/20 text-emerald-400 p-4 rounded-md text-center font-medium border border-emerald-500/30">
          Event successfully injected into simulation. ETA models are recalculating...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Event Type</label>
            <select 
              value={eventType} 
              onChange={e => setEventType(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white outline-none focus:border-indigo-500"
            >
              {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Target Train ID</label>
              <input 
                type="text" 
                value={targetTrain} 
                onChange={e => setTargetTrain(e.target.value)}
                placeholder="e.g. 12004"
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Location</label>
              <input 
                type="text" 
                value={location} 
                onChange={e => setLocation(e.target.value)}
                placeholder="Station Code"
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white outline-none focus:border-indigo-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1 flex justify-between">
              Severity <span>{Math.round(severity * 100)}%</span>
            </label>
            <input 
              type="range" 
              min="0.1" max="1" step="0.1"
              value={severity} 
              onChange={e => setSeverity(parseFloat(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Duration Impact (Minutes)</label>
            <input 
              type="number" 
              value={duration} 
              onChange={e => setDuration(parseInt(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
            <textarea 
              value={description} 
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white outline-none focus:border-indigo-500 h-20 resize-none"
              placeholder="Provide details about the incident..."
            ></textarea>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 rounded flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {loading ? <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin"></div> : <Play className="w-5 h-5" />}
            Apply Event
          </button>
        </form>
      )}
    </div>
  );
};

export default EventSimulator;
