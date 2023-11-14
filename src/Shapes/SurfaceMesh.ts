import Point from "./Point";

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
}

export default SurfaceMesh;
