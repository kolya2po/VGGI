'use strict';
import ConicalSurfaceModel from "./ConicalSurfaceModel.mjs";
import TrackballRotator from "./Utils/trackball-rotator.mjs";

let gl;
let surface;
let shProgram;
let spaceball;
let zoom = 1.0;

let uSlider, vSlider, scaleSlider;

let diffuseTexture, specularTexture, normalTexture;
let texturesLoaded = 0;

let lightAngle = 0.0;

let highlightU = 0.5;
let highlightV = 0.5;
const highlightStep = 0.05;

let texScaleValue = 1.0;

function ShaderProgram(program) {
    this.prog = program;

    this.iAttribVertex    = -1;
    this.iAttribNormal    = -1;
    this.iAttribUV        = -1;
    this.iAttribTangent   = -1;
    this.iAttribBitangent = -1;

    this.iModelViewProjectionMatrix = -1;
    this.iModelViewMatrix           = -1;
    this.iNormalMatrix              = -1;
    this.iColor                     = -1;
    this.iLightPos                  = -1;
    this.iKa                        = -1;
    this.iKd                        = -1;
    this.iKs                        = -1;
    this.iShininess                 = -1;
    this.iDiffuseTex                = -1;
    this.iSpecularTex               = -1;
    this.iNormalTex                 = -1;

    this.iTexScale   = -1;
    this.iTexPivot   = -1;

    this.iHighlightUV = -1;

    this.Use = function() {
        gl.useProgram(this.prog);
    };
}

function createProgram(gl, vShaderSrc, fShaderSrc) {
    let vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vShaderSrc);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader:\n" + gl.getShaderInfoLog(vsh));
    }

    let fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fShaderSrc);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in fragment shader:\n" + gl.getShaderInfoLog(fsh));
    }

    let prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Link error in program:\n" + gl.getProgramInfoLog(prog));
    }
    return prog;
}

function loadTexture(url) {
    const texture = gl.createTexture();
    texture.image = new Image();
    texture.image.onload = function() {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.bindTexture(gl.TEXTURE_2D, null);
        texturesLoaded++;
    };
    texture.image.src = url;
    return texture;
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

function draw() {
    if (texturesLoaded < 3) {
        requestAnimationFrame(draw);
        return;
    }

    gl.clearColor(0,0,0,1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let projection = m4.perspective(Math.PI/8, 1, 8, 50);
    let modelView = spaceball.getViewMatrix();

    let rotX = m4.xRotation((270 * Math.PI) / 180);
    let rotY = m4.yRotation((45 * Math.PI) / 180);
    modelView = m4.multiply(rotX, modelView);
    modelView = m4.multiply(rotY, modelView);

    let translateBack = m4.translation(0, 0, -15 / zoom);
    modelView = m4.multiply(translateBack, modelView);

    lightAngle += 0.01;
    let lx = 5.0 * Math.cos(lightAngle);
    let ly = 4.0;
    let lz = 5.0 * Math.sin(lightAngle);
    let lightPos = [lx, ly, lz];
    let lightEye = m4.transformPoint(modelView, lightPos);

    let modelViewProjection = m4.multiply(projection, modelView);

    let normalMatrix = m4.inverse(modelView);
    normalMatrix = m4.transpose(normalMatrix);
    let normalMatrix3 = [
        normalMatrix[0], normalMatrix[1], normalMatrix[2],
        normalMatrix[4], normalMatrix[5], normalMatrix[6],
        normalMatrix[8], normalMatrix[9], normalMatrix[10]
    ];

    shProgram.Use();

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix,           false, modelView);
    gl.uniformMatrix3fv(shProgram.iNormalMatrix,              false, normalMatrix3);

    gl.uniform4fv(shProgram.iColor,    [1,1,1,1]);
    gl.uniform3fv(shProgram.iLightPos, lightEye);
    gl.uniform3fv(shProgram.iKa,       [0.2, 0.2, 0.2]);
    gl.uniform3fv(shProgram.iKd,       [0.8, 0.8, 0.7]);
    gl.uniform3fv(shProgram.iKs,       [1.0, 1.0, 1.0]);
    gl.uniform1f(shProgram.iShininess, 50.0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, diffuseTexture);
    gl.uniform1i(shProgram.iDiffuseTex, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, specularTexture);
    gl.uniform1i(shProgram.iSpecularTex, 1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, normalTexture);
    gl.uniform1i(shProgram.iNormalTex, 2);

    gl.uniform2f(shProgram.iTexPivot, highlightU, highlightV);
    gl.uniform1f(shProgram.iTexScale, texScaleValue);

    gl.uniform2f(shProgram.iHighlightUV, highlightU, highlightV);

    surface.draw(shProgram);

    requestAnimationFrame(draw);
}

function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    shProgram = new ShaderProgram(prog);
    shProgram.Use();

    shProgram.iAttribVertex    = gl.getAttribLocation(prog, 'vertex');
    shProgram.iAttribNormal    = gl.getAttribLocation(prog, 'normal');
    shProgram.iAttribUV        = gl.getAttribLocation(prog, 'uv');
    shProgram.iAttribTangent   = gl.getAttribLocation(prog, 'tangent');
    shProgram.iAttribBitangent = gl.getAttribLocation(prog, 'bitangent');

    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, 'ModelViewProjectionMatrix');
    shProgram.iModelViewMatrix           = gl.getUniformLocation(prog, 'ModelViewMatrix');
    shProgram.iNormalMatrix              = gl.getUniformLocation(prog, 'NormalMatrix');
    shProgram.iColor                     = gl.getUniformLocation(prog, 'color');
    shProgram.iLightPos                  = gl.getUniformLocation(prog, 'lightPos');
    shProgram.iKa                        = gl.getUniformLocation(prog, 'Ka');
    shProgram.iKd                        = gl.getUniformLocation(prog, 'Kd');
    shProgram.iKs                        = gl.getUniformLocation(prog, 'Ks');
    shProgram.iShininess                 = gl.getUniformLocation(prog, 'shininess');
    shProgram.iDiffuseTex                = gl.getUniformLocation(prog, 'diffuseTex');
    shProgram.iSpecularTex               = gl.getUniformLocation(prog, 'specularTex');
    shProgram.iNormalTex                 = gl.getUniformLocation(prog, 'normalTex');
    shProgram.iTexPivot                  = gl.getUniformLocation(prog, 'texPivot');
    shProgram.iTexScale                  = gl.getUniformLocation(prog, 'texScale');
    shProgram.iHighlightUV               = gl.getUniformLocation(prog, 'highlightUV');

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    buildSurface();

    // Load textures
    diffuseTexture  = loadTexture("Textures/diffuse.jpg");
    specularTexture = loadTexture("Textures/specular.jpg");
    normalTexture   = loadTexture("Textures/normal.jpg");
}

function init() {
    let canvas = document.getElementById('webglcanvas');
    gl = canvas.getContext('webgl');
    if (!gl) {
        document.getElementById('canvas-holder').innerHTML =
            "<p>Sorry, could not get a WebGL context.</p>";
        return;
    }

    uSlider = document.getElementById('uSlider');
    vSlider = document.getElementById('vSlider');
    scaleSlider = document.getElementById('scaleSlider');

    uSlider.oninput = () => { buildSurface(); };
    vSlider.oninput = () => { buildSurface(); };
    scaleSlider.oninput = () => {
        texScaleValue = parseFloat(scaleSlider.value) / 100.0;
    };

    initGL();
    spaceball = new TrackballRotator(canvas, null, 0);

    // Zoom with mouse wheel
    canvas.addEventListener('wheel', function(ev) {
        ev.preventDefault();
        zoom += ev.deltaY * -0.001;
        zoom = Math.min(Math.max(zoom, 0.1), 2);
    });

    window.addEventListener('keydown', (ev) => {
        switch (ev.key) {
            case 'a':
            case 'A':
                highlightU += highlightStep;
                if (highlightU > 1.0) highlightU = 1.0;
                break;
            case 'd':
            case 'D':
                highlightU -= highlightStep;
                if (highlightU < 0.0) highlightU = 0.0;
                break;
            case 'w':
            case 'W':
                highlightV += highlightStep;
                if (highlightV > 1.0) highlightV = 1.0;
                break;
            case 's':
            case 'S':
                highlightV -= highlightStep;
                if (highlightV < 0.0) highlightV = 0.0;
                break;
            default:
                break;
        }
    });

    draw();
}

document.addEventListener("DOMContentLoaded", init);
