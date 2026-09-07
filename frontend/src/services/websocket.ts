type Callback = (data: any) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string = 'ws://localhost:8000/ws/live';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private callbacks: { [key: string]: Callback[] } = {
    train_update: [],
    eta_update: [],
    alert: [],
    congestion_update: [],
  };

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
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
      this.reconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
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
