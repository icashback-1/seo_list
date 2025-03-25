# Upstash Redis Integration

This project uses [Upstash Redis](https://upstash.com/redis) to persist SEO task completion data. This guide will help you set up and configure the Redis integration.

## Setup Instructions

1. Create an Upstash Account:
   - Go to [Upstash Console](https://console.upstash.com/)
   - Sign up for a new account or log in

2. Create a Redis Database:
   - Click "Create Database"
   - Choose a name for your database (e.g., "seo-task-tracker")
   - Select a region closest to your users
   - Choose the free tier for development (or a paid tier for production)
   - Click "Create"

3. Get Your Redis Credentials:
   - In your database details, find the "REST API" section
   - Copy the `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

4. Configure Environment Variables:
   - Create a `.env.local` file in the root of your project if it doesn't exist
   - Add your Redis credentials:
     ```
     UPSTASH_REDIS_REST_URL=your-redis-url
     UPSTASH_REDIS_REST_TOKEN=your-redis-token
     ```

5. Restart Your Development Server:
   - Stop and restart your Next.js dev server to load the new environment variables

## How It Works

The SEO Dashboard uses Upstash Redis for the following:

1. **Task Storage**: All SEO tasks and their completion status are stored in Redis
2. **Server Actions**: Next.js server actions are used to toggle task completion status
3. **Persistent State**: Task completion status persists across sessions and deployments

## Implementation Details

- `src/lib/redis.ts`: Redis client configuration using `Redis.fromEnv()`
- `src/app/actions.ts`: Server actions for task management using Redis
- `src/components/SEODashboard.tsx`: UI component that uses server actions to update task status

## Simplified Redis Integration

The Redis integration is very simple:

```typescript
// In src/lib/redis.ts
import { Redis } from '@upstash/redis';

// Initialize Redis client using environment variables
export const redis = Redis.fromEnv();

// In server actions (src/app/actions.ts)
// Read data
const tasks = await redis.get('seo:tasks') as TasksState | null;

// Write data
await redis.set('seo:tasks', updatedTasks);
```

## Troubleshooting

If you encounter issues:

1. Verify your Redis credentials in `.env.local`
2. Check network requests in browser dev tools for error messages
3. Ensure you're properly connected to the internet
4. Check Upstash Console to verify your database is active

## Resources

- [Upstash Redis Documentation](https://upstash.com/docs/redis)
- [Next.js Server Actions Documentation](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions) 
