import { Vec4 } from 'wgpu-matrix';
import SurfaceMesh from "../SurfaceMesh";

export const plane = (width: number, height: number, color?: Vec4) => {
  const mesh = new SurfaceMesh(color);

  const x = width / 2;
  const y = width / 2;

  mesh.addVertex(-x, y, 0);
  mesh.addVertex(-x, -y, 0);
  mesh.addVertex(x, -y, 0.0);
  mesh.addVertex(x, y, 0);

  mesh.addFace([0, 1, 2, 3]);

  return mesh;
}
