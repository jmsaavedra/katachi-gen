// Static file and temp file serving utilities
const fs = require('fs');
const path = require('path');

/**
 * Serve static files from public directory
 */
async function serveStaticFile(req, res, requestPath) {
    try {
        // Remove leading slash and resolve file path
        const cleanPath = requestPath.startsWith('/') ? requestPath.slice(1) : requestPath;
        
        // If requesting root path, serve index.html
        const filePath = cleanPath === '' ? 'index.html' : cleanPath;
        
        // Construct absolute path to file in public directory
        const fullPath = path.join(__dirname, '..', 'public', filePath);
        const resolvedPath = path.resolve(fullPath);
        
        // Security check: ensure the resolved path is within public directory
        const publicDir = path.resolve(path.join(__dirname, '..', 'public'));
        if (!resolvedPath.startsWith(publicDir)) {
            res.writeHead(403);
            res.end('Access denied');
            return;
        }
        
        // Check if file exists
        if (!fs.existsSync(resolvedPath)) {
            // If it's a request for root and index.html doesn't exist, show directory listing
            if (cleanPath === '' || cleanPath === 'index.html') {
                res.setHeader('Content-Type', 'application/json');
                res.writeHead(200);
                res.end(JSON.stringify({
                    message: 'Katachi Generator Server',
                    status: 'running',
                    endpoints: {
                        'POST /': 'Generate Katachi NFT pattern',
                        'POST /upload-metadata': 'Upload metadata to Arweave',
                        'GET /wallet-info': 'Wallet information',
                        'GET /<filename>': 'Serve static files from public directory'
                    }
                }));
                return;
            } else {
                res.writeHead(404);
                res.end('File not found');
                return;
            }
        }
        
        // Get file stats
        const stats = fs.statSync(resolvedPath);
        
        // If it's a directory, return 403
        if (stats.isDirectory()) {
            res.writeHead(403);
            res.end('Directory listing not allowed');
            return;
        }
        
        // Determine content type based on file extension
        const ext = path.extname(resolvedPath).toLowerCase();
        const contentTypeMap = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon',
            '.txt': 'text/plain',
            '.pdf': 'application/pdf',
            '.zip': 'application/zip',
            '.stl': 'application/sla',
            '.obj': 'application/octet-stream'
        };
        
        const contentType = contentTypeMap[ext] || 'application/octet-stream';
        
        // Set headers
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', stats.size);
        
        // Create read stream and pipe to response
        const readStream = fs.createReadStream(resolvedPath);
        readStream.pipe(res);
        
        readStream.on('error', (error) => {
            console.error('Error reading file:', error);
            if (!res.headersSent) {
                res.writeHead(500);
                res.end('Internal server error');
            }
        });
        
    } catch (error) {
        console.error('Error serving static file:', error);
        if (!res.headersSent) {
            res.writeHead(500);
            res.end('Internal server error');
        }
    }
}

/**
 * Serve NFT HTML files from temp directory for public preview
 */
async function serveTempFile(req, res, requestPath) {
    try {
        // Remove leading slash and extract filename from /temp/filename.html
        const cleanPath = requestPath.startsWith('/') ? requestPath.slice(1) : requestPath;
        
        // Extract path from temp/...
        const tempPath = cleanPath.replace('temp/', '');
        
        // Security check: only allow .html files and no path traversal
        if (!tempPath.endsWith('.html') || tempPath.includes('..')) {
            res.writeHead(403);
            res.end('Access denied');
            return;
        }
        
        // Support both old (temp/file.html) and new (temp/html/file.html) structure
        let tempFilePath;
        if (tempPath.startsWith('html/')) {
            // New structure: temp/html/filename.html
            const filename = tempPath.replace('html/', '');
            tempFilePath = path.join(__dirname, '..', 'temp', 'html', filename);
        } else {
            // Old structure: temp/filename.html (for backward compatibility)
            tempFilePath = path.join(__dirname, '..', 'temp', tempPath);
        }
        
        // Check if file exists
        if (!fs.existsSync(tempFilePath)) {
            res.writeHead(404);
            res.end('NFT preview not found');
            return;
        }
        
        // Get file stats
        const stats = fs.statSync(tempFilePath);
        
        // Set headers for HTML content
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Length', stats.size);
        res.setHeader('Cache-Control', 'no-cache'); // Don't cache temp files
        
        // Create read stream and pipe to response
        const readStream = fs.createReadStream(tempFilePath);
        readStream.pipe(res);
        
        readStream.on('error', (error) => {
            console.error('Error reading temp file:', error);
            if (!res.headersSent) {
                res.writeHead(500);
                res.end('Error loading NFT preview');
            }
        });
        
        console.log('📄 Served NFT preview:', tempPath);
        
    } catch (error) {
        console.error('Error serving temp file:', error);
        if (!res.headersSent) {
            res.writeHead(500);
            res.end('Error loading NFT preview');
        }
    }
}

/**
 * Clean up old temp files (older than 60 minutes)
 */
function cleanupTempFiles() {
    try {
        const tempHtmlDir = path.join(__dirname, '..', 'temp', 'html');
        const tempDir = path.join(__dirname, '..', 'temp'); // For backward compatibility
        const thumbnailsDir = path.join(__dirname, '..', 'temp', 'thumbnails');
        
        let totalDeleted = 0;
        const now = Date.now();
        const maxAge = 60 * 60 * 1000; // 60 minutes in milliseconds
        
        // Clean temp HTML files from new structure
        if (!fs.existsSync(tempHtmlDir)) {
            console.log('🧹 Temp HTML directory does not exist, creating it...');
            fs.mkdirSync(tempHtmlDir, { recursive: true });
        } else {
            const files = fs.readdirSync(tempHtmlDir);
            let deletedCount = 0;
            
            for (const file of files) {
                if (!file.endsWith('.html')) continue;
                
                const filePath = path.join(tempHtmlDir, file);
                const stats = fs.statSync(filePath);
                const age = now - stats.mtime.getTime();
                
                if (age > maxAge) {
                    try {
                        fs.unlinkSync(filePath);
                        deletedCount++;
                        console.log(`🗑️ Deleted old temp HTML: ${file} (${Math.round(age / 1000 / 60)} minutes old)`);
                    } catch (error) {
                        console.error(`❌ Failed to delete temp file ${file}:`, error.message);
                    }
                }
            }
            totalDeleted += deletedCount;
            console.log(`🧹 Temp HTML cleanup: ${deletedCount} files deleted (${files.length} total checked)`);
        }
        
        // Also clean old temp directory for backward compatibility
        if (fs.existsSync(tempDir)) {
            const files = fs.readdirSync(tempDir).filter(f => f.endsWith('.html'));
            let deletedCount = 0;
            
            for (const file of files) {
                if (!file.endsWith('.html')) continue; // Only process HTML files
                
                const filePath = path.join(tempDir, file);
                const stats = fs.statSync(filePath);
                const age = now - stats.mtime.getTime();
                
                if (age > maxAge) {
                    try {
                        fs.unlinkSync(filePath);
                        deletedCount++;
                        console.log(`🗑️ Deleted old temp HTML: ${file} (${Math.round(age / 1000 / 60)} minutes old)`);
                    } catch (error) {
                        console.error(`❌ Failed to delete temp file ${file}:`, error.message);
                    }
                }
            }
            totalDeleted += deletedCount;
            console.log(`🧹 Temp cleanup: ${deletedCount} HTML files deleted (${files.length} total checked)`);
        }
        
        // Clean thumbnail PNG files  
        if (!fs.existsSync(thumbnailsDir)) {
            console.log('🧹 Thumbnails directory does not exist, creating it...');
            fs.mkdirSync(thumbnailsDir, { recursive: true });
        } else {
            const files = fs.readdirSync(thumbnailsDir);
            let deletedCount = 0;
            
            for (const file of files) {
                if (!file.endsWith('.png')) continue; // Only process PNG files
                
                const filePath = path.join(thumbnailsDir, file);
                const stats = fs.statSync(filePath);
                const age = now - stats.mtime.getTime();
                
                if (age > maxAge) {
                    try {
                        fs.unlinkSync(filePath);
                        deletedCount++;
                        console.log(`🗑️ Deleted old thumbnail: ${file} (${Math.round(age / 1000 / 60)} minutes old)`);
                    } catch (error) {
                        console.error(`❌ Failed to delete thumbnail ${file}:`, error.message);
                    }
                }
            }
            totalDeleted += deletedCount;
            console.log(`🧹 Thumbnails cleanup: ${deletedCount} PNG files deleted (${files.length} total checked)`);
        }
        
        if (totalDeleted > 0) {
            console.log(`✅ Cleanup completed: ${totalDeleted} total files deleted`);
        } else {
            console.log('✅ No files needed cleanup');
        }
        
    } catch (error) {
        console.error('❌ Error during file cleanup:', error.message);
    }
}

module.exports = {
    serveStaticFile,
    serveTempFile,
    cleanupTempFiles
};