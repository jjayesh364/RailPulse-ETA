import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import { TrainPosition, Train } from '../../types';

interface TrainMapProps {
  positions: { [id: string]: TrainPosition };
  trains: Train[];
}

const getMarkerIcon = (status: string) => {
  const s = (status || '').toLowerCase();
  let color = '#10b981'; // emerald-500 ON_TIME
  if (s.includes('slight') || s === 'delayed') color = '#f59e0b'; // amber-500
  if (s.includes('critical')) color = '#ef4444'; // red-500
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="24" height="24" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="4" fill="white"></circle></svg>`;
  
  return L.divIcon({
    html: svg,
    className: 'bg-transparent border-none',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

const TrainMap = ({ positions, trains }: TrainMapProps) => {
  const navigate = useNavigate();

  return (
    <div className="w-full h-full rounded-lg overflow-hidden border border-slate-700 relative z-0">
      <MapContainer center={[22.5, 82.0]} zoom={5} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
          maxZoom={19}
        />
        {Object.values(positions).map((pos) => {
          if (pos.is_simulated === false) return null;
          const train = trains.find(t => t.train_id === pos.train_id);
          if (!train || !pos.latitude || !pos.longitude) return null;
          
          const s = (pos.status || '').toLowerCase();
          const statusClass = s.includes('critical') ? 'text-red-400 font-bold' : (s.includes('delay') ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold');

          return (
            <Marker 
              key={pos.train_id} 
              position={[pos.latitude, pos.longitude]} 
              icon={getMarkerIcon(pos.status)}
            >
              <Popup className="bg-slate-800 text-slate-200 border-none rounded shadow-lg">
                <div className="p-1 min-w-[200px]">
                  <h4 className="font-bold text-lg text-white mb-1">{train.train_number} - {train.train_name}</h4>
                  <div className="text-sm grid gap-1 mb-3 text-slate-300">
                    <p>Status: <span className={statusClass}>{pos.status}</span></p>
                    <p>Delay: {pos.delay_minutes} min</p>
                    <p>Speed: {pos.speed_kmph} km/h</p>
                    <p>Next: {pos.next_station}</p>
                  </div>
                  <button 
                    onClick={() => navigate(`/trains/${train.train_id}`)}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs py-1.5 rounded transition-colors"
                  >
                    View Details
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default TrainMap;
