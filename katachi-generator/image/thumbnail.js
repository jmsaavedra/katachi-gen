// Thumbnail generation using Playwright
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const { templateHTML } = require('../config');

/**
 * Generate thumbnail using Playwright
 */
async function generateThumbnail(data) {
    let browser;
    try {
        // Try to find Chrome/Chromium executable
        const possiblePaths = [
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '/Applications/Chromium.app/Contents/MacOS/Chromium',
            '/usr/bin/google-chrome-stable',
            '/usr/bin/google-chrome',
            '/usr/bin/chromium-browser',
            '/usr/bin/chromium',
            '/snap/bin/chromium',
            process.env.CHROME_EXECUTABLE_PATH
        ].filter(Boolean);

        let executablePath = null;
        for (const chromePath of possiblePaths) {
            if (fs.existsSync(chromePath)) {
                executablePath = chromePath;
                break;
            }
        }

        if (!executablePath) {
            throw new Error('Chrome/Chromium not found. Please install Chrome or set CHROME_EXECUTABLE_PATH environment variable.');
        }

        console.log('🚀 Using Chrome at:', executablePath);

        // Launch browser
        browser = await chromium.launch({
            executablePath: executablePath,
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();
        
        // Set viewport for consistent screenshots
        await page.setViewportSize({ width: 1024, height: 1024 });

        // Load template HTML file
        const templatePath = path.join(__dirname, '..', 'public', templateHTML);
        const template = fs.readFileSync(templatePath, 'utf-8');
        
        // Replace placeholder with actual data
        const htmlContent = template.replace('___NFT_DATA_PLACEHOLDER___', JSON.stringify(data, null, 2));
        
        // Check if replacement worked
        const templateContainsPlaceholder = template.includes('___NFT_DATA_PLACEHOLDER___');
        const renderedContainsPlaceholder = htmlContent.includes('___NFT_DATA_PLACEHOLDER___');
        
        console.log('🔍 Template replacement debug:');
        console.log('  - Template contains placeholder:', templateContainsPlaceholder);
        console.log('  - Rendered contains placeholder:', renderedContainsPlaceholder);
        
        if (!templateContainsPlaceholder) {
            throw new Error('Template does not contain ___NFT_DATA_PLACEHOLDER___ placeholder');
        } else if (renderedContainsPlaceholder) {
            throw new Error('Template replacement failed - ___NFT_DATA_PLACEHOLDER___ still exists in rendered output');
        } else {
            console.log('✅ Template replacement successful');
        }

        // Set content and wait for it to load
        await page.setContent(htmlContent);
        
        // Inject a timeout mechanism for the infinite globals/THREE.js loop
        await page.addScriptTag({
            content: `
                // Override the infinite waiting loop with a timeout
                window.globalsCheckCount = 0;
                window.maxGlobalsChecks = 50; // 5 seconds max (50 * 100ms)
                
                // Set a flag to indicate rendering should complete after timeout
                setTimeout(() => {
                    if (!window.nftRenderComplete) {
                        console.log('🔴 TIMEOUT: Setting nftRenderComplete=true after 8 seconds');
                        window.nftRenderComplete = true;
                        
                        // Create renderComplete element as fallback
                        if (!document.querySelector('#renderComplete')) {
                            const div = document.createElement('div');
                            div.id = 'renderComplete';
                            document.body.appendChild(div);
                        }
                        
                        // Hide loading screen if it exists
                        const loadingScreen = document.querySelector('.loading-screen');
                        if (loadingScreen) {
                            loadingScreen.style.display = 'none';
                        }
                    }
                }, 8000);
            `
        });

        // Advanced screenshot timing logic
        let screenshotTaken = false;
        let consoleProcessing = false;

        // Enhanced screenshot function with better timing
        async function takeScreenshotOnDetection() {
            if (screenshotTaken) return null;
            screenshotTaken = true;

            try {
                console.log('📸 IMMEDIATE CAPTURE - Console message detected');
                
                // Brief wait to ensure rendering completion
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Take screenshot
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
                
                return screenshotBuffer;
            } catch (error) {
                console.error('Error in takeScreenshotOnDetection:', error);
                screenshotTaken = false; // Reset flag on error
                throw error;
            }
        }

        // Enhanced console message handler
        page.on('console', async (msg) => {
            const text = msg.text();
            console.log('🖥️ Console:', text);
            
            if (text.includes('Rendering complete') || text.includes('nftRenderComplete')) {
                if (!consoleProcessing && !screenshotTaken) {
                    try {
                        consoleProcessing = true;
                        const result = await takeScreenshotOnDetection();
                        if (result) {
                            console.log('✅ Thumbnail generated successfully via console detection');
                        }
                    } catch (error) {
                        console.error('Error taking immediate screenshot:', error);
                        // Continue with other strategies
                    }
                }
            }
        });
        
        try {
            // Strategy 1: Wait for canvas element instead of walletAddress (which doesn't exist)
            try {
                await page.waitForSelector('canvas', { timeout: 4000 });
                console.log('✅ Canvas element found');
            } catch (canvasError) {
                console.log('Canvas wait failed:', canvasError.message);
            }
            
            // Strategy 2: Console message-based waiting (highest priority)
            try {
                console.log('Waiting for rendering completion via console messages...');
                
                // Wait for either console message or timeout
                await Promise.race([
                    page.waitForFunction(() => {
                        return window.nftRenderComplete === true || 
                               document.querySelector('#renderComplete') !== null;
                    }, { timeout: 6000 }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Console wait timeout')), 6000))
                ]);
                
                if (!screenshotTaken) {
                    const result = await takeScreenshotOnDetection();
                    if (result) {
                        return result;
                    }
                }
                
            } catch (consoleError) {
                console.log('Console-based wait failed, trying alternative approach:', consoleError.message);
                
                // Strategy 3: nftRenderComplete flag (shortened timeout)
                try {
                    await page.waitForFunction(() => {
                        return window.nftRenderComplete === true;
                    }, { timeout: 3000 });
                    
                    console.log('✅ nftRenderComplete flag detected');
                    
                    if (!screenshotTaken) {
                        const result = await takeScreenshotOnDetection();
                        if (result) {
                            return result;
                        }
                    }
                    
                } catch (flagError) {
                    console.log('Flag wait also failed, proceeding with minimal wait:', flagError.message);
                    console.log('🎯 STRATEGY: Minimal timeout');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            
        } catch (waitError) {
            console.log('Wait strategies failed, using minimal fallback:', waitError.message);
            console.log('🎯 STRATEGY: Minimal fallback timeout');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Final fallback screenshot if none taken yet
        if (!screenshotTaken) {
            console.log('📸 FALLBACK - Taking screenshot now...');
            
            // Debug: Check page state before screenshot
            const preScreenshotState = await page.evaluate(() => ({
                canvasPresent: document.querySelector('canvas') !== null,
                renderComplete: window.nftRenderComplete || false,
                bodyContent: document.body?.innerHTML?.length || 0,
                timestamp: new Date().toISOString(),
                threejsLoaded: typeof THREE !== 'undefined',
                globalsAvailable: typeof window.globals !== 'undefined'
            }));
            
            console.log('📸 SCREENSHOT TIMING - Fallback capture state:', JSON.stringify(preScreenshotState, null, 2));
            
            try {
                // Take screenshot
                console.log('📸 Taking fallback screenshot NOW...');
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
                    throw new Error('Fallback screenshot buffer is empty or invalid');
                }
                
                return screenshotBuffer;
            } catch (fallbackError) {
                console.error('❌ Fallback screenshot failed:', fallbackError);
                throw new Error(`All screenshot attempts failed. Last error: ${fallbackError.message}`);
            }
        }

        // This shouldn't be reached, but just in case
        throw new Error('Screenshot logic completed without taking a screenshot');

    } catch (error) {
        console.error('Error generating thumbnail:', error);
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