import { gpu } from "./Gpu";
import DrawableInterface from "./Pipelines/DrawableInterface";

class CartesianAxes implements DrawableInterface {
  vertexBuffer: GPUBuffer;

  vertices = [
    -2000, 0, 0, 1,
    1, 0, 0, 1,
    
    2000, 0, 0, 1,
    1, 0, 0, 1,

    0, 0, -2000, 1,
    0, 1, 0, 1,
    
    0, 0, 2000, 1,
    0, 1, 0, 1,    
  ];

  constructor() {
    if (!gpu.device) {
      throw new Error('gepu device not set')
    }
  
    const gridLineColor = [0.3, 0.3, 0.3, 1];

    // x grid lines
    for (let i = 1; i <= 2000; i += 1) {
      this.vertices = this.vertices.concat([
        2000, 0, i, 1,
        ...gridLineColor,

        -2000, 0, i, 1,
        ...gridLineColor,

        2000, 0, -i, 1,
        ...gridLineColor,

        -2000, 0, -i, 1,
        ...gridLineColor,
      ])
    }

    // z grid lines
    for (let i = 1; i <= 2000; i += 1) {
      this.vertices = this.vertices.concat([
        i, 0, 2000, 1,
        ...gridLineColor,

        i, 0, -2000, 1,
        ...gridLineColor,

        -i, 0, 2000, 1,
        ...gridLineColor,

        -i, 0, -2000, 1,
        ...gridLineColor,
      ])
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
    passEncoder.draw(this.vertices.length / 8);  
  }
}

export default CartesianAxes;
