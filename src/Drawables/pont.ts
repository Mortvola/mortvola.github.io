import Point from "./Point";
import SurfaceMesh from "./SurfaceMesh";

export const point = (radius: number) => {
  const mesh = new SurfaceMesh();

  mesh.addVertex(new Point(-radius, radius, 0));
  mesh.addVertex(new Point(-radius, -radius, 0));
  mesh.addVertex(new Point(radius, -radius, 0));
  mesh.addVertex(new Point(radius, radius, 0));

  mesh.addQuad(0, 1, 2, 3); // front

  return mesh;
}
