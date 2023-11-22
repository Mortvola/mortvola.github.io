import Point from "./Point";
import { Vec3 } from 'wgpu-matrix';
import SurfaceMesh from "./SurfaceMesh";

export const box = (width = 2, height = 2, depth = 2, color?: Vec3) => {
  const mesh = new SurfaceMesh();

  const x = width / 2;
  const y = height / 2;
  const z = depth / 2;

  mesh.addVertex(new Point(-x, y, z), color);
  mesh.addVertex(new Point(-x, -y, z), color);
  mesh.addVertex(new Point(x, -y, z), color);
  mesh.addVertex(new Point(x, y, z), color);

  mesh.addVertex(new Point(x, y, -z), color);
  mesh.addVertex(new Point(x, -y, -z), color);
  mesh.addVertex(new Point(-x, -y, -z), color);
  mesh.addVertex(new Point(-x, y, -z), color);

  mesh.addQuad(0, 1, 2, 3); // front
  mesh.addQuad(4, 5, 6, 7); // back
  mesh.addQuad(0, 3, 4, 7); // top
  mesh.addQuad(2, 1, 6, 5); // bottom
  mesh.addQuad(0, 7, 6, 1); // left
  mesh.addQuad(3, 2, 5, 4); // left

  return mesh;
}