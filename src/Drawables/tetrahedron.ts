import { Vec4 } from 'wgpu-matrix';
import Point from "./Point";
import SurfaceMesh from "./SurfaceMesh";

export const tetrahedron = (color?: Vec4) => {
  const mesh = new SurfaceMesh(color);

  // choose coordinates on the unit sphere
  const a = 1.0 / 3.0;
  const b = Math.sqrt(8.0 / 9.0);
  const c = Math.sqrt(2.0 / 9.0);
  const d = Math.sqrt(2.0 / 3.0);

  // add the 4 vertices
  const v0 = mesh.addVertex(new Point(0, 1, 0));
  const v2 = mesh.addVertex(new Point(-c, -a, d));
  const v1 = mesh.addVertex(new Point(-c, -a, -d));
  const v3 = mesh.addVertex(new Point(b, -a, 0));

  // add the 4 faces
  mesh.addTriangle(v0, v1, v2);
  mesh.addTriangle(v0, v2, v3);
  mesh.addTriangle(v0, v3, v1);
  mesh.addTriangle(v3, v2, v1);

  return mesh;
}
