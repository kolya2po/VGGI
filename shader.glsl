const vertexShaderSource = `#version 100
attribute vec3 vertex;
attribute vec3 normal;
attribute vec2 uv;
attribute vec3 tangent;
attribute vec3 bitangent;

uniform mat4 ModelViewProjectionMatrix;
uniform mat4 ModelViewMatrix;
uniform mat3 NormalMatrix;

uniform float texScale;
uniform vec2 texPivot;

varying vec2 vTexCoord;
varying vec2 vOrigUV;  // the original (u,v), for highlight logic
varying vec3 vPosition;
varying vec3 vT;  // tangent in eye space
varying vec3 vB;  // bitangent in eye space
varying vec3 vN;  // normal in eye space

void main(void) {
    vec4 posEye = ModelViewMatrix * vec4(vertex, 1.0);
    vPosition = posEye.xyz;

    vec3 N = normalize(NormalMatrix * normal);

    // Step 1: project tangent away from N
    vec3 T = tangent - dot(tangent, N)*N;
    T = NormalMatrix * T;
    T = normalize(T);

    vec3 B = NormalMatrix * bitangent;
    B = normalize(cross(N, T));

    vN = N;
    vT = T;
    vB = B;

    vOrigUV = uv;

    // Texture scaling around pivot
    vec2 shifted = uv - texPivot;
    shifted *= texScale;
    vTexCoord = shifted + texPivot;

    gl_Position = ModelViewProjectionMatrix * vec4(vertex, 1.0);
}
`;

const fragmentShaderSource = `#version 100
precision mediump float;

varying vec2 vTexCoord;
varying vec2 vOrigUV;
varying vec3 vPosition;
varying vec3 vT;
varying vec3 vB;
varying vec3 vN;

uniform sampler2D diffuseTex;
uniform sampler2D specularTex;
uniform sampler2D normalTex;

uniform vec4 color;
uniform vec3 lightPos;
uniform vec3 Ka;
uniform vec3 Kd;
uniform vec3 Ks;
uniform float shininess;

uniform vec2 highlightUV;

void main(void) {
    vec3 Nn = normalize(vN);
    vec3 Tn = normalize(vT);
    vec3 Bn = normalize(vB);
    mat3 TBN = mat3(Tn, Bn, Nn);

    vec3 normalSample = texture2D(normalTex, vTexCoord).rgb;
    normalSample = 2.0 * normalSample - 1.0;
    vec3 N = normalize(TBN * normalSample);

    vec3 diffColor = texture2D(diffuseTex, vTexCoord).rgb;
    float specFactor = texture2D(specularTex, vTexCoord).r;

    vec3 L = normalize(lightPos - vPosition);
    vec3 V = vec3(0.0, 0.0, 1.0);
    vec3 R = reflect(-L, N);

    float diffuse = max(dot(N, L), 0.0);
    float spec = 0.0;
    if(diffuse > 0.0) {
        spec = pow(max(dot(R, V), 0.0), shininess) * specFactor;
    }

    vec3 ambient = Ka;
    vec3 diff    = Kd * diffColor * diffuse;
    vec3 specular= Ks * spec;

    vec3 finalRGB = ambient + diff + specular;

    // Base output color
    vec4 outColor = vec4(finalRGB, 1.0) * color;

    float distUV = distance(vOrigUV, highlightUV);
    if(distUV < 0.01) {
        float highlightStrength = 0.9;
        vec4 highlightColor = vec4(1.0, 0.0, 0.0, 1.0);
        outColor = mix(outColor, highlightColor, highlightStrength);
    }

    gl_FragColor = outColor;
}
`;
