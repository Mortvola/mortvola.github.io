import { Mat4 } from 'wgpu-matrix';

interface SceneNodeInterface {
  computeTransform(transform?: Mat4, prepend?: boolean): void;
}

export default SceneNodeInterface;
