#!/usr/bin/env node

/**
 * Template Validation Script
 * Compares original template with EJS-built template to ensure identical output
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class TemplateValidator {
    constructor() {
        this.distPath = path.join(__dirname, 'dist');
        this.originalFile = path.join(this.distPath, 'template-original-backup.html');
        this.newFile = path.join(this.distPath, 'template.html');
        this.results = {
            fileComparison: {},
            contentAnalysis: {},
            functionalityChecks: {},
            differences: [],
            success: false
        };
    }

    // Generate MD5 hash for file comparison
    generateFileHash(filePath) {
        if (!fs.existsSync(filePath)) {
            return null;
        }
        const content = fs.readFileSync(filePath, 'utf8');
        return crypto.createHash('md5').update(content).digest('hex');
    }

    // Get file size in bytes
    getFileSize(filePath) {
        if (!fs.existsSync(filePath)) {
            return null;
        }
        const stats = fs.statSync(filePath);
        return stats.size;
    }

    // Extract critical sections from HTML content
    extractCriticalSections(content) {
        const sections = {
            head: this.extractSection(content, '<head>', '</head>'),
            bootstrap: this.extractBootstrap(content),
            nftData: this.extractNftData(content),
            origamiPatterns: this.extractOrigamiPatterns(content),
            scripts: this.extractScripts(content),
            threejsDependencies: this.extractThreeJsDependencies(content),
            shaders: this.extractShaders(content),
            animations: this.extractAnimations(content)
        };
        return sections;
    }

    extractSection(content, startTag, endTag) {
        const startIndex = content.indexOf(startTag);
        const endIndex = content.indexOf(endTag, startIndex);
        if (startIndex === -1 || endIndex === -1) return null;
        return content.substring(startIndex, endIndex + endTag.length);
    }

    extractBootstrap(content) {
        const bootstrapRegex = /bootstrap.*?css/gi;
        const matches = content.match(bootstrapRegex) || [];
        return matches;
    }

    extractNftData(content) {
        // Look for NFT data patterns
        const patterns = [
            /const nftData = .*?;/gs,
            /window\.nftData = .*?;/gs,
            /___NFT_DATA_PLACEHOLDER___/g
        ];
        
        const matches = {};
        patterns.forEach((pattern, index) => {
            matches[`pattern_${index}`] = content.match(pattern) || [];
        });
        
        return matches;
    }

    extractOrigamiPatterns(content) {
        const patternRegex = /const origamiPatterns = \[(.*?)\];/gs;
        const match = content.match(patternRegex);
        if (!match) return null;
        
        // Count patterns
        const patternTypes = ['Airplane', 'Crane', 'Hypar', 'Pinwheel', 'Flower'];
        const foundPatterns = {};
        
        patternTypes.forEach(type => {
            const typeRegex = new RegExp(`patternType: "${type}"`, 'g');
            foundPatterns[type] = (content.match(typeRegex) || []).length;
        });
        
        return foundPatterns;
    }

    extractScripts(content) {
        const scriptRegex = /<script[^>]*src=["']([^"']+)["'][^>]*>/gi;
        const inlineScriptRegex = /<script[^>]*>(.*?)<\/script>/gs;
        
        const externalScripts = [];
        let match;
        while ((match = scriptRegex.exec(content)) !== null) {
            externalScripts.push(match[1]);
        }
        
        const inlineScripts = content.match(inlineScriptRegex) || [];
        
        return {
            external: externalScripts,
            inline: inlineScripts.length,
            total: externalScripts.length + inlineScripts.length
        };
    }

    extractThreeJsDependencies(content) {
        const threejsPatterns = [
            /three\.min\.js/gi,
            /TrackballControls\.js/gi,
            /SVGLoader\.js/gi,
            /typeof THREE/gi,
            /new THREE\./gi
        ];
        
        const dependencies = {};
        threejsPatterns.forEach((pattern, index) => {
            const matches = content.match(pattern) || [];
            dependencies[`pattern_${index}`] = matches.length;
        });
        
        return dependencies;
    }

    extractShaders(content) {
        const shaderPatterns = [
            /fragmentShader/gi,
            /vertexShader/gi,
            /ShaderMaterial/gi,
            /uniform/gi
        ];
        
        const shaders = {};
        shaderPatterns.forEach((pattern, index) => {
            const matches = content.match(pattern) || [];
            shaders[`pattern_${index}`] = matches.length;
        });
        
        return shaders;
    }

    extractAnimations(content) {
        const animationPatterns = [
            /requestAnimationFrame/gi,
            /animate\(/gi,
            /transition/gi,
            /@keyframes/gi
        ];
        
        const animations = {};
        animationPatterns.forEach((pattern, index) => {
            const matches = content.match(pattern) || [];
            animations[`pattern_${index}`] = matches.length;
        });
        
        return animations;
    }

    // Compare two files
    compareFiles() {
        console.log('🔍 Starting file comparison...');
        
        // Basic file comparison
        this.results.fileComparison = {
            originalExists: fs.existsSync(this.originalFile),
            newExists: fs.existsSync(this.newFile),
            originalSize: this.getFileSize(this.originalFile),
            newSize: this.getFileSize(this.newFile),
            originalHash: this.generateFileHash(this.originalFile),
            newHash: this.generateFileHash(this.newFile)
        };

        console.log(`📊 Original file: ${this.results.fileComparison.originalSize} bytes`);
        console.log(`📊 New file: ${this.results.fileComparison.newSize} bytes`);
        console.log(`🔐 Original hash: ${this.results.fileComparison.originalHash}`);
        console.log(`🔐 New hash: ${this.results.fileComparison.newHash}`);
        
        // Files are identical if hashes match
        if (this.results.fileComparison.originalHash === this.results.fileComparison.newHash) {
            console.log('✅ Files are byte-for-byte identical!');
            return true;
        } else {
            console.log('⚠️  Files differ - proceeding with detailed analysis...');
            return false;
        }
    }

    // Analyze content structure
    analyzeContent() {
        console.log('🔍 Analyzing content structure...');
        
        if (!fs.existsSync(this.originalFile) || !fs.existsSync(this.newFile)) {
            console.log('❌ Cannot analyze - one or both files missing');
            return;
        }

        const originalContent = fs.readFileSync(this.originalFile, 'utf8');
        const newContent = fs.readFileSync(this.newFile, 'utf8');

        const originalSections = this.extractCriticalSections(originalContent);
        const newSections = this.extractCriticalSections(newContent);

        this.results.contentAnalysis = {
            original: originalSections,
            new: newSections
        };

        // Compare each section
        this.compareSections(originalSections, newSections);
    }

    compareSections(originalSections, newSections) {
        console.log('📋 Comparing critical sections...');
        
        for (const [sectionName, originalSection] of Object.entries(originalSections)) {
            const newSection = newSections[sectionName];
            
            if (JSON.stringify(originalSection) === JSON.stringify(newSection)) {
                console.log(`✅ ${sectionName}: Identical`);
            } else {
                console.log(`⚠️  ${sectionName}: Differences found`);
                this.results.differences.push({
                    section: sectionName,
                    original: originalSection,
                    new: newSection
                });
            }
        }
    }

    // Check functionality preservation
    checkFunctionality() {
        console.log('🔍 Checking functionality preservation...');
        
        if (!fs.existsSync(this.newFile)) {
            console.log('❌ Cannot check functionality - new file missing');
            return;
        }

        const content = fs.readFileSync(this.newFile, 'utf8');
        
        this.results.functionalityChecks = {
            nftPlaceholder: content.includes('___NFT_DATA_PLACEHOLDER___'),
            bootstrapIncluded: /bootstrap.*css/gi.test(content),
            threejsLoaded: /three\.min\.js/gi.test(content),
            origamiPatternsPresent: /origamiPatterns.*\[/gs.test(content),
            shadersPresent: /fragmentShader|vertexShader/gi.test(content),
            animationsPresent: /requestAnimationFrame/gi.test(content),
            globalVariables: /window\.nftRenderComplete/gi.test(content),
            editModeConfig: /editMode.*false/gi.test(content)
        };

        console.log('🧪 Functionality checks:');
        for (const [check, passed] of Object.entries(this.results.functionalityChecks)) {
            console.log(`  ${passed ? '✅' : '❌'} ${check}: ${passed ? 'PASS' : 'FAIL'}`);
        }
    }

    // Generate detailed report
    generateReport() {
        console.log('\n📋 TEMPLATE VALIDATION REPORT');
        console.log('=' .repeat(50));
        
        // Summary
        const allFunctionalityPassed = Object.values(this.results.functionalityChecks).every(Boolean);
        const noDifferences = this.results.differences.length === 0;
        
        this.results.success = allFunctionalityPassed && (
            this.results.fileComparison.originalHash === this.results.fileComparison.newHash ||
            noDifferences
        );

        console.log(`\n🎯 OVERALL RESULT: ${this.results.success ? 'SUCCESS ✅' : 'ISSUES FOUND ⚠️'}`);
        
        // File comparison summary
        console.log('\n📁 FILE COMPARISON:');
        console.log(`   Original: ${this.results.fileComparison.originalSize || 'N/A'} bytes`);
        console.log(`   New: ${this.results.fileComparison.newSize || 'N/A'} bytes`);
        console.log(`   Size difference: ${
            this.results.fileComparison.originalSize && this.results.fileComparison.newSize 
                ? (this.results.fileComparison.newSize - this.results.fileComparison.originalSize) 
                : 'N/A'
        } bytes`);
        console.log(`   Identical: ${this.results.fileComparison.originalHash === this.results.fileComparison.newHash ? 'YES ✅' : 'NO ⚠️'}`);

        // Functionality summary  
        console.log('\n🔧 FUNCTIONALITY CHECKS:');
        const passed = Object.values(this.results.functionalityChecks).filter(Boolean).length;
        const total = Object.keys(this.results.functionalityChecks).length;
        console.log(`   ${passed}/${total} checks passed`);
        
        if (!allFunctionalityPassed) {
            console.log('\n❌ FAILED CHECKS:');
            for (const [check, passed] of Object.entries(this.results.functionalityChecks)) {
                if (!passed) {
                    console.log(`   - ${check}`);
                }
            }
        }

        // Differences
        if (this.results.differences.length > 0) {
            console.log(`\n⚠️  DIFFERENCES FOUND (${this.results.differences.length}):`);
            this.results.differences.forEach((diff, index) => {
                console.log(`   ${index + 1}. Section: ${diff.section}`);
            });
        }

        // Recommendations
        console.log('\n💡 RECOMMENDATIONS:');
        if (this.results.success) {
            console.log('   ✅ Template validation passed! EJS modularization successful.');
            console.log('   ✅ All critical functionality preserved.');
            console.log('   ✅ Ready for deployment.');
        } else {
            if (!allFunctionalityPassed) {
                console.log('   ⚠️  Fix failing functionality checks before deployment.');
            }
            if (this.results.differences.length > 0) {
                console.log('   ⚠️  Review content differences for potential issues.');
            }
            console.log('   📋 Run webpack build and re-test after making changes.');
        }

        return this.results;
    }

    // Main validation method
    async validate() {
        console.log('🚀 Starting Template Validation Process...\n');
        
        try {
            // Step 1: File comparison
            const filesIdentical = this.compareFiles();
            
            // Step 2: Content analysis (only if files differ)
            if (!filesIdentical) {
                this.analyzeContent();
            }
            
            // Step 3: Functionality checks
            this.checkFunctionality();
            
            // Step 4: Generate report
            const results = this.generateReport();
            
            // Save results to file
            const reportPath = path.join(__dirname, 'validation-report.json');
            fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
            console.log(`\n📄 Detailed report saved to: ${reportPath}`);
            
            return results;
            
        } catch (error) {
            console.error('❌ Validation failed with error:', error.message);
            return { success: false, error: error.message };
        }
    }
}

// Run validation if called directly
if (require.main === module) {
    const validator = new TemplateValidator();
    validator.validate()
        .then(results => {
            process.exit(results.success ? 0 : 1);
        })
        .catch(error => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

module.exports = TemplateValidator;