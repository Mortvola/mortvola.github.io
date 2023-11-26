export const phongFragment = /*wgsl*/`
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
`