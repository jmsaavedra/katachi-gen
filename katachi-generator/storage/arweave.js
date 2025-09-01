// Arweave storage utilities
const { arweave } = require('../config');
const { loadArweaveWallet } = require('../utils/wallet');
const { uploadFileToArweave } = require('../arweave-uploader');

/**
 * Upload data to Arweave (legacy function for compatibility)
 */
function uploadToArweave(data) {
    return new Promise(async (resolve, reject) => {
        try {
            // Convert data to string for upload
            const dataString = JSON.stringify(data);
            const dataBytes = Buffer.from(dataString);

            console.log('Creating Arweave transaction for', dataBytes.length, 'bytes');

            // Create transaction
            const transaction = await arweave.createTransaction({ data: dataBytes });
            
            // Add tags
            transaction.addTag('Content-Type', 'application/json');
            transaction.addTag('App-Name', 'KatachiGen');

            // For development/testing, return a mock transaction ID
            const mockTxId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            console.log('Arweave upload completed with mock transaction ID:', mockTxId);
            
            setTimeout(() => {
                resolve(mockTxId);
            }, 1000);
            
        } catch (error) {
            console.error('Error creating Arweave transaction:', error);
            reject(error);
        }
    });
}

/**
 * Upload to Arweave with actual wallet (for production use)
 */
async function uploadToArweaveWithWallet(data, walletPath = null) {
    try {
        // Load wallet key using the new function
        const walletKey = loadArweaveWallet();
        if (!walletKey) {
            throw new Error('Wallet key not available');
        }

        // Convert data to buffer if it's not already
        let dataBuffer;
        if (Buffer.isBuffer(data)) {
            dataBuffer = data;
        } else if (typeof data === 'string') {
            dataBuffer = Buffer.from(data);
        } else {
            dataBuffer = Buffer.from(JSON.stringify(data));
        }

        console.log('Creating Arweave transaction for', dataBuffer.length, 'bytes');

        // Create transaction
        const transaction = await arweave.createTransaction({
            data: dataBuffer
        }, walletKey);
        
        // Add appropriate tags
        if (typeof data === 'string' || !Buffer.isBuffer(data)) {
            transaction.addTag('Content-Type', 'application/json');
        } else {
            transaction.addTag('Content-Type', 'application/octet-stream');
        }
        transaction.addTag('App-Name', 'KatachiGen');

        // Sign the transaction
        await arweave.transactions.sign(transaction, walletKey);

        // Submit the transaction
        const response = await arweave.transactions.post(transaction);

        if (response.status === 200) {
            console.log('Transaction submitted successfully:', transaction.id);
            return transaction.id;
        } else {
            throw new Error(`Transaction failed with status: ${response.status}`);
        }
        
    } catch (error) {
        console.error('Error uploading to Arweave:', error);
        throw error;
    }
}

/**
 * Upload metadata JSON to Arweave
 */
async function uploadMetadataToArweave(metadataJson) {
    try {
        const metadataJsonString = JSON.stringify(metadataJson, null, 2);
        console.log('📤 [ARWEAVE] Uploading metadata JSON:', {
            size: metadataJsonString.length,
            name: metadataJson.name || 'Unknown'
        });

        const arweaveId = await uploadToArweaveWithWallet(metadataJsonString);
        const arweaveUrl = `https://arweave.net/${arweaveId}`;
        
        console.log('✅ [ARWEAVE] Metadata uploaded successfully:', {
            arweaveId,
            arweaveUrl,
            size: metadataJsonString.length
        });

        return {
            arweaveId,
            arweaveUrl
        };
    } catch (error) {
        console.error('❌ [ARWEAVE] Metadata upload failed:', error);
        throw error;
    }
}

module.exports = {
    uploadToArweave,
    uploadToArweaveWithWallet,
    uploadMetadataToArweave,
    uploadFileToArweave // Re-export from arweave-uploader
};