import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
});
redis.on('error', (e) => console.warn('Redis unavailable:', e.message));

export default redis;
