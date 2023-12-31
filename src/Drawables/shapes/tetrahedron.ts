import { Vec4 } from 'wgpu-matrix';
import SurfaceMesh from "../SurfaceMesh";

export const tetrahedron = (color?: Vec4) => {
  const mesh = new SurfaceMesh(color);

  // choose coordinates on the unit sphere
  const a = 1.0 / 3.0;
  const b = Math.sqrt(8.0 / 9.0);
  const c = Math.sqrt(2.0 / 9.0);
  const d = Math.sqrt(2.0 / 3.0);

  // add the 4 vertices
  const v0 = mesh.addVertex(0, 1, 0);
  const v2 = mesh.addVertex(-c, -a, d);
  const v1 = mesh.addVertex(-c, -a, -d);
  const v3 = mesh.addVertex(b, -a, 0);

  // add the 4 faces
  mesh.addFace([v0, v1, v2]);
  mesh.addFace([v0, v2, v3]);
  mesh.addFace([v0, v3, v1]);
  mesh.addFace([v3, v2, v1]);

  return mesh;
}
