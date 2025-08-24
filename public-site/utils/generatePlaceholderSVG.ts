// Placeholder SVG generator for testing minting functionality
// TODO: Replace with actual origami pattern generation later

type PatternData = {
  nftCount: number;
  collections: number;
  stackRank?: number;
  walletAddress: string;
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

function generateRandomOrigamiSVG(colors: string[], complexity: number): string {
  const size = 400;
  const centerX = size / 2;
  const centerY = size / 2;
  
  // Create fold lines based on complexity
  const foldCount = Math.min(complexity * 2 + 8, 24);
  const folds: string[] = [];
  
  // Generate radial fold lines (typical of origami)
  for (let i = 0; i < foldCount; i++) {
    const angle = (i / foldCount) * 2 * Math.PI;
    const innerRadius = 40 + Math.random() * 60;
    const outerRadius = 150 + Math.random() * 100;
    
    const x1 = centerX + Math.cos(angle) * innerRadius;
    const y1 = centerY + Math.sin(angle) * innerRadius;
    const x2 = centerX + Math.cos(angle) * outerRadius;
    const y2 = centerY + Math.sin(angle) * outerRadius;
    
    folds.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${colors[i % colors.length]}" stroke-width="2" opacity="0.7" stroke-dasharray="5,5"/>`);
  }
  
  // Generate geometric shapes representing folded sections
  const shapes: string[] = [];
  const shapeCount = 4 + Math.floor(complexity / 3);
  
  for (let i = 0; i < shapeCount; i++) {
    const angle = (i / shapeCount) * 2 * Math.PI;
    const radius = 80 + Math.random() * 60;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    const size = 20 + Math.random() * 30;
    const color = colors[i % colors.length];
    
    if (i % 3 === 0) {
      // Triangle
      const points = [
        [x, y - size],
        [x - size * 0.866, y + size * 0.5],
        [x + size * 0.866, y + size * 0.5]
      ].map(p => p.join(',')).join(' ');
      
      shapes.push(`<polygon points="${points}" fill="${color}" opacity="0.8"/>`);
    } else if (i % 3 === 1) {
      // Rectangle
      shapes.push(`<rect x="${x - size/2}" y="${y - size/2}" width="${size}" height="${size}" fill="${color}" opacity="0.6" transform="rotate(${angle * 180 / Math.PI} ${x} ${y})"/>`);
    } else {
      // Circle
      shapes.push(`<circle cx="${x}" cy="${y}" r="${size/2}" fill="${color}" opacity="0.7"/>`);
    }
  }
  
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
  
  <!-- Origami pattern -->
  <g filter="url(#shadow)">
    ${shapes.join('\n    ')}
    ${folds.join('\n    ')}
  </g>
  
  <!-- Center point -->
  <circle cx="${centerX}" cy="${centerY}" r="4" fill="#1e293b"/>
  
  <!-- Title -->
  <text x="${centerX}" y="30" text-anchor="middle" font-family="serif" font-size="16" font-weight="bold" fill="#1e293b">Katachi Gen</text>
  <text x="${centerX}" y="${size-20}" text-anchor="middle" font-family="serif" font-size="12" fill="#64748b">形現</text>
</svg>`;
}

export function generatePlaceholderPattern(data: PatternData): GeneratedPattern {
  // Determine complexity based on NFT collection data
  const complexity = data.nftCount > 20 ? 'High' : data.nftCount > 8 ? 'Medium' : 'Basic';
  const complexityValue = complexity === 'High' ? 3 : complexity === 'Medium' ? 2 : 1;
  
  // Select colors based on collection diversity
  const colorCount = Math.min(Math.max(data.collections, 2), 6);
  const colors = BASE_COLORS.slice(0, colorCount);
  
  // Random pattern selection
  const patternType = ORIGAMI_PATTERNS[Math.floor(Math.random() * ORIGAMI_PATTERNS.length)];
  const foldLines = 12 + complexityValue * 6 + Math.floor(Math.random() * 8);
  
  // Generate SVG
  const svgContent = generateRandomOrigamiSVG(colors, complexityValue);
  
  // Generate comprehensive metadata
  const tokenId = Math.floor(Math.random() * 9999) + 1;
  
  return {
    svgContent,
    metadata: {
      name: `Katachi Gen #${tokenId}`,
      description: `A unique origami NFT generated from on-chain wallet activity on Shape Network. This ${patternType.toLowerCase()} pattern represents the holder's journey through ${data.collections} collections with ${data.nftCount} total NFTs, creating a ${complexity.toLowerCase()} complexity design with ${foldLines} fold lines.`,
      patternType,
      complexity,
      foldLines,
      colors,
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
          trait_type: 'Collections',
          value: data.collections
        },
        {
          trait_type: 'Color Palette Size',
          value: colors.length
        },
        {
          trait_type: 'Generation',
          value: 'Placeholder' // Will be changed to 'Algorithmic' later
        },
        {
          trait_type: 'Network',
          value: 'Shape'
        },
        {
          trait_type: 'Chain ID',
          value: 11011 // Shape Sepolia
        },
        {
          trait_type: 'Created Via',
          value: 'Katachi Gen App'
        },
        {
          trait_type: 'Wallet Seed',
          value: data.walletAddress.slice(0, 6) + '...' + data.walletAddress.slice(-4)
        }
      ]
    }
  };
}