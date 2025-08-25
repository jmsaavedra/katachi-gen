/**
 * Created by amandaghassaei on 2/24/17.
 */

//model updates object3d geometry and materials

function initModel(globals){

    var material, material2, geometry;
    var frontside = new THREE.Mesh();//front face of mesh
    var backside = new THREE.Mesh();//back face of mesh (different color)
    backside.visible = false;

    var lineMaterial = new THREE.LineBasicMaterial({color: 0x000000, linewidth: 1});
    var hingeLines = new THREE.LineSegments(null, lineMaterial);
    var mountainLines = new THREE.LineSegments(null, lineMaterial);
    var valleyLines = new THREE.LineSegments(null, lineMaterial);
    var cutLines = new THREE.LineSegments(null, lineMaterial);
    var facetLines = new THREE.LineSegments(null, lineMaterial);
    var borderLines = new THREE.LineSegments(null, lineMaterial);

    var lines = {
        U: hingeLines,
        M: mountainLines,
        V: valleyLines,
        C: cutLines,
        F: facetLines,
        B: borderLines
    };

    clearGeometries();
    setMeshMaterial();

    function clearGeometries(){

        if (geometry) {
            frontside.geometry = null;
            backside.geometry = null;
            geometry.dispose();
        }

        geometry = new THREE.BufferGeometry();
        frontside.geometry = geometry;
        backside.geometry = geometry;
        // geometry.verticesNeedUpdate = true;
        geometry.dynamic = true;

        _.each(lines, function(line){
            var lineGeometry = line.geometry;
            if (lineGeometry) {
                line.geometry = null;
                lineGeometry.dispose();
            }

            lineGeometry = new THREE.BufferGeometry();
            line.geometry = lineGeometry;
            // lineGeometry.verticesNeedUpdate = true;
            lineGeometry.dynamic = true;
        });
    }

    globals.threeView.sceneAddModel(frontside);
    globals.threeView.sceneAddModel(backside);
    _.each(lines, function(line){
        globals.threeView.sceneAddModel(line);
    });

    var positions;//place to store buffer geo vertex data
    var colors;//place to store buffer geo vertex colors
    var indices;
    var nodes = [];
    var faces = [];
    var edges = [];
    var creases = [];
    var vertices = [];//indexed vertices array
    var fold, creaseParams;

    var nextCreaseParams, nextFold;//todo only nextFold, nextCreases?

    var inited = false;

    function setMeshMaterial() {
        var polygonOffset = 0.5;
        if (globals.colorMode == "normal") {
            material = new THREE.MeshNormalMaterial({
                flatShading:true,
                side: THREE.FrontSide,  // 表面のみ
                polygonOffset: true,
                polygonOffsetFactor: polygonOffset, // positive value pushes polygon further away
                polygonOffsetUnits: 1
            });
            // 裏面用の白いマテリアルを追加
            material2 = new THREE.MeshPhongMaterial({
                color: 0xffffff,       // 白色
                flatShading: true,
                side: THREE.BackSide,  // 裏面のみ
                polygonOffset: true,
                polygonOffsetFactor: polygonOffset,
                polygonOffsetUnits: 1,
                transparent: false,
                opacity: 1.0
            });
            backside.visible = true;  // 裏面を表示
        } else if (globals.colorMode == "axialStrain"){
            material = new THREE.MeshBasicMaterial({
                vertexColors: THREE.VertexColors, 
                side: THREE.FrontSide,  // 表面のみ
                polygonOffset: true,
                polygonOffsetFactor: polygonOffset, // positive value pushes polygon further away
                polygonOffsetUnits: 1
            });
            // 裏面用の白いマテリアルを追加
            material2 = new THREE.MeshPhongMaterial({
                color: 0xffffff,       // 白色
                flatShading: true,
                side: THREE.BackSide,  // 裏面のみ
                polygonOffset: true,
                polygonOffsetFactor: polygonOffset,
                polygonOffsetUnits: 1,
                transparent: false,
                opacity: 1.0
            });
            backside.visible = true;  // 裏面を表示
            if (!globals.threeView.simulationRunning) {
                getSolver().render();
                setGeoUpdates();
            }
        } else if (globals.colorMode == "texture" && (globals.faceTexture || globals.textureLibrary.length > 0)) {
            console.log("🎨 Setting mesh material to simple texture mode");
            console.log("📋 Simple texture context:");
            console.log("  - faceTexture exists:", !!globals.faceTexture);
            console.log("  - useSimpleTextureMode:", !!globals.useSimpleTextureMode);
            console.log("  - isCellGeneratedTexture:", !!globals.isCellGeneratedTexture);
            
            var textureToUse = globals.faceTexture;
            
            // Only use texture if it's cell-generated or explicitly set
            if (!textureToUse && globals.textureLibrary.length > 0 && globals.isCellGeneratedTexture) {
                console.log("📝 Using first texture from library for cell-generated texture");
                textureToUse = globals.textureLibrary[0];
                globals.faceTexture = textureToUse;
            } else if (!textureToUse && globals.textureLibrary.length > 0 && !globals.isCellGeneratedTexture) {
                console.log("⏳ Waiting for cell-generated texture, skipping temporary texture application");
                // Don't apply temporary texture - wait for cellColorizer
                return;
            }
            
            if (textureToUse) {
                console.log("🔨 Creating texture material");
                console.log("📝 Texture details:");
                console.log("  - Name:", textureToUse.name || "atlas");
                console.log("  - Image dimensions:", textureToUse.image ? textureToUse.image.width + "x" + textureToUse.image.height : "N/A");
                console.log("  - Format:", textureToUse.format);
                console.log("  - Type:", textureToUse.type);
                
                // Enhanced texture material with subtle reflective properties
                material = new THREE.MeshPhongMaterial({
                    map: textureToUse,
                    flatShading: true,
                    side: THREE.FrontSide,  // 表面のみにテクスチャーを適用
                    polygonOffset: true,
                    polygonOffsetFactor: polygonOffset,
                    polygonOffsetUnits: 1,
                    // Subtle reflective properties to preserve texture visibility
                    shininess: 30,         // Moderate shininess
                    specular: 0x333333,    // Reduced specular reflection
                    reflectivity: 0.2,     // Low reflectivity
                    transparent: false,    // No transparency to keep texture colors vivid
                    opacity: 1.0
                });
                
                // 裏面用にテクスチャをクローンして反転させる
                console.log("🔄 Creating flipped texture for backside");
                var flippedTexture = textureToUse.clone();
                flippedTexture.needsUpdate = true;
                
                // テクスチャの反転設定（折り紙らしい反転）
                flippedTexture.wrapS = THREE.RepeatWrapping;
                flippedTexture.wrapT = THREE.RepeatWrapping;
                
                // 折り紙の裏面として自然に見えるように水平反転
                flippedTexture.repeat.x = -1; // 水平反転（鏡像効果）
                flippedTexture.repeat.y = 1;  // 垂直はそのまま
                flippedTexture.offset.x = 1;  // オフセットで位置調整
                flippedTexture.offset.y = 0;
                
                // さらに自然に見せるために色調を少し調整
                flippedTexture.matrix = new THREE.Matrix3();
                flippedTexture.matrixAutoUpdate = false;
                // 反転行列を適用
                flippedTexture.matrix.set(
                    -1, 0, 1,  // 水平反転
                     0, 1, 0,  // 垂直はそのまま
                     0, 0, 1
                );
                
                // 裏面用のテクスチャマテリアルを作成
                material2 = new THREE.MeshPhongMaterial({
                    map: flippedTexture,   // 反転したテクスチャを使用
                    flatShading: true,
                    side: THREE.BackSide,  // 裏面のみ
                    polygonOffset: true,
                    polygonOffsetFactor: polygonOffset,
                    polygonOffsetUnits: 1,
                    shininess: 20,         // 表面より少し控えめな光沢
                    specular: 0x111111,    // より控えめなスペキュラー
                    reflectivity: 0.1,     // 低い反射率
                    transparent: false,
                    opacity: 1.0
                });
                
                console.log("✅ Texture material created successfully");
                console.log("🔄 裏面マテリアルに反転テクスチャを設定（折り紙の裏面効果）");
                backside.visible = true;  // 裏面を表示
                
                // Check if this is a cell-generated texture that needs simple UV mapping
                console.log("🔍 Checking UV mapping condition:");
                console.log("  - globals.isCellGeneratedTexture:", !!globals.isCellGeneratedTexture);
                console.log("  - globals.useSimpleTextureMode:", !!globals.useSimpleTextureMode);
                console.log("  - Combined condition:", !!(globals.isCellGeneratedTexture && globals.useSimpleTextureMode));
                
                if (globals.isCellGeneratedTexture && globals.useSimpleTextureMode) {
                    console.log("🎯 Using simple UV mapping for cell-generated texture");
                    setSimpleUVMapping();
                } else {
                    // Update UV coordinates for face-based texture mapping
                    console.log("🔄 Updating UV coordinates for texture mapping (fallback)");
                    updateFaceBasedUVs();
                }
                console.log("✅ Texture material applied successfully");
            } else {
                console.warn("⚠️ Texture mode selected but no texture available, falling back to color mode");
                globals.colorMode = "color";
                // Fall through to color mode
                material = new THREE.MeshPhongMaterial({
                    flatShading:true,
                    side:THREE.FrontSide,
                    polygonOffset: true,
                    polygonOffsetFactor: polygonOffset, // positive value pushes polygon further away
                    polygonOffsetUnits: 1,
                    // Subtle reflective properties
                    shininess: 25,
                    specular: 0x222222,
                    reflectivity: 0.15,
                    transparent: true,  // Enable transparency for default surfaces
                    opacity: globals.defaultOpacity || 0.0  // Use transparent default opacity
                });
                material2 = new THREE.MeshPhongMaterial({
                    flatShading:true,
                    side:THREE.BackSide,
                    polygonOffset: true,
                    polygonOffsetFactor: polygonOffset, // positive value pushes polygon further away
                    polygonOffsetUnits: 1,
                    // Subtle reflective properties
                    shininess: 25,
                    specular: 0x222222,
                    reflectivity: 0.15,
                    transparent: false,    // 不透明に変更
                    opacity: 1.0,         // 完全に不透明
                    color: 0xffffff       // 白色に設定
                });
                
                // For transparent surfaces, color setting is optional
                if (globals.defaultOpacity > 0) {
                    material.color.setStyle( "#" + globals.color1);
                    material2.color.setStyle( "#" + globals.color2);
                } else {
                    console.log("🔍 Fallback surfaces set to transparent - color not applied");
                }
                backside.visible = true;
            }
        } else {
            // Standard color mode - white surfaces
            material = new THREE.MeshPhongMaterial({
                flatShading:true,
                side:THREE.FrontSide,
                polygonOffset: true,
                polygonOffsetFactor: polygonOffset, // positive value pushes polygon further away
                polygonOffsetUnits: 1,
                // Subtle reflective properties
                shininess: 25,         // Low shininess
                specular: 0x222222,    // Reduced specular reflection
                reflectivity: 0.15,    // Low reflectivity
                transparent: false,    // 表面を不透明に変更
                opacity: 1.0,          // 完全に不透明
                color: 0xffffff        // 表面を白色に設定
            });
            material2 = new THREE.MeshPhongMaterial({
                flatShading:true,
                side:THREE.BackSide,
                polygonOffset: true,
                polygonOffsetFactor: polygonOffset, // positive value pushes polygon further away
                polygonOffsetUnits: 1,
                // Subtle reflective properties
                shininess: 25,         // Low shininess
                specular: 0x222222,    // Reduced specular reflection
                reflectivity: 0.15,    // Low reflectivity
                transparent: false,    // 裏面を不透明に変更
                opacity: 1.0,          // 完全に不透明
                color: 0xffffff        // 裏面を白色に設定
            });
            // For transparent surfaces, color setting is optional
            if (globals.defaultOpacity > 0) {
                material.color.setStyle( "#" + globals.color1);
                material2.color.setStyle( "#" + globals.color2);
            } else {
                console.log("🔍 Surfaces set to transparent - color not applied");
            }
            backside.visible = true;
        }
        
        console.log("🔗 Applying materials to mesh objects");
        console.log("📋 Material assignment:");
        console.log("  - frontside material type:", material.type);
        console.log("  - frontside has texture map:", !!material.map);
        if (material.map) {
            console.log("  - texture dimensions:", material.map.image ? material.map.image.width + "x" + material.map.image.height : "N/A");
        }
        console.log("  - backside material type:", material2.type);
        
        frontside.material = material;
        backside.material = material2;
        
        // If in NFT processing mode, ensure objects remain hidden
        if (globals.isNFTProcessing || globals.hideUntilTextured) {
            console.log('🙈 NFT processing detected in setMeshMaterial - forcing objects hidden');
            frontside.visible = false;
            backside.visible = false;
        } else {
            // If origami is visible and has textures, start auto rotation
            if (globals.colorMode == "texture" && (globals.faceTexture || globals.textureLibrary.length > 0)) {
                if (globals.threeView && globals.threeView.startAutoRotation && !globals.autoRotateEnabled) {
                    console.log('🎬 Textures applied - starting auto rotation animation');
                    globals.threeView.startAutoRotation(true, 6000); // Random rotation, change every 6 seconds
                    
                    // Also start slider animation
                    if (globals.threeView.startSliderAnimation) {
                        setTimeout(function() {
                            globals.threeView.startSliderAnimation(0, 100, 5000, true, 5000); // 5s animation, loop enabled, 5s pause
                        }, globals.autoRotateWaitTime + 1000); // Start 1 second after rotation begins
                    }
                }
            }
        }
        
        console.log("✅ Materials successfully applied to mesh");
        console.log("🎨 Material configuration:");
        console.log("  - Frontside color:", material.color ? "#" + material.color.getHexString() : "N/A");
        console.log("  - Backside color:", material2.color ? "#" + material2.color.getHexString() : "N/A");
        console.log("  - Frontside visible:", frontside.visible);
        console.log("  - Backside visible:", backside.visible);
        console.log("  - Frontside opacity:", material.opacity);
        console.log("  - Backside opacity:", material2.opacity);
    }

    function updateEdgeVisibility(){
        // If hideUntilTextured is true, hide edges too
        if (globals.hideUntilTextured) {
            mountainLines.visible = false;
            valleyLines.visible = false;
            facetLines.visible = false;
            hingeLines.visible = false;
            borderLines.visible = false;
            cutLines.visible = false;
            return;
        }
        
        // Normal edge visibility logic
        mountainLines.visible = globals.edgesVisible && globals.mtnsVisible;
        valleyLines.visible = globals.edgesVisible && globals.valleysVisible;
        facetLines.visible = globals.edgesVisible && globals.panelsVisible;
        hingeLines.visible = globals.edgesVisible && globals.passiveEdgesVisible;
        borderLines.visible = globals.edgesVisible && globals.boundaryEdgesVisible;
        cutLines.visible = false;
    }

    function updateMeshVisibility(){
        // If hideUntilTextured is true, keep objects hidden regardless of other settings
        if (globals.hideUntilTextured) {
            frontside.visible = false;
            backside.visible = false;
            return;
        }
        
        // Normal visibility logic
        frontside.visible = globals.meshVisible;
        // Always show backside when mesh is visible (白いマテリアルが適用されている)
        backside.visible = globals.meshVisible;
    }

    function hideOrigami(){
        console.log('🙈 Hiding origami object until textures are ready');
        if (frontside) frontside.visible = false;
        if (backside) backside.visible = false;
        if (edges) edges.visible = false;
        globals.hideUntilTextured = true;
    }

    function showOrigami(){
        console.log('👁️ Showing origami object - textures applied');
        globals.hideUntilTextured = false;
        
        // Hide loading screen when origami is ready
        console.log('🎬 Hiding loading screen - origami is ready to display');
        hideLoadingScreen();
        
        // Restore normal visibility based on settings
        if (frontside) frontside.visible = globals.meshVisible;
        // Always show backside when mesh is visible (白いマテリアルが適用されている)
        if (backside) backside.visible = globals.meshVisible;
        if (edges) edges.visible = true; // Edges are usually visible
        updateEdgeVisibility(); // Apply edge visibility settings
        
        // Start auto rotation animation when origami becomes visible with textures
        if (globals.threeView && globals.threeView.startAutoRotation) {
            console.log('🎬 Triggering auto rotation animation after origami is shown');
            globals.threeView.startAutoRotation(true, 6000); // Random rotation, change every 6 seconds
            
            // Also start slider animation from min to max
            if (globals.threeView.startSliderAnimation) {
                setTimeout(function() {
                    globals.threeView.startSliderAnimation(0, 100, 5000, true, 5000); // 5s animation, loop enabled, 5s pause
                }, globals.autoRotateWaitTime + 1000); // Start 1 second after rotation begins
            }
        }
    }

    function hideLoadingScreen() {
        try {
            console.log('🎬 Model.js requesting loading screen hide');
            
            // Use global function if available
            if (typeof window !== 'undefined' && window.hideLoadingScreenGlobal) {
                window.hideLoadingScreenGlobal();
            } else {
                // Fallback to direct DOM manipulation
                var loadingScreen = document.getElementById('loadingScreen');
                if (loadingScreen) {
                    console.log('🎬 Hiding loading screen with fade-out animation (fallback)');
                    
                    // Add fade-out class for smooth animation
                    document.body.classList.add('fade-out-loading');
                    
                    // Remove the loading screen after animation completes
                    setTimeout(function() {
                        loadingScreen.style.display = 'none';
                        document.body.classList.remove('fade-out-loading');
                        document.body.classList.add('loading-hidden');
                        console.log('✅ Loading screen hidden successfully (fallback)');
                    }, 800); // Match the animation duration
                } else {
                    console.log('⚠️ Loading screen element not found');
                }
            }
        } catch (error) {
            console.error('❌ Error hiding loading screen:', error);
        }
    }

    function getGlobalBounds(vertices) {
        var minX = Infinity, minY = Infinity;
        var maxX = -Infinity, maxY = -Infinity;
        
        for (var i = 0; i < vertices.length; i++) {
            var x = vertices[i][0];
            var y = vertices[i][1];
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        }
        
        return {
            minX: minX,
            maxX: maxX,
            minY: minY,
            maxY: maxY
        };
    }

    function getOriginalBounds(originalVertices) {
        var minX = Infinity, minY = Infinity;
        var maxX = -Infinity, maxY = -Infinity;
        
        for (var i = 0; i < originalVertices.length; i++) {
            var x = originalVertices[i][0];
            var y = originalVertices[i][1];
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        }
        
        return {
            minX: minX,
            maxX: maxX,
            minY: minY,
            maxY: maxY
        };
    }

    function getGeometryBounds(positionsArray) {
        var minX = Infinity, minY = Infinity, minZ = Infinity;
        var maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        
        for (var i = 0; i < positionsArray.length; i += 3) {
            var x = positionsArray[i];
            var y = positionsArray[i + 1];
            var z = positionsArray[i + 2];
            
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
            minZ = Math.min(minZ, z);
            maxZ = Math.max(maxZ, z);
        }
        
        return {
            minX: minX, maxX: maxX,
            minY: minY, maxY: maxY,
            minZ: minZ, maxZ: maxZ
        };
    }

    function setSimpleUVMapping() {
        console.log("🎯 Setting simple UV mapping for cell-generated texture");
        
        if (!geometry || !geometry.attributes || !geometry.attributes.position) {
            console.warn("❌ Cannot set simple UV mapping: geometry not available");
            return;
        }
        
        var positions = geometry.attributes.position.array;
        var vertexCount = positions.length / 3;
        
        console.log("📐 Creating simple UV mapping for", vertexCount, "vertices");
        
        // Create simple UV coordinates (0,0) to (1,1) mapping
        var uvs = new Float32Array(vertexCount * 2);
        
        // Get fold data for consistent coordinate transformation
        var fold = globals.cellColorizerFoldData || globals.fold;
        if (!fold || !fold.vertices_coords) {
            console.warn("❌ No fold data available for consistent UV mapping");
            console.log("🔍 Available globals:", {
                cellColorizerFoldData: !!globals.cellColorizerFoldData,
                globalsFold: !!globals.fold,
                cellColorizerTransformParams: !!globals.cellColorizerTransformParams
            });
            return;
        }
        
        console.log("✅ Using fold data with", fold.vertices_coords.length, "vertices");
        
        // Get original 2D pattern bounds using the EXACT same method as cellColorizer
        var minX = Infinity, minZ = Infinity;
        var maxX = -Infinity, maxZ = -Infinity;
        
        // Use the same getBoundingBox logic as cellColorizer
        for (var i = 0; i < fold.vertices_coords.length; i++) {
            var vertex = fold.vertices_coords[i];
            var x = vertex[0];
            var z = vertex[2]; // Using Z coordinate for 2D projection (same as cellColorizer)
            
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minZ = Math.min(minZ, z);
            maxZ = Math.max(maxZ, z);
        }
        
        var patternWidth = maxX - minX;
        var patternHeight = maxZ - minZ;
        
        console.log("📊 Pattern bounds from fold data (same as cellColorizer):", {minX, maxX, minZ, maxZ});
        console.log("📊 Pattern dimensions from fold data:", patternWidth.toFixed(3), "x", patternHeight.toFixed(3));
        
        // Use the EXACT same canvas dimensions and transformation parameters from cellColorizer
        var canvasWidth, canvasHeight;
        var scale, offsetX, offsetY;
        
        if (globals.cellColorizerCanvasWidth && globals.cellColorizerCanvasHeight && 
            globals.cellColorizerScale !== null && globals.cellColorizerOffsetX !== null && globals.cellColorizerOffsetY !== null) {
            // Use exact same parameters as cellColorizer
            canvasWidth = globals.cellColorizerCanvasWidth;
            canvasHeight = globals.cellColorizerCanvasHeight;
            scale = globals.cellColorizerScale;
            offsetX = globals.cellColorizerOffsetX;
            offsetY = globals.cellColorizerOffsetY;
            
            console.log("📋 Using cellColorizer parameters:");
            console.log("  - canvas size:", canvasWidth + "x" + canvasHeight);
            console.log("  - scale:", scale.toFixed(3));
            console.log("  - offset:", offsetX.toFixed(1) + "," + offsetY.toFixed(1));
        } else {
            // Fallback: calculate parameters (same logic as cellColorizer)
            console.log("⚠️ cellColorizer parameters not available, calculating fallback...");
            
            var aspectRatio = patternWidth / patternHeight;
            
            if (aspectRatio >= 1) {
                canvasWidth = 2048;
                canvasHeight = Math.round(2048 / aspectRatio);
            } else {
                canvasHeight = 2048;
                canvasWidth = Math.round(2048 * aspectRatio);
            }
            
            canvasWidth = Math.max(canvasWidth, 512);
            canvasHeight = Math.max(canvasHeight, 512);
            
            var scaleX = canvasWidth / patternWidth;
            var scaleY = canvasHeight / patternHeight;
            scale = Math.min(scaleX, scaleY);
            
            var scaledWidth = patternWidth * scale;
            var scaledHeight = patternHeight * scale;
            offsetX = (canvasWidth - scaledWidth) / 2;
            offsetY = (canvasHeight - scaledHeight) / 2;
            
            console.log("� Fallback parameters:");
            console.log("  - canvas size:", canvasWidth + "x" + canvasHeight);
            console.log("  - scale:", scale.toFixed(3));
            console.log("  - offset:", offsetX.toFixed(1) + "," + offsetY.toFixed(1));
        }
        
        // Create UV mapping using EXACT same transformation as cellColorizer
        for (var i = 0; i < vertexCount; i++) {
            // Use fold data coordinates instead of geometry positions for consistency
            if (i < fold.vertices_coords.length) {
                var vertex = fold.vertices_coords[i];
                var x = vertex[0];
                var z = vertex[2];
            } else {
                // Fallback to geometry positions if fold data is insufficient
                var x = positions[i * 3];
                var z = positions[i * 3 + 2];
            }
            
            // Transform to canvas coordinates (EXACT same as cellColorizer transformPoint)
            var canvasX = (x - minX) * scale + offsetX;
            var canvasY = (z - minZ) * scale + offsetY; // Normal coordinate mapping since canvas is already rotated
            
            // Normalize to [0,1] UV space
            var u = canvasX / canvasWidth;
            var v = canvasY / canvasHeight;
            
            // No additional coordinate transformation needed - canvas is already properly oriented
            
            // Clamp to [0,1] range
            u = Math.max(0, Math.min(1, u));
            v = Math.max(0, Math.min(1, v));
            
            uvs[i * 2] = u;
            uvs[i * 2 + 1] = v;
            
            // Debug first few vertices
            if (i < 5) {
                console.log("Vertex", i, "3D[" + x.toFixed(3) + ", " + z.toFixed(3) + "] → Canvas[" + canvasX.toFixed(1) + ", " + canvasY.toFixed(1) + "] → UV[" + u.toFixed(3) + ", " + v.toFixed(3) + "]");
            }
        }
        
        console.log("📊 Generated", uvs.length / 2, "simple UV coordinates");
        
        // Apply UV coordinates to geometry
        if (geometry.attributes.uv) {
            geometry.attributes.uv.array = uvs;
            geometry.attributes.uv.needsUpdate = true;
        } else {
            geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        }
        
        console.log("✅ Simple UV mapping applied successfully");
    }

    function updateFaceBasedUVs(){
        console.log("🎯 updateFaceBasedUVs: Using cellColorizer-compatible UV mapping");
        
        if (!geometry) {
            console.warn("❌ Cannot update UVs: geometry not available");
            return;
        }
        
        // Use the EXACT same parameters as cellColorizer if available
        if (globals.cellColorizerCanvasWidth && globals.cellColorizerCanvasHeight && 
            globals.cellColorizerScale !== null && globals.cellColorizerOffsetX !== null && globals.cellColorizerOffsetY !== null) {
            
            console.log("🎯 Using stored cellColorizer parameters for updateFaceBasedUVs");
            
            var canvasWidth = globals.cellColorizerCanvasWidth;
            var canvasHeight = globals.cellColorizerCanvasHeight;
            var scale = globals.cellColorizerScale;
            var offsetX = globals.cellColorizerOffsetX;
            var offsetY = globals.cellColorizerOffsetY;
            
            // Get fold data for bounding box (same as cellColorizer)
            var fold = globals.cellColorizerFoldData || globals.fold;
            if (!fold || !fold.vertices_coords) {
                console.warn("❌ No fold data available for updateFaceBasedUVs");
                console.log("🔍 Available globals for updateFaceBasedUVs:", {
                    cellColorizerFoldData: !!globals.cellColorizerFoldData,
                    globalsFold: !!globals.fold
                });
                return;
            }
            
            console.log("✅ updateFaceBasedUVs using fold data with", fold.vertices_coords.length, "vertices");
            
            // Get same bounding box as cellColorizer
            var minX = Infinity, minZ = Infinity;
            var maxX = -Infinity, maxZ = -Infinity;
            
            for (var i = 0; i < fold.vertices_coords.length; i++) {
                var vertex = fold.vertices_coords[i];
                var x = vertex[0];
                var z = vertex[2]; // Use Z coordinate (same as cellColorizer)
                
                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x);
                minZ = Math.min(minZ, z);
                maxZ = Math.max(maxZ, z);
            }
            
            console.log("📊 updateFaceBasedUVs parameters:");
            console.log("  - canvas size:", canvasWidth + "x" + canvasHeight);
            console.log("  - scale:", scale.toFixed(3));
            console.log("  - offset:", offsetX.toFixed(1) + "," + offsetY.toFixed(1));
            console.log("  - bounding box:", {minX, maxX, minZ, maxZ});
            
            // Apply UV mapping to geometry vertices
            var positions = geometry.attributes.position.array;
            var vertexCount = positions.length / 3;
            var uvs = new Float32Array(vertexCount * 2);
            
            for (var i = 0; i < vertexCount; i++) {
                // Use fold data coordinates for consistency
                if (i < fold.vertices_coords.length) {
                    var vertex = fold.vertices_coords[i];
                    var x = vertex[0];
                    var z = vertex[2];
                } else {
                    // Fallback to geometry positions
                    var x = positions[i * 3];
                    var z = positions[i * 3 + 2];
                }
                
                // Transform to canvas coordinates (EXACT same as cellColorizer)
                var canvasX = (x - minX) * scale + offsetX;
                var canvasY = (z - minZ) * scale + offsetY;
                
                // Normalize to [0,1] UV space
                var u = canvasX / canvasWidth;
                var v = canvasY / canvasHeight;
                
                // Clamp to [0,1] range
                u = Math.max(0, Math.min(1, u));
                v = Math.max(0, Math.min(1, v));
                
                uvs[i * 2] = u;
                uvs[i * 2 + 1] = v;
            }
            
            // Apply UV coordinates to geometry
            if (geometry.attributes.uv) {
                geometry.attributes.uv.array = uvs;
                geometry.attributes.uv.needsUpdate = true;
            } else {
                geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
            }
            
            console.log("✅ updateFaceBasedUVs: Applied cellColorizer-compatible UV mapping");
            
        } else {
            console.log("⚠️ updateFaceBasedUVs: cellColorizer parameters not available, using fallback");
            // Fallback to simple UV mapping
            createBasicUVMapping();
        }
    }

    function createBasicUVMapping() {
        console.log("� Creating basic UV mapping for geometry");
        
        if (!geometry || !geometry.attributes || !geometry.attributes.position) {
            console.warn("❌ Cannot create basic UV mapping: no position data");
            return;
        }
        
        var positions = geometry.attributes.position.array;
        var vertexCount = positions.length / 3;
        var uvs = new Float32Array(vertexCount * 2);
        
        // Simple planar projection
        for (var i = 0; i < vertexCount; i++) {
            var x = positions[i * 3];
            var z = positions[i * 3 + 2];
            
            // Normalize coordinates to [0,1] range
            var u = (x + 1) * 0.5;
            var v = (z + 1) * 0.5;
            
            uvs[i * 2] = Math.max(0, Math.min(1, u));
            uvs[i * 2 + 1] = Math.max(0, Math.min(1, v));
        }
        
        if (geometry.attributes.uv) {
            geometry.attributes.uv.array = uvs;
            geometry.attributes.uv.needsUpdate = true;
        } else {
            geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        }
        
        console.log("✅ Basic UV mapping created for", vertexCount, "vertices");
    }

    function getGeometry(){
        return geometry;
    }

    function getMesh(){
        return [frontside, backside];
    }

    function getPositionsArray(){
        return positions;
    }

    function getColorsArray(){
        return colors;
    }

    function pause(){
        globals.threeView.pauseSimulation();
    }

    function resume(){
        globals.threeView.startSimulation();
    }

    function reset(){
        getSolver().reset();
        setGeoUpdates();
    }

    function step(numSteps){
        getSolver().solve(numSteps);
        setGeoUpdates();
    }

    function setGeoUpdates(){
        geometry.attributes.position.needsUpdate = true;
        if (globals.colorMode == "axialStrain") geometry.attributes.color.needsUpdate = true;
        if (globals.userInteractionEnabled || globals.vrEnabled) geometry.computeBoundingBox();
    }

    function startSolver(){
        globals.threeView.startAnimation();
    }

    function getSolver(){
        if (globals.simType == "dynamic") return globals.dynamicSolver;
        else if (globals.simType == "static") return globals.staticSolver;
        return globals.rigidSolver;
    }




    function buildModel(fold, creaseParams){

        if (fold.vertices_coords.length == 0) {
            globals.warn("No geometry found.");
            return;
        }
        if (fold.faces_vertices.length == 0) {
            globals.warn("No faces found, try adjusting import vertex merge tolerance.");
            return;
        }
        if (fold.edges_vertices.length == 0) {
            globals.warn("No edges found.");
            return;
        }

        nextFold = fold;
        nextCreaseParams = creaseParams;

        globals.needsSync = true;
        globals.simNeedsSync = true;

        if (!inited) {
            startSolver();//start animation loop
            inited = true;
        }
    }



    function sync(){

        for (var i=0;i<nodes.length;i++){
            nodes[i].destroy();
        }

        for (var i=0;i<edges.length;i++){
            edges[i].destroy();
        }

        for (var i=0;i<creases.length;i++){
            creases[i].destroy();
        }

        fold = nextFold;
        nodes = [];
        edges = [];
        faces = fold.faces_vertices;
        creases = [];
        creaseParams = nextCreaseParams;
        var _edges = fold.edges_vertices;

        var _vertices = [];
        for (var i=0;i<fold.vertices_coords.length;i++){
            var vertex = fold.vertices_coords[i];
            _vertices.push(new THREE.Vector3(vertex[0], vertex[1], vertex[2]));
        }

        for (var i=0;i<_vertices.length;i++){
            nodes.push(new Node(_vertices[i].clone(), nodes.length));
        }
        // _nodes[_faces[0][0]].setFixed(true);
        // _nodes[_faces[0][1]].setFixed(true);
        // _nodes[_faces[0][2]].setFixed(true);

        for (var i=0;i<_edges.length;i++) {
            edges.push(new Beam([nodes[_edges[i][0]], nodes[_edges[i][1]]]));
        }

        for (var i=0;i<creaseParams.length;i++) {//allCreaseParams.length
            var _creaseParams = creaseParams[i];//face1Ind, vert1Ind, face2Ind, ver2Ind, edgeInd, angle
            var type = _creaseParams[5]!=0 ? 1:0;
            //edge, face1Index, face2Index, targetTheta, type, node1, node2, index
            creases.push(new Crease(
                edges[_creaseParams[4]],
                _creaseParams[0],
                _creaseParams[2],
                _creaseParams[5] * Math.PI / 180,  // convert back to radians for the GPU math
                type,
                nodes[_creaseParams[1]],
                nodes[_creaseParams[3]],
                creases.length));
        }

        vertices = [];
        for (var i=0;i<nodes.length;i++){
            vertices.push(nodes[i].getOriginalPosition());
        }

        if (globals.noCreasePatternAvailable() && globals.navMode == "pattern"){
            //switch to simulation mode
            $("#navSimulation").parent().addClass("open");
            $("#navPattern").parent().removeClass("open");
            $("#svgViewer").hide();
            globals.navMode = "simulation";
        }

        positions = new Float32Array(vertices.length*3);
        colors = new Float32Array(vertices.length*3);
        indices = new Uint16Array(faces.length*3);

        for (var i=0;i<vertices.length;i++){
            positions[3*i] = vertices[i].x;
            positions[3*i+1] = vertices[i].y;
            positions[3*i+2] = vertices[i].z;
        }
        for (var i=0;i<faces.length;i++){
            var face = faces[i];
            indices[3*i] = face[0];
            indices[3*i+1] = face[1];
            indices[3*i+2] = face[2];
        }

        clearGeometries();

        var positionsAttribute = new THREE.BufferAttribute(positions, 3);

        var lineIndices = {
            U: [],
            V: [],
            M: [],
            B: [],
            F: [],
            C: []
        };
        for (var i=0;i<fold.edges_assignment.length;i++){
            var edge = fold.edges_vertices[i];
            var assignment = fold.edges_assignment[i];
            lineIndices[assignment].push(edge[0]);
            lineIndices[assignment].push(edge[1]);
        }
        _.each(lines, function(line, key){
            var indicesArray = lineIndices[key];
            var indices = new Uint16Array(indicesArray.length);
            for (var i=0;i<indicesArray.length;i++){
                indices[i] = indicesArray[i];
            }
            lines[key].geometry.addAttribute('position', positionsAttribute);
            lines[key].geometry.setIndex(new THREE.BufferAttribute(indices, 1));
            // lines[key].geometry.attributes.position.needsUpdate = true;
            // lines[key].geometry.index.needsUpdate = true;
            lines[key].geometry.computeBoundingBox();
            lines[key].geometry.computeBoundingSphere();
            lines[key].geometry.center();
        });

        geometry.addAttribute('position', positionsAttribute);
        geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setIndex(new THREE.BufferAttribute(indices, 1));
        
        // Initialize UV coordinates (for texture mapping)
        var uvArray = new Float32Array(vertices.length * 2);
        for (var i = 0; i < vertices.length; i++) {
            uvArray[2 * i] = 0.0;     // u coordinate
            uvArray[2 * i + 1] = 0.0; // v coordinate
        }
        geometry.addAttribute('uv', new THREE.BufferAttribute(uvArray, 2));
        
        // geometry.attributes.position.needsUpdate = true;
        // geometry.index.needsUpdate = true;
        // geometry.verticesNeedUpdate = true;
        geometry.computeVertexNormals();
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
        geometry.center();

        var scale = 1/geometry.boundingSphere.radius;
        globals.scale = scale;

        //scale geometry
        for (var i=0;i<positions.length;i++){
            positions[i] *= scale;
        }
        for (var i=0;i<vertices.length;i++){
            vertices[i].multiplyScalar(scale);
        }

        //update vertices and edges
        for (var i=0;i<vertices.length;i++){
            nodes[i].setOriginalPosition(positions[3*i], positions[3*i+1], positions[3*i+2]);
        }
        for (var i=0;i<edges.length;i++){
            edges[i].recalcOriginalLength();
        }

        updateEdgeVisibility();
        updateMeshVisibility();
        
        // If in NFT processing mode, override visibility to keep objects hidden
        if (globals.isNFTProcessing || globals.hideUntilTextured) {
            console.log('🙈 NFT processing detected in buildModel - forcing objects hidden');
            if (frontside) frontside.visible = false;
            if (backside) backside.visible = false;
            if (edges) edges.visible = false;
        }

        syncSolver();

        globals.needsSync = false;
        if (!globals.simulationRunning) reset();
    }

    function syncSolver(){
        getSolver().syncNodesAndEdges();
        globals.simNeedsSync = false;
    }

    function getNodes(){
        return nodes;
    }

    function getEdges(){
        return edges;
    }

    function getFaces(){
        return faces;
    }

    function getCreases(){
        return creases;
    }

    function getDimensions(){
        geometry.computeBoundingBox();
        return geometry.boundingBox.max.clone().sub(geometry.boundingBox.min);
    }
    
    function updateUVMapping() {
        console.log("🔄 updateUVMapping called - determining which mapping method to use");
        
        // Check if we have fold data for face-based mapping
        if (globals.fold && globals.fold.faces_vertices && globals.fold.vertices_coords) {
            console.log("📐 Using face-based UV mapping");
            updateFaceBasedUVs();
        } else if (geometry && geometry.attributes && geometry.attributes.position) {
            console.log("📦 Using basic geometry UV mapping");
            createBasicUVMapping();
        } else {
            console.warn("❌ Cannot update UV mapping: no geometry data available");
        }
    }

    return {
        pause: pause,
        resume: resume,
        reset: reset,
        step: step,

        getNodes: getNodes,
        getEdges: getEdges,
        getFaces: getFaces,
        getCreases: getCreases,
        getGeometry: getGeometry,//for save stl
        getPositionsArray: getPositionsArray,
        getColorsArray: getColorsArray,
        getMesh: getMesh,

        buildModel: buildModel,//load new model
        sync: sync,//update geometry to new model
        syncSolver: syncSolver,//update solver params

        //rendering
        setMeshMaterial: setMeshMaterial,
        updateEdgeVisibility: updateEdgeVisibility,
        updateMeshVisibility: updateMeshVisibility,
        updateUVMapping: updateUVMapping,
        hideOrigami: hideOrigami,
        showOrigami: showOrigami,

        getDimensions: getDimensions//for save stl
    }
    
    // Initial setup for NFT processing mode
    if (window.editMode === false) {
        console.log('🙈 Edit mode disabled - setting initial hide state for NFT processing');
        globals.hideUntilTextured = true;
    }
    
    return model;
}