import { vec3, vec4, Vec3, Vec4 } from 'wgpu-matrix';
import Point from "./Point";
import { intersectTriangle } from '../Math';

class SurfaceMesh {
  vertices: number[] = [];
  indexes: number[] = [];
  color: Vec4;

  constructor(color?: Vec4) {
    this.color = color ?? vec4.create(0.3, 0.3, 0.3, 1.0);
  }

  addVertex(point: Point, color?: Vec3): number {
    const c = color ?? vec3.create(point.x, point.y, point.z);

    this.vertices = this.vertices.concat([
      point.x, point.y, point.z, 1, // position
      c[0], c[1], c[2], 1, // color
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

  generateBuffers() {
    let verts: number[] = [];
    let indices: number[] = [];
    let normals: number[] = [];

    for (let i = 0; i < this.indexes.length; i += 3) {
      const index0 = this.indexes[i + 0] * 8;
      const index1 = this.indexes[i + 1] * 8;
      const index2 = this.indexes[i + 2] * 8;

      const vertexA = vec3.create(
        this.vertices[index0 + 0],
        this.vertices[index0 + 1],
        this.vertices[index0 + 2],
      );

      const vertexB = vec3.create(
        this.vertices[index1 + 0],
        this.vertices[index1 + 1],
        this.vertices[index1 + 2],
      );

      const vertexC = vec3.create(
        this.vertices[index2 + 0],
        this.vertices[index2 + 1],
        this.vertices[index2 + 2],
      );

      const v1 = vec3.subtract(vertexA, vertexB);
      const v2 = vec3.subtract(vertexC, vertexB);

      const normal = vec3.normalize(vec3.cross(v2, v1));

      verts = verts.concat([
        vertexA[0], vertexA[1], vertexA[2], 1.0,
        vertexB[0], vertexB[1], vertexB[2], 1.0,
        vertexC[0], vertexC[1], vertexC[2], 1.0,
      ]);

      normals = normals.concat([
        normal[0], normal[1], normal[2], 0.0,
        normal[0], normal[1], normal[2], 0.0,
        normal[0], normal[1], normal[2], 0.0,
      ])

      indices = indices.concat([
        i + 0, i + 1, i + 2,
      ])
    }

    return {
      vertices: verts,
      normals,
      indices,
    }
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

  computeCentroid(): Vec4 {
    const sum = vec3.create(0, 0, 0);
  
    for (let i = 0; i < this.vertices.length; i += 8) {
      sum[0] += this.vertices[i + 0];
      sum[1] += this.vertices[i + 1];
      sum[2] += this.vertices[i + 2];
    }

    const average = vec3.divScalar(sum, this.vertices.length);

    return vec4.create(average[0], average[1], average[2], 1);
  }
}

export default SurfaceMesh;
