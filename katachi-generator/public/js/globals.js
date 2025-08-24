/**
 * Created by ghassaei on 10/7/16.
 */

console.log("Loading globals.js...");

function initGlobals(){
    console.log("initGlobals function called");

    var _globals = {

        navMode: "simulation",
        scale: 1,
        editMode: true, // Default to edit mode enabled, can be overridden
        isNFTProcessing: false, // Flag to indicate NFT processing context
        hideUntilTextured: false, // Flag to hide origami object until textures are applied

        //view
        colorMode: "color",
        calcFaceStrain: false,
        color1: "ffffff", // Changed from ec008b (pink) to white for transparency
        color2: "ffffff", // Backside color set to white
        defaultOpacity: 1.0, // Default opacity for non-textured surfaces (1.0 = opaque)
        edgesVisible: true,
        mtnsVisible: true,
        valleysVisible: true,
        panelsVisible: false,
        passiveEdgesVisible: false,
        boundaryEdgesVisible: true,
        meshVisible: true,
        ambientOcclusion: false,
        
        //texture settings
        faceTexture: null,
        textureRepeat: 1.0,
        textureLibrary: [], // Array to store multiple textures
        faceTextureMapping: {}, // Map face indices to texture indices
        selectedTexture: 0, // Currently selected texture for assignment
        randomTextures: false,
        
        // Lighting settings - adjustable parameters for 3D scene lighting
        lighting: {
            // Main front light for texture clarity (from top front) - ハードコード値
            frontMain: {
                intensity: 1.2,  // デフォルト0.8から1.2に変更（明るく）
                position: { x: 0, y: 100, z: 0 }
            },
            // Back light for depth (from bottom back)
            backLight: {
                intensity: 0.3,
                position: { x: 0, y: -100, z: 0 }
            },
            // Side lights for even illumination
            sideLeft: {
                intensity: 0.6,
                position: { x: 100, y: -30, z: 0 }
            },
            sideRight: {
                intensity: 0.6,
                position: { x: -100, y: -30, z: 0 }
            },
            // Front lights for texture detail - positioned to face the model directly
            frontDetail1: {
                intensity: 0.6,  // デフォルト0.7から0.9に変更（明るく）
                position: { x: 0, y: 30, z: 100 }
            },
            frontDetail2: {
                intensity: 0.3,  // デフォルト0.4から0.6に変更（明るく）
                position: { x: 0, y: 30, z: -100 }
            },
            // Ambient light for overall visibility - ハードコード値
            ambient: {
                intensity: 0.35  // デフォルト0.25から0.35に変更（明るく）
            }
        },
        
        // Global random seed management
        randomSeed: "origami-simulator-2024", // Default seed string
        randomFunction: null, // Will store seeded random function
        useSeededRandom: true, // Enable deterministic random behavior

        //flags
        simulationRunning: true,
        fixedHasChanged: false,
        forceHasChanged: false,
        materialHasChanged: false,
        creaseMaterialHasChanged: false,
        shouldResetDynamicSim: false,//not used
        shouldChangeCreasePercent: false,
        nodePositionHasChanged: false,
        shouldZeroDynamicVelocity: false,
        shouldCenterGeo: false,
        needsSync: false,
        simNeedsSync: false,

        menusVisible: true,

        url: null,

        //3d vis
        simType: "dynamic",

        //compliant sim settings
        creasePercent: 0,  // Start flat (0% folded)
        maxFoldingPercent: 100, // Maximum folding percentage (default 100%)
        currentPatternMaxFolding: 100, // Current pattern's max folding value
        axialStiffness: 20,
        creaseStiffness: 0.7,
        panelStiffness: 0.7,
        faceStiffness: 0.2,

        //dynamic sim settings
        percentDamping: 0.45,//damping ratio
        density: 1,
        integrationType: "euler",

        strainClip: 5.0,//for strain visualization, % strain that is drawn red

        //import pattern settings
        vertTol: 3,//vertex merge tolerance
        foldUseAngles: true,//import current angles from fold format as target angles
        //for curved folding
        includeCurves: false,
        vertInt: 20,//intervals of vertices for discretization
        apprCurve: 0.2,//approximation quality of curves

        //save stl settings
        filename: null,
        extension: null,
        doublesidedSTL: false,
        doublesidedOBJ: false,
        exportScale: 1,
        thickenModel: true,
        thickenOffset: 5,
        polyFacesOBJ: true,

        //save fold settings
        foldUnits: "unit",
        triangulateFOLDexport: false,
        exportFoldAngle: true,

        pausedForPatternView: false,

        userInteractionEnabled: false,
        vrEnabled: false,

        numSteps: 100,

        rotateModel: null,
        rotationSpeed: 0.01,
        
        // Multi-axis rotation animation
        autoRotateEnabled: false,
        autoRotateStartTime: null,
        autoRotateWaitTime: 3000, // 3 seconds wait
        multiAxisRotation: {
            x: 0.005, // X-axis rotation speed
            y: 0.008, // Y-axis rotation speed  
            z: 0.003  // Z-axis rotation speed
        },
        randomRotationEnabled: true, // Enable random rotation directions
        rotationChangeInterval: 6000, // Change rotation direction every 6 seconds
        lastRotationChangeTime: null,

        // Slider auto animation
        sliderAutoAnimationEnabled: false,
        sliderAnimationStartTime: null,
        sliderAnimationDuration: 4000, // 4 seconds to go from min to max
        sliderAnimationDirection: 1, // 1 for min->max, -1 for max->min
        sliderAnimationStartValue: 0,
        sliderAnimationEndValue: 100,
        sliderAnimationLoop: true, // Enable looping
        sliderAnimationPauseTime: 5000, // 5 seconds pause at each end
        sliderAnimationState: 'animating', // 'animating', 'pausing'
        sliderAnimationPauseStartTime: null,

        backgroundColor:"ffffff",

        capturer: null,
        capturerQuality: 63,
        capturerFPS: 60,
        gifFPS: 20,
        currentFPS: null,
        capturerScale: 1,
        capturerFrames: 0,
        shouldScaleCanvas: false,
        isGif: false,
        shouldAnimateFoldPercent: false
    };

    function setCreasePercent(percent){
        _globals.creasePercent = percent;
        percent *= 100;
        $("#creasePercent>div").slider({value:percent});
        $("#creasePercent>input").val(percent.toFixed(0));
        $("#creasePercentNav>div").slider({value:percent});
        $("#creasePercentBottom>div").slider({value:percent});
    }
    _globals.setCreasePercent = setCreasePercent;

    function setMaxFolding(maxFoldingValue){
        _globals.currentPatternMaxFolding = maxFoldingValue;
        // Update all folding sliders to use the new maximum
        if (typeof updateFoldingSliderMax === 'function') {
            updateFoldingSliderMax();
        }
    }
    _globals.setMaxFolding = setMaxFolding;

    function warn(msg){
        if (($("#warningMessage").html()) != "") $("#warningMessage").append("<br/><hr>" + msg);
        else $("#warningMessage").html(msg);
        if (!$('#warningModal').hasClass('show')) $("#warningModal").modal("show");
    }
    $('#warningModal').on('hidden.bs.modal', function () {
        $("#warningMessage").html("");
    });
    _globals.warn = warn;

    function noCreasePatternAvailable(){
        return $("#svgViewer>svg").length == 0;
    }
    _globals.noCreasePatternAvailable = noCreasePatternAvailable;

    function compressImage(file, maxSizeMB, callback) {
        var maxSizeBytes = maxSizeMB * 1024 * 1024;
        
        // Update compression status
        function updateStatus(message) {
            $("#compressionStatus").text(message);
        }
        
        // If file is already small enough, use as-is
        if (file.size <= maxSizeBytes) {
            console.log("File size OK:", Math.round(file.size / 1024) + "KB");
            updateStatus("");
            callback(file);
            return;
        }
        
        updateStatus("Compressing " + file.name + " (" + Math.round(file.size / 1024 / 1024) + "MB)...");
        console.log("Compressing large image:", file.name, "from", Math.round(file.size / 1024 / 1024) + "MB");
        
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');
        var img = new Image();
        
        img.onload = function() {
            // Calculate new dimensions to reduce file size
            var ratio = Math.sqrt(maxSizeBytes / file.size);
            var newWidth = Math.floor(img.width * ratio);
            var newHeight = Math.floor(img.height * ratio);
            
            // Minimum size constraints
            newWidth = Math.max(newWidth, 256);
            newHeight = Math.max(newHeight, 256);
            
            // Maximum size constraints for performance
            var maxDimension = 1024;
            if (newWidth > maxDimension || newHeight > maxDimension) {
                var scale = maxDimension / Math.max(newWidth, newHeight);
                newWidth = Math.floor(newWidth * scale);
                newHeight = Math.floor(newHeight * scale);
            }
            
            canvas.width = newWidth;
            canvas.height = newHeight;
            
            updateStatus("Resizing " + file.name + " to " + newWidth + "×" + newHeight + "...");
            console.log("Resizing from", img.width + "x" + img.height, "to", newWidth + "x" + newHeight);
            
            // Draw resized image
            ctx.drawImage(img, 0, 0, newWidth, newHeight);
            
            // Try different quality settings to achieve target size
            var quality = 0.8;
            var attempts = 0;
            var maxAttempts = 5;
            
            function tryCompress() {
                updateStatus("Optimizing " + file.name + " (attempt " + (attempts + 1) + ")...");
                
                canvas.toBlob(function(blob) {
                    if (blob) {
                        var compressedSizeMB = blob.size / 1024 / 1024;
                        console.log("Compression attempt", attempts + 1, "- Size:", Math.round(compressedSizeMB * 1000) / 1000 + "MB", "Quality:", quality);
                        
                        if (blob.size <= maxSizeBytes || attempts >= maxAttempts || quality <= 0.3) {
                            // Create a File object from the blob
                            var compressedFile = new File([blob], file.name, {
                                type: blob.type || 'image/jpeg',
                                lastModified: Date.now()
                            });
                            
                            var reduction = Math.round((1 - compressedFile.size / file.size) * 100);
                            var finalMessage = "✓ Compressed " + file.name + " by " + reduction + "% (" + 
                                             Math.round(file.size / 1024 / 1024 * 100) / 100 + "MB → " +
                                             Math.round(compressedFile.size / 1024 / 1024 * 100) / 100 + "MB)";
                            
                            updateStatus(finalMessage);
                            console.log("Compression completed:", 
                                       "Original:", Math.round(file.size / 1024 / 1024 * 100) / 100 + "MB",
                                       "Compressed:", Math.round(compressedFile.size / 1024 / 1024 * 100) / 100 + "MB",
                                       "Reduction:", reduction + "%");
                            
                            // Clear status after 3 seconds
                            setTimeout(function() {
                                updateStatus("");
                            }, 3000);
                            
                            callback(compressedFile);
                        } else {
                            // Try with lower quality
                            attempts++;
                            quality *= 0.8;
                            tryCompress();
                        }
                    } else {
                        console.error("Failed to create compressed blob");
                        updateStatus("⚠ Compression failed, using original file");
                        setTimeout(function() {
                            updateStatus("");
                        }, 3000);
                        callback(file); // Fallback to original
                    }
                }, 'image/jpeg', quality);
            }
            
            tryCompress();
        };
        
        img.onerror = function() {
            console.error("Failed to load image for compression");
            updateStatus("⚠ Compression failed, using original file");
            setTimeout(function() {
                updateStatus("");
            }, 3000);
            callback(file); // Fallback to original
        };
        
        // Load the image
        var reader = new FileReader();
        reader.onload = function(e) {
            img.src = e.target.result;
        };
        reader.onerror = function() {
            console.error("Failed to read file for compression");
            updateStatus("⚠ Compression failed, using original file");
            setTimeout(function() {
                updateStatus("");
            }, 3000);
            callback(file); // Fallback to original
        };
        reader.readAsDataURL(file);
    }
    _globals.compressImage = compressImage;

    function loadTexture(file, callback) {
        // Check file size and compress if needed
        var targetSize = 3 * 1024 * 1024; // 3MB target for compression (reduced from 5MB)
        
        if (file.size > targetSize) {
            if (file.size > 10 * 1024 * 1024) {
                console.log("Very large texture file (" + Math.round(file.size / 1024 / 1024) + "MB). Compressing to improve performance...");
            } else {
                console.log("Large texture file (" + Math.round(file.size / 1024 / 1024) + "MB). Compressing for better performance...");
            }
        }
        
        // Auto-compress files larger than target size
        if (file.size > targetSize) {
            _globals.compressImage(file, 3, function(compressedFile) {
                loadTextureFromFile(compressedFile, callback);
            });
        } else {
            loadTextureFromFile(file, callback);
        }
    }
    
    function loadTextureFromFile(file, callback) {
        var callbackCalled = false; // Move outside to proper scope
        
        function safeCallback(result) {
            if (!callbackCalled) {
                callbackCalled = true;
                if (callback) callback(result);
            }
        }
        
        var reader = new FileReader();
        reader.onload = function(e) {
            var loader = new THREE.TextureLoader();
            loader.load(e.target.result, 
                function(texture) {
                    // Success callback
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;
                    texture.repeat.set(_globals.textureRepeat, _globals.textureRepeat);
                    texture.flipY = false; // Important for proper UV mapping
                    texture.generateMipmaps = true;
                    texture.minFilter = THREE.LinearFilter; // Simplified filter to avoid WebGL errors
                    texture.magFilter = THREE.LinearFilter;
                    texture.name = file.name; // Store filename
                    
                    // Ensure texture image is ready for atlas creation
                    if (texture.image) {
                        texture.image.crossOrigin = 'anonymous';
                        
                        // Wait for image to be fully loaded
                        if (!texture.image.complete) {
                            texture.image.onload = function() {
                                console.log("✅ Texture image loaded completely:", texture.name, 
                                           texture.image.width + "x" + texture.image.height);
                                _globals.faceTexture = texture;
                                safeCallback(texture);
                            };
                            texture.image.onerror = function() {
                                console.error("❌ Failed to load texture image:", texture.name);
                                safeCallback(null);
                            };
                        } else {
                            console.log("✅ Texture image already complete:", texture.name, 
                                       texture.image.width + "x" + texture.image.height);
                            _globals.faceTexture = texture;
                            safeCallback(texture);
                        }
                    } else {
                        console.error("❌ Texture has no image data:", texture.name);
                        safeCallback(null);
                    }
                },
                function(progress) {
                    // Progress callback
                    console.log("Loading texture progress:", progress);
                },
                function(error) {
                    // Error callback
                    console.error("❌ Error loading texture:", file.name, error);
                    _globals.warn("Failed to load texture file: " + file.name);
                    safeCallback(null);
                }
            );
        };
        reader.onerror = function(error) {
            console.error("❌ Error reading file:", file.name, error);
            _globals.warn("Failed to read texture file: " + file.name);
            safeCallback(null);
        };
        reader.readAsDataURL(file);
    }
    _globals.loadTexture = loadTexture;

    function loadMultipleTextures(files, callback) {
        // Clear previous textures and mappings
        _globals.textureLibrary = [];
        _globals.faceTextureMapping = {};
        var loadedCount = 0;
        var totalFiles = files.length;
        var failedFiles = [];
        var loadedTextures = []; // Track loaded textures to prevent duplicates
        
        if (totalFiles === 0) {
            if (callback) callback([]);
            return;
        }
        
        console.log("🎨 Loading", totalFiles, "texture files in deterministic order...");
        
        // Sort files by name to ensure consistent order
        var sortedFiles = Array.from(files).sort(function(a, b) {
            return a.name.localeCompare(b.name);
        });
        
        console.log("📋 Sorted file order:");
        for (var s = 0; s < sortedFiles.length; s++) {
            console.log("  " + s + ": " + sortedFiles[s].name);
        }
        
        // Update status
        function updateLoadingStatus(message) {
            var statusElement = document.getElementById('compressionStatus');
            if (statusElement) {
                statusElement.textContent = message;
            }
        }
        
        updateLoadingStatus("📥 Loading " + totalFiles + " image" + (totalFiles > 1 ? "s" : "") + " in order...");
        
        // Sequential loading to ensure deterministic order
        var loadedTextures = new Array(totalFiles); // Pre-allocate array
        
        function loadSequentially(index) {
            if (index >= totalFiles) {
                // All files processed, compile results in order
                _globals.textureLibrary = [];
                for (var i = 0; i < loadedTextures.length; i++) {
                    if (loadedTextures[i]) {
                        _globals.textureLibrary.push(loadedTextures[i]);
                    }
                }
                finishLoading();
                return;
            }
            
            var file = sortedFiles[index];
            
            // Validate file type
            var validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/avif', 'image/webp', 'image/gif'];
            if (!validTypes.includes(file.type)) {
                console.warn("Unsupported file type:", file.type, "for file:", file.name);
                failedFiles.push(file.name + " (unsupported format)");
                loadedTextures[index] = null;
                loadSequentially(index + 1);
                return;
            }
            
            console.log("📥 Loading texture " + (index + 1) + "/" + totalFiles + ":", file.name);
            
            loadTexture(file, function(texture) {
                if (texture) {
                    // Check for duplicates in previously loaded textures
                    var isDuplicate = false;
                    for (var i = 0; i < index; i++) {
                        if (loadedTextures[i] && loadedTextures[i].name === texture.name) {
                            isDuplicate = true;
                            break;
                        }
                    }
                    
                    if (!isDuplicate) {
                        loadedTextures[index] = texture;
                        console.log("✅ Loaded texture " + (index + 1) + ":", texture.name);
                        console.log("   - Image dimensions:", texture.image ? texture.image.width + "x" + texture.image.height : "No image");
                    } else {
                        console.log("⚠️ Skipping duplicate texture:", texture.name);
                        loadedTextures[index] = null;
                    }
                } else {
                    failedFiles.push(file.name + " (load failed)");
                    console.error("❌ Failed to load texture:", file.name);
                    loadedTextures[index] = null;
                }
                
                loadSequentially(index + 1);
            });
        }
        
        // Start sequential loading
        loadSequentially(0);
        
        function finishLoading() {
            var successCount = _globals.textureLibrary.length;
            var failedCount = failedFiles.length;
            
            console.log("📚 Texture loading completed:", successCount, "successful,", failedCount, "failed");
            
            // Debug: Show all loaded textures
            console.log("🔍 Texture library contents:");
            for (var i = 0; i < _globals.textureLibrary.length; i++) {
                var texture = _globals.textureLibrary[i];
                console.log("- Index " + i + ":", texture ? texture.name : "NULL", 
                           texture && texture.image ? "(" + texture.image.width + "x" + texture.image.height + ")" : "(no image)");
            }
            
            // Auto-enable random textures for testing (moved before fold data check)
            console.log("🔍 Checking conditions: textureLibrary.length =", _globals.textureLibrary.length, "model exists =", !!_globals.model);
            if (_globals.textureLibrary.length >= 1) {
                console.log("✅ Textures detected, but skipping immediate assignment (waiting for simple texture generation)");
                // assignRandomTextures(); // 削除：一時的なテクスチャ適用を防ぐ
                _globals.randomTextures = true;
                $("#randomTextures").prop("checked", true);
            } else {
                console.log("❌ Conditions not met for random textures");
                if (_globals.textureLibrary.length < 1) {
                    console.log("   - No textures in library");
                }
            }
            
            // Check if we have fold data before proceeding with multiple textures
            if (!_globals.fold || !_globals.fold.faces_vertices) {
                console.warn("⚠️ No origami pattern loaded. Please import an SVG pattern first for textures to display properly.");
                updateLoadingStatus("⚠ Load an origami pattern first for multi-texture support");
                
                // テクスチャの一時適用を削除（シンプルテクスチャ生成まで待つ）
                // if (_globals.textureLibrary.length > 0) {
                //     _globals.faceTexture = _globals.textureLibrary[0];
                // }
                
                if (callback) callback(_globals.textureLibrary);
                return;
            }
            
            if (failedCount > 0) {
                console.warn("Failed to load:", failedFiles.join(", "));
                updateLoadingStatus("⚠ " + successCount + " loaded, " + failedCount + " failed");
            } else {
                updateLoadingStatus("✓ " + successCount + " image" + (successCount > 1 ? "s" : "") + " loaded successfully");
            }

            // Auto-generate simple texture-mapped cells when textures are loaded
            console.log("🎯 Auto-generating simple texture for loaded textures...");
            
            // Skip complex texture processing - use simple texture mode only
            if (_globals.cellColorizer && _globals.cellColorizer.generateTextureMappedCellImage) {
                // Check if we have fold data
                var hasFoldData = false;
                if (_globals.fold && _globals.fold.vertices_coords && _globals.fold.faces_vertices) {
                    hasFoldData = true;
                    console.log("📊 Using existing fold data for simple texture");
                } else if (_globals.pattern && _globals.pattern.getFoldData) {
                    try {
                        var foldData = _globals.pattern.getFoldData(false);
                        if (foldData && foldData.vertices_coords && foldData.faces_vertices) {
                            hasFoldData = true;
                            console.log("📊 Retrieved fold data from pattern for simple texture");
                        }
                    } catch (e) {
                        console.warn("⚠️ Failed to get fold data from pattern:", e.message);
                    }
                } else if (_globals.curvedFolding && _globals.curvedFolding.getFoldData) {
                    try {
                        var foldData = _globals.curvedFolding.getFoldData(false);
                        if (foldData && foldData.vertices_coords && foldData.faces_vertices) {
                            hasFoldData = true;
                            console.log("📊 Retrieved fold data from curvedFolding for simple texture");
                        }
                    } catch (e) {
                        console.warn("⚠️ Failed to get fold data from curvedFolding:", e.message);
                    }
                }
                
                if (hasFoldData) {
                    try {
                        console.log("🚀 Executing simple texture generation...");
                        _globals.cellColorizer.generateTextureMappedCellImage(true); // Auto mode
                        console.log("✅ Simple texture applied successfully");
                    } catch (error) {
                        console.error("❌ Failed to generate simple texture:", error);
                        console.log("🔄 Falling back to first texture only");
                        _globals.faceTexture = _globals.textureLibrary[0];
                        _globals.useSimpleTextureMode = true;
                        _globals.isCellGeneratedTexture = false; // Use basic texture mapping
                        if (_globals.model && _globals.model.setMeshMaterial) {
                            _globals.model.setMeshMaterial();
                        }
                    }
                } else {
                    console.warn("⚠️ No fold data available, using basic single texture");
                    _globals.faceTexture = _globals.textureLibrary[0];
                    _globals.useSimpleTextureMode = true;
                    _globals.isCellGeneratedTexture = false; // Use basic texture mapping
                    if (_globals.model && _globals.model.setMeshMaterial) {
                        _globals.model.setMeshMaterial();
                    }
                }
            } else {
                console.warn("⚠️ cellColorizer not available, using basic single texture");
                _globals.faceTexture = _globals.textureLibrary[0];
                _globals.useSimpleTextureMode = true;
                _globals.isCellGeneratedTexture = false; // Use basic texture mapping
                if (_globals.model && _globals.model.setMeshMaterial) {
                    _globals.model.setMeshMaterial();
                }
            }
            
            // Clear status after 3 seconds
            setTimeout(function() {
                updateLoadingStatus("");
            }, 3000);
            
            if (callback) callback(_globals.textureLibrary);
        }
    }
    _globals.loadMultipleTextures = loadMultipleTextures;

    function updateTextureList() {
        var $list = $("#textureList");
        $list.empty();
        
        _globals.textureLibrary.forEach(function(texture, index) {
            if (texture) {
                var $item = $('<div class="texture-item" style="margin: 5px 0; padding: 5px; border: 1px solid #ccc; cursor: pointer;">' +
                    '<span style="font-weight: bold;">Texture ' + (index + 1) + ':</span> ' + texture.name +
                    '<button class="btn btn-xs btn-danger" style="float: right; margin-left: 10px;" onclick="removeTexture(' + index + ')">Remove</button>' +
                    '<button class="btn btn-xs btn-primary" style="float: right;" onclick="selectTexture(' + index + ')">Select</button>' +
                    '</div>');
                
                if (index === _globals.selectedTexture) {
                    $item.css('background-color', '#e6f3ff');
                }
                
                $list.append($item);
            }
        });
    }
    _globals.updateTextureList = updateTextureList;

    function selectTexture(index) {
        if (index >= 0 && index < _globals.textureLibrary.length && _globals.textureLibrary[index]) {
            _globals.selectedTexture = index;
            _globals.faceTexture = _globals.textureLibrary[index];
            updateTextureList();
            if (_globals.model) {
                _globals.model.setMeshMaterial();
            }
        }
    }
    _globals.selectTexture = selectTexture;

    function removeTexture(index) {
        if (index >= 0 && index < _globals.textureLibrary.length) {
            _globals.textureLibrary.splice(index, 1);
            
            // Update face mappings
            var newMapping = {};
            Object.keys(_globals.faceTextureMapping).forEach(function(faceIndex) {
                var textureIndex = _globals.faceTextureMapping[faceIndex];
                if (textureIndex > index) {
                    newMapping[faceIndex] = textureIndex - 1;
                } else if (textureIndex < index) {
                    newMapping[faceIndex] = textureIndex;
                }
                // Skip faces that were mapped to the removed texture
            });
            _globals.faceTextureMapping = newMapping;
            
            // Update selected texture
            if (_globals.selectedTexture >= _globals.textureLibrary.length) {
                _globals.selectedTexture = Math.max(0, _globals.textureLibrary.length - 1);
            }
            if (_globals.textureLibrary.length > 0) {
                _globals.faceTexture = _globals.textureLibrary[_globals.selectedTexture];
            } else {
                _globals.faceTexture = null;
            }
            
            updateTextureList();
            if (_globals.model) {
                _globals.model.setMeshMaterial();
            }
        }
    }
    _globals.removeTexture = removeTexture;

    function assignRandomTextures() {
        console.log("🕐 assignRandomTextures called at:", new Date().toISOString());
        console.log("🔑 Using seed:", _globals.randomSeed, "| Seeded random enabled:", _globals.useSeededRandom);
        
        // Ensure the random seed is properly initialized before assignment
        if (!_globals.randomFunction || !_globals.useSeededRandom) {
            console.log("🔄 Re-initializing random seed before texture assignment");
            _globals.initializeRandomSeed(_globals.randomSeed);
        }
        
        if (!_globals.model || _globals.textureLibrary.length === 0) {
            console.warn("Cannot assign random textures: missing model or textures");
            return;
        }
        
        // Debug: Verify texture library state
        console.log("🔍 Pre-assignment texture library verification:");
        console.log("- Library length:", _globals.textureLibrary.length);
        for (var t = 0; t < _globals.textureLibrary.length; t++) {
            var tex = _globals.textureLibrary[t];
            console.log("  [" + t + "]", tex ? tex.name : "NULL", 
                       tex && tex.image ? "✓" : "✗");
        }
        
        // Get faces from the fold data if available, otherwise use model faces
        var faces;
        if (_globals.fold && _globals.fold.faces_vertices) {
            faces = _globals.fold.faces_vertices;
            console.log("Using fold data for faces:", faces.length, "faces");
        } else {
            faces = _globals.model.getFaces();
            console.log("Using model data for faces:", faces ? faces.length : 0, "faces");
        }
        
        if (!faces || faces.length === 0) {
            console.warn("No faces found in model");
            return;
        }
        
        console.log("🎲 Assigning", _globals.textureLibrary.length, "textures randomly to", faces.length, "faces");
        
        // Clear existing mapping COMPLETELY to ensure fresh start
        _globals.faceTextureMapping = {};
        
        var numTextures = _globals.textureLibrary.length;
        
        // Enhanced distribution algorithm to ensure all textures are used
        var faceAssignments = [];
        
        // Method 1: Ensure every texture gets at least one face (if possible)
        if (faces.length >= numTextures) {
            // First, assign each texture to at least one face
            for (var t = 0; t < numTextures; t++) {
                faceAssignments.push(t);
            }
            console.log("✅ Guaranteed assignment: Each of", numTextures, "textures gets at least 1 face");
            
            // Then distribute remaining faces
            var remainingFaces = faces.length - numTextures;
            for (var i = 0; i < remainingFaces; i++) {
                var textureIndex = i % numTextures; // Cycle through textures
                faceAssignments.push(textureIndex);
            }
        } else {
            // More textures than faces - just assign textures in order
            console.log("⚠️ More textures (" + numTextures + ") than faces (" + faces.length + ") - some textures won't be used");
            for (var f = 0; f < faces.length; f++) {
                faceAssignments.push(f % numTextures);
            }
        }
        
        console.log("📊 Initial distribution before shuffle:");
        var preShuffleUsage = {};
        for (var j = 0; j < faceAssignments.length; j++) {
            var texIdx = faceAssignments[j];
            preShuffleUsage[texIdx] = (preShuffleUsage[texIdx] || 0) + 1;
        }
        for (var texIdx in preShuffleUsage) {
            console.log("- Texture " + texIdx + ": " + preShuffleUsage[texIdx] + " faces");
        }
        
        // Reset random function state to ensure consistent starting point
        if (_globals.useSeededRandom) {
            console.log("🔄 Resetting random seed state for deterministic assignment");
            _globals.initializeRandomSeed(_globals.randomSeed);
        }
        
        // Shuffle the assignments for randomness
        console.log("🎲 Using seeded random values for texture assignment:");
        console.log("🔑 Current seed:", _globals.randomSeed);
        console.log("� Seeded random function available:", !!_globals.randomFunction);
        console.log("�📊 faceAssignments array length:", faceAssignments.length);
        console.log("📊 faceAssignments before shuffle:", JSON.stringify(faceAssignments));
        
        // Generate deterministic random values using seeded random
        var randomValues = [];
        for (var i = faceAssignments.length - 1; i > 0; i--) {
            var randomValue = _globals.getSeededRandom();
            randomValues.push(randomValue);
        }
        
        console.log("📋 Generated seeded random values: [" + randomValues.slice(0, 10).map(function(v) { return v.toFixed(6); }).join(", ") + (randomValues.length > 10 ? "..." : "") + "]");
        
        // Perform Fisher-Yates shuffle using the seeded random values
        var shuffleIndex = 0;
        for (var i = faceAssignments.length - 1; i > 0; i--) {
            var randomValue = randomValues[shuffleIndex];
            var j = Math.floor(randomValue * (i + 1));
            shuffleIndex++;
            
            if (shuffleIndex <= 10) { // Log first few steps for debugging
                console.log("Step " + (faceAssignments.length - 1 - i) + ": seeded random=" + randomValue.toFixed(6) + ", j=" + j + ", swapping indices " + i + " ↔ " + j);
            }
            
            // Perform swap
            var temp = faceAssignments[i];
            faceAssignments[i] = faceAssignments[j];
            faceAssignments[j] = temp;
        }
        
        console.log("📋 All seeded random values: [" + randomValues.map(function(v) { return v.toFixed(6); }).join(", ") + "]");
        console.log("📊 faceAssignments after shuffle:", JSON.stringify(faceAssignments));
        
        // Apply assignments to faces
        for (var f = 0; f < faces.length; f++) {
            if (faceAssignments[f] !== undefined) {
                _globals.faceTextureMapping[f] = faceAssignments[f];
            }
        }
        
        // Debug: Show final face-to-texture mapping (first 20 faces)
        console.log("🗺️ Final face mapping (first 20 faces):");
        for (var f = 0; f < Math.min(20, faces.length); f++) {
            console.log("Face " + f + " → Texture " + _globals.faceTextureMapping[f]);
        }
        
        // Statistics for logging
        var textureUsage = {};
        for (var faceIdx in _globals.faceTextureMapping) {
            var texIdx = _globals.faceTextureMapping[faceIdx];
            textureUsage[texIdx] = (textureUsage[texIdx] || 0) + 1;
        }
        
        console.log("✅ Random texture assignment completed:");
        console.log("📈 Final texture usage statistics:");
        var totalUsed = 0;
        var unusedTextures = [];
        for (var texIdx in textureUsage) {
            var textureName = _globals.textureLibrary[texIdx] ? _globals.textureLibrary[texIdx].name : "Texture " + (parseInt(texIdx) + 1);
            var usage = textureUsage[texIdx];
            var percentage = ((usage / faces.length) * 100).toFixed(1);
            console.log("- " + textureName + ": " + usage + " faces (" + percentage + "%)");
            totalUsed += usage;
        }
        
        // Check for unused textures
        for (var i = 0; i < _globals.textureLibrary.length; i++) {
            if (!textureUsage.hasOwnProperty(i)) {
                var textureName = _globals.textureLibrary[i] ? _globals.textureLibrary[i].name : "Texture " + (i + 1);
                unusedTextures.push(textureName);
            }
        }
        
        if (unusedTextures.length > 0) {
            console.warn("⚠️ Unused textures detected:", unusedTextures.join(", "));
            console.warn("This indicates a distribution problem!");
        } else {
            console.log("✅ All textures are being used!");
        }
        
        console.log("📊 Total faces assigned:", totalUsed, "/ Expected:", faces.length);
        
        // Debug: Show first few assignments
        console.log("📝 Sample assignments:", Object.keys(_globals.faceTextureMapping).slice(0, 10).map(function(faceIdx) {
            return "Face " + faceIdx + " → Texture " + _globals.faceTextureMapping[faceIdx];
        }));
        
        // Update display
        updateTextureList();
        
        // Update material to apply the new texture mapping
        if (_globals.colorMode === "texture") {
            console.log("🔄 Updating material with new texture mapping");
            console.log("📋 Material update context:");
            console.log("  - Atlas exists:", !!_globals.textureAtlas);
            console.log("  - Atlas dimensions:", _globals.textureAtlas ? _globals.textureAtlas.image.width + "x" + _globals.textureAtlas.image.height : "N/A");
            console.log("  - Face mapping size:", Object.keys(_globals.faceTextureMapping).length);
            
            _globals.model.setMeshMaterial();
            
            console.log("✅ Material update completed");
        }
        
        // Force UV mapping update for single texture grid system
        if (_globals.textureLibrary.length <= 2 && _globals.model && _globals.model.updateUVMapping) {
            console.log("🔲 Forcing UV mapping update for single texture grid system");
            _globals.model.updateUVMapping();
        }
    }
    _globals.assignRandomTextures = assignRandomTextures;

    function createTextureAtlas() {
        if (_globals.textureLibrary.length === 0) {
            console.warn("❌ No textures available for atlas creation");
            return null;
        }
        if (_globals.textureLibrary.length === 1) {
            console.log("📱 Single texture detected, using original texture without atlas");
            return _globals.textureLibrary[0];
        }
        
        console.log("🎨 Creating texture atlas from", _globals.textureLibrary.length, "textures");
        
        // List all textures being included
        console.log("📝 Textures to include in atlas:");
        var validTextures = [];
        for (var i = 0; i < _globals.textureLibrary.length; i++) {
            var texture = _globals.textureLibrary[i];
            var isValid = texture && texture.image && texture.image.complete && texture.image.width > 0 && texture.image.height > 0;
            console.log("- Texture " + i + ":", texture ? texture.name : "NULL", 
                       "Size:", (texture && texture.image ? texture.image.width + "x" + texture.image.height : "No image"),
                       "Valid:", isValid ? "✅" : "❌");
            if (isValid) {
                validTextures.push({index: i, texture: texture});
            }
        }
        
        if (validTextures.length === 0) {
            console.error("❌ No valid textures found for atlas creation");
            return null;
        }
        
        if (validTextures.length !== _globals.textureLibrary.length) {
            console.warn("⚠️ Some textures are invalid:", _globals.textureLibrary.length - validTextures.length, "out of", _globals.textureLibrary.length);
        }
        
        // Calculate atlas dimensions based on valid textures
        var texturesPerRow = Math.ceil(Math.sqrt(validTextures.length));
        var texturesPerCol = Math.ceil(validTextures.length / texturesPerRow);
        
        // Create canvas for atlas
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');
        
        // Set atlas size (optimized for performance and quality)
        var maxAtlasSize = 2048;
        var textureSize = Math.floor(maxAtlasSize / Math.max(texturesPerRow, texturesPerCol));
        
        canvas.width = texturesPerRow * textureSize;
        canvas.height = texturesPerCol * textureSize;
        
        console.log("Atlas dimensions:", canvas.width + "x" + canvas.height, 
                   "Grid:", texturesPerRow + "x" + texturesPerCol, 
                   "Texture size:", textureSize + "x" + textureSize,
                   "Valid textures:", validTextures.length + "/" + _globals.textureLibrary.length);
        
        // Store atlas layout information for UV mapping
        _globals.atlasLayout = {
            texturesPerRow: texturesPerRow,
            texturesPerCol: texturesPerCol,
            textureSize: textureSize,
            width: canvas.width,
            height: canvas.height,
            regions: [], // Initialize regions array
            textureIndexMapping: {}, // Map original texture indices to atlas positions
            validTextures: validTextures // Store mapping of valid textures
        };
        
        // Calculate regions for each valid texture and create index mapping
        for (var i = 0; i < validTextures.length; i++) {
            var validTexture = validTextures[i];
            var originalIndex = validTexture.index;
            
            var row = Math.floor(i / texturesPerRow);
            var col = i % texturesPerRow;
            var x = col * textureSize;
            var y = row * textureSize;
            
            _globals.atlasLayout.regions.push({
                x: x,
                y: y,
                width: textureSize,
                height: textureSize
            });
            
            // Map original texture index to atlas position
            _globals.atlasLayout.textureIndexMapping[originalIndex] = i;
        }
        
        // Clear canvas with transparent background
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw each valid texture to the atlas synchronously
        var successCount = 0;
        var drawnTextures = []; // Track which textures were actually drawn
        
        for (var i = 0; i < validTextures.length; i++) {
            var validTexture = validTextures[i];
            var texture = validTexture.texture;
            var originalIndex = validTexture.index;
            
            var row = Math.floor(i / texturesPerRow);
            var col = i % texturesPerRow;
            var x = col * textureSize;
            var y = row * textureSize;
            
            try {
                // Draw texture to atlas position
                ctx.drawImage(texture.image, x, y, textureSize, textureSize);
                console.log("✅ Drew texture", originalIndex, "'" + texture.name + "' at atlas position [" + x + "," + y + "]");
                drawnTextures.push({
                    originalIndex: originalIndex,
                    atlasIndex: i,
                    name: texture.name,
                    position: [x, y],
                    size: [textureSize, textureSize]
                });
                successCount++;
            } catch (error) {
                console.error("❌ Failed to draw texture", originalIndex, "to atlas:", error);
            }
        }
        
        console.log("🎨 Atlas drawing summary:");
        console.log("- Total textures in library:", _globals.textureLibrary.length);
        console.log("- Valid textures found:", validTextures.length);
        console.log("- Successfully drawn:", successCount);
        console.log("- Drawn texture details:");
        for (var i = 0; i < drawnTextures.length; i++) {
            var drawn = drawnTextures[i];
            console.log("  * Slot " + drawn.atlasIndex + ": " + drawn.name + " (original index " + drawn.originalIndex + ")");
        }
        
        // Log texture index mapping for debugging
        console.log("🗺️ Texture index mapping:");
        for (var originalIndex in _globals.atlasLayout.textureIndexMapping) {
            var atlasPos = _globals.atlasLayout.textureIndexMapping[originalIndex];
            var textureName = _globals.textureLibrary[originalIndex] ? _globals.textureLibrary[originalIndex].name : "unknown";
            console.log("  * Original index " + originalIndex + " (" + textureName + ") → Atlas position " + atlasPos);
        }
        
        // Verify all valid textures are accounted for
        var missingTextures = [];
        for (var i = 0; i < validTextures.length; i++) {
            var originalIndex = validTextures[i].index;
            var found = drawnTextures.some(function(drawn) { return drawn.originalIndex === originalIndex; });
            if (!found) {
                missingTextures.push(originalIndex + ":" + validTextures[i].texture.name);
            }
        }
        
        if (missingTextures.length > 0) {
            console.error("❌ Missing valid textures from atlas:", missingTextures.join(", "));
        } else {
            console.log("✅ All valid textures successfully included in atlas");
        }
        
        if (successCount === 0) {
            console.warn("No textures could be added to atlas");
            return _globals.textureLibrary[0]; // Fallback to first texture
        }
        
        // Create Three.js texture from canvas
        var atlasTexture = new THREE.CanvasTexture(canvas);
        atlasTexture.wrapS = THREE.RepeatWrapping;
        atlasTexture.wrapT = THREE.RepeatWrapping;
        atlasTexture.minFilter = THREE.LinearFilter;
        atlasTexture.magFilter = THREE.LinearFilter;
        atlasTexture.flipY = false;
        atlasTexture.name = "TextureAtlas_" + _globals.textureLibrary.length + "textures";
        
        // Force texture update
        atlasTexture.needsUpdate = true;
        
        console.log("Texture atlas created successfully:", atlasTexture.name, "with", successCount, "textures");
        
        // Update status
        var statusElement = document.getElementById('compressionStatus');
        if (statusElement) {
            statusElement.textContent = "🎨 Created texture atlas with " + successCount + " textures";
            setTimeout(function() {
                statusElement.textContent = "";
            }, 3000);
        }
        
        return atlasTexture;
    }
    _globals.createTextureAtlas = createTextureAtlas;

    function assignTextureToFace(faceIndex, textureIndex) {
        if (textureIndex >= 0 && textureIndex < _globals.textureLibrary.length) {
            _globals.faceTextureMapping[faceIndex] = textureIndex;
            console.log("Assigned texture", textureIndex, "to face", faceIndex);
            
            // Update the material with new atlas if needed
            if (_globals.model && _globals.colorMode === "texture") {
                var atlasTexture = createTextureAtlas();
                if (atlasTexture) {
                    _globals.faceTexture = atlasTexture;
                    _globals.model.setMeshMaterial();
                }
            }
        }
    }
    _globals.assignTextureToFace = assignTextureToFace;

    // Make functions available globally for HTML interface
    window.selectTexture = _globals.selectTexture;
    window.removeTexture = _globals.removeTexture;

    function setTextureMode(enable) {
        if (enable && _globals.faceTexture) {
            _globals.colorMode = "texture";
        } else {
            _globals.colorMode = "color";
        }
        _globals.model.setMeshMaterial();
    }
    _globals.setTextureMode = setTextureMode;

    // Global Random Seed Management System
    function initializeRandomSeed(seed) {
        if (typeof seed === "undefined") {
            seed = _globals.randomSeed;
        } else {
            _globals.randomSeed = seed;
        }
        
        console.log("🎲 Initializing global random seed:", seed);
        
        // Use numeric.js seedrandom if available
        if (typeof numeric !== "undefined" && numeric.seedrandom && numeric.seedrandom.random) {
            try {
                // Create a simple seeded random generator using the seed string
                var seedHash = 0;
                for (var i = 0; i < seed.length; i++) {
                    seedHash = ((seedHash << 5) - seedHash + seed.charCodeAt(i)) & 0xffffffff;
                }
                seedHash = Math.abs(seedHash);
                
                // Use seedHash to initialize a simple LCG (Linear Congruential Generator)
                var currentSeed = seedHash % 2147483647;
                if (currentSeed <= 0) currentSeed += 2147483646;
                
                _globals.randomFunction = function() {
                    currentSeed = (currentSeed * 16807) % 2147483647;
                    return (currentSeed - 1) / 2147483646;
                };
                
                _globals.useSeededRandom = true;
                console.log("✅ Using custom seeded random generator with hash:", seedHash);
                
            } catch (e) {
                console.warn("🚨 Error creating seeded random generator:", e.message);
                _globals.randomFunction = Math.random;
                _globals.useSeededRandom = false;
            }
        } else {
            console.warn("🚨 numeric.js not available, using Math.random");
            _globals.randomFunction = Math.random;
            _globals.useSeededRandom = false;
        }
        
        console.log("✅ Random seed initialized. Seeded random:", _globals.useSeededRandom);
    }
    _globals.initializeRandomSeed = initializeRandomSeed;
    
    function getSeededRandom() {
        if (_globals.useSeededRandom && _globals.randomFunction) {
            return _globals.randomFunction();
        } else {
            return Math.random();
        }
    }
    _globals.getSeededRandom = getSeededRandom;
    
    function setRandomSeed(seed) {
        console.log("🔄 Changing random seed to:", seed);
        console.log("🔄 Previous seed was:", _globals.randomSeed);
        
        // Initialize the new seed
        initializeRandomSeed(seed);
        
        // Update global Math.random override
        enableGlobalRandomOverride();
        
        // Clear any cached random state
        _globals.faceTextureMapping = {};
        
        // Re-run texture assignment if we have textures and a model
        if (_globals.textureLibrary.length > 0 && _globals.model) {
            console.log("🔄 Regenerating ALL texture assignments with new seed");
            console.log("🔄 Texture library has", _globals.textureLibrary.length, "textures");
            
            // Always re-assign textures when seed changes, regardless of randomTextures setting
            assignRandomTextures();
            
            // Update the material to reflect new assignments
            if (_globals.model.setMeshMaterial) {
                console.log("🔄 Updating mesh material with new texture assignments");
                _globals.model.setMeshMaterial();
            }
        } else {
            console.log("⚠️ Cannot regenerate texture assignments:", 
                      "textures=" + _globals.textureLibrary.length, 
                      "model=" + !!_globals.model);
        }
        
        console.log("✅ Random seed change completed. New seed:", _globals.randomSeed);
    }
    _globals.setRandomSeed = setRandomSeed;

    // Initialize the random seed when globals are created
    initializeRandomSeed();
    
    // Global Math.random override for complete deterministic control
    var originalMathRandom = Math.random;
    
    function enableGlobalRandomOverride() {
        if (_globals.useSeededRandom && _globals.randomFunction) {
            console.log("🔒 Overriding Math.random with seeded function");
            Math.random = _globals.getSeededRandom;
        } else {
            console.log("🔓 Using original Math.random");
            Math.random = originalMathRandom;
        }
    }
    
    function disableGlobalRandomOverride() {
        console.log("🔄 Restoring original Math.random");
        Math.random = originalMathRandom;
    }
    
    _globals.enableGlobalRandomOverride = enableGlobalRandomOverride;
    _globals.disableGlobalRandomOverride = disableGlobalRandomOverride;
    _globals.originalMathRandom = originalMathRandom;
    
    // Lighting control functions
    function setLightIntensity(lightName, intensity) {
        if (_globals.lighting[lightName] && typeof intensity === 'number') {
            _globals.lighting[lightName].intensity = Math.max(0, Math.min(10, intensity)); // Clamp between 0 and 10
            console.log("🔧 Set", lightName, "intensity to", _globals.lighting[lightName].intensity);
            
            // Update the 3D view if available
            if (_globals.threeView && _globals.threeView.updateLighting) {
                _globals.threeView.updateLighting();
            }
        } else {
            console.warn("Invalid light name or intensity value:", lightName, intensity);
        }
    }
    _globals.setLightIntensity = setLightIntensity;
    
    function setLightPosition(lightName, x, y, z) {
        if (_globals.lighting[lightName] && _globals.lighting[lightName].position) {
            _globals.lighting[lightName].position.x = x || 0;
            _globals.lighting[lightName].position.y = y || 0;
            _globals.lighting[lightName].position.z = z || 0;
            console.log("🔧 Set", lightName, "position to", _globals.lighting[lightName].position);
            
            // Update the 3D view if available
            if (_globals.threeView && _globals.threeView.updateLighting) {
                _globals.threeView.updateLighting();
            }
        } else {
            console.warn("Invalid light name:", lightName);
        }
    }
    _globals.setLightPosition = setLightPosition;
    
    function adjustFrontLighting(intensity) {
        console.log("🔧 Adjusting front lighting to intensity:", intensity);
        setLightIntensity('frontMain', intensity);
        setLightIntensity('frontDetail1', intensity * 0.875); // 0.7/0.8 = 0.875
        setLightIntensity('frontDetail2', intensity * 0.5);   // 0.4/0.8 = 0.5
    }
    _globals.adjustFrontLighting = adjustFrontLighting;
    
    function resetLightingToDefaults() {
        console.log("🔄 Resetting lighting to default values");
        
        _globals.lighting.frontMain.intensity = 0.8;
        _globals.lighting.backLight.intensity = 0.3;
        _globals.lighting.sideLeft.intensity = 0.6;
        _globals.lighting.sideRight.intensity = 0.6;
        _globals.lighting.frontDetail1.intensity = 0.7;
        _globals.lighting.frontDetail2.intensity = 0.4;
        _globals.lighting.ambient.intensity = 0.25;
        
        // Update the 3D view if available
        if (_globals.threeView && _globals.threeView.updateLighting) {
            _globals.threeView.updateLighting();
        }
    }
    _globals.resetLightingToDefaults = resetLightingToDefaults;
    
    function getLightingInfo() {
        console.log("💡 Current lighting settings:");
        for (var lightName in _globals.lighting) {
            var light = _globals.lighting[lightName];
            if (light.position) {
                console.log("  " + lightName + ": intensity=" + light.intensity + 
                          ", position=(" + light.position.x + "," + light.position.y + "," + light.position.z + ")");
            } else {
                console.log("  " + lightName + ": intensity=" + light.intensity);
            }
        }
        return _globals.lighting;
    }
    _globals.getLightingInfo = getLightingInfo;
    
    // Pattern loading state management
    _globals.patternLoadingCallbacks = [];
    
    function onPatternLoaded(callback) {
        if (typeof callback === 'function') {
            _globals.patternLoadingCallbacks.push(callback);
            console.log('📋 Pattern loading callback registered, total callbacks:', _globals.patternLoadingCallbacks.length);
        }
    }
    _globals.onPatternLoaded = onPatternLoaded;
    
    function notifyPatternLoaded(patternInfo) {
        console.log('🔔 Notifying pattern loaded:', patternInfo);
        var callbacks = _globals.patternLoadingCallbacks.slice(); // Copy array
        _globals.patternLoadingCallbacks = []; // Clear callbacks
        
        callbacks.forEach(function(callback, index) {
            try {
                console.log('📞 Calling pattern loading callback', index);
                callback(patternInfo);
            } catch (error) {
                console.error('❌ Error in pattern loading callback', index, ':', error);
            }
        });
    }
    _globals.notifyPatternLoaded = notifyPatternLoaded;
    
    // Enable global override by default
    enableGlobalRandomOverride();

    console.log("initGlobals function completed successfully");
    return _globals;
}

console.log("globals.js loaded successfully, initGlobals function defined");