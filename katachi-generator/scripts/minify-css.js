#!/usr/bin/env node

/**
 * CSS Minification Script
 * Minifies main.css to main.min.css
 */

const fs = require('fs');
const path = require('path');
const CleanCSS = require('clean-css');

console.log('\n🎨 Minifying CSS Files\n');
console.log('='.repeat(60) + '\n');

const publicCssDir = path.join(__dirname, '../public/css');
const inputFile = path.join(publicCssDir, 'main.css');
const outputFile = path.join(publicCssDir, 'main.min.css');

try {
    // Read the CSS file
    const css = fs.readFileSync(inputFile, 'utf8');
    const originalSize = Buffer.byteLength(css, 'utf8');

    // Minify with CleanCSS
    const minified = new CleanCSS({
        level: 2, // Advanced optimizations
        format: false // No formatting (completely minified)
    }).minify(css);

    if (minified.errors.length > 0) {
        console.error('❌ Minification errors:');
        minified.errors.forEach(err => console.error('  ', err));
        process.exit(1);
    }

    // Write minified CSS
    fs.writeFileSync(outputFile, minified.styles, 'utf8');
    const minifiedSize = Buffer.byteLength(minified.styles, 'utf8');

    const reduction = ((1 - minifiedSize / originalSize) * 100).toFixed(1);

    console.log('📄 main.css');
    console.log(`  ✅ Created: main.min.css`);
    console.log(`  📊 Size: ${originalSize.toLocaleString()} → ${minifiedSize.toLocaleString()} bytes (${reduction}% reduction)`);

    if (minified.warnings.length > 0) {
        console.log('  ⚠️ Warnings:');
        minified.warnings.forEach(warn => console.log('    ', warn));
    }

    console.log('\n' + '='.repeat(60) + '\n');
    console.log('✨ CSS Minification Complete!\n');

} catch (error) {
    console.error('❌ Error minifying CSS:', error.message);
    process.exit(1);
}
