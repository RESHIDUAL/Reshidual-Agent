import { LedgerEvent } from './types';

export class LedgerWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private intentionalDisconnect = false;

  constructor(
    private onEvent: (event: LedgerEvent) => void,
    private onConnectionChange: (connected: boolean) => void
  ) {}

  connect(): void {
    this.intentionalDisconnect = false;
    this.setupWebSocket();
  }

  private setupWebSocket() {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    try {
      this.ws = new WebSocket('ws://localhost:8420/api/subscribe_ledger');

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.onConnectionChange(true);
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {

          if (event.data === 'ping' || event.data === 'pong') return;

          const data = JSON.parse(event.data) as LedgerEvent;
          this.onEvent(data);
        } catch (e) {
          console.error('Failed to parse ledger event', e);
        }
      };

      this.ws.onclose = () => {
        this.onConnectionChange(false);
        this.stopHeartbeat();

        if (!this.intentionalDisconnect) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        console.error('Ledger WebSocket error', err);

      };
    } catch (e) {
      console.error('Error creating WebSocket', e);
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.intentionalDisconnect = true;
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.onConnectionChange(false);
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('Max reconnect attempts reached for Ledger WS');
      return;
    }

    const backoffMs = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    setTimeout(() => {
      if (!this.intentionalDisconnect) {
        this.setupWebSocket();
      }
    }, backoffMs);
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send('ping');
      }
    }, 30000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}