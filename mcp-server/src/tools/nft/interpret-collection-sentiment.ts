import { z } from 'zod';
import { type InferSchema } from 'xmcp';
import { Address, isAddress } from 'viem';
import { alchemy } from '../../clients';
import { config } from '../../config';
import type { ToolErrorOutput } from '../../types';
import { getCached, setCached } from '../../utils/cache';
import { OwnedNft } from 'alchemy-sdk';

// Define the output type for interpreted NFTs
export interface InterpretedNFTsOutput {
  ownerAddress: Address;
  sentiment: string;
  interpretation: string;
  requestedCount: number;
  selectedNfts: Array<{
    tokenId: string;
    contractAddress: Address;
    name: string | null;
    description: string | null;
    imageUrl: string | null;
    reason: string;
    matchScore: number;
    matchDetails: {
      textMatches: string[];
      themeMatches: string[];
      visualMatches: string[];
      collectionInfo: string;
    };
  }>;
  themes: string[];
  timestamp: string;
}

export const schema = {
  address: z
    .string()
    .refine((address) => isAddress(address), {
      message: 'Invalid address',
    })
    .describe('The wallet address to analyze NFTs for'),
  sentiment: z
    .string()
    .min(5)
    .max(500)
    .describe('The collector\'s response about how collecting on Shape makes them feel'),
  count: z
    .number()
    .min(5)
    .max(15)
    .default(10)
    .describe('Number of NFTs to return that match the sentiment (5, 10, or 15)'),
};

export const metadata = {
  name: 'interpretCollectionSentiment',
  description: 'Interpret a collector\'s emotional response and return NFTs from their collection that match the sentiment',
  annotations: {
    title: 'Interpret Collection Sentiment',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: false,
    requiresWallet: false,
    category: 'nft-analysis',
    educationalHint: true,
    chainableWith: ['getShapeNft'],
    cacheTTL: 60 * 5, // 5 minutes
  },
};

// Keywords and themes for sentiment analysis
const EMOTIONAL_THEMES = {
  joy: ['happy', 'excited', 'joyful', 'delighted', 'thrilled', 'elated', 'cheerful', 'bright', 'fun', 'playful'],
  pride: ['proud', 'accomplished', 'achievement', 'success', 'confident', 'strong', 'powerful', 'winner'],
  community: ['together', 'community', 'friends', 'family', 'connected', 'belong', 'unity', 'collective', 'group'],
  creativity: ['creative', 'artistic', 'inspired', 'innovative', 'unique', 'original', 'imaginative', 'expressive'],
  peace: ['calm', 'peaceful', 'serene', 'tranquil', 'relaxed', 'zen', 'meditative', 'quiet', 'still'],
  nostalgia: ['memory', 'remember', 'nostalgic', 'past', 'childhood', 'vintage', 'classic', 'timeless', 'old'],
  adventure: ['adventure', 'explore', 'discover', 'journey', 'quest', 'travel', 'new', 'exciting', 'bold'],
  wealth: ['rich', 'wealthy', 'valuable', 'precious', 'treasure', 'gold', 'diamond', 'luxury', 'premium'],
  nature: ['nature', 'earth', 'forest', 'ocean', 'mountain', 'sky', 'flower', 'animal', 'natural', 'organic'],
  technology: ['tech', 'digital', 'cyber', 'future', 'ai', 'robot', 'code', 'pixel', 'virtual', 'meta'],
};

// Visual characteristics that might match emotions
const VISUAL_CHARACTERISTICS = {
  bright: ['yellow', 'orange', 'pink', 'neon', 'light', 'bright', 'vivid', 'glow'],
  dark: ['black', 'dark', 'shadow', 'night', 'gothic', 'noir', 'mysterious'],
  colorful: ['rainbow', 'multicolor', 'vibrant', 'spectrum', 'diverse', 'mixed'],
  monochrome: ['black and white', 'grayscale', 'minimal', 'simple', 'clean'],
  abstract: ['abstract', 'geometric', 'pattern', 'fractal', 'generative', 'algorithmic'],
  realistic: ['photo', 'realistic', 'portrait', 'landscape', 'detailed'],
};

// Color keywords mapping
const COLOR_KEYWORDS = {
  red: ['red', 'crimson', 'scarlet', 'ruby', 'rose', 'cherry'],
  blue: ['blue', 'azure', 'navy', 'cyan', 'sapphire', 'ocean', 'sky'],
  green: ['green', 'emerald', 'jade', 'forest', 'lime', 'mint', 'leaf'],
  yellow: ['yellow', 'gold', 'amber', 'lemon', 'sun', 'banana'],
  purple: ['purple', 'violet', 'lavender', 'plum', 'amethyst'],
  orange: ['orange', 'peach', 'tangerine', 'coral', 'sunset'],
  pink: ['pink', 'rose', 'magenta', 'fuchsia', 'blush'],
  white: ['white', 'ivory', 'pearl', 'snow', 'cream'],
  black: ['black', 'ebony', 'obsidian', 'coal', 'noir'],
  gray: ['gray', 'grey', 'silver', 'charcoal', 'slate'],
  brown: ['brown', 'bronze', 'copper', 'chocolate', 'coffee'],
};

// Enhanced visual analysis with color detection
async function analyzeVisualContent(imageUrl: string | null, sentiment: string): Promise<{ score: number; reasons: string[] }> {
  if (!imageUrl) return { score: 0, reasons: [] };
  
  const reasons: string[] = [];
  let score = 0;
  
  try {
    // Extract color mentions from sentiment
    const lowerSentiment = sentiment.toLowerCase();
    const detectedColors: string[] = [];
    
    for (const [color, keywords] of Object.entries(COLOR_KEYWORDS)) {
      if (keywords.some(keyword => lowerSentiment.includes(keyword))) {
        detectedColors.push(color);
      }
    }
    
    // If colors mentioned in sentiment, try to match with NFT name/description
    // (In a full implementation, this would analyze the actual image pixels)
    if (detectedColors.length > 0) {
      // This is a simplified approach - checking if color words appear in the image URL or filename
      const urlLower = imageUrl.toLowerCase();
      
      for (const color of detectedColors) {
        const colorKeywords = COLOR_KEYWORDS[color as keyof typeof COLOR_KEYWORDS];
        if (colorKeywords.some(keyword => urlLower.includes(keyword))) {
          score += 2;
          reasons.push(`image URL suggests ${color} content`);
        }
      }
      
      // Basic heuristics based on common NFT naming patterns
      if (detectedColors.includes('green') && (urlLower.includes('green') || urlLower.includes('nature') || urlLower.includes('forest'))) {
        score += 1;
        reasons.push('green nature theme detected');
      }
      if (detectedColors.includes('blue') && (urlLower.includes('blue') || urlLower.includes('ocean') || urlLower.includes('sky'))) {
        score += 1;
        reasons.push('blue theme detected');
      }
      if (detectedColors.includes('red') && (urlLower.includes('red') || urlLower.includes('fire') || urlLower.includes('blood'))) {
        score += 1;
        reasons.push('red theme detected');
      }
    }
    
    return { score, reasons };
  } catch (error) {
    console.warn('Error analyzing visual content:', error);
    return { score: 0, reasons: [] };
  }
}

function extractThemes(sentiment: string): string[] {
  const lowerSentiment = sentiment.toLowerCase();
  const themes: string[] = [];
  
  for (const [theme, keywords] of Object.entries(EMOTIONAL_THEMES)) {
    if (keywords.some(keyword => lowerSentiment.includes(keyword))) {
      themes.push(theme);
    }
  }
  
  // If no themes found, try to infer from general tone
  if (themes.length === 0) {
    if (lowerSentiment.includes('love') || lowerSentiment.includes('like')) {
      themes.push('joy');
    }
    if (lowerSentiment.includes('collect') || lowerSentiment.includes('own')) {
      themes.push('pride');
    }
  }
  
  return themes;
}

async function scoreNFT(nft: OwnedNft, sentiment: string, themes: string[]): Promise<{ 
  score: number; 
  reason: string;
  matchDetails: {
    textMatches: string[];
    themeMatches: string[];
    visualMatches: string[];
    collectionInfo: string;
  };
}> {
  const lowerSentiment = sentiment.toLowerCase();
  const nftName = (nft.name || '').toLowerCase();
  const nftDescription = (nft.description || '').toLowerCase();
  const collectionName = (nft.contract.name || '').toLowerCase();
  
  let score = 0;
  const reasons: string[] = [];
  const textMatches: string[] = [];
  const themeMatches: string[] = [];
  const visualMatches: string[] = [];
  
  // Direct word matches in sentiment
  const sentimentWords = lowerSentiment.split(/\s+/);
  for (const word of sentimentWords) {
    if (word.length > 3) { // Skip short words
      if (nftName.includes(word)) {
        score += 3;
        reasons.push(`name contains "${word}"`);
        textMatches.push(`NFT name: "${word}"`);
      }
      if (nftDescription.includes(word)) {
        score += 2;
        reasons.push(`description matches sentiment`);
        textMatches.push(`Description: "${word}"`);
      }
      if (collectionName.includes(word)) {
        score += 1;
        reasons.push(`collection relates to "${word}"`);
        textMatches.push(`Collection: "${word}"`);
      }
    }
  }
  
  // Theme matching
  for (const theme of themes) {
    const themeKeywords = EMOTIONAL_THEMES[theme as keyof typeof EMOTIONAL_THEMES] || [];
    let themeMatched = false;
    for (const keyword of themeKeywords) {
      if (nftName.includes(keyword)) {
        score += 2;
        reasons.push(`matches ${theme} theme`);
        themeMatches.push(`${theme}: "${keyword}" in name`);
        themeMatched = true;
        break;
      }
      if (nftDescription.includes(keyword)) {
        score += 1;
        themeMatches.push(`${theme}: "${keyword}" in description`);
        themeMatched = true;
        break;
      }
    }
    if (themeMatched) {
      reasons.push(`${theme} theme detected`);
    }
  }
  
  // Visual characteristic matching based on sentiment tone
  const sentimentIsPositive = lowerSentiment.includes('happy') || lowerSentiment.includes('excited') || 
                             lowerSentiment.includes('proud') || lowerSentiment.includes('joy');
  const sentimentIsCalm = lowerSentiment.includes('peace') || lowerSentiment.includes('calm') || 
                         lowerSentiment.includes('serene');
  
  if (sentimentIsPositive && VISUAL_CHARACTERISTICS.bright.some(char => nftName.includes(char))) {
    score += 1;
    reasons.push('bright visual matches positive mood');
    visualMatches.push('Bright colors match positive sentiment');
  }
  
  if (sentimentIsCalm && (nftName.includes('minimal') || nftName.includes('simple'))) {
    score += 1;
    reasons.push('minimal style matches calm mood');
    visualMatches.push('Minimal style matches calm mood');
  }
  
  // Collection-based scoring - if multiple from same collection, slight bonus
  if (nft.balance && parseInt(nft.balance) > 1) {
    score += 0.5;
    reasons.push('multiple from collection');
  }
  
  // Visual content analysis
  const imageUrl = nft.image?.originalUrl || nft.image?.thumbnailUrl;
  const visualAnalysis = await analyzeVisualContent(imageUrl, sentiment);
  score += visualAnalysis.score;
  reasons.push(...visualAnalysis.reasons);
  visualMatches.push(...visualAnalysis.reasons);
  
  // Random factor for diversity when scores are similar
  score += Math.random() * 0.5;
  
  const reason = reasons.length > 0 ? reasons.join(', ') : 'aesthetic match';
  
  return { 
    score, 
    reason,
    matchDetails: {
      textMatches,
      themeMatches,
      visualMatches,
      collectionInfo: collectionName || 'Unknown Collection'
    }
  };
}

export default async function interpretCollectionSentiment({ 
  address, 
  sentiment, 
  count 
}: InferSchema<typeof schema>) {
  const cacheKey = `mcp:interpretSentiment:${config.chainId}:${address.toLowerCase()}:${Buffer.from(sentiment).toString('base64').slice(0, 20)}:${count}`;
  const cached = await getCached(cacheKey);

  if (cached) {
    return JSON.parse(cached);
  }

  try {
    // Fetch all NFTs for the wallet (we'll need to paginate if needed)
    let allNfts: OwnedNft[] = [];
    let pageKey: string | undefined = undefined;
    
    do {
      const nftsResponse = await alchemy.nft.getNftsForOwner(address, {
        pageSize: 100,
        pageKey: pageKey,
        omitMetadata: false,
      });
      
      allNfts = allNfts.concat(nftsResponse.ownedNfts);
      pageKey = nftsResponse.pageKey;
      
      // Limit to 500 NFTs for performance
      if (allNfts.length >= 500) break;
    } while (pageKey);
    
    if (allNfts.length === 0) {
      throw new Error('No NFTs found for this address');
    }
    
    // Extract themes from sentiment
    const themes = extractThemes(sentiment);
    
    // Score each NFT based on sentiment matching (now async)
    const scoredNfts = await Promise.all(
      allNfts.map(async (nft) => ({
        nft,
        ...(await scoreNFT(nft, sentiment, themes))
      }))
    );
    
    // Sort by score and take top N, ensuring max 1 NFT per collection
    scoredNfts.sort((a, b) => b.score - a.score);
    
    const selectedNfts: typeof scoredNfts = [];
    const usedCollections = new Set<string>();
    
    for (const nftItem of scoredNfts) {
      const collectionAddress = nftItem.nft.contract.address.toLowerCase();
      
      if (!usedCollections.has(collectionAddress) && selectedNfts.length < count) {
        selectedNfts.push(nftItem);
        usedCollections.add(collectionAddress);
      }
      
      if (selectedNfts.length >= count) break;
    }
    
    // Generate interpretation
    const interpretation = generateInterpretation(sentiment, themes, selectedNfts.length);
    
    const result: InterpretedNFTsOutput = {
      ownerAddress: address,
      sentiment,
      interpretation,
      requestedCount: count,
      selectedNfts: selectedNfts.map(item => ({
        tokenId: item.nft.tokenId,
        contractAddress: item.nft.contract.address as Address,
        name: item.nft.name || `Token #${item.nft.tokenId}`,
        description: item.nft.description || null,
        imageUrl: item.nft.image?.originalUrl || item.nft.image?.thumbnailUrl || null,
        reason: item.reason,
        matchScore: Math.round(item.score * 100) / 100,
        matchDetails: item.matchDetails
      })),
      themes,
      timestamp: new Date().toISOString(),
    };

    const response = {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };

    await setCached(cacheKey, JSON.stringify(response), metadata.annotations.cacheTTL);

    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    const errorOutput: ToolErrorOutput = {
      error: true,
      message: `Error interpreting collection sentiment: ${errorMessage}`,
      ownerAddress: address,
      timestamp: new Date().toISOString(),
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(errorOutput, null, 2),
        },
      ],
    };
  }
}

function generateInterpretation(sentiment: string, themes: string[], nftCount: number): string {
  const themeText = themes.length > 0 
    ? `I detected themes of ${themes.join(', ')} in your reflection. ` 
    : '';
    
  const interpretations = [
    `Your collection reflects ${sentiment}. ${themeText}These ${nftCount} pieces resonate with your expressed feelings.`,
    `Based on your words "${sentiment.slice(0, 50)}...", ${themeText}I've selected ${nftCount} NFTs that echo your sentiment.`,
    `Your feeling about collecting - "${sentiment.slice(0, 30)}..." - guides this curation. ${themeText}`,
  ];
  
  return interpretations[Math.floor(Math.random() * interpretations.length)];
}