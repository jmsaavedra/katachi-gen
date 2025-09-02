// Thumbnail generation using Playwright
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { templateHTML } = require('../config');

/**
 * Generate thumbnail using Playwright
 */
async function generateThumbnail(data) {
    let browser;
    try {
        console.log('🚀 Launching Chromium with Playwright');

        // Launch browser with WebGL support that works with full playwright package
        browser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--no-first-run',
                '--no-zygote',
                '--enable-webgl',
                '--use-gl=egl-angle',
                '--use-angle=swiftshader',
                '--enable-accelerated-2d-canvas',
                '--enable-unsafe-webgl',
                '--ignore-gpu-blacklist'
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
        
        // Inject CSS to hide loading screens that might interfere
        await page.addStyleTag({
            content: `
                #loadingScreen {
                    display: none !important;
                }
                .loading-screen {
                    display: none !important;
                }
            `
        });
        
        // Fix the template initialization issue: ensure globals are available even in NFT mode
        await page.addScriptTag({
            content: `
                // Force globals initialization if it didn't happen due to editMode=false
                console.log('🔧 Checking globals initialization status...');
                if (typeof window.globals === 'undefined' && typeof initGlobals === 'function') {
                    console.log('⚠️ Globals not initialized due to editMode=false, forcing initialization...');
                    try {
                        window.globals = initGlobals();
                        if (typeof initThreeView === 'function') {
                            window.globals.threeView = initThreeView(window.globals);
                        }
                        if (typeof initModel === 'function') {
                            window.globals.model = initModel(window.globals);
                        }
                        if (typeof initPattern === 'function') {
                            window.globals.pattern = initPattern(window.globals);
                        }
                        console.log('✅ Forced globals initialization complete');
                    } catch (error) {
                        console.error('❌ Error during forced globals initialization:', error);
                    }
                } else {
                    console.log('✅ Globals already initialized or initGlobals not available');
                }
                
                // Override the infinite waiting loop with a timeout
                window.globalsCheckCount = 0;
                window.maxGlobalsChecks = 50; // 5 seconds max (50 * 100ms)
                
                // Function to check if WebGL rendering is actually complete
                window.checkWebGLRenderComplete = function() {
                    // Find the correct canvas (not the hidden gpuMathCanvas)
                    const canvases = document.querySelectorAll('canvas');
                    let mainCanvas = null;
                    
                    for (const canvas of canvases) {
                        // Skip the hidden gpuMathCanvas
                        if (canvas.id === 'gpuMathCanvas') continue;
                        
                        // Check if canvas is visible
                        if (canvas.offsetWidth > 0 && canvas.offsetHeight > 0) {
                            mainCanvas = canvas;
                            break;
                        }
                    }
                    
                    if (!mainCanvas) {
                        // No visible canvas found, check for any canvas
                        mainCanvas = document.querySelector('canvas:not(#gpuMathCanvas)');
                    }
                    
                    if (mainCanvas) {
                        console.log('Found canvas for checking:', mainCanvas.id || 'unnamed', 'size:', mainCanvas.width, 'x', mainCanvas.height);
                        
                        // Method 1: Check for Three.js renderer
                        if (typeof THREE !== 'undefined' && window.renderer) {
                            console.log('🔍 Three.js renderer found');
                            // Force a render
                            if (window.renderer.render && window.scene && window.camera) {
                                try {
                                    window.renderer.render(window.scene, window.camera);
                                    console.log('🎨 Forced Three.js render');
                                } catch (e) {
                                    console.log('Could not force render:', e);
                                }
                            }
                        }
                        
                        // Method 2: Check canvas pixel data
                        try {
                            const ctx = mainCanvas.getContext('2d');
                            if (ctx) {
                                const imageData = ctx.getImageData(mainCanvas.width / 2, mainCanvas.height / 2, 1, 1);
                                const hasContent = imageData.data.some((v, i) => i < 3 && v > 0);
                                if (hasContent) {
                                    console.log('✅ 2D Canvas content detected');
                                    return true;
                                }
                            }
                        } catch (e) {
                            // Try WebGL context
                            const gl = mainCanvas.getContext('webgl') || mainCanvas.getContext('webgl2');
                            if (gl) {
                                // Check if there's actual content rendered
                                const pixels = new Uint8Array(4);
                                try {
                                    // Read a pixel from the center
                                    gl.readPixels(mainCanvas.width / 2, mainCanvas.height / 2, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
                                    
                                    // Check if pixel is not black
                                    const hasContent = pixels[0] > 0 || pixels[1] > 0 || pixels[2] > 0;
                                    
                                    if (hasContent) {
                                        console.log('✅ WebGL content detected on canvas');
                                        return true;
                                    }
                                } catch (readError) {
                                    console.log('Could not read WebGL pixels:', readError);
                                }
                            }
                        }
                    }
                    return false;
                };
                
                // Enhanced timeout with WebGL content checking
                let checkCount = 0;
                const checkInterval = setInterval(() => {
                    checkCount++;
                    
                    // Check if globals and THREE are available first (this was the main issue)
                    if (typeof window.globals !== 'undefined' && typeof THREE !== 'undefined') {
                        // Check if WebGL has actual rendered content
                        if (window.checkWebGLRenderComplete()) {
                            console.log('🎨 WebGL rendering complete with actual content');
                            window.nftRenderComplete = true;
                            clearInterval(checkInterval);
                            
                            // Hide loading screen if it exists
                            const loadingScreen = document.querySelector('.loading-screen');
                            if (loadingScreen) {
                                loadingScreen.style.display = 'none';
                            }
                        }
                    } else {
                        console.log('⏳ Still waiting for globals and THREE.js to initialize...');
                    }
                    
                    // Maximum wait time: 20 seconds (increased to allow proper initialization)
                    if (checkCount > 200) {
                        console.log('⚠️ TIMEOUT: Max wait time reached (20 seconds)');
                        console.log('   - globals available:', typeof window.globals !== 'undefined');
                        console.log('   - THREE available:', typeof THREE !== 'undefined');
                        console.log('   - Proceeding with screenshot anyway');
                        window.nftRenderComplete = true;
                        clearInterval(checkInterval);
                    }
                }, 100);
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
                
                // Longer wait to ensure WebGL/Three.js rendering completion
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Debug: Check what's actually on the page before screenshot
                const pageDebug = await page.evaluate(() => ({
                    bodyContent: document.body?.innerHTML?.substring(0, 200) || 'NO BODY',
                    hasCanvas: document.querySelector('canvas') !== null,
                    canvasCount: document.querySelectorAll('canvas').length,
                    hasThreeJs: typeof THREE !== 'undefined',
                    nftRenderComplete: window.nftRenderComplete,
                    timestamp: new Date().toISOString()
                }));
                console.log('📸 PRE-SCREENSHOT DEBUG:', JSON.stringify(pageDebug, null, 2));
                
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
                
                console.log('📸 Screenshot captured successfully, size:', screenshotBuffer.length);
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
            // Strategy 1: Wait for VISIBLE canvas element (not the hidden gpuMathCanvas)
            try {
                // Wait for a visible canvas - the main rendering canvas, not gpuMathCanvas
                await page.waitForSelector('canvas:not(#gpuMathCanvas)', { 
                    timeout: 8000,
                    state: 'visible' 
                });
                console.log('✅ Visible canvas element found (not gpuMathCanvas)');
                
                // Extra wait after canvas appears to ensure WebGL renders
                console.log('⏳ Waiting additional time for WebGL to render content...');
                await new Promise(resolve => setTimeout(resolve, 3000));
            } catch (canvasError) {
                console.log('Visible canvas wait failed:', canvasError.message);
                
                // Try to wait for any canvas that's not the hidden gpuMathCanvas
                try {
                    const canvases = await page.evaluate(() => {
                        const allCanvas = document.querySelectorAll('canvas');
                        return Array.from(allCanvas).map(c => ({
                            id: c.id,
                            className: c.className,
                            visible: c.offsetWidth > 0 && c.offsetHeight > 0,
                            display: window.getComputedStyle(c).display
                        }));
                    });
                    console.log('Canvas elements found on page:', JSON.stringify(canvases, null, 2));
                } catch (e) {
                    console.log('Could not enumerate canvases:', e.message);
                }
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
            
            // Ensure longer wait for WebGL content to render
            console.log('📸 FALLBACK - Waiting additional time for WebGL rendering...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Debug: Check page state before screenshot
            const preScreenshotState = await page.evaluate(() => {
                // Try to find any visible content we can capture
                const allCanvas = document.querySelectorAll('canvas');
                const visibleCanvas = Array.from(allCanvas).find(c => 
                    c.id !== 'gpuMathCanvas' && c.offsetWidth > 0 && c.offsetHeight > 0
                );
                
                // Check for any SVG patterns or static content
                const svgElements = document.querySelectorAll('svg');
                const hasStaticContent = document.querySelector('.pattern-container') || 
                                        document.querySelector('.origami-pattern') ||
                                        document.querySelector('#patternDisplay');
                
                return {
                    canvasPresent: document.querySelector('canvas') !== null,
                    visibleCanvasFound: !!visibleCanvas,
                    visibleCanvasId: visibleCanvas?.id || 'none',
                    canvasCount: allCanvas.length,
                    renderComplete: window.nftRenderComplete || false,
                    bodyContent: document.body?.innerHTML?.substring(0, 300) || 'NO BODY',
                    bodyLength: document.body?.innerHTML?.length || 0,
                    timestamp: new Date().toISOString(),
                    threejsLoaded: typeof THREE !== 'undefined',
                    globalsAvailable: typeof window.globals !== 'undefined',
                    loadingScreenHidden: !document.querySelector('.loading-screen') || 
                                       document.querySelector('.loading-screen')?.style?.display === 'none' ||
                                       !document.querySelector('#loadingScreen') || 
                                       document.querySelector('#loadingScreen')?.style?.display === 'none',
                    canvasStyles: visibleCanvas?.style?.cssText || 'NO VISIBLE CANVAS',
                    svgCount: svgElements.length,
                    hasStaticContent: !!hasStaticContent,
                    bodyBackgroundColor: window.getComputedStyle(document.body).backgroundColor
                };
            });
            
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
                
                console.log('📸 Fallback screenshot captured successfully, size:', screenshotBuffer.length);
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