import DrawableInterface from "./DrawableInterface";

interface PipelineInterface {
  drawables: DrawableInterface[];

  render(passEncoder: GPURenderPassEncoder): void;
}

export default PipelineInterface;
