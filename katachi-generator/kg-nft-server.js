const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const Arweave = require('arweave');
const { chromium } = require('playwright-core');
const { uploadFileToArweave } = require('./arweave-uploader');

// Server port configuration
const port = process.env.PORT || 3001;
const templateHTML = 'template.html';
const arweaveWalletPath = process.env.NODE_ENV === 'production' 
  ? '../keys/arweave-wallet.json'
  : './keys/arweave-wallet.json';
const walletAddress = 'WJBf3OFtVmHVaIwMzIGq4nBseTRobFUiJmc2OW52-Dk';

// Wallet loading with environment variable support
function loadArweaveWallet() {
    try {
        // Try environment variable first (for Railway/production)
        if (process.env.ARWEAVE_WALLET) {
            console.log('Loading Arweave wallet from environment variable');
            return JSON.parse(process.env.ARWEAVE_WALLET);
        }
        // Fall back to file (for local development)
        if (fs.existsSync(arweaveWalletPath)) {
            console.log('Loading Arweave wallet from file:', arweaveWalletPath);
            return JSON.parse(fs.readFileSync(arweaveWalletPath, 'utf8'));
        }
        throw new Error('No Arweave wallet found in environment or file');
    } catch (error) {
        console.error('Error loading Arweave wallet:', error);
        return null;
    }
}

// Thumbnail configuration
const THUMB_WIDTH = 1024;
const THUMB_HEIGHT = 1024;

// Initialize Arweave
const arweave = Arweave.init({
    host: 'arweave.net',
    port: 443,
    protocol: 'https'
});

const origamiPatterns = [
    {url:"https://arweave.net/DEwA5RuJrMaZo4tHYmtKXV0gPXHJBC0p16HbhFqA15k", maxFolding:95, name:"airplane.svg", patternType:"Airplane"},
    {url:"https://arweave.net/aeUK83c7uqmpWCUwwwv0Ao-_Ttxs_9XMcrznkjwXOqs", maxFolding:100, name:"birdBase.svg", patternType:"Cubic"},
    {url:"https://arweave.net/l-mOj-cl7LGG7IjNWnZv1LIFLM_no_6gisnK53XD9Os", maxFolding:70, name:"hypar.svg", patternType:"Hypar"},
    {url:"https://arweave.net/G3TfyqgWOlSdxjluMhnhswxZANT4waZdBh69HwllFCQ", maxFolding:80, name:"pinwheelBase.svg", patternType:"Pinwheel"},
    {url:"https://arweave.net/4Y1SaF832toY5ac9fXqkQlaN_xmGqGWaOfcj0txzyg0", maxFolding:97, name:"traditionalCrane.svg", patternType:"Crane"},
    {url:"https://arweave.net/59F93UIm1IJCWflSrWq_IsENxzvllCxz5QtwBky4xGM", maxFolding:70, name:"FTpoly7.svg", patternType:"Flower"},
];

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
                // seed2:`${Math.floor(Math.random() * 1000)}`,
                //  patternType:"",
                //  images:[
                //        {url:'https://example.com/image1.png'},
                //        {url:'https://example.com/image2.png'},
                //        {url:'https://example.com/image3.png'}
                //   ]}
                // }

                // Select random origami pattern if not specified
                if (!data.patternType || data.patternType === "") {
                    const randomIndex = Math.floor(Math.random() * origamiPatterns.length);
                    const selectedPattern = origamiPatterns[randomIndex];
                    data.patternType = selectedPattern.patternType;
                    console.log('🎲 Selected random origami pattern:', selectedPattern.patternType, 'from', selectedPattern.name);
                } else {
                    console.log('📋 Using provided pattern type:', data.patternType);
                }

                try {
                    // generate thumbnail image
                    console.log('Generating thumbnail...');
                    const thumbnailBuffer = await generateThumbnail(data);
                    console.log('Thumbnail generated, size:', thumbnailBuffer.length, 'bytes');
                    
                    // Save thumbnail (optional)
                    const timestamp = Date.now();
                    const thumbnailFilename = `thumbnail_${timestamp}.png`;
                    const thumbnailPath = await saveThumbnail(thumbnailBuffer, thumbnailFilename);
                    
                    // load templateHTML file from public directory
                    const templatePath = path.join(__dirname, 'public', templateHTML);
                    const template = fs.readFileSync(templatePath, 'utf-8');
                    const rendered = template.replace('{dataJson}', JSON.stringify(data));
                    
                    // Upload thumbnail to Arweave
                    console.log('Uploading thumbnail to Arweave...');
                    const thumbnailTxId = await uploadFileToArweave(thumbnailPath, arweaveWalletPath);
                    console.log('Thumbnail uploaded to Arweave:', thumbnailTxId);
                    
                    // Create temporary HTML file for upload
                    const htmlFilename = `nft_${timestamp}.html`;
                    const htmlPath = path.join(__dirname, 'temp', htmlFilename);
                    
                    // Create temp directory if it doesn't exist
                    const tempDir = path.dirname(htmlPath);
                    if (!fs.existsSync(tempDir)) {
                        fs.mkdirSync(tempDir, { recursive: true });
                    }
                    
                    // Write HTML to temporary file
                    fs.writeFileSync(htmlPath, rendered, 'utf-8');
                    
                    // Upload HTML to Arweave
                    console.log('Uploading HTML to Arweave...');
                    const htmlTxId = await uploadFileToArweave(htmlPath, arweaveWalletPath);
                    console.log('HTML uploaded to Arweave:', htmlTxId);
                    
                    // Clean up temporary HTML file
                    try {
                        fs.unlinkSync(htmlPath);
                    } catch (cleanupError) {
                        console.warn('Could not clean up temporary HTML file:', cleanupError.message);
                    }
                    
                    // Send response with both transaction IDs
                    res.setHeader('Content-Type', 'application/json');
                    res.writeHead(200);
                    res.end(JSON.stringify({
                        success: true,
                        message: 'NFT generated and uploaded successfully',
                        thumbnailId: thumbnailTxId,
                        htmlId: htmlTxId,
                        thumbnailUrl: `https://arweave.net/${thumbnailTxId}`,
                        htmlUrl: `https://arweave.net/${htmlTxId}`,
                        patternType: data.patternType
                    }));
                    
                } catch (uploadError) {
                    console.error('Error in NFT generation or upload process:', uploadError);
                    console.error('Error details:', {
                        message: uploadError.message,
                        stack: uploadError.stack,
                        timestamp: new Date().toISOString()
                    });
                    
                    // Send response
                    res.setHeader('Content-Type', 'application/json');
                    res.writeHead(500);
                    res.end(JSON.stringify({
                        success: false,
                        message: 'NFT generation or upload failed',
                        error: uploadError.message
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
            console.log('🔧 Injecting NFT data into page:', data);
            
            // Set the data globally so it can be used by the page's JavaScript
            window.nftData = data;
            
            // Also override the local nftData variable if it exists
            if (typeof window.nftData !== 'undefined') {
                window.nftData = data;
            }
            
            // Trigger any data loading logic if it exists
            if (typeof window.loadNftData === 'function') {
                console.log('🔧 Triggering loadNftData function');
                window.loadNftData(data);
            }
            
            // Log for debugging
            console.log('✅ NFT data injection complete');
            console.log('📊 Final window.nftData:', window.nftData);
            
            // // Also replace any {{dataJson}} placeholders in the DOM
            // const elements = document.querySelectorAll('*');
            // elements.forEach(el => {
            //     if (el.textContent && el.textContent.includes('{{dataJson}}')) {
            //         el.textContent = el.textContent.replace('{{dataJson}}', JSON.stringify(data));
            //     }
            //     if (el.innerHTML && el.innerHTML.includes('{{dataJson}}')) {
            //         el.innerHTML = el.innerHTML.replace('{{dataJson}}', JSON.stringify(data));
            //     }
            // });
        }, data);
        
        console.log('Data injected, waiting for JavaScript execution...');
        
        // コンソールメッセージを監視
        let renderingComplete = false;
        let origamiVisible = false;
        
        page.on('console', (msg) => {
            const text = msg.text();
            console.log('Browser console:', text);
            
            // レンダリング完了を示すメッセージを監視
            if (text.includes('NFT processing completed - reset isNFTProcessing flag') ||
                text.includes('Show origami object now that textures are applied') ||
                text.includes('Triggered control visibility sequence')) {
                renderingComplete = true;
                console.log('🎯 Rendering completion detected via console message');
            }
            
            // origamiが表示されたことを示すメッセージを監視
            if (text.includes('showOrigami') || text.includes('origami object now visible')) {
                origamiVisible = true;
                console.log('👁️ Origami visibility confirmed via console message');
            }
        });
        
        // 複数の待機戦略を試行 - 最優先でコンソールメッセージを監視
        let screenshotTaken = false;
        let screenshotBuffer = null;
        
        // コンソールメッセージ検出でのスクリーンショット関数
        const takeScreenshotOnDetection = async () => {
            if (screenshotTaken) {
                console.log('🔄 Screenshot already taken, skipping detection capture');
                return screenshotBuffer;
            }
            
            try {
                console.log('📸 IMMEDIATE CAPTURE - Console message detected');
                
                // スクリーンショット撮影前の状態確認
                const preScreenshotState = await page.evaluate(() => {
                    const controlsBottom = document.getElementById('controlsBottom');
                    const controlsVisible = controlsBottom ? controlsBottom.style.display !== 'none' : 'element not found';
                    
                    return {
                        timestamp: new Date().toISOString(),
                        renderingComplete: window.renderingComplete,
                        nftRenderComplete: window.nftRenderComplete,
                        controlsBottomDisplay: controlsBottom ? controlsBottom.style.display : 'not found',
                        controlsVisible: controlsVisible,
                        walletText: document.getElementById('walletAddress')?.textContent?.substring(0, 50) || 'not found'
                    };
                });
                
                console.log('📸 SCREENSHOT TIMING - Immediate capture state:', JSON.stringify(preScreenshotState, null, 2));
                
                // Take screenshot immediately
                console.log('📸 Taking screenshot immediately after detection...');
                const buffer = await page.screenshot({
                    type: 'png',
                    fullPage: false
                });
                
                if (buffer && buffer.length > 0) {
                    screenshotTaken = true;
                    screenshotBuffer = buffer; // グローバル変数に保存
                    console.log('📸 Screenshot captured successfully at:', new Date().toISOString());
                    console.log('✅ Screenshot buffer saved, size:', buffer.length, 'bytes');
                    return buffer;
                } else {
                    throw new Error('Screenshot buffer is empty or invalid');
                }
            } catch (error) {
                console.error('Error in takeScreenshotOnDetection:', error);
                // エラーの場合はフラグをリセットしない（他の手法で再試行を防ぐため）
                screenshotTaken = false;
                throw error;
            }
        };
        
        // コンソールメッセージリスナーを設定（最優先）
        let consoleProcessing = false; // 重複処理を防ぐフラグ
        page.on('console', async (msg) => {
            const text = msg.text();
            console.log('Browser console:', text);
            
            // レンダリング完了を示すメッセージを検出したら即座にスクリーンショット
            if (text.includes('Set window.renderingComplete = true for thumbnail detection') ||
                text.includes('Showing origami object - textures applied')) {
                console.log('🎯 Rendering completion detected via console message');
                
                // すでに成功している場合、または処理中の場合はスキップ
                if (screenshotTaken) {
                    console.log('🔄 Screenshot already taken, skipping console-triggered capture');
                    return;
                }
                
                if (consoleProcessing) {
                    console.log('🔄 Console processing already in progress, skipping duplicate');
                    return;
                }
                
                try {
                    consoleProcessing = true;
                    const result = await takeScreenshotOnDetection();
                    if (result) {
                        console.log('✅ Thumbnail generated successfully via console detection');
                    }
                } catch (error) {
                    console.error('Error taking immediate screenshot:', error);
                    // エラーが発生してもプロセスは継続
                } finally {
                    consoleProcessing = false;
                }
            }
        });
        
        try {
            // 戦略1: より短いタイムアウトでDOM要素を確認
            await page.waitForSelector('#walletAddress', { timeout: 3000 });
            console.log('Key elements found');
            
            // 短い待機でコンソールメッセージ検出を待つ
            console.log('Waiting for console message detection...');
            await page.waitForTimeout(2000); // 2秒待機してコンソールメッセージを待つ
            
            // 戦略2: コンソールメッセージベースの待機（最優先）
            try {
                console.log('Waiting for rendering completion via console messages...');
                
                // より短いタイムアウトで、高速チェック
                await page.waitForFunction(() => {
                    return window.renderingComplete === true;
                }, { timeout: 3000, polling: 100 });
                
                console.log('✅ Rendering completion confirmed via renderingComplete flag!');
                
                // まだスクリーンショットが撮られていない場合のみ撮影
                if (!screenshotTaken) {
                    console.log('🔍 Flag-based detection triggered, taking screenshot...');
                    await takeScreenshotOnDetection();
                    console.log('✅ Thumbnail generated successfully via flag detection');
                } else {
                    console.log('🔄 Screenshot already taken, skipping flag-triggered capture');
                }
                
            } catch (consoleError) {
                console.log('Console-based wait failed, trying alternative approach:', consoleError.message);
                
                // 戦略3: nftRenderCompleteフラグ（短縮タイムアウト）
                try {
                    await page.waitForFunction(() => {
                        return window.nftRenderComplete === true;
                    }, { timeout: 2000, polling: 100 });
                    
                    console.log('🎯 STRATEGY SUCCESS: nftRenderComplete flag detection');
                    
                    if (!screenshotTaken) {
                        console.log('🔍 NFT flag-based detection triggered, taking screenshot...');
                        await takeScreenshotOnDetection();
                        console.log('✅ Thumbnail generated successfully via nft flag');
                    } else {
                        console.log('🔄 Screenshot already taken, skipping nft flag-triggered capture');
                    }
                    
                } catch (flagError) {
                    console.log('Flag wait also failed, proceeding with minimal wait:', flagError.message);
                    console.log('🎯 STRATEGY: Minimal timeout');
                    await page.waitForTimeout(1000); // 1秒に短縮
                    console.log('📸 Taking screenshot after minimal wait');
                }
            }
            
        } catch (waitError) {
            console.log('Wait strategies failed, using minimal fallback:', waitError.message);
            console.log('🎯 STRATEGY: Minimal fallback timeout');
            await page.waitForTimeout(1000); // 1秒に短縮
            console.log('📸 Minimal fallback wait completed - taking screenshot');
        }
        
        // フォールバック: まだスクリーンショットが撮られていない場合のみ撮影
        if (!screenshotTaken) {
            console.log('📸 Final fallback: Taking screenshot as last resort...');
            
            // スクリーンショット撮影前の状態確認
            const preScreenshotState = await page.evaluate(() => {
                const controlsBottom = document.getElementById('controlsBottom');
                const controlsVisible = controlsBottom ? controlsBottom.style.display !== 'none' : 'element not found';
                
                return {
                    timestamp: new Date().toISOString(),
                    renderingComplete: window.renderingComplete,
                    nftRenderComplete: window.nftRenderComplete,
                    controlsBottomDisplay: controlsBottom ? controlsBottom.style.display : 'not found',
                    controlsVisible: controlsVisible,
                    walletText: document.getElementById('walletAddress')?.textContent?.substring(0, 50) || 'not found'
                };
            });
            
            console.log('📸 SCREENSHOT TIMING - Fallback capture state:', JSON.stringify(preScreenshotState, null, 2));
            
            try {
                // Take screenshot
                console.log('📸 Taking fallback screenshot NOW...');
                const fallbackBuffer = await page.screenshot({
                    type: 'png',
                    fullPage: false
                });
                
                if (fallbackBuffer && fallbackBuffer.length > 0) {
                    screenshotBuffer = fallbackBuffer;
                    screenshotTaken = true; // マークして重複を防ぐ
                    console.log('📸 Screenshot captured successfully at:', new Date().toISOString());
                    console.log('✅ Thumbnail generated successfully via fallback, size:', fallbackBuffer.length, 'bytes');
                } else {
                    throw new Error('Fallback screenshot buffer is empty or invalid');
                }
            } catch (fallbackError) {
                console.error('❌ Fallback screenshot failed:', fallbackError);
                throw new Error(`All screenshot attempts failed. Last error: ${fallbackError.message}`);
            }
        } else {
            console.log('🔄 Screenshot already taken successfully, skipping fallback');
        }
        
        // 最終的にscreenshotBufferを返す
        console.log('📊 Final screenshot status check:');
        console.log('  - screenshotTaken:', screenshotTaken);
        console.log('  - screenshotBuffer exists:', !!screenshotBuffer);
        console.log('  - screenshotBuffer type:', typeof screenshotBuffer);
        if (screenshotBuffer) {
            console.log('  - screenshotBuffer size:', screenshotBuffer.length, 'bytes');
        }
        
        if (screenshotBuffer && screenshotBuffer.length > 0) {
            console.log('✅ Returning screenshot buffer, size:', screenshotBuffer.length, 'bytes');
            return screenshotBuffer;
        } else {
            console.error('❌ Screenshot buffer is null or empty after all attempts');
            throw new Error('Failed to generate screenshot - buffer is empty after all capture attempts');
        }
        
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
async function getWalletAddress(walletPath = null) {
    try {
        // Load wallet key using the new function
        const walletKey = loadArweaveWallet();
        if (!walletKey) {
            throw new Error('Arweave wallet not available');
        }
        
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
async function uploadToArweaveWithWallet(data, walletPath = null) {
    try {
        // Load wallet key using the new function
        const walletKey = loadArweaveWallet();
        if (!walletKey) {
            throw new Error('Arweave wallet not available');
        }
        
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
