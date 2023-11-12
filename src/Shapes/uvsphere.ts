class Point {
  x: number;

  y: number;

  z: number;

  constructor(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
}

class SurfaceMesh {
  vertices: number[] = [];
  indexes: number[] = [];

  addVertex(point: Point): number {
    this.vertices = this.vertices.concat([
      point.x, point.y, point.z, 1, // position
      point.x, point.y, point.z, 1, // color
    ]);
    return (this.vertices.length / 8) - 1;
  }

  addTriangle(v0: number, v1: number, v2: number) {
    this.indexes = this.indexes.concat([v0, v2, v1]);
  }

  addQuad(v0: number, v1: number, v2: number, v3: number) {
    this.addTriangle(v0, v3, v1);
    this.addTriangle(v1, v3, v2);
  }
}

export const uvSphere = (numSlices: number, numStacks: number) => {
  const mesh = new SurfaceMesh();

  // add top vertex
  const v0 = mesh.addVertex(new Point(0, 1, 0));

  // generate vertices per stack / slice
  for (let i = 0; i < numStacks - 1; i++)
  {
    const phi = Math.PI * (i + 1) / numStacks;
    for (let j = 0; j < numSlices; j++)
    {
      const theta = 2.0 * Math.PI * j / numSlices;
      const x = Math.sin(phi) * Math.cos(theta);
      const y = Math.cos(phi);
      const z = Math.sin(phi) * Math.sin(theta);

      mesh.addVertex(new Point(x, y, z));
    }
  }

  // add bottom vertex
  const v1 = mesh.addVertex(new Point(0, -1, 0));

  // add top / bottom triangles
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
  for (let j = 0; j < numStacks - 2; j++)
  {
    const j0 = j * numSlices + 1;
    const j1 = (j + 1) * numSlices + 1;

    for (let i = 0; i < numSlices; i++)
    {
      const i0 = j0 + i;
      const i1 = j0 + (i + 1) % numSlices;
      const i2 = j1 + (i + 1) % numSlices;
      const i3 = j1 + i;
      mesh.addQuad(i0, i1, i2, i3);
    }
  }

  return mesh;
}
