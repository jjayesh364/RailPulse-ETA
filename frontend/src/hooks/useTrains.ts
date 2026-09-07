import { useState, useEffect } from 'react';
import { Train, TrainPosition } from '../types';
import * as api from '../services/api';
import { wsService } from '../services/websocket';

export function useTrains(search?: string) {
  const [trains, setTrains] = useState<Train[]>([]);
  const [positions, setPositions] = useState<{ [id: string]: TrainPosition }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api.getTrains(search).then(data => {
      if (mounted) {
        setTrains(data);
        setLoading(false);
        // Fetch initial positions
        data.forEach(t => {
          api.getTrainPosition(t.train_id).then(pos => {
            if (mounted) setPositions(prev => ({ ...prev, [t.train_id]: pos }));
          }).catch(() => {});
        });
      }
    }).catch(() => {
      if (mounted) setLoading(false);
    });

    return () => { mounted = false; };
  }, [search]);

  useEffect(() => {
    wsService.connect();
    const unsub = wsService.onTrainUpdate((data) => {
      const pos = data.position as TrainPosition;
      if (pos) {
        setPositions(prev => ({ ...prev, [pos.train_id]: pos }));
      }
    });

    return () => {
      unsub();
    };
  }, []);

  return { trains, positions, loading };
}
