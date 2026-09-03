export type TelemetryStatus =
  | 'disabled'
  | 'failed'
  | 'started'
  | 'starting'
  | 'stopped';

export interface TelemetryController {
  readonly enabled: boolean;
  readonly status: TelemetryStatus;
  shutdown: () => Promise<void>;
}

export function getTelemetryRequestSpan(): undefined {
  return undefined;
}

export function initializeTelemetry(): TelemetryController {
  return {
    enabled: false,
    status: 'disabled',
    shutdown: async () => {},
  };
}

export function shutdownTelemetry(): Promise<void> {
  return Promise.resolve();
}
