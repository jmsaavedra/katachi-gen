# Redis Optimization Plan: In-Memory Queue Migration

## Problem Statement

Current Redis usage on Upstash free tier (500K commands/month, 10GB bandwidth) is being exhausted in ~1 week due to:

- **Bull queue operations**: ~54 commands per generation
- **Status polling**: 45-150 commands per generation (every 2 seconds for 30-60 sec)
- **MCP server caching**: 2-4 commands per generation

**Total: ~100-210 Redis commands per generation**

This limits the system to ~3,300 generations/month on the free tier.

---

## Solution: In-Memory Queue on Railway

Replace Bull/Redis queue with in-memory Map for job tracking on the katachi-generator (Railway).

### Architecture

```
public-site (Vercel Pro)
    │
    ├─── HTTP POST /api/generate-katachi ───┐
    │                                        │
    └─── HTTP GET /api/job-status ──────────┤
                                             ↓
                            katachi-generator (Railway)
                                    ┌──────────────────┐
                                    │  In-Memory Map   │
                                    │  (Jobs Storage)  │
                                    └──────────────────┘
                                             │
                                    [Direct Processing]
```

### Why This Works

1. **Railway = Persistent Process**: Unlike Vercel serverless functions, Railway runs a continuous Node.js process with consistent memory
2. **Single Server**: No need for distributed state management
3. **Short-lived Jobs**: Generations take 30-60 seconds, minimal risk of losing jobs on restart
4. **Zero External Dependencies**: No Redis connection overhead or costs

---

## Implementation Plan

### Phase 1: In-Memory Job Manager (katachi-generator)

Create `/katachi-generator/queue/inMemoryQueue.js`:

```javascript
// In-memory job storage with automatic cleanup
const jobs = new Map();

// Auto-cleanup jobs older than 1 hour
setInterval(() => {
  const oneHourAgo = Date.now() - 3600000;
  for (const [jobId, job] of jobs) {
    if (job.createdAt < oneHourAgo) {
      jobs.delete(jobId);
    }
  }
}, 60000); // Check every minute

function createJob(jobId, data) {
  const job = {
    id: jobId,
    data,
    status: 'waiting',
    progress: 0,
    logs: [],
    createdAt: Date.now(),
    startedAt: null,
    completedAt: null,
    result: null,
    error: null
  };
  jobs.set(jobId, job);
  return job;
}

function getJob(jobId) {
  return jobs.get(jobId) || null;
}

function updateProgress(jobId, percent, message) {
  const job = jobs.get(jobId);
  if (job) {
    job.progress = percent;
    job.logs.push(`[${new Date().toISOString()}] [${percent}%] ${message}`);
    console.log(`📊 Job ${jobId}: ${percent}% - ${message}`);
  }
}

function startJob(jobId) {
  const job = jobs.get(jobId);
  if (job) {
    job.status = 'active';
    job.startedAt = Date.now();
  }
}

function completeJob(jobId, result) {
  const job = jobs.get(jobId);
  if (job) {
    job.status = 'completed';
    job.progress = 100;
    job.result = result;
    job.completedAt = Date.now();
    job.logs.push(`[${new Date().toISOString()}] ✅ Generation complete!`);
  }
}

function failJob(jobId, error) {
  const job = jobs.get(jobId);
  if (job) {
    job.status = 'failed';
    job.error = error.message || error;
    job.completedAt = Date.now();
    job.logs.push(`[${new Date().toISOString()}] ❌ Error: ${job.error}`);
  }
}

module.exports = {
  createJob,
  getJob,
  updateProgress,
  startJob,
  completeJob,
  failJob
};
```

### Phase 2: Update Server to Use In-Memory Queue

Modify `/katachi-generator/server.js`:

```javascript
// Replace Bull queue import
const {
  createJob,
  getJob,
  updateProgress,
  startJob,
  completeJob,
  failJob
} = require('./queue/inMemoryQueue');
const { generatePatternCore } = require('./handlers/pattern');

// POST / - Queue a job
if (urlPath === '/' || urlPath === '') {
  const jobId = uuidv4();

  console.log(`🎯 Creating job: ${jobId}`);
  createJob(jobId, data);

  // Return immediately with job ID
  res.setHeader('Content-Type', 'application/json');
  res.writeHead(202);
  res.end(JSON.stringify({
    success: true,
    jobId: jobId,
    status: 'queued',
    message: 'Job queued for processing',
    statusUrl: `/job/${jobId}`,
  }));

  // Process job asynchronously (non-blocking)
  setImmediate(async () => {
    try {
      startJob(jobId);
      updateProgress(jobId, 5, 'Starting pattern generation...');

      const result = await generatePatternCore(data, {
        onProgress: async (percent, message) => {
          updateProgress(jobId, percent, message);
        }
      });

      completeJob(jobId, result);
      console.log(`✅ Job ${jobId} completed successfully`);

    } catch (error) {
      console.error(`❌ Job ${jobId} failed:`, error.message);
      failJob(jobId, error);
    }
  });
}

// GET /job/:jobId - Check job status
if (urlPath.startsWith('/job/')) {
  const jobId = urlPath.split('/')[2];
  const job = getJob(jobId);

  if (!job) {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(404);
    res.end(JSON.stringify({
      error: 'Job not found',
      jobId: jobId
    }));
    return;
  }

  res.setHeader('Content-Type', 'application/json');
  res.writeHead(200);
  res.end(JSON.stringify({
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    logs: job.logs,
    result: job.result,
    error: job.error,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt
  }));
}
```

### Phase 3: No Changes Needed on Public-Site

The public-site already polls `/api/job-status` which forwards to Railway's `/job/:jobId`. The response format stays the same, so no frontend changes required!

---

## Redis Usage After Migration

### Before (Bull Queue + Polling)
- **Per generation**: ~100-210 Redis commands
- **Monthly capacity**: ~3,300 generations

### After (In-Memory Queue)
- **Per generation**: 0 Redis commands (queue)
- **MCP caching only**: ~2-4 Redis commands
- **Monthly capacity**: ~125,000+ generations

**98% reduction in Redis usage!**

---

## Future Enhancement: Server-Sent Events (SSE)

Replace polling with real-time push updates for even better UX:

### Benefits
- Instant progress updates (no 2-second delay)
- No repeated HTTP requests
- Better perceived performance

### Implementation Sketch

```javascript
// Railway endpoint: GET /job/:jobId/stream
app.get('/job/:jobId/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const jobId = req.params.jobId;

  // Send updates as they happen
  const interval = setInterval(() => {
    const job = getJob(jobId);
    if (job) {
      res.write(`data: ${JSON.stringify({
        status: job.status,
        progress: job.progress,
        logs: job.logs.slice(-1) // Last log only
      })}\n\n`);

      if (job.status === 'completed' || job.status === 'failed') {
        clearInterval(interval);
        res.end();
      }
    }
  }, 500); // Update every 500ms

  req.on('close', () => clearInterval(interval));
});
```

This can be added after the in-memory queue migration is stable.

---

## Risk Assessment

### Low Risk
- **Job loss on Railway restart**: Rare occurrence, 30-60 second window
- **Memory usage**: Each job is ~1-10KB, auto-cleaned after 1 hour
- **No persistence**: Acceptable for ephemeral generation tasks

### Mitigations
- Add "job not found" error handling in public-site
- Monitor Railway service health
- Consider SQLite backup if persistence becomes critical

---

## Migration Checklist

- [ ] Create `/katachi-generator/queue/inMemoryQueue.js`
- [ ] Update `/katachi-generator/server.js` to use in-memory queue
- [ ] Remove Bull queue dependency from package.json
- [ ] Remove Redis client initialization code
- [ ] Test locally with `REDIS_URL` unset
- [ ] Deploy to Railway
- [ ] Monitor Redis usage on Upstash (should see dramatic drop)
- [ ] Keep Upstash for MCP server caching only
- [ ] Consider removing `katachi-generator/queue/generationQueue.js` and `katachi-generator/utils/redis.js`

---

## Cost Comparison

| Solution | Monthly Cost | Commands/Generation | Max Generations |
|----------|-------------|--------------------|-----------------|
| **Upstash Free (Current)** | $0 | ~150 | ~3,300 |
| **Upstash Pay-as-you-go** | ~$4-8 | ~150 | Unlimited |
| **In-Memory Queue** | $0 | 0 (queue) | Unlimited |
| **Railway (already paying)** | $0 additional | N/A | N/A |

---

## Conclusion

The in-memory queue approach eliminates Redis dependency for job management entirely, reducing costs to $0 while supporting unlimited generations. The only Redis usage would be MCP server caching (2-4 commands/generation), staying well within Upstash free tier limits.

This is the recommended path forward.
