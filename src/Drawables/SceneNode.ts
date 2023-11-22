import { mat4, vec3, Mat4 } from 'wgpu-matrix';
import SceneNodeInterface from './SceneNodeInterface';

class SceneNode implements SceneNodeInterface {
  transform = mat4.identity();

  translate = vec3.create(0, 0, 0);

  rotate = vec3.create(0, 0, 0);

  scale = vec3.create(1, 1, 1);

  getTransform(): Mat4 {
    return this.transform
  }

  computeTransform(transform?: Mat4, prepend = true): Mat4 {
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
}

export default SceneNode;
