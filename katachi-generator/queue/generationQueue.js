// Bull queue for handling concurrent generation requests
const Queue = require('bull');
const { createRedisClient } = require('../utils/redis');

// Initialize Redis client
const redisClient = createRedisClient();

// Create Bull queue (only if Redis available)
let generationQueue = null;

if (redisClient) {
  try {
    // Parse Redis URL for Bull configuration
    const redisUrl = process.env.REDIS_URL;
    const url = new URL(redisUrl);
    const isUpstash = url.hostname.includes('upstash.io');

    // Configure Redis connection for Bull with proper TLS support
    const redisConfig = {
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      password: url.password,
      // Upstash requires TLS
      ...(isUpstash && {
        tls: {
          rejectUnauthorized: false
        }
      }),
      // Bull-specific Redis settings
      maxRetriesPerRequest: null, // Required for Bull
      enableReadyCheck: false,
      enableOfflineQueue: true, // Required for Bull to queue commands
      connectTimeout: 10000,
      retryStrategy: (times) => {
        if (times > 3) {
          console.error('❌ Redis connection failed after 3 retries');
          return null; // Stop retrying
        }
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    };

    generationQueue = new Queue('katachi-generation', {
      redis: redisConfig,
      settings: {
        stalledInterval: 60000, // Check for stalled jobs every 60s
        maxStalledCount: 2, // Retry stalled jobs twice
        lockDuration: 300000, // 5 minutes - max time to complete a job
      },
      defaultJobOptions: {
        attempts: 2, // Retry failed jobs once
        backoff: {
          type: 'exponential',
          delay: 5000, // Start with 5s delay
        },
        removeOnComplete: {
          age: 3600, // Keep completed jobs for 1 hour
          count: 100, // Keep last 100 completed jobs
        },
        removeOnFail: {
          age: 86400, // Keep failed jobs for 24 hours for debugging
        },
      }
    });

    console.log('✅ Bull queue initialized successfully');

    // Process jobs one at a time to prevent resource exhaustion
    // Can increase to 2-3 for more concurrency if needed
    generationQueue.process(1, async (job) => {
      const { jobId, walletAddress, images } = job.data;

      console.log('\n═══════════════════════════════════════════════════════════════════');
      console.log(`🎨 Processing Job ${jobId}`);
      console.log('═══════════════════════════════════════════════════════════════════');
      console.log(`👛 Wallet: ${walletAddress}`);
      console.log(`🖼️  Images: ${images?.length || 0}`);
      console.log('───────────────────────────────────────────────────────────────────');

      try {
        // Import here to avoid circular dependencies
        const { generatePatternCore } = require('../handlers/pattern');

        // Update progress: Starting
        await job.progress(5);
        await job.log('🚀 Starting pattern generation...');

        // Call core generation function with progress callback
        const result = await generatePatternCore(job.data, {
          onProgress: async (percent, message) => {
            await job.progress(percent);
            await job.log(`[${percent}%] ${message}`);
            console.log(`   📊 Progress: ${percent}% - ${message}`);
          }
        });

        // Complete
        await job.progress(100);
        await job.log('✅ Generation complete!');

        console.log('═══════════════════════════════════════════════════════════════════');
        console.log(`✅ Job ${jobId} completed successfully`);
        console.log('═══════════════════════════════════════════════════════════════════\n');

        return result;

      } catch (error) {
        console.error('═══════════════════════════════════════════════════════════════════');
        console.error(`❌ Job ${jobId} failed:`, error.message);
        console.error('═══════════════════════════════════════════════════════════════════\n');

        await job.log(`❌ Error: ${error.message}`);
        throw error; // Let Bull handle retry logic
      }
    });

    // Event handlers for monitoring
    generationQueue.on('completed', (job, result) => {
      console.log(`✅ Job ${job.id} completed - HTML: ${result.htmlId}, Thumbnail: ${result.thumbnailId}`);
    });

    generationQueue.on('failed', (job, err) => {
      console.error(`❌ Job ${job.id} failed after ${job.attemptsMade} attempts: ${err.message}`);
    });

    generationQueue.on('stalled', (job) => {
      console.warn(`⚠️  Job ${job.id} stalled - will retry`);
    });

    generationQueue.on('error', (error) => {
      console.error('❌ Queue error:', error.message);
    });

    generationQueue.on('active', (job) => {
      console.log(`🔄 Job ${job.id} is now active`);
    });

    generationQueue.on('waiting', (jobId) => {
      console.log(`⏳ Job ${jobId} is waiting in queue`);
    });

  } catch (error) {
    console.error('❌ Failed to initialize Bull queue:', error.message);
    console.warn('⚠️  Queue system disabled - falling back to direct processing');
    generationQueue = null;
  }
} else {
  console.warn('⚠️  Redis not available - queue system disabled');
  console.warn('⚠️  All requests will be processed directly (no concurrency control)');
}

module.exports = { generationQueue };
