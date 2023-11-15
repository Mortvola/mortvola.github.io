import Point from "./Point";
import SurfaceMesh from "./SurfaceMesh";

export const box = (numSlices: number, numStacks: number) => {
  const mesh = new SurfaceMesh();

  mesh.addVertex(new Point(-1, 1, 1));
  mesh.addVertex(new Point(-1, -1, 1));
  mesh.addVertex(new Point(1, -1, 1));
  mesh.addVertex(new Point(1, 1, 1));

  mesh.addVertex(new Point(1, 1, -1));
  mesh.addVertex(new Point(1, -1, -1));
  mesh.addVertex(new Point(-1, -1, -1));
  mesh.addVertex(new Point(-1, 1, -1));

  mesh.addQuad(0, 1, 2, 3); // front
  mesh.addQuad(4, 5, 6, 7); // back
  mesh.addQuad(0, 3, 4, 7); // top
  mesh.addQuad(2, 1, 6, 5); // bottom
  mesh.addQuad(0, 7, 6, 1); // left
  mesh.addQuad(3, 2, 5, 4); // left

  return mesh;
}