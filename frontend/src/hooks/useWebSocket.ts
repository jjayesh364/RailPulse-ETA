import { useEffect, useState } from 'react';
import { wsService } from '../services/websocket';

export function useWebSocket() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    wsService.connect();
    // A simple hack to check connection status since our WebSocketService doesn't expose it cleanly yet
    // In a real app we'd add an onConnect/onDisconnect emitter
    setConnected(true);

    return () => {
      // We don't disconnect globally because other components might be using it,
      // but we could if this was the root app hook.
    };
  }, []);

  return { connected };
}
