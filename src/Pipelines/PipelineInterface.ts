import DrawableInterface from "../Drawables/DrawableInterface";

interface PipelineInterface {
  getBindGroupLayouts(): GPUBindGroupLayout[];

  render(passEncoder: GPURenderPassEncoder, drawables: DrawableInterface[]): void;
}

export default PipelineInterface;
