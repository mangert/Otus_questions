import { once } from 'node:events';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { startServer } from '../src/server.js';

const initialExitCode = process.exitCode;

afterEach(() => {
  process.exitCode = initialExitCode;
});

describe('backend server lifecycle', () => {
  it('starts and closes the HTTP server gracefully', async () => {
    const logger = { log: vi.fn(), error: vi.fn() };
    const runningServer = startServer(0, logger);

    if (!runningServer.server.listening) {
      await once(runningServer.server, 'listening');
    }

    expect(runningServer.server.listening).toBe(true);

    const firstShutdown = runningServer.shutdown();
    const repeatedShutdown = runningServer.shutdown();

    expect(repeatedShutdown).toBe(firstShutdown);
    await firstShutdown;

    expect(runningServer.server.listening).toBe(false);
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.log).toHaveBeenCalledWith('Backend server stopped.');
  });

  it.each(['SIGTERM', 'SIGINT'] as const)(
    'closes the HTTP server after receiving %s',
    async (signal) => {
      const existingListeners = new Set(process.listeners(signal));
      const logger = { log: vi.fn(), error: vi.fn() };
      const runningServer = startServer(0, logger);

      if (!runningServer.server.listening) {
        await once(runningServer.server, 'listening');
      }

      const signalHandler = process
        .listeners(signal)
        .find((listener) => !existingListeners.has(listener));
      expect(signalHandler).toBeDefined();

      const closeEvent = once(runningServer.server, 'close');
      signalHandler!();
      await closeEvent;

      expect(runningServer.server.listening).toBe(false);
      expect(process.listeners(signal)).not.toContain(signalHandler);
      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.log).toHaveBeenCalledWith(
        `Received ${signal}; shutting down backend.`,
      );
      expect(logger.log).toHaveBeenCalledWith('Backend server stopped.');
    },
  );

  it('sets a non-zero exit code when the port is already in use', async () => {
    const occupiedServer = createServer();
    occupiedServer.listen(0);
    await once(occupiedServer, 'listening');

    try {
      const address = occupiedServer.address() as AddressInfo;
      const logger = { log: vi.fn(), error: vi.fn() };
      const runningServer = startServer(address.port, logger);
      const [error] = await once(runningServer.server, 'error');

      expect(error).toMatchObject({ code: 'EADDRINUSE' });
      expect(process.exitCode).toBe(1);
      expect(logger.error).toHaveBeenCalledWith(
        'Backend server failed.',
        error,
      );
    } finally {
      await new Promise<void>((resolve, reject) => {
        occupiedServer.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }
  });
});
