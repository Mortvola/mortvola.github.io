import { makeObservable, observable } from 'mobx';
import { vec4, Vec4 } from 'wgpu-matrix';
import DrawableInterface from "./DrawableInterface";
import PipelineInterface from '../Pipelines/PipelineInterface';
import PipelineManager, { PipelineTypes } from '../Pipelines/PipelineManager';
import SceneNode from './SceneNode';

class Drawable extends SceneNode implements DrawableInterface {
  pipeline: PipelineInterface;

  tag = '';

  constructor(pipelineType: PipelineTypes) {
    super();

    const pipeline = PipelineManager.getInstance().getPipeline(pipelineType);

    if (!pipeline) {
      throw new Error(`pipeline ${pipelineType} not found`)
    }
    
    this.pipeline = pipeline;

    makeObservable(this, {
      translate: observable,
      angles: observable,
      scale: observable,
    })
  }

  render(passEncoder: GPURenderPassEncoder): void {
    throw new Error('render not implemented')
  }

  setColor(color: Vec4) {
    throw new Error('not implemented');
  }

  getColor(): Float32Array {
    throw new Error('not implemented');
  }

  hitTest(origin: Vec4, vector: Vec4): { point: Vec4, t: number, drawable: Drawable} | null {
    return null;
  }

  computeCentroid(): Vec4 {
    return vec4.create();
  }
}

export default Drawable;
