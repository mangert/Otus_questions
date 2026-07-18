// Starts the HTTP server and coordinates its graceful shutdown.

import type { Server } from 'node:http';

import { app } from './app.js';

const shutdownSignals = ['SIGTERM', 'SIGINT'] as const;

export type ShutdownSignal = (typeof shutdownSignals)[number];

export interface ServerLogger {
  log(message: string): void;
  error(message: string, error: unknown): void;
}

export interface RunningServer {
  server: Server;
  shutdown(signal?: ShutdownSignal): Promise<void>;
}

/** Starts the backend on the given port and returns controls for shutting it down. */
export const startServer = (
  port: number,
  logger: ServerLogger = console,
): RunningServer => {
  const server = app.listen(port, () => {
    logger.log(`Backend is listening on port ${port}`);
  });
  const signalHandlers = new Map<ShutdownSignal, () => void>();
  let shutdownPromise: Promise<void> | undefined;

  const removeSignalHandlers = (): void => {
    for (const [signal, handler] of signalHandlers) {
      process.off(signal, handler);
    }
    signalHandlers.clear();
  };

  const handleServerError = (error: unknown): void => {
    removeSignalHandlers();
    process.exitCode = 1;
    logger.error('Backend server failed.', error);
  };

  const shutdown = (signal?: ShutdownSignal): Promise<void> => {
    if (shutdownPromise) {
      return shutdownPromise;
    }

    if (signal) {
      logger.log(`Received ${signal}; shutting down backend.`);
    }

    shutdownPromise = new Promise<void>((resolve, reject) => {
      server.close((error) => {
        removeSignalHandlers();
        server.off('error', handleServerError);

        if (error) {
          process.exitCode = 1;
          logger.error('Backend server shutdown failed.', error);
          reject(error);
          return;
        }

        logger.log('Backend server stopped.');
        resolve();
      });
    });

    return shutdownPromise;
  };

  server.once('error', handleServerError);

  for (const signal of shutdownSignals) {
    const handler = (): void => {
      void shutdown(signal).catch(() => undefined);
    };
    signalHandlers.set(signal, handler);
    process.once(signal, handler);
  }

  return { server, shutdown };
};
