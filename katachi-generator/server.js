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
const { handlePatternGeneration } = require('./handlers/pattern');
const { handleTestTemplate, handleTestAPI } = require('./handlers/testTemplate');

// Import utilities
const { loadArweaveWallet, getWalletAddress, getWalletBalance } = require('./utils/wallet');
const { serveStaticFile, serveTempFile, cleanupTempFiles } = require('./utils/fileServer');

// Import queue system (may be null if Redis not available)
const { generationQueue } = require('./queue/generationQueue');

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
                } else if ((urlPath === '/' || urlPath === '') && generationQueue) {
                    // NEW: Queue-based generation (default if queue available)
                    const jobId = uuidv4();

                    console.log(`🎯 Queuing generation job: ${jobId}`);

                    try {
                        // Add job to queue
                        const job = await generationQueue.add({
                            jobId,
                            ...data
                        }, {
                            jobId, // Use custom jobId for easier tracking
                        });

                        console.log(`✅ Job ${jobId} added to queue`);

                        res.setHeader('Content-Type', 'application/json');
                        res.writeHead(202); // Accepted
                        res.end(JSON.stringify({
                            success: true,
                            jobId: job.id,
                            status: 'queued',
                            message: 'Job queued for processing',
                            statusUrl: `/job/${job.id}`,
                        }));
                    } catch (queueError) {
                        console.error('❌ Failed to add job to queue:', queueError);

                        // Fallback to direct processing
                        console.warn('⚠️  Falling back to direct processing');
                        await handlePatternGeneration(req, res, data);
                    }
                } else if ((urlPath === '/' || urlPath === '') && !generationQueue) {
                    // Fallback: Direct processing if queue not available
                    console.warn('⚠️  Queue not available - processing directly');
                    await handlePatternGeneration(req, res, data);
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
        // NEW: Job status endpoint
        if (urlPath.startsWith('/job/')) {
            const pathParts = urlPath.split('/');
            const jobId = pathParts[2];
            const includeDetails = urlPath.includes('/details');

            if (!generationQueue) {
                res.setHeader('Content-Type', 'application/json');
                res.writeHead(503);
                res.end(JSON.stringify({
                    error: 'Queue not available',
                    message: 'Queue system is not enabled on this server'
                }));
                return;
            }

            try {
                const job = await generationQueue.getJob(jobId);

                if (!job) {
                    res.setHeader('Content-Type', 'application/json');
                    res.writeHead(404);
                    res.end(JSON.stringify({
                        error: 'Job not found',
                        jobId: jobId
                    }));
                    return;
                }

                const state = await job.getState();
                const progress = job._progress || 0;

                // Always get recent logs for progress tracking (last 10 entries)
                const jobLogs = await generationQueue.getJobLogs(jobId);
                const recentLogs = jobLogs?.logs ? jobLogs.logs.slice(-10) : [];

                const response = {
                    jobId: job.id,
                    status: state,
                    progress,
                    attemptsMade: job.attemptsMade,
                    data: includeDetails ? job.data : undefined,
                    result: state === 'completed' ? job.returnvalue : undefined,
                    failedReason: state === 'failed' ? job.failedReason : undefined,
                    logs: recentLogs, // Always include recent logs for progress messages
                    timestamp: job.timestamp,
                };

                res.setHeader('Content-Type', 'application/json');
                res.writeHead(200);
                res.end(JSON.stringify(response));

            } catch (error) {
                console.error('Error fetching job status:', error);
                res.setHeader('Content-Type', 'application/json');
                res.writeHead(500);
                res.end(JSON.stringify({
                    error: 'Failed to fetch job status',
                    message: error.message
                }));
            }
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