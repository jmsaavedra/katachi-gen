// メインエントリーポイント - すべてのローカルJSファイルをまとめる

// 基本ライブラリ（ローカルファイル）
import '../public/js/TrackballControls.js';
import '../public/js/underscore-min.js';
import '../public/js/SVGLoader.js';
import '../public/js/earcut.js';
import '../public/js/fold.js';
import '../public/js/WebVR.js';

// 動的ソルバー関連
import '../public/js/dynamic/GLBoilerplate.js';
import '../public/js/dynamic/GPUMath.js';

// アプリケーション固有のモジュール
import '../public/js/controls.js';
import '../public/js/threeView.js';
import '../public/js/globals.js';
import '../public/js/node.js';
import '../public/js/beam.js';
import '../public/js/crease.js';
import '../public/js/model.js';
import '../public/js/3dUI.js';
import '../public/js/staticSolver.js';
import '../public/js/dynamic/dynamicSolver.js';
import '../public/js/rigidSolver.js';
import '../public/js/pattern.js';
import '../public/js/saveSTL.js';
import '../public/js/saveFOLD.js';
import '../public/js/cellColorizer.js';
import '../public/js/importer.js';
import '../public/js/VRInterface.js';
import '../public/js/videoAnimator.js';
import '../public/js/curvedFolding.js';

// 初期化関数
function initializeApp() {
    console.log('OrigamiApp initialized');
    
    // メインの初期化ロジックをここに追加
    if (typeof initOrigami === 'function') {
        initOrigami();
    }
}

// DOMが読み込まれたら初期化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// グローバルスコープに必要な関数をエクスポート
window.OrigamiApp = {
    init: initializeApp
};
