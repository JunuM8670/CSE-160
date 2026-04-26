let VSHADER = `
precision mediump float;
attribute vec4 a_Position;
uniform mat4 u_ModelMatrix;
uniform mat4 u_GlobalRotateMatrix;

void main() {
  gl_Position = u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
}
`;

let FSHADER = `
precision mediump float;
uniform vec4 u_FragColor;

void main() {
  gl_FragColor = u_FragColor;
}
`;

let canvas;
let gl;

let a_Position;
let u_ModelMatrix;
let u_GlobalRotateMatrix;
let u_FragColor;

let g_globalX = 0;
let g_globalY = 0;

let g_thighAngle = 0;
let g_calfAngle = 0;
let g_footAngle = 0;

let g_animation = false;
let g_seconds = 0;
let g_startTime = performance.now() / 1000.0;

let g_pokeAnimation = false;
let g_pokeStart = 0;

let g_mouseDown = false;
let g_lastMouseX = 0;
let g_lastMouseY = 0;

let g_cubeBuffer = null;
let g_cubeVertexCount = 36;

let g_coneBuffer = null;
let g_coneVertexCount = 0;

let g_frameCount = 0;
let g_lastFpsTime = performance.now();

function main() {
  canvas = document.getElementById("webgl");
  gl = getWebGLContext(canvas, { preserveDrawingBuffer: true });

  if (!gl) {
    console.log("Failed to get WebGL context");
    return;
  }

  if (!initShaders(gl, VSHADER, FSHADER)) {
    console.log("Failed to initialize shaders");
    return;
  }

  a_Position = gl.getAttribLocation(gl.program, "a_Position");
  u_ModelMatrix = gl.getUniformLocation(gl.program, "u_ModelMatrix");
  u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, "u_GlobalRotateMatrix");
  u_FragColor = gl.getUniformLocation(gl.program, "u_FragColor");

  if (a_Position < 0 || !u_ModelMatrix || !u_GlobalRotateMatrix || !u_FragColor) {
    console.log("Failed to get shader variable locations");
    return;
  }

  gl.enable(gl.DEPTH_TEST);

  initCubeBuffer();
  initConeBuffer();

  addActionsForHtmlUI();

  gl.clearColor(0.1, 0.12, 0.16, 1.0);

  requestAnimationFrame(tick);
}

function addActionsForHtmlUI() {
  document.getElementById("globalY").oninput = function () {
    g_globalY = Number(this.value);
    renderScene();
  };

  document.getElementById("globalX").oninput = function () {
    g_globalX = Number(this.value);
    renderScene();
  };

  document.getElementById("thighSlide").oninput = function () {
    g_thighAngle = Number(this.value);
    renderScene();
  };

  document.getElementById("calfSlide").oninput = function () {
    g_calfAngle = Number(this.value);
    renderScene();
  };

  document.getElementById("footSlide").oninput = function () {
    g_footAngle = Number(this.value);
    renderScene();
  };

  document.getElementById("animationOn").onclick = function () {
    g_animation = true;
  };

  document.getElementById("animationOff").onclick = function () {
    g_animation = false;
  };

  canvas.onmousedown = function (ev) {
    if (ev.shiftKey) {
      g_pokeAnimation = true;
      g_pokeStart = g_seconds;
      return;
    }

    g_mouseDown = true;
    g_lastMouseX = ev.clientX;
    g_lastMouseY = ev.clientY;
  };

  canvas.onmouseup = function () {
    g_mouseDown = false;
  };

  canvas.onmouseleave = function () {
    g_mouseDown = false;
  };

  canvas.onmousemove = function (ev) {
    if (!g_mouseDown) return;

    let dx = ev.clientX - g_lastMouseX;
    let dy = ev.clientY - g_lastMouseY;

    g_globalY += dx * 0.5;
    g_globalX += dy * 0.5;

    g_lastMouseX = ev.clientX;
    g_lastMouseY = ev.clientY;

    renderScene();
  };
}

function tick() {
  g_seconds = performance.now() / 1000.0 - g_startTime;

  updateAnimationAngles();
  renderScene();
  updatePerformanceDisplay();

  requestAnimationFrame(tick);
}

function updateAnimationAngles() {
  if (g_animation) {
    g_thighAngle = 25 * Math.sin(g_seconds * 3);
    g_calfAngle = 25 * Math.sin(g_seconds * 3 + 1.0);
    g_footAngle = 15 * Math.sin(g_seconds * 4);
  }

  if (g_pokeAnimation) {
    let t = g_seconds - g_pokeStart;

    if (t > 1.5) {
      g_pokeAnimation = false;
    }
  }
}

function updatePerformanceDisplay() {
  g_frameCount++;

  let now = performance.now();
  let elapsed = now - g_lastFpsTime;

  if (elapsed > 500) {
    let fps = Math.round((g_frameCount * 1000) / elapsed);
    document.getElementById("performance").innerText = "FPS: " + fps;

    g_frameCount = 0;
    g_lastFpsTime = now;
  }
}

function renderScene() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  let globalRotMat = new Matrix4();
  globalRotMat.rotate(g_globalX, 1, 0, 0);
  globalRotMat.rotate(g_globalY, 0, 1, 0);

  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);

  drawAnimal();
}

function drawAnimal() {
  const pigPink = [1.0, 0.55, 0.68, 1.0];
  const lightPink = [1.0, 0.7, 0.78, 1.0];
  const darkPink = [0.9, 0.35, 0.5, 1.0];
  const black = [0.02, 0.02, 0.02, 1.0];

  let pokeBounce = 0;
  let headWiggle = 0;

  if (g_pokeAnimation) {
    let t = g_seconds - g_pokeStart;
    pokeBounce = 0.12 * Math.abs(Math.sin(t * 12));
    headWiggle = 25 * Math.sin(t * 18);
  }

  let body = new Matrix4();
  body.translate(0, pokeBounce, 0);
  body.scale(1.0, 0.45, 0.45);
  drawCube(body, pigPink);

  let headBase = new Matrix4();
  headBase.translate(0.68, 0.12 + pokeBounce, 0);
  headBase.rotate(headWiggle, 0, 1, 0);

  let head = new Matrix4(headBase);
  head.scale(0.42, 0.38, 0.38);
  drawCube(head, pigPink);

  let snout = new Matrix4(headBase);
  snout.translate(0.27, -0.02, 0);
  snout.scale(0.22, 0.17, 0.24);
  drawCube(snout, darkPink);

  let nostril1 = new Matrix4(headBase);
  nostril1.translate(0.39, 0.01, 0.07);
  nostril1.scale(0.035, 0.04, 0.035);
  drawCube(nostril1, black);

  let nostril2 = new Matrix4(headBase);
  nostril2.translate(0.39, 0.01, -0.07);
  nostril2.scale(0.035, 0.04, 0.035);
  drawCube(nostril2, black);

  let eye1 = new Matrix4(headBase);
  eye1.translate(0.12, 0.1, 0.18);
  eye1.scale(0.05, 0.05, 0.05);
  drawCube(eye1, black);

  let eye2 = new Matrix4(headBase);
  eye2.translate(0.12, 0.1, -0.18);
  eye2.scale(0.05, 0.05, 0.05);
  drawCube(eye2, black);

  let ear1 = new Matrix4(headBase);
  ear1.translate(-0.08, 0.29, 0.14);
  ear1.rotate(25, 1, 0, 0);
  ear1.rotate(20, 0, 0, 1);
  ear1.scale(0.12, 0.22, 0.08);
  drawCube(ear1, darkPink);

  let ear2 = new Matrix4(headBase);
  ear2.translate(-0.08, 0.29, -0.14);
  ear2.rotate(-25, 1, 0, 0);
  ear2.rotate(20, 0, 0, 1);
  ear2.scale(0.12, 0.22, 0.08);
  drawCube(ear2, darkPink);

  let tailWag = 15 * Math.sin(g_seconds * 5);

  let tailBase = new Matrix4();
  tailBase.translate(-0.58, 0.1 + pokeBounce, 0);
  tailBase.rotate(tailWag, 0, 1, 0);

  let tail1 = new Matrix4(tailBase);
  tail1.translate(-0.08, 0.03, 0);
  tail1.rotate(30, 0, 0, 1);
  tail1.scale(0.16, 0.05, 0.05);
  drawCube(tail1, darkPink);

  let tail2 = new Matrix4(tailBase);
  tail2.translate(-0.16, 0.1, 0);
  tail2.rotate(95, 0, 0, 1);
  tail2.scale(0.15, 0.05, 0.05);
  drawCube(tail2, darkPink);

  let tail3 = new Matrix4(tailBase);
  tail3.translate(-0.08, 0.17, 0);
  tail3.rotate(160, 0, 0, 1);
  tail3.scale(0.14, 0.05, 0.05);
  drawCube(tail3, darkPink);

  drawLeg(0.32, 0.18, lightPink, darkPink, 1);
  drawLeg(0.32, -0.18, lightPink, darkPink, -1);
  drawLeg(-0.32, 0.18, lightPink, darkPink, -1);
  drawLeg(-0.32, -0.18, lightPink, darkPink, 1);
}

function drawLeg(x, z, upperColor, lowerColor, direction) {
  let hip = new Matrix4();
  hip.translate(x, -0.25, z);

  let upperAngle = direction * g_thighAngle;
  let lowerAngle = direction * g_calfAngle;
  let footAngle = direction * g_footAngle;

  hip.rotate(upperAngle, 0, 0, 1);

  let upperLeg = new Matrix4(hip);
  upperLeg.translate(0, -0.11, 0);
  upperLeg.scale(0.14, 0.22, 0.14);
  drawCube(upperLeg, upperColor);

  let knee = new Matrix4(hip);
  knee.translate(0, -0.22, 0);
  knee.rotate(lowerAngle, 0, 0, 1);

  let lowerLeg = new Matrix4(knee);
  lowerLeg.translate(0, -0.1, 0);
  lowerLeg.scale(0.12, 0.2, 0.12);
  drawCube(lowerLeg, lowerColor);

  let ankle = new Matrix4(knee);
  ankle.translate(0, -0.2, 0);
  ankle.rotate(footAngle, 0, 0, 1);

  let foot = new Matrix4(ankle);
  foot.translate(0.07, -0.035, 0);
  foot.scale(0.2, 0.08, 0.14);
  drawCube(foot, lowerColor);
}

function initCubeBuffer() {
  let vertices = new Float32Array([
    -0.5, -0.5,  0.5,
     0.5, -0.5,  0.5,
     0.5,  0.5,  0.5,
    -0.5, -0.5,  0.5,
     0.5,  0.5,  0.5,
    -0.5,  0.5,  0.5,

    -0.5, -0.5, -0.5,
    -0.5,  0.5, -0.5,
     0.5,  0.5, -0.5,
    -0.5, -0.5, -0.5,
     0.5,  0.5, -0.5,
     0.5, -0.5, -0.5,

    -0.5,  0.5, -0.5,
    -0.5,  0.5,  0.5,
     0.5,  0.5,  0.5,
    -0.5,  0.5, -0.5,
     0.5,  0.5,  0.5,
     0.5,  0.5, -0.5,

    -0.5, -0.5, -0.5,
     0.5, -0.5, -0.5,
     0.5, -0.5,  0.5,
    -0.5, -0.5, -0.5,
     0.5, -0.5,  0.5,
    -0.5, -0.5,  0.5,

     0.5, -0.5, -0.5,
     0.5,  0.5, -0.5,
     0.5,  0.5,  0.5,
     0.5, -0.5, -0.5,
     0.5,  0.5,  0.5,
     0.5, -0.5,  0.5,

    -0.5, -0.5, -0.5,
    -0.5, -0.5,  0.5,
    -0.5,  0.5,  0.5,
    -0.5, -0.5, -0.5,
    -0.5,  0.5,  0.5,
    -0.5,  0.5, -0.5
  ]);

  g_cubeBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
}

function initConeBuffer() {
  let vertices = [];
  let segments = 24;

  let apex = [0.5, 0, 0];
  let center = [-0.5, 0, 0];

  for (let i = 0; i < segments; i++) {
    let angle1 = (i / segments) * 2 * Math.PI;
    let angle2 = ((i + 1) / segments) * 2 * Math.PI;

    let p1 = [-0.5, Math.cos(angle1) * 0.5, Math.sin(angle1) * 0.5];
    let p2 = [-0.5, Math.cos(angle2) * 0.5, Math.sin(angle2) * 0.5];

    vertices.push(...apex, ...p1, ...p2);

    vertices.push(...center, ...p2, ...p1);
  }

  g_coneVertexCount = vertices.length / 3;

  g_coneBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_coneBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
}

function drawCube(matrix, color) {
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeBuffer);

  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.uniformMatrix4fv(u_ModelMatrix, false, matrix.elements);
  gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);

  gl.drawArrays(gl.TRIANGLES, 0, g_cubeVertexCount);
}

function drawCone(matrix, color) {
  gl.bindBuffer(gl.ARRAY_BUFFER, g_coneBuffer);

  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.uniformMatrix4fv(u_ModelMatrix, false, matrix.elements);
  gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);

  gl.drawArrays(gl.TRIANGLES, 0, g_coneVertexCount);
}