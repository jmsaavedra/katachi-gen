// Template generator using the new modular EJS system
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

/**
 * Generate HTML template using the modular EJS system
 * @param {Object} nftData - NFT data to inject into template
 * @returns {string} - Generated HTML content
 */
async function generateModularTemplate(nftData) {
    try {
        // Path to the main EJS template
        const templatePath = path.join(__dirname, '../src/template/index.ejs');
        
        // Check if modular template exists
        if (!fs.existsSync(templatePath)) {
            throw new Error('EJS template not found at src/template/index.ejs');
        }
        
        // Read the required CSS files
        const projectRoot = path.join(__dirname, '..');
        const jqueryUICSSPath = path.join(projectRoot, 'public/css/jquery-ui.min.css');
        const mainCSSPath = path.join(projectRoot, 'public/css/main.css');
        
        let jqueryUICSS = '';
        let mainCSS = '';
        
        // Try to read CSS files
        if (fs.existsSync(jqueryUICSSPath)) {
            jqueryUICSS = fs.readFileSync(jqueryUICSSPath, 'utf8');
        } else {
            console.warn(`⚠️ jquery-ui.min.css not found at ${jqueryUICSSPath}`);
        }
        
        if (fs.existsSync(mainCSSPath)) {
            mainCSS = fs.readFileSync(mainCSSPath, 'utf8');
        } else {
            console.warn(`⚠️ main.css not found at ${mainCSSPath}`);
        }
        
        // Prepare template data
        const templateData = {
            // NFT-specific data - pass as JSON string for embedding in script tag
            nftData: JSON.stringify(nftData),
            
            // CSS content
            jqueryUICSS: jqueryUICSS,
            mainCSS: mainCSS,
            
            // Configuration
            title: 'Katachi Gen',
            testMode: process.env.NODE_ENV === 'development',
            
            // File system access for templates
            fs: fs,
            path: path,
            projectRoot: projectRoot,
            
            // Utility functions for EJS
            readFile: (filePath) => {
                const fullPath = path.join(projectRoot, filePath);
                if (fs.existsSync(fullPath)) {
                    return fs.readFileSync(fullPath, 'utf8');
                }
                console.warn(`⚠️ File not found: ${fullPath}`);
                return '';
            },
            
            // Asset inlining function
            inlineAsset: (assetPath) => {
                const fullPath = path.join(projectRoot, 'public/', assetPath);
                if (fs.existsSync(fullPath)) {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    return content;
                }
                return '';
            }
        };
        
        console.log('🎨 Generating HTML using modular EJS template system...');
        
        // Generate the HTML using EJS - use synchronous rendering
        const html = await ejs.renderFile(templatePath, templateData, {
            // EJS options
            root: path.join(__dirname, '../src/template'),
            views: [
                path.join(__dirname, '../src/template'),
                path.join(__dirname, '../src/template/partials')
            ],
            cache: false, // Disable cache for development
            async: false, // Use synchronous rendering to avoid Promise issues
            filename: templatePath // Important for resolving relative includes
        });
        
        console.log('✅ Modular template generated successfully');
        console.log(`📊 Generated HTML size: ${html.length} bytes`);
        
        // Debug: Show first 1000 chars of generated HTML
        console.log('📝 Generated HTML preview:');
        console.log(html.substring(0, 1000));
        console.log('...');
        
        return html;
        
    } catch (error) {
        console.error('❌ Error generating modular template:', error);
        throw new Error(`EJS template generation failed: ${error.message}`);
    }
}


/**
 * Generate NFT template with complete data processing
 * @param {Object} data - Request data with images, pattern, etc.
 * @returns {string} - Complete HTML template
 */
async function generateNFTTemplate(data) {
    try {
        // Prepare NFT data structure that matches the original system
        const nftData = {
            // Core NFT information
            walletAddress: data.walletAddress || 'unknown',
            patternType: data.patternType || 'Crane',
            seed2: data.seed2 || Math.random().toString(36),
            
            // Image data (base64 encoded)
            images: data.images || [],
            
            // Generation metadata
            generatedAt: new Date().toISOString(),
            templateVersion: '2.0-modular',
            
            // Additional metadata
            metadata: {
                imageCount: data.images ? data.images.length : 0,
                forMinting: data.forMinting || false,
                testMode: process.env.NODE_ENV === 'development'
            }
        };
        
        console.log('🎨 Starting NFT template generation...');
        console.log(`📋 Pattern: ${nftData.patternType}`);
        console.log(`🖼️ Images: ${nftData.metadata.imageCount}`);
        
        // Generate the template
        const html = await generateModularTemplate(nftData);
        
        // Validate the generated template
        if (!html || html.length < 1000) {
            throw new Error(`Generated template too small (${html.length} bytes) - EJS compilation failed`);
        }
        
        // Check for critical components
        const criticalChecks = [
            { name: 'NFT Data', check: html.includes('"walletAddress"') },
            { name: 'Three.js', check: html.includes('THREE') || html.includes('three.js') },
            { name: 'Pattern Type', check: html.includes(nftData.patternType) },
            { name: 'Bootstrap', check: html.includes('bootstrap') || html.includes('Bootstrap') }
        ];
        
        const failedChecks = criticalChecks.filter(c => !c.check);
        if (failedChecks.length > 0) {
            console.warn('⚠️ Template validation warnings:');
            failedChecks.forEach(check => {
                console.warn(`   - Missing: ${check.name}`);
            });
        }
        
        console.log('✅ NFT template generation complete');
        return html;
        
    } catch (error) {
        console.error('❌ NFT template generation failed:', error);
        throw error;
    }
}

/**
 * Generate a test template with sample data
 * @returns {string} - Test HTML template
 */
async function generateTestTemplate() {
    // Read actual test images and convert to base64
    const testImagePaths = [
        path.join(__dirname, '../public/textures/yatreda-1.png'),
        path.join(__dirname, '../public/textures/thankyoux-theprocess.png'),
        path.join(__dirname, '../public/assets/hyparStrain.png'),
        path.join(__dirname, '../public/assets/foldedCraneSmall.png'),
        path.join(__dirname, '../public/assets/flatcraneSmall.png')
    ];
    
    const images = [];
    for (let i = 0; i < testImagePaths.length; i++) {
        const imagePath = testImagePaths[i];
        if (fs.existsSync(imagePath)) {
            const imageBuffer = fs.readFileSync(imagePath);
            const imageExtension = path.extname(imagePath).substring(1);
            const mimeType = imageExtension === 'png' ? 'image/png' : 'image/jpeg';
            const base64Data = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
            
            images.push({
                name: path.basename(imagePath),
                data: base64Data
            });
        }
    }
    
    console.log(`✅ Test template: loaded ${images.length} real images for testing`);
    
    const testData = {
        walletAddress: 'test-wallet-address',
        patternType: 'Crane',
        seed2: 'test-seed-' + Date.now(),
        images: images
    };
    
    return await generateNFTTemplate(testData);
}

module.exports = {
    generateModularTemplate,
    generateNFTTemplate,
    generateTestTemplate
};