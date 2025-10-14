// Rarible API client for fetching optimized NFT images
const https = require('https');

const RARIBLE_API_BASE = 'https://api.rarible.org/v0.1';
const RARIBLE_API_KEY = process.env.RARIBLE_API_KEY;

/**
 * Fetch NFT metadata from Rarible API with optimized image URLs
 * @param {string} contractAddress - NFT contract address
 * @param {string} tokenId - NFT token ID
 * @param {string} blockchain - Blockchain identifier (default: SHAPE)
 * @returns {Promise<Object>} NFT metadata with optimized image URLs
 */
async function getNFTWithRaribleImages(contractAddress, tokenId, blockchain = 'SHAPE') {
    if (!RARIBLE_API_KEY) {
        throw new Error('RARIBLE_API_KEY environment variable is required');
    }

    // Construct Rarible item ID: BLOCKCHAIN:CONTRACT:TOKEN_ID
    const itemId = `${blockchain}:${contractAddress}:${tokenId}`;
    const url = `${RARIBLE_API_BASE}/items/${itemId}`;

    console.log(`🔍 Fetching NFT from Rarible: ${itemId}`);

    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'X-API-KEY': RARIBLE_API_KEY,
                'Accept': 'application/json'
            }
        };

        https.get(url, options, (response) => {
            let data = '';

            if (response.statusCode !== 200) {
                reject(new Error(`Rarible API error: HTTP ${response.statusCode}`));
                return;
            }

            response.on('data', (chunk) => {
                data += chunk;
            });

            response.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    const processedData = extractImageUrls(result);
                    console.log(`✅ Found ${Object.keys(processedData.images).length} optimized image URLs from Rarible`);
                    resolve(processedData);
                } catch (error) {
                    reject(new Error(`Failed to parse Rarible response: ${error.message}`));
                }
            });

            response.on('error', reject);
        }).on('error', reject);
    });
}

/**
 * Extract image URLs from Rarible item response
 * @param {Object} item - Rarible item response
 * @returns {Object} Processed data with image URLs
 */
function extractImageUrls(item) {
    const images = {
        preview: null,      // Small preview image
        big: null,          // Larger version
        initial: null,      // Initial/default size
        original: null,     // Original image
        portrait: null      // Portrait orientation
    };

    // Extract images from content array
    const content = item.meta?.content || [];

    for (const contentItem of content) {
        if (contentItem.url && contentItem.representation) {
            const rep = contentItem.representation.toLowerCase();
            if (rep in images) {
                images[rep] = contentItem.url;
            }
        }
    }

    return {
        itemId: item.id,
        contractAddress: item.contract?.replace(/^SHAPE:/, '') || null,
        tokenId: item.tokenId,
        name: item.meta?.name || null,
        description: item.meta?.description || null,
        images: images,
        // Store original metadata image URL as fallback
        originalImageUrl: item.meta?.image?.url?.ORIGINAL || null,
        attributes: item.meta?.attributes || [],
        blockchain: item.blockchain || 'SHAPE'
    };
}

/**
 * Get best available image URL (prioritizing smaller, optimized versions)
 * @param {Object} images - Images object from extractImageUrls
 * @returns {string|null} Best available image URL
 */
function getBestImageUrl(images) {
    // Priority: preview > big > initial > original
    // Use preview for HTML compilation to avoid large file sizes
    return images.preview || images.big || images.initial || images.original || null;
}

module.exports = {
    getNFTWithRaribleImages,
    extractImageUrls,
    getBestImageUrl
};
