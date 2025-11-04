/**
 * Pattern Distribution Analysis
 *
 * Tests the pattern selection algorithms to verify uniform distribution.
 * Generates thousands of random wallet/seed combinations and measures distribution.
 */

const { selectPatternLegacy, selectPatternImproved, PATTERNS } = require('./utils/patternSelector');

// Test configuration
const TEST_ITERATIONS = 100000; // 100k samples for statistical significance

/**
 * Generate random wallet address (mimics Ethereum address)
 */
function randomWallet() {
    const chars = '0123456789abcdef';
    let wallet = '0x';
    for (let i = 0; i < 40; i++) {
        wallet += chars[Math.floor(Math.random() * chars.length)];
    }
    return wallet;
}

/**
 * Generate random seed string
 */
function randomSeed() {
    return 'seed_' + Math.random().toString(36).substring(2, 15);
}

/**
 * Test distribution of a selection function
 */
function testDistribution(selectFn, name) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`Testing: ${name}`);
    console.log('='.repeat(70));

    const counts = new Array(PATTERNS.length).fill(0);
    const startTime = Date.now();

    // Run selection many times with random inputs
    for (let i = 0; i < TEST_ITERATIONS; i++) {
        const wallet = randomWallet();
        const seed = randomSeed();
        const index = selectFn(wallet, seed);
        counts[index]++;
    }

    const endTime = Date.now();
    const elapsed = endTime - startTime;

    // Calculate statistics
    const expectedCount = TEST_ITERATIONS / PATTERNS.length;
    const expectedPercent = 100 / PATTERNS.length;

    console.log(`\nTest completed in ${elapsed}ms (${(TEST_ITERATIONS / elapsed * 1000).toFixed(0)} selections/sec)`);
    console.log(`\nTotal iterations: ${TEST_ITERATIONS.toLocaleString()}`);
    console.log(`Expected per pattern: ${expectedCount.toLocaleString()} (${expectedPercent.toFixed(4)}%)`);

    console.log('\n' + '-'.repeat(70));
    console.log('Pattern Distribution Results:');
    console.log('-'.repeat(70));

    let maxDeviation = 0;
    let totalChiSquare = 0;

    PATTERNS.forEach((pattern, i) => {
        const count = counts[i];
        const percent = (count / TEST_ITERATIONS) * 100;
        const deviation = count - expectedCount;
        const deviationPercent = (deviation / expectedCount) * 100;
        const chiSquare = (deviation * deviation) / expectedCount;

        totalChiSquare += chiSquare;
        maxDeviation = Math.max(maxDeviation, Math.abs(deviationPercent));

        const bar = '█'.repeat(Math.floor(percent / 2));

        console.log(`${i}. ${pattern.type.padEnd(10)} ${count.toLocaleString().padStart(8)} ` +
                    `(${percent.toFixed(4)}%) ${deviationPercent >= 0 ? '+' : ''}${deviationPercent.toFixed(4)}% ${bar}`);
    });

    console.log('-'.repeat(70));

    // Statistical analysis
    console.log('\n📊 Statistical Analysis:');
    console.log(`   Max deviation: ${maxDeviation.toFixed(4)}%`);
    console.log(`   Chi-square: ${totalChiSquare.toFixed(4)}`);

    // Chi-square test (df = 4 for 5 categories)
    // Critical values at α=0.05: 9.488
    // Critical value at α=0.01: 13.277
    const criticalValue = 9.488;
    const isUniform = totalChiSquare < criticalValue;

    console.log(`   Critical value (α=0.05): ${criticalValue}`);
    console.log(`   Result: ${isUniform ? '✅ UNIFORM' : '❌ NON-UNIFORM'} distribution`);

    if (maxDeviation < 0.5) {
        console.log(`   ✨ Excellent: max deviation < 0.5%`);
    } else if (maxDeviation < 1.0) {
        console.log(`   ✓ Good: max deviation < 1.0%`);
    } else {
        console.log(`   ⚠️  Warning: max deviation >= 1.0%`);
    }

    return {
        counts,
        totalChiSquare,
        maxDeviation,
        isUniform
    };
}

/**
 * Test determinism (same input = same output)
 */
function testDeterminism() {
    console.log(`\n${'='.repeat(70)}`);
    console.log('Testing: Determinism');
    console.log('='.repeat(70));

    const testCases = [
        { wallet: '0x1234567890abcdef1234567890abcdef12345678', seed: 'test-seed-1' },
        { wallet: '0xfedcba0987654321fedcba0987654321fedcba09', seed: 'test-seed-2' },
        { wallet: '0x0000000000000000000000000000000000000000', seed: 'zero-seed' },
        { wallet: '0xffffffffffffffffffffffffffffffffffffffff', seed: 'max-seed' }
    ];

    let allPassed = true;

    testCases.forEach((tc, i) => {
        const results = [];
        for (let j = 0; j < 10; j++) {
            results.push(selectPatternLegacy(tc.wallet, tc.seed));
        }

        const allSame = results.every(r => r === results[0]);
        const pattern = PATTERNS[results[0]];

        console.log(`Test ${i + 1}: ${allSame ? '✅' : '❌'} ${pattern.type.padEnd(10)} ` +
                    `(wallet: ${tc.wallet.slice(0, 10)}..., seed: ${tc.seed})`);

        if (!allSame) {
            console.log(`   Results: ${results.join(', ')}`);
            allPassed = false;
        }
    });

    console.log(`\nDeterminism test: ${allPassed ? '✅ PASSED' : '❌ FAILED'}`);
    return allPassed;
}

/**
 * Compare legacy vs improved algorithms
 */
function compareAlgorithms() {
    console.log(`\n${'='.repeat(70)}`);
    console.log('Comparing: Legacy vs Improved Algorithm');
    console.log('='.repeat(70));

    const testCases = [
        { wallet: '0x1234567890abcdef1234567890abcdef12345678', seed: 'test-1' },
        { wallet: '0xabcdef1234567890abcdef1234567890abcdef12', seed: 'test-2' },
        { wallet: '0x9876543210fedcba9876543210fedcba98765432', seed: 'test-3' },
        { wallet: '0x0000000000000000000000000000000000000001', seed: 'test-4' },
        { wallet: '0xffffffffffffffffffffffffffffffffffffffff', seed: 'test-5' }
    ];

    let sameCount = 0;
    let differentCount = 0;

    console.log('\nPattern Selection Comparison:');
    console.log('-'.repeat(70));

    testCases.forEach((tc, i) => {
        const legacyIndex = selectPatternLegacy(tc.wallet, tc.seed);
        const improvedIndex = selectPatternImproved(tc.wallet, tc.seed);

        const legacyPattern = PATTERNS[legacyIndex];
        const improvedPattern = PATTERNS[improvedIndex];

        const same = legacyIndex === improvedIndex;
        if (same) sameCount++;
        else differentCount++;

        console.log(`Test ${i + 1}: Legacy=${legacyPattern.type.padEnd(10)} ` +
                    `Improved=${improvedPattern.type.padEnd(10)} ` +
                    `${same ? '✓ Same' : '✗ Different'}`);
    });

    console.log('-'.repeat(70));
    console.log(`Results: ${sameCount} same, ${differentCount} different out of ${testCases.length} tests`);

    console.log('\n⚠️  NOTE: Different results are expected - the algorithms use different methods.');
    console.log('   Legacy uses floor(random * 5), Improved uses modulo.');
    console.log('   Both are deterministic but produce different outputs for same inputs.');
}

/**
 * Main test runner
 */
async function runTests() {
    console.log('\n╔════════════════════════════════════════════════════════════════════╗');
    console.log('║         PATTERN SELECTION DISTRIBUTION ANALYSIS TEST               ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝');

    // Test determinism first
    const deterministicPassed = testDeterminism();

    if (!deterministicPassed) {
        console.error('\n❌ Determinism test failed! Aborting distribution tests.');
        process.exit(1);
    }

    // Test legacy algorithm distribution
    const legacyResults = testDistribution(selectPatternLegacy, 'LEGACY Algorithm (floor method)');

    // Test improved algorithm distribution
    const improvedResults = testDistribution(selectPatternImproved, 'IMPROVED Algorithm (modulo method)');

    // Compare algorithms
    compareAlgorithms();

    // Final summary
    console.log(`\n${'='.repeat(70)}`);
    console.log('FINAL SUMMARY');
    console.log('='.repeat(70));

    console.log('\nLegacy Algorithm:');
    console.log(`   Chi-square: ${legacyResults.totalChiSquare.toFixed(4)}`);
    console.log(`   Max deviation: ${legacyResults.maxDeviation.toFixed(4)}%`);
    console.log(`   Uniform: ${legacyResults.isUniform ? '✅ Yes' : '❌ No'}`);

    console.log('\nImproved Algorithm:');
    console.log(`   Chi-square: ${improvedResults.totalChiSquare.toFixed(4)}`);
    console.log(`   Max deviation: ${improvedResults.maxDeviation.toFixed(4)}%`);
    console.log(`   Uniform: ${improvedResults.isUniform ? '✅ Yes' : '❌ No'}`);

    console.log('\n💡 Recommendation:');
    if (improvedResults.totalChiSquare < legacyResults.totalChiSquare) {
        const improvement = ((legacyResults.totalChiSquare - improvedResults.totalChiSquare) / legacyResults.totalChiSquare * 100).toFixed(2);
        console.log(`   ✨ Use IMPROVED algorithm - ${improvement}% better chi-square score`);
    } else if (improvedResults.maxDeviation < legacyResults.maxDeviation) {
        console.log(`   ✨ Use IMPROVED algorithm - lower max deviation`);
    } else {
        console.log(`   Both algorithms perform similarly for ${TEST_ITERATIONS.toLocaleString()} iterations`);
    }

    console.log('\n⚠️  IMPORTANT: Changing algorithms will change pattern selections for existing NFTs!');
    console.log('   For new deployments: Use IMPROVED algorithm');
    console.log('   For existing NFTs: Keep LEGACY algorithm for consistency');

    console.log('\n✅ All tests completed successfully!\n');
}

// Run tests
runTests().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
