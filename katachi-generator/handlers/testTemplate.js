// Test template generation handler
const { generateTestTemplate, generateNFTTemplate } = require('../utils/templateGenerator');

/**
 * Handle test template generation request
 */
async function handleTestTemplate(req, res) {
    try {
        console.log('🧪 Generating test template...');
        
        const testHtml = await generateTestTemplate();
        
        console.log(`✅ Test template generated successfully (${testHtml.length} bytes)`);
        
        // Send the HTML directly
        res.setHeader('Content-Type', 'text/html');
        res.writeHead(200);
        res.end(testHtml);
        
    } catch (error) {
        console.error('❌ Test template generation failed:', error);
        
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(500);
        res.end(JSON.stringify({
            success: false,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }));
    }
}

/**
 * Handle test API endpoint for JSON response
 */
async function handleTestAPI(req, res) {
    try {
        console.log('🧪 Testing modular template system...');
        
        const testData = {
            walletAddress: 'test-wallet-' + Date.now(),
            patternType: 'Crane',
            seed2: 'test-seed-' + Math.random().toString(36).substring(7),
            images: [
                {
                    name: 'test-image-1.jpg',
                    data: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAA'
                },
                {
                    name: 'test-image-2.jpg',
                    data: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAA'
                }
            ]
        };
        
        const startTime = Date.now();
        const html = await generateNFTTemplate(testData);
        const processingTime = Date.now() - startTime;
        
        console.log(`✅ Test completed in ${processingTime}ms`);
        
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify({
            success: true,
            message: 'Modular template system test completed successfully',
            stats: {
                processingTime: processingTime,
                htmlSize: html.length,
                templateVersion: '2.0-modular',
                patternType: testData.patternType,
                imageCount: testData.images.length
            },
            htmlPreview: html.substring(0, 500) + '...' // First 500 chars for preview
        }));
        
    } catch (error) {
        console.error('❌ Test API failed:', error);
        
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(500);
        res.end(JSON.stringify({
            success: false,
            error: error.message,
            templateVersion: '2.0-modular'
        }));
    }
}

module.exports = {
    handleTestTemplate,
    handleTestAPI
};