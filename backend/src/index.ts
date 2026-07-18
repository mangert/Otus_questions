// Starts the backend process using the configured port.

import { startServer } from './server.js';

const port = Number(process.env.PORT ?? 3000);

startServer(port);
