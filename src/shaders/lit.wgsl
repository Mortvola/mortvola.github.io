struct Vertex {
  @location(0) position: vec4f,
  @location(1) normal: vec4f,
}

struct VertexOut {
  @builtin(position) position : vec4f,
  @location(0) color : vec4f,
  @location(1) worldPos: vec4f,
  @location(2) normal: vec4f,
  @location(3) cameraPos: vec4f,
}

@group(0) @binding(0) var<uniform> projectionMatrix: mat4x4f;
@group(0) @binding(1) var<uniform> viewMatrix: mat4x4f;
@group(0) @binding(2) var<uniform> cameraPos: vec4f;

@group(1) @binding(0) var<uniform> modelMatrix: mat4x4f;
@group(1) @binding(1) var<uniform> color: vec4f;

@vertex
fn vertex_simple(vert: Vertex) -> VertexOut
{
  var output: VertexOut;

  output.position = projectionMatrix * viewMatrix * modelMatrix * vert.position;

  output.color = color;
  output.worldPos = modelMatrix * vert.position;
  output.normal = modelMatrix * vert.normal;
  output.cameraPos = cameraPos;
  return output;
}

@fragment
fn fragment_simple(fragData: VertexOut) -> @location(0) vec4f
{
  var ambientStrength = f32(0.1);
  var lightColor = vec4f(1.0, 1.0, 1.0, 1.0);
  var lightPos = vec4f(3.0, 3.0, 3.0, 1.0);
  var lightDir = normalize(lightPos - fragData.worldPos);
  var normal = normalize(fragData.normal);
  var specularStrength = 0.5;
  var viewDir = normalize(fragData.cameraPos - fragData.worldPos);
  var reflectDir = reflect(-lightDir, normal);

  // var ambient = ambientStrength * lightColor;

  var diffuse = max(dot(normal, lightDir), 0.0);

  var spec = pow(max(dot(viewDir, reflectDir), 0.0), 32);
  var specular = specularStrength * spec;

  return (ambientStrength + diffuse + specular) * lightColor * fragData.color;
}
