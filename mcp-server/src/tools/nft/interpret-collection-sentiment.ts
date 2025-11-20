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
    const prompt = `You are an expert art curator analyzing a collector's emotional response to their NFT collecting experience.

User's sentiment: "${sentiment}"

Generate 2-5 curatorial themes that capture the essence of this sentiment. These themes should be:
- Contextually appropriate to what the user actually expressed
- Broad and generative - they can be emotional, practical, aesthetic, conceptual, or anything relevant
- Centered around art curatorial practice (think gallery exhibitions, artistic movements, collector psychology)
- Precise and evocative - not generic

Examples of good themes:
- For "profits and money": ["financial speculation", "investment mindset", "wealth accumulation"]
- For "connected to community": ["social connection", "collective identity", "participatory culture"]
- For "beautiful colors": ["chromatic exploration", "visual aesthetics", "color theory"]
- For "early adopter": ["technological pioneering", "cultural vanguard", "risk-taking"]

Instructions:
- Generate between 2-5 themes that genuinely match the sentiment
- Each theme should be 1-4 words (short but meaningful)
- Avoid forcing positive interpretations if the sentiment isn't positive
- Return ONLY a JSON array of theme strings, nothing else

Response format: ["theme one", "theme two", "theme three"]`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 150,
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

    // Validate that themes are strings
    const validThemes = themes.filter(theme => typeof theme === 'string' && theme.length > 0);
    if (validThemes.length < 2) {
      console.warn(`Only ${validThemes.length} valid themes returned. Using fallback.`);
      return fallbackExtractThemes(sentiment);
    }

    console.log(`✨ AI-generated curatorial themes: ${validThemes.join(', ')}`);
    return validThemes;

  } catch (error) {
    console.error('Error extracting themes with AI:', error);
    return fallbackExtractThemes(sentiment);
  }
}

// Fallback keyword-based theme extraction (ensures 2-5 themes)
// This simpler approach extracts key concepts directly from the user's sentiment
function fallbackExtractThemes(sentiment: string): string[] {
  const lowerSentiment = sentiment.toLowerCase();
  const themes: string[] = [];

  // Map of curatorial concepts with broader keyword matching
  const conceptMappings: Record<string, string[]> = {
    'financial speculation': ['money', 'profit', 'wealth', 'invest', 'value', 'price', 'financial', 'rich'],
    'emotional connection': ['feel', 'love', 'passion', 'heart', 'emotion', 'meaningful'],
    'community building': ['community', 'together', 'friends', 'people', 'collective', 'social'],
    'aesthetic appreciation': ['beautiful', 'art', 'design', 'visual', 'aesthetic', 'color', 'style'],
    'technological innovation': ['tech', 'new', 'future', 'innovation', 'digital', 'crypto', 'blockchain'],
    'early adoption': ['early', 'first', 'pioneer', 'new', 'adopt', 'ground floor'],
    'creative expression': ['creative', 'express', 'unique', 'original', 'artistic', 'imagination'],
    'cultural participation': ['culture', 'movement', 'participate', 'part of', 'belong'],
    'nostalgia': ['remember', 'nostalg', 'memory', 'past', 'childhood', 'vintage'],
    'discovery': ['discover', 'explore', 'find', 'search', 'hunt', 'new'],
  };

  // Check for concept matches
  for (const [concept, keywords] of Object.entries(conceptMappings)) {
    if (keywords.some(keyword => lowerSentiment.includes(keyword))) {
      themes.push(concept);
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

  // If we have 0-1 themes, extract key nouns/concepts from the sentiment itself
  if (themes.length < 2) {
    // Extract meaningful words (4+ chars) as themes
    const words = lowerSentiment.split(/\s+/)
      .filter(word => word.length >= 4)
      .filter(word => !['this', 'that', 'with', 'from', 'have', 'been', 'make', 'made'].includes(word))
      .slice(0, 3);

    if (words.length > 0) {
      themes.push(...words);
    }
  }

  // Absolute fallback: use generic curatorial themes
  if (themes.length < 2) {
    themes.push('collecting practice', 'personal curation');
  }

  // Ensure we return at least 2 themes, max 5
  return themes.slice(0, Math.max(2, Math.min(5, themes.length)));
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
  
  // Theme matching - match theme words directly with NFT content
  for (const theme of themes) {
    const lowerTheme = theme.toLowerCase();
    // Split multi-word themes into individual words for matching
    const themeWords = lowerTheme.split(/\s+/).filter(word => word.length > 3);

    let themeMatched = false;
    for (const word of themeWords) {
      if (nftName.includes(word)) {
        score += 2;
        reasons.push(`${theme} theme: "${word}" in name`);
        themeMatches.push(`${theme}: "${word}" in name`);
        themeMatched = true;
        break;
      }
      if (nftDescription.includes(word)) {
        score += 1;
        reasons.push(`${theme} theme: "${word}" in description`);
        themeMatches.push(`${theme}: "${word}" in description`);
        themeMatched = true;
        break;
      }
      if (collectionName.includes(word)) {
        score += 0.5;
        reasons.push(`${theme} theme: "${word}" in collection`);
        themeMatches.push(`${theme}: "${word}" in collection`);
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
  console.log(`\n🎨 ========== INTERPRET COLLECTION SENTIMENT START ==========`);
  console.log(`📍 Address: ${address}`);
  console.log(`💭 Sentiment: "${sentiment}"`);
  console.log(`🔢 Count: ${count}`);

  const cacheKey = `mcp:interpretSentiment:${config.chainId}:${address.toLowerCase()}:${Buffer.from(sentiment).toString('base64').slice(0, 20)}:${count}`;
  const cached = await getCached(cacheKey);

  if (cached) {
    console.log(`✅ Cache hit! Returning cached result.`);
    console.log(`========== INTERPRET COLLECTION SENTIMENT END (cached) ==========\n`);
    return JSON.parse(cached);
  }

  console.log(`❌ Cache miss. Processing fresh request...`);

  try {
    // Fetch all NFTs for the wallet (we'll need to paginate if needed)
    console.log(`\n📦 Fetching NFTs from Alchemy...`);
    const nftFetchStart = Date.now();
    let allNfts: OwnedNft[] = [];
    let pageKey: string | undefined = undefined;
    let pageCount = 0;

    do {
      pageCount++;
      const nftsResponse: Awaited<ReturnType<typeof alchemy.nft.getNftsForOwner>> = await alchemy.nft.getNftsForOwner(address, {
        pageSize: 100,
        pageKey: pageKey,
        omitMetadata: false,
      });

      allNfts = allNfts.concat(nftsResponse.ownedNfts);
      pageKey = nftsResponse.pageKey;

      console.log(`📄 Page ${pageCount}: Fetched ${nftsResponse.ownedNfts.length} NFTs (total: ${allNfts.length})`);

      // Limit to 2000 NFTs for performance
      if (allNfts.length >= 2000) break;
    } while (pageKey);

    console.log(`✅ NFT fetch completed in ${Date.now() - nftFetchStart}ms - Total NFTs: ${allNfts.length}`);
    
    if (allNfts.length === 0) {
      throw new Error('No NFTs found for this address');
    }
    
    // Extract themes from sentiment using AI
    console.log('🤖 Starting AI theme extraction...');
    const themeStartTime = Date.now();
    const themes = await extractThemes(sentiment);
    console.log(`✅ Theme extraction completed in ${Date.now() - themeStartTime}ms`);

    // Score each NFT based on sentiment matching (now async)
    console.log(`📊 Scoring ${allNfts.length} NFTs...`);
    const scoreStartTime = Date.now();
    const scoredNfts = await Promise.all(
      allNfts.map(async (nft) => ({
        nft,
        ...(await scoreNFT(nft, sentiment, themes))
      }))
    );
    console.log(`✅ NFT scoring completed in ${Date.now() - scoreStartTime}ms`);
    
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
    console.log('🤖 Starting AI curatorial interpretation...');
    const interpStartTime = Date.now();
    const interpretation = await generateInterpretation(sentiment, themes, selectedNfts);
    console.log(`✅ Interpretation completed in ${Date.now() - interpStartTime}ms`);

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

async function generateInterpretation(
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
): Promise<string> {
  try {
    // Prepare top 3 NFT details for the curator to reference
    const top3 = selectedNfts.slice(0, Math.min(3, selectedNfts.length));
    const nftDetails = top3.map(item => ({
      title: item.nft.name || 'Untitled',
      collection: item.nft.contract.name || 'Unknown Collection',
      reason: item.reason
    }));

    const prompt = `You are an expert art curator writing a personalized interpretation of a collector's NFT collection based on their sentiment.

Collector's sentiment: "${sentiment}"

Identified curatorial themes: ${themes.join(', ')}

Top artworks selected (in order of relevance):
${nftDetails.map((nft, i) => `${i + 1}. "${nft.title}" from ${nft.collection}`).join('\n')}

Write a 2-3 sentence curatorial statement that:
- Addresses the collector's sentiment directly and authentically (whether it's emotional, practical, critical, or anything else)
- References the themes in a sophisticated, yet relatable, accessible and unpretentious art-world tone
- Mentions 1-2 of the top artworks by name (use <em> tags for titles)
- Uses HTML <span style="color: #3b82f6;"> tags to highlight the theme words when you mention them
- Ends by noting these are the works curated for their Katachi Gen origami design
- Avoids clichés like "journey" or "resonates" - be specific and direct
- Matches the tone of the sentiment (e.g., if they mention money, acknowledge the financial aspect; if they're poetic, be poetic)

Example for "profits and money" with themes ["financial speculation", "investment mindset"]:
"Your collection reflects a clear <span style="color: #3b82f6;">investment mindset</span>, treating on-chain art as both cultural capital and <span style="color: #3b82f6;">financial speculation</span>. Works like <em>Ethereum Bull</em> and <em>Crypto Punk #1234</em> demonstrate strategic acquisition patterns typical of collector-investors. These pieces will form the basis of your Katachi Gen origami design."

Example for "beautiful colors" with themes ["chromatic exploration", "visual aesthetics"]:
"Your focus on <span style="color: #3b82f6;">chromatic exploration</span> reveals a collector drawn to <span style="color: #3b82f6;">visual aesthetics</span> above conceptual concerns. <em>Rainbow Gradient</em> and <em>Color Field Study</em> exemplify your preference for vibrant, color-forward compositions. These works will form the basis of your Katachi Gen origami design."

Write ONLY the curatorial statement, no introduction or explanation:`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 300,
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

    const interpretation = textContent.text.trim();
    console.log(`✨ AI-generated curatorial interpretation: ${interpretation.slice(0, 100)}...`);
    return interpretation;

  } catch (error) {
    console.error('Error generating interpretation with AI:', error);

    // Fallback to a simpler template-based approach
    return generateFallbackInterpretation(themes, selectedNfts);
  }
}

// Fallback interpretation generator (simpler template-based)
function generateFallbackInterpretation(
  themes: string[],
  selectedNfts: Array<{
    nft: OwnedNft;
    score: number;
    reason: string;
  }>
): string {
  // Format themes with proper grammar and blue coloring
  let themeText = '';
  if (themes.length > 0) {
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
  const top3 = selectedNfts.slice(0, Math.min(3, selectedNfts.length));
  const titles = top3.map(item => `<em>${item.nft.name || 'Untitled'}</em>`);

  let topWorksText = '';
  if (titles.length === 1) {
    topWorksText = `The work ${titles[0]} exemplifies this direction. `;
  } else if (titles.length === 2) {
    topWorksText = `Works like ${titles[0]} and ${titles[1]} exemplify this direction. `;
  } else if (titles.length >= 3) {
    topWorksText = `Works like ${titles[0]}, ${titles[1]}, and ${titles[2]} exemplify this direction. `;
  }

  return `I've analyzed your collection through the lens of ${themeText}. ${topWorksText}These curated works will form the basis of your Katachi Gen origami design.`;
}