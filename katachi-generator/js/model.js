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
                side: THREE.DoubleSide,
                polygonOffset: true,
                polygonOffsetFactor: polygonOffset, // positive value pushes polygon further away
                polygonOffsetUnits: 1
            });
            backside.visible = false;
        } else if (globals.colorMode == "axialStrain"){
            material = new THREE.MeshBasicMaterial({
                vertexColors: THREE.VertexColors, side:THREE.DoubleSide,
                polygonOffset: true,
                polygonOffsetFactor: polygonOffset, // positive value pushes polygon further away
                polygonOffsetUnits: 1
            });
            backside.visible = false;
            if (!globals.threeView.simulationRunning) {
                getSolver().render();
                setGeoUpdates();
            }
        } else if (globals.colorMode == "texture" && (globals.faceTexture || globals.textureLibrary.length > 0)) {
            console.log("🎨 Setting mesh material to texture mode");
            console.log("📋 Material context:");
            console.log("  - textureLibrary size:", globals.textureLibrary.length);
            console.log("  - faceTexture exists:", !!globals.faceTexture);
            console.log("  - faceTextureMapping size:", globals.faceTextureMapping ? Object.keys(globals.faceTextureMapping).length : 0);
            console.log("  - textureAtlas exists:", !!globals.textureAtlas);
            
            var textureToUse = globals.faceTexture;
            
            // Enable multi-texture support with atlas
            if (globals.textureLibrary.length > 1 && globals.faceTextureMapping && Object.keys(globals.faceTextureMapping).length > 0) {
                console.log("🔄 Creating texture atlas for", globals.textureLibrary.length, "textures");
                textureToUse = globals.createTextureAtlas();
                if (textureToUse) {
                    globals.faceTexture = textureToUse;
                    console.log("✅ Texture atlas created successfully");
                    console.log("📊 Atlas dimensions:", textureToUse.image.width + "x" + textureToUse.image.height);
                } else {
                    console.warn("❌ Failed to create texture atlas, using first texture");
                    textureToUse = globals.textureLibrary[0];
                }
            } else if (!textureToUse && globals.textureLibrary.length > 0) {
                console.log("📝 Using first texture from library");
                textureToUse = globals.textureLibrary[0];
                globals.faceTexture = textureToUse;
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
                    side: THREE.DoubleSide,
                    polygonOffset: true,
                    polygonOffsetFactor: polygonOffset,
                    polygonOffsetUnits: 1,
                    // Subtle reflective properties to preserve texture visibility
                    shininess: 30,         // Moderate shininess
                    specular: 0x333333,    // Reduced specular reflection
                    reflectivity: 0.2,     // Low reflectivity
                    transparent: false,    // No transparency to keep colors vivid
                    opacity: 1.0
                });
                
                console.log("✅ Texture material created successfully");
                backside.visible = false;
                
                // Update UV coordinates for face-based texture mapping
                console.log("🔄 Updating UV coordinates for texture mapping");
                updateFaceBasedUVs();
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
                    transparent: false,
                    opacity: 1.0
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
                    transparent: false,
                    opacity: 1.0
                });
                material.color.setStyle( "#" + globals.color1);
                material2.color.setStyle( "#" + globals.color2);
                backside.visible = true;
            }
        } else {
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
                transparent: false,
                opacity: 1.0
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
                transparent: false,
                opacity: 1.0
            });
            material.color.setStyle( "#" + globals.color1);
            material2.color.setStyle( "#" + globals.color2);
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
        
        console.log("✅ Materials successfully applied to mesh");
    }

    function updateEdgeVisibility(){
        mountainLines.visible = globals.edgesVisible && globals.mtnsVisible;
        valleyLines.visible = globals.edgesVisible && globals.valleysVisible;
        facetLines.visible = globals.edgesVisible && globals.panelsVisible;
        hingeLines.visible = globals.edgesVisible && globals.passiveEdgesVisible;
        borderLines.visible = globals.edgesVisible && globals.boundaryEdgesVisible;
        cutLines.visible = false;
    }

    function updateMeshVisibility(){
        frontside.visible = globals.meshVisible;
        backside.visible = globals.colorMode == "color" && globals.meshVisible;
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

    function updateFaceBasedUVs(){
        console.log("🔍 Checking UV update requirements...");
        console.log("- geometry:", !!geometry);
        console.log("- globals.fold:", !!globals.fold);
        console.log("- globals.fold.faces_vertices:", globals.fold ? !!globals.fold.faces_vertices : false);
        console.log("- globals.fold.vertices_coords:", globals.fold ? !!globals.fold.vertices_coords : false);
        
        if (!geometry) {
            console.warn("❌ Cannot update UVs: geometry not available");
            return;
        }
        
        // Try to use fold data first, then fall back to geometry-based UV mapping
        var faces, originalVertices;
        var useGeometryFallback = false;
        
        if (globals.fold && globals.fold.faces_vertices && globals.fold.vertices_coords) {
            console.log("✅ Using fold data for UV mapping");
            faces = globals.fold.faces_vertices;
            originalVertices = globals.fold.vertices_coords;
        } else {
            console.log("⚠️ No fold data available, using geometry-based UV mapping");
            useGeometryFallback = true;
            
            // Create basic UV mapping for existing geometry
            if (geometry && geometry.attributes && geometry.attributes.position) {
                console.log("📐 Creating UV mapping for existing geometry");
                createBasicUVMapping();
                return;
            } else {
                console.warn("❌ Cannot create UV mapping: no position data in geometry");
                return;
            }
        }
        
        console.log("✅ All requirements met, proceeding with UV update");
        console.log("Updating face-based UVs for", faces.length, "faces");
        
        var uvs = [];
        // Continue with existing logic for fold-based UV mapping...
        
        // Calculate global bounds once for all faces
        var globalBounds = getGlobalBounds(originalVertices);
        var globalWidth = globalBounds.maxX - globalBounds.minX;
        var globalHeight = globalBounds.maxY - globalBounds.minY;
        
        // Prevent division by zero and handle flat patterns
        if (globalWidth === 0) globalWidth = 1;
        if (globalHeight === 0) {
            globalHeight = globalWidth; // Use width for height to create square mapping
        }
        
        console.log("Global bounds:", globalBounds, "Size:", globalWidth + "x" + globalHeight);
        
        // Check if we're using texture atlas
        var useAtlas = globals.textureLibrary.length > 1 && 
                       globals.faceTextureMapping && 
                       Object.keys(globals.faceTextureMapping).length > 0 &&
                       globals.atlasLayout;
        
        if (useAtlas) {
            console.log("🔥 Using texture atlas mapping with layout:", globals.atlasLayout);
            console.log("🎯 Face mappings available:", Object.keys(globals.faceTextureMapping).length, "faces");
            console.log("📚 Texture library size:", globals.textureLibrary.length);
            console.log("🗺️ Atlas layout - Grid:", globals.atlasLayout.texturesPerRow + "x" + globals.atlasLayout.texturesPerCol);
        } else {
            console.log("❌ Atlas not used. Reasons:");
            console.log("- Multiple textures?", globals.textureLibrary.length > 1);
            console.log("- Face mapping exists?", globals.faceTextureMapping && Object.keys(globals.faceTextureMapping).length > 0);
            console.log("- Atlas layout exists?", !!globals.atlasLayout);
            if (globals.textureLibrary.length > 1) {
                console.warn("⚠️ Multiple textures loaded but atlas not being used - this may cause display issues!");
            }
        }
        
        // For each face, map vertices to appropriate texture region
        for (var i = 0; i < faces.length; i++) {
            var face = faces[i];
            if (face.length !== 3) continue; // Only triangular faces
            
            // Get original 2D coordinates of face vertices (before folding)
            var v0 = new THREE.Vector2(originalVertices[face[0]][0], originalVertices[face[0]][1]);
            var v1 = new THREE.Vector2(originalVertices[face[1]][0], originalVertices[face[1]][1]);
            var v2 = new THREE.Vector2(originalVertices[face[2]][0], originalVertices[face[2]][1]);
            
            // Calculate face area to detect degenerate triangles
            var area = Math.abs((v1.x - v0.x) * (v2.y - v0.y) - (v2.x - v0.x) * (v1.y - v0.y)) / 2;
            var minArea = 0.001; // Minimum area threshold
            
            // Determine which texture this face should use
            var textureIndex = 0;
            var textureOffsetX = 0;
            var textureOffsetY = 0;
            var textureScaleX = 1;
            var textureScaleY = 1;
            
            // Enhanced texture mapping: Create virtual grid even for single textures
            var virtualGridSize = Math.max(2, Math.ceil(Math.sqrt(Math.min(faces.length / 20, 16)))); // 2x2 to 4x4 grid based on face count
            var useSingleTextureGrid = globals.textureLibrary.length <= 2; // Use grid for single or dual textures
            
            if (useAtlas && globals.faceTextureMapping[i] !== undefined) {
                // Multi-texture atlas mapping
                textureIndex = globals.faceTextureMapping[i];
                var layout = globals.atlasLayout;
                
                // Use the correct property names from atlasLayout
                var texturesPerRow = layout.texturesPerRow || layout.cols || 1;
                var texturesPerCol = layout.texturesPerCol || layout.rows || 1;
                
                // Calculate texture position in atlas
                var row = Math.floor(textureIndex / texturesPerRow);
                var col = textureIndex % texturesPerRow;
                
                // Calculate UV offsets and scale for this texture in the atlas
                textureScaleX = 1 / texturesPerRow;
                textureScaleY = 1 / texturesPerCol;
                textureOffsetX = col * textureScaleX;
                textureOffsetY = row * textureScaleY;
                
                if (i < 5) { // Log first few faces for debugging
                    console.log("🎨 Face", i, "→ Texture", textureIndex, "at atlas grid[" + col + "," + row + "] offset[" + textureOffsetX.toFixed(3) + "," + textureOffsetY.toFixed(3) + "] scale[" + textureScaleX.toFixed(3) + "," + textureScaleY.toFixed(3) + "]");
                    console.log("   Grid size:", texturesPerRow + "x" + texturesPerCol);
                }
            } else if (useSingleTextureGrid) {
                // Virtual grid mapping for single/few textures - each face gets different part of texture
                var faceGridIndex = i % (virtualGridSize * virtualGridSize); // Cycle through grid positions
                var gridRow = Math.floor(faceGridIndex / virtualGridSize);
                var gridCol = faceGridIndex % virtualGridSize;
                
                // Calculate UV offsets and scale for this grid cell
                textureScaleX = 1 / virtualGridSize;
                textureScaleY = 1 / virtualGridSize;
                textureOffsetX = gridCol * textureScaleX;
                textureOffsetY = gridRow * textureScaleY;
                
                if (i < 10) { // Log first few faces for debugging
                    console.log("🔲 Face", i, "→ Virtual grid[" + gridCol + "," + gridRow + "] (index " + faceGridIndex + ") offset[" + textureOffsetX.toFixed(3) + "," + textureOffsetY.toFixed(3) + "] scale[" + textureScaleX.toFixed(3) + "," + textureScaleY.toFixed(3) + "]");
                    console.log("   Virtual grid size:", virtualGridSize + "x" + virtualGridSize);
                }
            }
            
            // For very small triangles, use center point mapping to avoid stretching
            if (area < minArea) {
                var centerX = (v0.x + v1.x + v2.x) / 3;
                var centerY = (v0.y + v1.y + v2.y) / 3;
                
                // Map center point to UV space
                var centerU = (centerX - globalBounds.minX) / globalWidth;
                var centerV;
                
                // For flat patterns, create V from other coordinates
                if (Math.abs(globalBounds.maxY - globalBounds.minY) < 0.001) {
                    centerV = (centerY - globalBounds.minY) / globalWidth; // Use width for scaling
                    if (centerV === 0) {
                        // If Y is also 0, use face index for variation
                        centerV = (i * 0.01) % 1.0;
                    }
                } else {
                    centerV = (centerY - globalBounds.minY) / globalHeight;
                }
                
                // Apply atlas texture region mapping
                centerU = textureOffsetX + (centerU % 1.0) * textureScaleX;
                centerV = textureOffsetY + (centerV % 1.0) * textureScaleY;
                
                uvs.push(centerU, centerV);
                uvs.push(centerU, centerV);
                uvs.push(centerU, centerV);
            } else {
                // Standard UV mapping - handle flat patterns specially with improved aspect ratio
                var u0 = (v0.x - globalBounds.minX) / globalWidth;
                var u1 = (v1.x - globalBounds.minX) / globalWidth;
                var u2 = (v2.x - globalBounds.minX) / globalWidth;
                
                var v0_uv, v1_uv, v2_uv;
                
                // For flat patterns (height=0), create V coordinates from Y coordinates properly
                if (Math.abs(globalBounds.maxY - globalBounds.minY) < 0.001) {
                    // For flat patterns, use Y coordinates but with better scaling
                    if (Math.abs(v0.y - v1.y) > 0.001 || Math.abs(v1.y - v2.y) > 0.001) {
                        // Y coordinates do vary, use them with proper aspect ratio
                        var yRange = Math.max(0.1, Math.abs(globalBounds.maxY - globalBounds.minY)); // Avoid division by zero
                        if (yRange < 0.1) yRange = globalWidth; // Use width if Y range is too small
                        
                        v0_uv = (v0.y - globalBounds.minY) / yRange;
                        v1_uv = (v1.y - globalBounds.minY) / yRange;
                        v2_uv = (v2.y - globalBounds.minY) / yRange;
                        
                        // Clamp to [0,1] range
                        v0_uv = Math.max(0, Math.min(1, v0_uv));
                        v1_uv = Math.max(0, Math.min(1, v1_uv));
                        v2_uv = Math.max(0, Math.min(1, v2_uv));
                    } else {
                        // Create V coordinates based on face position with better distribution
                        var faceU = (u0 + u1 + u2) / 3; // Average U coordinate of face
                        v0_uv = (faceU + (face[0] * 0.001) % 1.0) % 1.0;
                        v1_uv = (faceU + (face[1] * 0.001) % 1.0) % 1.0;
                        v2_uv = (faceU + (face[2] * 0.001) % 1.0) % 1.0;
                    }
                } else {
                    // Normal Y-based V coordinates with proper aspect ratio preservation
                    v0_uv = (v0.y - globalBounds.minY) / globalHeight;
                    v1_uv = (v1.y - globalBounds.minY) / globalHeight;
                    v2_uv = (v2.y - globalBounds.minY) / globalHeight;
                }
                
                // Apply atlas texture region mapping for multiple textures
                u0 = textureOffsetX + (u0 % 1.0) * textureScaleX;
                v0_uv = textureOffsetY + (v0_uv % 1.0) * textureScaleY;
                u1 = textureOffsetX + (u1 % 1.0) * textureScaleX;
                v1_uv = textureOffsetY + (v1_uv % 1.0) * textureScaleY;
                u2 = textureOffsetX + (u2 % 1.0) * textureScaleX;
                v2_uv = textureOffsetY + (v2_uv % 1.0) * textureScaleY;
                
                uvs.push(u0, v0_uv);
                uvs.push(u1, v1_uv);
                uvs.push(u2, v2_uv);
            }
        }
        
        console.log("Generated", uvs.length / 2, "UV coordinates with texture mapping");
        
        // Debug: Check UV coordinate ranges
        var minU = Math.min.apply(Math, uvs.filter((_, i) => i % 2 === 0));
        var maxU = Math.max.apply(Math, uvs.filter((_, i) => i % 2 === 0));
        var minV = Math.min.apply(Math, uvs.filter((_, i) => i % 2 === 1));
        var maxV = Math.max.apply(Math, uvs.filter((_, i) => i % 2 === 1));
        console.log("UV ranges: U[" + minU.toFixed(3) + ", " + maxU.toFixed(3) + "], V[" + minV.toFixed(3) + ", " + maxV.toFixed(3) + "]");
        
        if (!geometry.attributes) {
            console.error("Geometry attributes not found");
            return;
        }
        
        // Use addAttribute for older Three.js versions (instead of setAttribute)
        if (geometry.addAttribute) {
            geometry.addAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
        } else if (geometry.setAttribute) {
            geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
        } else {
            console.error("Neither addAttribute nor setAttribute methods available");
            return;
        }
        
        if (geometry.attributes.uv) {
            geometry.attributes.uv.needsUpdate = true;
        }
        
        console.log("UV mapping updated successfully with multi-texture support");
    }
    
    function createBasicUVMapping() {
        console.log("🔧 Creating basic UV mapping for geometry");
        
        if (!geometry || !geometry.attributes || !geometry.attributes.position) {
            console.warn("Cannot create basic UV mapping: no position data");
            return;
        }
        
        var positions = geometry.attributes.position.array;
        var vertexCount = positions.length / 3;
        var uvs = [];
        
        // Find bounds for UV coordinate normalization
        var minX = Infinity, maxX = -Infinity;
        var minY = Infinity, maxY = -Infinity;
        var minZ = Infinity, maxZ = -Infinity;
        
        for (var i = 0; i < vertexCount; i++) {
            var x = positions[i * 3];
            var y = positions[i * 3 + 1];
            var z = positions[i * 3 + 2];
            
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
            minZ = Math.min(minZ, z);
            maxZ = Math.max(maxZ, z);
        }
        
        var rangeX = maxX - minX || 1;
        var rangeY = Math.max(maxY - minY, maxZ - minZ) || 1; // Use Z range if Y range is flat
        var actualMinY = (maxY - minY) > (maxZ - minZ) ? minY : minZ;
        var actualMaxY = (maxY - minY) > (maxZ - minZ) ? maxY : maxZ;
        
        console.log("Geometry bounds:", {minX, maxX, minY, maxY, minZ, maxZ, rangeX, rangeY, actualMinY, actualMaxY});
        
        // Check if we're using texture atlas
        var useAtlas = globals.textureLibrary.length > 1 && 
                       globals.faceTextureMapping && 
                       Object.keys(globals.faceTextureMapping).length > 0 &&
                       globals.atlasLayout;
        
        // Virtual grid system for single/few textures
        var virtualGridSize = Math.max(2, Math.ceil(Math.sqrt(Math.min(vertexCount / 60, 16)))); // 2x2 to 4x4 grid
        var useSingleTextureGrid = globals.textureLibrary.length <= 2; // Use grid for single or dual textures
        
        if (useAtlas) {
            console.log("🔥 Using texture atlas for basic UV mapping");
            console.log("📋 Atlas layout info:", {
                dimensions: globals.atlasLayout.width + "x" + globals.atlasLayout.height,
                regions: globals.atlasLayout.regions.length,
                textureMapping: Object.keys(globals.atlasLayout.textureIndexMapping).length,
                faceMapping: Object.keys(globals.faceTextureMapping).length
            });
        } else if (useSingleTextureGrid) {
            console.log("🔲 Using virtual grid (" + virtualGridSize + "x" + virtualGridSize + ") for single texture variation");
        }
        
        // Create UV coordinates for each vertex
        for (var i = 0; i < vertexCount; i++) {
            var x = positions[i * 3];
            var y = positions[i * 3 + 1];
            var z = positions[i * 3 + 2];
            
            // Normalize to [0,1] range
            var u = (x - minX) / rangeX;
            var v = ((maxY - minY) > (maxZ - minZ) ? y - actualMinY : z - actualMinY) / rangeY;
            
            // Apply atlas mapping if multiple textures
            if (useAtlas) {
                // Determine which face this vertex belongs to (simplified approach)
                var faceIndex = Math.floor(i / 3); // Assuming triangles
                var originalTextureIndex = globals.faceTextureMapping[faceIndex] || 0;
                
                // Get atlas position for this texture
                var atlasPosition = globals.atlasLayout.textureIndexMapping[originalTextureIndex];
                
                if (typeof atlasPosition !== 'undefined' && globals.atlasLayout.regions[atlasPosition]) {
                    var region = globals.atlasLayout.regions[atlasPosition];
                    
                    // Map UV to atlas region
                    u = region.x / globals.atlasLayout.width + (u * region.width / globals.atlasLayout.width);
                    v = region.y / globals.atlasLayout.height + (v * region.height / globals.atlasLayout.height);
                    
                    // Debug logging for first few vertices
                    if (i < 12 && i % 3 === 0) {
                        console.log("🔥 Vertex", i, "Face", faceIndex, "→ OriginalTexture", originalTextureIndex, 
                                  "AtlasPos", atlasPosition, "Region[" + region.x + "," + region.y + "], UV[" + u.toFixed(3) + "," + v.toFixed(3) + "]",
                                  "BaseUV[" + ((u - region.x / globals.atlasLayout.width) / (region.width / globals.atlasLayout.width)).toFixed(3) + "," + 
                                  ((v - region.y / globals.atlasLayout.height) / (region.height / globals.atlasLayout.height)).toFixed(3) + "]",
                                  "Position[" + x.toFixed(3) + "," + y.toFixed(3) + "," + z.toFixed(3) + "]");
                    }
                } else {
                    // Fallback to first region if mapping not found
                    if (globals.atlasLayout.regions.length > 0) {
                        var region = globals.atlasLayout.regions[0];
                        u = region.x / globals.atlasLayout.width + (u * region.width / globals.atlasLayout.width);
                        v = region.y / globals.atlasLayout.height + (v * region.height / globals.atlasLayout.height);
                        
                        if (i < 12 && i % 3 === 0) {
                            console.warn("⚠️ Vertex", i, "Face", faceIndex, "using fallback region for texture", originalTextureIndex,
                                       "Position[" + x.toFixed(3) + "," + y.toFixed(3) + "," + z.toFixed(3) + "]");
                        }
                    }
                }
            } else if (useSingleTextureGrid) {
                // Virtual grid mapping for single texture - create variation
                var vertexGridIndex = i % (virtualGridSize * virtualGridSize); // Cycle through grid positions
                var gridRow = Math.floor(vertexGridIndex / virtualGridSize);
                var gridCol = vertexGridIndex % virtualGridSize;
                
                // Calculate UV scale and offset for this grid cell
                var gridScaleX = 1 / virtualGridSize;
                var gridScaleY = 1 / virtualGridSize;
                var gridOffsetX = gridCol * gridScaleX;
                var gridOffsetY = gridRow * gridScaleY;
                
                // Map UV to grid cell
                u = gridOffsetX + (u * gridScaleX);
                v = gridOffsetY + (v * gridScaleY);
                
                if (i < 12 && i % 3 === 0) { // Log every third vertex (one per triangle) for first few
                    console.log("🔲 Vertex", i, "→ Grid[" + gridCol + "," + gridRow + "] UV[" + u.toFixed(3) + "," + v.toFixed(3) + "]");
                }
            }
            
            uvs.push(u, v);
        }
        
        console.log("Generated", uvs.length / 2, "UV coordinates for basic geometry");
        
        // Apply UV coordinates to geometry
        if (geometry.addAttribute) {
            geometry.addAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
        } else if (geometry.setAttribute) {
            geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
        }
        
        if (geometry.attributes.uv) {
            geometry.attributes.uv.needsUpdate = true;
        }
        
        console.log("✅ Basic UV mapping applied successfully");
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

        getDimensions: getDimensions//for save stl
    }
}