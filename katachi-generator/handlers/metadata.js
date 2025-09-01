// Metadata upload handler
const { uploadMetadataToArweave } = require('../storage/arweave');

/**
 * Handle metadata upload to Arweave
 */
async function handleMetadataUpload(req, res, data) {
    try {
        // Validate required fields
        if (!data.metadataJson || !data.tokenId) {
            res.setHeader('Content-Type', 'application/json');
            res.writeHead(400);
            res.end(JSON.stringify({
                success: false,
                error: 'Missing required fields: metadataJson and tokenId are required'
            }));
            return;
        }

        console.log('🔧 [METADATA UPLOAD] Processing request:', {
            tokenId: data.tokenId,
            metadataName: data.metadataJson?.name || 'Unknown',
            metadataSize: JSON.stringify(data.metadataJson).length
        });

        // Upload metadata JSON to Arweave
        const { arweaveId, arweaveUrl } = await uploadMetadataToArweave(data.metadataJson);

        console.log('✅ [METADATA UPLOAD] Success:', {
            tokenId: data.tokenId,
            arweaveId,
            arweaveUrl,
            size: JSON.stringify(data.metadataJson).length
        });

        // Send success response
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify({
            success: true,
            tokenId: data.tokenId,
            arweaveId,
            arweaveUrl,
            message: 'Metadata uploaded to Arweave successfully'
        }));

    } catch (error) {
        console.error('❌ [METADATA UPLOAD] Error:', error);
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(500);
        res.end(JSON.stringify({
            success: false,
            error: 'Failed to upload metadata to Arweave',
            details: error.message
        }));
    }
}

module.exports = {
    handleMetadataUpload
};