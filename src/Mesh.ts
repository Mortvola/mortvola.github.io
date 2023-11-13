import { mat4, vec3, vec4 } from 'webgpu-matrix';
import { bindGroups } from "./BindGroups";
import { gpu } from "./Gpu";
import SurfaceMesh from "./Shapes/SurfaceMesh";
import { uvSphere } from "./Shapes/uvsphere";
import Vec4 from 'webgpu-matrix/dist/1.x/vec4-impl';
import { intersectTriangle } from './Math';

class Mesh {
  device: GPUDevice;

  sphere: SurfaceMesh;

  vertexBuffer: GPUBuffer;

  indexBuffer: GPUBuffer;

  constructor() {
    if (!gpu.device) {
      throw new Error('device is not set')
    }

    this.device = gpu.device;

    this.sphere = uvSphere(8, 8);

    this.vertexBuffer = gpu.device.createBuffer({
      size: this.sphere.vertices.length * Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    });  
    {
      const mapping = new Float32Array(this.vertexBuffer.getMappedRange());
      // for (let i = 0; i < vertices.length; ++i) {
        mapping.set(this.sphere.vertices, 0);
      // }
      this.vertexBuffer.unmap();  
    }
  
    this.indexBuffer = gpu.device.createBuffer({
      size: (this.sphere.indexes.length * Uint16Array.BYTES_PER_ELEMENT + 3) & ~3, // Make sure it is a multiple of four
      usage: GPUBufferUsage.INDEX,
      mappedAtCreation: true,
    })
    {
      const mapping = new Uint16Array(this.indexBuffer.getMappedRange());
      mapping.set(this.sphere.indexes, 0);
      this.indexBuffer.unmap();  
    }
  }

  render(passEncoder: GPURenderPassEncoder) {
    if (!bindGroups.mesh) {
      throw new Error('mesh bind group not set.')
    }

    const uniformValues2 = new Float32Array(bindGroups.mesh.uniformBuffer[0].size / Float32Array.BYTES_PER_ELEMENT);

    const kMatrixOffset = 0;

    let matrixValue2 = uniformValues2.subarray(kMatrixOffset, kMatrixOffset + 16);
    matrixValue2 = mat4.identity();
    matrixValue2 = mat4.translate(matrixValue2, [0, 0, -2]);

    this.device.queue.writeBuffer(bindGroups.mesh.uniformBuffer[0].buffer, 0, matrixValue2);

    passEncoder.setBindGroup(1, bindGroups.mesh.bindGroup);

    passEncoder.setVertexBuffer(0, this.vertexBuffer);
    passEncoder.setIndexBuffer(this.indexBuffer, "uint16");
    passEncoder.drawIndexed(this.sphere.indexes.length);  
  }

  hitTest(origin: Vec4, vector: Vec4) {
    let matrix = mat4.identity();
    matrix = mat4.translate(matrix, [0, 0, -2]);

    const inverseMatrix = mat4.inverse(matrix);

    const localVector = vec4.transformMat4(vector, inverseMatrix);
    const localOrigin = vec4.transformMat4(origin, inverseMatrix);

    for (let i = 0; i < this.sphere.indexes.length; i += 3) {
      const index0 = this.sphere.indexes[i + 0] * 8;
      const index1 = this.sphere.indexes[i + 1] * 8;
      const index2 = this.sphere.indexes[i + 2] * 8;

      const v0 = vec3.create(
        this.sphere.vertices[index0 + 0],
        this.sphere.vertices[index0 + 1],
        this.sphere.vertices[index0 + 2],
      )

      const v1 = vec3.create(
        this.sphere.vertices[index1 + 0],
        this.sphere.vertices[index1 + 1],
        this.sphere.vertices[index1 + 2],
      )

      const v2 = vec3.create(
        this.sphere.vertices[index2 + 0],
        this.sphere.vertices[index2 + 1],
        this.sphere.vertices[index2 + 2],
      )

      const result = intersectTriangle(localOrigin, localVector, v0, v1, v2);

      if (result) {
        return true;
      }
    }

    return false;
  }
}

export default Mesh;
