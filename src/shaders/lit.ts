import { common } from './common';
import { lights } from './lights';
import { phongFragment } from './phongFragment';

export const litShader = /*wgsl*/`
struct Vertex {
  @location(0) position: vec4f,
  @location(1) normal: vec4f,
}

struct VertexOut {
  @builtin(position) position : vec4f,
  @location(0) color : vec4f,
  @location(1) fragPos: vec4f,
  @location(2) normal: vec4f,
}

${common}

${lights}

@group(1) @binding(1) var<uniform> color: vec4f;

@vertex
fn vertex_simple(vert: Vertex) -> VertexOut
{
  var output: VertexOut;

  output.position = projectionMatrix * viewMatrix * modelMatrix * vert.position;

  output.color = color;
  output.fragPos = viewMatrix * modelMatrix * vert.position;
  output.normal = viewMatrix * modelMatrix * vert.normal;

  return output;
}

${phongFragment}
`
