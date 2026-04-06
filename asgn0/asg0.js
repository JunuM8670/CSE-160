// DrawTriangle.js (c) 2012 matsuda
function main() {  
  // Retrieve <canvas> element
  var canvas = document.getElementById('example');  
  if (!canvas) { 
    console.log('Failed to retrieve the <canvas> element');
    return false; 
  } 


  // Get the rendering context for 2DCG
  var ctx = canvas.getContext('2d');

  let v1 = new Vector3([2.25, 2.25, 0]);

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, 400, 400); 

  drawVector(v1, "red");
}

function drawVector(v, color) {
  var canvas = document.getElementById('example');
  var ctx = canvas.getContext('2d');

  ctx.beginPath();

  // Start from center
  let centerX = 200;
  let centerY = 200;

  ctx.moveTo(centerX, centerY);

  // Scale by 20
  let x = centerX + v.elements[0] * 20;
  let y = centerY - v.elements[1] * 20; // minus because canvas y is flipped

  ctx.lineTo(x, y);

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function handleDrawEvent() {
  var canvas = document.getElementById('example');
  var ctx = canvas.getContext('2d');

  // Clear canvas
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, 400, 400);

  // -------- v1 --------
  let x1 = parseFloat(document.getElementById("xInput").value);
  let y1 = parseFloat(document.getElementById("yInput").value);

  let v1 = new Vector3([x1, y1, 0]);

  // -------- v2 --------
  let x2 = parseFloat(document.getElementById("xInput2").value);
  let y2 = parseFloat(document.getElementById("yInput2").value);

  let v2 = new Vector3([x2, y2, 0]);

  // Draw both
  drawVector(v1, "red");
  drawVector(v2, "blue");
}

function handleDrawOperationEvent() {
  var canvas = document.getElementById('example');
  var ctx = canvas.getContext('2d');

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, 400, 400);

  let x1 = parseFloat(document.getElementById("xInput").value);
  let y1 = parseFloat(document.getElementById("yInput").value);
  let v1 = new Vector3([x1, y1, 0]);

  let x2 = parseFloat(document.getElementById("xInput2").value);
  let y2 = parseFloat(document.getElementById("yInput2").value);
  let v2 = new Vector3([x2, y2, 0]);

  drawVector(v1, "red");
  drawVector(v2, "blue");

  let op = document.getElementById("operation").value;
  let scalar = parseFloat(document.getElementById("scalarInput").value);

  if (op === "add") {
    let v3 = new Vector3([x1, y1, 0]);
    v3.add(v2);
    drawVector(v3, "green");
  } else if (op === "sub") {
    let v3 = new Vector3([x1, y1, 0]);
    v3.sub(v2);
    drawVector(v3, "green");
  } else if (op === "mul") {
    let v3 = new Vector3([x1, y1, 0]);
    let v4 = new Vector3([x2, y2, 0]);
    v3.mul(scalar);
    v4.mul(scalar);
    drawVector(v3, "green");
    drawVector(v4, "green");
  } else if (op === "div") {
    let v3 = new Vector3([x1, y1, 0]);
    let v4 = new Vector3([x2, y2, 0]);
    v3.div(scalar);
    v4.div(scalar);
    drawVector(v3, "green");
    drawVector(v4, "green");
  } else if (op === "magnitude") {
    console.log("Magnitude v1:", v1.magnitude());
    console.log("Magnitude v2:", v2.magnitude());
  } else if (op === "normalize") {
    let v3 = new Vector3([x1, y1, 0]);
    let v4 = new Vector3([x2, y2, 0]);

    v3.normalize();
    v4.normalize();

    drawVector(v3, "green");
    drawVector(v4, "green");
  }
  else if (op === "angle") {
  console.log("Angle:", angleBetween(v1, v2));
  }
  else if (op === "area") {
  console.log("Area of triangle:", areaTriangle(v1, v2));
}

}

function angleBetween(v1, v2) {
  let dot = Vector3.dot(v1, v2);
  let mag1 = v1.magnitude();
  let mag2 = v2.magnitude();

  let cosAlpha = dot / (mag1 * mag2);

  let angleRad = Math.acos(cosAlpha);
  let angleDeg = angleRad * 180 / Math.PI;

  return angleDeg;
}

function areaTriangle(v1, v2) {
  let crossProduct = Vector3.cross(v1, v2);
  let areaParallelogram = crossProduct.magnitude();
  let areaTriangle = areaParallelogram / 2;
  return areaTriangle;
}
