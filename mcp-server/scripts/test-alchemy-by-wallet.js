#!/usr/bin/env node
/**
 * Test script to fetch all NFTs owned by a wallet address
 * Displays high-level overview of collection, token name, image URLs, and content type
 */

require('dotenv').config();
const { Alchemy, Network } = require('alchemy-sdk');

const walletAddress = process.argv[2] || '0x53bebd20781aaa3a831f45b3c6889010a706ff9f';

const config = {
  apiKey: process.env.ALCHEMY_API_KEY,
  network: Network.SHAPE_MAINNET,
};

const alchemy = new Alchemy(config);

async function getNftsByWallet() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('NFTs Owned by Wallet');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`Wallet: ${walletAddress}`);
  console.log(`Network: Shape Mainnet`);
  console.log('═══════════════════════════════════════════════════════════════════\n');

  try {
    const response = await alchemy.nft.getNftsForOwner(walletAddress, {
      pageSize: 100,
      omitMetadata: false,
    });

    console.log(`Total NFTs: ${response.ownedNfts.length}\n`);

    response.ownedNfts.forEach((nft, index) => {
      console.log(`\n${index + 1}. NFT`);
      console.log('─────────────────────────────────────────────────────────────────');
      console.log(`Collection: ${nft.contract?.name || 'Unknown'}`);
      console.log(`Token Name: ${nft.name || 'Unnamed'}`);
      console.log(`Token ID: ${nft.tokenId}`);
      console.log(`Contract: ${nft.contract?.address}`);

      console.log(`\nImage Object URLs:`);
      if (nft.image) {
        if (nft.image.cachedUrl) console.log(`  • cachedUrl: ${nft.image.cachedUrl}`);
        if (nft.image.thumbnailUrl) console.log(`  • thumbnailUrl: ${nft.image.thumbnailUrl}`);
        if (nft.image.pngUrl) console.log(`  • pngUrl: ${nft.image.pngUrl}`);
        if (nft.image.originalUrl) console.log(`  • originalUrl: ${nft.image.originalUrl}`);
        console.log(`  • contentType: ${nft.image.contentType || 'null'}`);
      } else {
        console.log('  (no image object)');
      }
    });

    console.log('\n═══════════════════════════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

getNftsByWallet();
