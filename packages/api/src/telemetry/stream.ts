import type { ServerRequest } from '~/types';

export interface SseStreamTelemetry {
  recordHeadersFlushed: () => void;
  recordWrite: (payload: string, options?: { final?: boolean }) => void;
  recordFinalEventEmitted: () => void;
  recordErrorEventEmitted: () => void;
  recordSubscribeFailed: () => void;
}

interface SseStreamTelemetryOptions {
  isResume: boolean;
  req: ServerRequest;
  res: unknown;
  streamId: string;
}

const noop = (): void => {};

export function createSseStreamTelemetry(_options: SseStreamTelemetryOptions): SseStreamTelemetry {
  return {
    recordHeadersFlushed: noop,
    recordWrite: noop,
    recordFinalEventEmitted: noop,
    recordErrorEventEmitted: noop,
    recordSubscribeFailed: noop,
  };
}
