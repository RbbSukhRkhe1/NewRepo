import Redis from 'ioredis';

/** Single stream channel for Vaultex domain events (microservices foundation). */
const EVENTS_CHANNEL = process.env.REDIS_EVENTS_CHANNEL ?? 'vaultex:events';

function redisUrl(): string {
  return process.env.REDIS_URL ?? 'redis://localhost:6379';
}

function redisDisabled(): boolean {
  return process.env.REDIS_DISABLED === '1' || process.env.REDIS_DISABLED === 'true';
}

let publisher: Redis | null = null;
let subscriber: Redis | null = null;

/**
 * Dedicated connection for PUBLISH. Do not use for SUBSCRIBE (use {@link getSubscriber}).
 */
export function getPublisher(): Redis | null {
  if (redisDisabled()) return null;
  if (!publisher) {
    publisher = new Redis(redisUrl(), {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    });
    publisher.on('error', (err) => {
      console.warn('[redis] publisher error:', err.message);
    });
  }
  return publisher;
}

/**
 * Dedicated connection for SUBSCRIBE. `maxRetriesPerRequest: null` is required for subscriber mode.
 */
export function getSubscriber(): Redis | null {
  if (redisDisabled()) return null;
  if (!subscriber) {
    subscriber = new Redis(redisUrl(), {
      lazyConnect: true,
      maxRetriesPerRequest: null,
    });
    subscriber.on('error', (err) => {
      console.warn('[redis] subscriber error:', err.message);
    });
  }
  return subscriber;
}

/** Wire format for pub/sub messages on {@link EVENTS_CHANNEL}. */
export type VaultexEventEnvelope<T = unknown> = {
  v: 1;
  type: string;
  data: T;
  ts: string;
};

/**
 * Publish a domain event. Payload is wrapped as `{ v, type, data, ts }` JSON.
 * Example: `publishEvent('donation.created', { txHash, amountEth, causeId })`
 */
export async function publishEvent<T = unknown>(eventName: string, data: T): Promise<void> {
  const pub = getPublisher();
  if (!pub) return;
  const envelope: VaultexEventEnvelope<T> = {
    v: 1,
    type: eventName,
    data,
    ts: new Date().toISOString(),
  };
  try {
    await pub.publish(EVENTS_CHANNEL, JSON.stringify(envelope));
  } catch (e) {
    console.warn('[redis] publish failed:', e instanceof Error ? e.message : e);
  }
}

export type EventHandler<T = unknown> = (envelope: VaultexEventEnvelope<T>) => void | Promise<void>;

/**
 * Subscribe to Vaultex events on the shared channel. Parses JSON envelopes; invalid messages are skipped.
 * Call from a long-running worker process (not the main HTTP thread unless you isolate I/O).
 */
export async function subscribeToEvents(handler: EventHandler): Promise<void> {
  const sub = getSubscriber();
  if (!sub) return;
  sub.on('message', (_channel, message) => {
    try {
      const parsed = JSON.parse(message) as VaultexEventEnvelope;
      if (parsed?.v !== 1 || typeof parsed.type !== 'string') return;
      void handler(parsed);
    } catch {
      console.warn('[redis] dropped non-JSON or invalid envelope');
    }
  });
  await sub.subscribe(EVENTS_CHANNEL);
}

export function eventsChannel(): typeof EVENTS_CHANNEL {
  return EVENTS_CHANNEL;
}

/** Close pub/sub connections (e.g. on process shutdown). */
export async function closeRedis(): Promise<void> {
  const tasks: Promise<unknown>[] = [];
  if (publisher) {
    tasks.push(publisher.quit().catch(() => publisher!.disconnect()));
    publisher = null;
  }
  if (subscriber) {
    tasks.push(subscriber.quit().catch(() => subscriber!.disconnect()));
    subscriber = null;
  }
  await Promise.all(tasks);
}
