#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Arweave = require('arweave');

// Arweave wallet path
const arweaveWalletPath = '../keys/GFgK-XvXL1L-4uoY0W2b1X7BfzpC2fwqOdoFC4WgFiE.json';

// Initialize Arweave
const arweave = Arweave.init({
    host: 'arweave.net',
    port: 443,
    protocol: 'https'
});

// Function to get file content type based on extension
function getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const contentTypeMap = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.txt': 'text/plain',
        '.pdf': 'application/pdf',
        '.zip': 'application/zip',
        '.stl': 'application/sla',
        '.obj': 'application/octet-stream'
    };
    
    return contentTypeMap[ext] || 'application/octet-stream';
}

// Function to get wallet address from key object
async function getWalletAddress(walletKey) {
    try {
        const walletAddress = await arweave.wallets.jwkToAddress(walletKey);
        return walletAddress;
    } catch (error) {
        console.error('Error getting wallet address:', error);
        throw error;
    }
}

// Function to get wallet balance
async function getWalletBalance(walletAddress) {
    try {
        const balanceWinston = await arweave.wallets.getBalance(walletAddress);
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

// Function to load Arweave wallet (same logic as kg-nft-server.js)
function loadArweaveWallet() {
    try {
        // Try environment variable first (for Railway/production)
        if (process.env.ARWEAVE_WALLET) {
            console.log('Loading Arweave wallet from environment variable');
            return JSON.parse(process.env.ARWEAVE_WALLET);
        }
        // Fall back to file (for local development)
        const walletPath = process.env.NODE_ENV === 'production' 
            ? '../keys/arweave-wallet.json'
            : './keys/arweave-wallet.json';
        if (fs.existsSync(walletPath)) {
            console.log('Loading Arweave wallet from file:', walletPath);
            return JSON.parse(fs.readFileSync(walletPath, 'utf8'));
        }
        throw new Error('No Arweave wallet found in environment or file');
    } catch (error) {
        console.error('Error loading Arweave wallet:', error);
        throw error;
    }
}

// Function to upload file to Arweave
async function uploadFileToArweave(filePath, walletPath = null) {
    try {
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        console.log(`Uploading file: ${filePath}`);

        // Load wallet key using the new function
        const walletKey = loadArweaveWallet();
        
        // Get wallet address and balance
        const walletAddress = await getWalletAddress(walletKey);
        console.log(`Wallet address: ${walletAddress}`);
        
        const balance = await getWalletBalance(walletAddress);
        console.log(`Wallet balance: ${balance.ar} AR (${balance.winston} winston)`);

        // Check if wallet has sufficient balance (rough estimation)
        if (parseFloat(balance.ar) < 0.001) {
            console.warn('Warning: Wallet balance is very low. Upload may fail.');
        }

        // Read file content
        const fileContent = fs.readFileSync(filePath);
        console.log(`File size: ${fileContent.length} bytes`);

        // Get content type
        const contentType = getContentType(filePath);
        console.log(`Content type: ${contentType}`);

        // Create transaction
        console.log('Creating transaction...');
        const transaction = await arweave.createTransaction({
            data: fileContent
        }, walletKey);

        // Add tags to the transaction
        transaction.addTag('Content-Type', contentType);
        transaction.addTag('App-Name', 'Katachi-Generator-Uploader');
        transaction.addTag('App-Version', '1.0.0');
        transaction.addTag('File-Name', path.basename(filePath));
        transaction.addTag('Upload-Timestamp', new Date().toISOString());

        // Calculate cost
        const cost = await arweave.transactions.getPrice(fileContent.length);
        const costAR = arweave.ar.winstonToAr(cost);
        console.log(`Upload cost: ${costAR} AR (${cost} winston)`);

        // Check if wallet has sufficient balance for the upload
        if (parseInt(balance.winston) < parseInt(cost)) {
            throw new Error(`Insufficient balance. Required: ${costAR} AR, Available: ${balance.ar} AR`);
        }

        // Sign the transaction
        console.log('Signing transaction...');
        await arweave.transactions.sign(transaction, walletKey);

        // Post the transaction
        console.log('Posting transaction to Arweave...');
        const response = await arweave.transactions.post(transaction);

        if (response.status === 200) {
            console.log('✅ Successfully uploaded to Arweave!');
            console.log(`Transaction ID: ${transaction.id}`);
            console.log(`Arweave URL: https://arweave.net/${transaction.id}`);
            console.log(`Gateway URL: https://arweave.net/${transaction.id}`);
            
            // Wait a moment and check transaction status
            console.log('\nChecking transaction status...');
            setTimeout(async () => {
                try {
                    const status = await arweave.transactions.getStatus(transaction.id);
                    console.log(`Transaction status: ${status.status}`);
                    if (status.confirmed) {
                        console.log(`Block height: ${status.confirmed.block_height}`);
                        console.log(`Block hash: ${status.confirmed.block_indep_hash}`);
                    }
                } catch (statusError) {
                    console.log('Could not check status immediately (this is normal for new transactions)');
                }
            }, 5000);
            
            return transaction.id;
        } else {
            throw new Error(`Upload failed with status: ${response.status} - ${response.statusText}`);
        }

    } catch (error) {
        console.error('❌ Error uploading to Arweave:', error.message);
        throw error;
    }
}

// Main function
async function main() {
    try {
        // Get command line arguments
        const args = process.argv.slice(2);
        
        if (args.length === 0) {
            console.log('Usage: node arweave-uploader.js <file-path>');
            console.log('Example: node arweave-uploader.js ./my-file.txt');
            console.log('Example: node arweave-uploader.js ./thumbnails/thumbnail_123.png');
            process.exit(1);
        }

        const filePath = args[0];
        
        // Convert to absolute path if relative
        const absoluteFilePath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
        const absoluteWalletPath = path.isAbsolute(arweaveWalletPath) ? arweaveWalletPath : path.resolve(arweaveWalletPath);
        
        console.log('=== Arweave File Uploader ===');
        console.log(`Target file: ${absoluteFilePath}`);
        console.log(`Wallet file: ${absoluteWalletPath}`);
        console.log('');

        // Upload file
        const transactionId = await uploadFileToArweave(absoluteFilePath, absoluteWalletPath);
        
        console.log('\n=== Upload Complete ===');
        console.log(`Transaction ID: ${transactionId}`);
        
        // Return transaction ID for programmatic use
        return transactionId;

    } catch (error) {
        console.error('Fatal error:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

// Export for use as a module
module.exports = {
    uploadFileToArweave,
    getWalletAddress,
    getWalletBalance,
    main
};
