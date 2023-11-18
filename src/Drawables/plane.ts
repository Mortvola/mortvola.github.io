import { Vec3 } from 'wgpu-matrix';
import Point from "./Point";
import SurfaceMesh from "./SurfaceMesh";

export const plane = (width: number, height: number, color?: Vec3) => {
  const mesh = new SurfaceMesh();

  const x = width / 2;
  const y = width / 2;

  mesh.addVertex(new Point(-x, y, 0), color)
  mesh.addVertex(new Point(-x, -y, 0), color);
  mesh.addVertex(new Point(x, -y, 0.0), color)
  mesh.addVertex(new Point(x, y, 0), color);

  mesh.addQuad(0, 1, 2, 3);

  return mesh;
}
