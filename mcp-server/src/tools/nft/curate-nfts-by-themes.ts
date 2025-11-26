import { z } from 'zod';
import { type InferSchema } from 'xmcp';
import { Address, isAddress } from 'viem';
import { alchemy, anthropic } from '../../clients';
import { config } from '../../config';
import type { ToolErrorOutput } from '../../types';
import { getCached, setCached } from '../../utils/cache';
import { OwnedNft } from 'alchemy-sdk';
import { isContractBlocked as isContractBlockedShared, isCollectionNameBlocked as isCollectionNameBlockedShared, isNftNameBlocked as isNftNameBlockedShared, shouldPreferOriginalImage as shouldPreferOriginalImageShared } from '../../utils/collection-config';

// Define the output type for curated NFTs
export interface CuratedNFTsOutput {
  ownerAddress: Address;
  sentiment: string;
  themes: string[];
  interpretation: string;
  requestedCount: number;
  selectedNfts: Array<{
    tokenId: string;
    contractAddress: Address;
    name: string | null;
    description: string | null;
    imageUrl: string | null;
    preferredImageUrl?: string | null;
    collectionName: string | null;
    contractDeployer: string | null;
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
  timestamp: string;
}

export const schema = {
  address: z
    .string()
    .refine((address) => isAddress(address), {
      message: 'Invalid address',
    })
    .describe('The wallet address to curate NFTs for'),
  themes: z
    .array(z.string())
    .min(2)
    .max(5)
    .describe('The curatorial themes to match against (from extractSentimentThemes)'),
  sentiment: z
    .string()
    .min(5)
    .max(500)
    .describe('The original sentiment string'),
  count: z
    .number()
    .min(5)
    .max(10)
    .default(8)
    .describe('Number of NFTs to return that match the themes (5-10)'),
};

export const metadata = {
  name: 'curateNftsByThemes',
  description: 'Curate NFTs from a wallet based on sentiment themes (heavy operation, runs in background)',
  annotations: {
    title: 'Curate NFTs by Themes',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: false,
    requiresWallet: false,
    category: 'nft-analysis',
    educationalHint: true,
    chainableWith: ['extractSentimentThemes'],
    cacheTTL: 60 * 5, // 5 minutes
  },
};

// Color keywords mapping (for visual analysis)
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

// Visual characteristics
const VISUAL_CHARACTERISTICS = {
  bright: ['yellow', 'orange', 'pink', 'neon', 'light', 'bright', 'vivid', 'glow'],
  dark: ['black', 'dark', 'shadow', 'night', 'gothic', 'noir', 'mysterious'],
  colorful: ['rainbow', 'multicolor', 'vibrant', 'spectrum', 'diverse', 'mixed'],
  monochrome: ['black and white', 'grayscale', 'minimal', 'simple', 'clean'],
  abstract: ['abstract', 'geometric', 'pattern', 'fractal', 'generative', 'algorithmic'],
  realistic: ['photo', 'realistic', 'portrait', 'landscape', 'detailed'],
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
    if (detectedColors.length > 0) {
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

// Score NFT against themes
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

  // Extract attributes as searchable text
  const attributes = (nft.raw?.metadata?.attributes || []) as Array<{ trait_type?: string; value?: any }>;
  const attributesText = attributes
    .map((attr) => `${attr.trait_type || ''} ${attr.value || ''}`.toLowerCase())
    .join(' ');

  let score = 0;
  const reasons: string[] = [];
  const textMatches: string[] = [];
  const themeMatches: string[] = [];
  const visualMatches: string[] = [];

  // Direct word matches in sentiment
  const sentimentWords = [...new Set(lowerSentiment.split(/\s+/))];
  const descriptionMatches: string[] = [];
  const attributeMatches: string[] = [];

  for (const word of sentimentWords) {
    if (word.length > 3) {
      if (nftName.includes(word)) {
        score += 2;
        reasons.push(`name contains "${word}"`);
        textMatches.push(`NFT name: "${word}"`);
      }
      if (nftDescription.includes(word)) {
        score += 3;
        descriptionMatches.push(word);
        textMatches.push(`Description: "${word}"`);
      }
      if (attributesText.includes(word)) {
        score += 2;
        attributeMatches.push(word);
        textMatches.push(`Attributes: "${word}"`);
      }
      if (collectionName.includes(word)) {
        score += 0.5;
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

  // Add consolidated attribute match reason
  if (attributeMatches.length > 0) {
    if (attributeMatches.length === 1) {
      reasons.push(`attributes contain "${attributeMatches[0]}"`);
    } else if (attributeMatches.length === 2) {
      reasons.push(`attributes contain "${attributeMatches[0]}" and "${attributeMatches[1]}"`);
    } else {
      reasons.push(`attributes match ${attributeMatches.length} words`);
    }
  }

  // Theme matching
  for (const theme of themes) {
    const lowerTheme = theme.toLowerCase();
    const themeWords = lowerTheme.split(/\s+/).filter(word => word.length > 3);

    for (const word of themeWords) {
      if (nftName.includes(word)) {
        score += 2.5;
        reasons.push(`${theme} theme: "${word}" in name`);
        themeMatches.push(`${theme}: "${word}" in name`);
        break;
      }
      if (nftDescription.includes(word)) {
        score += 2.5;
        reasons.push(`${theme} theme: "${word}" in description`);
        themeMatches.push(`${theme}: "${word}" in description`);
        break;
      }
      if (attributesText.includes(word)) {
        score += 2;
        reasons.push(`${theme} theme: "${word}" in attributes`);
        themeMatches.push(`${theme}: "${word}" in attributes`);
        break;
      }
      if (collectionName.includes(word)) {
        score += 0.5;
        reasons.push(`${theme} theme: "${word}" in collection`);
        themeMatches.push(`${theme}: "${word}" in collection`);
        break;
      }
    }
  }

  // Visual characteristic matching
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

  // Visual content analysis
  const imageUrl = nft.image?.cachedUrl || nft.image?.pngUrl || nft.image?.thumbnailUrl || nft.image?.originalUrl || null;
  const visualAnalysis = await analyzeVisualContent(imageUrl, sentiment);
  score += visualAnalysis.score;
  reasons.push(...visualAnalysis.reasons);
  visualMatches.push(...visualAnalysis.reasons);

  // Random factor for diversity
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

// Generate final interpretation with actual NFT names
async function generateFinalInterpretation(
  sentiment: string,
  themes: string[],
  selectedNfts: Array<{
    nft: OwnedNft;
    score: number;
    reason: string;
  }>
): Promise<string> {
  try {
    const top3 = selectedNfts.slice(0, Math.min(3, selectedNfts.length));
    const nftDetails = top3.map(item => ({
      title: item.nft.name || 'Untitled',
      collection: item.nft.contract.name || 'Unknown Collection',
      reason: item.reason
    }));

    const prompt = `You are an expert art curator writing a personalized interpretation of a collector's NFT collection.

Collector's sentiment: "${sentiment}"

Identified curatorial themes: ${themes.join(', ')}

Top artworks selected (in order of relevance):
${nftDetails.map((nft, i) => `${i + 1}. "${nft.title}" from ${nft.collection}`).join('\n')}

Write a 2-3 sentence curatorial statement that:
- Addresses the collector's sentiment directly and authentically
- References the themes in a sophisticated, yet relatable, accessible and unpretentious art-world tone
- Mentions 1-2 of the top artworks by name (use <em> tags for titles)
- Uses HTML <span style="color: #3b82f6;"> tags to highlight theme words
- Ends by noting these works will form their Katachi Gen origami design
- Avoids clichés like "journey" or "resonates" - be specific and direct
- Matches the tone of the sentiment

Write ONLY the curatorial statement:`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }]
    });

    const textContent = response.content.find(block => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    return textContent.text.trim();
  } catch (error) {
    console.error('Error generating interpretation:', error);

    // Fallback
    const coloredThemes = themes.map(theme => `<span style="color: #3b82f6;">${theme}</span>`);
    const themeText = coloredThemes.join(', ');
    const top3 = selectedNfts.slice(0, Math.min(3, selectedNfts.length));
    const titles = top3.map(item => `<em>${item.nft.name || 'Untitled'}</em>`).join(', ');

    return `I've curated works reflecting ${themeText}, including ${titles}. These pieces will form the basis of your Katachi Gen origami design.`;
  }
}

export default async function curateNftsByThemes({
  address,
  themes,
  sentiment,
  count
}: InferSchema<typeof schema>) {
  console.log(`\n🎨 ========== CURATE NFTS BY THEMES START ==========`);
  console.log(`📍 Address: ${address}`);
  console.log(`🏷️ Themes: ${themes.join(', ')}`);
  console.log(`🔢 Count: ${count}`);

  const cacheKey = `mcp:curateNfts:${config.chainId}:${address.toLowerCase()}:${themes.join(',')}:${count}`;
  const cached = await getCached(cacheKey);

  if (cached) {
    console.log(`✅ Cache hit! Returning cached result.`);
    console.log(`========== CURATE NFTS BY THEMES END (cached) ==========\n`);
    return JSON.parse(cached);
  }

  console.log(`❌ Cache miss. Processing fresh request...`);

  try {
    // Fetch all NFTs for the wallet
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

      if (allNfts.length >= 2000) break;
    } while (pageKey);

    console.log(`✅ NFT fetch completed in ${Date.now() - nftFetchStart}ms - Total NFTs: ${allNfts.length}`);

    if (allNfts.length === 0) {
      throw new Error('No NFTs found for this address');
    }

    // Score NFTs
    console.log(`📊 Scoring ${allNfts.length} NFTs against themes...`);
    const scoreStartTime = Date.now();
    const scoredNfts = await Promise.all(
      allNfts.map(async (nft) => ({
        nft,
        ...(await scoreNFT(nft, sentiment, themes))
      }))
    );
    console.log(`✅ NFT scoring completed in ${Date.now() - scoreStartTime}ms`);

    // Sort and select top NFTs
    scoredNfts.sort((a, b) => b.score - a.score);

    const selectedNfts: typeof scoredNfts = [];
    const collectionCounts = new Map<string, number>();

    for (const nftItem of scoredNfts) {
      const collectionAddress = nftItem.nft.contract.address.toLowerCase();
      const currentCount = collectionCounts.get(collectionAddress) || 0;
      const hasThumbnail = nftItem.nft.image?.thumbnailUrl;
      const hasPng = nftItem.nft.image?.pngUrl;
      const contentType = nftItem.nft.image?.contentType;

      // Filtering logic
      if (isContractBlockedShared(collectionAddress)) continue;
      if (isCollectionNameBlockedShared(nftItem.nft.contract.name || null).blocked) continue;
      if (isNftNameBlockedShared(nftItem.nft.name || null).blocked) continue;
      if (!hasThumbnail && !hasPng) continue;
      if (contentType?.startsWith('video/')) continue;

      if (currentCount < 2 && selectedNfts.length < count) {
        selectedNfts.push(nftItem);
        collectionCounts.set(collectionAddress, currentCount + 1);
      }

      if (selectedNfts.length >= count) break;
    }

    console.log(`🎉 Selected ${selectedNfts.length} NFTs`);

    // Generate final interpretation with NFT names
    console.log('🤖 Generating final interpretation...');
    const interpStartTime = Date.now();
    const interpretation = await generateFinalInterpretation(sentiment, themes, selectedNfts);
    console.log(`✅ Interpretation completed in ${Date.now() - interpStartTime}ms`);

    // Map to output format
    const mappedNfts = selectedNfts.map((item) => {
      const contractAddress = item.nft.contract.address;
      const tokenId = item.nft.tokenId;

      // Determine primary image URL
      const preferOriginal = shouldPreferOriginalImageShared(contractAddress);
      let primaryImageUrl: string | null;

      if (preferOriginal) {
        primaryImageUrl = item.nft.image?.originalUrl || item.nft.image?.pngUrl || item.nft.image?.thumbnailUrl || null;
      } else {
        primaryImageUrl = item.nft.image?.pngUrl || item.nft.image?.thumbnailUrl || item.nft.image?.originalUrl || null;
      }

      return {
        tokenId,
        contractAddress: contractAddress as Address,
        name: item.nft.name || `Token #${tokenId}`,
        description: item.nft.description || null,
        imageUrl: primaryImageUrl,
        preferredImageUrl: primaryImageUrl,
        collectionName: item.nft.contract.name || null,
        contractDeployer: item.nft.contract.contractDeployer || null,
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

    const result: CuratedNFTsOutput = {
      ownerAddress: address,
      sentiment,
      themes,
      interpretation,
      requestedCount: count,
      selectedNfts: mappedNfts,
      timestamp: new Date().toISOString(),
    };

    const response = {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2),
      }],
    };

    await setCached(cacheKey, JSON.stringify(response), metadata.annotations.cacheTTL);

    console.log(`========== CURATE NFTS BY THEMES END (success) ==========\n`);
    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    const errorOutput: ToolErrorOutput = {
      error: true,
      message: `Error curating NFTs: ${errorMessage}`,
      ownerAddress: address,
      timestamp: new Date().toISOString(),
    };

    console.log(`========== CURATE NFTS BY THEMES END (error) ==========\n`);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(errorOutput, null, 2),
      }],
    };
  }
}
