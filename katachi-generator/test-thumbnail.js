// Quick test for thumbnail generation using existing HTML file
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

async function testWithExistingHTML() {
    const testUrl = 'https://storage.katachi-gen.com/kg_pinwheel-0xee49f82e58a1c2b306720d0c68047cbf70c11fb5-1756779081579.html';
    
    let browser;
    try {
        console.log('🧪 Testing thumbnail generation with existing HTML...');
        console.log('📄 Loading:', testUrl);
        
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
            headless: true,
            executablePath, // Let Puppeteer use bundled Chromium if no system Chrome found
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--no-first-run',
                '--no-zygote',
                '--enable-webgl',
                '--use-gl=desktop', // Use system GL instead of software rendering
                '--enable-accelerated-2d-canvas',
                '--ignore-gpu-blacklist',
                '--window-size=1024,1024'
            ]
        });

        const page = await browser.newPage();
        
        // Set viewport for consistent screenshots
        await page.setViewport({ width: 1024, height: 1024 });

        // Navigate to the existing HTML file
        await page.goto(testUrl, { 
            waitUntil: 'networkidle0',
            timeout: 30000
        });
        
        // Wait for WebGL initialization and rendering
        console.log('⏳ Waiting for WebGL rendering to complete...');
        
        try {
            // Wait for either rendering completion or timeout
            await Promise.race([
                page.waitForFunction(() => {
                    return window.nftRenderComplete === true || 
                           (typeof window.globals !== 'undefined' && 
                            typeof THREE !== 'undefined');
                }, { timeout: 15000 }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Render timeout')), 15000))
            ]);
            
            console.log('✅ WebGL initialization detected');
            
            // Additional wait for final rendering
            await new Promise(resolve => setTimeout(resolve, 3000));
            
        } catch (waitError) {
            console.log('⚠️ Render wait failed, taking screenshot anyway:', waitError.message);
            await new Promise(resolve => setTimeout(resolve, 5000)); // Fallback wait
        }

        // Debug: Check page state
        const pageState = await page.evaluate(() => ({
            hasGlobals: typeof window.globals !== 'undefined',
            hasThree: typeof THREE !== 'undefined',
            hasCanvas: document.querySelector('canvas') !== null,
            canvasCount: document.querySelectorAll('canvas').length,
            renderComplete: window.nftRenderComplete || false,
            bodyContent: document.body?.innerHTML?.substring(0, 200) || 'NO BODY'
        }));
        
        console.log('🔍 Page state:', pageState);

        // Take screenshot
        console.log('📸 Taking screenshot...');
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

        // Save test thumbnail
        const testPath = './thumbnails/test-existing-html.png';
        
        // Ensure thumbnails directory exists
        const thumbDir = path.dirname(testPath);
        if (!fs.existsSync(thumbDir)) {
            fs.mkdirSync(thumbDir, { recursive: true });
        }
        
        fs.writeFileSync(testPath, screenshotBuffer);
        console.log('✅ Test successful! Buffer size:', screenshotBuffer.length);
        console.log('💾 Test thumbnail saved to:', testPath);
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
        
        // If Puppeteer fails, suggest the SVG approach
        if (error.message.includes('chrome') || error.message.includes('browser')) {
            console.log('\n💡 Consider using SVG approach instead:');
            console.log('   1. npm install canvas');
            console.log('   2. Update handlers/pattern.js to use ./image/thumbnail-svg');
        }
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

testWithExistingHTML();