import { mat4, vec3, Vec3 } from 'wgpu-matrix';
import DrawableInterface from "./DrawableInterface";

class Drawable implements DrawableInterface {
  transform = mat4.identity();

  translate = vec3.create(0, 0, 0);

  rotate = vec3.create(0, 0, 0);

  scale = vec3.create(1, 1, 1);

  getTransform() {
    this.transform = mat4.identity();

    mat4.translate(this.transform, this.translate, this.transform);
    mat4.rotateX(this.transform, this.rotate[0], this.transform);
    mat4.rotateY(this.transform, this.rotate[1], this.transform);
    mat4.rotateZ(this.transform, this.rotate[2], this.transform);
    mat4.scale(this.transform, this.scale, this.transform);

    return this.transform;
  }

  setTranslation(translate: Vec3) {
    this.translate = translate;
  }

  render(passEncoder: GPURenderPassEncoder): void {
    throw new Error('render not implemented')
  }
}

export default Drawable;
