// Image processing utilities
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const https = require('https');
const http = require('http');
const { THUMB_WIDTH, THUMB_HEIGHT } = require('../config');
const { getNFTMetadataFromAlchemy, getBestImageUrl } = require('../utils/alchemyClient');

/**
 * Save thumbnail to file
 */
async function saveThumbnail(buffer, filename) {
    try {
        const thumbnailPath = path.join(__dirname, '..', 'temp', 'thumbnails', filename);
        
        // Ensure thumbnails directory exists
        const thumbnailDir = path.dirname(thumbnailPath);
        if (!fs.existsSync(thumbnailDir)) {
            fs.mkdirSync(thumbnailDir, { recursive: true });
        }
        
        // Write thumbnail to file
        fs.writeFileSync(thumbnailPath, buffer);
        
        console.log('Thumbnail saved to:', thumbnailPath);
        return thumbnailPath;
    } catch (error) {
        console.error('Error saving thumbnail:', error);
        throw error;
    }
}

/**
 * Compress image using Sharp
 */
async function compressImage(buffer, options = {}) {
    const {
        quality = 85,
        maxWidth = THUMB_WIDTH,
        maxHeight = THUMB_HEIGHT,
        format = 'png'
    } = options;
    
    try {
        console.log(`🗜️ Compressing image: original size ${buffer.length} bytes`);
        
        let sharpInstance = sharp(buffer);
        
        // Resize if dimensions are specified
        if (maxWidth && maxHeight) {
            sharpInstance = sharpInstance.resize(maxWidth, maxHeight, {
                fit: 'inside',
                withoutEnlargement: true
            });
        }
        
        // Apply format and quality
        if (format === 'jpeg' || format === 'jpg') {
            sharpInstance = sharpInstance.jpeg({ quality });
        } else if (format === 'png') {
            sharpInstance = sharpInstance.png({ quality });
        }
        
        const compressedBuffer = await sharpInstance.toBuffer();
        
        console.log(`✅ Compression complete: ${buffer.length} → ${compressedBuffer.length} bytes (${Math.round((1 - compressedBuffer.length / buffer.length) * 100)}% reduction)`);
        
        return {
            buffer: compressedBuffer,
            originalSize: buffer.length,
            compressedSize: compressedBuffer.length,
            compressionRatio: Math.round((1 - compressedBuffer.length / buffer.length) * 100)
        };
        
    } catch (error) {
        console.warn(`⚠️ Image compression failed: ${error.message}, using original`);
        return {
            buffer,
            originalSize: buffer.length,
            compressedSize: buffer.length,
            compressionRatio: 0,
            error: error.message
        };
    }
}

/**
 * Download image with strategy pattern
 */
function downloadWithStrategy(imageUrl, options) {
    const { timeout = 10000, headers = {} } = options;
    
    return new Promise((resolve, reject) => {
        const client = imageUrl.startsWith('https:') ? https : http;
        const chunks = [];
        
        const req = client.get(imageUrl, { 
            timeout,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                ...headers
            }
        }, (response) => {
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                // Handle redirects
                console.log(`🔄 Redirecting to: ${response.headers.location}`);
                return downloadWithStrategy(response.headers.location, options).then(resolve).catch(reject);
            }
            
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                return;
            }
            
            response.on('data', (chunk) => {
                chunks.push(chunk);
            });
            
            response.on('end', async () => {
                try {
                    const buffer = Buffer.concat(chunks);
                    
                    if (buffer.length === 0) {
                        throw new Error('Empty response received');
                    }
                    
                    // Compress the image
                    const compressionResult = await compressImage(buffer, {
                        quality: 85,
                        maxWidth: 800,
                        maxHeight: 800
                    });
                    
                    resolve({
                        buffer: compressionResult.buffer,
                        originalUrl: imageUrl,
                        size: buffer.length,
                        compressedSize: compressionResult.compressedSize,
                        compressionStats: compressionResult
                    });
                } catch (error) {
                    reject(new Error(`Processing failed: ${error.message}`));
                }
            });
            
            response.on('error', reject);
        });
        
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error(`Request timeout after ${timeout}ms`));
        });
    });
}

/**
 * Extract contract address and token ID from NFT image URL
 * Supports IPFS and HTTP URLs with various formats
 */
function parseNFTInfoFromUrl(imageUrl, metadata = {}) {
    // Try to extract from metadata if available
    if (metadata.contractAddress && metadata.tokenId) {
        return {
            contractAddress: metadata.contractAddress,
            tokenId: metadata.tokenId
        };
    }

    // Common NFT URL patterns:
    // ipfs://bafybei.../123.gif -> token ID might be in filename
    // https://nft.storage/.../metadata.json
    // For now, return null - caller must provide contract/tokenId explicitly
    return null;
}

/**
 * Try to fetch optimized image from Alchemy API
 * @param {string} contractAddress - NFT contract address
 * @param {string} tokenId - NFT token ID
 * @returns {Promise<string|null>} Optimized image URL or null if not available
 */
async function getOptimizedImageFromAlchemy(contractAddress, tokenId) {
    try {
        const nftData = await getNFTMetadataFromAlchemy(contractAddress, tokenId);

        // Log which image sizes are available for this NFT
        console.log(`📸 Alchemy image availability for ${contractAddress}:${tokenId}:`);
        console.log(`   - thumbnail (256x256): ${nftData.images.thumbnail ? '✅ available' : '❌ not available'}`);
        console.log(`   - medium (512x512): ${nftData.images.medium ? '✅ available' : '❌ not available'}`);
        console.log(`   - cached: ${nftData.images.cached ? '✅ available' : '❌ not available'}`);
        console.log(`   - original: ${nftData.images.original ? '✅ available' : '❌ not available'}`);

        const optimizedUrl = getBestImageUrl(nftData.images);

        if (optimizedUrl) {
            console.log(`✅ Using Alchemy optimized image: ${optimizedUrl.slice(0, 80)}...`);
            return optimizedUrl;
        }

        console.log(`⚠️ No optimized images found in Alchemy, falling back to direct download`);
        return null;
    } catch (error) {
        console.warn(`⚠️ Alchemy API failed: ${error.message}, falling back to direct download`);
        return null;
    }
}

/**
 * Download image as base64 with retry logic
 */
async function downloadImageAsBase64(imageUrl, maxRetries = 3) {
    console.log(`📥 Downloading image: ${imageUrl}`);
    
    const strategies = [
        {
            name: 'Standard download',
            options: { timeout: 10000 }
        },
        {
            name: 'Extended timeout',
            options: { timeout: 20000 }
        },
        {
            name: 'Custom headers',
            options: { 
                timeout: 15000,
                headers: {
                    'Accept': 'image/*,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Cache-Control': 'no-cache'
                }
            }
        }
    ];
    
    for (let attempt = 0; attempt < Math.min(maxRetries, strategies.length); attempt++) {
        const strategy = strategies[attempt];
        console.log(`🔄 Attempt ${attempt + 1}: ${strategy.name} for ${imageUrl}`);
        
        try {
            const result = await downloadWithStrategy(imageUrl, strategy.options);
            if (result) {
                const base64 = result.buffer.toString('base64');
                return result;
            }
        } catch (error) {
            console.warn(`❌ ${strategy.name} failed for ${imageUrl}: ${error.message}`);
        }
    }
    
    throw new Error(`All download attempts failed for ${imageUrl}`);
}

/**
 * Process images as base64 for embedding
 * Tries to use Rarible optimized thumbnails first, falls back to direct download
 */
async function processImagesAsBase64(data) {
    console.log('🎨 Processing images for base64 embedding...');

    // Create a deep copy to avoid modifying original data
    const processedData = JSON.parse(JSON.stringify(data));

    // Process main images array
    if (processedData.images && Array.isArray(processedData.images)) {
        console.log(`📋 Processing ${processedData.images.length} images`);

        for (let i = 0; i < processedData.images.length; i++) {
            const image = processedData.images[i];
            if (image.url) {
                try {
                    console.log(`🔄 Processing image ${i + 1}/${processedData.images.length}: ${image.url.slice(0, 50)}...`);

                    // Check if already a data URI (base64 encoded)
                    if (image.url.startsWith('data:')) {
                        console.log(`✅ Image ${i + 1} already base64 data URI, using as-is`);
                        image.originalUrl = image.url;
                        image.alreadyEncoded = true;

                        // Extract size from base64 string for stats
                        const base64Match = image.url.match(/base64,(.+)$/);
                        if (base64Match) {
                            image.size = base64Match[1].length;
                            image.compressedSize = base64Match[1].length;
                        }

                        continue; // Skip download/processing
                    }

                    let imageUrlToDownload = image.url;
                    let usedAlchemy = false;

                    // Try Alchemy first if we have contract and token info
                    if (image.contractAddress && image.tokenId) {
                        console.log(`🔍 Attempting to fetch optimized image from Alchemy for ${image.contractAddress}:${image.tokenId}`);
                        const alchemyUrl = await getOptimizedImageFromAlchemy(image.contractAddress, image.tokenId);
                        if (alchemyUrl) {
                            imageUrlToDownload = alchemyUrl;
                            usedAlchemy = true;
                            image.source = 'alchemy';
                        }
                    } else {
                        console.log(`⚠️ No contract/token info for image ${i + 1}, using direct download`);
                    }

                    const downloadResult = await downloadImageAsBase64(imageUrlToDownload);
                    const base64String = downloadResult.buffer.toString('base64');

                    // Determine MIME type from URL or default to PNG
                    let mimeType = 'image/png';
                    const urlLower = imageUrlToDownload.toLowerCase();
                    if (urlLower.includes('.jpg') || urlLower.includes('.jpeg')) {
                        mimeType = 'image/jpeg';
                    } else if (urlLower.includes('.gif')) {
                        mimeType = 'image/gif';
                    } else if (urlLower.includes('.webp')) {
                        mimeType = 'image/webp';
                    }

                    // Store both original URL and base64
                    image.originalUrl = image.url;
                    image.url = `data:${mimeType};base64,${base64String}`;
                    image.size = downloadResult.size;
                    image.compressedSize = downloadResult.compressedSize;
                    image.usedAlchemy = usedAlchemy;

                    console.log(`✅ Image ${i + 1} processed${usedAlchemy ? ' (via Alchemy)' : ''}: ${downloadResult.size} → ${downloadResult.compressedSize} bytes`);

                } catch (error) {
                    console.error(`❌ Failed to process image ${i + 1}: ${error.message}`);
                    // Keep original URL as fallback
                    image.error = error.message;
                }
            }
        }
    }

    // Add processing metadata
    processedData.imageStats = {
        totalImages: processedData.images?.length || 0,
        processedImages: processedData.images?.filter(img => img.url && img.url.startsWith('data:')).length || 0,
        failedImages: processedData.images?.filter(img => img.error).length || 0,
        alchemyOptimized: processedData.images?.filter(img => img.usedAlchemy).length || 0,
        timestamp: new Date().toISOString()
    };

    console.log('🎨 Image processing completed:', processedData.imageStats);
    return processedData;
}

module.exports = {
    saveThumbnail,
    compressImage,
    downloadWithStrategy,
    downloadImageAsBase64,
    processImagesAsBase64,
    getOptimizedImageFromAlchemy
};