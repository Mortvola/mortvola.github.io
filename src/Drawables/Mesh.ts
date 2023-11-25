import { mat4, vec4, Vec4 } from 'wgpu-matrix';
import { gpu } from "../Renderer";
import SurfaceMesh from "./SurfaceMesh";
import Drawable from './Drawable';
import { PipelineTypes } from '../Pipelines/PipelineManager';

class Mesh extends Drawable {
  mesh: SurfaceMesh;

  color = new Float32Array(4);

  vertexBuffer: GPUBuffer;

  indexBuffer: GPUBuffer;

  bindGroup: GPUBindGroup;

  colorBuffer: GPUBuffer;

  uniformBuffer: GPUBuffer;

  constructor(mesh: SurfaceMesh, pipelineType: PipelineTypes) {
    super(pipelineType)
  
    if (!gpu) {
      throw new Error('device is not set')
    }

    this.mesh = mesh;
    this.setColor(mesh.color);

    this.vertexBuffer = gpu.device.createBuffer({
      size: this.mesh.vertices.length * Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    });  

    {
      const mapping = new Float32Array(this.vertexBuffer.getMappedRange());
      mapping.set(this.mesh.vertices, 0);
      this.vertexBuffer.unmap();  
    }
  
    this.indexBuffer = gpu.device.createBuffer({
      size: (this.mesh.indexes.length * Uint16Array.BYTES_PER_ELEMENT + 3) & ~3, // Make sure it is a multiple of four
      usage: GPUBufferUsage.INDEX,
      mappedAtCreation: true,
    })

    {
      const mapping = new Uint16Array(this.indexBuffer.getMappedRange());
      mapping.set(this.mesh.indexes, 0);
      this.indexBuffer.unmap();  
    }

    const bindGroupLayouts = this.pipeline.getBindGroupLayouts();

    this.uniformBuffer = gpu.device.createBuffer({
      label: 'model Matrix',
      size: 16 * Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.colorBuffer = gpu.device.createBuffer({
      label: 'color',
      size: 4 * Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.bindGroup = gpu.device.createBindGroup({
      label: 'bind group for model matrix',
      layout: bindGroupLayouts[0],
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer }},
        { binding: 1, resource: { buffer: this.colorBuffer }},
      ],
    });
  }

  setColor(color: Vec4) {
    this.color[0] = color[0];
    this.color[1] = color[1];
    this.color[2] = color[2];
    this.color[3] = color[3];
  }

  getColor(): Float32Array {
    return this.color;
  }

  render(passEncoder: GPURenderPassEncoder) {
    if (!gpu) {
      throw new Error('gpu devcie not set.')
    }

    gpu.device.queue.writeBuffer(this.uniformBuffer, 0, this.getTransform() as Float32Array);
    gpu.device.queue.writeBuffer(this.colorBuffer, 0, this.color);

    passEncoder.setBindGroup(1, this.bindGroup);

    passEncoder.setVertexBuffer(0, this.vertexBuffer);
    passEncoder.setIndexBuffer(this.indexBuffer, "uint16");
    passEncoder.drawIndexed(this.mesh.indexes.length);  
  }

  hitTest(origin: Vec4, vector: Vec4): { point: Vec4, t: number, drawable: Drawable} | null {
    const inverseTransform = mat4.inverse(this.getTransform());

    const localVector = vec4.transformMat4(vector, inverseTransform);
    const localOrigin = vec4.transformMat4(origin, inverseTransform);

    const result = this.mesh.hitTest(localOrigin, localVector);

    if (result) {
      // Convert the intersection point into world coordinates.
      const point = vec4.transformMat4(result.point, this.getTransform());

      return { point, t: result.t, drawable: this };      
    }

    return null;
  }

  computeCentroid(): Vec4 {
    return this.mesh.computeCentroid()
  }
}

export default Mesh;
