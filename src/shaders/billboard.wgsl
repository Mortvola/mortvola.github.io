struct Vertex {
  @location(0) position: vec4f,
  @location(1) color: vec4f,
}

struct VertexOut {
  @builtin(position) position : vec4f,
  @location(0) color : vec4f
}

@group(0) @binding(0) var<uniform> perspective: mat4x4f;
@group(0) @binding(1) var<uniform> view: mat4x4f;

@group(1) @binding(0) var<uniform> model: mat4x4f;

@vertex
fn vertex_main(vert: Vertex) -> VertexOut
{
  var output : VertexOut;

  // The fourth vector in the resulting matrix will be how
  // much a point at the origin will have been translated.
  var pos = (view * model)[3];

  // output.position = perspective * vec4(pos.x + vert.position.x * pos.z, pos.y + vert.position.y * pos.z, pos.z, pos.w);
  // output.position = perspective * vec4(pos.x + vert.position.x * model[0][0], pos.y + vert.position.y * model[1][1], pos.z, pos.w);
  output.position = perspective * vec4(pos.x + vert.position.x * pos.z, pos.y + vert.position.y * pos.z, pos.z, pos.w);
  output.color = vert.color;
  return output;
}

@fragment
fn fragment_main(fragData: VertexOut) -> @location(0) vec4f
{
  return fragData.color;
}