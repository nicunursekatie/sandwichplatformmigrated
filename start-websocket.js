// Simple WebSocket server startup
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting WebSocket server...');

// Start the WebSocket server
const wsServer = spawn('node', ['server/websocket-server.ts'], {
  stdio: 'inherit',
  cwd: __dirname
});

wsServer.on('error', (error) => {
  console.error('❌ Failed to start WebSocket server:', error);
});

wsServer.on('close', (code) => {
  console.log(`WebSocket server exited with code ${code}`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Shutting down WebSocket server...');
  wsServer.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down WebSocket server...');
  wsServer.kill('SIGTERM');
  process.exit(0);
}); 