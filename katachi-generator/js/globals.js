/**
 * Created by ghassaei on 10/7/16.
 */

console.log("Loading globals.js...");

function initGlobals(){
    console.log("initGlobals function called");

    var _globals = {

        navMode: "simulation",
        scale: 1,

        //view
        colorMode: "color",
        calcFaceStrain: false,
        color1: "ec008b",
        color2: "dddddd",
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
                    }
                    
                    _globals.faceTexture = texture;
                    console.log("Texture loaded successfully:", texture.name, "Image ready:", !!texture.image);
                    if (callback) callback(texture);
                },
                function(progress) {
                    // Progress callback
                    console.log("Loading texture progress:", progress);
                },
                function(error) {
                    // Error callback
                    console.error("Error loading texture:", error);
                    _globals.warn("Failed to load texture file: " + file.name);
                }
            );
        };
        reader.onerror = function(error) {
            console.error("Error reading file:", error);
            _globals.warn("Failed to read texture file: " + file.name);
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
        
        if (totalFiles === 0) {
            if (callback) callback([]);
            return;
        }
        
        console.log("Loading", totalFiles, "texture files...");
        
        // Update status
        function updateLoadingStatus(message) {
            var statusElement = document.getElementById('compressionStatus');
            if (statusElement) {
                statusElement.textContent = message;
            }
        }
        
        updateLoadingStatus("📥 Loading " + totalFiles + " image" + (totalFiles > 1 ? "s" : "") + "...");
        
        for (var i = 0; i < totalFiles; i++) {
            (function(index) {
                var file = files[index];
                
                // Validate file type
                var validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/avif', 'image/webp', 'image/gif'];
                if (!validTypes.includes(file.type)) {
                    console.warn("Unsupported file type:", file.type, "for file:", file.name);
                    failedFiles.push(file.name + " (unsupported format)");
                    loadedCount++;
                    
                    if (loadedCount === totalFiles) {
                        finishLoading();
                    }
                    return;
                }
                
                loadTexture(file, function(texture) {
                    if (texture) {
                        _globals.textureLibrary[index] = texture;
                        console.log("Loaded texture", index + 1, "of", totalFiles + ":", texture.name);
                    } else {
                        failedFiles.push(file.name + " (load failed)");
                        console.error("Failed to load texture:", file.name);
                    }
                    
                    loadedCount++;
                    updateTextureList();
                    
                    if (loadedCount === totalFiles) {
                        finishLoading();
                    }
                });
            })(i);
        }
        
        function finishLoading() {
            // Remove any null entries from failed loads
            _globals.textureLibrary = _globals.textureLibrary.filter(function(texture) {
                return texture !== null && texture !== undefined;
            });
            
            var successCount = _globals.textureLibrary.length;
            var failedCount = failedFiles.length;
            
            console.log("Texture loading completed:", successCount, "successful,", failedCount, "failed");
            
            // Auto-enable random textures for testing (moved before fold data check)
            console.log("🔍 Checking conditions: textureLibrary.length =", _globals.textureLibrary.length, "model exists =", !!_globals.model);
            if (_globals.textureLibrary.length >= 1) {
                console.log("✅ Textures detected, enabling random assignment (test mode - bypassing model check)");
                assignRandomTextures();
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
                
                // Still set single texture if available
                if (_globals.textureLibrary.length > 0) {
                    _globals.faceTexture = _globals.textureLibrary[0];
                }
                
                if (callback) callback(_globals.textureLibrary);
                return;
            }
            
            if (failedCount > 0) {
                console.warn("Failed to load:", failedFiles.join(", "));
                updateLoadingStatus("⚠ " + successCount + " loaded, " + failedCount + " failed");
            } else {
                updateLoadingStatus("✓ " + successCount + " image" + (successCount > 1 ? "s" : "") + " loaded successfully");
            }

            // Set first texture as default for material
            if (_globals.textureLibrary.length > 0) {
                _globals.faceTexture = _globals.textureLibrary[0];
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
        
        if (!_globals.model || _globals.textureLibrary.length === 0) {
            console.warn("Cannot assign random textures: missing model or textures");
            return;
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
        
        // Clear existing mapping
        _globals.faceTextureMapping = {};
        
        var numTextures = _globals.textureLibrary.length;
        
        // Enhanced random distribution with better coverage
        var texturesPerFace = Math.ceil(faces.length / numTextures);
        var faceAssignments = [];
        
        // Create balanced distribution - each texture gets roughly equal number of faces
        for (var t = 0; t < numTextures; t++) {
            for (var i = 0; i < texturesPerFace && faceAssignments.length < faces.length; i++) {
                faceAssignments.push(t);
            }
        }
        
        // Shuffle the assignments for randomness
        console.log("🎲 Random values for texture assignment (save these for fixed mapping):");
        console.log("📊 faceAssignments array length:", faceAssignments.length);
        console.log("📊 faceAssignments before shuffle:", JSON.stringify(faceAssignments));
        
        var randomValues = [];
        for (var i = faceAssignments.length - 1; i > 0; i--) {
            var randomValue = Math.random();
            var j = Math.floor(randomValue * (i + 1));
            randomValues.push(randomValue);
            console.log("Step " + (faceAssignments.length - 1 - i) + ": random=" + randomValue.toFixed(6) + ", j=" + j);
            var temp = faceAssignments[i];
            faceAssignments[i] = faceAssignments[j];
            faceAssignments[j] = temp;
        }
        console.log("📋 All random values: [" + randomValues.map(function(v) { return v.toFixed(6); }).join(", ") + "]");
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
        for (var texIdx in textureUsage) {
            var textureName = _globals.textureLibrary[texIdx] ? _globals.textureLibrary[texIdx].name : "Texture " + (parseInt(texIdx) + 1);
            console.log("- " + textureName + ": " + textureUsage[texIdx] + " faces");
        }
        
        // Debug: Show first few assignments
        console.log("📝 Sample assignments:", Object.keys(_globals.faceTextureMapping).slice(0, 10).map(function(faceIdx) {
            return "Face " + faceIdx + " → Texture " + _globals.faceTextureMapping[faceIdx];
        }));
        
        // Update display
        updateTextureList();
        
        // Update material to apply the new texture mapping
        if (_globals.colorMode === "texture") {
            console.log("🔄 Updating material with new texture mapping");
            _globals.model.setMeshMaterial();
        }
    }
    _globals.assignRandomTextures = assignRandomTextures;

    function createTextureAtlas() {
        if (_globals.textureLibrary.length === 0) return null;
        if (_globals.textureLibrary.length === 1) return _globals.textureLibrary[0];
        
        console.log("Creating texture atlas from", _globals.textureLibrary.length, "textures");
        
        // Calculate atlas dimensions
        var texturesPerRow = Math.ceil(Math.sqrt(_globals.textureLibrary.length));
        var texturesPerCol = Math.ceil(_globals.textureLibrary.length / texturesPerRow);
        
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
                   "Texture size:", textureSize + "x" + textureSize);
        
        // Store atlas layout information for UV mapping
        _globals.atlasLayout = {
            texturesPerRow: texturesPerRow,
            texturesPerCol: texturesPerCol,
            textureSize: textureSize,
            width: canvas.width,
            height: canvas.height,
            regions: [] // Initialize regions array
        };
        
        // Calculate regions for each texture
        for (var i = 0; i < _globals.textureLibrary.length; i++) {
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
        }
        
        // Clear canvas with transparent background
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw each texture to the atlas synchronously
        var successCount = 0;
        for (var i = 0; i < _globals.textureLibrary.length; i++) {
            var texture = _globals.textureLibrary[i];
            if (!texture || !texture.image) {
                console.warn("Texture", i, "has no image data, skipping");
                continue;
            }
            
            var row = Math.floor(i / texturesPerRow);
            var col = i % texturesPerRow;
            var x = col * textureSize;
            var y = row * textureSize;
            
            try {
                // Draw texture to atlas position
                ctx.drawImage(texture.image, x, y, textureSize, textureSize);
                console.log("Drew texture", i, texture.name, "at position", x + "," + y);
                successCount++;
            } catch (error) {
                console.error("Failed to draw texture", i, "to atlas:", error);
            }
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

    console.log("initGlobals function completed successfully");
    return _globals;
}

console.log("globals.js loaded successfully, initGlobals function defined");