#!/usr/bin/env node

/**
 * One-off script to extract assets from old HTML and regenerate with optimized template
 * Usage: node scripts/recreate-old-html.js <path-to-old-html>
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const OLD_HTML_PATH = process.argv[2] || path.join(__dirname, '../../kg_flower-0xee49f82e58a1c2b306720d0c68047cbf70c11fb5-1756775591427.html');

console.log('🔍 Reading old HTML file...');
const oldHtml = fs.readFileSync(OLD_HTML_PATH, 'utf-8');

// Extract wallet address from filename
const walletMatch = OLD_HTML_PATH.match(/-(0x[a-fA-F0-9]{40})-/);
const walletAddress = walletMatch ? walletMatch[1] : '0xee49f82e58a1c2b306720d0c68047cbf70c11fb5';

console.log('📍 Wallet address:', walletAddress);

// Extract base64 images
console.log('🖼️  Extracting NFT images...');
const imageRegex = /NFT_Image_(\d+)\s*=\s*'(data:image\/[^']+)'/g;
const images = [];
let match;

while ((match = imageRegex.exec(oldHtml)) !== null) {
  const imageNum = match[1];
  const base64Data = match[2];
  images.push({
    index: parseInt(imageNum),
    base64: base64Data,
    name: `NFT Image ${imageNum}`
  });
}

console.log(`✅ Found ${images.length} NFT images`);

// Extract pattern type
const patternMatch = oldHtml.match(/patternType\s*:\s*['"]([^'"]+)['"]/);
const patternType = patternMatch ? patternMatch[1] : 'flower';
console.log('🌸 Pattern type:', patternType);

// Extract seed
const seedMatch = oldHtml.match(/seed2\s*:\s*['"]([^'"]+)['"]/);
const seed2 = seedMatch ? seedMatch[1] : `${Date.now()}_recreated`;
console.log('🎲 Seed:', seed2);

// Prepare data for generation
const generationData = {
  walletAddress,
  pattern: patternType,
  seed2,
  images: images.map((img, idx) => ({
    url: img.base64,
    name: img.name,
    contractAddress: `0x${idx.toString().padStart(40, '0')}`, // Dummy addresses
    tokenId: idx.toString()
  }))
};

console.log('\n📦 Generation data prepared:');
console.log(`   - Wallet: ${walletAddress}`);
console.log(`   - Pattern: ${patternType}`);
console.log(`   - Images: ${images.length}`);
console.log(`   - Seed: ${seed2}`);

// Call the local generator API
async function regenerate() {
  try {
    console.log('\n🚀 Calling katachi-generator API...');

    const response = await axios.post('http://localhost:3000', generationData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 300000 // 5 minutes
    });

    console.log('\n✅ Generation complete!');
    console.log('📄 HTML URL:', response.data.htmlUrl || response.data.previewHtmlUrl);
    console.log('🖼️  Thumbnail URL:', response.data.thumbnailUrl);

    if (response.data.htmlId) {
      console.log('📦 Arweave HTML ID:', response.data.htmlId);
    }
    if (response.data.thumbnailId) {
      console.log('📦 Arweave Thumbnail ID:', response.data.thumbnailId);
    }

    // Save metadata to file
    const outputFile = path.join(__dirname, '../temp/recreated-flower-metadata.json');
    fs.writeFileSync(outputFile, JSON.stringify({
      ...response.data,
      originalFile: OLD_HTML_PATH,
      extractedData: {
        pattern: patternType,
        imageCount: images.length,
        walletAddress,
        seed: seed2
      }
    }, null, 2));

    console.log('\n📝 Metadata saved to:', outputFile);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

// Check if we should auto-run or just show data
if (process.argv.includes('--dry-run')) {
  console.log('\n🏃 Dry run mode - showing extracted data only');
  console.log(JSON.stringify(generationData, null, 2));
} else {
  console.log('\n💡 Starting regeneration...');
  console.log('   (Use --dry-run to see extracted data without regenerating)');
  regenerate();
}
