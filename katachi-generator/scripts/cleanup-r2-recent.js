#!/usr/bin/env node

/**
 * R2 Recent Files Cleanup Script
 * Deletes files uploaded to R2 in the last 12 hours
 *
 * Usage:
 *   node scripts/cleanup-r2-recent.js [--hours=12] [--dry-run]
 *
 * Options:
 *   --hours=N    Delete files from last N hours (default: 12)
 *   --dry-run    Show what would be deleted without actually deleting
 *
 * Environment variables required:
 *   R2_ACCOUNT_ID
 *   R2_ACCESS_KEY_ID
 *   R2_ACCESS_KEY_SECRET
 *   R2_BUCKET_NAME (optional, defaults to 'katachi-gen')
 */

const { S3Client, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');

// Parse command line arguments
const args = process.argv.slice(2);
const hoursArg = args.find(arg => arg.startsWith('--hours='));
const isDryRun = args.includes('--dry-run');
const hoursToDelete = hoursArg ? parseInt(hoursArg.split('=')[1]) : 12;

console.log('\n🧹 R2 Recent Files Cleanup Script');
console.log('='.repeat(60));
console.log(`⏰ Deleting files from last ${hoursToDelete} hours`);
console.log(`🔍 Mode: ${isDryRun ? 'DRY RUN (no actual deletion)' : 'LIVE DELETION'}`);
console.log('='.repeat(60) + '\n');

// Validate R2 credentials
function validateR2Credentials() {
    const required = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_ACCESS_KEY_SECRET'];
    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
        console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
        console.error('\nPlease set the following in your .env file:');
        console.error('  R2_ACCOUNT_ID=your_account_id');
        console.error('  R2_ACCESS_KEY_ID=your_access_key_id');
        console.error('  R2_ACCESS_KEY_SECRET=your_secret_access_key');
        console.error('  R2_BUCKET_NAME=katachi-gen (optional)');
        process.exit(1);
    }
    return true;
}

// Create R2 client
function createR2Client() {
    const endpoint = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    return new S3Client({
        endpoint: endpoint,
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID,
            secretAccessKey: process.env.R2_ACCESS_KEY_SECRET,
        },
        region: 'auto',
    });
}

// List all objects in R2 bucket
async function listAllObjects(client, bucketName) {
    const objects = [];
    let continuationToken = null;

    do {
        const command = new ListObjectsV2Command({
            Bucket: bucketName,
            ContinuationToken: continuationToken,
        });

        const response = await client.send(command);

        if (response.Contents) {
            objects.push(...response.Contents);
        }

        continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return objects;
}

// Delete a single object
async function deleteObject(client, bucketName, key, isDryRun) {
    if (isDryRun) {
        console.log(`  [DRY RUN] Would delete: ${key}`);
        return true;
    }

    try {
        const command = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: key,
        });

        await client.send(command);
        console.log(`  ✅ Deleted: ${key}`);
        return true;
    } catch (error) {
        console.error(`  ❌ Failed to delete ${key}:`, error.message);
        return false;
    }
}

// Format file size
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Format date
function formatDate(date) {
    return date.toISOString().replace('T', ' ').split('.')[0];
}

// Main cleanup function
async function cleanup() {
    // Validate credentials
    if (!validateR2Credentials()) {
        return;
    }

    // Create client
    const client = createR2Client();
    const bucketName = process.env.R2_BUCKET_NAME || 'katachi-gen';

    console.log(`📦 Bucket: ${bucketName}`);
    console.log(`🔗 Endpoint: https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com\n`);

    // Calculate cutoff time
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - hoursToDelete * 60 * 60 * 1000);

    console.log(`🕐 Current time: ${formatDate(now)}`);
    console.log(`⏰ Cutoff time:  ${formatDate(cutoffTime)}`);
    console.log(`🔍 Deleting files uploaded after cutoff time\n`);

    // List all objects
    console.log('📋 Listing all objects in bucket...\n');
    const allObjects = await listAllObjects(client, bucketName);

    console.log(`📊 Total objects in bucket: ${allObjects.length}\n`);

    // Filter objects by time
    const recentObjects = allObjects.filter(obj => {
        return obj.LastModified && new Date(obj.LastModified) > cutoffTime;
    });

    if (recentObjects.length === 0) {
        console.log('✅ No recent files found to delete.');
        console.log(`   All files in bucket are older than ${hoursToDelete} hours.\n`);
        return;
    }

    // Calculate total size
    const totalSize = recentObjects.reduce((sum, obj) => sum + (obj.Size || 0), 0);

    console.log('🎯 Recent files to delete:');
    console.log(`   Count: ${recentObjects.length}`);
    console.log(`   Total size: ${formatBytes(totalSize)}\n`);

    // Show list of files
    console.log('📝 Files:');
    recentObjects.sort((a, b) => new Date(b.LastModified) - new Date(a.LastModified));
    recentObjects.forEach((obj, index) => {
        const age = Math.round((now - new Date(obj.LastModified)) / 1000 / 60); // minutes
        console.log(`   ${index + 1}. ${obj.Key}`);
        console.log(`      Size: ${formatBytes(obj.Size || 0)}, Age: ${age} minutes ago`);
    });
    console.log('');

    // Confirm deletion (unless dry run)
    if (!isDryRun) {
        console.log('⚠️  WARNING: This will PERMANENTLY DELETE the files listed above!');
        console.log('   Press Ctrl+C now to cancel, or wait 5 seconds to proceed...\n');

        await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Delete objects
    console.log(`🗑️  ${isDryRun ? 'Simulating deletion' : 'Deleting files'}...\n`);

    let successCount = 0;
    let failCount = 0;

    for (const obj of recentObjects) {
        const success = await deleteObject(client, bucketName, obj.Key, isDryRun);
        if (success) {
            successCount++;
        } else {
            failCount++;
        }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Cleanup Summary:');
    console.log(`   Total files processed: ${recentObjects.length}`);
    if (isDryRun) {
        console.log(`   Files that would be deleted: ${successCount}`);
    } else {
        console.log(`   Successfully deleted: ${successCount}`);
        console.log(`   Failed to delete: ${failCount}`);
        console.log(`   Space freed: ${formatBytes(totalSize)}`);
    }
    console.log('='.repeat(60) + '\n');

    if (isDryRun) {
        console.log('💡 This was a dry run. No files were actually deleted.');
        console.log('   Run without --dry-run to perform actual deletion.\n');
    } else if (successCount > 0) {
        console.log('✅ Cleanup completed successfully!\n');
    }
}

// Run the cleanup
cleanup().catch(error => {
    console.error('\n❌ Error during cleanup:', error.message);
    console.error(error.stack);
    process.exit(1);
});
