import { z } from 'zod';
import { type InferSchema } from 'xmcp';
import { Address, isAddress } from 'viem';
import { alchemy, anthropic } from '../../clients';
import { config } from '../../config';
import type { ToolErrorOutput } from '../../types';
import { getCached, setCached } from '../../utils/cache';
import { OwnedNft } from 'alchemy-sdk';
import { isContractBlocked as isContractBlockedShared, isCollectionNameBlocked as isCollectionNameBlockedShared, isNftNameBlocked as isNftNameBlockedShared, shouldPreferOriginalImage as shouldPreferOriginalImageShared } from '../../utils/collection-config';

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
    collectionName: string | null;
    contractDeployer: string | null; // Address that deployed the NFT contract (creator/artist)
    alchemyImages: {
      cachedUrl?: string;
      thumbnailUrl?: string;
      pngUrl?: string;
      originalUrl?: string;
      contentType?: string;
      size?: number;
    };
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
    .max(10)
    .default(10)
    .describe('Number of NFTs to return that match the sentiment (5-10)'),
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

// Use shared collection config functions
const isContractBlocked = isContractBlockedShared;
const isCollectionNameBlocked = isCollectionNameBlockedShared;
const isNftNameBlocked = isNftNameBlockedShared;
const shouldPreferOriginalImage = shouldPreferOriginalImageShared;

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

async function extractThemes(sentiment: string): Promise<string[]> {
  try {
    const availableThemes = Object.keys(EMOTIONAL_THEMES).join(', ');

    const prompt = `Analyze the following user sentiment about NFT collecting and select between 2-5 emotional themes that best match their feelings.

User's sentiment: "${sentiment}"

Available themes: ${availableThemes}

Instructions:
- Select a MINIMUM of 2 themes and a MAXIMUM of 5 themes
- Choose themes that genuinely resonate with the user's words
- Prioritize the most relevant themes
- Return ONLY a JSON array of theme names, nothing else

Example response format: ["joy", "community", "creativity"]`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    // Extract the text content from Claude's response
    const textContent = response.content.find(block => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    // Parse the JSON array from the response
    const themesText = textContent.text.trim();
    const themes = JSON.parse(themesText) as string[];

    // Validate that we got between 2-5 themes
    if (!Array.isArray(themes) || themes.length < 2 || themes.length > 5) {
      console.warn(`Claude returned ${themes.length} themes, expected 2-5. Using fallback.`);
      return fallbackExtractThemes(sentiment);
    }

    // Validate that all themes are valid
    const validThemes = themes.filter(theme => theme in EMOTIONAL_THEMES);
    if (validThemes.length < 2) {
      console.warn(`Only ${validThemes.length} valid themes returned. Using fallback.`);
      return fallbackExtractThemes(sentiment);
    }

    console.log(`✨ AI-selected themes: ${validThemes.join(', ')}`);
    return validThemes;

  } catch (error) {
    console.error('Error extracting themes with AI:', error);
    return fallbackExtractThemes(sentiment);
  }
}

// Fallback keyword-based theme extraction (ensures 2-5 themes)
function fallbackExtractThemes(sentiment: string): string[] {
  const lowerSentiment = sentiment.toLowerCase();
  const themes: string[] = [];

  // Find all matching themes
  for (const [theme, keywords] of Object.entries(EMOTIONAL_THEMES)) {
    if (keywords.some(keyword => lowerSentiment.includes(keyword))) {
      themes.push(theme);
    }
  }

  // If we have 2-5 themes, return them
  if (themes.length >= 2 && themes.length <= 5) {
    return themes;
  }

  // If we have more than 5, take the first 5
  if (themes.length > 5) {
    return themes.slice(0, 5);
  }

  // If we have 0-1 themes, add defaults to reach 2 minimum
  if (themes.length === 0) {
    if (lowerSentiment.includes('love') || lowerSentiment.includes('like')) {
      themes.push('joy');
    }
    if (lowerSentiment.includes('collect') || lowerSentiment.includes('own')) {
      themes.push('pride');
    }
  }

  // Still need more themes to reach minimum of 2
  const defaultThemes = ['joy', 'community', 'creativity', 'pride'];
  for (const defaultTheme of defaultThemes) {
    if (!themes.includes(defaultTheme)) {
      themes.push(defaultTheme);
      if (themes.length >= 2) break;
    }
  }

  // Ensure we return at least 2 themes, max 5
  return themes.slice(0, 5);
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
  
  // Direct word matches in sentiment - deduplicate words to avoid redundant reasons
  const sentimentWords = [...new Set(lowerSentiment.split(/\s+/))];
  const descriptionMatches: string[] = [];

  for (const word of sentimentWords) {
    if (word.length > 3) { // Skip short words
      if (nftName.includes(word)) {
        score += 3;
        reasons.push(`name contains "${word}"`);
        textMatches.push(`NFT name: "${word}"`);
      }
      if (nftDescription.includes(word)) {
        score += 2;
        descriptionMatches.push(word);
        textMatches.push(`Description: "${word}"`);
      }
      if (collectionName.includes(word)) {
        score += 1;
        reasons.push(`collection relates to "${word}"`);
        textMatches.push(`Collection: "${word}"`);
      }
    }
  }

  // Add consolidated description match reason
  if (descriptionMatches.length > 0) {
    if (descriptionMatches.length === 1) {
      reasons.push(`description contains "${descriptionMatches[0]}"`);
    } else if (descriptionMatches.length === 2) {
      reasons.push(`description contains "${descriptionMatches[0]}" and "${descriptionMatches[1]}"`);
    } else {
      reasons.push(`description matches ${descriptionMatches.length} words`);
    }
  }
  
  // Theme matching
  for (const theme of themes) {
    const themeKeywords = EMOTIONAL_THEMES[theme as keyof typeof EMOTIONAL_THEMES] || [];
    let themeMatched = false;
    for (const keyword of themeKeywords) {
      if (nftName.includes(keyword)) {
        score += 2;
        reasons.push(`${theme} theme: "${keyword}" in name`);
        themeMatches.push(`${theme}: "${keyword}" in name`);
        themeMatched = true;
        break;
      }
      if (nftDescription.includes(keyword)) {
        score += 1;
        reasons.push(`${theme} theme: "${keyword}" matches sentiment`);
        themeMatches.push(`${theme}: "${keyword}" in description`);
        themeMatched = true;
        break;
      }
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
  
  // Removed collection balance scoring as it was confusing and not relevant to sentiment matching
  
  // Visual content analysis - prioritize Alchemy's processed images
  const imageUrl = nft.image?.cachedUrl || nft.image?.pngUrl || nft.image?.thumbnailUrl || nft.image?.originalUrl || null;
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
      const nftsResponse: Awaited<ReturnType<typeof alchemy.nft.getNftsForOwner>> = await alchemy.nft.getNftsForOwner(address, {
        pageSize: 100,
        pageKey: pageKey,
        omitMetadata: false,
      });
      
      allNfts = allNfts.concat(nftsResponse.ownedNfts);
      pageKey = nftsResponse.pageKey;
      
      console.log(`📄 Fetched ${nftsResponse.ownedNfts.length} NFTs (total: ${allNfts.length})`);
      
      // Limit to 2000 NFTs for performance
      if (allNfts.length >= 2000) break;
    } while (pageKey);
    
    if (allNfts.length === 0) {
      throw new Error('No NFTs found for this address');
    }
    
    // Extract themes from sentiment using AI
    const themes = await extractThemes(sentiment);
    
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
    const collectionCounts = new Map<string, number>();
    
    // Select NFTs continuously until we reach the target count
    console.log(`🎯 Selecting ${count} image NFTs based on sentiment match scores...`);
    console.log(`📊 Available candidates: ${scoredNfts.length} total NFTs to evaluate`);
    
    for (const [index, nftItem] of scoredNfts.entries()) {
      const collectionAddress = nftItem.nft.contract.address.toLowerCase();
      const currentCount = collectionCounts.get(collectionAddress) || 0;
      const contentType = nftItem.nft.image?.contentType;
      const hasThumbnail = nftItem.nft.image?.thumbnailUrl;
      const hasPng = nftItem.nft.image?.pngUrl;

      console.log(`🔍 [${index + 1}/${scoredNfts.length}] Evaluating: ${nftItem.nft.name || 'Unnamed'} (score: ${nftItem.score.toFixed(2)})`);
      console.log(`    ContentType: ${contentType || 'unknown'}`);
      console.log(`    Alchemy Images: thumbnail=${!!hasThumbnail}, png=${!!hasPng}`);
      console.log(`    Contract: ${collectionAddress} (currentCount: ${currentCount})`);

      // Filter out blocked contracts
      if (isContractBlocked(collectionAddress)) {
        console.log(`🚫 Skipped (blocked contract): ${nftItem.nft.name || 'Unnamed'} from ${collectionAddress}`);
        continue;
      }

      // Filter out blocked collection names
      const collectionNameCheck = isCollectionNameBlocked(nftItem.nft.contract.name || null);
      console.log(`   🔍 Collection name check: "${nftItem.nft.contract.name}" -> blocked: ${collectionNameCheck.blocked}`);
      if (collectionNameCheck.blocked) {
        console.log(`🚫 Skipped (blocked collection name): ${nftItem.nft.name || 'Unnamed'} from "${nftItem.nft.contract.name}" - ${collectionNameCheck.reason}`);
        continue;
      }

      // Filter out blocked NFT names
      const nftNameCheck = isNftNameBlocked(nftItem.nft.name || null);
      console.log(`   🔍 NFT name check: "${nftItem.nft.name}" -> blocked: ${nftNameCheck.blocked}`);
      if (nftNameCheck.blocked) {
        console.log(`🚫 Skipped (blocked NFT name): "${nftItem.nft.name}" - ${nftNameCheck.reason}`);
        continue;
      }

      // Filter out NFTs where Alchemy doesn't have a processed image (thumbnailUrl or pngUrl)
      // This allows videos/html/other formats as long as Alchemy converted them to images
      if (!hasThumbnail && !hasPng) {
        console.log(`❌ Skipped (no Alchemy image): ${nftItem.nft.name || 'Unnamed'} (contentType: ${contentType || 'unknown'})`);
        continue;
      }

      // Filter out video NFTs - video-to-image conversion URLs often fail
      if (contentType?.startsWith('video/')) {
        console.log(`❌ Skipped (video NFT): ${nftItem.nft.name || 'Unnamed'} (contentType: ${contentType})`);
        continue;
      }

      if (
        currentCount < 2 && // Allow max 2 per collection
        selectedNfts.length < count
      ) {
        selectedNfts.push(nftItem);
        collectionCounts.set(collectionAddress, currentCount + 1);
        console.log(`✅ Selected NFT: ${nftItem.nft.name || 'Unnamed'} (${nftItem.reason})`);
      } else {
        if (currentCount >= 2) {
          console.log(`❌ Skipped (collection limit): ${nftItem.nft.name || 'Unnamed'} (already have ${currentCount} from this collection)`);
          console.log(`    Debug - Selected NFTs so far: ${selectedNfts.map(n => `${n.nft.name} (${n.nft.contract.address.toLowerCase()})`).join(', ')}`);
        } else if (selectedNfts.length >= count) {
          console.log(`❌ Skipped (count limit reached): ${nftItem.nft.name || 'Unnamed'}`);
        }
      }
      
      if (selectedNfts.length >= count) break;
    }
    
    console.log(`🎉 Selected ${selectedNfts.length} NFTs out of ${count} requested`);
    
    // If we didn't get enough NFTs, log a warning
    if (selectedNfts.length < count) {
      console.warn(`⚠️ Only found ${selectedNfts.length} image NFTs out of ${count} requested from ${scoredNfts.length} total candidates`);
    }
    
    // Generate interpretation
    const interpretation = generateInterpretation(sentiment, themes, selectedNfts);
    
    // Map selected NFTs to output format
    const mappedNfts = selectedNfts.map((item) => {
      const contractAddress = item.nft.contract.address;
      const tokenId = item.nft.tokenId;

      // Log all available URLs from Alchemy
      console.log(`\n📸 ${item.nft.name} - Available URLs from Alchemy:`);
      console.log(`   cachedUrl: ${item.nft.image?.cachedUrl || 'null'}`);
      console.log(`   thumbnailUrl: ${item.nft.image?.thumbnailUrl || 'null'}`);
      console.log(`   pngUrl: ${item.nft.image?.pngUrl || 'null'}`);
      console.log(`   originalUrl: ${item.nft.image?.originalUrl || 'null'}`);

      // Determine primary image URL based on collection preferences
      const preferOriginal = shouldPreferOriginalImage(contractAddress);
      let primaryImageUrl: string | null;
      let selectedUrlType: string;

      if (preferOriginal) {
        // For collections that benefit from full resolution, prioritize: originalUrl → pngUrl → thumbnailUrl
        if (item.nft.image?.originalUrl) {
          primaryImageUrl = item.nft.image.originalUrl;
          selectedUrlType = 'original';
        } else if (item.nft.image?.pngUrl) {
          primaryImageUrl = item.nft.image.pngUrl;
          selectedUrlType = 'png';
        } else {
          primaryImageUrl = item.nft.image?.thumbnailUrl || null;
          selectedUrlType = 'thumbnail';
        }
      } else {
        // Default: prioritize pngUrl for better quality: pngUrl → thumbnailUrl → originalUrl
        if (item.nft.image?.pngUrl) {
          primaryImageUrl = item.nft.image.pngUrl;
          selectedUrlType = 'png';
        } else if (item.nft.image?.thumbnailUrl) {
          primaryImageUrl = item.nft.image.thumbnailUrl;
          selectedUrlType = 'thumbnail';
        } else {
          primaryImageUrl = item.nft.image?.originalUrl || null;
          selectedUrlType = 'original';
        }
      }

      console.log(`   ✅ Selected: ${selectedUrlType} (preferOriginal: ${preferOriginal})`);
      console.log(`   🔗 URL: ${primaryImageUrl}\n`);

      return {
        tokenId,
        contractAddress: contractAddress as Address,
        name: item.nft.name || `Token #${tokenId}`,
        description: item.nft.description || null,
        imageUrl: primaryImageUrl,
        preferredImageUrl: primaryImageUrl, // Explicitly set preferred URL for katachi-generator
        collectionName: item.nft.contract.name || null,
        contractDeployer: item.nft.contract.contractDeployer || null, // Contract deployer address (creator/artist)
        alchemyImages: {
          cachedUrl: item.nft.image?.cachedUrl || undefined,
          thumbnailUrl: item.nft.image?.thumbnailUrl || undefined,
          pngUrl: item.nft.image?.pngUrl || undefined,
          originalUrl: item.nft.image?.originalUrl || undefined,
          contentType: item.nft.image?.contentType || undefined,
          size: item.nft.image?.size || undefined,
        },
        reason: item.reason,
        matchScore: Math.round(item.score * 100) / 100,
        matchDetails: item.matchDetails
      };
    });
    
    const result: InterpretedNFTsOutput = {
      ownerAddress: address,
      sentiment,
      interpretation,
      requestedCount: count,
      selectedNfts: mappedNfts,
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

function generateInterpretation(
  sentiment: string,
  themes: string[],
  selectedNfts: Array<{
    nft: OwnedNft;
    score: number;
    reason: string;
    matchDetails: {
      textMatches: string[];
      themeMatches: string[];
      visualMatches: string[];
      collectionInfo: string;
    };
  }>
): string {
  // Format themes with proper grammar and blue coloring: "joy and community" or "joy, pride, and creativity"
  let themeText = '';
  if (themes.length > 0) {
    // Wrap each theme in a colored span
    const coloredThemes = themes.map(theme => `<span style="color: #3b82f6;">${theme}</span>`);

    if (themes.length === 1) {
      themeText = `themes of ${coloredThemes[0]}`;
    } else if (themes.length === 2) {
      themeText = `themes of ${coloredThemes[0]} and ${coloredThemes[1]}`;
    } else {
      const lastTheme = coloredThemes[coloredThemes.length - 1];
      const otherThemes = coloredThemes.slice(0, -1).join(', ');
      themeText = `themes of ${otherThemes}, and ${lastTheme}`;
    }
  }

  // Get top 3 NFT titles (italicized)
  let topWorksText = '';
  const top3 = selectedNfts.slice(0, Math.min(3, selectedNfts.length));
  if (top3.length > 0) {
    const titles = top3.map(item => `<em>${item.nft.name || 'Untitled'}</em>`);
    if (titles.length === 1) {
      topWorksText = `The top work that resonates with your sentiment is ${titles[0]}. `;
    } else if (titles.length === 2) {
      topWorksText = `The top works that resonate with your sentiment are ${titles[0]} and ${titles[1]}. `;
    } else {
      topWorksText = `The top 3 works that resonate with your sentiment are ${titles[0]}, ${titles[1]}, and ${titles[2]}. `;
    }
  }

  // Art curator tone variations
  const interpretations = [
    `I've evaluated your sentiment about collecting on-chain artwork.\nI detected ${themeText}, which speak to the emotional resonance of your collecting journey.\n${topWorksText}Based on this, below are the artworks I've curated from your collection, which will be applied to your unique Katachi Gen Origami design.`,
    `I've evaluated your sentiment about collecting on-chain artwork.\nYour reflection reveals ${themeText}, reflecting a thoughtful engagement with digital art.\n${topWorksText}Based on this, below are the artworks I've curated from your collection, which will be applied to your unique Katachi Gen Origami design.`,
    `I've evaluated your sentiment about collecting on-chain artwork.\nThe ${themeText} that emerge from your words suggest a meaningful connection to these works.\n${topWorksText}Based on this, below are the artworks I've curated from your collection, which will be applied to your unique Katachi Gen Origami design.`,
  ];

  return interpretations[Math.floor(Math.random() * interpretations.length)];
}