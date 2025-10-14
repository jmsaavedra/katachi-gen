/**
 * Cell Colorizer - Generate colored cell map images of origami patterns
 */

function initCellColorizer(globals) {

    // Generate a set of visually distinct colors for cells
    function generateDistinctColors(count) {
        const colors = [];

        // Start with some predefined distinct colors
        const baseColors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
            '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
            '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2',
            '#A9DFBF', '#F9E79F', '#D5A6BD', '#A2D9CE', '#FAD7A0'
        ];

        // If we need more colors than base colors, generate additional ones
        for (let i = 0; i < count; i++) {
            if (i < baseColors.length) {
                colors.push(baseColors[i]);
            } else {
                // Generate colors using HSL for better distribution
                const hue = (i * 137.508) % 360; // Golden angle approximation
                const saturation = 60 + (i % 40); // 60-100%
                const lightness = 45 + (i % 30); // 45-75%
                colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
            }
        }

        return colors;
    }

    // Convert color string to RGB values
    function colorToRGB(color) {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1, 1);
        const imageData = ctx.getImageData(0, 0, 1, 1);
        return {
            r: imageData.data[0],
            g: imageData.data[1],
            b: imageData.data[2]
        };
    }

    // Get the bounding box of all vertices
    function getBoundingBox(vertices) {
        let minX = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxZ = -Infinity;

        for (const vertex of vertices) {
            const x = vertex[0];
            const z = vertex[2]; // Using z coordinate for 2D projection

            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minZ = Math.min(minZ, z);
            maxZ = Math.max(maxZ, z);
        }

        return { minX, maxX, minZ, maxZ };
    }

    // Check if point is inside polygon using ray casting algorithm
    function pointInPolygon(point, polygon) {
        const x = point[0], y = point[1];
        let inside = false;

        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i][0], yi = polygon[i][1];
            const xj = polygon[j][0], yj = polygon[j][1];

            if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }

        return inside;
    }

    // Generate the colored cell map image
    function generateCellMapImage() {
        try {
            // Get fold data
            const fold = globals.includeCurves ?
                globals.curvedFolding.getFoldData(false) :
                globals.pattern.getFoldData(false);

            if (!fold || !fold.vertices_coords || !fold.faces_vertices) {
                globals.warn("No pattern data available to generate cell map.");
                return;
            }

            const vertices = fold.vertices_coords;
            const faces = fold.faces_vertices;

            if (faces.length === 0) {
                globals.warn("No faces found in the pattern.");
                return;
            }

            // Generate distinct colors for each face
            const colors = generateDistinctColors(faces.length);

            // Get bounding box
            const bbox = getBoundingBox(vertices);

            const width = bbox.maxX - bbox.minX;
            const height = bbox.maxZ - bbox.minZ;

            if (width === 0 || height === 0) {
                globals.warn("Pattern has no dimensions.");
                return;
            }

            // Calculate appropriate canvas size based on pattern aspect ratio
            const aspectRatio = width / height;

            // Determine canvas dimensions based on aspect ratio
            const maxDimension = 2048;
            let canvasWidth, canvasHeight;

            if (aspectRatio >= 1) {
                canvasWidth = maxDimension;
                canvasHeight = Math.round(maxDimension / aspectRatio);
            } else {
                canvasHeight = maxDimension;
                canvasWidth = Math.round(maxDimension * aspectRatio);
            }

            // Ensure minimum size
            canvasWidth = Math.max(canvasWidth, 512);
            canvasHeight = Math.max(canvasHeight, 512);

            // Create canvas with proper aspect ratio
            const canvas = document.createElement('canvas');
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            const ctx = canvas.getContext('2d');

            // Clear with white background
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);

            // Apply 180 degree rotation to fix upside-down texture
            ctx.save();
            ctx.translate(canvasWidth / 2, canvasHeight / 2);
            ctx.rotate(Math.PI); // 180 degree rotation
            ctx.translate(-canvasWidth / 2, -canvasHeight / 2);

            // Calculate scale to fit the pattern exactly in the canvas
            const scaleX = canvasWidth / width;
            const scaleY = canvasHeight / height;
            const scale = Math.min(scaleX, scaleY);

            // Center the pattern in the canvas
            const scaledWidth = width * scale;
            const scaledHeight = height * scale;
            const offsetX = (canvasWidth - scaledWidth) / 2;
            const offsetY = (canvasHeight - scaledHeight) / 2;

            // Function to transform coordinates to canvas space
            function transformPoint(vertex) {
                const x = (vertex[0] - bbox.minX) * scale + offsetX;
                const y = (vertex[2] - bbox.minZ) * scale + offsetY;
                return [x, y];
            }

            // Draw each face
            for (let i = 0; i < faces.length; i++) {
                const face = faces[i];
                const color = colors[i];

                if (face.length < 3) continue; // Skip invalid faces

                // Convert face vertices to canvas coordinates
                const canvasPoints = [];
                for (let j = 0; j < face.length; j++) {
                    const vertexIndex = face[j];
                    if (vertexIndex >= 0 && vertexIndex < vertices.length) {
                        const vertex = vertices[vertexIndex];
                        canvasPoints.push(transformPoint(vertex));
                    }
                }

                if (canvasPoints.length < 3) continue; // Skip if not enough valid points

                // Draw filled polygon
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.moveTo(canvasPoints[0][0], canvasPoints[0][1]);

                for (let j = 1; j < canvasPoints.length; j++) {
                    ctx.lineTo(canvasPoints[j][0], canvasPoints[j][1]);
                }

                ctx.closePath();
                ctx.fill();

                // Draw outline
                ctx.strokeStyle = '#333333';
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            // Restore canvas state after rotation
            ctx.restore();

            // Convert to blob and download
            canvas.toBlob(function(blob) {
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    const downloadLink = document.createElement("a");
                    downloadLink.href = url;

                    const filename = globals.filename || "origami_pattern";
                    downloadLink.download = filename + "_cell_map.png";

                    document.body.appendChild(downloadLink);
                    downloadLink.click();
                    document.body.removeChild(downloadLink);

                    URL.revokeObjectURL(url);

                    globals.warn("✅ Cell map image downloaded: " + downloadLink.download);
                } else {
                    console.error("Failed to create blob");
                    globals.warn("Failed to generate cell map image.");
                }
            }, 'image/png');

        } catch (error) {
            console.error("Error generating cell map:", error);
            globals.warn("Error generating cell map: " + error.message);
        }
    }

    // Generate texture-mapped cell image
    function generateTextureMappedCellImage(autoMode = false) {
        try {
            // Check if we have textures loaded
            if (!globals.textureLibrary || globals.textureLibrary.length === 0) {
                globals.warn("No textures loaded. Please load texture images first.");
                return;
            }

            // Get fold data
            const fold = globals.includeCurves ?
                globals.curvedFolding.getFoldData(false) :
                globals.pattern.getFoldData(false);

            if (!fold || !fold.vertices_coords || !fold.faces_vertices) {
                globals.warn("No pattern data available to generate texture-mapped cell image.");
                return;
            }

            const vertices = fold.vertices_coords;
            const faces = fold.faces_vertices;
            const numTextures = globals.textureLibrary.length;

            if (faces.length === 0) {
                globals.warn("No faces found in the pattern.");
                return;
            }

            // Calculate how many cells per texture
            const cellsPerTexture = Math.ceil(faces.length / numTextures);

            // Get bounding box
            const bbox = getBoundingBox(vertices);

            const width = bbox.maxX - bbox.minX;
            const height = bbox.maxZ - bbox.minZ;

            if (width === 0 || height === 0) {
                globals.warn("Pattern has no dimensions.");
                return;
            }

            // Calculate appropriate canvas size based on pattern aspect ratio
            const aspectRatio = width / height;

            // Determine canvas dimensions based on aspect ratio
            // Use a maximum dimension of 2048 for performance, but maintain aspect ratio
            const maxDimension = 2048;
            let canvasWidth, canvasHeight;

            if (aspectRatio >= 1) {
                // Width is larger or equal to height
                canvasWidth = maxDimension;
                canvasHeight = Math.round(maxDimension / aspectRatio);
            } else {
                // Height is larger than width
                canvasHeight = maxDimension;
                canvasWidth = Math.round(maxDimension * aspectRatio);
            }

            // Ensure minimum size for small patterns
            canvasWidth = Math.max(canvasWidth, 512);
            canvasHeight = Math.max(canvasHeight, 512);

            // Store canvas dimensions globally for consistent UV mapping
            globals.cellColorizerCanvasWidth = canvasWidth;
            globals.cellColorizerCanvasHeight = canvasHeight;
            globals.cellColorizerScale = null; // Will be calculated later
            globals.cellColorizerOffsetX = null;
            globals.cellColorizerOffsetY = null;

            // Create main canvas for the final result - aspect ratio matched
            const finalCanvas = document.createElement('canvas');
            finalCanvas.width = canvasWidth;
            finalCanvas.height = canvasHeight;
            const finalCtx = finalCanvas.getContext('2d');

            // Clear with transparent background
            finalCtx.clearRect(0, 0, canvasWidth, canvasHeight);

            // Apply 180 degree rotation to fix upside-down texture
            finalCtx.save();
            finalCtx.translate(canvasWidth / 2, canvasHeight / 2);
            finalCtx.rotate(Math.PI); // 180 degree rotation
            finalCtx.translate(-canvasWidth / 2, -canvasHeight / 2);

            // Calculate scale to fit the pattern exactly in the canvas
            const scaleX = canvasWidth / width;
            const scaleY = canvasHeight / height;

            // Use the smaller scale to ensure the entire pattern fits
            const scale = Math.min(scaleX, scaleY);

            // Center the pattern in the canvas
            const scaledWidth = width * scale;
            const scaledHeight = height * scale;
            const offsetX = (canvasWidth - scaledWidth) / 2;
            const offsetY = (canvasHeight - scaledHeight) / 2;

            // Store transformation parameters globally for consistent UV mapping
            globals.cellColorizerScale = scale;
            globals.cellColorizerOffsetX = offsetX;
            globals.cellColorizerOffsetY = offsetY;

            // Function to transform coordinates to canvas space with full coverage
            function transformPoint(vertex) {
                const x = (vertex[0] - bbox.minX) * scale + offsetX;
                const y = (vertex[2] - bbox.minZ) * scale + offsetY;
                return [x, y];
            }

            // Process each texture
            for (let textureIndex = 0; textureIndex < numTextures; textureIndex++) {
                const texture = globals.textureLibrary[textureIndex];
                if (!texture || !texture.image) {
                    console.warn("Texture", textureIndex, "has no image data");
                    continue;
                }

                // Create a temporary canvas with FIXED pattern dimensions
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = canvasWidth;
                tempCanvas.height = canvasHeight;
                const tempCtx = tempCanvas.getContext('2d');

                // Clear with transparent background
                tempCtx.clearRect(0, 0, canvasWidth, canvasHeight);

                // Apply 180 degree rotation for consistency
                tempCtx.save();
                tempCtx.translate(canvasWidth / 2, canvasHeight / 2);
                tempCtx.rotate(Math.PI); // 180 degree rotation
                tempCtx.translate(-canvasWidth / 2, -canvasHeight / 2);

                // FORCE texture to EXACT pattern size (no aspect ratio fitting)
                // This ensures texture size matches fold lines exactly
                const drawWidth = scaledWidth;
                const drawHeight = scaledHeight;
                const drawX = offsetX;
                const drawY = offsetY;

                // Draw the texture fitted to PATTERN dimensions (same scale as fold lines)
                tempCtx.drawImage(texture.image, drawX, drawY, drawWidth, drawHeight);

                // Restore temp canvas state
                tempCtx.restore();

                // Create a mask canvas for the assigned cells
                const maskCanvas = document.createElement('canvas');
                maskCanvas.width = canvasWidth;
                maskCanvas.height = canvasHeight;
                const maskCtx = maskCanvas.getContext('2d');

                // Clear mask with transparent background
                maskCtx.clearRect(0, 0, canvasWidth, canvasHeight);

                // Apply 180 degree rotation to mask canvas
                maskCtx.save();
                maskCtx.translate(canvasWidth / 2, canvasHeight / 2);
                maskCtx.rotate(Math.PI); // 180 degree rotation
                maskCtx.translate(-canvasWidth / 2, -canvasHeight / 2);

                maskCtx.fillStyle = 'white';

                // Calculate which faces are assigned to this texture
                const startFace = textureIndex * cellsPerTexture;
                const endFace = Math.min((textureIndex + 1) * cellsPerTexture, faces.length);

                // Draw the assigned faces on the mask using THE SAME transformPoint function
                for (let faceIndex = startFace; faceIndex < endFace; faceIndex++) {
                    const face = faces[faceIndex];

                    if (face.length < 3) continue; // Skip invalid faces

                    // Use THE SAME coordinate transformation as the rest of the system
                    const canvasPoints = face.map(vertexIndex => {
                        const vertex = vertices[vertexIndex];
                        return transformPoint(vertex); // SAME function as everywhere else
                    });

                    // Draw filled polygon on mask
                    maskCtx.beginPath();
                    maskCtx.moveTo(canvasPoints[0][0], canvasPoints[0][1]);

                    for (let j = 1; j < canvasPoints.length; j++) {
                        maskCtx.lineTo(canvasPoints[j][0], canvasPoints[j][1]);
                    }

                    maskCtx.closePath();
                    maskCtx.fill();
                }

                // Restore mask canvas state
                maskCtx.restore();

                // Apply mask to the texture using composite operation
                tempCtx.globalCompositeOperation = 'destination-in';
                tempCtx.drawImage(maskCanvas, 0, 0);

                // Composite this texture layer onto the final canvas
                finalCtx.globalCompositeOperation = 'source-over';
                finalCtx.drawImage(tempCanvas, 0, 0);
            }

            // Restore canvas state after rotation
            finalCtx.restore();

            // Apply the generated texture to the origami model immediately
            applyTextureMappedImageToModel(finalCanvas, (globals.filename || "origami_pattern") + "_texture_mapped", {
                bbox: bbox,
                scale: scale,
                offsetX: offsetX,
                offsetY: offsetY,
                canvasWidth: canvasWidth,
                canvasHeight: canvasHeight
            }, fold);

            // Only download if not in auto mode
            if (!autoMode) {
                // Convert to blob and download
                finalCanvas.toBlob(function(blob) {
                    if (blob) {
                        const url = URL.createObjectURL(blob);
                        const downloadLink = document.createElement("a");
                        downloadLink.href = url;

                        const filename = globals.filename || "origami_pattern";
                        downloadLink.download = filename + "_texture_mapped.png";

                        document.body.appendChild(downloadLink);
                        downloadLink.click();
                        document.body.removeChild(downloadLink);

                        URL.revokeObjectURL(url);
                    } else {
                        console.error("Failed to create blob");
                        globals.warn("Failed to generate texture-mapped image.");
                    }
                }, 'image/png');
            }

        } catch (error) {
            console.error("Error generating texture-mapped image:", error);
            globals.warn("Error generating texture-mapped image: " + error.message);
        }
    }

    // Apply the generated texture-mapped image to the origami model
    function applyTextureMappedImageToModel(canvas, textureName, transformParams, fold) {
        try {
            // Extract transform parameters
            const { bbox, scale, offsetX, offsetY, canvasWidth, canvasHeight } = transformParams;

            // Create a new texture from the canvas
            const texture = new THREE.CanvasTexture(canvas);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(1.0, 1.0); // Use 1:1 mapping for the generated texture
            texture.flipY = false; // Disable Y-flip since we already applied 180 degree rotation in canvas
            texture.generateMipmaps = true;
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.name = textureName;
            texture.needsUpdate = true;

            // Force texture update
            texture.generateMipmaps = false; // Disable mipmaps for better quality
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;

            // Clear complex texture system
            globals.textureLibrary = [];  // Clear existing textures
            globals.faceTextureMapping = {};  // Clear face mapping
            globals.atlasLayout = null;  // Clear atlas
            globals.textureAtlas = null;  // Clear atlas texture
            globals.selectedTexture = 0;
            globals.randomTextures = false;

            // Set the single texture as the main face texture
            globals.faceTexture = texture;
            globals.textureLibrary = [texture];  // Single texture in library
            globals.useSimpleTextureMode = true;
            globals.isCellGeneratedTexture = true;
            globals.faceTextureMapping = 0;
            globals.atlasLayout = false;

            // CRITICAL: Pass fold data and transformation parameters to model.js
            globals.cellColorizerFoldData = fold; // Use the local fold variable, not globals.fold
            globals.cellColorizerBoundingBox = bbox;
            globals.cellColorizerTransformParams = {
                scale: scale,
                offsetX: offsetX,
                offsetY: offsetY,
                canvasWidth: canvasWidth,
                canvasHeight: canvasHeight
            };

            // Update texture repeat setting
            globals.textureRepeat = 1.0;
            $("#textureRepeat").val(1.0);

            // Force switch to texture mode
            globals.colorMode = "texture";

            // Mark this as a generated cell texture to enable special UV handling
            globals.isCellGeneratedTexture = true;
            globals.useSimpleTextureMode = true;

            // Update UI radio buttons
            $("input[name=colorMode]").prop("checked", false);
            $("input[name=colorMode][value=texture]").prop("checked", true);

            // Show/hide appropriate UI elements
            $("#textureMaterialOptions").show().removeClass("hide");
            $("#coloredMaterialOptions").hide();
            $("#axialStrainMaterialOptions").hide();

            // Update toggle buttons
            $("#colorToggle>div").removeClass("active");
            $("#strainToggle").removeClass("active");

            // Update material to apply the new texture
            if (globals.model && globals.model.setMeshMaterial) {
                globals.model.setMeshMaterial();

                // Force a render update
                if (globals.threeView && globals.threeView.render) {
                    globals.threeView.render();
                }
            }

            // Update other UI controls
            $("#randomTextures").prop("checked", false);

            // Update texture list in UI
            if (globals.updateTextureList) {
                globals.updateTextureList();
            }

        } catch (error) {
            console.error("Error applying texture-mapped image to model:", error);
            globals.warn("Error applying texture to origami: " + error.message);
        }
    }

    return {
        generateCellMapImage: generateCellMapImage,
        generateTextureMappedCellImage: generateTextureMappedCellImage,
        resetCellTextureMode: function() {
            globals.isCellGeneratedTexture = false;
            globals.useSimpleTextureMode = false;
        }
    };
}
