// Test script to load HTML from URL and capture thumbnail
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

async function testHTMLUrl() {
    const testUrl = 'https://storage.katachi-gen.com/kg_flower-0xee49f82e58a1c2b306720d0c68047cbf70c11fb5-1756779759839.html';
    
    let browser;
    try {
        console.log('🧪 Testing HTML URL thumbnail generation...');
        console.log('📄 Loading URL:', testUrl);

        // Find Chrome executable
        const chromePaths = [
            process.env.CHROME_PATH,
            '/usr/bin/google-chrome-stable',
            '/usr/bin/google-chrome',
            '/usr/bin/chromium-browser',
            '/usr/bin/chromium',
            '/opt/google/chrome/chrome',
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
        ].filter(Boolean);

        let executablePath = null;
        for (const chromePath of chromePaths) {
            if (fs.existsSync(chromePath)) {
                executablePath = chromePath;
                break;
            }
        }

        console.log(`🔍 Using Chrome executable: ${executablePath || 'bundled Chromium'}`);

        browser = await puppeteer.launch({
            headless: 'new',  // Use new headless mode
            executablePath,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--no-first-run',
                '--no-zygote',
                '--enable-webgl',
                '--use-gl=swiftshader',  // Software renderer
                '--enable-accelerated-2d-canvas',
                '--ignore-gpu-blacklist',
                '--window-size=1024,1024',
                '--enable-unsafe-webgl',
                '--enable-gpu-rasterization=false', // Disable GPU rasterization to force software
                '--enable-webgl2-compute-context',
                '--disable-gpu-sandbox',
                '--use-angle=swiftshader',
                '--enable-webgl-draft-extensions',
                '--enable-webgl-developer-extensions',
                '--force-device-scale-factor=1'
            ]
        });

        const page = await browser.newPage();
        
        // Enable console logging
        page.on('console', msg => console.log('🖥️ PAGE LOG:', msg.text()));
        page.on('pageerror', error => console.log('🚨 PAGE ERROR:', error.message));
        
        // Set viewport
        await page.setViewport({ width: 1024, height: 1024 });

        // Inject script to force WebGL context creation and wait for actual rendering
        await page.evaluateOnNewDocument(() => {
            window.addEventListener('DOMContentLoaded', () => {
                console.log('🔧 DOMContentLoaded - forcing initialization...');
                
                // Override editMode check
                window.editMode = true; // Force edit mode to true for initialization
                
                // Force initialization of globals and renderer
                setTimeout(() => {
                    if (typeof initializeGlobals === 'function') {
                        console.log('🔧 Calling initializeGlobals...');
                        initializeGlobals();
                    }
                    
                    if (typeof initializeApp === 'function') {
                        console.log('🔧 Calling initializeApp...');
                        initializeApp();
                    }
                    
                    // Force renderer creation if it doesn't exist
                    if (typeof THREE !== 'undefined' && !window.renderer) {
                        console.log('🔧 Creating renderer manually...');
                        try {
                            const canvas = document.createElement('canvas');
                            canvas.width = 1024;
                            canvas.height = 1024;
                            canvas.style.width = '100vw';
                            canvas.style.height = '100vh';
                            canvas.style.display = 'block';
                            document.body.appendChild(canvas);
                            
                            window.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
                            window.renderer.setSize(1024, 1024);
                            window.renderer.setPixelRatio(1);
                            
                            console.log('🔧 Manual renderer created');
                            
                            // Create basic scene and camera if they don't exist
                            if (!window.scene) {
                                window.scene = new THREE.Scene();
                                console.log('🔧 Created scene');
                            }
                            
                            if (!window.camera) {
                                window.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
                                window.camera.position.z = 5;
                                console.log('🔧 Created camera');
                            }
                            
                            // Force generate the NFT content
                            if (typeof window.globals !== 'undefined' && window.globals.nftData) {
                                console.log('🔧 Found NFT data, generating content...');
                                try {
                                    // Call the main generation function if it exists
                                    if (typeof generateAndDisplayNFT === 'function') {
                                        generateAndDisplayNFT();
                                    } else if (typeof generate === 'function') {
                                        generate();
                                    } else if (typeof window.generate === 'function') {
                                        window.generate();
                                    }
                                } catch (genError) {
                                    console.error('Generation error:', genError);
                                }
                            }
                            
                            // Force a render
                            if (window.scene && window.camera) {
                                window.renderer.render(window.scene, window.camera);
                                console.log('🔧 Manual render completed');
                            }
                        } catch (e) {
                            console.error('Failed to create manual renderer:', e);
                        }
                    }
                }, 1000);
                
                // Set up renderer detection
                let renderCheckCount = 0;
                const maxRenderChecks = 200; // 20 seconds max
                
                const checkForActualRendering = () => {
                    renderCheckCount++;
                    
                    // Check for actual canvas content
                    const canvases = document.querySelectorAll('canvas');
                    let hasContent = false;
                    
                    for (const canvas of canvases) {
                        if (canvas.id === 'gpuMathCanvas') continue; // Skip hidden canvas
                        
                        try {
                            const ctx = canvas.getContext('2d');
                            if (ctx && canvas.width > 0 && canvas.height > 0) {
                                // Check if canvas has non-black pixels
                                const imageData = ctx.getImageData(canvas.width/2, canvas.height/2, 1, 1);
                                const pixel = imageData.data;
                                if (pixel[0] > 0 || pixel[1] > 0 || pixel[2] > 0) {
                                    hasContent = true;
                                    break;
                                }
                            }
                            
                            // Also try WebGL context
                            const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
                            if (gl) {
                                const pixels = new Uint8Array(4);
                                gl.readPixels(canvas.width/2, canvas.height/2, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
                                if (pixels[0] > 0 || pixels[1] > 0 || pixels[2] > 0) {
                                    hasContent = true;
                                    break;
                                }
                            }
                        } catch (e) {
                            // Can't read pixels, continue checking
                        }
                    }
                    
                    if (hasContent) {
                        console.log('✅ Actual rendering detected!');
                        window.nftRenderComplete = true;
                        return;
                    }
                    
                    if (renderCheckCount < maxRenderChecks) {
                        setTimeout(checkForActualRendering, 100);
                    } else {
                        console.log('⚠️ Render timeout - proceeding anyway');
                        window.nftRenderComplete = true;
                    }
                };
                
                // Start checking after a short delay to allow initialization
                setTimeout(checkForActualRendering, 2000);
            });
        });

        // Navigate to the URL
        await page.goto(testUrl, { waitUntil: 'networkidle0' });
        
        console.log('⏳ Waiting for actual WebGL rendering...');
        
        try {
            // Wait for our render detection flag
            await page.waitForFunction(() => window.nftRenderComplete === true, { 
                timeout: 25000 
            });
            console.log('✅ Rendering completion detected');
            
            // Extra wait to ensure final frame is rendered
            await new Promise(resolve => setTimeout(resolve, 2000));
            
        } catch (waitError) {
            console.log('⚠️ Render wait timeout, taking screenshot anyway:', waitError.message);
            
            // Fallback: wait a bit more and proceed
            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        // Debug page state before screenshot
        const pageState = await page.evaluate(() => {
            const canvases = document.querySelectorAll('canvas');
            const canvasInfo = Array.from(canvases).map(c => ({
                id: c.id,
                width: c.width,
                height: c.height,
                offsetWidth: c.offsetWidth,
                offsetHeight: c.offsetHeight,
                clientWidth: c.clientWidth,
                clientHeight: c.clientHeight,
                style: c.style.cssText,
                display: getComputedStyle(c).display,
                visibility: getComputedStyle(c).visibility
            }));
            
            const visibleCanvases = Array.from(canvases).filter(c => 
                c.id !== 'gpuMathCanvas' && c.offsetWidth > 0 && c.offsetHeight > 0
            );
            
            return {
                hasGlobals: typeof window.globals !== 'undefined',
                hasThree: typeof THREE !== 'undefined',
                totalCanvases: canvases.length,
                visibleCanvases: visibleCanvases.length,
                renderComplete: window.nftRenderComplete || false,
                editMode: window.editMode,
                canvasDetails: canvasInfo
            };
        });
        
        console.log('🔍 Pre-screenshot state:', pageState);

        // Take screenshot
        console.log('📸 Taking screenshot of URL content...');
        const screenshotBuffer = await page.screenshot({
            type: 'png',
            clip: {
                x: 0,
                y: 0,
                width: 1024,
                height: 1024
            }
        });

        if (!screenshotBuffer || screenshotBuffer.length === 0) {
            throw new Error('Screenshot buffer is empty or invalid');
        }

        console.log('✅ URL thumbnail captured, size:', screenshotBuffer.length);
        
        // Save test thumbnail with timestamp
        const timestamp = Date.now();
        const testPath = `./thumbnails/test-url-thumbnail_${timestamp}.png`;
        
        // Ensure thumbnails directory exists
        const thumbDir = path.dirname(testPath);
        if (!fs.existsSync(thumbDir)) {
            fs.mkdirSync(thumbDir, { recursive: true });
        }
        
        fs.writeFileSync(testPath, screenshotBuffer);
        console.log('💾 Test URL thumbnail saved to:', testPath);
        
    } catch (error) {
        console.error('❌ URL Test failed:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

testHTMLUrl();