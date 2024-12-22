const vertexShaderSource = `#version 100
attribute vec3 vertex;
attribute vec3 normal;
attribute vec2 uv;
attribute vec3 tangent;
attribute vec3 bitangent;

uniform mat4 ModelViewProjectionMatrix;
uniform mat4 ModelViewMatrix;
uniform mat3 NormalMatrix;

varying vec2 vTexCoord;
varying vec3 vT; // tangent in eye space
varying vec3 vB; // bitangent in eye space
varying vec3 vN; // normal in eye space
varying vec3 vPosition;

void main(void) {
    vec4 posEye = ModelViewMatrix * vec4(vertex, 1.0);
    vPosition = posEye.xyz;

    // Prioritize normal vector in Gram-Schmidt
    vec3 N = normalize(NormalMatrix * normal);
    // Orthogonalize tangent
    vec3 T = tangent - dot(tangent, N)*N;
    T = normalize(T);
    T = NormalMatrix * T;

    // Bitangent using cross
    vec3 B = NormalMatrix * bitangent;
    // Recompute if needed to ensure orthogonality
    B = normalize(cross(N, T));

    vN = N;
    vT = T;
    vB = B;

    vTexCoord = uv;

    gl_Position = ModelViewProjectionMatrix * vec4(vertex, 1.0);
}
`;

const fragmentShaderSource = `#version 100
precision mediump float;                                  
                                                          
varying vec2 vTexCoord;
varying vec3 vT;                                          
varying vec3 vB;                                          
varying vec3 vN;                                          
varying vec3 vPosition;                                   
                                                          
uniform sampler2D diffuseTex;
uniform sampler2D specularTex;                            
uniform sampler2D normalTex;                              
                                                          
uniform vec4 color;
uniform vec3 lightPos;                                    
uniform vec3 Ka;                                          
uniform vec3 Kd;                                          
uniform vec3 Ks;                                          
uniform float shininess;                                  
                                                          
uniform float uRotationAngle;
uniform vec2 uRotationCenter;                             
                                                          
vec2 rotateUV(vec2 uv, vec2 center, float angle) {
    vec2 temp = uv - center;

    float c = cos(angle);
    float s = sin(angle);                                 
    mat2 R = mat2(c, -s, s, c);

    temp = R * temp;
    return temp + center;                                 
}                                                         
                                                          
void main(void) {                                         
    mat3 TBN = mat3(normalize(vT), normalize(vB), normalize(vN));
                                                          
    vec2 uv_rot = rotateUV(vTexCoord, uRotationCenter, uRotationAngle);
                                                          
    vec3 N_tangent = texture2D(normalTex, uv_rot).rgb;
    N_tangent = 2.0 * N_tangent - 1.0;  // Range from [0,1]->[-1,1]      
    vec3 N = normalize(TBN * N_tangent);                   
                                                          
    vec3 diffColor = texture2D(diffuseTex, uv_rot).rgb;
    // Specular factor                                    
    float specFactor = texture2D(specularTex, uv_rot).r;   
                                                          
    vec3 L = normalize(lightPos - vPosition);

    vec3 V = vec3(0,0,1);
    vec3 R = reflect(-L, N);                               
                                                          
    float diffuse = max(dot(N, L), 0.0);                   
    float spec = 0.0;                                      
    if (diffuse > 0.0) {                                  
        spec = pow(max(dot(R,V), 0.0), shininess) * specFactor; 
    }                                                     
                                                          
    vec3 ambient = Ka;                                    
    vec3 diff = Kd * diffColor * diffuse;                 
    vec3 specular = Ks * spec;                            
    vec3 finalColor = ambient + diff + specular;

    float d = distance(vTexCoord, uRotationCenter);
    if(d < 0.01) {
       finalColor = mix(finalColor, vec3(1.0,0.0,0.0), 0.8);
    }

    gl_FragColor = vec4(finalColor, 1.0) * color;
}                                                         
`;
