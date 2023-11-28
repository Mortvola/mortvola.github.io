import { common } from "./common";

export const simpleShader = /*wgsl*/`
struct Vertex {
  @location(0) position: vec4f,
}

struct VertexOut {
  @builtin(position) position : vec4f,
  @location(0) color : vec4f
}

${common}

@group(1) @binding(1) var<uniform> color: vec4f;

@vertex
fn vertex_simple(vert: Vertex) -> VertexOut
{
  var output : VertexOut;

  output.position = projectionMatrix * viewMatrix * modelMatrix * vert.position;

  output.color = color;
  return output;
}

@fragment
fn fragment_simple(fragData: VertexOut) -> @location(0) vec4f
{
  return fragData.color;
}
`
