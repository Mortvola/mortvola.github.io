import { vec3, vec4, Vec3, Vec4 } from 'wgpu-matrix';
import Point from "./Point";
import { intersectTriangle } from '../Math';
import { yieldToMain } from '../UserInterface/LoadFbx';

class SurfaceMesh {
  vertices: number[] = [];
  indexes: number[] = [];
  normals: number[] = [];
  color: Vec4;

  constructor(color?: Vec4) {
    this.color = color ?? vec4.create(0.8, 0.8, 0.8, 1.0);
  }

  addVertex(point: Point, color?: Vec3): number {
    const c = color ?? vec3.create(point.x, point.y, point.z);

    this.vertices = this.vertices.concat([
      point.x, point.y, point.z, 1, // position
      c[0], c[1], c[2], 1, // color
    ]);
    return (this.vertices.length / 8) - 1;
  }

  addFace(vertices: number[], normals?: number[]) {
    if (vertices.length === 3) {
      this.indexes = this.indexes.concat(vertices);

      if (normals) {
        if (normals.length !== 3 * 3) {
          throw new Error('normals to vertices mismatch');
        }

        this.normals = this.normals.concat(normals);
      }
    }
    else if (vertices.length === 4) {
      let normals1: number[] | undefined = undefined;
      let normals2: number[] | undefined = undefined;

      if (normals) {
        if (normals.length !== 4 * 3) {
          throw new Error('normals to vertices mismatch');
        }

        normals1 = [
          normals[0 + 0], normals[0 + 1], normals[0 + 2],
          normals[3 + 0], normals[3 + 1], normals[3 + 2],
          normals[9 + 0], normals[9 + 1], normals[9 + 2],
        ];

        normals2 = [
          normals[3 + 0], normals[3 + 1], normals[3 + 2],
          normals[6 + 0], normals[6 + 1], normals[6 + 2],
          normals[9 + 0], normals[9 + 1], normals[9 + 2],
        ];
      }

      this.addFace([vertices[0], vertices[1], vertices[3]], normals1);
      this.addFace([vertices[1], vertices[2], vertices[3]], normals2);  
    }
  }

  async generateBuffers() {
    let verts: number[] = [];
    let indices: number[] = [];
    let normals: number[] = [];

    let yieldPolyCount = 0;
    const yieldPolyCountMax = 500;

    for (let i = 0; i < this.indexes.length; i += 3) {
      const index0 = this.indexes[i + 0] * 8;
      const index1 = this.indexes[i + 1] * 8;
      const index2 = this.indexes[i + 2] * 8;

      const vertexA = vec4.create(
        this.vertices[index0 + 0],
        this.vertices[index0 + 1],
        this.vertices[index0 + 2],
        1.0,
      );

      const vertexB = vec4.create(
        this.vertices[index1 + 0],
        this.vertices[index1 + 1],
        this.vertices[index1 + 2],
        1.0,
      );

      const vertexC = vec4.create(
        this.vertices[index2 + 0],
        this.vertices[index2 + 1],
        this.vertices[index2 + 2],
        1.0,
      );

      verts = verts.concat([
        ...vertexA,
        ...vertexB,
        ...vertexC,
      ]);

      if (this.normals.length === 0) {
        const v1 = vec4.subtract(vertexA, vertexB);
        const v2 = vec4.subtract(vertexC, vertexB);

        const normal = vec3.normalize(vec3.cross(v2, v1));

        normals = normals.concat([
          ...normal, 0.0,
          ...normal, 0.0,
          ...normal, 0.0,
        ])
      }
      else {
        const indexOffset = i * 3;
        normals = normals.concat([
          ...this.normals.slice(indexOffset + 0, indexOffset + 3), 0.0,
          ...this.normals.slice(indexOffset + 3, indexOffset + 6), 0.0,
          ...this.normals.slice(indexOffset + 6, indexOffset + 9), 0.0,
        ])
      }

      indices = indices.concat([
        i + 0, i + 1, i + 2,
      ])

      yieldPolyCount += 1;

      if (yieldPolyCount >= yieldPolyCountMax) {
        await yieldToMain();
        yieldPolyCount = 0;  
      }
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
