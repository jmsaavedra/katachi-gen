const http = require('http');

// Test data
const testData = {
    "walletAddress":"0x1234567890abcdef",
    "seed2":`${Math.floor(Math.random() * 1000)}`,
    "images":[
        {"url":"https://exonemo.com/test/katachi-gen/images/aventurine.avif"},
        {"url":"https://exonemo.com/test/katachi-gen/images/infinitegarden.webp"},
        {"url":"https://exonemo.com/test/katachi-gen/images/gmmoney-die.webp"},
        {"url":"https://exonemo.com/test/katachi-gen/images/ocote-tekno.gif"},
        {"url":"https://exonemo.com/test/katachi-gen/images/karborn.webp"}
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
            
            if (response.thumbnailId) {
                console.log('Thumbnail ID:', response.thumbnailId);
                console.log('Thumbnail URL:', response.thumbnailUrl);
            }
            
            if (response.htmlId) {
                console.log('HTML ID:', response.htmlId);
                console.log('HTML URL:', response.htmlUrl);
            }
            
            // Backwards compatibility
            if (response.txId) {
                console.log('Transaction ID:', response.txId);
            }
            
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
