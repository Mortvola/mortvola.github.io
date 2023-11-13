import { bindGroups } from "./BindGroups";
import { gpu } from "./Gpu";
import { translate } from "./Matrix";
import SurfaceMesh from "./Shapes/SurfaceMesh";
import { uvSphere } from "./Shapes/uvsphere";

class Mesh {
  device: GPUDevice;

  sphere: SurfaceMesh;

  vertexBuffer: GPUBuffer;

  indexBuffer: GPUBuffer;

  // uniformBuffer: GPUBuffer;

  // uniformBufferSize: number;

  // uniformBuffer2: GPUBuffer;

  // uniformBufferSize2: number;

  // bindGroup: GPUBindGroup;

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
    matrixValue2 = translate(0, 0, -2);

    this.device.queue.writeBuffer(bindGroups.mesh.uniformBuffer[0].buffer, 0, matrixValue2);

    passEncoder.setBindGroup(1, bindGroups.mesh.bindGroup);

    passEncoder.setVertexBuffer(0, this.vertexBuffer);
    passEncoder.setIndexBuffer(this.indexBuffer, "uint16");
    passEncoder.drawIndexed(this.sphere.indexes.length);  
  }
}

export default Mesh;
