const http = require('http');

// Test data for thumbnail generation
const testData = {
    walletAddress: "0x1234567890abcdef",
    images: [
        { url: 'https://example.com/image1.png' },
        { url: 'https://example.com/image2.png' }
    ]
};

const postData = JSON.stringify(testData);

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

console.log('Sending test POST request for thumbnail generation...');

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log('Response received:');
        try {
            const response = JSON.parse(data);
            console.log('Success:', response.success);
            console.log('Message:', response.message);
            if (response.txId) {
                console.log('Transaction ID:', response.txId);
            }
            if (response.thumbnail) {
                console.log('Thumbnail filename:', response.thumbnail.filename);
                console.log('Thumbnail size:', response.thumbnail.data.length, 'characters (base64)');
            }
            if (response.error) {
                console.log('Error:', response.error);
            }
        } catch (error) {
            console.log('Raw response:', data);
            console.error('Failed to parse JSON response:', error);
        }
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

// Send the request
req.write(postData);
req.end();
