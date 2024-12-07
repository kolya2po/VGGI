class ConicalSurfaceModel {
    constructor(gl, uSteps, vSteps, L, T, B) {
        this.gl = gl;
        this.uSteps = uSteps;
        this.vSteps = vSteps;
        this.L = L;
        this.T = T;
        this.B = B;

        this.uMin = 0.0;
        this.uMax = 1.0;
        this.vMin = 0.0;
        this.vMax = 1.0;

        this.createMesh();
        this.initBuffers();
    }

    calculatePosition(u, v, sign) {
        const X = this.L * (1 - u);

        const numerator = 3*(1-v);
        const denominator = 1 + 3*v;
        let Y = 0;
        if (numerator >= 0 && denominator > 0) {
            const radVal = Math.sqrt(numerator / denominator);
            Y = sign * 2.5426 * this.B * v * radVal * u;
        }

        const Z = ((Math.sqrt(3)*this.T)/3)*(1-u) + u*v*this.T;
        return [X, Y, Z];
    }

    createMesh() {
        let uCount = this.uSteps+1;
        let vCount = this.vSteps+1;
        let totalVertices = uCount * vCount * 2;

        this.vertexPositions = new Float32Array(totalVertices * 3);

        // Fill vertex positions for both + and - branches
        for (let v=0; v<vCount; v++) {
            let vv = this.vMin + (this.vMax - this.vMin)*v/this.vSteps;
            for (let u=0; u<uCount; u++) {
                let uu = this.uMin + (this.uMax - this.uMin)*u/this.uSteps;
                let pPlus = this.calculatePosition(uu, vv, +1);
                let pMinus = this.calculatePosition(uu, vv, -1);

                let plusIndex = v*uCount + u;
                let minusIndex = plusIndex + (vCount*uCount);

                this.vertexPositions[plusIndex * 3] = pPlus[0];
                this.vertexPositions[plusIndex*3+1] = pPlus[1];
                this.vertexPositions[plusIndex*3+2] = pPlus[2];

                this.vertexPositions[minusIndex * 3] = pMinus[0];
                this.vertexPositions[minusIndex*3+1] = pMinus[1];
                this.vertexPositions[minusIndex*3+2] = pMinus[2];
            }
        }

        // Build indices for rendering triangles
        let indices = [];
        for (let v=0; v<vCount-1; v++) {
            for (let u=0; u<uCount-1; u++) {
                let plusTL = v*uCount+u;
                let plusTR = v*uCount+(u+1);
                let plusBL = (v+1)*uCount+u;
                let plusBR = (v+1)*uCount+(u+1);

                let minusTL = plusTL + vCount*uCount;
                let minusTR = plusTR + vCount*uCount;
                let minusBL = plusBL + vCount*uCount;
                let minusBR = plusBR + vCount*uCount;

                // Front face quad:
                indices.push(plusTL, plusTR, minusTR);
                indices.push(plusTL, minusTR, minusTL);

                // Right face quad:
                indices.push(plusTR, plusBR, minusBR);
                indices.push(plusTR, minusBR, minusTR);

                // Left face quad:
                indices.push(plusTL, minusTL, minusBL);
                indices.push(plusTL, minusBL, plusBL);

                // Back face quad:
                indices.push(plusBL, plusBR, minusBR);
                indices.push(plusBL, minusBR, minusBL);
            }
        }

        this.indices = new Uint16Array(indices);

        // Compute facet-average normals
        this.vertexNormals = new Float32Array(totalVertices*3);
        let faceCount = this.indices.length/3;
        let tempNormals = new Array(totalVertices);
        for (let i=0; i<totalVertices; i++) tempNormals[i] = [0,0,0];

        for (let f=0; f<faceCount; f++) {
            let i1 = this.indices[f * 3];
            let i2 = this.indices[f*3+1];
            let i3 = this.indices[f*3+2];

            let p1 = [this.vertexPositions[i1*3], this.vertexPositions[i1*3+1], this.vertexPositions[i1*3+2]];
            let p2 = [this.vertexPositions[i2*3], this.vertexPositions[i2*3+1], this.vertexPositions[i2*3+2]];
            let p3 = [this.vertexPositions[i3*3], this.vertexPositions[i3*3+1], this.vertexPositions[i3*3+2]];

            let U = [p2[0]-p1[0], p2[1]-p1[1], p2[2]-p1[2]];
            let V = [p3[0]-p1[0], p3[1]-p1[1], p3[2]-p1[2]];
            let Nx = U[1]*V[2] - U[2]*V[1];
            let Ny = U[2]*V[0] - U[0]*V[2];
            let Nz = U[0]*V[1] - U[1]*V[0];

            // Add to each vertex normal
            tempNormals[i1][0]+=Nx; tempNormals[i1][1]+=Ny; tempNormals[i1][2]+=Nz;
            tempNormals[i2][0]+=Nx; tempNormals[i2][1]+=Ny; tempNormals[i2][2]+=Nz;
            tempNormals[i3][0]+=Nx; tempNormals[i3][1]+=Ny; tempNormals[i3][2]+=Nz;
        }

        // Normalize the normals
        for (let i=0; i<totalVertices; i++){
            let len = Math.sqrt(tempNormals[i][0]*tempNormals[i][0] + tempNormals[i][1]*tempNormals[i][1] + tempNormals[i][2]*tempNormals[i][2]);
            if (len > 0.000001) {
                this.vertexNormals[i*3] = tempNormals[i][0]/len;
                this.vertexNormals[i*3+1] = tempNormals[i][1]/len;
                this.vertexNormals[i*3+2] = tempNormals[i][2]/len;
            } else {
                this.vertexNormals[i*3] = 0;
                this.vertexNormals[i*3+1] = 0;
                this.vertexNormals[i*3+2] = 1;
            }
        }
    }

    initBuffers() {
        const gl = this.gl;
        this.vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertexPositions, gl.STATIC_DRAW);

        this.normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertexNormals, gl.STATIC_DRAW);

        this.indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);
    }

    draw(shaderProgram) {
        const gl = this.gl;

        // Bind vertex buffer and set attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.vertexAttribPointer(shaderProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shaderProgram.iAttribVertex);

        // Bind normal buffer and set attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.vertexAttribPointer(shaderProgram.iAttribNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shaderProgram.iAttribNormal);

        // Bind index buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

        // Draw the triangles
        gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_SHORT,0);
    }
}
