// Placeholder SVG generator for testing minting functionality
// TODO: Replace with actual origami pattern generation later

type PatternData = {
  nftCount: number;
  collections: number;
  stackRank?: number;
  stackMedalsCount?: number; // Number of Stack medals earned
  walletAddress: string;
  nftNumber?: number; // The sequential NFT number (1, 2, 3, etc.)
  sentimentFilter?: string; // The sentiment/feeling entered by collector
  curatedNfts?: Array<{
    name: string;
    description: string;
    image: string;
    contractAddress: string;
    tokenId: string;
  }>; // The 5 NFTs that best matched the sentiment
};

type GeneratedPattern = {
  svgContent: string;
  metadata: {
    name: string;
    description: string;
    patternType: string;
    complexity: 'Basic' | 'Medium' | 'High';
    foldLines: number;
    colors: string[];
    curatedNfts?: Array<{
      name: string;
      description: string;
      image: string;
      contractAddress: string;
      tokenId: string;
    }>;
    traits: Array<{
      trait_type: string;
      value: string | number;
    }>;
  };
};

const ORIGAMI_PATTERNS = [
  'Kabuto (Samurai Helmet)',
  'Tsuru (Crane)',
  'Sakura (Cherry Blossom)',
  'Koi (Carp)',
  'Shuriken (Throwing Star)',
  'Lotus Flower',
  'Mountain Peak',
  'Wave Pattern'
];

const BASE_COLORS = [
  '#4F46E5', // Indigo
  '#06B6D4', // Cyan  
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#84CC16', // Lime
];

// Simple seeded random number generator
function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  let current = Math.abs(hash);
  
  return function() {
    current = (current * 16807) % 2147483647;
    return (current - 1) / 2147483646;
  };
}

function generateRandomOrigamiSVG(colors: string[], foldLines: number, patternType: string, complexity: string, nftCount: number, collections: number, rng: () => number, sentimentFilter?: string): string {
  const size = 400;
  const centerX = size / 2;
  const centerY = size / 2;
  
  // Create fold lines based on the actual foldLines count
  const folds: string[] = [];
  
  // Generate radial fold lines (typical of origami) - use the exact foldLines count
  for (let i = 0; i < foldLines; i++) {
    const angle = (i / foldLines) * 2 * Math.PI;
    const innerRadius = 40 + rng() * 60;
    const outerRadius = 150 + rng() * 100;
    
    const x1 = centerX + Math.cos(angle) * innerRadius;
    const y1 = centerY + Math.sin(angle) * innerRadius;
    const x2 = centerX + Math.cos(angle) * outerRadius;
    const y2 = centerY + Math.sin(angle) * outerRadius;
    
    folds.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${colors[i % colors.length]}" stroke-width="2" opacity="0.7" stroke-dasharray="5,5"/>`);
  }
  
  // Generate geometric shapes representing folded sections
  const shapes: string[] = [];
  const complexityValue = complexity === 'High' ? 3 : complexity === 'Medium' ? 2 : 1;
  const shapeCount = 4 + Math.floor(complexityValue / 3);
  
  for (let i = 0; i < shapeCount; i++) {
    const angle = (i / shapeCount) * 2 * Math.PI;
    const radius = 80 + rng() * 60;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    const shapeSize = 20 + rng() * 30;
    const color = colors[i % colors.length];
    
    if (i % 3 === 0) {
      // Triangle
      const points = [
        [x, y - shapeSize],
        [x - shapeSize * 0.866, y + shapeSize * 0.5],
        [x + shapeSize * 0.866, y + shapeSize * 0.5]
      ].map(p => p.join(',')).join(' ');
      
      shapes.push(`<polygon points="${points}" fill="${color}" opacity="0.8"/>`);
    } else if (i % 3 === 1) {
      // Rectangle
      shapes.push(`<rect x="${x - shapeSize/2}" y="${y - shapeSize/2}" width="${shapeSize}" height="${shapeSize}" fill="${color}" opacity="0.6" transform="rotate(${angle * 180 / Math.PI} ${x} ${y})"/>`);
    } else {
      // Circle
      shapes.push(`<circle cx="${x}" cy="${y}" r="${shapeSize/2}" fill="${color}" opacity="0.7"/>`);
    }
  }
  
  // Add trait text elements
  const truncatedSentiment = sentimentFilter 
    ? (sentimentFilter.length > 25 ? sentimentFilter.slice(0, 25) + '...' : sentimentFilter)
    : 'No sentiment';
    
  const traitTexts = [
    `<text x="20" y="50" font-family="monospace" font-size="10" fill="#1e293b">${patternType}</text>`,
    `<text x="20" y="65" font-family="monospace" font-size="10" fill="#1e293b">Complexity: ${complexity}</text>`,
    `<text x="20" y="80" font-family="monospace" font-size="10" fill="#1e293b">Fold Lines: ${foldLines}</text>`,
    `<text x="20" y="95" font-family="monospace" font-size="10" fill="#1e293b">NFTs: ${nftCount}</text>`,
    `<text x="20" y="110" font-family="monospace" font-size="10" fill="#1e293b">Collections: ${collections}</text>`,
    `<text x="20" y="125" font-family="monospace" font-size="10" fill="#1e293b">Filter: ${truncatedSentiment}</text>`
  ];

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f8fafc;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#e2e8f0;stop-opacity:1" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="#00000020"/>
    </filter>
  </defs>
  
  <!-- Background -->
  <rect width="100%" height="100%" fill="url(#bg)"/>
  
  <!-- Border -->
  <rect x="10" y="10" width="${size-20}" height="${size-20}" fill="none" stroke="#cbd5e1" stroke-width="2" rx="8"/>
  
  <!-- Trait information panel -->
  <rect x="15" y="35" width="200" height="105" fill="#ffffff" fill-opacity="0.9" stroke="#cbd5e1" stroke-width="1" rx="4"/>
  
  <!-- Origami pattern -->
  <g filter="url(#shadow)">
    ${shapes.join('\n    ')}
    ${folds.join('\n    ')}
  </g>
  
  <!-- Center point -->
  <circle cx="${centerX}" cy="${centerY}" r="4" fill="#1e293b"/>
  
  <!-- Trait text -->
  ${traitTexts.join('\n  ')}
  
  <!-- Title -->
  <text x="${centerX}" y="30" text-anchor="middle" font-family="serif" font-size="16" font-weight="bold" fill="#1e293b">Katachi Gen</text>
  <text x="${centerX}" y="${size-20}" text-anchor="middle" font-family="serif" font-size="12" fill="#64748b">形現</text>
</svg>`;
}

export function generatePlaceholderPattern(data: PatternData): GeneratedPattern {
  // Create deterministic seed but include NFT number for variation
  const seedString = `${data.walletAddress}-${data.nftCount}-${data.collections}-${data.sentimentFilter || 'no-sentiment'}-${data.nftNumber || Math.floor(Math.random() * 10000)}`;
  const rng = seededRandom(seedString);
  
  // Determine complexity based on NFT collection data
  const complexity = data.nftCount > 20 ? 'High' : data.nftCount > 8 ? 'Medium' : 'Basic';
  const complexityValue = complexity === 'High' ? 3 : complexity === 'Medium' ? 2 : 1;
  
  // Select colors based on collection diversity, but use seeded randomness for order
  const baseColorCount = Math.min(Math.max(data.collections, 2), 6);
  const shuffledColors = [...BASE_COLORS];
  // Fisher-Yates shuffle with seeded random
  for (let i = shuffledColors.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffledColors[i], shuffledColors[j]] = [shuffledColors[j], shuffledColors[i]];
  }
  const colors = shuffledColors.slice(0, baseColorCount);
  
  // Seeded pattern selection
  const patternIndex = Math.floor(rng() * ORIGAMI_PATTERNS.length);
  const patternType = ORIGAMI_PATTERNS[patternIndex];
  const foldLines = 12 + complexityValue * 6 + Math.floor(rng() * 8);
  
  // Generate SVG with trait information
  const svgContent = generateRandomOrigamiSVG(colors, foldLines, patternType, complexity, data.nftCount, data.collections, rng, data.sentimentFilter);
  
  // Use the provided NFT number or use a placeholder for preview
  const nftNumber = data.nftNumber || 'TBD';
  
  return {
    svgContent,
    metadata: {
      name: `Katachi Gen #${nftNumber}`,
      description: `A unique origami NFT generated from on-chain wallet activity on Shape Network. This ${patternType.toLowerCase()} pattern represents the holder's journey through ${data.collections} collections with ${data.nftCount} total NFTs, creating a ${complexity.toLowerCase()} complexity design with ${foldLines} fold lines.${nftNumber === 'TBD' ? ' (Final NFT number will be assigned at mint time)' : ''}\n\nhttps://katachi-gen.com`,
      patternType,
      complexity,
      foldLines,
      colors,
      ...(data.curatedNfts && data.curatedNfts.length > 0 && { curatedNfts: data.curatedNfts }),
      traits: [
        {
          trait_type: 'Pattern Type',
          value: patternType
        },
        {
          trait_type: 'Complexity',
          value: complexity
        },
        {
          trait_type: 'Fold Lines',
          value: foldLines
        },
        {
          trait_type: 'NFT Count',
          value: data.nftCount
        },
        {
          trait_type: 'Collection Count',
          value: data.collections
        },
        {
          trait_type: 'Stack Medals Count',
          value: data.stackMedalsCount || 0
        },
        {
          trait_type: 'Wallet Seed',
          value: data.walletAddress.slice(0, 6) + '...' + data.walletAddress.slice(-4)
        },
        {
          trait_type: 'Sentiment Filter',
          value: data.sentimentFilter || 'No sentiment provided'
        }
      ]
    }
  };
}