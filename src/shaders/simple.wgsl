struct Vertex {
  @location(0) position: vec4f,
  @location(1) color: vec4f,
}

struct VertexOut {
  @builtin(position) position : vec4f,
  @location(0) color : vec4f
}

@group(0) @binding(0) var<uniform> projectionMatrix: mat4x4f;
@group(0) @binding(1) var<uniform> viewMatrix: mat4x4f;

@group(1) @binding(0) var<uniform> modelMatrix: mat4x4f;
@group(1) @binding(1) var<uniform> color: vec4f;

@vertex
fn vertex_simple(vert: Vertex) -> VertexOut
{
  var output : VertexOut;

  output.position = projectionMatrix * viewMatrix * modelMatrix * vert.position;
  // output.position.x *= output.position.w;
  // output.position.y *= output.position.w;

  output.color = color;
  return output;
}

@fragment
fn fragment_simple(fragData: VertexOut) -> @location(0) vec4f
{
  return fragData.color;
}
