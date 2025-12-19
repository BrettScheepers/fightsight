import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🔧 FightSight Worker (Simplified - No Queue)');
console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`   LLM Provider: ${process.env.LLM_PROVIDER || 'mock'}`);
console.log('');
console.log('   NOTE: Worker is not needed for demo mode.');
console.log('   Analysis runs directly in API server when you call POST /videos/:videoId/analyze');
console.log('');
console.log('   Press Ctrl+C to exit');

// Keep process alive
setInterval(() => {
  // Heartbeat
}, 60000);

// Graceful shutdown
async function shutdown() {
  console.log('Worker shut down');
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
