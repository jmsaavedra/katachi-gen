// Wallet-related utility functions
const fs = require('fs');
const path = require('path');
const { arweave } = require('../config');

/**
 * Load Arweave wallet from environment variable or file
 */
function loadArweaveWallet() {
    try {
        // Try environment variable first (for Railway/production)
        if (process.env.ARWEAVE_WALLET) {
            console.log('📋 Loading Arweave wallet from environment variable');
            const walletData = JSON.parse(process.env.ARWEAVE_WALLET);
            return walletData;
        }
        
        // Fallback to file (for development)
        const walletPath = path.join(__dirname, '..', 'keys', 'arweave-wallet.json');
        if (fs.existsSync(walletPath)) {
            console.log('📋 Loading Arweave wallet from file:', walletPath);
            const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
            return walletData;
        }
        throw new Error('No Arweave wallet found in environment or file');
    } catch (error) {
        console.error('Error loading Arweave wallet:', error);
        throw error;
    }
}

/**
 * Get wallet address from key file
 */
async function getWalletAddress(walletPath = null) {
    try {
        // Load wallet key using the new function
        const walletKey = loadArweaveWallet();
        if (!walletKey) {
            throw new Error('Wallet key not available');
        }
        
        const walletAddress = await arweave.wallets.jwkToAddress(walletKey);
        console.log('Wallet address:', walletAddress);
        
        return walletAddress;
    } catch (error) {
        console.error('Error getting wallet address:', error);
        throw error;
    }
}

/**
 * Get wallet address from key object
 */
async function getWalletAddressFromKey(walletKey) {
    try {
        // Get wallet address from the key object
        const walletAddress = await arweave.wallets.jwkToAddress(walletKey);
        
        return walletAddress;
    } catch (error) {
        console.error('Error getting wallet address from key:', error);
        throw error;
    }
}

/**
 * Get wallet balance
 */
async function getWalletBalance(walletAddress) {
    try {
        // Get balance in winston (smallest unit of AR)
        const balanceWinston = await arweave.wallets.getBalance(walletAddress);
        
        // Convert to AR for display
        const balanceAR = arweave.ar.winstonToAr(balanceWinston);
        
        return {
            winston: balanceWinston,
            ar: balanceAR
        };
    } catch (error) {
        console.error('Error getting wallet balance:', error);
        throw error;
    }
}

module.exports = {
    loadArweaveWallet,
    getWalletAddress,
    getWalletAddressFromKey,
    getWalletBalance
};