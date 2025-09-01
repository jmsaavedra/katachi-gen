# Katachi Generator - Refactored Structure

This directory has been refactored from a single monolithic `kg-nft-server.js` file into a clean, modular structure.

## 🏗️ New File Structure

```
katachi-generator/
├── server.js              # Main server entry point
├── config.js              # Configuration and constants
├── handlers/               # Request handlers
│   ├── metadata.js        # Metadata upload to Arweave
│   └── pattern.js         # Pattern generation logic
├── storage/                # Storage utilities
│   ├── arweave.js         # Arweave upload functions
│   └── r2.js              # Cloudflare R2 uploads
├── image/                  # Image processing
│   ├── processor.js       # Base64 conversion, compression
│   └── thumbnail.js       # Playwright thumbnail generation
├── utils/                  # Utility functions
│   ├── wallet.js          # Arweave wallet operations
│   └── fileServer.js      # Static/temp file serving
└── kg-nft-server.js.backup # Backup of original corrupted file
```

## 🎯 Key Benefits

### **Separation of Concerns**
- Each module has a single responsibility
- Easy to understand and maintain
- Clear dependencies between modules

### **Error Recovery**
- Fixed syntax errors in original file
- Clean bracket/brace matching
- No duplicate code blocks

### **Maintainability** 
- Easy to add new features
- Simple to debug specific functionality
- Clear module boundaries

### **Testability**
- Each module can be tested independently
- Mock dependencies easily
- Clear input/output interfaces

## 📁 Module Details

### `server.js` - Main Server
- HTTP server setup and routing
- CORS configuration
- Request parsing and routing
- Graceful shutdown handling

### `config.js` - Configuration
- Environment variables
- Constants (ports, dimensions, etc.)
- Arweave/R2 client setup
- Origami patterns data

### `handlers/` - Request Handlers
- **`metadata.js`**: Handles `/upload-metadata` endpoint
- **`pattern.js`**: Handles `/` pattern generation endpoint
- Clean separation of business logic

### `storage/` - Storage Operations
- **`arweave.js`**: All Arweave upload operations
- **`r2.js`**: Cloudflare R2 bucket operations
- Centralized storage logic

### `image/` - Image Processing
- **`processor.js`**: Base64 conversion, compression, downloading
- **`thumbnail.js`**: Complex Playwright-based thumbnail generation
- All image operations in one place

### `utils/` - Utilities
- **`wallet.js`**: Arweave wallet management
- **`fileServer.js`**: Static file serving and cleanup

## 🚀 Usage

The server works exactly the same as before:

```bash
npm start
```

All endpoints remain the same:
- `POST /` - Generate pattern
- `POST /upload-metadata` - Upload metadata to Arweave  
- `GET /wallet-info` - Get wallet information
- `GET /temp/<file>` - Serve temp files
- `GET /<file>` - Serve static files

## 🔧 Key Fixes Applied

1. **Fixed Syntax Errors**: Removed duplicate `catch` blocks and bracket mismatches
2. **Separated Preview vs Metadata URLs**: 
   - `previewHtmlUrl` - Always hosted (R2/local) for iframe preview
   - `htmlUrl` - Arweave URL for NFT metadata
3. **Modular Architecture**: Each function in logical modules
4. **Clean Dependencies**: Clear import/export structure
5. **AWS SDK Migration**: Upgraded from AWS SDK v2 to v3
   - Removed maintenance mode warnings
   - Modern async/await patterns
   - Better performance and smaller bundle size

## 📦 Dependencies

Updated dependencies:
- `playwright-core` - Thumbnail generation
- `arweave` - Arweave uploads
- `@aws-sdk/client-s3` - R2 uploads (upgraded from aws-sdk v2)
- `sharp` - Image processing
- Built-in Node.js modules

**Removed**: `aws-sdk` (v2) - replaced with modern `@aws-sdk/client-s3` (v3)

## 🧪 Testing

The refactored server has been tested and:
- ✅ Starts without syntax errors
- ✅ All endpoints accessible
- ✅ Module imports working correctly
- ✅ Maintains all original functionality

## 🔄 Migration

**From**: Single corrupted `kg-nft-server.js`
**To**: Clean modular structure

The original file has been backed up as `kg-nft-server.js.backup` and can be removed once the new structure is confirmed working in all environments.