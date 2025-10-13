// Main server file for Katachi Generator
require('dotenv').config();
const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs');
const { port, TESTING_MODE } = require('./config');

// Import handlers
const { handleMetadataUpload } = require('./handlers/metadata');
const { handlePatternGeneration } = require('./handlers/pattern');
const { handleTestTemplate, handleTestAPI } = require('./handlers/testTemplate');

// Import utilities
const { loadArweaveWallet, getWalletAddress, getWalletBalance } = require('./utils/wallet');
const { serveStaticFile, serveTempFile, cleanupTempFiles } = require('./utils/fileServer');

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
                
                // Route POST requests based on URL path
                if (urlPath === '/upload-metadata') {
                    await handleMetadataUpload(req, res, data);
                } else if (urlPath === '/' || urlPath === '') {
                    // Original pattern generation endpoint
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
        // Test routes for modular template system
        if (urlPath === '/test-template') {
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
    console.log(`🔧 Environment: NODE_ENV=${process.env.NODE_ENV || 'undefined'}`);
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