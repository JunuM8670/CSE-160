let VSHADER = `
precision mediump float;
attribute vec4 a_Position;
attribute vec2 a_UV;
attribute vec3 a_Normal;

uniform mat4 u_ModelMatrix;
uniform mat4 u_ViewMatrix;
uniform mat4 u_ProjectionMatrix;

varying vec2 v_UV;
varying vec3 v_Normal;
varying vec3 v_WorldPos;

void main() {
  vec4 worldPos = u_ModelMatrix * a_Position;

  gl_Position = u_ProjectionMatrix * u_ViewMatrix * worldPos;

  v_UV = a_UV;
  v_WorldPos = worldPos.xyz;
  v_Normal = normalize(vec3(u_ModelMatrix * vec4(a_Normal, 0.0)));
}
`;

let FSHADER = `
precision mediump float;

uniform vec4 u_FragColor;
uniform sampler2D u_Sampler0;
uniform sampler2D u_Sampler1;
uniform int u_whichTexture;
uniform bool u_NormalOn;

uniform vec3 u_LightPos;
uniform vec3 u_CameraPos;
uniform vec3 u_LightColor;
uniform bool u_LightingOn;

uniform vec3 u_SpotLightPos;
uniform vec3 u_SpotLightDir;
uniform float u_SpotLightCutoff;
uniform bool u_SpotLightOn;

varying vec2 v_UV;
varying vec3 v_Normal;
varying vec3 v_WorldPos;

void main() {
  vec4 baseColor;

  if (u_whichTexture == -2) {
    baseColor = u_FragColor;
  } else if (u_whichTexture == 0) {
    baseColor = texture2D(u_Sampler0, v_UV);
  } else if (u_whichTexture == 1) {
    baseColor = texture2D(u_Sampler1, v_UV);
  } else {
    baseColor = vec4(v_UV, 1.0, 1.0);
  }

  if (u_NormalOn) {
  gl_FragColor = vec4((normalize(v_Normal) + 1.0) / 2.0, 1.0);
} else if (!u_LightingOn && !u_SpotLightOn) {
  gl_FragColor = baseColor;
} else {
  vec3 normal = normalize(v_Normal);
  vec3 eyeDirection = normalize(u_CameraPos - v_WorldPos);

  vec3 ambient = 0.3 * baseColor.rgb;

  vec3 diffuse = vec3(0.0);
  vec3 specular = vec3(0.0);

  if (u_LightingOn) {
    vec3 lightDirection = normalize(u_LightPos - v_WorldPos);
    float nDotL = max(dot(normal, lightDirection), 0.0);

    diffuse = u_LightColor * baseColor.rgb * nDotL;

    vec3 reflectDirection = reflect(-lightDirection, normal);
    float specularAmount = pow(max(dot(eyeDirection, reflectDirection), 0.0), 20.0);
    specular = 0.5 * u_LightColor * specularAmount;
  }

  vec3 spotDiffuse = vec3(0.0);

  if (u_SpotLightOn) {
    vec3 spotDirection = normalize(u_SpotLightPos - v_WorldPos);
    float spotDot = dot(normalize(-u_SpotLightDir), spotDirection);

    if (spotDot > u_SpotLightCutoff) {
      float spotNDotL = max(dot(normal, spotDirection), 0.0);
      spotDiffuse = vec3(1.0, 1.0, 1.0) * baseColor.rgb * spotNDotL;
    }
  }

  gl_FragColor = vec4(ambient + diffuse + specular + spotDiffuse, baseColor.a);
}
}
`;

let canvas;
let gl;
let camera;

let a_Position;
let a_UV;
let a_Normal;

let u_ModelMatrix;
let u_ViewMatrix;
let u_ProjectionMatrix;
let u_FragColor;
let u_whichTexture;
let u_Sampler0;
let u_Sampler1;
let u_NormalOn;

let g_cubeBuffer = null;
let g_uvBuffer = null;
let g_normalBuffer = null;
let g_cubeVertexCount = 36;

let g_sphereBuffer = null;
let g_sphereNormalBuffer = null;
let g_sphereVertexCount = 0;

let g_objVertexBuffer = null;
let g_objNormalBuffer = null;
let g_objVertexCount = 0;
let g_objLoaded = false;

let g_seconds = 0;
let g_startTime = performance.now() / 1000.0;

let g_frameCount = 0;
let g_lastFpsTime = performance.now();
let g_lightPos = [14, 4, -10];

let g_mouseDown = false;
let g_lastMouseX = 0;
let g_lastMouseY = 0;

let g_keys = {};
let g_map = [];
let g_wallMatrices = [];
let g_wonGame = false;
let g_normalOn = false;

let u_LightPos;
let u_CameraPos;
let u_LightColor;
let u_LightingOn;

let g_lightColor = [1.0, 1.0, 1.0];
let g_lightingOn = true;

let g_lightAnimationOn = true;

let u_SpotLightPos;
let u_SpotLightDir;
let u_SpotLightCutoff;
let u_SpotLightOn;

let g_spotLightPos = [14, 5, -13];
let g_spotLightDir = [0, -1, 1];
let g_spotLightCutoff = 0.9;
let g_spotLightOn = true;

for (let x = 0; x < 32; x++) {
  g_map[x] = [];

  for (let z = 0; z < 32; z++) {
    g_map[x][z] = 0;
  }
}

function addWallLine(x1, z1, x2, z2, height) {
  if (x1 === x2) {
    let start = Math.min(z1, z2);
    let end = Math.max(z1, z2);

    for (let z = start; z <= end; z++) {
      g_map[x1][z] = height;
    }
  } else if (z1 === z2) {
    let start = Math.min(x1, x2);
    let end = Math.max(x1, x2);

    for (let x = start; x <= end; x++) {
      g_map[x][z1] = height;
    }
  }
}

addWallLine(0, 0, 31, 0, 1);
addWallLine(0, 31, 31, 31, 1);
addWallLine(0, 0, 0, 31, 1);
addWallLine(31, 0, 31, 31, 1);

addWallLine(3, 3, 28, 3, 1);
addWallLine(3, 3, 3, 13, 1);
addWallLine(7, 6, 7, 25, 2);
addWallLine(7, 25, 18, 25, 2);
addWallLine(11, 3, 11, 18, 1);
addWallLine(11, 18, 23, 18, 1);
addWallLine(15, 7, 28, 7, 3);
addWallLine(15, 7, 15, 14, 3);
addWallLine(20, 10, 20, 28, 2);
addWallLine(20, 28, 28, 28, 2);
addWallLine(24, 12, 29, 12, 1);
addWallLine(24, 12, 24, 23, 1);
addWallLine(4, 16, 14, 16, 2);
addWallLine(14, 16, 14, 27, 2);
addWallLine(4, 21, 10, 21, 1);
addWallLine(26, 16, 26, 26, 4);


g_map[5][5] = 4;
g_map[6][5] = 4;
g_map[25][5] = 3;
g_map[26][5] = 3;
g_map[12][29] = 4;
g_map[13][29] = 4;

function main() {
  canvas = document.getElementById("webgl");
  gl = getWebGLContext(canvas);

  if (!gl) {
    console.log("Failed to get WebGL context");
    return;
  }

  if (!initShaders(gl, VSHADER, FSHADER)) {
    console.log("Failed to initialize shaders");
    return;
  }

  a_Position = gl.getAttribLocation(gl.program, "a_Position");
  a_UV = gl.getAttribLocation(gl.program, "a_UV");
  a_Normal = gl.getAttribLocation(gl.program, "a_Normal");
  u_LightPos = gl.getUniformLocation(gl.program, "u_LightPos");
  u_CameraPos = gl.getUniformLocation(gl.program, "u_CameraPos");
  u_LightColor = gl.getUniformLocation(gl.program, "u_LightColor");
  u_LightingOn = gl.getUniformLocation(gl.program, "u_LightingOn");

  u_ModelMatrix = gl.getUniformLocation(gl.program, "u_ModelMatrix");
  u_ViewMatrix = gl.getUniformLocation(gl.program, "u_ViewMatrix");
  u_ProjectionMatrix = gl.getUniformLocation(gl.program, "u_ProjectionMatrix");
  u_FragColor = gl.getUniformLocation(gl.program, "u_FragColor");
  u_whichTexture = gl.getUniformLocation(gl.program, "u_whichTexture");
  u_Sampler0 = gl.getUniformLocation(gl.program, "u_Sampler0");
  u_Sampler1 = gl.getUniformLocation(gl.program, "u_Sampler1");
  u_NormalOn = gl.getUniformLocation(gl.program, "u_NormalOn");

  u_SpotLightPos = gl.getUniformLocation(gl.program, "u_SpotLightPos");
  u_SpotLightDir = gl.getUniformLocation(gl.program, "u_SpotLightDir");
  u_SpotLightCutoff = gl.getUniformLocation(gl.program, "u_SpotLightCutoff");
  u_SpotLightOn = gl.getUniformLocation(gl.program, "u_SpotLightOn");

  if (
    a_Position < 0 ||
    a_UV < 0 ||
    a_Normal < 0 ||
    !u_ModelMatrix ||
    !u_ViewMatrix ||
    !u_ProjectionMatrix ||
    !u_FragColor ||
    !u_whichTexture ||
    !u_Sampler0 ||
    !u_Sampler1 ||
    !u_NormalOn ||
    !u_LightPos ||
    !u_CameraPos ||
    !u_LightColor ||
    !u_LightingOn ||
    !u_SpotLightPos ||
    !u_SpotLightDir ||
    !u_SpotLightCutoff ||
    !u_SpotLightOn
  ) {
    console.log("Failed to get shader variable locations");
    return;
  }

  gl.enable(gl.DEPTH_TEST);

  initCubeBuffer();
  initUVBuffer();
  initNormalBuffer();
  initSphereBuffer();

  loadOBJModel("obj/dragon.obj");

  camera = new Camera(canvas);
  buildWallMatrices();
  initTextures();

  addActionsForHtmlUI();

  document.onkeydown = keydown;
  document.onkeyup = keyup;

  gl.clearColor(0.1, 0.12, 0.16, 1.0);

  requestAnimationFrame(tick);
}

function initSphereBuffer() {
  let vertices = [];
  let normals = [];

  let latitudeBands = 12;
  let longitudeBands = 12;

  for (let lat = 0; lat < latitudeBands; lat++) {
    let theta1 = (lat * Math.PI) / latitudeBands;
    let theta2 = ((lat + 1) * Math.PI) / latitudeBands;

    for (let lon = 0; lon < longitudeBands; lon++) {
      let phi1 = (lon * 2 * Math.PI) / longitudeBands;
      let phi2 = ((lon + 1) * 2 * Math.PI) / longitudeBands;

      let p1 = spherePoint(theta1, phi1);
      let p2 = spherePoint(theta2, phi1);
      let p3 = spherePoint(theta2, phi2);
      let p4 = spherePoint(theta1, phi2);

      vertices.push(...p1, ...p2, ...p3);
      vertices.push(...p1, ...p3, ...p4);

      normals.push(...p1, ...p2, ...p3);
      normals.push(...p1, ...p3, ...p4);
    }
  }

  g_sphereVertexCount = vertices.length / 3;

  g_sphereBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_sphereBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  g_sphereNormalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_sphereNormalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
}

function spherePoint(theta, phi) {
  let x = Math.sin(theta) * Math.cos(phi);
  let y = Math.cos(theta);
  let z = Math.sin(theta) * Math.sin(phi);

  return [x, y, z];
}

function initTextures() {
  let wallImage = new Image();
  let grassImage = new Image();

  wallImage.onload = function () {
    sendTextureToGLSL(wallImage, 0);
  };

  grassImage.onload = function () {
    sendTextureToGLSL(grassImage, 1);
  };

  wallImage.src = "img/wall.png";
  grassImage.src = "img/grass.png";
}

function sendTextureToGLSL(image, textureNum) {
  let texture = gl.createTexture();

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);

  if (textureNum === 0) {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(u_Sampler0, 0);
  } else if (textureNum === 1) {
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(u_Sampler1, 1);
  }

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    image
  );

  if (camera) {
    renderScene();
  }
}

function addActionsForHtmlUI() {
  canvas.onmousedown = function (ev) {
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

    camera.pan(-dx * 0.2);

    g_lastMouseX = ev.clientX;
    g_lastMouseY = ev.clientY;
  };
}

function setLightX(value) {
  g_lightPos[0] = Number(value);
}

function setLightY(value) {
  g_lightPos[1] = Number(value);
}

function setLightZ(value) {
  g_lightPos[2] = Number(value);
}

function setLightRed(value) {
  g_lightColor[0] = Number(value) / 100;
}

function setLightGreen(value) {
  g_lightColor[1] = Number(value) / 100;
}

function setLightBlue(value) {
  g_lightColor[2] = Number(value) / 100;
}

function keydown(ev) {
  ev.preventDefault();
  g_keys[ev.key] = true;
}

function keyup(ev) {
  ev.preventDefault();
  g_keys[ev.key] = false;
}

function updateCamera() {
  if (g_keys["w"] || g_keys["W"]) {
    camera.moveForward();
  }

  if (g_keys["s"] || g_keys["S"]) {
    camera.moveBackwards();
  }

  if (g_keys["a"] || g_keys["A"]) {
    camera.moveLeft();
  }

  if (g_keys["d"] || g_keys["D"]) {
    camera.moveRight();
  }

  if (g_keys["q"] || g_keys["Q"]) {
    camera.panLeft();
  }

  if (g_keys["e"] || g_keys["E"]) {
    camera.panRight();
  }

  if (g_keys["f"] || g_keys["F"]) {
    addBlock();
    g_keys["f"] = false;
    g_keys["F"] = false;
  }

  if (g_keys["r"] || g_keys["R"]) {
    deleteBlock();
    g_keys["r"] = false;
    g_keys["R"] = false;
  }
}

function getBlockInFront(){
  let f = new Vector3();

  f.set(camera.at);
  f.sub(camera.eye);
  f.normalize();

  let distance = 2.0;

  let worldX = camera.eye.elements[0] + f.elements[0] * distance;
  let worldZ = camera.eye.elements[2] + f.elements[2] * distance;

  let mapX = Math.floor(worldX + 16);
  let mapZ = Math.floor(worldZ + 16);

  if(mapX < 0 || mapX >= 32 || mapZ < 0 || mapZ >= 32){
    return null;
  }

  return { x: mapX, z: mapZ };
}

function addBlock(){
  let block = getBlockInFront();

  if(block == null){
    return;
  }

  if(g_map[block.x][block.z] < 4){
    g_map[block.x][block.z]++;
    buildWallMatrices();
  }
}

function deleteBlock(){
  let block = getBlockInFront();

  if(block == null){
    return;
  }

  if(g_map[block.x][block.z] > 0){
    g_map[block.x][block.z]--;
    buildWallMatrices();
  }
}

function tick() {
  g_seconds = performance.now() / 1000.0 - g_startTime;

  if (g_lightAnimationOn) {
    g_lightPos[0] = 14 + 3 * Math.cos(g_seconds);
    g_lightPos[2] = -10 + 3 * Math.sin(g_seconds);
  }

  updateCamera();
  checkWin();
  renderScene();
  updatePerformanceDisplay();

  requestAnimationFrame(tick);
}

function updatePerformanceDisplay() {
  g_frameCount++;

  let now = performance.now();
  let elapsed = now - g_lastFpsTime;

  if (elapsed > 500) {
    let fps = Math.round((g_frameCount * 1000) / elapsed);

    let performanceText = document.getElementById("performance");

    if (performanceText) {
      performanceText.innerText = "FPS: " + fps;
    }

    g_frameCount = 0;
    g_lastFpsTime = now;
  }
}

function renderScene() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.uniformMatrix4fv(u_ViewMatrix, false, camera.viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, camera.projectionMatrix.elements);

  gl.uniform3f(u_LightPos, g_lightPos[0], g_lightPos[1], g_lightPos[2]);

  gl.uniform3f(
    u_CameraPos,
    camera.eye.elements[0],
    camera.eye.elements[1],
    camera.eye.elements[2]
  );

  gl.uniform3f(u_LightColor, g_lightColor[0], g_lightColor[1], g_lightColor[2]);
  gl.uniform1i(u_LightingOn, g_lightingOn);

  gl.uniform3f(
  u_SpotLightPos,
  g_spotLightPos[0],
  g_spotLightPos[1],
  g_spotLightPos[2]
);

  gl.uniform3f(
    u_SpotLightDir,
    g_spotLightDir[0],
    g_spotLightDir[1],
    g_spotLightDir[2]
  );

  gl.uniform1f(u_SpotLightCutoff, g_spotLightCutoff);
  gl.uniform1i(u_SpotLightOn, g_spotLightOn);

  drawSky();
  drawSmallWorld();

  let sphere = new Matrix4();
  sphere.translate(14, 1.5, -10);
  sphere.scale(1.5, 1.5, 1.5);
  drawSphere(sphere, [1.0, 0.3, 0.3, 1.0]);

  let obj = new Matrix4();
  obj.translate(11.8, 0.1, -10.5);
  obj.rotate(30, 0, 1, 0);
  obj.scale(0.28, 0.28, 0.28);
  drawOBJ(obj, [0.8, 0.8, 1.0, 1.0]);

  drawLightMarker();
  drawSpotLightMarker();
}

function drawSky(){
  let sky = new Matrix4();

  sky.scale(50, 50, 50);

  drawCube(sky, [0.3, 0.6, 1.0, 1.0]);
}

function drawGround(){
  let ground = new Matrix4();

  ground.translate(0, -0.6, 0);
  ground.scale(40, 0.05, 40);

  drawCube(ground, [0.2, 0.8, 0.2, 1.0], 1);
}

function drawMap() {
  for (let i = 0; i < g_wallMatrices.length; i++) {
    drawCube(g_wallMatrices[i], [0.6, 0.4, 0.25, 1.0], 0);
  }
}

function drawLightMarker() {
  let light = new Matrix4();

  light.translate(g_lightPos[0], g_lightPos[1], g_lightPos[2]);
  light.scale(0.2, 0.2, 0.2);

  drawCube(light, [1.0, 1.0, 0.0, 1.0]);
}

function drawSmallWorld() {
  let floor = new Matrix4();
  floor.translate(14, -0.6, -10);
  floor.scale(8, 0.1, 8);
  drawCube(floor, [0.2, 0.8, 0.2, 1.0], 1);

  let backWall = new Matrix4();
  backWall.translate(14, 1.5, -14);
  backWall.scale(8, 4, 0.2);
  drawCube(backWall, [0.6, 0.4, 0.25, 1.0], 0);

  let leftWall = new Matrix4();
  leftWall.translate(10, 1.5, -10);
  leftWall.scale(0.2, 4, 8);
  drawCube(leftWall, [0.6, 0.4, 0.25, 1.0], 0);

  let rightWall = new Matrix4();
  rightWall.translate(18, 1.5, -10);
  rightWall.scale(0.2, 4, 8);
  drawCube(rightWall, [0.6, 0.4, 0.25, 1.0], 0);
}

function buildWallMatrices() {
  g_wallMatrices = [];

  let used = [];

  for (let x = 0; x < 32; x++) {
    used[x] = [];

    for (let z = 0; z < 32; z++) {
      used[x][z] = false;
    }
  }

  for (let x = 0; x < 32; x++) {
    for (let z = 0; z < 32; z++) {
      let height = g_map[x][z];

      if (height === 0 || used[x][z]) {
        continue;
      }

      let runLength = 1;

      while (
        x + runLength < 32 &&
        g_map[x + runLength][z] === height &&
        !used[x + runLength][z]
      ) {
        runLength++;
      }

      if (runLength > 1) {
        for (let i = 0; i < runLength; i++) {
          used[x + i][z] = true;
        }

        let block = new Matrix4();

        block.translate(x - 16 + (runLength - 1) / 2, (height - 1) / 2, z - 16);
        block.scale(runLength, height, 1);

        g_wallMatrices.push(block);
      } else {
        let verticalLength = 1;

        while (
          z + verticalLength < 32 &&
          g_map[x][z + verticalLength] === height &&
          !used[x][z + verticalLength]
        ) {
          verticalLength++;
        }

        for (let i = 0; i < verticalLength; i++) {
          used[x][z + i] = true;
        }

        let block = new Matrix4();

        block.translate(x - 16, (height - 1) / 2, z - 16 + (verticalLength - 1) / 2);
        block.scale(1, height, verticalLength);

        g_wallMatrices.push(block);
      }
    }
  }
}

function drawGoal() {
  let goalX = -5;
  let goalZ = 12;

  let bounce = 0.3 * Math.sin(g_seconds * 3);
  let spin = g_seconds * 90;

  let tower = new Matrix4();
  tower.translate(goalX, 0, goalZ);
  tower.scale(1, 4, 1);
  drawCube(tower, [1.0, 0.75, 0.05, 1.0]);

  let crystal = new Matrix4();
  crystal.translate(goalX, 4.8 + bounce, goalZ);
  crystal.rotate(spin, 0, 1, 0);
  crystal.rotate(45, 1, 0, 0);
  crystal.scale(0.8, 0.8, 0.8);
  drawCube(crystal, [0.2, 1.0, 1.0, 1.0]);

  let beam = new Matrix4();
  beam.translate(goalX, 7.5, goalZ);
  beam.scale(0.25, 6, 0.25);
  drawCube(beam, [0.4, 0.9, 1.0, 1.0]);

  let base = new Matrix4();
  base.translate(goalX, -0.1, goalZ);
  base.scale(2.5, 0.2, 2.5);
  drawCube(base, [1.0, 0.1, 0.1, 1.0]);

  for (let i = 0; i < 4; i++) {
    let angle = g_seconds * 2 + i * Math.PI / 2;
    let x = goalX + Math.cos(angle) * 1.5;
    let z = goalZ + Math.sin(angle) * 1.5;

    let orb = new Matrix4();
    orb.translate(x, 3.8 + bounce, z);
    orb.scale(0.25, 0.25, 0.25);

    drawCube(orb, [1.0, 1.0, 0.2, 1.0]);
  }
}

function checkWin() {
  let goalX = -5;
  let goalZ = 12;

  let dx = camera.eye.elements[0] - goalX;
  let dz = camera.eye.elements[2] - goalZ;

  let distance = Math.sqrt(dx * dx + dz * dz);

  if (distance < 2 && !g_wonGame) {
    g_wonGame = true;

    let story = document.getElementById("story");

    if (story) {
      story.innerText = "You found the glowing tower and escaped the maze!";
    }
  }
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

function initUVBuffer() {
  let uv = new Float32Array([
    0, 0,  1, 0,  1, 1,
    0, 0,  1, 1,  0, 1,

    0, 0,  1, 1,  1, 0,
    0, 0,  0, 1,  1, 1,

    0, 0,  0, 1,  1, 1,
    0, 0,  1, 1,  1, 0,

    0, 0,  1, 0,  1, 1,
    0, 0,  1, 1,  0, 1,

    0, 0,  0, 1,  1, 1,
    0, 0,  1, 1,  1, 0,

    0, 0,  1, 0,  1, 1,
    0, 0,  1, 1,  0, 1
  ]);

  g_uvBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_uvBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, uv, gl.STATIC_DRAW);
}

function initNormalBuffer() {
  let normals = new Float32Array([
     0,  0,  1,
     0,  0,  1,
     0,  0,  1,
     0,  0,  1,
     0,  0,  1,
     0,  0,  1,

     0,  0, -1,
     0,  0, -1,
     0,  0, -1,
     0,  0, -1,
     0,  0, -1,
     0,  0, -1,

     0,  1,  0,
     0,  1,  0,
     0,  1,  0,
     0,  1,  0,
     0,  1,  0,
     0,  1,  0,

     0, -1,  0,
     0, -1,  0,
     0, -1,  0,
     0, -1,  0,
     0, -1,  0,
     0, -1,  0,

     1,  0,  0,
     1,  0,  0,
     1,  0,  0,
     1,  0,  0,
     1,  0,  0,
     1,  0,  0,

    -1,  0,  0,
    -1,  0,  0,
    -1,  0,  0,
    -1,  0,  0,
    -1,  0,  0,
    -1,  0,  0
  ]);

  g_normalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);
}


function drawCube(matrix, color, textureNum) {
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeBuffer);

  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.bindBuffer(gl.ARRAY_BUFFER, g_uvBuffer);

  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_UV);

  gl.bindBuffer(gl.ARRAY_BUFFER, g_normalBuffer);

  gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Normal);

  gl.uniformMatrix4fv(u_ModelMatrix, false, matrix.elements);
  gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);

  if (textureNum === undefined) {
    textureNum = -2;
  }

  gl.uniform1i(u_whichTexture, textureNum);

  gl.uniform1i(u_NormalOn, g_normalOn);

  gl.drawArrays(gl.TRIANGLES, 0, g_cubeVertexCount);

}

function drawSphere(matrix, color) {
  gl.bindBuffer(gl.ARRAY_BUFFER, g_sphereBuffer);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.disableVertexAttribArray(a_UV);

  gl.bindBuffer(gl.ARRAY_BUFFER, g_sphereNormalBuffer);
  gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Normal);

  gl.uniformMatrix4fv(u_ModelMatrix, false, matrix.elements);
  gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);
  gl.uniform1i(u_whichTexture, -2);
  gl.uniform1i(u_NormalOn, g_normalOn);

  gl.drawArrays(gl.TRIANGLES, 0, g_sphereVertexCount);
}

function drawOBJ(matrix, color) {
  if (!g_objLoaded) {
    return;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, g_objVertexBuffer);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.disableVertexAttribArray(a_UV);

  gl.bindBuffer(gl.ARRAY_BUFFER, g_objNormalBuffer);
  gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Normal);

  gl.uniformMatrix4fv(u_ModelMatrix, false, matrix.elements);
  gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);
  gl.uniform1i(u_whichTexture, -2);
  gl.uniform1i(u_NormalOn, g_normalOn);

  gl.drawArrays(gl.TRIANGLES, 0, g_objVertexCount);
}

function drawSpotLightMarker() {
  let spot = new Matrix4();

  spot.translate(g_spotLightPos[0], g_spotLightPos[1], g_spotLightPos[2]);
  spot.scale(0.25, 0.25, 0.25);

  drawCube(spot, [1.0, 0.5, 0.0, 1.0]);
}

async function loadOBJModel(filePath) {
  let response = await fetch(filePath);
  let text = await response.text();

  let model = parseOBJ(text);

  g_objVertexCount = model.vertices.length / 3;

  g_objVertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_objVertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.vertices), gl.STATIC_DRAW);

  g_objNormalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_objNormalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.normals), gl.STATIC_DRAW);

  g_objLoaded = true;
}

function parseOBJ(text) {
  let positions = [];
  let normals = [];

  let finalVertices = [];
  let finalNormals = [];

  let lines = text.split("\n");

  for (let line of lines) {
    line = line.trim();

    if (line.length === 0 || line.startsWith("#")) {
      continue;
    }

    let parts = line.split(/\s+/);

    if (parts[0] === "v") {
      positions.push([
        Number(parts[1]),
        Number(parts[2]),
        Number(parts[3])
      ]);
    } else if (parts[0] === "vn") {
      normals.push([
        Number(parts[1]),
        Number(parts[2]),
        Number(parts[3])
      ]);
    } else if (parts[0] === "f") {
      let face = parts.slice(1);

      for (let i = 1; i < face.length - 1; i++) {
        addOBJVertex(face[0], positions, normals, finalVertices, finalNormals);
        addOBJVertex(face[i], positions, normals, finalVertices, finalNormals);
        addOBJVertex(face[i + 1], positions, normals, finalVertices, finalNormals);
      }
    }
  }

  return {
    vertices: finalVertices,
    normals: finalNormals
  };
}

function addOBJVertex(vertexString, positions, normals, finalVertices, finalNormals) {
  let indices = vertexString.split("/");

  let positionIndex = Number(indices[0]) - 1;
  let normalIndex = -1;

  if (indices.length >= 3 && indices[2] !== "") {
    normalIndex = Number(indices[2]) - 1;
  }

  let position = positions[positionIndex];

  finalVertices.push(position[0], position[1], position[2]);

  if (normalIndex >= 0 && normals[normalIndex]) {
    let normal = normals[normalIndex];
    finalNormals.push(normal[0], normal[1], normal[2]);
  } else {
    finalNormals.push(0, 1, 0);
  }
}