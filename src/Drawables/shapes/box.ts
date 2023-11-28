import { Vec4 } from 'wgpu-matrix';
import SurfaceMesh from "../SurfaceMesh";

export const box = (width = 2, height = 2, depth = 2, color?: Vec4) => {
  const mesh = new SurfaceMesh(color);

  const x = width / 2;
  const y = height / 2;
  const z = depth / 2;

  mesh.addVertex(-x, y, z);
  mesh.addVertex(-x, -y, z);
  mesh.addVertex(x, -y, z);
  mesh.addVertex(x, y, z);

  mesh.addVertex(x, y, -z);
  mesh.addVertex(x, -y, -z);
  mesh.addVertex(-x, -y, -z);
  mesh.addVertex(-x, y, -z);

  mesh.addFace([0, 1, 2, 3]); // front
  mesh.addFace([4, 5, 6, 7]); // back
  mesh.addFace([0, 3, 4, 7]); // top
  mesh.addFace([2, 1, 6, 5]); // bottom
  mesh.addFace([0, 7, 6, 1]); // left
  mesh.addFace([3, 2, 5, 4]); // left

  return mesh;
}