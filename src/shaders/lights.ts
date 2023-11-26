export const lights = /*wgsl*/`
struct PointLight {
  position: vec4f,
  color: vec4f,
}

struct Lights {
  count: u32,
  lights: array<PointLight, 4>,
}

@group(0) @binding(3) var<storage> pointLights: Lights;
`