import { Vec4, vec4 } from 'wgpu-matrix';
import { PipelineTypes } from "../Pipelines/PipelineManager";
import Drawable from "./Drawable";
import { gpu } from '../Gpu';

class Ray extends Drawable {
  vertices: number[];

  vertexBuffer: GPUBuffer;

  constructor(origin: Vec4, ray: Vec4, pipelineType: PipelineTypes, color = vec4.create(1, 0, 0, 1)) {
    super(pipelineType);
  
    const p1 = vec4.add(origin, vec4.mulScalar(ray, -10));
    const p2 = vec4.add(origin, vec4.mulScalar(ray, 10));
    this.vertices = [
      p1[0], p1[1], p1[2], p1[3], color[0], color[1], color[2], color[3],
      p2[0], p2[1], p2[2], p2[3], color[0], color[1], color[2], color[3],
    ]

    this.vertexBuffer = gpu.device!.createBuffer({
      size: this.vertices.length * Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    });  
    {
      const mapping = new Float32Array(this.vertexBuffer.getMappedRange());
      mapping.set(this.vertices, 0);
      this.vertexBuffer.unmap();  
    }
  }

  render(passEncoder: GPURenderPassEncoder) {
    passEncoder.setVertexBuffer(0, this.vertexBuffer);
    passEncoder.draw(this.vertices.length / 8);  
  }
}

export default Ray;
