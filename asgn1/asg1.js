let VSHADER = `
precision mediump float;
attribute vec4 a_Position;
uniform float u_Size;
void main() {
  gl_Position = a_Position;
  gl_PointSize = u_Size;
}`;

let FSHADER = `
precision mediump float;
uniform vec4 u_FragColor;
void main() {
  gl_FragColor = u_FragColor;
}`;

let canvas, gl;
let a_Position, u_FragColor, u_Size;

let g_shapesList = [];
let g_color = [0, 0, 1, 1];
let g_size = 10;
let g_segments = 10;
let g_type = 0;

const POINT = 0;
const TRIANGLE = 1;
const CIRCLE = 2;

function main() {
  canvas = document.getElementById("webgl");
  gl = getWebGLContext(canvas, { preserveDrawingBuffer: true });

  initShaders(gl, VSHADER, FSHADER);

  a_Position = gl.getAttribLocation(gl.program, "a_Position");
  u_FragColor = gl.getUniformLocation(gl.program, "u_FragColor");
  u_Size = gl.getUniformLocation(gl.program, "u_Size");

  document.getElementById("redS").oninput = function() { g_color[0] = this.value / 20; };
  document.getElementById("greenS").oninput = function() { g_color[1] = this.value / 20; };
  document.getElementById("blueS").oninput = function() { g_color[2] = this.value / 20; };
  document.getElementById("sizeS").oninput = function() { g_size = this.value; };
  document.getElementById("segmentS").oninput = function() { g_segments = this.value; };

  document.getElementById("squareButton").onclick = () => g_type = POINT;
  document.getElementById("triangleButton").onclick = () => g_type = TRIANGLE;
  document.getElementById("circleButton").onclick = () => g_type = CIRCLE;

  document.getElementById("clearButton").onclick = () => {
    g_shapesList = [];
    render();
  };

  document.getElementById("pictureButton").onclick = () => drawMyPicture();

  canvas.onmousedown = click;
  canvas.onmousemove = function(ev) {
    if (ev.buttons == 1) click(ev);
  };

  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
}

function click(ev) {
  let [x, y] = convert(ev);

  let shape;
  if (g_type == POINT) shape = new Point();
  else if (g_type == TRIANGLE) shape = new Triangle();
  else {
    shape = new Circle();
    shape.segments = g_segments;
  }

  shape.position = [x, y];
  shape.color = [...g_color];
  shape.size = g_size;

  g_shapesList.push(shape);
  render();
}

function convert(ev) {
  let rect = ev.target.getBoundingClientRect();
  let x = ((ev.clientX - rect.left) - canvas.width/2)/(canvas.width/2);
  let y = (canvas.height/2 - (ev.clientY - rect.top))/(canvas.height/2);
  return [x,y];
}

function render() {
  gl.clear(gl.COLOR_BUFFER_BIT);
  for (let s of g_shapesList) s.render();
}

class Point {
  render() {
    gl.disableVertexAttribArray(a_Position);
    gl.vertexAttrib3f(a_Position, this.position[0], this.position[1], 0);
    gl.uniform4f(u_FragColor, ...this.color);
    gl.uniform1f(u_Size, this.size);
    gl.drawArrays(gl.POINTS, 0, 1);
  }
}

class Triangle {
  render() {
    let d = this.size / 200;
    let [x, y] = this.position;

    drawTriangle([x, y+d, x-d, y-d, x+d, y-d], this.color);
  }
}

class Circle {
  render() {
    let [x, y] = this.position;
    let d = this.size / 200;
    let step = 360 / this.segments;

    for (let a = 0; a < 360; a += step) {
      let a1 = a * Math.PI / 180;
      let a2 = (a + step) * Math.PI / 180;

      let p1 = [x + Math.cos(a1)*d, y + Math.sin(a1)*d];
      let p2 = [x + Math.cos(a2)*d, y + Math.sin(a2)*d];

      drawTriangle([x,y, p1[0],p1[1], p2[0],p2[1]], this.color);
    }
  }
}

function drawTriangle(v, color) {
  gl.uniform4f(u_FragColor, ...color);

  let buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v), gl.DYNAMIC_DRAW);

  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

function drawMyPicture() {
  gl.clear(gl.COLOR_BUFFER_BIT);

  const blue  = [0.0, 0.25, 0.75, 1.0];
  const white = [1.0, 1.0, 1.0, 1.0];

  function T(v, c) {
    drawTriangle(v, c);
  }


  T([-0.62, 0.58, -0.48, 0.64, -0.48, 0.52], blue);
  T([-0.62, 0.46, -0.48, 0.52, -0.48, 0.40], blue);
  T([-0.62, 0.34, -0.48, 0.40, -0.48, 0.28], blue);
  T([-0.62, 0.22, -0.48, 0.28, -0.48, 0.16], blue);
  T([-0.62, 0.10, -0.48, 0.16, -0.48, 0.04], blue);
  T([-0.62,-0.02, -0.48, 0.04, -0.48,-0.08], blue);

  T([-0.48, 0.64, -0.34, 0.58, -0.34, 0.46], blue);
  T([-0.48, 0.52, -0.34, 0.46, -0.34, 0.34], blue);
  T([-0.48, 0.40, -0.34, 0.34, -0.34, 0.22], blue);
  T([-0.48, 0.28, -0.34, 0.22, -0.34, 0.10], blue);
  T([-0.48, 0.16, -0.34, 0.10, -0.34,-0.02], blue);

  T([0.02, 0.58, 0.16, 0.64, 0.16, 0.52], blue);
  T([0.02, 0.46, 0.16, 0.52, 0.16, 0.40], blue);
  T([0.02, 0.34, 0.16, 0.40, 0.16, 0.28], blue);
  T([0.02, 0.22, 0.16, 0.28, 0.16, 0.16], blue);
  T([0.02, 0.10, 0.16, 0.16, 0.16, 0.04], blue);
  T([0.02,-0.02, 0.16, 0.04, 0.16,-0.08], blue);

  T([0.16, 0.64, 0.30, 0.58, 0.30, 0.46], blue);
  T([0.16, 0.52, 0.30, 0.46, 0.30, 0.34], blue);
  T([0.16, 0.40, 0.30, 0.34, 0.30, 0.22], blue);
  T([0.16, 0.28, 0.30, 0.22, 0.30, 0.10], blue);
  T([0.16, 0.16, 0.30, 0.10, 0.30,-0.02], blue);

  T([-0.32, 0.46, -0.18, 0.42, -0.32, 0.34], white);
  T([-0.32, 0.34, -0.18, 0.30, -0.32, 0.22], white);
  T([-0.32, 0.22, -0.18, 0.18, -0.32, 0.10], white);
  T([-0.32, 0.10, -0.18, 0.06, -0.32,-0.02], white);

  T([-0.02, 0.42, 0.12, 0.46, 0.12, 0.34], white);
  T([-0.02, 0.30, 0.12, 0.34, 0.12, 0.22], white);
  T([-0.02, 0.18, 0.12, 0.22, 0.12, 0.10], white);
  T([-0.02, 0.06, 0.12, 0.10, 0.12,-0.02], white);

  T([-0.62,-0.02, -0.48, 0.04, -0.48,-0.08], blue);
  T([-0.48, 0.04, -0.34,-0.02, -0.34,-0.14], blue);
  T([-0.34,-0.02, -0.20, 0.04, -0.20,-0.08], blue);
  T([-0.20, 0.04, -0.06,-0.02, -0.06,-0.14], blue);

  T([-0.06,-0.02,  0.08, 0.04,  0.08,-0.08], blue);
  T([ 0.08, 0.04,  0.22,-0.02,  0.22,-0.14], blue);

  T([0.22,-0.02, 0.38, 0.00, 0.38,-0.12], blue);
  T([0.38, 0.00, 0.54,-0.02, 0.54,-0.14], blue);
  T([0.54,-0.02, 0.72,-0.06, 0.72,-0.18], blue);
  T([0.72,-0.06, 0.92,-0.12, 0.72,-0.26], blue);

  T([-0.62,-0.02, -0.80,-0.08, -0.62,-0.18], blue);
  T([-0.80,-0.08, -0.96,-0.14, -0.80,-0.24], blue);

  T([-0.62,-0.14, -0.48,-0.08, -0.48,-0.26], blue);
  T([-0.62,-0.26, -0.48,-0.20, -0.48,-0.38], blue);
  T([-0.62,-0.38, -0.48,-0.32, -0.48,-0.50], blue);
  T([-0.62,-0.50, -0.48,-0.44, -0.48,-0.62], blue);
  T([-0.62,-0.62, -0.48,-0.56, -0.48,-0.74], blue);

  T([-0.48,-0.08, -0.34,-0.14, -0.34,-0.26], blue);
  T([-0.48,-0.20, -0.34,-0.26, -0.34,-0.38], blue);
  T([-0.48,-0.32, -0.34,-0.38, -0.34,-0.50], blue);
  T([-0.48,-0.44, -0.34,-0.50, -0.34,-0.62], blue);
  T([-0.48,-0.56, -0.34,-0.62, -0.34,-0.74], blue);

  T([-0.06,-0.14, 0.08,-0.08, 0.08,-0.26], blue);
  T([-0.06,-0.26, 0.08,-0.20, 0.08,-0.38], blue);
  T([-0.06,-0.38, 0.08,-0.32, 0.08,-0.50], blue);
  T([-0.06,-0.50, 0.08,-0.44, 0.08,-0.62], blue);
  T([-0.06,-0.62, 0.08,-0.56, 0.08,-0.74], blue);

  T([0.08,-0.08, 0.22,-0.14, 0.22,-0.26], blue);
  T([0.08,-0.20, 0.22,-0.26, 0.22,-0.38], blue);
  T([0.08,-0.32, 0.22,-0.38, 0.22,-0.50], blue);
  T([0.08,-0.44, 0.22,-0.50, 0.22,-0.62], blue);
  T([0.08,-0.56, 0.22,-0.62, 0.22,-0.74], blue);


  T([-0.30,-0.28, -0.12,-0.28, -0.21,-0.16], white);
  T([-0.30,-0.28, -0.12,-0.28, -0.21,-0.40], white);

  T([-0.14,-0.28, -0.02,-0.28, -0.08,-0.44], white);
  T([-0.14,-0.44, -0.02,-0.44, -0.08,-0.60], white);

  T([-0.30,-0.60, -0.08,-0.60, -0.19,-0.48], white);
  T([-0.30,-0.60, -0.08,-0.60, -0.19,-0.72], white);

  T([-0.28,-0.44, -0.16,-0.44, -0.22,-0.56], white);
  T([-0.28,-0.72, -0.12,-0.72, -0.20,-0.84], white);

  T([-0.30,-0.84, -0.14,-0.84, -0.22,-0.96], white);
  T([-0.10,-0.84,  0.06,-0.84, -0.02,-0.96], white);
}