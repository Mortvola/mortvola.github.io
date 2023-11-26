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

@group(0) @binding(0) var<uniform> projectionMatrix: mat4x4f;
@group(0) @binding(1) var<uniform> viewMatrix: mat4x4f;
@group(0) @binding(2) var<uniform> cameraPos: vec4f;

struct PointLight {
  position: vec4f,
  color: vec4f,
}

struct Lights {
  count: u32,
  lights: array<PointLight, 4>,
}

@group(0) @binding(3) var<storage> pointLights: Lights;

@group(1) @binding(0) var<uniform> modelMatrix: mat4x4f;
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

@fragment
fn fragment_simple(fragData: VertexOut) -> @location(0) vec4f
{
  var ambientStrength = f32(0.1);
  var specularStrength = 0.5;
  var shininess = 32.0;

  var normal = normalize(fragData.normal);
  var viewDir = normalize(-fragData.fragPos);

  var lightColor = pointLights.lights[0].color;
  var lightDir = normalize(pointLights.lights[0].position - fragData.fragPos);
  var reflectDir = reflect(-lightDir, normal);

  var diffuse = max(dot(normal, lightDir), 0.0);
  var specular = specularStrength * pow(max(dot(viewDir, reflectDir), 0.0), shininess);

  return (ambientStrength + diffuse + specular) * lightColor * fragData.color;
}
