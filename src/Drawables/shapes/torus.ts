import { Vec4, vec3 } from 'wgpu-matrix';
import SurfaceMesh from "../SurfaceMesh";

export const torus = (numSegments = 8, numFacets = 8, radius = 1, thickness = 0.25, color?: Vec4) => {
  const mesh = new SurfaceMesh(color);

  const ringRadius = thickness / 2;
  // Vertices for each ring around the toruns.
  for (let i = 0; i < numSegments; i += 1) {
    const theta = 2 * Math.PI / numSegments * i;

    for (let j = 0; j < numFacets; j += 1) {
      const phi = 2 * Math.PI / numFacets * j;

      const w = vec3.create(Math.cos(theta), Math.sin(theta), 0);
      const q = vec3.add(
        vec3.mulScalar(w, radius),
        vec3.add(
          vec3.mulScalar(w, ringRadius * Math.cos(phi)),
          vec3.create(0, 0, ringRadius * Math.sin(phi)),
        )
      )

      mesh.addVertex(q[0], q[1], q[2]);
    }
  }

  for (let i = 0; i < numSegments - 1; i += 1) {
    const offset = i * numFacets;
    for (let j = 0; j < numFacets; j += 1) {
      mesh.addFace([
        j + offset,
        (j + 1) % 8 + offset,
        (j + 1) % 8 + numFacets + offset,
        j + numFacets + offset,
      ]);
    }
  }

  const offset = (numSegments - 1) * numFacets;
  for (let j = 0; j < numFacets; j += 1) {
    mesh.addFace([
      j + offset,
      (j + 1) % 8 + offset,
      (j + 1) % 8, // + numFacets + offset,
      j, // + numFacets + offset,
    ]);
  }

  return mesh;
}
