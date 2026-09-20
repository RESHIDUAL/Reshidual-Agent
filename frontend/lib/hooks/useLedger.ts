import { useState, useEffect, useCallback } from 'react';
import { LedgerEvent } from '../api/types';
import { LedgerWebSocket } from '../api/websocket';
import { connectorApi } from '../api/connector';

export function useLedger() {
  const [events, setEvents] = useState<LedgerEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [externalConnections, setExternalConnections] = useState(0);

  useEffect(() => {
    const handleEvent = (event: LedgerEvent) => {
      setEvents(prev => [event, ...prev].slice(0, 100));

      if (event.event_type === 'network_activity' || (event as any).type === 'network_activity') {
        setExternalConnections(prev => prev + 1);
      }
    };

    const handleConnectionChange = (connected: boolean) => {
      setIsConnected(connected);
    };

    const ws = new LedgerWebSocket(handleEvent, handleConnectionChange);
    ws.connect();

    connectorApi.getLedgerEvents(50)
      .then(history => setEvents(history))
      .catch(console.error);

    return () => {
      ws.disconnect();
    };
  }, []);

  const verifyIntegrity = useCallback(async () => {
    try {
      return await connectorApi.verifyIntegrity();
    } catch (e) {
      console.error('Integrity verification failed', e);
      throw e;
    }
  }, []);

  return {
    events,
    isConnected,
    externalConnections,
    verifyIntegrity
  };
}