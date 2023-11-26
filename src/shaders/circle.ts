import { common } from "./common";

export const circleShader = /*wgsl*/`
struct VertexOut {
  @builtin(position) position : vec4f,
  @location(1) color: vec4f,
}

${common}

struct Circle {
  radius: f32,
  numSegments: f32,
  thickness: f32,
}

@group(2) @binding(0) var<uniform> circle: Circle;

@vertex
fn vertex_circle(@builtin(vertex_index) vertexIndex : u32) -> VertexOut
{
  var output : VertexOut;

  var segment = vertexIndex / 6;
  var segmentVertIndex = vertexIndex % 6;

  var pi = 3.14159;
  var radiansPerSegment = pi * 2 / circle.numSegments;

  var radians = f32(segment) * radiansPerSegment;

  var x: f32;
  var y: f32;

  var radius = circle.radius;
  var thickness = circle.thickness;

  if (segmentVertIndex == 0) {
    x = (radius - thickness) * cos(radians);
    y = (radius - thickness) * sin(radians);
  }
  else if (segmentVertIndex == 1 || segmentVertIndex == 4) {
    x = (radius + thickness) * cos(radians);
    y = (radius + thickness) * sin(radians);
  }
  else if (segmentVertIndex == 2 || segmentVertIndex == 3) {
    x = (radius - thickness) * cos(radians + radiansPerSegment);
    y = (radius - thickness) * sin(radians + radiansPerSegment);
  }
  else if (segmentVertIndex == 5) {
    x = (radius + thickness) * cos(radians + radiansPerSegment);
    y = (radius + thickness) * sin(radians + radiansPerSegment);
  }

  output.position = projectionMatrix * viewMatrix * modelMatrix * vec4f(x, y, 0, 1);
  // output.position = projectionMatrix * viewMatrix * vec4f(x, y, 0, 1);
  /// output.position = projectionMatrix * vec4f(x, y, 0, 1);
  // output.position = vec4f(x, y, 0, 1);
  // output.position = projectionMatrix * vec4(
  //   pos.x + verts[vertexIndex].x * circle.radius * pos.z,
  //   pos.y + verts[vertexIndex].y * circle.radius * pos.z,
  //   pos.z,
  //   pos.w
  // );

  // output.position.z = 0;
  if (segmentVertIndex < 3) {
    output.color = vec4f(1.0, 0.0, 0.0, 1.0);
  }
  else {
    output.color = vec4f(0.0, 0.0, 1.0, 1.0);
  }

  return output;
}

@fragment
fn fragment_circle(fragData: VertexOut) -> @location(0) vec4f
{
  return fragData.color;
}
`
