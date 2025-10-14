#!/usr/bin/env node

/**
 * Minify JavaScript Libraries
 *
 * This script minifies all non-minified JavaScript files in public/js/
 * that are included in the generated HTML templates.
 */

const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

// Paths
const PUBLIC_JS_DIR = path.join(__dirname, '..', 'public', 'js');

// Files to minify (based on what's loaded in libraries.ejs and simulation.ejs)
const FILES_TO_MINIFY = [
    // From libraries.ejs
    'TrackballControls.js',
    'SVGLoader.js',
    'earcut.js',
    'fold.js',

    // From simulation.ejs (all the dynamic solver files)
    'dynamic/GLBoilerplate.js',
    'dynamic/GPUMath.js',
    'controls.js',
    'threeView.js',
    'globals.js',
    'node.js',
    'beam.js',
    'crease.js',
    'model.js',
    '3dUI.js',
    'staticSolver.js',
    'dynamic/dynamicSolver.js',
    'rigidSolver.js',
    'pattern.js',
    'saveSTL.js',
    'saveFOLD.js',
    'cellColorizer.js',
    'importer.js',
    'VRInterface.js',
    'videoAnimator.js',
    'curvedFolding.js',
    'main.js'
];

/**
 * Minify a single JavaScript file
 */
async function minifyJSFile(fileName) {
    const filePath = path.join(PUBLIC_JS_DIR, fileName);
    const minFileName = fileName.replace('.js', '.min.js');
    const minFilePath = path.join(PUBLIC_JS_DIR, minFileName);

    // Skip if already has a .min.js version
    if (fileName.includes('.min.js')) {
        return null;
    }

    // Skip if .min.js already exists
    if (fs.existsSync(minFilePath)) {
        console.log(`  ⏭️  Skipping: ${fileName} (minified version exists)`);
        return null;
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
        console.log(`  ⚠️  Not found: ${fileName}`);
        return null;
    }

    console.log(`\n📄 Processing: ${fileName}`);

    try {
        const code = fs.readFileSync(filePath, 'utf8');
        const originalSize = Buffer.byteLength(code, 'utf8');

        const result = await minify(code, {
            compress: {
                dead_code: true,
                drop_console: false, // Keep console logs for debugging
                drop_debugger: true,
                pure_funcs: [],
                passes: 2
            },
            mangle: {
                // Don't mangle certain names that might be referenced externally
                reserved: ['THREE', 'jQuery', '$', '_', 'FOLD', 'earcut']
            },
            format: {
                comments: false,
                semicolons: true
            }
        });

        if (result.code) {
            fs.writeFileSync(minFilePath, result.code, 'utf8');

            const minifiedSize = Buffer.byteLength(result.code, 'utf8');
            const reduction = ((1 - minifiedSize / originalSize) * 100).toFixed(1);

            console.log(`  ✅ Created: ${minFileName}`);
            console.log(`  📊 Size: ${originalSize.toLocaleString()} → ${minifiedSize.toLocaleString()} bytes (${reduction}% reduction)`);

            return { originalSize, minifiedSize, fileName };
        }
    } catch (err) {
        console.error(`  ❌ Error minifying ${fileName}: ${err.message}`);
        return null;
    }
}

/**
 * Main execution
 */
async function main() {
    console.log('🚀 Minifying JavaScript Libraries\n');
    console.log('='.repeat(60));

    let totalOriginal = 0;
    let totalMinified = 0;
    let successCount = 0;
    const results = [];

    for (const file of FILES_TO_MINIFY) {
        const result = await minifyJSFile(file);
        if (result) {
            totalOriginal += result.originalSize;
            totalMinified += result.minifiedSize;
            successCount++;
            results.push(result);
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`\n✨ Minification Complete!\n`);
    console.log(`📊 Summary:`);
    console.log(`   Files processed: ${successCount}/${FILES_TO_MINIFY.length}`);
    console.log(`   Total original:  ${totalOriginal.toLocaleString()} bytes (${(totalOriginal / 1024).toFixed(1)} KB)`);
    console.log(`   Total minified:  ${totalMinified.toLocaleString()} bytes (${(totalMinified / 1024).toFixed(1)} KB)`);
    console.log(`   Total reduction: ${((1 - totalMinified / totalOriginal) * 100).toFixed(1)}%`);

    if (results.length > 0) {
        console.log(`\n💡 Now update libraries.ejs and simulation.ejs to use .min.js files`);
    }

    console.log('');
}

main().catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
});
