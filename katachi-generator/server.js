// Main server file for Katachi Generator
require('dotenv').config();
const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { port, TESTING_MODE } = require('./config');

// Import handlers
const { handleMetadataUpload } = require('./handlers/metadata');
const { handlePatternGeneration, generatePatternCore } = require('./handlers/pattern');
const { handleTestTemplate, handleTestAPI } = require('./handlers/testTemplate');

// Import utilities
const { loadArweaveWallet, getWalletAddress, getWalletBalance } = require('./utils/wallet');
const { serveStaticFile, serveTempFile, cleanupTempFiles } = require('./utils/fileServer');

// Import in-memory queue system (no Redis dependency)
const {
    createJob,
    getJob,
    updateProgress,
    startJob,
    completeJob,
    failJob,
    getQueueStats
} = require('./queue/inMemoryQueue');

// Track server start time for uptime calculation
const serverStartTime = Date.now();

// Create HTTP server
const server = http.createServer(async (req, res) => {
    // CORS configuration
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Parse URL
    const { pathname } = url.parse(req.url, true);
    const method = req.method;
    const urlPath = pathname || '/';

    console.log(`${method} ${urlPath}`);

    // Handle POST requests
    if (method === 'POST') {
        let body = '';

        // Receive request body
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            try {
                // Parse as JSON data
                const data = JSON.parse(body);

                // Log the entire POST request
                console.log('\n═══════════════════════════════════════════════════════════════════');
                console.log('📨 INCOMING POST REQUEST');
                console.log('═══════════════════════════════════════════════════════════════════');
                console.log(`🔗 Endpoint: ${urlPath}`);
                console.log(`📦 Request size: ${body.length} bytes (${(body.length / 1024).toFixed(2)} KB)`);
                console.log('\n📄 Request Body:');
                console.log(JSON.stringify(data, null, 2));
                console.log('═══════════════════════════════════════════════════════════════════\n');

                // Route POST requests based on URL path
                if (urlPath === '/upload-metadata') {
                    await handleMetadataUpload(req, res, data);
                } else if (urlPath === '/' || urlPath === '') {
                    // Queue-based generation using in-memory queue
                    const jobId = uuidv4();

                    console.log(`🎯 Creating generation job: ${jobId}`);

                    try {
                        // Create job in memory
                        createJob(jobId, data);

                        console.log(`✅ Job ${jobId} created in queue`);

                        // Return immediately with job ID
                        res.setHeader('Content-Type', 'application/json');
                        res.writeHead(202); // Accepted
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

                            } catch (error) {
                                console.error(`❌ Job ${jobId} failed:`, error.message);
                                failJob(jobId, error);
                            }
                        });

                    } catch (queueError) {
                        console.error('❌ Failed to create job:', queueError);

                        // Fallback to direct processing
                        console.warn('⚠️  Falling back to direct processing');
                        await handlePatternGeneration(req, res, data);
                    }
                } else if (urlPath === '/direct') {
                    // NEW: Direct processing endpoint (for testing/debugging)
                    console.log('🔧 Direct processing requested');
                    await handlePatternGeneration(req, res, data);
                } else {
                    res.setHeader('Content-Type', 'application/json');
                    res.writeHead(404);
                    res.end(JSON.stringify({
                        success: false,
                        error: `Unknown POST endpoint: ${urlPath}`
                    }));
                }
            } catch (error) {
                console.error('JSON parse error:', error);
                res.setHeader('Content-Type', 'application/json');
                res.writeHead(400);
                res.end(JSON.stringify({
                    success: false,
                    error: 'Invalid JSON format'
                }));
            }
        });
    } 
    // Handle GET requests
    else if (method === 'GET') {
        // Job status endpoint (in-memory queue)
        if (urlPath.startsWith('/job/')) {
            const pathParts = urlPath.split('/');
            const jobId = pathParts[2];
            const includeDetails = urlPath.includes('/details');

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

            // Get recent logs (last 10 entries)
            const recentLogs = job.logs.slice(-10);

            const response = {
                jobId: job.id,
                status: job.status,
                progress: job.progress,
                data: includeDetails ? job.data : undefined,
                result: job.status === 'completed' ? job.result : undefined,
                failedReason: job.status === 'failed' ? job.error : undefined,
                logs: recentLogs,
                timestamp: job.createdAt,
            };

            res.setHeader('Content-Type', 'application/json');
            res.writeHead(200);
            res.end(JSON.stringify(response));
        }
        // Queue stats endpoint
        else if (urlPath === '/queue-stats') {
            const stats = getQueueStats();
            res.setHeader('Content-Type', 'application/json');
            res.writeHead(200);
            res.end(JSON.stringify(stats));
        }
        // Health/Status page endpoint
        else if (urlPath === '/status') {
            const uptimeMs = Date.now() - serverStartTime;
            const uptimeSeconds = Math.floor(uptimeMs / 1000);
            const uptimeMinutes = Math.floor(uptimeSeconds / 60);
            const uptimeHours = Math.floor(uptimeMinutes / 60);
            const uptimeDays = Math.floor(uptimeHours / 24);

            const uptimeString = uptimeDays > 0
                ? `${uptimeDays}d ${uptimeHours % 24}h ${uptimeMinutes % 60}m ${uptimeSeconds % 60}s`
                : uptimeHours > 0
                ? `${uptimeHours}h ${uptimeMinutes % 60}m ${uptimeSeconds % 60}s`
                : uptimeMinutes > 0
                ? `${uptimeMinutes}m ${uptimeSeconds % 60}s`
                : `${uptimeSeconds}s`;

            const queueStats = getQueueStats();
            const memUsage = process.memoryUsage();

            const statusData = {
                status: 'healthy',
                server: {
                    name: 'Katachi Generator',
                    version: '2.0.0',
                    environment: process.env.NODE_ENV || process.env.RAILWAY_ENVIRONMENT || 'development',
                    testingMode: TESTING_MODE
                },
                uptime: {
                    started: new Date(serverStartTime).toISOString(),
                    duration: uptimeString,
                    milliseconds: uptimeMs
                },
                queue: {
                    ...queueStats,
                    note: 'In-memory queue (no Redis)'
                },
                memory: {
                    heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
                    heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
                    rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`,
                    external: `${(memUsage.external / 1024 / 1024).toFixed(2)} MB`
                },
                system: {
                    nodeVersion: process.version,
                    platform: process.platform,
                    pid: process.pid
                },
                timestamp: new Date().toISOString()
            };

            res.setHeader('Content-Type', 'application/json');
            res.writeHead(200);
            res.end(JSON.stringify(statusData, null, 2));
        }
        // Test routes for modular template system
        else if (urlPath === '/test-template') {
            await handleTestTemplate(req, res);
        } else if (urlPath === '/test-api') {
            await handleTestAPI(req, res);
        }
        // Check if wallet info is requested
        else if (urlPath === '/wallet-info') {
            try {
                // Try to get wallet info if wallet is available
                const walletKey = loadArweaveWallet();
                if (walletKey) {
                    const walletAddress = await getWalletAddress();
                    const balance = await getWalletBalance(walletAddress);
                    
                    res.setHeader('Content-Type', 'application/json');
                    res.writeHead(200);
                    res.end(JSON.stringify({
                        success: true,
                        walletAddress: walletAddress,
                        balance: balance
                    }));
                } else {
                    res.setHeader('Content-Type', 'application/json');
                    res.writeHead(404);
                    res.end(JSON.stringify({
                        success: false,
                        error: 'Wallet file not found'
                    }));
                }
            } catch (error) {
                res.setHeader('Content-Type', 'application/json');
                res.writeHead(500);
                res.end(JSON.stringify({
                    success: false,
                    error: error.message
                }));
            }
        } 
        // Serve NFT HTML files from temp directory for public preview
        else if (urlPath.startsWith('/temp/')) {
            await serveTempFile(req, res, urlPath);
        }
        // Serve thumbnail images from temp/thumbnails directory
        else if (urlPath.startsWith('/thumbnails/')) {
            const filename = urlPath.replace('/thumbnails/', '');
            const thumbnailPath = path.join(__dirname, 'temp', 'thumbnails', filename);
            
            if (fs.existsSync(thumbnailPath)) {
                const contentType = filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
                res.setHeader('Content-Type', contentType);
                res.writeHead(200);
                const stream = fs.createReadStream(thumbnailPath);
                stream.pipe(res);
            } else {
                res.writeHead(404);
                res.end('Thumbnail not found');
            }
        }
        // Serve static files from public directory
        else {
            await serveStaticFile(req, res, urlPath);
        }
    }
    // Handle unsupported methods
    else {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(405);
        res.end(JSON.stringify({
            success: false,
            error: 'Method not allowed'
        }));
    }
});

// Start server on specified port
server.listen(port, () => {
    console.log(`🚀 Katachi Generator Server started on port ${port}`);
    console.log(`📡 http://localhost:${port}`);

    // Detect environment from NODE_ENV or RAILWAY_ENVIRONMENT
    const environment = process.env.NODE_ENV || process.env.RAILWAY_ENVIRONMENT || 'development';
    console.log(`🔧 Environment: ${environment}`);
    console.log(`🧪 Testing Mode: ${TESTING_MODE ? 'ENABLED' : 'DISABLED'} ${TESTING_MODE ? '(local storage)' : '(Arweave uploads)'}`);

    // Run initial cleanup
    cleanupTempFiles();
    
    // Schedule cleanup every 30 minutes
    const cleanupInterval = setInterval(cleanupTempFiles, 30 * 60 * 1000);
    console.log('🧹 Temp file cleanup scheduled (every 30 minutes, deletes files >60 minutes old)');
    
    // Store interval reference for graceful shutdown
    server.cleanupInterval = cleanupInterval;
});

// Error handling
server.on('error', (error) => {
    console.error('❌ Server error:', error);
});

// Graceful shutdown with proper cleanup
function gracefulShutdown(signal) {
    console.log(`🛑 Received ${signal}, shutting down gracefully...`);
    
    // Clear the cleanup interval first
    if (server.cleanupInterval) {
        clearInterval(server.cleanupInterval);
        console.log('🧹 Cleanup interval cleared');
    }
    
    // Set a timeout to force exit if server doesn't close within 10 seconds
    const forceExitTimeout = setTimeout(() => {
        console.log('⚠️ Force closing server after timeout');
        process.exit(1);
    }, 10000);
    
    server.close(() => {
        clearTimeout(forceExitTimeout);
        console.log('✅ Server closed successfully');
        process.exit(0);
    });
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

module.exports = server;