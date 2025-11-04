#!/usr/bin/env node

/**
 * Minify EJS Partials
 *
 * This script creates minified versions of all EJS partials containing
 * JavaScript and CSS. It keeps the original files intact and creates
 * .min.ejs versions for production use.
 */

const fs = require('fs');
const path = require('path');
const { minify: terserMinify } = require('terser');

// Paths
const PARTIALS_DIR = path.join(__dirname, '..', 'src', 'template', 'partials');

// Files to minify (relative to partials directory)
const FILES_TO_MINIFY = [
    // Styles
    'styles/custom.ejs',
    'styles/animations.ejs',

    // Scripts
    'scripts/shaders.ejs',
    'scripts/libraries.ejs',
    'scripts/simulation.ejs',
    'scripts/origami.ejs',
    'scripts/interactions.ejs',
    'ui-controls.ejs',

    // Head (contains initialization JavaScript)
    'head.ejs',

    // Origami Pattern Files (contain pattern definitions)
    'patterns/airplane.ejs',
    'patterns/crane.ejs',
    'patterns/hypar.ejs',
    'patterns/pinwheel.ejs',
    'patterns/flower.ejs'
];

/**
 * Minify JavaScript content within script tags
 */
async function minifyScriptTags(content) {
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let result = content;
    let match;

    const matches = [];
    while ((match = scriptRegex.exec(content)) !== null) {
        matches.push({
            fullMatch: match[0],
            code: match[1],
            index: match.index
        });
    }

    // Process matches in reverse order to maintain indices
    for (let i = matches.length - 1; i >= 0; i--) {
        const m = matches[i];

        // Skip empty scripts
        if (!m.code.trim()) continue;

        // Skip shader scripts (they need exact formatting)
        if (m.fullMatch.includes('x-shader')) continue;

        let codeToMinify = m.code;
        const ejsPlaceholders = [];

        // If code contains EJS tags, temporarily replace them with placeholders
        if (m.code.includes('<%') || m.code.includes('%>')) {
            const ejsRegex = /<%[\s\S]*?%>/g;
            let ejsMatch;
            let placeholderIndex = 0;

            while ((ejsMatch = ejsRegex.exec(m.code)) !== null) {
                const placeholder = `__EJS_PLACEHOLDER_${placeholderIndex}__`;
                ejsPlaceholders.push({
                    placeholder: placeholder,
                    original: ejsMatch[0]
                });
                codeToMinify = codeToMinify.replace(ejsMatch[0], placeholder);
                placeholderIndex++;
            }
        }

        try {
            const minified = await terserMinify(codeToMinify, {
                compress: {
                    dead_code: true,
                    drop_console: false, // Keep console.error/warn/info
                    drop_debugger: true,
                    pure_funcs: ['console.log'] // Only drop console.log calls (keeps info/warn/error)
                },
                mangle: false, // Don't mangle names to preserve functionality
                format: {
                    comments: false,
                    semicolons: true,
                    quote_style: 3 // Preserve original quotes (including backticks)
                }
            });

            if (minified.code) {
                let finalCode = minified.code;

                // Restore EJS placeholders
                ejsPlaceholders.forEach(({ placeholder, original }) => {
                    finalCode = finalCode.replace(placeholder, original);
                });

                // Force backticks for svgContent values that contain EJS tags
                // This prevents syntax errors when SVG has quotes inside
                finalCode = finalCode.replace(/svgContent:"(<%[^%]*%>)"/g, 'svgContent:`$1`');

                const scriptTag = m.fullMatch.replace(m.code, finalCode);
                result = result.substring(0, m.index) + scriptTag + result.substring(m.index + m.fullMatch.length);
            }
        } catch (err) {
            console.warn(`  ⚠️  Could not minify script block: ${err.message}`);
        }
    }

    return result;
}

/**
 * Minify CSS content within style tags
 */
function minifyStyleTags(content) {
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;

    return content.replace(styleRegex, (match, css) => {
        // Skip EJS template tags
        if (css.includes('<%') || css.includes('%>')) return match;

        // Simple CSS minification
        const minified = css
            .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
            .replace(/\s+/g, ' ') // Collapse whitespace
            .replace(/\s*([{}:;,>+~])\s*/g, '$1') // Remove spaces around special chars
            .replace(/;}/g, '}') // Remove last semicolon in block
            .trim();

        return match.replace(css, minified);
    });
}

/**
 * Remove HTML comments (but preserve EJS comments)
 */
function removeHTMLComments(content) {
    // Remove HTML comments that aren't EJS
    return content.replace(/<!--(?!.*?%>)[\s\S]*?-->/g, '');
}

/**
 * Minify a single file
 */
async function minifyFile(filePath) {
    const fullPath = path.join(PARTIALS_DIR, filePath);
    const minPath = fullPath.replace('.ejs', '.min.ejs');

    console.log(`\n📄 Processing: ${filePath}`);

    try {
        let content = fs.readFileSync(fullPath, 'utf8');
        const originalSize = Buffer.byteLength(content, 'utf8');

        // Remove HTML comments
        content = removeHTMLComments(content);

        // Minify based on content type
        if (filePath.includes('styles/')) {
            content = minifyStyleTags(content);
        } else if (filePath.includes('scripts/') || filePath === 'ui-controls.ejs' || filePath === 'head.ejs' || filePath.includes('patterns/')) {
            content = await minifyScriptTags(content);
        }

        // Remove excess whitespace between tags
        content = content
            .replace(/>\s+</g, '><')
            .trim();

        // Write minified version
        fs.writeFileSync(minPath, content, 'utf8');

        const minifiedSize = Buffer.byteLength(content, 'utf8');
        const reduction = ((1 - minifiedSize / originalSize) * 100).toFixed(1);

        console.log(`  ✅ Created: ${path.basename(minPath)}`);
        console.log(`  📊 Size: ${originalSize} → ${minifiedSize} bytes (${reduction}% reduction)`);

        return { originalSize, minifiedSize };
    } catch (err) {
        console.error(`  ❌ Error: ${err.message}`);
        return null;
    }
}

/**
 * Main execution
 */
async function main() {
    console.log('🚀 Minifying EJS Partials\n');
    console.log('=' . repeat(60));

    let totalOriginal = 0;
    let totalMinified = 0;
    let successCount = 0;

    for (const file of FILES_TO_MINIFY) {
        const result = await minifyFile(file);
        if (result) {
            totalOriginal += result.originalSize;
            totalMinified += result.minifiedSize;
            successCount++;
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`\n✨ Minification Complete!\n`);
    console.log(`📊 Summary:`);
    console.log(`   Files processed: ${successCount}/${FILES_TO_MINIFY.length}`);
    console.log(`   Total original:  ${totalOriginal.toLocaleString()} bytes`);
    console.log(`   Total minified:  ${totalMinified.toLocaleString()} bytes`);
    console.log(`   Total reduction: ${((1 - totalMinified / totalOriginal) * 100).toFixed(1)}%`);
    console.log(`\n💡 To use minified versions, update index.ejs to include .min.ejs files\n`);
}

main().catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
});
