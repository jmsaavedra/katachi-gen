#!/usr/bin/env node
/**
 * Alchemy API Test Script
 *
 * Makes a raw HTTP request to Alchemy's NFT API to retrieve metadata.
 * Useful for debugging and seeing the exact JSON response from Alchemy.
 *
 * Usage:
 *   node scripts/alchemy-test.js [contractAddress] [tokenId]
 *
 * Example:
 *   node scripts/alchemy-test.js 0xaBf427fD33f2e688ec56d9bac4A6A615Ca0C1363 8
 */

require('dotenv').config();
const https = require('https');

// Get contract and token from command line args, or use defaults
const contractAddress = process.argv[2] || '0xaBf427fD33f2e688ec56d9bac4A6A615Ca0C1363';
const tokenId = process.argv[3] || '8';

const apiKey = process.env.ALCHEMY_API_KEY;

if (!apiKey) {
  console.error('Error: ALCHEMY_API_KEY not found in environment variables');
  process.exit(1);
}

const url = `https://shape-mainnet.g.alchemy.com/nft/v3/${apiKey}/getNFTMetadata?contractAddress=${contractAddress}&tokenId=${tokenId}`;

console.log('═══════════════════════════════════════════════════════════════════');
console.log('Alchemy NFT API Test');
console.log('═══════════════════════════════════════════════════════════════════');
console.log(`Contract: ${contractAddress}`);
console.log(`Token ID: ${tokenId}`);
console.log(`Network: Shape Mainnet`);
console.log(`URL: ${url.replace(apiKey, 'API_KEY')}`);
console.log('═══════════════════════════════════════════════════════════════════\n');

console.log('Making request...\n');

https.get(url, (res) => {
  let data = '';

  res.on('data', chunk => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('RAW ALCHEMY API RESPONSE:');
    console.log('═══════════════════════════════════════════════════════════════════');

    try {
      const json = JSON.parse(data);
      console.log(JSON.stringify(json, null, 2));

      console.log('\n═══════════════════════════════════════════════════════════════════');
      console.log('KEY FIELDS SUMMARY:');
      console.log('═══════════════════════════════════════════════════════════════════');
      console.log(`Name: ${json.name || 'null'}`);
      console.log(`Description: ${json.description || 'null'}`);
      console.log(`Token Type: ${json.tokenType || 'null'}`);
      console.log(`\nContract:`);
      console.log(`  Name: ${json.contract?.name || 'null'}`);
      console.log(`  Symbol: ${json.contract?.symbol || 'null'}`);
      console.log(`  Deployer: ${json.contract?.contractDeployer || 'null'}`);
      console.log(`  Total Supply: ${json.contract?.totalSupply || 'null'}`);
      console.log(`\nImage URLs:`);
      console.log(`  cachedUrl: ${json.image?.cachedUrl || 'null'}`);
      console.log(`  thumbnailUrl: ${json.image?.thumbnailUrl || 'null'}`);
      console.log(`  pngUrl: ${json.image?.pngUrl || 'null'}`);
      console.log(`  originalUrl: ${json.image?.originalUrl || 'null'}`);
      console.log(`  contentType: ${json.image?.contentType || 'null'}`);
      console.log(`  size: ${json.image?.size ? `${json.image.size} bytes (${Math.round(json.image.size / 1024 / 1024 * 10) / 10} MB)` : 'null'}`);
      console.log(`\nMint Info:`);
      console.log(`  mintAddress: ${json.mint?.mintAddress || 'null'}`);
      console.log(`  blockNumber: ${json.mint?.blockNumber || 'null'}`);
      console.log(`  timestamp: ${json.mint?.timestamp || 'null'}`);
      console.log(`\nAnimation:`);
      console.log(`  cachedUrl: ${json.animation?.cachedUrl || 'null'}`);
      console.log(`  originalUrl: ${json.animation?.originalUrl || 'null'}`);
      console.log(`  contentType: ${json.animation?.contentType || 'null'}`);
      console.log(`  size: ${json.animation?.size ? `${json.animation.size} bytes` : 'null'}`);
      console.log(`\nOpenSea Metadata:`);
      console.log(`  floorPrice: ${json.contract?.openSeaMetadata?.floorPrice ?? 'null'}`);
      console.log(`  collectionName: ${json.contract?.openSeaMetadata?.collectionName || 'null'}`);
      console.log(`  collectionSlug: ${json.contract?.openSeaMetadata?.collectionSlug || 'null'}`);
      console.log(`  safelistRequestStatus: ${json.contract?.openSeaMetadata?.safelistRequestStatus || 'null'}`);
      console.log(`  imageUrl: ${json.contract?.openSeaMetadata?.imageUrl || 'null'}`);
      console.log(`  bannerImageUrl: ${json.contract?.openSeaMetadata?.bannerImageUrl || 'null'}`);
      console.log(`  description: ${json.contract?.openSeaMetadata?.description || 'null'}`);
      console.log(`  externalUrl: ${json.contract?.openSeaMetadata?.externalUrl || 'null'}`);
      console.log(`  twitterUsername: ${json.contract?.openSeaMetadata?.twitterUsername || 'null'}`);
      console.log(`  discordUrl: ${json.contract?.openSeaMetadata?.discordUrl || 'null'}`);
      console.log(`  lastIngestedAt: ${json.contract?.openSeaMetadata?.lastIngestedAt || 'null'}`);
      console.log(`\nRaw Metadata:`);
      console.log(`  tokenUri: ${json.raw?.tokenUri || 'null'}`);
      console.log(`  error: ${json.raw?.error || 'null'}`);
      console.log(`  metadata.name: ${json.raw?.metadata?.name || 'null'}`);
      console.log(`  metadata.description: ${json.raw?.metadata?.description || 'null'}`);
      console.log(`  metadata.image_url: ${json.raw?.metadata?.image_url || 'null'}`);
      if (json.raw?.metadata?.attributes) {
        console.log(`  metadata.attributes: ${json.raw.metadata.attributes.length} traits`);
        json.raw.metadata.attributes.forEach((attr, i) => {
          console.log(`    ${i + 1}. ${attr.trait_type}: ${attr.value ?? 'null'}`);
        });
      }
      console.log(`\nCollection Info:`);
      console.log(`  collection: ${json.collection ? JSON.stringify(json.collection) : 'null'}`);
      console.log(`\nOther Fields:`);
      console.log(`  tokenUri: ${json.tokenUri || 'null'}`);
      console.log(`  timeLastUpdated: ${json.timeLastUpdated || 'null'}`);
      console.log(`  owners: ${json.owners || 'null'}`);
      console.log(`  isSpam: ${json.contract?.isSpam ?? 'null'}`);
      console.log(`  spamClassifications: ${json.contract?.spamClassifications?.length || 0} classifications`)

    } catch (error) {
      console.log('Error parsing JSON response:');
      console.log(data);
    }

    console.log('═══════════════════════════════════════════════════════════════════');
  });

}).on('error', err => {
  console.error('❌ HTTP Error:', err.message);
  process.exit(1);
});
