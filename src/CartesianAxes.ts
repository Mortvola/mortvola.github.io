import { gpu } from "./Gpu";
import DrawableInterface from "./Pipelines/DrawableInterface";

class CartesianAxes implements DrawableInterface {
  vertexBuffer: GPUBuffer;

  vertices = [
    -2000, 0, 0, 1,
    1, 0, 0, 1,
    
    2000, 0, 0, 1,
    1, 0, 0, 1,

    0, -2000, 0, 1,
    0, 1, 0, 1,
    
    0, 2000, 0, 1,
    0, 1, 0, 1,
    
    0, 0, -2000, 1,
    0, 0, 1, 1,
    
    0, 0, 2000, 1,
    0, 0, 1, 1,
  ];

  constructor() {
    if (!gpu.device) {
      throw new Error('gepu device not set')
    }
  
    this.vertexBuffer = gpu.device.createBuffer({
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
    passEncoder.draw(6);  
  }
}

export default CartesianAxes;
