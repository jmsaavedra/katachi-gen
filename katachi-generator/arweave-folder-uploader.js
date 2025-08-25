const Arweave = require('arweave');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');

// Arweave instance
const arweave = Arweave.init({
    host: 'arweave.net',
    port: 443,
    protocol: 'https'
});

// Load wallet key
function loadWallet() {
    try {
        // First check for environment variable
        if (process.env.ARWEAVE_WALLET) {
            console.log('Loading wallet from environment variable...');
            return JSON.parse(process.env.ARWEAVE_WALLET);
        }
        
        // Fall back to local wallet file
        const walletPath = '../keys/arweave-wallet.json';
        console.log(`Loading wallet from file: ${walletPath}`);
        
        if (!fs.existsSync(walletPath)) {
            throw new Error(`Wallet file not found at ${walletPath}. Please ensure arweave-wallet.json exists or set ARWEAVE_WALLET environment variable.`);
        }
        
        return JSON.parse(fs.readFileSync(walletPath, 'utf8'));
    } catch (error) {
        console.error('Error loading wallet:', error.message);
        process.exit(1);
    }
}

// Get all files in a directory recursively
function getAllFiles(dirPath, arrayOfFiles = []) {
    const files = fs.readdirSync(dirPath);

    files.forEach(file => {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            getAllFiles(fullPath, arrayOfFiles);
        } else {
            arrayOfFiles.push(fullPath);
        }
    });

    return arrayOfFiles;
}

// Create manifest data
async function createManifest(folderPath, wallet) {
    const files = getAllFiles(folderPath);
    const manifest = {
        manifest: "arweave/paths",
        version: "0.1.0",
        index: {
            path: "index.html"
        },
        paths: {}
    };

    console.log(`Found ${files.length} files to upload...`);

    // Upload each file and collect transaction IDs
    for (const filePath of files) {
        try {
            const relativePath = path.relative(folderPath, filePath);
            const fileData = fs.readFileSync(filePath);
            const contentType = mime.lookup(filePath) || 'application/octet-stream';

            console.log(`Uploading ${relativePath}...`);

            // Create transaction for file
            const transaction = await arweave.createTransaction({
                data: fileData
            }, wallet);

            // Add tags
            transaction.addTag('Content-Type', contentType);
            transaction.addTag('File-Name', path.basename(filePath));
            transaction.addTag('Relative-Path', relativePath);

            // Sign and post transaction
            await arweave.transactions.sign(transaction, wallet);
            const response = await arweave.transactions.post(transaction);

            if (response.status === 200) {
                console.log(`✓ Uploaded ${relativePath} - TX: ${transaction.id}`);
                manifest.paths[relativePath] = {
                    id: transaction.id
                };
            } else {
                console.error(`✗ Failed to upload ${relativePath}:`, response.status, response.statusText);
            }

            // Add delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
            console.error(`Error uploading ${filePath}:`, error.message);
        }
    }

    return manifest;
}

// Upload manifest
async function uploadManifest(manifest, wallet) {
    try {
        console.log('\nCreating manifest transaction...');
        
        const manifestData = JSON.stringify(manifest, null, 2);
        const transaction = await arweave.createTransaction({
            data: manifestData
        }, wallet);

        // Add tags for manifest
        transaction.addTag('Content-Type', 'application/x.arweave-manifest+json');
        transaction.addTag('Type', 'manifest');

        // Sign and post transaction
        await arweave.transactions.sign(transaction, wallet);
        const response = await arweave.transactions.post(transaction);

        if (response.status === 200) {
            console.log(`✓ Manifest uploaded successfully!`);
            console.log(`Manifest TX ID: ${transaction.id}`);
            console.log(`Access your files at: https://arweave.net/${transaction.id}/[filename]`);
            console.log(`For example: https://arweave.net/${transaction.id}/index.html`);
            return transaction.id;
        } else {
            console.error('✗ Failed to upload manifest:', response.status, response.statusText);
            return null;
        }
    } catch (error) {
        console.error('Error uploading manifest:', error.message);
        return null;
    }
}

// Main function
async function uploadFolder(folderPath) {
    try {
        // Validate folder path
        if (!fs.existsSync(folderPath)) {
            throw new Error(`Folder not found: ${folderPath}`);
        }

        if (!fs.statSync(folderPath).isDirectory()) {
            throw new Error(`Path is not a directory: ${folderPath}`);
        }

        console.log(`Starting upload of folder: ${folderPath}`);
        
        // Load wallet
        const wallet = loadWallet();

        // Check wallet balance
        const address = await arweave.wallets.jwkToAddress(wallet);
        const balance = await arweave.wallets.getBalance(address);
        console.log(`Wallet address: ${address}`);
        console.log(`Wallet balance: ${arweave.ar.winstonToAr(balance)} AR`);

        if (balance === '0') {
            throw new Error('Wallet has no AR balance. Please fund your wallet.');
        }

        // Create manifest
        const manifest = await createManifest(folderPath, wallet);

        if (Object.keys(manifest.paths).length === 0) {
            throw new Error('No files were successfully uploaded.');
        }

        // Upload manifest
        const manifestId = await uploadManifest(manifest, wallet);

        if (manifestId) {
            console.log('\n=== Upload Summary ===');
            console.log(`Files uploaded: ${Object.keys(manifest.paths).length}`);
            console.log(`Manifest ID: ${manifestId}`);
            console.log(`Base URL: https://arweave.net/${manifestId}/`);
            console.log('\nFile access examples:');
            Object.keys(manifest.paths).slice(0, 5).forEach(path => {
                console.log(`  ${path} -> https://arweave.net/${manifestId}/${path}`);
            });

            // Save manifest locally for reference
            fs.writeFileSync(`manifest-${manifestId}.json`, JSON.stringify(manifest, null, 2));
            console.log(`\nManifest saved locally as: manifest-${manifestId}.json`);
        }

    } catch (error) {
        console.error('Upload failed:', error.message);
        process.exit(1);
    }
}

// CLI usage
if (require.main === module) {
    const folderPath = process.argv[2];
    if (!folderPath) {
        console.log('Usage: node arweave-folder-uploader.js <folder-path>');
        console.log('Example: node arweave-folder-uploader.js ./public');
        process.exit(1);
    }

    uploadFolder(folderPath);
}

module.exports = { uploadFolder, createManifest, uploadManifest };
