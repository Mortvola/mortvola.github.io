struct Vertex {
  @location(0) position: vec4f,
  @location(1) color: vec4f,
}

struct VertexOut {
  @builtin(position) position : vec4f,
  @location(0) color : vec4f
}

@group(0) @binding(0) var<uniform> projectionMatrix: mat4x4f;
@group(0) @binding(1) var<uniform> view: mat4x4f;

@vertex
fn vertex_main(vert: Vertex) -> VertexOut
{
  var output : VertexOut;

  output.position = projectionMatrix * view * vert.position;
  output.color = vert.color;
  return output;
}

@fragment
fn fragment_main(fragData: VertexOut) -> @location(0) vec4f
{
  return fragData.color;
}
