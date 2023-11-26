import { common } from "./common";

export const lineShader = /*wgsl*/`
struct Vertex {
  @location(0) position: vec4f,
  @location(1) color: vec4f,
}

struct VertexOut {
  @builtin(position) position : vec4f,
  @location(0) color : vec4f
}

${common}

@vertex
fn vertex_line(vert: Vertex) -> VertexOut
{
  var output : VertexOut;

  output.position = projectionMatrix * viewMatrix * vert.position;
  output.color = vert.color;
  return output;
}

@fragment
fn fragment_line(fragData: VertexOut) -> @location(0) vec4f
{
  return fragData.color;
}
`
