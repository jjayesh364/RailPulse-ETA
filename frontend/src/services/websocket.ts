type Callback = (data: any) => void;
type VoidCallback = () => void;

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const defaultWsUrl = apiUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:').replace(/\/api\/?$/, '/ws/live');

class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string = import.meta.env.VITE_WS_URL || defaultWsUrl;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private callbacks: { [key: string]: Callback[] } = {
    train_update: [],
    eta_update: [],
    alert: [],
    congestion_update: [],
  };

  // Connection lifecycle listeners
  private openListeners: VoidCallback[] = [];
  private closeListeners: VoidCallback[] = [];
  private errorListeners: VoidCallback[] = [];

  onOpen(cb: VoidCallback) { this.openListeners.push(cb); }
  onClose(cb: VoidCallback) { this.closeListeners.push(cb); }
  onError(cb: VoidCallback) { this.errorListeners.push(cb); }

  offOpen(cb: VoidCallback) { this.openListeners = this.openListeners.filter(f => f !== cb); }
  offClose(cb: VoidCallback) { this.closeListeners = this.closeListeners.filter(f => f !== cb); }
  offError(cb: VoidCallback) { this.errorListeners = this.errorListeners.filter(f => f !== cb); }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.openListeners.forEach(cb => cb());
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const { type } = data;
        if (this.callbacks[type]) {
          this.callbacks[type].forEach(cb => cb(data));
        }
      } catch (err) {
        console.error('Failed to parse websocket message', err);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.closeListeners.forEach(cb => cb());
      this.reconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.errorListeners.forEach(cb => cb());
    };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => this.connect(), 2000 * this.reconnectAttempts);
    }
  }

  subscribe(type: string, callback: Callback) {
    if (!this.callbacks[type]) {
      this.callbacks[type] = [];
    }
    this.callbacks[type].push(callback);
    return () => {
      this.callbacks[type] = this.callbacks[type].filter(cb => cb !== callback);
    };
  }

  onTrainUpdate(callback: Callback) { return this.subscribe('train_update', callback); }
  onETAUpdate(callback: Callback) { return this.subscribe('eta_update', callback); }
  onAlert(callback: Callback) { return this.subscribe('alert', callback); }
  onCongestionUpdate(callback: Callback) { return this.subscribe('congestion_update', callback); }
}

export const wsService = new WebSocketService();
