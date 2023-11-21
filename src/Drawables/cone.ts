import { Vec3 } from 'wgpu-matrix';
import Point from "./Point";
import SurfaceMesh from "./SurfaceMesh";

export const cone = (numSlices: number, radius = 1, color?: Vec3) => {
  const mesh = new SurfaceMesh();
  const numStacks = 2;

  // add top vertex
  const v0 = mesh.addVertex(new Point(0, 1, 0), color);

  // generate vertices per stack / slice
  for (let i = 0; i < numStacks - 1; i++)
  {
    const phi = Math.PI * (i + 1) / numStacks;
    for (let j = 0; j < numSlices; j++)
    {
      const theta = 2.0 * Math.PI * j / numSlices;
      const x = Math.sin(phi) * Math.cos(theta) * radius;
      const y = -1;
      const z = Math.sin(phi) * Math.sin(theta) * radius;

      mesh.addVertex(new Point(x, y, z), color);
    }
  }

  // add bottom center vertex
  const v1 = mesh.addVertex(new Point(0, -1, 0), color);

  // add triangles
  for (let i = 0; i < numSlices; ++i)
  {
    let i0 = i + 1;
    let i1 = (i + 1) % numSlices + 1;
    mesh.addTriangle(v0, i1, i0);

    i0 = i + numSlices * (numStacks - 2) + 1;
    i1 = (i + 1) % numSlices + numSlices * (numStacks - 2) + 1;
    mesh.addTriangle(v1, i0, i1);
  }

  // add quads per stack / slice
  // for (let j = 0; j < numStacks - 2; j++)
  // {
  //   const j0 = j * numSlices + 1;
  //   const j1 = (j + 1) * numSlices + 1;

  //   for (let i = 0; i < numSlices; i++)
  //   {
  //     const i0 = j0 + i;
  //     const i1 = j0 + (i + 1) % numSlices;
  //     const i2 = j1 + (i + 1) % numSlices;
  //     const i3 = j1 + i;
  //     mesh.addQuad(i0, i1, i2, i3);
  //   }
  // }

  return mesh;
}
