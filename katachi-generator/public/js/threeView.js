/**
 * Created by ghassaei on 9/16/16.
 */

function initThreeView(globals) {

    var scene = new THREE.Scene();
    var modelWrapper = new THREE.Object3D();

    var camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 500);
    // var camera = new THREE.OrthographicCamera(window.innerWidth / -2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / -2, -10000, 10000);//-40, 40);
    var renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
    // var svgRenderer = new THREE.SVGRenderer();
    var controls;
    
    // Store lighting objects for later adjustment
    var lights = {
        frontMain: null,
        backLight: null,
        sideLeft: null,
        sideRight: null,
        frontDetail1: null,
        frontDetail2: null,
        ambient: null
    };

    init();

    function init() {

        var container = $("#threeContainer");
        
        renderer.setPixelRatio( window.devicePixelRatio );
        renderer.setSize(window.innerWidth, window.innerHeight);
        
        // Set completely transparent background to show CSS gradient
        renderer.setClearColor(0x000000, 0);
        
        container.append(renderer.domElement);
        
        // Force canvas transparency through DOM styling
        renderer.domElement.style.background = 'transparent';
        renderer.domElement.style.backgroundColor = 'transparent';

        // Ensure no scene background to show CSS gradient through
        scene.background = null;
        
        // Rotate object 90 degrees around X-axis so surface faces camera
        modelWrapper.rotation.x = Math.PI / 2;
        
        scene.add(modelWrapper);
        
        // Optimized lighting for clear texture visibility without white blown-out highlights
        // Using global lighting settings for adjustable parameters
        
        // Debug: Log current lighting settings
        console.log("🔧 ThreeView: Initializing lighting with globals settings:");
        console.log("- frontMain intensity:", globals.lighting.frontMain.intensity);
        console.log("- frontDetail1 intensity:", globals.lighting.frontDetail1.intensity);
        console.log("- frontDetail2 intensity:", globals.lighting.frontDetail2.intensity);
        console.log("- ambient intensity:", globals.lighting.ambient.intensity);
        
        // Main front light for texture clarity - globals.jsから値を読み取り
        lights.frontMain = new THREE.DirectionalLight(0xffffff, globals.lighting.frontMain.intensity);
        lights.frontMain.position.set(
            globals.lighting.frontMain.position.x,
            globals.lighting.frontMain.position.y,
            globals.lighting.frontMain.position.z
        );
        scene.add(lights.frontMain);
        
        // Back light for depth
        lights.backLight = new THREE.DirectionalLight(0xffffff, globals.lighting.backLight.intensity);
        lights.backLight.position.set(
            globals.lighting.backLight.position.x,
            globals.lighting.backLight.position.y,
            globals.lighting.backLight.position.z
        );
        scene.add(lights.backLight);
        
        // Side lights for even illumination
        lights.sideLeft = new THREE.DirectionalLight(0xffffff, globals.lighting.sideLeft.intensity);
        lights.sideLeft.position.set(
            globals.lighting.sideLeft.position.x,
            globals.lighting.sideLeft.position.y,
            globals.lighting.sideLeft.position.z
        );
        scene.add(lights.sideLeft);
        
        lights.sideRight = new THREE.DirectionalLight(0xffffff, globals.lighting.sideRight.intensity);
        lights.sideRight.position.set(
            globals.lighting.sideRight.position.x,
            globals.lighting.sideRight.position.y,
            globals.lighting.sideRight.position.z
        );
        scene.add(lights.sideRight);
        
        // Front lights for texture detail - positioned to face the model directly
        lights.frontDetail1 = new THREE.DirectionalLight(0xffffff, globals.lighting.frontDetail1.intensity);
        lights.frontDetail1.position.set(
            globals.lighting.frontDetail1.position.x,
            globals.lighting.frontDetail1.position.y,
            globals.lighting.frontDetail1.position.z
        );
        scene.add(lights.frontDetail1);
        
        lights.frontDetail2 = new THREE.DirectionalLight(0xffffff, globals.lighting.frontDetail2.intensity);
        lights.frontDetail2.position.set(
            globals.lighting.frontDetail2.position.x,
            globals.lighting.frontDetail2.position.y,
            globals.lighting.frontDetail2.position.z
        );
        scene.add(lights.frontDetail2);
        
        // Enhanced ambient light for better overall visibility
        lights.ambient = new THREE.AmbientLight(0xffffff, globals.lighting.ambient.intensity);
        scene.add(lights.ambient);
        
        console.log("✅ ThreeView: Lighting initialization completed");
        //scene.fog = new THREE.FogExp2(0xf4f4f4, 1.7);
        //renderer.setClearColor(scene.fog.color);

        scene.add(camera);

        resetCamera();

        controls = new THREE.TrackballControls(camera, renderer.domElement);
        controls.rotateSpeed = 4.0;
        controls.zoomSpeed = 15;
        controls.noPan = true;
        controls.staticMoving = true;
        controls.dynamicDampingFactor = 0.3;
        controls.minDistance = 1;
	    controls.maxDistance = 30;
        // controls.addEventListener("change", render);

        _render();//render before model loads

    }

    function resetCamera(){
        camera.zoom = 7;
        camera.updateProjectionMatrix();
        // Set camera to front view (looking down Z-axis with no rotation)
        camera.position.x = 0;
        camera.position.y = 0;
        camera.position.z = 10;
        if (controls) controls.reset(new THREE.Vector3(0,0,1));
    }

    function setCameraX(sign){
        controls.reset(new THREE.Vector3(sign,0,0));
    }
    function setCameraY(sign){
        controls.reset(new THREE.Vector3(0,sign,0));
    }
    function setCameraZ(sign){
        controls.reset(new THREE.Vector3(0,0,sign));
    }
    function setCameraIso(){
        controls.reset(new THREE.Vector3(1,1,1));
    }

    function startAnimation(){
        console.log("starting animation");
        renderer.animate(_loop);
    }

    function pauseSimulation(){
        globals.simulationRunning = false;
        console.log("pausing simulation");
    }

    function startSimulation(){
        console.log("starting simulation");
        globals.simulationRunning = true;
    }

    var captureStats = $("#stopRecord>span");
    function _render(){
        if (globals.vrEnabled){
            globals.vive.render();
            return;
        }
        renderer.render(scene, camera);
        if (globals.capturer) {
            if (globals.capturer == "png"){
                var canvas = globals.threeView.renderer.domElement;
                canvas.toBlob(function(blob) {
                    saveAs(blob, globals.screenRecordFilename + ".png");
                }, "image/png");
                globals.capturer = null;
                globals.shouldScaleCanvas = false;
                globals.shouldAnimateFoldPercent = false;
                globals.threeView.onWindowResize();
                return;
            }
            captureStats.html("( " + ++globals.capturerFrames + " frames  at " + globals.currentFPS  + "fps )");
            globals.capturer.capture(renderer.domElement);
        }
    }

    function _loop(){
        if (globals.rotateModel !== null){
            if (globals.rotateModel == "x") modelWrapper.rotateX(globals.rotationSpeed);
            if (globals.rotateModel == "y") modelWrapper.rotateY(globals.rotationSpeed);
            if (globals.rotateModel == "z") modelWrapper.rotateZ(globals.rotationSpeed);
        }
        if (globals.needsSync){
            globals.model.sync();
        }
        if (globals.simNeedsSync){
            globals.model.syncSolver();
        }
        if (globals.simulationRunning) globals.model.step();
        if (globals.vrEnabled){
            _render();
            return;
        }
        controls.update();
        _render();
    }

    function sceneAddModel(object){
        modelWrapper.add(object);
    }

    function onWindowResize() {

        if (globals.vrEnabled){
            globals.warn("Can't resize window when in VR mode.");
            return;
        }

        camera.aspect = window.innerWidth / window.innerHeight;
        // camera.left = -window.innerWidth / 2;
        // camera.right = window.innerWidth / 2;
        // camera.top = window.innerHeight / 2;
        // camera.bottom = -window.innerHeight / 2;
        camera.updateProjectionMatrix();

        var scale = 1;
        if (globals.shouldScaleCanvas) scale = globals.capturerScale;
        renderer.setSize(scale*window.innerWidth, scale*window.innerHeight);
        controls.handleResize();
    }

    function enableControls(state){
        controls.enabled = state;
        controls.enableRotate = state;
    }

    // function saveSVG(){
    //     // svgRenderer.setClearColor(0xffffff);
    //     svgRenderer.setSize(window.innerWidth,window.innerHeight);
    //     svgRenderer.sortElements = true;
    //     svgRenderer.sortObjects = true;
    //     svgRenderer.setQuality('high');
    //     svgRenderer.render(scene,camera);
    //     //get svg source.
    //     var serializer = new XMLSerializer();
    //     var source = serializer.serializeToString(svgRenderer.domElement);
    //
    //     //add name spaces.
    //     if(!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)){
    //         source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    //     }
    //     if(!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)){
    //         source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
    //     }
    //
    //     //add xml declaration
    //     source = '<?xml version="1.0" standalone="no"?>\r\n' + source;
    //
    //     var svgBlob = new Blob([source], {type:"image/svg+xml;charset=utf-8"});
    //     var svgUrl = URL.createObjectURL(svgBlob);
    //     var downloadLink = document.createElement("a");
    //     downloadLink.href = svgUrl;
    //     downloadLink.download =  globals.filename + " : " + parseInt(globals.creasePercent*100) +  "PercentFolded.svg";
    //     document.body.appendChild(downloadLink);
    //     downloadLink.click();
    //     document.body.removeChild(downloadLink);
    // }

    function resetModel(){
        modelWrapper.rotation.set(0,0,0);
    }

    function setBackgroundColor(color){
        if (color === undefined) color = globals.backgroundColor;
        scene.background.setStyle( "#" + color);
    }
    
    // Function to update lighting based on global settings
    function updateLighting() {
        console.log("🔧 Updating lighting settings");
        
        // Update main front light
        if (lights.frontMain) {
            lights.frontMain.intensity = globals.lighting.frontMain.intensity;
            lights.frontMain.position.set(
                globals.lighting.frontMain.position.x,
                globals.lighting.frontMain.position.y,
                globals.lighting.frontMain.position.z
            );
        }
        
        // Update back light
        if (lights.backLight) {
            lights.backLight.intensity = globals.lighting.backLight.intensity;
            lights.backLight.position.set(
                globals.lighting.backLight.position.x,
                globals.lighting.backLight.position.y,
                globals.lighting.backLight.position.z
            );
        }
        
        // Update side lights
        if (lights.sideLeft) {
            lights.sideLeft.intensity = globals.lighting.sideLeft.intensity;
            lights.sideLeft.position.set(
                globals.lighting.sideLeft.position.x,
                globals.lighting.sideLeft.position.y,
                globals.lighting.sideLeft.position.z
            );
        }
        
        if (lights.sideRight) {
            lights.sideRight.intensity = globals.lighting.sideRight.intensity;
            lights.sideRight.position.set(
                globals.lighting.sideRight.position.x,
                globals.lighting.sideRight.position.y,
                globals.lighting.sideRight.position.z
            );
        }
        
        // Update front detail lights
        if (lights.frontDetail1) {
            lights.frontDetail1.intensity = globals.lighting.frontDetail1.intensity;
            lights.frontDetail1.position.set(
                globals.lighting.frontDetail1.position.x,
                globals.lighting.frontDetail1.position.y,
                globals.lighting.frontDetail1.position.z
            );
        }
        
        if (lights.frontDetail2) {
            lights.frontDetail2.intensity = globals.lighting.frontDetail2.intensity;
            lights.frontDetail2.position.set(
                globals.lighting.frontDetail2.position.x,
                globals.lighting.frontDetail2.position.y,
                globals.lighting.frontDetail2.position.z
            );
        }
        
        // Update ambient light
        if (lights.ambient) {
            lights.ambient.intensity = globals.lighting.ambient.intensity;
        }
        
        console.log("✅ Lighting settings updated");
    }
    
    // Function to get current lighting settings
    function getLightingSettings() {
        return {
            frontMain: {
                intensity: lights.frontMain ? lights.frontMain.intensity : 0,
                position: lights.frontMain ? lights.frontMain.position : {x: 0, y: 0, z: 0}
            },
            backLight: {
                intensity: lights.backLight ? lights.backLight.intensity : 0,
                position: lights.backLight ? lights.backLight.position : {x: 0, y: 0, z: 0}
            },
            sideLeft: {
                intensity: lights.sideLeft ? lights.sideLeft.intensity : 0,
                position: lights.sideLeft ? lights.sideLeft.position : {x: 0, y: 0, z: 0}
            },
            sideRight: {
                intensity: lights.sideRight ? lights.sideRight.intensity : 0,
                position: lights.sideRight ? lights.sideRight.position : {x: 0, y: 0, z: 0}
            },
            frontDetail1: {
                intensity: lights.frontDetail1 ? lights.frontDetail1.intensity : 0,
                position: lights.frontDetail1 ? lights.frontDetail1.position : {x: 0, y: 0, z: 0}
            },
            frontDetail2: {
                intensity: lights.frontDetail2 ? lights.frontDetail2.intensity : 0,
                position: lights.frontDetail2 ? lights.frontDetail2.position : {x: 0, y: 0, z: 0}
            },
            ambient: {
                intensity: lights.ambient ? lights.ambient.intensity : 0
            }
        };
    }

    return {
        sceneAddModel: sceneAddModel,
        onWindowResize: onWindowResize,

        startAnimation: startAnimation,
        startSimulation: startSimulation,
        pauseSimulation: pauseSimulation,

        enableControls: enableControls,//user interaction
        scene: scene,
        camera: camera,//needed for user interaction
        renderer: renderer,//needed for VR
        modelWrapper:modelWrapper,

        // saveSVG: saveSVG,//svg screenshot

        setCameraX:setCameraX,
        setCameraY: setCameraY,
        setCameraZ: setCameraZ,
        setCameraIso: setCameraIso,

        resetModel: resetModel,//reset model orientation
        resetCamera:resetCamera,
        setBackgroundColor: setBackgroundColor,
        
        // Lighting control functions
        updateLighting: updateLighting,
        getLightingSettings: getLightingSettings
    }
}