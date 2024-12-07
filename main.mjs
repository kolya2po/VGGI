'use strict';
import ConicalSurfaceModel from "./ConicalSurfaceModel.mjs";
import TrackballRotator from "./Utils/trackball-rotator.mjs";


let gl;
let surface;
let shProgram;
let spaceball;
let zoom;
let uSlider, vSlider;

// Introduce light rotation angle
let lightAngle = 0.0;

function ShaderProgram(name, program) {
    this.name = name;
    this.prog = program;
    this.iAttribVertex = -1;
    this.iAttribNormal = -1;
    this.iColor = -1;
    this.iModelViewProjectionMatrix = -1;
    this.iModelViewMatrix = -1;
    this.iNormalMatrix = -1;
    this.iLightPos = -1;
    this.iKa = -1;
    this.iKd = -1;
    this.iKs = -1;
    this.iShininess = -1;

    this.Use = function() {
        gl.useProgram(this.prog);
    }
}

function draw() {
    gl.clearColor(0,0,0,1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let projection = m4.perspective(Math.PI/8, 1, 8, 50);
    let modelView = spaceball.getViewMatrix();

    let rotX = m4.xRotation(270 * Math.PI / 180);
    modelView = m4.multiply(rotX, modelView);

    let rotY = m4.yRotation(45 * Math.PI / 180);
    modelView = m4.multiply(rotY, modelView);

    let translateToPointZero = m4.translation(0, 0, -15/zoom);
    modelView = m4.multiply(translateToPointZero, modelView);

    // Update light angle
    lightAngle += 0.01; // rotate the light around Y-axis
    let lx = 5.0 * Math.cos(lightAngle);
    let lz = 5.0 * Math.sin(lightAngle);
    let ly = 4.0;
    let lightPos = [lx, ly, lz];

    // Transform light into eye space:
    let lightEye = m4.transformPoint(modelView, lightPos);

    let modelViewProjection = m4.multiply(projection, modelView);

    let normalMatrix = m4.inverse(modelView);
    normalMatrix = m4.transpose(normalMatrix);
    let normalMatrix3 = [
        normalMatrix[0],normalMatrix[1],normalMatrix[2],
        normalMatrix[4],normalMatrix[5],normalMatrix[6],
        normalMatrix[8],normalMatrix[9],normalMatrix[10]
    ];

    shProgram.Use();
    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, modelView);
    gl.uniformMatrix3fv(shProgram.iNormalMatrix, false, normalMatrix3);

    // Set material and light
    gl.uniform4fv(shProgram.iColor, [1,1,1,1]);
    gl.uniform3fv(shProgram.iLightPos, lightEye);
    gl.uniform3fv(shProgram.iKa, [0.2,0.2,0.2]);
    gl.uniform3fv(shProgram.iKd, [0.8,0.8,0.7]);
    gl.uniform3fv(shProgram.iKs, [1.0,1.0,1.0]);
    gl.uniform1f(shProgram.iShininess, 50.0);

    surface.draw(shProgram);

    requestAnimationFrame(draw);
}

function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    shProgram = new ShaderProgram('Phong', prog);
    shProgram.Use();

    shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    shProgram.iAttribNormal = gl.getAttribLocation(prog, "normal");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iModelViewMatrix = gl.getUniformLocation(prog, "ModelViewMatrix");
    shProgram.iNormalMatrix = gl.getUniformLocation(prog, "NormalMatrix");
    shProgram.iColor = gl.getUniformLocation(prog, "color");
    shProgram.iLightPos = gl.getUniformLocation(prog, "lightPos");
    shProgram.iKa = gl.getUniformLocation(prog, "Ka");
    shProgram.iKd = gl.getUniformLocation(prog, "Kd");
    shProgram.iKs = gl.getUniformLocation(prog, "Ks");
    shProgram.iShininess = gl.getUniformLocation(prog, "shininess");

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    buildSurface();
}

function buildSurface() {
    const L = 2.0;
    const T = 2.0;
    const B = 0.5;

    let uSteps = parseInt(uSlider.value);
    let vSteps = parseInt(vSlider.value);

    surface = new ConicalSurfaceModel(gl, uSteps, vSteps, L, T, B);
    surface.init();
}

function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vShader);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
    }
    let fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}

function init() {
    let canvas;
    zoom = 1;

    canvas = document.getElementById("webglcanvas");
    gl = canvas.getContext("webgl");
    if (!gl) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }

    uSlider = document.getElementById("uSlider");
    vSlider = document.getElementById("vSlider");

    uSlider.oninput = function() {
        buildSurface();
    };
    vSlider.oninput = function() {
        buildSurface();
    };

    initGL();
    spaceball = new TrackballRotator(canvas, null, 0);

    // Zoom event
    canvas.addEventListener('wheel', function(event) {
        event.preventDefault();
        zoom += event.deltaY * -0.001;
        zoom = Math.min(Math.max(zoom, 0.1), 2);
    });

    draw();
}

document.addEventListener("DOMContentLoaded", init);