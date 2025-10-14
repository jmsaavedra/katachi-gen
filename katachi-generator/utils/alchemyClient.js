// Alchemy API client for fetching NFT metadata with optimized thumbnails
const https = require('https');

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
const ALCHEMY_NETWORK = 'shape-mainnet'; // SHAPE mainnet

/**
 * Fetch NFT metadata from Alchemy API with optimized image thumbnails
 * @param {string} contractAddress - NFT contract address
 * @param {string} tokenId - NFT token ID
 * @returns {Promise<Object>} NFT metadata with optimized image URLs
 */
async function getNFTMetadataFromAlchemy(contractAddress, tokenId) {
    if (!ALCHEMY_API_KEY) {
        throw new Error('ALCHEMY_API_KEY environment variable is required');
    }

    // Construct Alchemy API URL
    const baseUrl = `https://${ALCHEMY_NETWORK}.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTMetadata`;
    const params = new URLSearchParams({
        contractAddress: contractAddress,
        tokenId: tokenId,
        refreshCache: 'false' // Use cached data for speed
    });
    const url = `${baseUrl}?${params.toString()}`;

    console.log(`🔍 Fetching NFT from Alchemy: ${contractAddress}:${tokenId}`);

    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            let data = '';

            if (response.statusCode !== 200) {
                reject(new Error(`Alchemy API error: HTTP ${response.statusCode}`));
                return;
            }

            response.on('data', (chunk) => {
                data += chunk;
            });

            response.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    const processedData = extractImageUrls(result);
                    resolve(processedData);
                } catch (error) {
                    reject(new Error(`Failed to parse Alchemy response: ${error.message}`));
                }
            });

            response.on('error', reject);
        }).on('error', reject);
    });
}

/**
 * Extract optimized image URLs from Alchemy NFT metadata
 * @param {Object} nftData - Alchemy NFT metadata response
 * @returns {Object} Processed data with image URLs
 */
function extractImageUrls(nftData) {
    const images = {
        thumbnail: null,      // 256x256 thumbnail (smallest)
        cached: null,         // Alchemy CDN cached version
        medium: null,         // Custom 512x512 (we'll generate)
        large: null,          // Custom 1024x1024 (we'll generate)
        original: null        // Original image URL
    };

    // Extract from V3 API response (image object)
    if (nftData.image) {
        images.thumbnail = nftData.image.thumbnailUrl || null;
        images.cached = nftData.image.cachedUrl || null;
        images.original = nftData.image.originalUrl || null;

        // Generate custom sizes from thumbnail URL if available
        if (images.thumbnail && images.thumbnail.includes('cloudinary.com')) {
            // Replace 'thumbnail' with 'w_512,h_512' for medium
            images.medium = images.thumbnail.replace('/thumbnail/', '/w_512,h_512,c_limit/');
            // Replace 'thumbnail' with 'w_1024,h_1024' for large
            images.large = images.thumbnail.replace('/thumbnail/', '/w_1024,h_1024,c_limit/');
        }
    }

    // Fallback to V2 API response (media array)
    if (!images.thumbnail && nftData.media && nftData.media.length > 0) {
        const primaryMedia = nftData.media[0];
        images.thumbnail = primaryMedia.thumbnail || null;
        images.cached = primaryMedia.gateway || null;
        images.original = primaryMedia.raw || null;

        // Generate custom sizes from thumbnail URL if available
        if (images.thumbnail && images.thumbnail.includes('cloudinary.com')) {
            images.medium = images.thumbnail.replace('/thumbnail/', '/w_512,h_512,c_limit/');
            images.large = images.thumbnail.replace('/thumbnail/', '/w_1024,h_1024,c_limit/');
        }
    }

    // Fallback to metadata.image if nothing else available
    if (!images.original && nftData.metadata?.image) {
        images.original = nftData.metadata.image;
    }

    return {
        contractAddress: nftData.contract?.address || null,
        tokenId: nftData.id?.tokenId || null,
        name: nftData.title || nftData.metadata?.name || null,
        description: nftData.description || nftData.metadata?.description || null,
        images: images,
        tokenType: nftData.id?.tokenMetadata?.tokenType || null,
        timeLastUpdated: nftData.timeLastUpdated || null
    };
}

/**
 * Get best available image URL (prioritizing optimized thumbnails)
 * @param {Object} images - Images object from extractImageUrls
 * @returns {string|null} Best available image URL
 */
function getBestImageUrl(images) {
    // Priority: thumbnail (256x256) > medium (512x512) > cached > original
    // Thumbnail is usually 50-200KB, perfect size
    if (images.thumbnail) {
        console.log(`📏 Selected Alchemy image size: thumbnail (256x256)`);
        return images.thumbnail;
    }

    if (images.medium) {
        console.log(`📏 Selected Alchemy image size: medium (512x512)`);
        return images.medium;
    }

    if (images.cached) {
        console.log(`📏 Selected Alchemy image size: cached`);
        return images.cached;
    }

    if (images.original) {
        console.log(`📏 Selected Alchemy image size: original`);
        return images.original;
    }

    return null;
}

module.exports = {
    getNFTMetadataFromAlchemy,
    extractImageUrls,
    getBestImageUrl
};
