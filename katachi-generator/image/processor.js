// Image processing utilities
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const https = require('https');
const http = require('http');
const {
    THUMB_WIDTH,
    THUMB_HEIGHT,
    IMAGE_COMPRESSION_THRESHOLD,
    IMAGE_COMPRESSION_QUALITY
} = require('../config');

/**
 * Format bytes to KB with commas, no decimals
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted string like "1,024 KB"
 */
function formatFileSize(bytes) {
    if (bytes === undefined || bytes === null || bytes === 0) {
        return '0 KB';
    }

    // Always convert to KB and round, no decimals
    const kb = Math.round(bytes / 1024);

    // Add commas for thousands
    return `${kb.toLocaleString()} KB`;
}

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
function downloadWithStrategy(imageUrl, options, prefix = '', smartCompression = false) {
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
                return downloadWithStrategy(response.headers.location, options, prefix, smartCompression).then(resolve).catch(reject);
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

                    // Smart compression mode: Always compress to 750px @ 90% quality
                    if (smartCompression) {
                        console.log(`${prefix}🗜️ Smart compression mode: reducing to 750px longest side @ 90% quality`);

                        const compressionResult = await compressImage(buffer, {
                            quality: 90,
                            maxWidth: 750,
                            maxHeight: 750
                        });

                        resolve({
                            buffer: compressionResult.buffer,
                            originalUrl: imageUrl,
                            size: buffer.length,
                            compressedSize: compressionResult.compressedSize,
                            compressionStats: compressionResult,
                            smartCompression: true
                        });
                    }
                    // Standard compression: Only compress images over 150KB, preserving original dimensions
                    else if (buffer.length > IMAGE_COMPRESSION_THRESHOLD) {
                        console.log(`${prefix}🗜️ Image is ${buffer.length} bytes (>${IMAGE_COMPRESSION_THRESHOLD}), compressing with quality ${IMAGE_COMPRESSION_QUALITY} (preserving dimensions)`);

                        // Get original image metadata to preserve dimensions
                        const metadata = await sharp(buffer).metadata();

                        const compressionResult = await compressImage(buffer, {
                            quality: IMAGE_COMPRESSION_QUALITY,
                            maxWidth: metadata.width,  // Preserve original width
                            maxHeight: metadata.height  // Preserve original height
                        });

                        resolve({
                            buffer: compressionResult.buffer,
                            originalUrl: imageUrl,
                            size: buffer.length,
                            compressedSize: compressionResult.compressedSize,
                            compressionStats: compressionResult
                        });
                    } else {
                        // Skip compression for images under 150KB
                        console.log(`${prefix}✅ Downloaded: ${buffer.length} bytes (no compression needed)`);

                        resolve({
                            buffer: buffer,
                            originalUrl: imageUrl,
                            size: buffer.length,
                            compressedSize: buffer.length,
                            compressionStats: {
                                buffer: buffer,
                                originalSize: buffer.length,
                                compressedSize: buffer.length,
                                compressionRatio: 0
                            }
                        });
                    }
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
 * Download image as base64 with retry logic and exponential backoff
 */
async function downloadImageAsBase64(imageUrl, imageNumber = null, maxRetries = 4, smartCompression = false) {
    const prefix = imageNumber ? `Image #${imageNumber}: ` : '';

    const strategies = [
        {
            name: 'Standard download',
            options: { timeout: 10000 },
            backoffMs: 0  // No delay on first attempt
        },
        {
            name: 'Extended timeout (retry 1)',
            options: { timeout: 20000 },
            backoffMs: 1000  // 1 second delay
        },
        {
            name: 'Custom headers (retry 2)',
            options: {
                timeout: 25000,
                headers: {
                    'Accept': 'image/*,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Cache-Control': 'no-cache'
                }
            },
            backoffMs: 2000  // 2 second delay (exponential backoff)
        },
        {
            name: 'Maximum timeout (retry 3)',
            options: {
                timeout: 30000,
                headers: {
                    'Accept': 'image/*,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive'
                }
            },
            backoffMs: 4000  // 4 second delay (exponential backoff)
        }
    ];

    for (let attempt = 0; attempt < Math.min(maxRetries, strategies.length); attempt++) {
        const strategy = strategies[attempt];

        // Apply exponential backoff delay before retry
        if (strategy.backoffMs > 0) {
            console.log(`${prefix}⏳ Waiting ${strategy.backoffMs}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, strategy.backoffMs));
        }

        if (attempt > 0) {
            console.log(`${prefix}🔄 Retry attempt ${attempt + 1}/${maxRetries - 1}: ${strategy.name}`);
        }

        try {
            const result = await downloadWithStrategy(imageUrl, strategy.options, prefix, smartCompression);
            if (result) {
                if (attempt > 0) {
                    console.log(`${prefix}✅ Success on retry attempt ${attempt + 1}`);
                }
                return result;
            }
        } catch (error) {
            console.warn(`${prefix}❌ ${strategy.name} failed: ${error.message}`);

            // If this was the last attempt, throw the error
            if (attempt === Math.min(maxRetries, strategies.length) - 1) {
                console.error(`${prefix}💥 All ${maxRetries} retry attempts exhausted`);
            }
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
    console.log('═══════════════════════════════════════════════════════════════════');

    // Create a deep copy to avoid modifying original data
    const processedData = JSON.parse(JSON.stringify(data));

    // Process main images array
    if (processedData.images && Array.isArray(processedData.images)) {
        console.log(`📋 Processing ${processedData.images.length} NFT images`);
        console.log('');

        for (let i = 0; i < processedData.images.length; i++) {
            const image = processedData.images[i];
            if (image.url) {
                try {
                    console.log(`\n🖼️  IMAGE ${i + 1}/${processedData.images.length}: ${image.name || 'Unnamed NFT'}`);
                    console.log('───────────────────────────────────────────────────────────────────');

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
                    let imageSource = 'direct-download';
                    let usedProvidedThumbnail = false;

                    // Log available URLs from MCP with file sizes
                    console.log('📍 Available URLs:');
                    if (image.preferredImageUrl) {
                        console.log(`   • preferredImageUrl: ${image.preferredImageUrl}`);
                    }
                    if (image.thumbnailUrl) {
                        console.log(`   • thumbnailUrl: ${image.thumbnailUrl}`);
                    }
                    if (image.pngUrl) {
                        console.log(`   • pngUrl: ${image.pngUrl}`);
                    }
                    if (image.originalImageUrl) {
                        // Use formatted size from frontend if available, otherwise format here
                        const sizeStr = image.alchemyImageSizeFormatted
                            ? ` (${image.alchemyImageSizeFormatted})`
                            : image.alchemyImageSize
                                ? ` (${formatFileSize(image.alchemyImageSize)})`
                                : '';
                        console.log(`   • originalImageUrl: ${image.originalImageUrl}${sizeStr}`);
                    }

                    // Waterfall logic: Check file size to determine compression strategy
                    const SIZE_THRESHOLD_KB = 1024; // 1 MB (1,024 KB) threshold
                    const SIZE_THRESHOLD_BYTES = SIZE_THRESHOLD_KB * 1024;
                    const originalSizeBytes = image.alchemyImageSize || 0;
                    const needsCloudinaryResize = originalSizeBytes > SIZE_THRESHOLD_BYTES;

                    // Check if this is a video URL (Cloudinary video URLs contain 'video/upload')
                    const isVideoUrl = image.preferredImageUrl?.includes('video/upload') ||
                                      image.pngUrl?.includes('video/upload') ||
                                      image.url?.includes('video/upload');

                    // Skip videos that are too large - video-to-image conversion URLs often don't work
                    if (isVideoUrl && needsCloudinaryResize) {
                        console.log(`\nImage #${i + 1}: ⚠️  SKIPPING: Video NFT exceeds ${SIZE_THRESHOLD_KB} KB threshold`);
                        console.log(`   • Name: ${image.name || 'Unknown'}`);
                        console.log(`   • Original size: ${formatFileSize(originalSizeBytes)}`);
                        console.log(`   • Reason: Cloudinary video-to-image conversion URLs often fail for large videos`);
                        console.log(`   • Suggestion: Consider using thumbnail-only collections or smaller video files`);
                        failedImages++;
                        continue; // Skip this image
                    }

                    // Use preferredImageUrl if provided by MCP server (already determined based on collection config)
                    // This is the cleanest approach - MCP knows which collections need high-res vs thumbnails
                    if (image.preferredImageUrl) {
                        imageUrlToDownload = image.preferredImageUrl;
                        imageSource = 'mcp-preferred';
                        usedProvidedThumbnail = true;

                        // If image exceeds threshold AND it's a Cloudinary image URL (not video), inject transformation parameters
                        if (needsCloudinaryResize && imageUrlToDownload.includes('res.cloudinary.com') && !isVideoUrl) {
                            // Inject Cloudinary transformations: w_750,c_limit,q_90
                            // This will resize to 750px max dimension, only if larger, at 90% quality
                            const originalUrl = imageUrlToDownload;
                            imageUrlToDownload = imageUrlToDownload.replace('/upload/', '/upload/w_750,c_limit,q_90/');

                            console.log(`\nImage #${i + 1}: ✅ Selected: preferredImageUrl (MCP-configured)`);
                            console.log(`   ⚠️  Original size ${formatFileSize(originalSizeBytes)} exceeds ${SIZE_THRESHOLD_KB} KB threshold`);
                            console.log(`   ☁️  Using Cloudinary transformations: w_750,c_limit,q_90`);
                            console.log(`   📐 Original URL: ${originalUrl}`);
                            console.log(`   📐 Transformed URL: ${imageUrlToDownload}`);
                            imageSource = 'cloudinary-optimized';
                        } else if (needsCloudinaryResize) {
                            console.log(`\nImage #${i + 1}: ✅ Selected: preferredImageUrl (MCP-configured)`);
                            console.log(`   ⚠️  Original size ${formatFileSize(originalSizeBytes)} exceeds ${SIZE_THRESHOLD_KB} KB threshold`);
                            console.log(`   ⚠️  Not a Cloudinary URL - will download full size (consider local compression)`);
                        } else if (originalSizeBytes > 0) {
                            console.log(`\nImage #${i + 1}: ✅ Selected: preferredImageUrl (MCP-configured)`);
                            console.log(`   ✅ Original size ${formatFileSize(originalSizeBytes)} is under ${SIZE_THRESHOLD_KB} KB threshold, no optimization needed`);
                        } else {
                            console.log(`\nImage #${i + 1}: ✅ Selected: preferredImageUrl (MCP-configured)`);
                        }
                    } else if (image.thumbnailUrl) {
                        // Fallback: use thumbnail if no preferred URL
                        imageUrlToDownload = image.thumbnailUrl;
                        imageSource = 'mcp-thumbnail';
                        usedProvidedThumbnail = true;
                        console.log(`\nImage #${i + 1}: ✅ Selected: thumbnailUrl (fallback)`);
                    } else {
                        // Last resort: use the URL provided in image.url
                        console.log(`\nImage #${i + 1}: ⚠️  Selected: original URL (no optimized URLs available)`);
                    }

                    // Store flag for tracking (no longer used for compression)
                    image.usedCloudinaryOptimization = needsCloudinaryResize && imageUrlToDownload.includes('w_750,c_limit,q_90');

                    console.log(`Image #${i + 1}: 🔗 Downloading from: ${imageUrlToDownload.slice(0, 100)}...`);

                    image.source = imageSource;

                    // Note: We no longer pass smartCompression flag since Cloudinary handles optimization via URL parameters
                    const downloadResult = await downloadImageAsBase64(imageUrlToDownload, i + 1, 3, false);
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
                    image.usedProvidedThumbnail = usedProvidedThumbnail;

                    // Calculate compression info
                    const wasCompressed = downloadResult.size !== downloadResult.compressedSize;
                    const compressionRatio = wasCompressed
                        ? Math.round((1 - downloadResult.compressedSize / downloadResult.size) * 100)
                        : 0;

                    console.log(`\n📊 Size Information:`);
                    console.log(`   • Downloaded: ${formatFileSize(downloadResult.size)}`);

                    // Show Cloudinary optimization info if used
                    if (image.usedCloudinaryOptimization) {
                        console.log(`   • Optimization: ☁️  CLOUDINARY (w_750,c_limit,q_90 - server-side resize)`);
                        console.log(`   • Original size: ${formatFileSize(originalSizeBytes)} → Downloaded: ${formatFileSize(downloadResult.size)}`);
                        const cloudinaryReduction = Math.round((1 - downloadResult.size / originalSizeBytes) * 100);
                        console.log(`   • Bandwidth saved: ${cloudinaryReduction}% (Cloudinary handled optimization)`);
                    } else if (wasCompressed) {
                        console.log(`   • Compressed: ${formatFileSize(downloadResult.compressedSize)} (${compressionRatio}% reduction)`);
                        if (downloadResult.smartCompression) {
                            console.log(`   • Compression: ✅ LOCAL COMPRESSION (750px @ 90% quality, >2,500 KB original)`);
                        } else {
                            console.log(`   • Compression: ✅ APPLIED (over 150 KB threshold)`);
                        }
                    } else {
                        console.log(`   • Compressed: ${formatFileSize(downloadResult.compressedSize)} (no compression needed)`);
                        console.log(`   • Compression: ⏭️  SKIPPED (under 150 KB threshold)`);
                    }
                    console.log(`   • Base64 size: ${formatFileSize(base64String.length)}`);

                } catch (error) {
                    console.error(`❌ Failed to process image ${i + 1}: ${error.message}`);
                    // Keep original URL as fallback
                    image.error = error.message;
                }
            }
        }
    }

    // Calculate comprehensive statistics
    const totalDownloaded = processedData.images?.reduce((sum, img) => sum + (img.size || 0), 0) || 0;
    const totalCompressed = processedData.images?.reduce((sum, img) => sum + (img.compressedSize || 0), 0) || 0;
    const numCompressed = processedData.images?.filter(img => img.size !== img.compressedSize).length || 0;
    const numSkipped = processedData.images?.filter(img => img.size === img.compressedSize).length || 0;

    // Add processing metadata
    processedData.imageStats = {
        totalImages: processedData.images?.length || 0,
        processedImages: processedData.images?.filter(img => img.url && img.url.startsWith('data:')).length || 0,
        failedImages: processedData.images?.filter(img => img.error).length || 0,
        mcpThumbnails: processedData.images?.filter(img => img.usedProvidedThumbnail).length || 0,
        directDownloads: processedData.images?.filter(img => img.source === 'direct-download').length || 0,
        totalDownloadedBytes: totalDownloaded,
        totalCompressedBytes: totalCompressed,
        numCompressed: numCompressed,
        numSkipped: numSkipped,
        timestamp: new Date().toISOString()
    };

    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('📊 IMAGE PROCESSING SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log(`✅ Successfully processed: ${processedData.imageStats.processedImages}/${processedData.imageStats.totalImages} images`);
    console.log(`❌ Failed: ${processedData.imageStats.failedImages}`);
    console.log(`📦 MCP thumbnails used: ${processedData.imageStats.mcpThumbnails}`);
    console.log('');
    console.log('💾 Bandwidth Usage:');
    console.log(`   • Total downloaded: ${formatFileSize(totalDownloaded)}`);
    console.log(`   • Total after compression: ${formatFileSize(totalCompressed)}`);
    if (totalDownloaded > totalCompressed) {
        const savedBytes = totalDownloaded - totalCompressed;
        const savedPercent = Math.round((savedBytes / totalDownloaded) * 100);
        console.log(`   • Bandwidth saved: ${formatFileSize(savedBytes)} (${savedPercent}%)`);
    }
    console.log('');
    console.log('🗜️  Compression Stats:');
    console.log(`   • Images compressed: ${numCompressed}`);
    console.log(`   • Images skipped (< 150 KB): ${numSkipped}`);
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('');

    return processedData;
}

module.exports = {
    saveThumbnail,
    compressImage,
    downloadWithStrategy,
    downloadImageAsBase64,
    processImagesAsBase64
};