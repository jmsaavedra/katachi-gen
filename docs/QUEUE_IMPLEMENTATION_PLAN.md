# Queue System Implementation Plan

## Executive Summary

Implement a Bull Queue system for katachi-generator to handle concurrent generation requests, provide real-time progress tracking, and prevent resource exhaustion.

**Timeline:** 1-2 days of focused development
**Risk Level:** Low (graceful degradation built-in)
**Cost:** $0 (reuse existing Upstash Redis)

---

## Architecture Decision

### ✅ Recommended: Reuse Existing Upstash Redis

**Rationale:**
- You already have Upstash Redis for mcp-server caching
- Upstash free tier includes 10,000 commands/day (sufficient for queue + cache)
- Key namespacing prevents collision: `cache:*` vs `bull:katachi-generation:*`
- No additional infrastructure cost or setup
- Same Redis client pattern already proven in mcp-server

**Architecture:**
```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   public-site   │  POST   │ katachi-generator│  Jobs   │  Upstash Redis  │
│   (Next.js)     │────────>│  (Node.js)       │<───────>│                 │
│                 │         │                  │         │ • Queue Jobs    │
│  - Submit job   │  Poll   │  - Bull Queue    │         │ • Progress      │
│  - Poll status  │<────────│  - Job processor │         │ • Cache (MCP)   │
│  - Show progress│         │  - Progress track│         │                 │
└─────────────────┘         └──────────────────┘         └─────────────────┘
```

**Key Namespacing Strategy:**
- **MCP Cache**: `cache:nfts:{address}`, `cache:collection:{contractAddress}`, etc.
- **Queue Jobs**: `bull:katachi-generation:*` (Bull manages this automatically)
- **No conflicts**: Different key prefixes ensure isolation

---

## Implementation Plan

### Phase 1: Setup Bull Queue in katachi-generator (3-4 hours)

#### 1.1 Install Dependencies

```bash
cd katachi-generator
npm install bull ioredis
```

**Dependencies:**
- `bull@4.12.9` - Queue system
- `ioredis@5.3.2` - Redis client (same as mcp-server)

#### 1.2 Create Redis Client

**File:** `katachi-generator/utils/redis.js`

```javascript
const Redis = require('ioredis');

// Reuse the same Redis connection pattern from mcp-server
function createRedisClient() {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    console.warn('⚠️  REDIS_URL not set - queue system disabled (dev mode only)');
    return null;
  }

  try {
    console.log('🔗 Connecting to Redis for queue...');
    const url = new URL(redisUrl);
    const isUpstash = url.hostname.includes('upstash.io');

    const client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      connectTimeout: 10000,
      enableOfflineQueue: true,
      retryDelayOnFailover: 100,
      // Upstash requires TLS
      ...(isUpstash && {
        tls: {
          rejectUnauthorized: false
        }
      }),
    });

    client.on('error', (err) => {
      console.error('❌ Redis error:', err.message);
    });

    client.on('connect', () => {
      console.log('✅ Redis connected for queue');
    });

    return client;
  } catch (error) {
    console.error('❌ Failed to create Redis client:', error);
    return null;
  }
}

module.exports = { createRedisClient };
```

#### 1.3 Create Queue System

**File:** `katachi-generator/queue/generationQueue.js`

```javascript
const Queue = require('bull');
const { createRedisClient } = require('../utils/redis');
const { generatePatternCore } = require('../handlers/pattern');

// Create Redis connection for Bull
const redisClient = createRedisClient();

// Create Bull queue (only if Redis available)
const generationQueue = redisClient ? new Queue('katachi-generation', {
  redis: process.env.REDIS_URL,
  settings: {
    stalledInterval: 60000, // Check for stalled jobs every 60s
    maxStalledCount: 2, // Retry stalled jobs twice
    lockDuration: 300000, // 5 minutes - time to complete a job
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
      age: 86400, // Keep failed jobs for 24 hours
    },
  }
}) : null;

// Process jobs one at a time (prevent resource exhaustion)
// Can increase to 2-3 for more concurrency
if (generationQueue) {
  generationQueue.process(1, async (job) => {
    const { jobId, walletAddress, images, sentiment, seed2, stackMedals, totalNfts, uniqueCollections } = job.data;

    console.log(`\n🎨 Processing job ${jobId} for wallet ${walletAddress}`);
    console.log(`📊 Progress tracking enabled - ${images.length} images`);

    try {
      // Update progress: Starting
      await job.progress(5);
      await job.log('Starting pattern generation...');

      // Step 1: Validate and process images
      await job.progress(10);
      await job.log(`Processing ${images.length} images...`);

      // Step 2: Select pattern
      await job.progress(20);
      await job.log('Selecting origami pattern...');

      // Call the core generation function with progress callback
      const result = await generatePatternCore({
        walletAddress,
        images,
        sentiment,
        seed2,
        stackMedals,
        totalNfts,
        uniqueCollections,
      }, {
        onProgress: async (percent, message) => {
          await job.progress(percent);
          await job.log(message);
        }
      });

      // Step 3: Complete
      await job.progress(100);
      await job.log('Generation complete!');

      return result;
    } catch (error) {
      console.error(`❌ Job ${jobId} failed:`, error);
      await job.log(`Error: ${error.message}`);
      throw error; // Let Bull handle retry logic
    }
  });

  // Event handlers for monitoring
  generationQueue.on('completed', (job, result) => {
    console.log(`✅ Job ${job.id} completed successfully`);
  });

  generationQueue.on('failed', (job, err) => {
    console.error(`❌ Job ${job.id} failed:`, err.message);
  });

  generationQueue.on('stalled', (job) => {
    console.warn(`⚠️  Job ${job.id} stalled - will retry`);
  });

  generationQueue.on('error', (error) => {
    console.error('❌ Queue error:', error);
  });
}

module.exports = { generationQueue };
```

#### 1.4 Refactor Pattern Handler

**File:** `katachi-generator/handlers/pattern.js`

**Changes:**
1. Extract core generation logic into `generatePatternCore(data, options)`
2. Keep existing direct processing path for backwards compatibility
3. Add progress callback support

```javascript
// Add this helper at the top
async function generatePatternCore(data, options = {}) {
  const { onProgress = async () => {} } = options;

  // Your existing generation logic here, but add progress calls:

  await onProgress(30, 'Compressing images...');
  // ... image processing code ...

  await onProgress(50, 'Generating origami pattern...');
  // ... pattern generation code ...

  await onProgress(70, 'Creating thumbnail...');
  // ... thumbnail creation code ...

  await onProgress(90, 'Uploading to storage...');
  // ... upload code ...

  return {
    success: true,
    htmlId,
    thumbnailId,
    // ... other result data
  };
}

// Export for queue processor
module.exports = {
  handlePatternGeneration,
  generatePatternCore // NEW: for queue
};
```

#### 1.5 Update Server with Queue Endpoints

**File:** `katachi-generator/server.js`

```javascript
const { generationQueue } = require('./queue/generationQueue');
const { v4: uuidv4 } = require('uuid'); // npm install uuid

// Add new endpoints:

// POST / - Submit job to queue (new behavior)
// POST /direct - Direct generation (old behavior, for testing)
// GET /job/:jobId - Get job status
// GET /job/:jobId/logs - Get job logs

if (method === 'POST') {
  req.on('end', async () => {
    const data = JSON.parse(body);

    // NEW: Queue-based generation (default)
    if ((urlPath === '/' || urlPath === '') && generationQueue) {
      const jobId = uuidv4();

      // Add job to queue
      const job = await generationQueue.add({
        jobId,
        ...data
      }, {
        jobId, // Use custom jobId for easier tracking
      });

      res.setHeader('Content-Type', 'application/json');
      res.writeHead(202); // Accepted
      res.end(JSON.stringify({
        success: true,
        jobId: job.id,
        status: 'queued',
        message: 'Job queued for processing',
        statusUrl: `/job/${job.id}`,
      }));
    }
    // Fallback: Direct processing if no queue
    else if ((urlPath === '/' || urlPath === '') && !generationQueue) {
      console.warn('⚠️  Queue not available - processing directly');
      await handlePatternGeneration(req, res, data);
    }
    // NEW: Direct processing endpoint (for testing/debugging)
    else if (urlPath === '/direct') {
      await handlePatternGeneration(req, res, data);
    }
  });
}
else if (method === 'GET') {
  // NEW: Job status endpoint
  if (urlPath.startsWith('/job/')) {
    const jobId = urlPath.split('/')[2];
    const includeDetails = urlPath.includes('/details');

    if (!generationQueue) {
      res.writeHead(503);
      res.end(JSON.stringify({ error: 'Queue not available' }));
      return;
    }

    const job = await generationQueue.getJob(jobId);

    if (!job) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Job not found' }));
      return;
    }

    const state = await job.getState();
    const progress = job._progress || 0;
    const logs = includeDetails ? await generationQueue.getJobLogs(jobId) : null;

    const response = {
      jobId: job.id,
      status: state,
      progress,
      data: includeDetails ? job.data : undefined,
      result: state === 'completed' ? job.returnvalue : undefined,
      failedReason: state === 'failed' ? job.failedReason : undefined,
      logs: logs ? logs.logs : undefined,
    };

    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify(response));
  }
}
```

---

### Phase 2: Update public-site Frontend (2-3 hours)

#### 2.1 Update API Route

**File:** `public-site/app/api/generate-katachi/route.ts`

```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Submit job to katachi-generator queue
    const response = await fetch(GENERATOR_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Generator returned ${response.status}`);
    }

    const result = await response.json();

    // If queue is enabled, return job ID for polling
    if (result.jobId) {
      return NextResponse.json({
        success: true,
        jobId: result.jobId,
        status: 'queued',
        statusUrl: result.statusUrl,
      });
    }

    // Fallback: Direct result (queue not available)
    return NextResponse.json(result);
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

#### 2.2 Update Frontend Component with Polling

**File:** `public-site/components/katachi-generator.tsx`

**Changes:**

```tsx
// Add state for job tracking
const [jobId, setJobId] = useState<string | null>(null);
const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

// Update generateKatachi function
const generateKatachi = async () => {
  try {
    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationStatus('Queuing generation request...');

    // Initial request
    const response = await fetch('/api/generate-katachi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress: addressToUse,
        images: imageUrls,
        sentiment: dataToUse.sentiment,
        seed2: Math.floor(Math.random() * 1000000) + '_' + Date.now(),
        stackMedals: stackMedals?.totalMedals || 0,
        totalNfts: nfts?.totalCount || 0,
        uniqueCollections: nfts?.ownedNfts
          ? new Set(nfts.ownedNfts.map(nft => nft.contract.address)).size
          : 0,
      }),
    });

    if (!response.ok) {
      throw new Error(`Generation failed: ${response.statusText}`);
    }

    const result = await response.json();

    // Check if queue-based (has jobId) or direct result
    if (result.jobId) {
      // Queue-based: Start polling
      setJobId(result.jobId);
      setGenerationProgress(5);
      setGenerationStatus('Job queued - waiting to start...');

      await pollJobStatus(result.jobId);
    } else {
      // Direct result (fallback mode)
      setGenerationProgress(100);
      setGenerationStatus('Complete!');
      handleDirectResult(result);
    }
  } catch (error) {
    console.error('Generation error:', error);
    setError(error.message);
  } finally {
    setIsGenerating(false);
  }
};

// New: Poll job status
const pollJobStatus = async (jobId: string) => {
  const pollFn = async () => {
    try {
      const statusResponse = await fetch(
        `${process.env.NEXT_PUBLIC_GENERATOR_URL}/job/${jobId}`
      );

      if (!statusResponse.ok) {
        throw new Error('Failed to get job status');
      }

      const status = await statusResponse.json();

      // Update progress
      setGenerationProgress(status.progress || 0);

      // Update status message based on state
      if (status.status === 'waiting') {
        setGenerationStatus('Waiting in queue...');
      } else if (status.status === 'active') {
        setGenerationStatus(getProgressMessage(status.progress));
      } else if (status.status === 'completed') {
        setGenerationProgress(100);
        setGenerationStatus('Complete!');

        // Clear polling interval
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }

        // Handle result
        handleJobResult(status.result);
        return;
      } else if (status.status === 'failed') {
        throw new Error(status.failedReason || 'Generation failed');
      }
    } catch (error) {
      console.error('Polling error:', error);
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
      setError(error.message);
    }
  };

  // Start polling every 2 seconds
  const interval = setInterval(pollFn, 2000);
  setPollingInterval(interval);

  // Do first poll immediately
  await pollFn();
};

// Helper: Get status message based on progress
const getProgressMessage = (progress: number): string => {
  if (progress < 20) return 'Processing images...';
  if (progress < 50) return 'Generating origami pattern...';
  if (progress < 70) return 'Creating thumbnail...';
  if (progress < 90) return 'Uploading to storage...';
  return 'Finalizing...';
};

// Cleanup on unmount
useEffect(() => {
  return () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
  };
}, [pollingInterval]);
```

---

### Phase 3: Environment Configuration (15 minutes)

#### 3.1 Add REDIS_URL to katachi-generator

**Copy from mcp-server .env:**

```bash
# In katachi-generator/.env
REDIS_URL=rediss://default:YOUR_PASSWORD@YOUR_UPSTASH_HOST.upstash.io:6379
```

**On Railway (Production):**
1. Go to katachi-generator service settings
2. Add environment variable: `REDIS_URL`
3. Paste the same value from mcp-server

#### 3.2 Add Generator URL to public-site

```bash
# In public-site/.env.local
NEXT_PUBLIC_GENERATOR_URL=http://localhost:3001

# In Vercel (Production):
NEXT_PUBLIC_GENERATOR_URL=https://your-generator.railway.app
```

---

### Phase 4: Testing Strategy (1-2 hours)

#### 4.1 Local Development Testing

**Terminal 1: Start Redis (if using local)**
```bash
docker run -p 6379:6379 redis:7-alpine
```

**Terminal 2: Start katachi-generator**
```bash
cd katachi-generator
REDIS_URL=redis://localhost:6379 npm run dev
```

**Terminal 3: Start public-site**
```bash
cd public-site
npm run dev
```

**Test Cases:**
1. ✅ Single generation completes successfully
2. ✅ Multiple concurrent requests (open 3 tabs, generate simultaneously)
3. ✅ Progress updates work correctly
4. ✅ Failed jobs retry and eventually fail
5. ✅ Queue gracefully handles Redis disconnection

#### 4.2 Production Testing

**Staged Rollout:**
1. **Day 1**: Deploy to production but keep behind feature flag
2. **Day 2**: Enable for 10% of users (random sampling)
3. **Day 3**: Enable for 50% of users
4. **Day 4**: Enable for 100% of users

**Monitoring:**
- Check Railway logs for queue events
- Monitor Upstash dashboard for Redis usage
- Track job completion rates vs failures

---

### Phase 5: Monitoring & Observability (1 hour)

#### 5.1 Add Bull Board (Optional - Visual Dashboard)

```bash
cd katachi-generator
npm install @bull-board/api @bull-board/express
```

**File:** `katachi-generator/server.js`

```javascript
const { createBullBoard } = require('@bull-board/api');
const { BullAdapter } = require('@bull-board/api/bullAdapter');
const { ExpressAdapter } = require('@bull-board/express');

// Setup Bull Board
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullAdapter(generationQueue)],
  serverAdapter: serverAdapter,
});

// Add route handler in server
if (urlPath.startsWith('/admin/queues')) {
  // Serve Bull Board UI
  serverAdapter.getRouter()(req, res);
}
```

**Access dashboard:**
- Local: `http://localhost:3001/admin/queues`
- Production: `https://your-generator.railway.app/admin/queues`

#### 5.2 Add Metrics Endpoint

```javascript
// GET /metrics - Queue statistics
if (urlPath === '/metrics') {
  const jobCounts = await generationQueue.getJobCounts();
  const workers = await generationQueue.getWorkers();

  res.setHeader('Content-Type', 'application/json');
  res.writeHead(200);
  res.end(JSON.stringify({
    queue: 'katachi-generation',
    jobs: jobCounts,
    workers: workers.length,
    timestamp: new Date().toISOString(),
  }));
}
```

---

## Deployment Plan

### Pre-Deployment Checklist

- [ ] All tests passing locally
- [ ] Environment variables configured
- [ ] Redis connection tested
- [ ] Rollback plan documented
- [ ] Team notified of deployment

### Deployment Steps

**1. Deploy katachi-generator (Railway)**

```bash
cd katachi-generator
git add .
git commit -m "feat: add Bull queue system for generation requests"
git push origin main
```

**On Railway:**
- Add `REDIS_URL` environment variable
- Redeploy service
- Check logs for "✅ Redis connected for queue"

**2. Deploy public-site (Vercel)**

```bash
cd public-site
git add .
git commit -m "feat: add job polling for queue-based generation"
git push origin main
```

**On Vercel:**
- Add `NEXT_PUBLIC_GENERATOR_URL` environment variable
- Redeploy will happen automatically
- Test generation flow

### Post-Deployment Verification

1. **Check Queue Connection**
   ```bash
   curl https://your-generator.railway.app/metrics
   ```

2. **Test Generation**
   - Generate a katachi
   - Verify progress updates appear
   - Check job completes successfully

3. **Check Bull Board**
   - Visit `/admin/queues`
   - Verify jobs appear
   - Check completion rates

---

## Rollback Strategy

### If Queue System Fails

**Option 1: Disable Queue (Immediate)**

```javascript
// In server.js, comment out queue import
// const { generationQueue } = require('./queue/generationQueue');
const generationQueue = null; // Force fallback to direct processing

// Redeploy - will use direct processing mode
```

**Option 2: Remove Redis Env Var**

On Railway:
1. Delete `REDIS_URL` environment variable
2. Service will restart and use direct processing mode

**Option 3: Full Rollback**

```bash
git revert HEAD
git push origin main
```

---

## Cost Analysis

### Current: $0/month
- Using existing Upstash Redis
- Free tier: 10,000 commands/day
- Estimated queue usage: ~100-200 commands/generation
- Can handle: 50-100 generations/day on free tier

### If Scaling Needed: ~$10-20/month
- Upstash Pro plan: 100,000 commands/day
- Handles: 500-1000 generations/day

---

## Success Metrics

Track these metrics to measure success:

1. **Queue Performance**
   - Average job completion time
   - Jobs waiting in queue
   - Failed job rate

2. **User Experience**
   - Time to first progress update
   - Progress update frequency
   - Generation success rate

3. **System Health**
   - Redis connection uptime
   - Worker utilization
   - Memory usage per job

---

## Alternatives Considered

### ❌ Alternative 1: New Redis Instance
**Rejected because:**
- Additional cost ($10-20/month)
- More infrastructure to manage
- Upstash free tier is sufficient

### ❌ Alternative 2: In-Memory Queue
**Rejected because:**
- Jobs lost on restart
- Can't scale horizontally
- No persistence for debugging
- Not production-ready

### ❌ Alternative 3: Database-Based Queue (PostgreSQL)
**Rejected because:**
- Slower than Redis
- More complex setup
- Requires new database
- Bull is designed for Redis

---

## FAQ

**Q: What happens if Redis goes down?**
A: The system automatically falls back to direct processing mode. Users experience no downtime.

**Q: Will this slow down generation?**
A: No. Single user experience is identical. Multiple concurrent users will see improved performance (no resource contention).

**Q: Can we increase concurrency?**
A: Yes. Change `generationQueue.process(1, ...)` to `generationQueue.process(3, ...)` for 3 concurrent jobs.

**Q: How do we monitor queue health?**
A: Use Bull Board dashboard at `/admin/queues` or metrics endpoint at `/metrics`.

**Q: What about job cleanup?**
A: Bull automatically removes old jobs (completed after 1 hour, failed after 24 hours). Configurable in queue settings.

---

## Next Steps

1. **Review this plan** - Confirm architecture and timeline
2. **Setup local environment** - Install dependencies, test locally
3. **Implement Phase 1** - Bull queue in katachi-generator
4. **Implement Phase 2** - Frontend polling
5. **Test thoroughly** - All test cases pass
6. **Deploy to production** - Staged rollout
7. **Monitor metrics** - Track success metrics

**Ready to start?** Begin with Phase 1.1 (Install Dependencies).
