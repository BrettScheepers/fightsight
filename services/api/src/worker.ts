import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🔧 FightSight Worker starting...');
console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`   Redis URL: ${process.env.REDIS_URL}`);

// Worker will be implemented later
// For now, just keep the process alive
setInterval(() => {
  console.log(`[${new Date().toISOString()}] Worker heartbeat - Ready for jobs`);
}, 30000);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down worker...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down worker...');
  process.exit(0);
});
