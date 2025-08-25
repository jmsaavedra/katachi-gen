# Arweave Folder Uploader

このスクリプトは、フォルダ全体をArweaveにアップロードし、manifestを作成して各ファイルに同じファイル名でアクセスできるようにします。

## 機能

- フォルダ内の全ファイルを再帰的にArweaveにアップロード
- 各ファイルに適切なContent-Typeを設定
- manifestを作成してファイルパスでアクセス可能にする
- アップロード進捗の表示
- ローカルにmanifestのバックアップを保存

## 必要な準備

1. Arweaveウォレットファイル（`arweave-key.json`）をスクリプトと同じディレクトリに配置
2. ウォレットに十分なARトークンがあること
3. 必要な依存関係のインストール：
   ```bash
   npm install arweave mime-types
   ```

## 使用方法

### コマンドライン
```bash
node arweave-folder-uploader.js <フォルダパス>
```

### 例
```bash
# publicフォルダをアップロード
node arweave-folder-uploader.js ./public

# 現在のディレクトリをアップロード
node arweave-folder-uploader.js .

# 相対パスでのアップロード
node arweave-folder-uploader.js ../my-website
```

### プログラムでの使用
```javascript
const { uploadFolder } = require('./arweave-folder-uploader');

async function main() {
    try {
        await uploadFolder('./public');
        console.log('Upload completed!');
    } catch (error) {
        console.error('Upload failed:', error);
    }
}

main();
```

## 出力例

```
Starting upload of folder: ./public
Wallet address: 1234...abcd
Wallet balance: 0.5 AR
Found 15 files to upload...
✓ Uploaded index.html - TX: abc123...
✓ Uploaded css/main.css - TX: def456...
✓ Uploaded js/app.js - TX: ghi789...
...

Manifest uploaded successfully!
Manifest TX ID: xyz789...
Access your files at: https://arweave.net/xyz789.../[filename]
For example: https://arweave.net/xyz789.../index.html

=== Upload Summary ===
Files uploaded: 15
Manifest ID: xyz789...
Base URL: https://arweave.net/xyz789.../

File access examples:
  index.html -> https://arweave.net/xyz789.../index.html
  css/main.css -> https://arweave.net/xyz789.../css/main.css
  js/app.js -> https://arweave.net/xyz789.../js/app.js

Manifest saved locally as: manifest-xyz789....json
```

## ファイルアクセス

アップロード完了後、以下のようにファイルにアクセスできます：

- `https://arweave.net/<manifest-id>/index.html`
- `https://arweave.net/<manifest-id>/css/main.css`
- `https://arweave.net/<manifest-id>/images/logo.png`
- `https://arweave.net/<manifest-id>/js/app.js`

## 注意事項

1. **コスト**: 各ファイルは個別のトランザクションとしてアップロードされるため、ファイル数に応じてARトークンが必要です
2. **時間**: 大量のファイルの場合、アップロードに時間がかかります（レート制限回避のため1秒間隔）
3. **永続性**: Arweaveにアップロードされたデータは永続的で削除できません
4. **ファイルサイズ**: 大きなファイルの場合、追加のARトークンが必要になる場合があります

## トラブルシューティング

### ウォレットファイルが見つからない
```
Error: Wallet file not found. Please ensure arweave-key.json exists in the current directory.
```
→ `arweave-key.json`ファイルをスクリプトと同じディレクトリに配置してください

### 残高不足
```
Error: Wallet has no AR balance. Please fund your wallet.
```
→ ウォレットにARトークンを追加してください

### アップロード失敗
個別のファイルアップロードが失敗した場合でも、スクリプトは続行します。最終的にアップロードされたファイルのみがmanifestに含まれます。

## 設定のカスタマイズ

スクリプト内の以下の値を変更できます：

- `host`: Arweaveノードのホスト（デフォルト: 'arweave.net'）
- `port`: ポート番号（デフォルト: 443）
- `protocol`: プロトコル（デフォルト: 'https'）
- アップロード間隔（デフォルト: 1000ms）
