// Thumbnail generation from actual HTML content
const fs = require('fs');
const path = require('path');
// Use puppeteer-core in development, regular puppeteer in production/Railway
const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT;
const puppeteer = isProduction 
    ? require('puppeteer') 
    : require('puppeteer-core');
const { templateHTML } = require('../config');

/**
 * Generate thumbnail from the actual generated HTML file
 */
async function generateThumbnail(data, htmlFilePath = null) {
    let browser;
    try {
        console.log('📸 Generating thumbnail from actual HTML content...');

        // If no htmlFilePath provided, create the HTML content in memory
        let htmlContent;
        if (htmlFilePath && fs.existsSync(htmlFilePath)) {
            console.log('📄 Loading HTML from file:', htmlFilePath);
            htmlContent = fs.readFileSync(htmlFilePath, 'utf-8');
        } else {
            console.log('📄 Creating HTML content from template...');
            const templatePath = path.join(__dirname, '..', 'public', templateHTML);
            const template = fs.readFileSync(templatePath, 'utf-8');
            htmlContent = template.replace('___NFT_DATA_PLACEHOLDER___', JSON.stringify(data, null, 2));
        }

        // Determine Chrome executable and launch options
        let launchOptions = {
            headless: 'new',  // Use new headless mode - critical for WebGL
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--no-first-run',
                '--no-zygote',
                '--enable-webgl',
                '--use-gl=swiftshader',  // Software renderer for headless WebGL
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
        };

        // In production with regular puppeteer, don't specify executablePath (uses bundled Chrome)
        // In development with puppeteer-core, try to find Chrome executable
        if (!isProduction) {
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

            if (executablePath) {
                launchOptions.executablePath = executablePath;
                console.log(`🔍 Using Chrome executable: ${executablePath}`);
            } else {
                console.log('⚠️ No Chrome executable found, using system default');
            }
        } else {
            console.log('🔍 Using bundled Chromium from puppeteer');
            console.log('🌐 Environment debug:', {
                NODE_ENV: process.env.NODE_ENV,
                RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT,
                isProduction,
                puppeteerType: isProduction ? 'puppeteer' : 'puppeteer-core'
            });
        }

        try {
            browser = await puppeteer.launch(launchOptions);
        } catch (puppeteerError) {
            // If puppeteer-core fails in what we think is development, try regular puppeteer as fallback
            if (!isProduction && puppeteerError.message.includes('executablePath')) {
                console.log('🔄 Puppeteer-core failed, trying regular puppeteer as fallback...');
                const fallbackPuppeteer = require('puppeteer');
                const fallbackOptions = { ...launchOptions };
                delete fallbackOptions.executablePath;
                browser = await fallbackPuppeteer.launch(fallbackOptions);
            } else {
                throw puppeteerError;
            }
        }
        const page = await browser.newPage();
        
        // Enable console logging for debugging
        page.on('console', msg => console.log('🖥️ HTML LOG:', msg.text()));
        page.on('pageerror', error => console.log('🚨 HTML ERROR:', error.message));
        
        // Set viewport
        await page.setViewport({ width: 1024, height: 1024 });

        // Inject script to force WebGL context creation and wait for actual rendering
        await page.evaluateOnNewDocument(() => {
            // Force globals initialization even if editMode is false
            window.addEventListener('DOMContentLoaded', () => {
                console.log('🔧 DOMContentLoaded - forcing initialization...');
                
                // Override editMode check
                window.editMode = true; // Force edit mode to true for initialization
                
                // Set up rendering detection 
                let renderCheckCount = 0;
                const maxRenderChecks = 300; // 30 seconds max for complex NFTs
                
                const checkForActualRendering = () => {
                    renderCheckCount++;
                    
                    // Check multiple completion signals
                    const signals = {
                        renderingComplete: window.renderingComplete === true,
                        nftRenderComplete: window.nftRenderComplete === true,
                        hasVisibleModel: false,
                        hasTexturedCanvas: false
                    };
                    
                    // Check for visible 3D model
                    try {
                        if (window.model && window.model.origami && window.model.origami.visible) {
                            signals.hasVisibleModel = true;
                        }
                    } catch (e) {}
                    
                    // Check for actual canvas content with textures
                    const canvases = document.querySelectorAll('canvas');
                    for (const canvas of canvases) {
                        if (canvas.id === 'gpuMathCanvas') continue;
                        
                        if (canvas.offsetWidth > 0 && canvas.offsetHeight > 0) {
                            try {
                                // Try WebGL pixel reading for textured content
                                const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
                                if (gl) {
                                    const pixels = new Uint8Array(16); // Check 4x4 area
                                    gl.readPixels(canvas.width/2-2, canvas.height/2-2, 4, 4, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
                                    let colorVariation = 0;
                                    for (let i = 0; i < pixels.length; i += 4) {
                                        if (pixels[i] + pixels[i+1] + pixels[i+2] > 30) { // Not pure black
                                            colorVariation++;
                                        }
                                    }
                                    if (colorVariation >= 2) { // Multiple colored pixels = texture
                                        signals.hasTexturedCanvas = true;
                                        break;
                                    }
                                }
                            } catch (e) {}
                        }
                    }
                    
                    // Force origami visibility in NFT mode
                    if (renderCheckCount > 50 && window.model && window.model.origami) {
                        try {
                            if (!window.model.origami.visible) {
                                console.log('🔧 Forcing origami visibility for thumbnail');
                                window.model.origami.visible = true;
                                window.model.origami2.visible = true;
                            }
                        } catch (e) {}
                    }
                    
                    // Check completion
                    const isComplete = signals.renderingComplete || signals.nftRenderComplete || 
                                     (signals.hasVisibleModel && signals.hasTexturedCanvas);
                    
                    if (isComplete || renderCheckCount >= maxRenderChecks) {
                        if (isComplete) {
                            console.log('✅ NFT rendering completed!', signals);
                        } else {
                            console.log('⚠️ Render timeout - proceeding anyway', signals);
                        }
                        window.nftRenderComplete = true;
                        return;
                    }
                    
                    setTimeout(checkForActualRendering, 100);
                };
                
                // Start checking after a short delay to allow initialization
                setTimeout(checkForActualRendering, 2000);
            });
        });

        // Navigate to file (better for external resources than setContent)
        if (htmlFilePath && fs.existsSync(htmlFilePath)) {
            console.log('📄 Loading HTML file:', htmlFilePath);
            const fileUrl = `file://${htmlFilePath}`;
            await page.goto(fileUrl, { waitUntil: 'networkidle0' });
        } else {
            console.log('📄 Using HTML content from template...');
            await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        }
        
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
            const visibleCanvases = Array.from(canvases).filter(c => 
                c.id !== 'gpuMathCanvas' && c.offsetWidth > 0 && c.offsetHeight > 0
            );
            
            return {
                hasGlobals: typeof window.globals !== 'undefined',
                hasThree: typeof THREE !== 'undefined',
                totalCanvases: canvases.length,
                visibleCanvases: visibleCanvases.length,
                renderComplete: window.nftRenderComplete || false,
                editMode: window.editMode
            };
        });
        
        console.log('🔍 Pre-screenshot state:', pageState);

        // Take screenshot
        console.log('📸 Taking screenshot of actual content...');
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

        console.log('✅ HTML thumbnail captured, size:', screenshotBuffer.length);
        return screenshotBuffer;

    } catch (error) {
        console.error('❌ Error generating HTML thumbnail:', error);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

module.exports = {
    generateThumbnail
};