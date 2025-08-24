const http = require('http');

// Test data
const testData = {
    walletAddress: "0x1234567890abcdef1234567890abcdef12345678",
    images: [
        {url: 'https://example.com/image1.png'},
        {url: 'https://example.com/image2.png'},
        {url: 'https://example.com/image3.png'}
    ]
};

const postData = JSON.stringify(testData);

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

console.log('Sending test request...');

const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        try {
            const response = JSON.parse(data);
            console.log('Response received:');
            console.log('Success:', response.success);
            console.log('Message:', response.message);
            console.log('Transaction ID:', response.txId);
            
            if (response.thumbnail) {
                console.log('Thumbnail generated:', response.thumbnail.filename);
                console.log('Thumbnail size:', response.thumbnail.data.length, 'bytes (base64)');
            }
        } catch (error) {
            console.error('Error parsing response:', error);
            console.log('Raw response:', data);
        }
    });
});

req.on('error', (error) => {
    console.error('Request error:', error);
});

req.write(postData);
req.end();
