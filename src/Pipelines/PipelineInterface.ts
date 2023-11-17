import DrawableInterface from "../Drawables/DrawableInterface";

interface PipelineInterface {
  // drawables: DrawableInterface[];

  render(passEncoder: GPURenderPassEncoder, drawables: DrawableInterface[]): void;
}

export default PipelineInterface;
