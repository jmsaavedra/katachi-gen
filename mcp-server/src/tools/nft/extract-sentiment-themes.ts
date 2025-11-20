import { z } from 'zod';
import { type InferSchema } from 'xmcp';
import { anthropic } from '../../clients';
import { config } from '../../config';
import type { ToolErrorOutput } from '../../types';
import { getCached, setCached } from '../../utils/cache';

// Define the output type for theme extraction
export interface ExtractedThemesOutput {
  sentiment: string;
  themes: string[];
  interpretation: string;
  timestamp: string;
}

export const schema = {
  sentiment: z
    .string()
    .min(5)
    .max(500)
    .describe('The collector\'s response about how collecting on Shape makes them feel'),
};

export const metadata = {
  name: 'extractSentimentThemes',
  description: 'Extract curatorial themes from a collector\'s sentiment and generate an interpretation (fast, no NFT data required)',
  annotations: {
    title: 'Extract Sentiment Themes',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: false,
    requiresWallet: false,
    category: 'nft-analysis',
    educationalHint: true,
    cacheTTL: 60 * 5, // 5 minutes
  },
};

// Fallback keyword-based theme extraction (ensures 2-5 themes)
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

// Extract themes using AI
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

// Generate curatorial interpretation (without NFT data)
async function generateInitialInterpretation(
  sentiment: string,
  themes: string[]
): Promise<string> {
  try {
    const prompt = `You are an expert art curator writing a personalized interpretation of a collector's sentiment about their NFT collection.

Collector's sentiment: "${sentiment}"

Identified curatorial themes: ${themes.join(', ')}

Write a 2-3 sentence curatorial statement that:
- Addresses the collector's sentiment directly and authentically (whether it's emotional, practical, critical, or anything else)
- References the themes in a sophisticated, yet relatable, accessible and unpretentious art-world tone
- Uses HTML <span style="color: #3b82f6;"> tags to highlight the theme words when you mention them
- Ends with a note that you're now curating specific works from their collection
- Avoids clichés like "journey" or "resonates" - be specific and direct
- Matches the tone of the sentiment (e.g., if they mention money, acknowledge the financial aspect; if they're poetic, be poetic)

Example for "profits and money" with themes ["financial speculation", "investment mindset"]:
"Your approach to collecting reveals a clear <span style="color: #3b82f6;">investment mindset</span>, viewing on-chain art as both cultural capital and <span style="color: #3b82f6;">financial speculation</span>. This pragmatic lens shaped by <span style="color: #3b82f6;">wealth accumulation</span> offers a distinctive collecting philosophy. I'm now curating works from your collection that exemplify these themes."

Example for "beautiful colors" with themes ["chromatic exploration", "visual aesthetics"]:
"Your focus on <span style="color: #3b82f6;">chromatic exploration</span> reveals a collector drawn to <span style="color: #3b82f6;">visual aesthetics</span> above conceptual concerns. This emphasis on <span style="color: #3b82f6;">color theory</span> demonstrates a formalist collecting practice. I'm now curating works from your collection that exemplify these themes."

Write ONLY the curatorial statement, no introduction or explanation:`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 250,
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
    console.log(`✨ AI-generated initial interpretation: ${interpretation.slice(0, 100)}...`);
    return interpretation;

  } catch (error) {
    console.error('Error generating interpretation with AI:', error);

    // Fallback interpretation
    const coloredThemes = themes.map(theme => `<span style="color: #3b82f6;">${theme}</span>`);
    let themeText = '';
    if (themes.length === 1) {
      themeText = coloredThemes[0];
    } else if (themes.length === 2) {
      themeText = `${coloredThemes[0]} and ${coloredThemes[1]}`;
    } else {
      const lastTheme = coloredThemes[coloredThemes.length - 1];
      const otherThemes = coloredThemes.slice(0, -1).join(', ');
      themeText = `${otherThemes}, and ${lastTheme}`;
    }

    return `I've identified themes of ${themeText} in your collecting practice. I'm now curating works from your collection that exemplify these themes.`;
  }
}

export default async function extractSentimentThemes({
  sentiment
}: InferSchema<typeof schema>) {
  console.log(`\n✨ ========== EXTRACT SENTIMENT THEMES START ==========`);
  console.log(`💭 Sentiment: "${sentiment}"`);

  const cacheKey = `mcp:extractThemes:${config.chainId}:${Buffer.from(sentiment).toString('base64').slice(0, 40)}`;
  const cached = await getCached(cacheKey);

  if (cached) {
    console.log(`✅ Cache hit! Returning cached result.`);
    console.log(`========== EXTRACT SENTIMENT THEMES END (cached) ==========\n`);
    return JSON.parse(cached);
  }

  console.log(`❌ Cache miss. Processing fresh request...`);

  try {
    // Extract themes from sentiment using AI
    console.log('🤖 Starting AI theme extraction...');
    const themeStartTime = Date.now();
    const themes = await extractThemes(sentiment);
    console.log(`✅ Theme extraction completed in ${Date.now() - themeStartTime}ms`);

    // Generate initial interpretation (no NFT data needed yet)
    console.log('🤖 Starting AI interpretation generation...');
    const interpStartTime = Date.now();
    const interpretation = await generateInitialInterpretation(sentiment, themes);
    console.log(`✅ Interpretation completed in ${Date.now() - interpStartTime}ms`);

    const result: ExtractedThemesOutput = {
      sentiment,
      themes,
      interpretation,
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

    console.log(`========== EXTRACT SENTIMENT THEMES END (success) ==========\n`);
    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    const errorOutput: ToolErrorOutput = {
      error: true,
      message: `Error extracting sentiment themes: ${errorMessage}`,
      timestamp: new Date().toISOString(),
    };

    console.log(`========== EXTRACT SENTIMENT THEMES END (error) ==========\n`);
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
