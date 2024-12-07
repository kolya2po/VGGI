// Vertex shader (Phong per-fragment)
const vertexShaderSource = `
       attribute vec3 vertex;
       attribute vec3 normal;

       uniform mat4 ModelViewProjectionMatrix;
       uniform mat4 ModelViewMatrix;
       uniform mat3 NormalMatrix;

       varying vec3 vNormal;
       varying vec3 vPosition;

       void main(void) {
           vec4 pos = ModelViewMatrix * vec4(vertex, 1.0);
           vPosition = pos.xyz;
           vNormal = normalize(NormalMatrix * normal);
           gl_Position = ModelViewProjectionMatrix * vec4(vertex, 1.0);
       }
   `;

// Fragment shader (Phong lighting)
const fragmentShaderSource = `
       precision mediump float;

       varying vec3 vNormal;
       varying vec3 vPosition;

       uniform vec4 color;
       uniform vec3 lightPos;   // Light position in eye space
       uniform vec3 Ka;         // Ambient reflectivity
       uniform vec3 Kd;         // Diffuse reflectivity
       uniform vec3 Ks;         // Specular reflectivity
       uniform float shininess;

       void main(void) {
           vec3 N = normalize(vNormal);
           vec3 L = normalize(lightPos - vPosition);
           vec3 V = vec3(0,0,1);
           vec3 R = reflect(-L, N);

           float diffuse = max(dot(N, L), 0.0);
           float spec = 0.0;
           if(diffuse > 0.0) {
               spec = pow(max(dot(R,V), 0.0), shininess);
           }

           vec3 ambient = Ka;
           vec3 diff = Kd * diffuse;
           vec3 specular = Ks * spec;

           vec3 finalColor = ambient + diff + specular;
           gl_FragColor = vec4(finalColor, 1.0) * color;
       }
   `;