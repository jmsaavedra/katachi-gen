// Thumbnail generation using Puppeteer (alternative to Playwright)
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { templateHTML } = require('../config');

/**
 * Generate thumbnail using Puppeteer
 */
async function generateThumbnail(data) {
    let browser;
    try {
        console.log('🚀 Launching browser with Puppeteer');

        // Launch browser with WebGL support - using system Chrome/Chromium
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

        // Load template HTML file
        const templatePath = path.join(__dirname, '..', 'public', templateHTML);
        const template = fs.readFileSync(templatePath, 'utf-8');
        
        // Replace placeholder with actual data
        const htmlContent = template.replace('___NFT_DATA_PLACEHOLDER___', JSON.stringify(data, null, 2));
        
        // Set content
        await page.setContent(htmlContent);
        
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
            
            // Additional wait for final rendering
            await new Promise(resolve => setTimeout(resolve, 3000));
            
        } catch (waitError) {
            console.log('⚠️ Render wait failed, taking screenshot anyway:', waitError.message);
            await new Promise(resolve => setTimeout(resolve, 5000)); // Fallback wait
        }

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

        console.log('✅ Thumbnail generated successfully with Puppeteer');
        return screenshotBuffer;

    } catch (error) {
        console.error('❌ Error generating thumbnail with Puppeteer:', error);
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