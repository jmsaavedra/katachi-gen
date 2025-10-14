// Pattern generation handler
const fs = require('fs');
const path = require('path');
const { TESTING_MODE, ENABLE_MINTING, templateHTML, origamiPatterns, port } = require('../config');
const { processImagesAsBase64 } = require('../image/processor');
const { generateThumbnail } = require('../image/thumbnail-html');
const { saveThumbnail } = require('../image/processor');
const { uploadToR2 } = require('../storage/r2');
const { uploadFileToArweave } = require('../storage/arweave');
const { generateNFTTemplate } = require('../utils/templateGenerator');

/**
 * Handle pattern generation request
 */
async function handlePatternGeneration(req, res, data) {
    // Process POST data here
    console.log('Received data summary:', {
        walletAddress: data.walletAddress,
        patternType: data.patternType,
        seed2: data.seed2,
        imageCount: data.images ? data.images.length : 0,
        forMinting: data.forMinting || false
    });

    // Validate required fields
    if (!data.walletAddress && !data.stackData?.userAddress) {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(400);
        res.end(JSON.stringify({
            success: false,
            error: 'Wallet address or stack user address is required'
        }));
        return;
    }

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
        // Process images to embed them as base64 before generating anything
        console.log('🎨 Pre-processing images for self-contained HTML...');
        const processedData = await processImagesAsBase64(data);
        console.log('🎨 Image processing completed, proceeding with generation...');
        
        // Create HTML content using the new modular template system
        console.log('🎨 Generating HTML using modular EJS template system...');
        const startTime = Date.now();
        
        const htmlContent = await generateNFTTemplate(processedData);
        
        const processingTime = Date.now() - startTime;
        console.log(`✅ Modular template generated in ${processingTime}ms`);
        
        // Create temp HTML file
        const walletAddress = data.walletAddress || data.stackData?.userAddress;
        const timestamp = Date.now();
        const htmlFilename = `kg_${data.patternType.toLowerCase()}-${walletAddress}-${timestamp}.html`;
        const htmlPath = path.join(__dirname, '..', 'temp', 'html', htmlFilename);
        
        // Ensure temp/html directory exists
        const tempHtmlDir = path.dirname(htmlPath);
        if (!fs.existsSync(tempHtmlDir)) {
            fs.mkdirSync(tempHtmlDir, { recursive: true });
        }
        
        // Write HTML to temp file
        fs.writeFileSync(htmlPath, htmlContent);
        console.log('🎯 HTML file created at:', htmlPath);

        // generate thumbnail image from the actual HTML file
        console.log('Generating thumbnail from HTML content...');
        const thumbnailBuffer = await generateThumbnail(processedData, htmlPath);
        console.log('Thumbnail generated, size:', thumbnailBuffer.length, 'bytes');
        
        // Save thumbnail (optional)
        const thumbnailFilename = `thumbnail_${timestamp}.png`;
        const thumbnailPath = await saveThumbnail(thumbnailBuffer, thumbnailFilename);
        
        let thumbnailTxId, htmlTxId, thumbnailUrl, htmlUrl, previewHtmlUrl;
        
        // Check if this request is from test.html (testing interface)
        const isTestInterface = data.testInterface === true || data.source === 'test';

        // Use ENABLE_MINTING flag to control Arweave uploads
        // ENABLE_MINTING from .env takes precedence over frontend forMinting flag
        // This gives developers full control via local environment
        const shouldUseArweave = ENABLE_MINTING && !isTestInterface;
        
        if (isTestInterface) {
            // Test interface: Keep files local only
            console.log('🧪 TEST INTERFACE: Keeping files local for evaluation');
            
            // Use local URLs for everything
            thumbnailUrl = `http://localhost:${port}/thumbnails/${thumbnailFilename}`;
            htmlUrl = `http://localhost:${port}/temp/html/${htmlFilename}`;
            previewHtmlUrl = htmlUrl;
            
            // Set transaction IDs to match the actual URLs for metadata consistency
            thumbnailTxId = thumbnailUrl;
            htmlTxId = htmlUrl;
            
            console.log('✅ HTML file saved locally at:', htmlPath);
            console.log('🔗 Access it at:', htmlUrl);
            console.log('📁 Physical location:', htmlPath);
            
        } else if (!shouldUseArweave) {
            // Local development mode: Keep everything local, no uploads
            console.log('🔧 LOCAL DEVELOPMENT MODE: Keeping files local, skipping uploads');

            // Use local URLs for everything
            thumbnailUrl = `http://localhost:${port}/thumbnails/${thumbnailFilename}`;
            htmlUrl = `http://localhost:${port}/temp/html/${htmlFilename}`;
            previewHtmlUrl = htmlUrl;

            // Set transaction IDs to match the actual URLs for metadata consistency
            thumbnailTxId = thumbnailUrl;
            htmlTxId = htmlUrl;

            console.log('⏭️  Skipping Arweave upload due to local development mode');
            console.log('⏭️  Skipping temp file cleanup due to local development mode');
            console.log('✅ HTML file kept at:', htmlPath);
            console.log('🔗 Access it at:', htmlUrl);

        } else {
            // Production mode OR minting enabled: Upload to R2 + Arweave
            const modeDescription = ENABLE_MINTING ? 'MINTING MODE (ENABLE_MINTING=true)' : 'PRODUCTION MODE';
            console.log(`🚀 ${modeDescription}: Uploading to Arweave and R2`);
            
            // Upload to R2 first for fast gallery access
            const r2Url = await uploadToR2(htmlPath, htmlFilename);
            
            // Upload thumbnail to Arweave
            console.log('Uploading thumbnail to Arweave...');
            const arweaveWalletPath = process.env.ARWEAVE_WALLET_PATH || path.join(__dirname, '..', 'arweave-wallet.json');
            thumbnailTxId = await uploadFileToArweave(thumbnailPath, arweaveWalletPath);
            console.log('Thumbnail uploaded to Arweave:', thumbnailTxId);
            
            // Upload HTML to Arweave
            console.log('Uploading HTML to Arweave...');
            htmlTxId = await uploadFileToArweave(htmlPath, arweaveWalletPath);
            console.log('HTML uploaded to Arweave:', htmlTxId);
            
            // Set URLs - Arweave for permanent metadata, R2/local for preview
            thumbnailUrl = `https://arweave.net/${thumbnailTxId}`;
            htmlUrl = `https://arweave.net/${htmlTxId}`; // For metadata/tokenURI
            
            // Determine preview URL - prioritize R2, keep local file if R2 failed
            if (r2Url) {
                previewHtmlUrl = r2Url;
                console.log('🎨 Gallery URL:', r2Url);

                // Clean up temp file since we have R2 URL (only in production)
                if (!TESTING_MODE) {
                    try {
                        fs.unlinkSync(htmlPath);
                        console.log('🧹 Cleaned up temp file (using R2 URL)');
                    } catch (cleanupError) {
                        console.warn('Could not clean up temporary HTML file:', cleanupError.message);
                    }
                } else {
                    console.log('⏭️  Skipping temp file cleanup due to local development mode (minting)');
                    console.log('📁 Temp file kept at:', htmlPath);
                }
            } else {
                // Keep temp file for preview since R2 upload failed
                previewHtmlUrl = `http://localhost:${port}/temp/html/${htmlFilename}`;
                console.log('⚠️ R2 upload failed, keeping temp file for preview:', previewHtmlUrl);
            }
        }
        
        // Send response with both transaction IDs and image stats
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify({
            success: true,
            message: TESTING_MODE ? 'NFT generated and saved locally for testing' : 'NFT generated and uploaded successfully',
            thumbnailId: thumbnailTxId,
            htmlId: htmlTxId,
            thumbnailUrl: thumbnailUrl,
            htmlUrl: htmlUrl, // For metadata/tokenURI (Arweave in production, hosted in testing)
            previewHtmlUrl: previewHtmlUrl, // For iframe preview (always hosted)
            patternType: processedData.patternType,
            imageStats: processedData.imageStats,
            processingTime: processingTime, // Template generation time
            templateVersion: '2.0-modular',
            testingMode: TESTING_MODE
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
}

module.exports = {
    handlePatternGeneration
};