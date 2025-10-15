/**
 * Shared collection configuration utilities
 * Used across all NFT tools for consistent filtering and image preferences
 */

import fs from 'fs';
import path from 'path';

// Collection configuration interface
export interface CollectionConfig {
  blockedContracts: Array<{ address: string; reason: string }>;
  blockedCollectionNames: Array<{
    pattern: string;
    matchType: 'exact' | 'startsWith' | 'contains' | 'regex';
    reason: string;
    caseSensitive: boolean;
  }>;
  blockedNftNames: Array<{
    pattern: string;
    matchType: 'exact' | 'startsWith' | 'contains' | 'regex';
    reason: string;
    caseSensitive: boolean;
  }>;
  imagePreferences: Array<{
    address: string;
    name: string;
    preferOriginal: boolean;
    reason: string;
  }>;
  defaultImagePreference: 'thumbnail' | 'original';
}

// Hardcoded fallback configuration
const FALLBACK_CONFIG: CollectionConfig = {
  blockedContracts: [
    { address: '0x274b9f633e968a31e8f9831308170720d1072135', reason: 'Blocked collection' },
    { address: '0x0602b0fad4d305b2c670808dd9f77b0a68e36c5b', reason: 'Blocked collection' },
  ],
  blockedCollectionNames: [
    { pattern: 'Grifter by XCOPY', matchType: 'exact', reason: 'Fake collection', caseSensitive: false },
  ],
  blockedNftNames: [
    { pattern: 'Grifter #', matchType: 'startsWith', reason: 'Fake Grifter NFTs', caseSensitive: false },
  ],
  imagePreferences: [],
  defaultImagePreference: 'thumbnail',
};

// Load collection configuration from JSON file with graceful fallback
function loadCollectionConfig(): CollectionConfig {
  try {
    const filePath = path.join(process.cwd(), 'config-collections.json');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const config: CollectionConfig = JSON.parse(fileContent);

    console.log(`✅ Loaded collection config: ${config.blockedContracts.length} blocked contracts, ${config.blockedCollectionNames.length} blocked collection names, ${config.blockedNftNames.length} blocked NFT names`);
    return config;

  } catch (error) {
    console.warn('⚠️ Could not load config-collections.json, using fallback config:', (error as Error).message);
    return FALLBACK_CONFIG;
  }
}

// Singleton instance
let configInstance: CollectionConfig | null = null;

export function getCollectionConfig(): CollectionConfig {
  if (!configInstance) {
    configInstance = loadCollectionConfig();
  }
  return configInstance;
}

// Helper functions for filtering
export function isContractBlocked(contractAddress: string): boolean {
  const config = getCollectionConfig();
  const normalized = contractAddress.toLowerCase();
  return config.blockedContracts.some(blocked => blocked.address.toLowerCase() === normalized);
}

export function isCollectionNameBlocked(collectionName: string | null): { blocked: boolean; reason?: string } {
  if (!collectionName) return { blocked: false };

  const config = getCollectionConfig();

  for (const rule of config.blockedCollectionNames) {
    const testName = rule.caseSensitive ? collectionName : collectionName.toLowerCase();
    const testPattern = rule.caseSensitive ? rule.pattern : rule.pattern.toLowerCase();

    let isMatch = false;

    switch (rule.matchType) {
      case 'exact':
        isMatch = testName === testPattern;
        break;
      case 'startsWith':
        isMatch = testName.startsWith(testPattern);
        break;
      case 'contains':
        isMatch = testName.includes(testPattern);
        break;
      case 'regex':
        try {
          const regex = new RegExp(testPattern, rule.caseSensitive ? '' : 'i');
          isMatch = regex.test(collectionName);
        } catch (e) {
          console.warn(`Invalid regex pattern: ${testPattern}`);
        }
        break;
    }

    if (isMatch) {
      return { blocked: true, reason: rule.reason };
    }
  }

  return { blocked: false };
}

export function isNftNameBlocked(nftName: string | null): { blocked: boolean; reason?: string } {
  if (!nftName) return { blocked: false };

  const config = getCollectionConfig();

  for (const rule of config.blockedNftNames) {
    const testName = rule.caseSensitive ? nftName : nftName.toLowerCase();
    const testPattern = rule.caseSensitive ? rule.pattern : rule.pattern.toLowerCase();

    let isMatch = false;

    switch (rule.matchType) {
      case 'exact':
        isMatch = testName === testPattern;
        break;
      case 'startsWith':
        isMatch = testName.startsWith(testPattern);
        break;
      case 'contains':
        isMatch = testName.includes(testPattern);
        break;
      case 'regex':
        try {
          const regex = new RegExp(testPattern, rule.caseSensitive ? '' : 'i');
          isMatch = regex.test(nftName);
        } catch (e) {
          console.warn(`Invalid regex pattern: ${testPattern}`);
        }
        break;
    }

    if (isMatch) {
      return { blocked: true, reason: rule.reason };
    }
  }

  return { blocked: false };
}

export function shouldPreferOriginalImage(contractAddress: string): boolean {
  const config = getCollectionConfig();
  const normalized = contractAddress.toLowerCase();
  const pref = config.imagePreferences.find(p => p.address.toLowerCase() === normalized);
  return pref?.preferOriginal ?? (config.defaultImagePreference === 'original');
}

// For backward compatibility - return just the blocked contract addresses
export function getBlockedContracts(): string[] {
  const config = getCollectionConfig();
  return config.blockedContracts.map(c => c.address.toLowerCase());
}
