// Import CSS
import './main.css';

// NFT Data Configuration (from original working file)
const nftData = JSON.parse(`
{
    "walletAddress":"0x1234567890abcdef1234567890abcdef12345678",
    "seed2":"4",
    "patternType":"Flower", 
    "images":[
        {"url":"https://exonemo.com/test/katachi-gen/images/aventurine.avif"},
        {"url":"https://exonemo.com/test/katachi-gen/images/infinitegarden.webp"},
        {"url":"https://exonemo.com/test/katachi-gen/images/gmmoney-die.webp"},
        {"url":"https://exonemo.com/test/katachi-gen/images/ocote-tekno.gif"},
        {"url":"https://exonemo.com/test/katachi-gen/images/karborn.webp"}
    ]
}
`);

// Origami Patterns Configuration (from original working file)
const origamiPatterns = [
    {
        maxFolding: 95, 
        name: "airplane.svg", 
        patternType: "Airplane"
    },
    {
        maxFolding: 97, 
        name: "traditionalCrane.svg", 
        patternType: "Crane"
    },
    {
        maxFolding: 70, 
        name: "hypar.svg", 
        patternType: "Hypar"
    },
    {
        maxFolding: 80, 
        name: "pinwheelBase.svg", 
        patternType: "Pinwheel"
    },
    {
        maxFolding: 70, 
        name: "FTpoly7.svg", 
        patternType: "Flower"
    }
];

// External Library URLs (from original working file)
const externalLibraries = [
    'https://arweave.net/PalygydxpOrQIy25uGoQ-uBQ_8gJ6ZfAmzB40v9o8Ys/jquery-3.2.1.min.js',
    'https://arweave.net/PalygydxpOrQIy25uGoQ-uBQ_8gJ6ZfAmzB40v9o8Ys/jquery-ui.min.js',
    'https://arweave.net/PalygydxpOrQIy25uGoQ-uBQ_8gJ6ZfAmzB40v9o8Ys/flat-ui.min.js',
    'https://arweave.net/PalygydxpOrQIy25uGoQ-uBQ_8gJ6ZfAmzB40v9o8Ys/three.min.js',
    'https://arweave.net/PalygydxpOrQIy25uGoQ-uBQ_8gJ6ZfAmzB40v9o8Ys/binary_stl_writer.js',
    'https://arweave.net/PalygydxpOrQIy25uGoQ-uBQ_8gJ6ZfAmzB40v9o8Ys/TrackballControls.js',
    'https://arweave.net/PalygydxpOrQIy25uGoQ-uBQ_8gJ6ZfAmzB40v9o8Ys/underscore-min.js',
    'https://arweave.net/PalygydxpOrQIy25uGoQ-uBQ_8gJ6ZfAmzB40v9o8Ys/FileSaver.min.js',
    'https://arweave.net/PalygydxpOrQIy25uGoQ-uBQ_8gJ6ZfAmzB40v9o8Ys/SVGLoader.js',
    'https://arweave.net/PalygydxpOrQIy25uGoQ-uBQ_8gJ6ZfAmzB40v9o8Ys/OBJExporter.js',
    'https://arweave.net/PalygydxpOrQIy25uGoQ-uBQ_8gJ6ZfAmzB40v9o8Ys/path-data-polyfill.js',
    'https://arweave.net/PalygydxpOrQIy25uGoQ-uBQ_8gJ6ZfAmzB40v9o8Ys/earcut.js',
    'https://arweave.net/PalygydxpOrQIy25uGoQ-uBQ_8gJ6ZfAmzB40v9o8Ys/fold.js',
    'https://arweave.net/PalygydxpOrQIy25uGoQ-uBQ_8gJ6ZfAmzB40v9o8Ys/CCapture.all.min.js',
    'https://arweave.net/PalygydxpOrQIy25uGoQ-uBQ_8gJ6ZfAmzB40v9o8Ys/numeric-1.2.6.js',
    'https://arweave.net/PalygydxpOrQIy25uGoQ-uBQ_8gJ6ZfAmzB40v9o8Ys/WebVR.js',
    'https://arweave.net/PalygydxpOrQIy25uGoQ-uBQ_8gJ6ZfAmzB40v9o8Ys/VRController.js',
    'https://arweave.net/PalygydxpOrQIy25uGoQ-uBQ_8gJ6ZfAmzB40v9o8Ys/datguivr.js',
    'https://arweave.net/PalygydxpOrQIy25uGoQ-uBQ_8gJ6ZfAmzB40v9o8Ys/cdt2d.js',
    'https://arweave.net/PalygydxpOrQIy25uGoQ-uBQ_8gJ6ZfAmzB40v9o8Ys/svgpath.js'
];

// Local JavaScript files (from original working file)
const localJSFiles = [
    'js/dynamic/GLBoilerplate.js',
    'js/dynamic/GPUMath.js',
    'js/controls.js',
    'js/threeView.js',
    'js/globals.js',
    'js/node.js',
    'js/beam.js',
    'js/crease.js',
    'js/model.js',
    'js/3dUI.js',
    'js/staticSolver.js',
    'js/dynamic/dynamicSolver.js',
    'js/rigidSolver.js',
    'js/pattern.js',
    'js/saveSTL.js',
    'js/saveFOLD.js',
    'js/cellColorizer.js',
    'js/importer.js',
    'js/VRInterface.js',
    'js/videoAnimator.js',
    'js/curvedFolding.js',
    'js/main.js'
];

// Global Variables Setup
function setupGlobalVariables() {
    console.log('🌍 Setting up global variables...');
    
    // Set global flags
    window.nftRenderComplete = false;
    window.editMode = false;
    
    // Set NFT data
    window.nftData = nftData;
    window.origamiPatterns = origamiPatterns;
    
    console.log('✅ Global variables configured:', {
        nftRenderComplete: window.nftRenderComplete,
        editMode: window.editMode,
        nftData: window.nftData ? 'loaded' : 'missing',
        patternsCount: window.origamiPatterns ? window.origamiPatterns.length : 0
    });
}

// Script Loading Function
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = src;
        script.onload = () => {
            console.log(`✅ Loaded: ${src.split('/').pop()}`);
            resolve();
        };
        script.onerror = () => {
            console.error(`❌ Failed to load: ${src}`);
            reject(new Error(`Failed to load script: ${src}`));
        };
        document.head.appendChild(script);
    });
}

// Load External Libraries
async function loadExternalLibraries() {
    console.log('📚 Loading external libraries...');
    
    for (const libUrl of externalLibraries) {
        try {
            await loadScript(libUrl);
        } catch (error) {
            console.warn(`⚠️ Optional library failed to load: ${libUrl}`, error);
            // Continue loading other libraries even if one fails
        }
    }
    
    console.log('✅ External libraries loading completed');
}

// Load Local JavaScript Files
async function loadLocalJSFiles() {
    console.log('📁 Loading local JavaScript files...');
    
    for (const jsFile of localJSFiles) {
        try {
            await loadScript(jsFile);
        } catch (error) {
            console.error(`❌ Critical local file failed to load: ${jsFile}`, error);
            throw error; // Critical files should stop the loading process
        }
    }
    
    console.log('✅ Local JavaScript files loaded successfully');
}

// Loading Screen Management
function showLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.style.display = 'flex';
        loadingScreen.style.opacity = '1';
    }
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    const appContainer = document.getElementById('appContainer');
    
    if (loadingScreen && appContainer) {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            appContainer.style.display = 'block';
            console.log('🎉 Loading screen hidden, application visible');
        }, 500);
    }
}

function updateLoadingText(text) {
    const loadingText = document.getElementById('loadingText');
    if (loadingText) {
        // Keep the dots animation
        const dotsSpan = loadingText.querySelector('.loading-dots');
        loadingText.innerHTML = text;
        if (dotsSpan) {
            loadingText.appendChild(dotsSpan);
        } else {
            loadingText.innerHTML += '<span class="loading-dots"></span>';
        }
    }
}

function showError(message) {
    const loadingText = document.getElementById('loadingText');
    if (loadingText) {
        loadingText.innerHTML = `<span style="color: #ff6b6b;">Error: ${message}</span>`;
    }
}

// Main Application Initialization
async function initializeApplication() {
    try {
        console.log('🚀 Initializing Katachi Generator...');
        
        // Show loading screen
        showLoadingScreen();
        updateLoadingText('Initializing');
        
        // Setup global variables first
        setupGlobalVariables();
        updateLoadingText('Loading libraries');
        
        // Load external libraries
        await loadExternalLibraries();
        updateLoadingText('Loading application');
        
        // Load local JavaScript files
        await loadLocalJSFiles();
        updateLoadingText('Starting application');
        
        // Wait a moment for main.js to initialize
        setTimeout(() => {
            console.log('🎯 Application initialization completed');
            hideLoadingScreen();
        }, 1000);
        
    } catch (error) {
        console.error('💥 Application initialization failed:', error);
        showError('Failed to initialize application. Please refresh the page.');
    }
}

// Fallback Safety Mechanisms
function setupFallbacks() {
    // Hide loading screen after maximum wait time (15 seconds)
    setTimeout(() => {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen && loadingScreen.style.display !== 'none') {
            console.log('⏰ Fallback timeout: hiding loading screen after 15 seconds');
            hideLoadingScreen();
        }
    }, 15000);
    
    // Also hide when page fully loads as a backup
    window.addEventListener('load', () => {
        setTimeout(() => {
            const loadingScreen = document.getElementById('loadingScreen');
            if (loadingScreen && loadingScreen.style.display !== 'none') {
                console.log('📄 Page fully loaded: hiding loading screen as backup');
                hideLoadingScreen();
            }
        }, 3000);
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setupFallbacks();
        initializeApplication();
    });
} else {
    setupFallbacks();
    initializeApplication();
}

// Global exports for debugging and external access
window.katachi = {
    initializeApplication,
    setupGlobalVariables,
    loadExternalLibraries,
    loadLocalJSFiles,
    showLoadingScreen,
    hideLoadingScreen,
    updateLoadingText,
    nftData,
    origamiPatterns
};

console.log('📦 Katachi Generator webpack bundle loaded');
