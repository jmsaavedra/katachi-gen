const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const Arweave = require('arweave');
const { chromium } = require('playwright-core');

// Server port configuration
const port = process.env.PORT || 3000;
const templateHTML = 'index.html';
const arweaveWalletPath = './keys/arweave-wallet.json';
const walletAddress = 'WJBf3OFtVmHVaIwMzIGq4nBseTRobFUiJmc2OW52-Dk';

// Thumbnail configuration
const THUMB_WIDTH = 1024;
const THUMB_HEIGHT = 1024;

// Initialize Arweave
const arweave = Arweave.init({
    host: 'arweave.net',
    port: 443,
    protocol: 'https'
});

// Create HTTP server
const server = http.createServer(async (req, res) => {
    // CORS configuration
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle OPTIONS requests (preflight)
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Get URL and method
    const parsedUrl = url.parse(req.url, true);
    const urlPath = parsedUrl.pathname;
    const method = req.method;

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
                
                // Process POST data here
                console.log('Received data:', data);

                // {
                //  walletAddress:"0x1234567890abcdef", 
                //  images:[
                //        {url:'https://example.com/image1.png'},
                //        {url:'https://example.com/image2.png'},
                //        {url:'https://example.com/image3.png'}
                //   ]}
                // }

                try {
                    // generate thumbnail image
                    console.log('Generating thumbnail...');
                    const thumbnailBuffer = await generateThumbnail(data);
                    console.log('Thumbnail generated, size:', thumbnailBuffer.length, 'bytes');
                    
                    // Save thumbnail (optional)
                    const timestamp = Date.now();
                    const thumbnailFilename = `thumbnail_${timestamp}.png`;
                    await saveThumbnail(thumbnailBuffer, thumbnailFilename);
                    
                    // upload thumbnail to Arweave

                    // load templateHTML file from public directory
                    const templatePath = path.join(__dirname, 'public', templateHTML);
                    const template = fs.readFileSync(templatePath, 'utf-8');
                    const rendered = template.replace('{{dataJson}}', JSON.stringify(data));
                    
                    uploadToArweave(data).then((txId) => {
                        console.log('Uploaded to Arweave:', txId);
                        
                        // Convert thumbnail buffer to base64 for response
                        const thumbnailBase64 = thumbnailBuffer.toString('base64');
                        
                        // Send response
                        res.setHeader('Content-Type', 'application/json');
                        res.writeHead(200);
                        res.end(JSON.stringify({
                            success: true,
                            message: 'NFT generated successfully',
                            txId,
                            html: rendered,
                            thumbnail: {
                                data: thumbnailBase64,
                                type: 'image/png',
                                filename: thumbnailFilename
                            }
                        }));
                    }).catch((error) => {
                        console.error('Error uploading to Arweave:', error);
                        // Send response
                        res.setHeader('Content-Type', 'application/json');
                        res.writeHead(500);
                        res.end(JSON.stringify({
                            success: false,
                            message: 'NFT generation failed',
                            error: error.message
                        }));
                    });
                    
                } catch (thumbnailError) {
                    console.error('Error in thumbnail generation:', thumbnailError);
                    // Send error response
                    res.setHeader('Content-Type', 'application/json');
                    res.writeHead(500);
                    res.end(JSON.stringify({
                        success: false,
                        message: 'Thumbnail generation failed',
                        error: thumbnailError.message
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
        // Check if wallet info is requested
        if (urlPath === '/wallet-info') {
            try {
                // Try to get wallet info if wallet.json exists
                const walletPath = ArweaveWalletPath;
                if (fs.existsSync(walletPath)) {
                    const walletAddress = await getWalletAddress(walletPath);
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

// Function to serve static files from public directory
async function serveStaticFile(req, res, requestPath) {
    try {
        // Remove leading slash and resolve file path
        const cleanPath = requestPath.startsWith('/') ? requestPath.slice(1) : requestPath;
        
        // If requesting root path, serve index.html
        const filePath = cleanPath === '' ? 'index.html' : cleanPath;
        
        // Construct absolute path to file in public directory
        const fullPath = path.join(__dirname, 'public', filePath);
        
        // Security check: ensure the file is within public directory
        const publicDir = path.join(__dirname, 'public');
        const resolvedPath = path.resolve(fullPath);
        if (!resolvedPath.startsWith(publicDir)) {
            res.writeHead(403);
            res.end('Forbidden');
            return;
        }
        
        // Check if file exists
        if (!fs.existsSync(resolvedPath)) {
            // If file not found, serve default status response for root path
            if (cleanPath === '' || cleanPath === 'index.html') {
                res.setHeader('Content-Type', 'application/json');
                res.writeHead(200);
                res.end(JSON.stringify({
                    message: 'Katachi Generator NFT Server',
                    status: 'running',
                    port: port,
                    endpoints: {
                        'POST /': 'Upload data to Arweave',
                        'GET /': 'Server status',
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

// Function to generate thumbnail using Playwright
async function generateThumbnail(data) {
    let browser;
    try {
        // Try to find Chrome/Chromium executable
        const possiblePaths = [
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '/Applications/Chromium.app/Contents/MacOS/Chromium',
            '/usr/bin/chromium',
            '/usr/bin/google-chrome',
            '/usr/bin/chromium-browser'
        ];
        
        let executablePath = null;
        for (const path of possiblePaths) {
            if (fs.existsSync(path)) {
                executablePath = path;
                break;
            }
        }
        
        const launchOptions = {
            headless: true,
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage'
            ]
        };
        
        if (executablePath) {
            launchOptions.executablePath = executablePath;
            console.log('Using Chrome executable:', executablePath);
        } else {
            console.log('Using default Chromium from playwright-core');
        }
        
        // Launch browser in headless mode
        browser = await chromium.launch(launchOptions);
        console.log('Browser launched successfully');
        
        // Create browser context with JavaScript enabled and increased timeouts
        const context = await browser.newContext({
            javaScriptEnabled: true,
            viewport: { width: THUMB_WIDTH, height: THUMB_HEIGHT },
            // より長いタイムアウトを設定
            defaultTimeout: 60000,
            defaultNavigationTimeout: 60000
        });
        console.log('Browser context created with JavaScript enabled');
        
        // Create a new page from the context
        const page = await context.newPage();
        
        // ページレベルのタイムアウトも設定
        page.setDefaultTimeout(60000);
        page.setDefaultNavigationTimeout(60000);
        
        console.log('New page created from context');
        
        // Enable console logging from the page
        page.on('console', msg => {
            console.log('PAGE LOG:', msg.text());
        });
        
        // Enable error logging from the page
        page.on('pageerror', error => {
            console.error('PAGE ERROR:', error);
        });
        
        // Navigate to template HTML via localhost server to load all linked resources
        const templateUrl = `http://localhost:${port}/${templateHTML}`;
        console.log('Navigating to template URL:', templateUrl);
        
        // Navigate to the template page
        await page.goto(templateUrl, { waitUntil: 'networkidle' });
        console.log('Template page loaded, injecting data...');
        
        // Inject data into the page
        await page.evaluate((data) => {
            // Set the data globally so it can be used by the page's JavaScript
            window.nftData = data;
            
            // Trigger any data loading logic if it exists
            if (typeof window.loadNftData === 'function') {
                window.loadNftData(data);
            }
            
            // Also replace any {{dataJson}} placeholders in the DOM
            const elements = document.querySelectorAll('*');
            elements.forEach(el => {
                if (el.textContent && el.textContent.includes('{{dataJson}}')) {
                    el.textContent = el.textContent.replace('{{dataJson}}', JSON.stringify(data));
                }
                if (el.innerHTML && el.innerHTML.includes('{{dataJson}}')) {
                    el.innerHTML = el.innerHTML.replace('{{dataJson}}', JSON.stringify(data));
                }
            });
        }, data);
        
        console.log('Data injected, waiting for JavaScript execution...');
        
        // 複数の待機戦略を試行
        try {
            // 戦略1: DOM要素の存在を確認
            await page.waitForSelector('#walletAddress', { timeout: 10000 });
            console.log('Key elements found');
            
            // 戦略2: カスタムフラグを待つ（優先戦略）
            try {
                console.log('Waiting for nftRenderComplete flag...');
                await page.waitForFunction(() => {
                    console.log('Checking nftRenderComplete flag:', window.nftRenderComplete);
                    return window.nftRenderComplete === true;
                }, { timeout: 30000, polling: 500 }); // 500ms間隔でチェック
                console.log('✅ nftRenderComplete flag confirmed - rendering complete!');
                
                // nftRenderCompleteがtrueになったら、短い待機のみ
                await page.waitForTimeout(1000); // 1秒のみ
                console.log('Short stabilization wait completed');
                
            } catch (flagError) {
                console.log('Flag wait failed, proceeding with element-based wait:', flagError.message);
                
                // 戦略3: 要素の内容が更新されていることを確認
                await page.waitForFunction(() => {
                    const walletElement = document.getElementById('walletAddress');
                    return walletElement && !walletElement.textContent.includes('Loading...');
                }, { timeout: 10000 });
                console.log('Content update confirmed');
                
                // フォールバック待機
                await page.waitForTimeout(2000);
            }
            
        } catch (waitError) {
            console.log('Advanced wait strategies failed, using fallback:', waitError.message);
            // フォールバック: 固定時間待機
            await page.waitForTimeout(5000);
            console.log('Fallback wait completed');
        }
        
        // Take screenshot
        const screenshotBuffer = await page.screenshot({
            type: 'png',
            fullPage: false // Only capture viewport
        });
        
        console.log('Thumbnail generated successfully');
        return screenshotBuffer;
        
    } catch (error) {
        console.error('Error generating thumbnail:', error);
        throw error;
    } finally {
        // Close browser
        if (browser) {
            await browser.close();
        }
    }
}

// Function to save thumbnail to file (optional)
async function saveThumbnail(buffer, filename) {
    try {
        const thumbnailPath = path.join(__dirname, 'thumbnails', filename);
        
        // Create thumbnails directory if it doesn't exist
        const thumbnailsDir = path.dirname(thumbnailPath);
        if (!fs.existsSync(thumbnailsDir)) {
            fs.mkdirSync(thumbnailsDir, { recursive: true });
        }
        
        fs.writeFileSync(thumbnailPath, buffer);
        console.log('Thumbnail saved to:', thumbnailPath);
        return thumbnailPath;
    } catch (error) {
        console.error('Error saving thumbnail:', error);
        throw error;
    }
}

function uploadToArweave(data) {
    return new Promise(async (resolve, reject) => {
        try {
            // Convert data to string for upload
            const dataString = JSON.stringify(data);
            
            // Create a transaction
            const transaction = await arweave.createTransaction({
                data: dataString
            });
            
            // Add tags to the transaction
            transaction.addTag('Content-Type', 'application/json');
            transaction.addTag('App-Name', 'Katachi-Generator');
            transaction.addTag('App-Version', '1.0.0');
            transaction.addTag('Type', 'NFT-Metadata');
            
            // Load wallet key file (you need to have a wallet.json file)
            // For now, we'll use a mock implementation since wallet setup is required
            console.log('Note: Wallet configuration required for actual Arweave upload');
            console.log('Transaction prepared for data:', dataString.substring(0, 100) + '...');
            
            // Simulate the transaction ID for development
            // In production, you would sign and post the transaction:
            // await arweave.transactions.sign(transaction, walletKey);
            // const response = await arweave.transactions.post(transaction);
            // resolve(transaction.id);
            
            // For development, return a mock transaction ID
            const mockTxId = 'arweave_tx_' + Date.now() + '_' + Math.random().toString(36).substring(7);
            
            setTimeout(() => {
                resolve(mockTxId);
            }, 1000);
            
        } catch (error) {
            console.error('Error creating Arweave transaction:', error);
            reject(error);
        }
    });
}

// Function to get wallet address from key file
async function getWalletAddress(walletPath) {
    try {
        // Load wallet key
        const walletKey = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
        
        // Get wallet address from the key
        const walletAddress = await arweave.wallets.jwkToAddress(walletKey);
        
        return walletAddress;
    } catch (error) {
        console.error('Error getting wallet address:', error);
        throw error;
    }
}

// Function to get wallet address from key object
async function getWalletAddressFromKey(walletKey) {
    try {
        // Get wallet address from the key object
        const walletAddress = await arweave.wallets.jwkToAddress(walletKey);
        
        return walletAddress;
    } catch (error) {
        console.error('Error getting wallet address from key:', error);
        throw error;
    }
}

// Function to get wallet balance
async function getWalletBalance(walletAddress) {
    try {
        // Get balance in winston (smallest unit of AR)
        const balanceWinston = await arweave.wallets.getBalance(walletAddress);
        
        // Convert winston to AR
        const balanceAR = arweave.ar.winstonToAr(balanceWinston);
        
        return {
            winston: balanceWinston,
            ar: balanceAR
        };
    } catch (error) {
        console.error('Error getting wallet balance:', error);
        throw error;
    }
}

// Function to upload to Arweave with actual wallet (for production use)
async function uploadToArweaveWithWallet(data, walletPath) {
    try {
        // Load wallet key
        const walletKey = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
        
        // Get wallet address
        const walletAddress = await getWalletAddressFromKey(walletKey);
        console.log('Using wallet address:', walletAddress);
        
        // Check wallet balance
        const balance = await getWalletBalance(walletAddress);
        console.log('Wallet balance:', balance.ar, 'AR');
        
        // Convert data to string for upload
        const dataString = JSON.stringify(data);
        
        // Create a transaction
        const transaction = await arweave.createTransaction({
            data: dataString
        }, walletKey);
        
        // Add tags to the transaction
        transaction.addTag('Content-Type', 'application/json');
        transaction.addTag('App-Name', 'Katachi-Generator');
        transaction.addTag('App-Version', '1.0.0');
        transaction.addTag('Type', 'NFT-Metadata');
        
        // Sign the transaction
        await arweave.transactions.sign(transaction, walletKey);
        
        // Post the transaction
        const response = await arweave.transactions.post(transaction);
        
        if (response.status === 200) {
            console.log('Successfully uploaded to Arweave:', transaction.id);
            return transaction.id;
        } else {
            throw new Error(`Upload failed with status: ${response.status}`);
        }
        
    } catch (error) {
        console.error('Error uploading to Arweave:', error);
        throw error;
    }
}

// Start server on specified port
server.listen(port, () => {
    console.log(`Server started on port ${port}`);
    console.log(`http://localhost:${port}`);
});

// Error handling
server.on('error', (error) => {
    console.error('Server error:', error);
});

module.exports = server;
