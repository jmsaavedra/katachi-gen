import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import copy from 'rollup-plugin-copy';

export default {
  input: 'src/entry.js', // 新しいシンプルなエントリーポイント
  output: {
    file: 'public/dist/app-bundle.js',
    format: 'iife', // ブラウザ用の即時実行関数形式
    name: 'OrigamiApp',
    sourcemap: true
  },
  plugins: [
    nodeResolve({
      browser: true,
      preferBuiltins: false
    }),
    commonjs({
      include: 'node_modules/**'
    }),
    copy({
      targets: [
        { src: 'public/css/**/*', dest: 'public/dist/css' },
        { src: 'public/assets/**/*', dest: 'public/dist/assets' },
        { src: 'public/textures/**/*', dest: 'public/dist/textures' },
        { src: 'public/svgs/**/*', dest: 'public/dist/svgs' },
        // JSファイルも個別にコピー（バンドルしない）
        { src: 'public/js/**/*', dest: 'public/dist/js' }
      ]
    }),
    // 本番環境では圧縮
    process.env.NODE_ENV === 'production' && terser()
  ].filter(Boolean)
};
