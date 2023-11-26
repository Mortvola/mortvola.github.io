import { Vec4, Mat4 } from 'wgpu-matrix';
import DrawableInterface, { isDrawableInterface } from "./DrawableInterface";
import SceneNode from "./SceneNode";
import { makeObservable, observable, runInAction } from 'mobx';

export type HitTestResult = {
  drawable: DrawableInterface,
  t: number,
  point: Vec4,
}

class ContainerNode extends SceneNode {
  nodes: SceneNode[] = [];

  constructor() {
    super();

    makeObservable(this, {
      nodes: observable,
    })
  }

  addNode(node: SceneNode) {
    runInAction(() => {
      this.nodes.push(node);
    })
  }

  updateTransforms(mat: Mat4) {
    this.nodes.forEach((drawable) => {
      if (isDrawableInterface(drawable)) {
        drawable.computeTransform(mat);
      }
      else if (isContainerNode(drawable)) {
        const nodeMat = drawable.computeTransform(mat);
        drawable.updateTransforms(nodeMat);
      }
    })
  }

  modelHitTest(origin: Vec4, ray: Vec4, filter?: (node: DrawableInterface) => boolean): HitTestResult | null {
    let best: HitTestResult | null = null;

    for (let node of this.nodes) {
      let result;
      if (isDrawableInterface(node)) {
        if (!filter || filter(node)) {
          result = node.hitTest(origin, ray)    
        }
      }
      else if (isContainerNode(node)) {
        result = node.modelHitTest(origin, ray, filter);
      }

      if (result) {
        if (best === null || result.t < best.t) {
          best = {
            drawable: result.drawable,
            t: result.t,
            point: result.point,
          }
        }
      }  
    }

    return best;
  }
}

export const isContainerNode = (r: unknown): r is ContainerNode => (
  (r as ContainerNode).nodes !== undefined
)

export default ContainerNode;
