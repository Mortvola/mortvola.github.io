import PipelineInterface from "../Pipelines/PipelineInterface";

interface DrawableInterface {
  render(passEncoder: GPURenderPassEncoder): void;

  pipeline: PipelineInterface;
}

export default DrawableInterface;
