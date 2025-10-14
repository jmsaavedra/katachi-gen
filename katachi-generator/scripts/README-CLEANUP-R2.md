# R2 Cleanup Script

Delete files from Cloudflare R2 storage that were uploaded recently.

## Quick Start

### 1. Dry Run (Safe - Shows What Would Be Deleted)
```bash
npm run cleanup:r2:dry-run
```

### 2. Delete Files from Last 12 Hours
```bash
npm run cleanup:r2
```

### 3. Delete Files from Last 24 Hours
```bash
node scripts/cleanup-r2-recent.js --hours=24
```

### 4. Delete Files from Last 1 Hour
```bash
node scripts/cleanup-r2-recent.js --hours=1
```

## Options

- `--hours=N` - Delete files from last N hours (default: 12)
- `--dry-run` - Show what would be deleted without actually deleting

## Environment Variables Required

Make sure these are set in your `.env` file:

```bash
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_ACCESS_KEY_SECRET=your_secret_access_key
R2_BUCKET_NAME=katachi-gen  # optional, defaults to 'katachi-gen'
```

## Examples

### Test Mode (No Deletion)
Always run a dry run first to see what will be deleted:
```bash
npm run cleanup:r2:dry-run
```

Example output:
```
🧹 R2 Recent Files Cleanup Script
============================================================
⏰ Deleting files from last 12 hours
🔍 Mode: DRY RUN (no actual deletion)
============================================================

📦 Bucket: katachi-gen
🔗 Endpoint: https://xxxxx.r2.cloudflarestorage.com

🕐 Current time: 2025-10-14 17:30:00
⏰ Cutoff time:  2025-10-14 05:30:00
🔍 Deleting files uploaded after cutoff time

📋 Listing all objects in bucket...
📊 Total objects in bucket: 45

🎯 Recent files to delete:
   Count: 12
   Total size: 24.5 MB

📝 Files:
   1. html/kg_crane-0x123...html
      Size: 2.1 MB, Age: 5 minutes ago
   2. html/kg_pinwheel-0x456...html
      Size: 2.3 MB, Age: 15 minutes ago
   ...

💡 This was a dry run. No files were actually deleted.
   Run without --dry-run to perform actual deletion.
```

### Delete Files from Testing
Delete all files from last hour during active testing:
```bash
node scripts/cleanup-r2-recent.js --hours=1
```

### Clean Up Recent Uploads
Delete all uploads from last 12 hours:
```bash
npm run cleanup:r2
```

## Safety Features

1. **5 Second Warning** - Script waits 5 seconds before deletion (press Ctrl+C to cancel)
2. **Dry Run Mode** - Always test first with `--dry-run`
3. **Detailed Logging** - See exactly what will be deleted
4. **Time-based Filter** - Only deletes files newer than cutoff time
5. **Confirmation Required** - Must wait through countdown

## Use Cases

### During Development
Clean up test files frequently:
```bash
# Delete files from last hour
node scripts/cleanup-r2-recent.js --hours=1
```

### After Testing Session
Clean up all test uploads:
```bash
# Delete files from last 24 hours
node scripts/cleanup-r2-recent.js --hours=24
```

### Before Going Live
Remove all development files:
```bash
# Check what would be deleted
npm run cleanup:r2:dry-run

# If looks good, delete them
npm run cleanup:r2
```

## Script Behavior

1. **Lists all objects** in the R2 bucket
2. **Filters by upload time** - keeps only files newer than cutoff
3. **Shows file details** - name, size, age
4. **Calculates total size** to be deleted
5. **Waits for confirmation** (unless dry-run)
6. **Deletes files one by one** with progress logging
7. **Shows summary** - success/fail counts, space freed

## Troubleshooting

### "Missing required environment variables"
Make sure your `.env` file contains all required R2 credentials.

### "Access Denied" errors
Check that your R2 API token has `Object Delete` permissions.

### Script times out
If you have many files, the script may take a while. This is normal - it processes files one at a time.

### No files found
If the script reports no files to delete, all files in your bucket are older than the specified hours.

## Warning

⚠️ **PERMANENT DELETION** - Files deleted from R2 cannot be recovered. Always run with `--dry-run` first to verify what will be deleted.
