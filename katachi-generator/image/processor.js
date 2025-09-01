// Image processing utilities
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const https = require('https');
const http = require('http');
const { THUMB_WIDTH, THUMB_HEIGHT } = require('../config');

/**
 * Save thumbnail to file
 */
async function saveThumbnail(buffer, filename) {
    try {
        const thumbnailPath = path.join(__dirname, '..', 'thumbnails', filename);
        
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
                    
                    const downloadResult = await downloadImageAsBase64(image.url);
                    const base64String = downloadResult.buffer.toString('base64');
                    
                    // Determine MIME type from URL or default to PNG
                    let mimeType = 'image/png';
                    const urlLower = image.url.toLowerCase();
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
                    
                    console.log(`✅ Image ${i + 1} processed: ${downloadResult.size} → ${downloadResult.compressedSize} bytes`);
                    
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
    processImagesAsBase64
};