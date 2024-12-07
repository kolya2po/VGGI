class ConicalSurfaceModel {
    constructor(gl, uSteps, vSteps, L, T, B) {
        this.gl = gl;
        this.uSteps = uSteps;
        this.vSteps = vSteps;

        // Geometry parameters
        this.L = L; // length of perpendicular
        this.T = T;  // Z limit
        this.B = B; // Y limit

        // Parameter ranges that form a closed loop at v=0 and v=1
        this.uMin = 0.0;
        this.uMax = 1.0;
        this.vMin = 0.0;
        this.vMax = 1.0;

        // uLinesPlus, uLinesMinus: lines in u-direction (+ and - branches)
        // vLinesPlus, vLinesMinus: lines in v-direction (+ and - branches)
        this.uLinesPlus = [];
        this.uLinesMinus = [];
        this.vLinesPlus = [];
        this.vLinesMinus = [];

        this.generateSurfaceData();
    }

    generateSurfaceData() {
        // U polylines: For each v, vary u
        for (let j = 0; j <= this.vSteps; j++) {
            let vVal = this.vMin + (this.vMax - this.vMin) * (j / this.vSteps);

            const oneULinePlus = [];
            const oneULineMinus = [];

            for (let i = 0; i <= this.uSteps; i++) {
                let uVal = this.uMin + (this.uMax - this.uMin) * (i / this.uSteps);

                const vertPlus = this.calculateVertex(uVal, vVal, +1);
                const vertMinus = this.calculateVertex(uVal, vVal, -1);

                oneULinePlus.push(...vertPlus);
                oneULineMinus.push(...vertMinus);
            }

            this.uLinesPlus.push(oneULinePlus);
            this.uLinesMinus.push(oneULineMinus);
        }

        // V polylines: For each u, vary v
        for (let i = 0; i <= this.uSteps; i++) {
            let uVal = this.uMin + (this.uMax - this.uMin) * (i / this.uSteps);

            const oneVLinePlus = [];
            const oneVLineMinus = [];

            for (let j = 0; j <= this.vSteps; j++) {
                let vVal = this.vMin + (this.vMax - this.vMin) * (j / this.vSteps);

                const vertPlus = this.calculateVertex(uVal, vVal, +1);
                const vertMinus = this.calculateVertex(uVal, vVal, -1);

                oneVLinePlus.push(...vertPlus);
                oneVLineMinus.push(...vertMinus);
            }

            this.vLinesPlus.push(oneVLinePlus);
            this.vLinesMinus.push(oneVLineMinus);
        }
    }

    calculateVertex(u, v, sign) {
        const L = this.L;
        const T = this.T;
        const B = this.B;

        const X = L * (1 - u);
        const Z = ((Math.sqrt(3) * T) / 3) * (1 - u) + u * v * T;

        let Y = 0;
        const numerator = 3 * (1 - v);
        const denominator = 1 + 3 * v;

        if (numerator >= 0 && denominator > 0) {
            const radVal = Math.sqrt(numerator / denominator);
            Y = sign * 2.5426 * B * v * radVal * u;
        }

        return [X, Y, Z];
    }

    draw(shaderProgram) {
        const gl = this.gl;

        const drawLines = (linesArray) => {
            for (let line of linesArray) {
                const buf = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, buf);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(line), gl.STATIC_DRAW);

                gl.vertexAttribPointer(shaderProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(shaderProgram.iAttribVertex);

                // Draw each line as a strip
                gl.drawArrays(gl.LINE_STRIP, 0, line.length / 3);
            }
        };

        // Draw all sets of lines:
        // U-lines (+ branch)
        drawLines(this.uLinesPlus);
        // U-lines (- branch)
        drawLines(this.uLinesMinus);

        // V-lines (+ branch)
        drawLines(this.vLinesPlus);
        // V-lines (- branch)
        drawLines(this.vLinesMinus);
    }
}