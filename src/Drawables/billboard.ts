import Point from "./Point";
import SurfaceMesh from "./SurfaceMesh";

export const billboard = (width: number, height: number) => {
  const mesh = new SurfaceMesh();

  const x = width / 2;
  const y = height / 2;

  mesh.addVertex(new Point(-x, y, 0));
  mesh.addVertex(new Point(-x, -y, 0));
  mesh.addVertex(new Point(x, -y, 0));
  mesh.addVertex(new Point(x, y, 0));

  mesh.addQuad(0, 1, 2, 3); // front

  return mesh;
}

