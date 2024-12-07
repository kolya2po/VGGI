export default function ConicalSurfaceModel(gl, uSteps, vSteps, L, T, B)  {
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

    this.init = function () {
        this.createMesh();
        this.initBuffers();
    }

    this.calculatePosition = function(u, v, sign) {
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

    // Helper to approximate partial derivatives for tangent/bitangent
    this.partialDerivativeU = function (u, v, sign, delta=0.0001) {
        let p1 = this.calculatePosition(u, v, sign);
        let p2 = this.calculatePosition(u+delta, v, sign);
        return [p2[0]-p1[0], p2[1]-p1[1], p2[2]-p1[2]];
    }

    this.partialDerivativeV = function (u, v, sign, delta=0.0001) {
        let p1 = this.calculatePosition(u, v, sign);
        let p2 = this.calculatePosition(u, v+delta, sign);
        return [p2[0]-p1[0], p2[1]-p1[1], p2[2]-p1[2]];
    }

    this.createMesh = function () {
        let uCount = this.uSteps+1;
        let vCount = this.vSteps+1;
        let totalVertices = uCount * vCount * 2;

        this.vertexPositions = new Float32Array(totalVertices * 3);
        this.vertexNormals = new Float32Array(totalVertices * 3);
        this.vertexUV = new Float32Array(totalVertices * 2);
        this.vertexTangents = new Float32Array(totalVertices * 3);
        this.vertexBitangents = new Float32Array(totalVertices * 3);

        // Fill vertex positions, UVs, tangents, bitangents
        for (let v=0; v<vCount; v++) {
            let vv = this.vMin + (this.vMax - this.vMin)*v/this.vSteps;
            for (let u=0; u<uCount; u++) {
                let uu = this.uMin + (this.uMax - this.uMin)*u/this.uSteps;
                let pPlus = this.calculatePosition(uu, vv, +1);
                let pMinus = this.calculatePosition(uu, vv, -1);

                let plusIndex = v*uCount + u;
                let minusIndex = plusIndex + (vCount*uCount);

                // Positions
                this.vertexPositions[plusIndex*3]   = pPlus[0];
                this.vertexPositions[plusIndex*3+1] = pPlus[1];
                this.vertexPositions[plusIndex*3+2] = pPlus[2];

                this.vertexPositions[minusIndex*3]   = pMinus[0];
                this.vertexPositions[minusIndex*3+1] = pMinus[1];
                this.vertexPositions[minusIndex*3+2] = pMinus[2];

                // UVs (simple mapping)
                let uCoord = u / this.uSteps;
                let vCoord = v / this.vSteps;
                this.vertexUV[plusIndex*2]   = uCoord;
                this.vertexUV[plusIndex*2+1] = vCoord;
                this.vertexUV[minusIndex*2]   = uCoord;
                this.vertexUV[minusIndex*2+1] = vCoord;

                // Tangent/Bitangent approximation
                let dPdu_plus = this.partialDerivativeU(uu,vv,+1);
                let dPdv_plus = this.partialDerivativeV(uu,vv,+1);

                let dPdu_minus = this.partialDerivativeU(uu,vv,-1);
                let dPdv_minus = this.partialDerivativeV(uu,vv,-1);

                // Just store them; normalization and orthogonalization done in vertex shader
                this.vertexTangents[plusIndex*3]   = dPdu_plus[0];
                this.vertexTangents[plusIndex*3+1] = dPdu_plus[1];
                this.vertexTangents[plusIndex*3+2] = dPdu_plus[2];

                this.vertexBitangents[plusIndex*3]   = dPdv_plus[0];
                this.vertexBitangents[plusIndex*3+1] = dPdv_plus[1];
                this.vertexBitangents[plusIndex*3+2] = dPdv_plus[2];

                this.vertexTangents[minusIndex*3]   = dPdu_minus[0];
                this.vertexTangents[minusIndex*3+1] = dPdu_minus[1];
                this.vertexTangents[minusIndex*3+2] = dPdu_minus[2];

                this.vertexBitangents[minusIndex*3]   = dPdv_minus[0];
                this.vertexBitangents[minusIndex*3+1] = dPdv_minus[1];
                this.vertexBitangents[minusIndex*3+2] = dPdv_minus[2];
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

    this.initBuffers = function() {
        const gl = this.gl;

        // Position buffer
        this.vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertexPositions, gl.STATIC_DRAW);

        // Normal buffer
        this.normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertexNormals, gl.STATIC_DRAW);

        // UV buffer
        this.uvBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertexUV, gl.STATIC_DRAW);

        // Tangent buffer
        this.tangentBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.tangentBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertexTangents, gl.STATIC_DRAW);

        // Bitangent buffer
        this.bitangentBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bitangentBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertexBitangents, gl.STATIC_DRAW);

        // Index buffer
        this.indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);
    }

    draw(shaderProgram) {
        const gl = this.gl;

        // Positions
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.vertexAttribPointer(shaderProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shaderProgram.iAttribVertex);

        // Normals
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.vertexAttribPointer(shaderProgram.iAttribNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shaderProgram.iAttribNormal);

        // UV
        gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
        gl.vertexAttribPointer(shaderProgram.iAttribUV, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shaderProgram.iAttribUV);

        // Tangent
        gl.bindBuffer(gl.ARRAY_BUFFER, this.tangentBuffer);
        gl.vertexAttribPointer(shaderProgram.iAttribTangent, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shaderProgram.iAttribTangent);

        // Bitangent
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bitangentBuffer);
        gl.vertexAttribPointer(shaderProgram.iAttribBitangent, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shaderProgram.iAttribBitangent);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

        // Draw the triangles
        gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_SHORT,0);
    }
}
