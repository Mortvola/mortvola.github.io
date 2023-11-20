import { makeObservable, observable, runInAction } from 'mobx';
import { mat4, vec3, Mat4 } from 'wgpu-matrix';
import DrawableInterface from "./DrawableInterface";
import PipelineInterface from '../Pipelines/PipelineInterface';
import PipelineManager, { PipelineTypes } from '../Pipelines/PipelineManager';

class Drawable implements DrawableInterface {
  pipeline: PipelineInterface;

  transform = mat4.identity();

  translate = vec3.create(0, 0, 0);

  rotate = vec3.create(0, 0, 0);

  scale = vec3.create(1, 1, 1);

  constructor(pipelineType: PipelineTypes) {
    const pipeline = PipelineManager.getInstance().getPipeline(pipelineType);

    if (!pipeline) {
      throw new Error(`pipeline ${pipelineType} not found`)
    }
    
    this.pipeline = pipeline;

    makeObservable(this, {
      translate: observable,
      rotate: observable,
      scale: observable,
    })
  }

  computeTransform(transform?: Mat4, prepend = true) {
    this.transform = mat4.identity();

    if (prepend && transform) {
      this.transform = mat4.copy(transform);
    }

    mat4.translate(this.transform, this.translate, this.transform);
    mat4.rotateX(this.transform, this.rotate[0], this.transform);
    mat4.rotateY(this.transform, this.rotate[1], this.transform);
    mat4.rotateZ(this.transform, this.rotate[2], this.transform);
    mat4.scale(this.transform, this.scale, this.transform);

    if (!prepend && transform) {
      mat4.multiply(this.transform, transform, this.transform);
    }

    return this.transform;
  }

  getTransform() {
    return this.transform
  }

  render(passEncoder: GPURenderPassEncoder): void {
    throw new Error('render not implemented')
  }
}

export default Drawable;
