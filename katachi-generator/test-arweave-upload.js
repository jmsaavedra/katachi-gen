#!/usr/bin/env node

// Test script for the Arweave uploader
const path = require('path');
const fs = require('fs');
const uploader = require('./arweave-uploader');

async function testUploader() {
    try {
        // Create a test file for upload
        const testContent = JSON.stringify({
            message: "Test upload from Katachi Generator",
            timestamp: new Date().toISOString(),
            data: {
                type: "test",
                version: "1.0.0"
            }
        }, null, 2);
        
        const testFilePath = path.join(__dirname, 'test-upload.json');
        fs.writeFileSync(testFilePath, testContent);
        
        console.log('Created test file:', testFilePath);
        console.log('Test file content:');
        console.log(testContent);
        console.log('\n=== Starting Upload Test ===');
        
        // Upload the test file
        const transactionId = await uploader.uploadFileToArweave(
            testFilePath, 
            '../keys/GFgK-XvXL1L-4uoY0W2b1X7BfzpC2fwqOdoFC4WgFiE.json'
        );
        
        console.log('\n=== Test Completed Successfully ===');
        console.log(`Transaction ID: ${transactionId}`);
        console.log(`View at: https://arweave.net/${transactionId}`);
        
        // Clean up test file
        fs.unlinkSync(testFilePath);
        console.log('Test file cleaned up');
        
    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

// Also test wallet info
async function testWalletInfo() {
    try {
        console.log('\n=== Wallet Information ===');
        
        const walletAddress = await uploader.getWalletAddress('../keys/GFgK-XvXL1L-4uoY0W2b1X7BfzpC2fwqOdoFC4WgFiE.json');
        console.log(`Wallet Address: ${walletAddress}`);
        
        const balance = await uploader.getWalletBalance(walletAddress);
        console.log(`Balance: ${balance.ar} AR (${balance.winston} winston)`);
        
    } catch (error) {
        console.error('Wallet info test failed:', error.message);
    }
}

// Run tests
async function runTests() {
    console.log('=== Arweave Uploader Test Suite ===\n');
    
    // Test wallet info first
    await testWalletInfo();
    
    // Then test file upload
    await testUploader();
}

if (require.main === module) {
    runTests().catch(console.error);
}
