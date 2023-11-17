struct VertexOut {
  @builtin(position) position : vec4f,
  @location(0) color : vec4f
}

@group(0) @binding(0) var<uniform> perspective: mat4x4f;
@group(0) @binding(1) var<uniform> view: mat4x4f;

@group(1) @binding(0) var<uniform> model: mat4x4f;

@group(2) @binding(0) var<uniform> radius: f32;

@vertex
fn vertex_billboard(@builtin(vertex_index) vertexIndex : u32) -> VertexOut
{
  let verts = array(
    vec2f(-1.0, 1.0),
    vec2f(-1.0, -1.0),
    vec2f(1.0, 1.0),
    vec2f(1.0, 1.0),
    vec2f(-1.0, -1.0),
    vec2f(1.0, -1.0),
  );

  var output : VertexOut;

  // The fourth vector in the resulting matrix will be how
  // much a point at the origin will have been translated.
  var pos = (view * model)[3];

  output.position = perspective * vec4(
    pos.x + verts[vertexIndex].x * radius * pos.z,
    pos.y + verts[vertexIndex].y * radius * pos.z,
    pos.z,
    pos.w
  );
  output.color = vec4f(0.0, 0.0, 0.0, 1.0);
  return output;
}

@fragment
fn fragment_billboard(fragData: VertexOut) -> @location(0) vec4f
{
  return fragData.color;
}
