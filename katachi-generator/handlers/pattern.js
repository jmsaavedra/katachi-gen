// Pattern generation handler
const fs = require('fs');
const path = require('path');
const { TESTING_MODE, templateHTML, origamiPatterns, port } = require('../config');
const { processImagesAsBase64 } = require('../image/processor');
const { generateThumbnail } = require('../image/thumbnail-html');
const { saveThumbnail } = require('../image/processor');
const { uploadToR2 } = require('../storage/r2');
const { uploadFileToArweave } = require('../storage/arweave');

/**
 * Handle pattern generation request
 */
async function handlePatternGeneration(req, res, data) {
    // Process POST data here
    console.log('Received data summary:', {
        walletAddress: data.walletAddress,
        patternType: data.patternType,
        seed2: data.seed2,
        imageCount: data.images ? data.images.length : 0
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
        
        // Create HTML content first
        // load templateHTML file from public directory
        const templatePath = path.join(__dirname, '..', 'public', templateHTML);
        const templateContent = fs.readFileSync(templatePath, 'utf8');
        
        // Replace the ___NFT_DATA_PLACEHOLDER___ placeholder with JSON string
        // Use processed data with embedded base64 images
        const htmlContent = templateContent.replace(
            '___NFT_DATA_PLACEHOLDER___', 
            JSON.stringify(processedData, null, 2)
        );
        
        // Create temp HTML file
        const walletAddress = data.walletAddress || data.stackData?.userAddress;
        const timestamp = Date.now();
        const htmlFilename = `kg_${data.patternType.toLowerCase()}-${walletAddress}-${timestamp}.html`;
        const htmlPath = path.join(__dirname, '..', 'temp', htmlFilename);
        
        // Ensure temp directory exists
        const tempDir = path.dirname(htmlPath);
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
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
        
        if (TESTING_MODE) {
            // Testing mode: Try R2 first, fallback to local
            console.log('🧪 TESTING MODE: Trying R2 upload for preview...');
            
            const r2Url = await uploadToR2(htmlPath, htmlFilename);
            
            thumbnailTxId = `thumb_${timestamp}`;
            htmlTxId = `html_${timestamp}`;
            thumbnailUrl = `http://localhost:${port}/thumbnails/${thumbnailFilename}`;
            
            if (r2Url) {
                // R2 success: Use R2 for both metadata and preview, clean up temp file
                htmlUrl = r2Url;
                previewHtmlUrl = r2Url;
                console.log('✅ Using R2 for preview iframe:', r2Url);
                
                try {
                    fs.unlinkSync(htmlPath);
                    console.log('🧹 Cleaned up temp file (using R2)');
                } catch (cleanupError) {
                    console.warn('Could not clean up temporary HTML file:', cleanupError.message);
                }
            } else {
                // R2 failed: Keep local temp file for preview
                htmlUrl = `http://localhost:${port}/temp/${htmlFilename}`;
                previewHtmlUrl = htmlUrl;
                console.log('⚠️ R2 unavailable, using local temp file for preview:', htmlUrl);
                console.log('💡 To use R2 for reliable preview hosting, configure these environment variables:');
                console.log('   - CLOUDFLARE_R2_ENDPOINT');
                console.log('   - CLOUDFLARE_R2_ACCESS_KEY_ID');
                console.log('   - CLOUDFLARE_R2_SECRET_ACCESS_KEY');
            }
            
        } else {
            // Production mode: Upload to R2 + Arweave
            console.log('🚀 PRODUCTION MODE: Uploading to Arweave and R2');
            
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
                
                // Clean up temp file since we have R2 URL
                try {
                    fs.unlinkSync(htmlPath);
                    console.log('🧹 Cleaned up temp file (using R2 URL)');
                } catch (cleanupError) {
                    console.warn('Could not clean up temporary HTML file:', cleanupError.message);
                }
            } else {
                // Keep temp file for preview since R2 upload failed
                previewHtmlUrl = `http://localhost:${port}/temp/${htmlFilename}`;
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