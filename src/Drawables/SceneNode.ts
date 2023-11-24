import { mat4, vec3, Mat4 } from 'wgpu-matrix';

class SceneNode {
  transform = mat4.identity();

  translate = vec3.create(0, 0, 0);

  rotate = vec3.create(0, 0, 0);

  scale = vec3.create(1, 1, 1);

  constructor() {
    this.computeTransform();
  }

  getTransform(): Mat4 {
    return this.transform
  }

  getRotation(): Mat4 {
    const transform = mat4.identity();

    mat4.rotateX(transform, this.rotate[0], transform);
    mat4.rotateY(transform, this.rotate[1], transform);
    mat4.rotateZ(transform, this.rotate[2], transform);

    return transform;
  }

  computeTransform(transform?: Mat4, prepend = true): Mat4 {
    this.transform = mat4.identity();

    if (prepend && transform) {
      this.transform = mat4.copy(transform);
    }

    mat4.translate(this.transform, this.translate, this.transform);
    mat4.multiply(this.transform, this.getRotation(), this.transform);
    mat4.scale(this.transform, this.scale, this.transform);

    if (!prepend && transform) {
      mat4.multiply(this.transform, transform, this.transform);
    }

    return this.transform;
  }
}

export default SceneNode;
