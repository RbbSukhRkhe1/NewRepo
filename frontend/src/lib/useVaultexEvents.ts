import { useEffect, useRef } from 'react';

export type VaultexEventEnvelope = {
  v: number;
  type: string;
  data: unknown;
  ts: string;
};

const LEDGER_EVENTS = new Set([
  'donation.created',
  'disbursement.created',
  'ledger.updated',
]);

export function isLedgerEvent(type: string): boolean {
  return LEDGER_EVENTS.has(type) || type.startsWith('ledger.');
}

/**
 * Subscribes to `/api/ws` domain events (backed by Redis pub/sub on the server).
 */
export function useVaultexEvents(
  onEvent: (envelope: VaultexEventEnvelope) => void,
  options?: { enabled?: boolean; filter?: (type: string) => boolean },
) {
  const enabled = options?.enabled !== false;
  const filter = options?.filter;
  const handlerRef = useRef(onEvent);

  useEffect(() => {
    handlerRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!enabled) return;

    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    const connect = () => {
      if (stopped) return;
      try {
        const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
        ws = new WebSocket(`${proto}://${window.location.host}/api/ws`);
      } catch {
        reconnectTimer = setTimeout(connect, 4000);
        return;
      }

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data)) as {
            type?: string;
            envelope?: VaultexEventEnvelope;
          };
          if (msg.type !== 'event' || !msg.envelope?.type) return;
          if (filter && !filter(msg.envelope.type)) return;
          handlerRef.current(msg.envelope);
        } catch {
          /* ignore malformed frames */
        }
      };

      ws.onclose = () => {
        ws = null;
        if (!stopped) reconnectTimer = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws?.close();
      };
    };

    connect();

    return () => {
      stopped = true;
      if (reconnectTimer != null) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [enabled, filter]);
}
