export default function Axes(gl) {
    this.iVertexBuffer = gl.createBuffer();
    this.CreateAxesData();

    this.CreateAxesData= function(){
        const axesVertices = [
            -1, 0, 0,   5, 0, 0,
            0, -1, 0,   0, 5, 0,
            0, 0, -1,   0, 0, 5
        ];

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(axesVertices), gl.STATIC_DRAW);
    }

    this.Draw = function(shProgram) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        // Draw the axes using lines
        gl.uniform4fv(shProgram.iColor, [1, 0, 0, 1]); // Red for X axis
        gl.drawArrays(gl.LINES, 0, 2);

        gl.uniform4fv(shProgram.iColor, [0, 1, 0, 1]); // Green for Y axis
        gl.drawArrays(gl.LINES, 2, 2);

        gl.uniform4fv(shProgram.iColor, [0, 0, 1, 1]); // Blue for Z axis
        gl.drawArrays(gl.LINES, 4, 2);
    }
}
