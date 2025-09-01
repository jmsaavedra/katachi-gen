// Cloudflare R2 storage utilities
const fs = require('fs');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// Validate R2 credentials
function validateR2Credentials() {
    const required = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_ACCESS_KEY_SECRET'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        console.warn(`⚠️ R2 credentials missing: ${missing.join(', ')}`);
        return false;
    }
    return true;
}

// Create R2 client only if credentials are available
let r2Client = null;
if (validateR2Credentials()) {
    const endpoint = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    r2Client = new S3Client({
        endpoint: endpoint,
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID,
            secretAccessKey: process.env.R2_ACCESS_KEY_SECRET,
        },
        region: 'auto',
    });
    console.log('✅ R2 client initialized successfully');
    console.log('🔗 R2 endpoint:', endpoint);
} else {
    console.warn('⚠️ R2 client not initialized - missing credentials');
}

/**
 * Upload file to Cloudflare R2
 */
async function uploadToR2(filePath, fileName, contentType = 'text/html') {
    // Skip R2 upload if client is not available
    if (!r2Client) {
        console.warn('⚠️ R2 upload skipped - client not available');
        return null;
    }
    
    try {
        const fileContent = fs.readFileSync(filePath);
        const bucketName = process.env.R2_BUCKET_NAME || 'katachi-gen';
        const uploadCommand = new PutObjectCommand({
            Bucket: bucketName,
            Key: fileName,
            Body: fileContent,
            ContentType: contentType,
            // Note: R2 doesn't support ACL in the same way as S3
            // Public access is configured at bucket level
        });

        await r2Client.send(uploadCommand);
        const publicUrl = process.env.R2_PUBLIC_URL 
            ? `${process.env.R2_PUBLIC_URL}/${fileName}`
            : `https://storage.katachi-gen.com/${fileName}`;
        
        console.log('📁 Uploaded to R2:', publicUrl);
        return publicUrl;
    } catch (error) {
        console.error('❌ R2 upload failed:', error.message);
        return null;
    }
}

module.exports = {
    uploadToR2
};