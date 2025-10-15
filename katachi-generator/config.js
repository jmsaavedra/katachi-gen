// Configuration and constants for Katachi Generator
const Arweave = require('arweave');
const fs = require('fs');
const path = require('path');

// Server configuration
const port = process.env.PORT || 3001;
const templateHTML = 'template.html';
const TESTING_MODE = process.env.NODE_ENV === 'development';
const ENABLE_MINTING = process.env.ENABLE_MINTING === 'true';

// Thumbnail configuration
const THUMB_WIDTH = 1024;
const THUMB_HEIGHT = 1024;

// Arweave configuration
const arweaveWalletPath = process.env.NODE_ENV === 'production' 
    ? null  // Use environment variable in production
    : 'arweave-wallet.json';  // Use file in development

const walletAddress = 'WJBf3OFtVmHVaIwMzIGq4nBseTRobFUiJmc2OW52-Dk';

const arweave = Arweave.init({
    host: 'arweave.net',
    port: 443,
    protocol: 'https'
});

// R2 configuration moved to storage/r2.js (uses AWS SDK v3)

// Origami patterns data - must match template.html pattern types exactly
const origamiPatterns = [
    {
        name: 'Traditional Crane',
        patternType: 'Crane',  // matches template.html
        complexity: 'intermediate',
        description: 'The classic origami crane, symbol of peace and longevity'
    },
    {
        name: 'Paper Airplane',
        patternType: 'Airplane',  // matches template.html
        complexity: 'beginner',
        description: 'Simple paper airplane pattern'
    },
    {
        name: 'Geometric Pinwheel',
        patternType: 'Pinwheel',  // matches template.html
        complexity: 'intermediate',
        description: 'A spinning pinwheel with geometric facets'
    },
    {
        name: 'Hyperbolic Paraboloid',
        patternType: 'Hypar',  // matches template.html
        complexity: 'expert',
        description: 'Complex hyperbolic paraboloid shape'
    },
    {
        name: 'Blooming Flower',
        patternType: 'Flower',  // matches template.html
        complexity: 'intermediate',
        description: 'Beautiful flower with layered petals'
    }
];

// Load texture scale configuration
let textureScaleConfig = { contracts: [], defaultScale: 1.0 };
try {
    const configPath = path.join(__dirname, 'texture-scale-config.json');
    const configData = fs.readFileSync(configPath, 'utf-8');
    textureScaleConfig = JSON.parse(configData);
    console.log(`✅ Loaded texture scale config: ${textureScaleConfig.contracts.length} contracts configured`);
} catch (error) {
    console.warn('⚠️ Could not load texture-scale-config.json, using default scale (1.0):', error.message);
}

/**
 * Get the texture scale for a given contract address
 * @param {string} contractAddress - The NFT contract address
 * @returns {number} Scale value between 1.0 and 10.0
 */
function getTextureScale(contractAddress) {
    if (!contractAddress) return textureScaleConfig.defaultScale;

    const normalizedAddress = contractAddress.toLowerCase();
    const contractConfig = textureScaleConfig.contracts.find(
        c => c.address.toLowerCase() === normalizedAddress
    );

    if (contractConfig) {
        const scale = contractConfig.scale;
        // Clamp between 1.0 and 10.0
        return Math.max(1.0, Math.min(10.0, scale));
    }

    return textureScaleConfig.defaultScale;
}

module.exports = {
    port,
    templateHTML,
    TESTING_MODE,
    ENABLE_MINTING,
    THUMB_WIDTH,
    THUMB_HEIGHT,
    arweaveWalletPath,
    walletAddress,
    arweave,
    origamiPatterns,
    getTextureScale,
    textureScaleConfig
};