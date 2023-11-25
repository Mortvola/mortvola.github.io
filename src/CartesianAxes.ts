import { Vec4 } from 'wgpu-matrix';
import { gpu } from "./Renderer";
import DrawableInterface from "./Drawables/DrawableInterface";
import PipelineManager, { PipelineTypes } from "./Pipelines/PipelineManager";
import PipelineInterface from "./Pipelines/PipelineInterface";
import SceneNode from "./Drawables/SceneNode";

class CartesianAxes extends SceneNode implements DrawableInterface {
  vertexBuffer: GPUBuffer;

  pipeline: PipelineInterface;

  tag = '';

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

  constructor(pipelineType: PipelineTypes) {
    super();
    
    if (!gpu) {
      throw new Error('gepu device not set')
    }

    const pipeline = PipelineManager.getInstance().getPipeline(pipelineType);

    if (!pipeline) {
      throw new Error(`pipeline ${pipelineType} not found`)
    }
  
    this.pipeline = pipeline;

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

  hitTest(origin: Vec4, vector: Vec4): { point: Vec4, t: number, drawable: DrawableInterface} | null {
    return null;
  }

  computeCentroid(): Vec4 {
    throw new Error('not implemented')
  }

  setColor(color: Vec4) {
  }

  getColor(): Float32Array {
    throw new Error('not implemented');
  }
}

export default CartesianAxes;
