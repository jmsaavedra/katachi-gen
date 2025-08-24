# Arweave File Uploader

このスクリプトは、指定されたArweaveウォレットキーファイルを使用して、任意のファイルをArweaveネットワークにアップロードします。

## 必要な依存関係

```bash
npm install arweave
```

## 使用方法

### コマンドラインから直接実行

```bash
# 基本的な使用法
node arweave-uploader.js <ファイルパス>

# 例：JSONファイルをアップロード
node arweave-uploader.js ./data.json

# 例：画像ファイルをアップロード
node arweave-uploader.js ./thumbnails/thumbnail_123.png

# 例：HTMLファイルをアップロード
node arweave-uploader.js ./public/template.html
```

### Node.jsモジュールとして使用

```javascript
const uploader = require('./arweave-uploader');

async function uploadFile() {
    try {
        const transactionId = await uploader.uploadFileToArweave(
            './my-file.txt',
            '../keys/GFgK-XvXL1L-4uoY0W2b1X7BfzpC2fwqOdoFC4WgFiE.json'
        );
        
        console.log('Upload successful:', transactionId);
        console.log('URL:', `https://arweave.net/${transactionId}`);
    } catch (error) {
        console.error('Upload failed:', error);
    }
}

uploadFile();
```

## 機能

- **ファイルアップロード**: 任意のファイルタイプをArweaveにアップロード
- **自動コンテンツタイプ検出**: ファイル拡張子に基づいてContent-Typeを自動設定
- **ウォレット残高確認**: アップロード前に残高とコストを確認
- **トランザクション状態確認**: アップロード後の状態チェック
- **エラーハンドリング**: 詳細なエラー情報とガイダンス

## 出力情報

スクリプトは以下の情報を表示します：

- ウォレットアドレス
- ウォレット残高
- ファイルサイズ
- アップロードコスト
- トランザクションID
- ArweaveURL

## テスト

```bash
# テストスクリプトを実行
node test-arweave-upload.js

# ウォレット情報のみ確認
node -e "require('./arweave-uploader').getWalletAddress('../keys/GFgK-XvXL1L-4uoY0W2b1X7BfzpC2fwqOdoFC4WgFiE.json').then(console.log)"
```

## サポートファイルタイプ

- HTML (.html)
- CSS (.css) 
- JavaScript (.js)
- JSON (.json)
- 画像ファイル (.png, .jpg, .jpeg, .gif, .svg)
- テキストファイル (.txt)
- その他のファイル (application/octet-stream)

## 注意事項

1. **ウォレット残高**: アップロード前に十分なAR残高があることを確認してください
2. **ファイルサイズ**: 大きなファイルほど高いコストがかかります
3. **永続性**: Arweaveにアップロードされたデータは永続的に保存されます
4. **キーファイル**: ウォレットキーファイルは安全に管理してください

## エラー対処

- `File not found`: ファイルパスを確認してください
- `Wallet file not found`: ウォレットキーファイルのパスを確認してください
- `Insufficient balance`: ウォレットにARを追加してください
- `Upload failed`: ネットワーク接続とArweaveサービス状態を確認してください
