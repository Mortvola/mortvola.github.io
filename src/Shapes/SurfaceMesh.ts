import { vec3, vec4, Vec3 } from 'wgpu-matrix';
import Point from "./Point";
import { intersectTriangle } from '../Math';

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
    this.indexes = this.indexes.concat([v0, v1, v2]);
  }

  addQuad(v0: number, v1: number, v2: number, v3: number) {
    this.addTriangle(v0, v1, v3);
    this.addTriangle(v1, v2, v3);
  }

  hitTest(origin: Vec3, ray: Vec3) {
    for (let i = 0; i < this.indexes.length; i += 3) {
      const index0 = this.indexes[i + 0] * 8;
      const index1 = this.indexes[i + 1] * 8;
      const index2 = this.indexes[i + 2] * 8;

      const v0 = vec3.create(
        this.vertices[index0 + 0],
        this.vertices[index0 + 1],
        this.vertices[index0 + 2],
      )

      const v1 = vec3.create(
        this.vertices[index1 + 0],
        this.vertices[index1 + 1],
        this.vertices[index1 + 2],
      )

      const v2 = vec3.create(
        this.vertices[index2 + 0],
        this.vertices[index2 + 1],
        this.vertices[index2 + 2],
      )

      const result = intersectTriangle(origin, ray, v0, v1, v2);

      if (result) {
        let intersection = vec4.add(origin, vec4.mulScalar(ray, result[0]))

        return { point: intersection, t: result[0] };
      }    
    }

    return null;
  }
}

export default SurfaceMesh;
