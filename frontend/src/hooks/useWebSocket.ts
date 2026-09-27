import { useEffect, useState } from 'react';
import { wsService } from '../services/websocket';

export function useWebSocket() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Track real WebSocket open/close events for accurate status display
    const handleOpen = () => setConnected(true);
    const handleClose = () => setConnected(false);
    const handleError = () => setConnected(false);

    wsService.onOpen(handleOpen);
    wsService.onClose(handleClose);
    wsService.onError(handleError);

    wsService.connect();

    return () => {
      wsService.offOpen(handleOpen);
      wsService.offClose(handleClose);
      wsService.offError(handleError);
    };
  }, []);

  return { connected };
}
