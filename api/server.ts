/**
 * local server entry file, for local development
 */
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

import { createServer } from 'http';
import app from './app.js';
import { GPSWebSocketService } from './services/GPSWebSocketService.js';

/**
 * start server with port
 */
const PORT = process.env.PORT || 3001;

// Create HTTP server
const server = createServer(app);

// Initialize GPS WebSocket service
const gpsWebSocketService = new GPSWebSocketService(server);

server.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`);
  console.log('GPS WebSocket service initialized');
});

/**
 * close server
 */
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;