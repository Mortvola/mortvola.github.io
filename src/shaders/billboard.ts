import { common } from "./common";

export const billboardShader = /*wgsl*/`
struct VertexOut {
  @builtin(position) position : vec4f,
  @location(0) texcoord: vec2f,
}

${common}

@group(1) @binding(1) var<uniform> color: vec4f;

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

  let texcoords = array(
    vec2f(0.0, 1.0),
    vec2f(0.0, 0.0),
    vec2f(1.0, 1.0),
    vec2f(1.0, 1.0),
    vec2f(0.0, 0.0),
    vec2f(1.0, 0.0),
  );

  var output : VertexOut;

  // The fourth vector in the resulting matrix will be how
  // much a point at the origin will have been translated.
  var pos = (viewMatrix * modelMatrix)[3];

  output.position = projectionMatrix * vec4(
    pos.x + verts[vertexIndex].x * radius * pos.z,
    pos.y + verts[vertexIndex].y * radius * pos.z,
    pos.z,
    pos.w
  );

  output.position.z = 0;

  output.texcoord = texcoords[vertexIndex];
  return output;
}

@group(3) @binding(0) var ourSampler: sampler;
@group(3) @binding(1) var ourTexture: texture_2d<f32>;

@fragment
fn fragment_billboard(fragData: VertexOut) -> @location(0) vec4f
{
  return textureSample(ourTexture, ourSampler, fragData.texcoord);
}
`