import { Vec4 } from 'wgpu-matrix';
import SurfaceMesh from "../SurfaceMesh";

export const cone = (numSlices: number, height = 2, radius = 1, color?: Vec4) => {
  const mesh = new SurfaceMesh(color);
  const numStacks = 2;

  // add top vertex
  const v0 = mesh.addVertex(0, height / 2, 0);

  // generate vertices per stack / slice
  for (let i = 0; i < numStacks - 1; i++)
  {
    const phi = Math.PI * (i + 1) / numStacks;
    for (let j = 0; j < numSlices; j++)
    {
      const theta = 2.0 * Math.PI * j / numSlices;
      const x = Math.sin(phi) * Math.cos(theta) * radius;
      const y = -height / 2;
      const z = Math.sin(phi) * Math.sin(theta) * radius;

      mesh.addVertex(x, y, z);
    }
  }

  // add bottom center vertex
  const v1 = mesh.addVertex(0, -height / 2, 0);

  // add triangles
  for (let i = 0; i < numSlices; ++i)
  {
    let i0 = i + 1;
    let i1 = (i + 1) % numSlices + 1;
    mesh.addFace([v0, i1, i0]);

    i0 = i + numSlices * (numStacks - 2) + 1;
    i1 = (i + 1) % numSlices + numSlices * (numStacks - 2) + 1;
    mesh.addFace([v1, i0, i1]);
  }

  return mesh;
}
