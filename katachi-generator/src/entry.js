// シンプルなエントリーポイント - アプリの初期化のみ
console.log('Origami App bundle loaded');

// アプリケーション初期化関数
function initOrigamiApp() {
    console.log('Initializing Origami App...');
    
    // ローディング画面を非表示にする関数
    window.hideLoadingScreen = function() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    };
    
    // その他の初期化ロジックをここに追加
}

// DOMが読み込まれたら初期化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOrigamiApp);
} else {
    initOrigamiApp();
}

// グローバルに関数をエクスポート
window.OrigamiApp = {
    init: initOrigamiApp
};
