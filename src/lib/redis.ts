import { Redis } from '@upstash/redis';

// Initialize Redis client using environment variables automatically
// This uses UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from .env.local
export const redis = Redis.fromEnv(); 
