// In-memory job storage for katachi generation
// Replaces Bull/Redis queue with zero-dependency solution

const jobs = new Map();

// Auto-cleanup jobs older than 1 hour
setInterval(() => {
  const oneHourAgo = Date.now() - 3600000;
  let cleanedCount = 0;
  for (const [jobId, job] of jobs) {
    if (job.createdAt < oneHourAgo) {
      jobs.delete(jobId);
      cleanedCount++;
    }
  }
  if (cleanedCount > 0) {
    console.log(`🧹 Cleaned up ${cleanedCount} old job(s) from memory`);
  }
}, 60000); // Check every minute

/**
 * Create a new job in memory
 * @param {string} jobId - Unique job identifier
 * @param {Object} data - Job data (walletAddress, images, etc.)
 * @returns {Object} The created job object
 */
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
  console.log(`📝 Job ${jobId} created in memory queue`);
  return job;
}

/**
 * Get a job by ID
 * @param {string} jobId - Job identifier
 * @returns {Object|null} The job object or null if not found
 */
function getJob(jobId) {
  return jobs.get(jobId) || null;
}

/**
 * Update job progress and add log entry
 * @param {string} jobId - Job identifier
 * @param {number} percent - Progress percentage (0-100)
 * @param {string} message - Status message
 */
function updateProgress(jobId, percent, message) {
  const job = jobs.get(jobId);
  if (job) {
    job.progress = percent;
    const timestamp = new Date().toISOString();
    job.logs.push(`[${timestamp}] [${percent}%] ${message}`);
    console.log(`   📊 Job ${jobId}: ${percent}% - ${message}`);
  }
}

/**
 * Mark job as started/active
 * @param {string} jobId - Job identifier
 */
function startJob(jobId) {
  const job = jobs.get(jobId);
  if (job) {
    job.status = 'active';
    job.startedAt = Date.now();
    console.log(`🔄 Job ${jobId} is now active`);
  }
}

/**
 * Mark job as completed with result
 * @param {string} jobId - Job identifier
 * @param {Object} result - Generation result (htmlId, thumbnailId, etc.)
 */
function completeJob(jobId, result) {
  const job = jobs.get(jobId);
  if (job) {
    job.status = 'completed';
    job.progress = 100;
    job.result = result;
    job.completedAt = Date.now();
    const timestamp = new Date().toISOString();
    job.logs.push(`[${timestamp}] ✅ Generation complete!`);
    const duration = ((job.completedAt - job.startedAt) / 1000).toFixed(2);
    console.log(`✅ Job ${jobId} completed in ${duration}s`);
  }
}

/**
 * Mark job as failed with error
 * @param {string} jobId - Job identifier
 * @param {Error|string} error - Error object or message
 */
function failJob(jobId, error) {
  const job = jobs.get(jobId);
  if (job) {
    job.status = 'failed';
    job.error = error.message || String(error);
    job.completedAt = Date.now();
    const timestamp = new Date().toISOString();
    job.logs.push(`[${timestamp}] ❌ Error: ${job.error}`);
    console.error(`❌ Job ${jobId} failed: ${job.error}`);
  }
}

/**
 * Get current queue statistics
 * @returns {Object} Queue stats
 */
function getQueueStats() {
  let waiting = 0;
  let active = 0;
  let completed = 0;
  let failed = 0;

  for (const job of jobs.values()) {
    switch (job.status) {
      case 'waiting': waiting++; break;
      case 'active': active++; break;
      case 'completed': completed++; break;
      case 'failed': failed++; break;
    }
  }

  return {
    total: jobs.size,
    waiting,
    active,
    completed,
    failed
  };
}

module.exports = {
  createJob,
  getJob,
  updateProgress,
  startJob,
  completeJob,
  failJob,
  getQueueStats
};
