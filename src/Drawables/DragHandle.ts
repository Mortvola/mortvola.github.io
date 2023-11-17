import { Vec4, vec4, Mat4, mat4, vec2 } from 'wgpu-matrix';
import Mesh from "./Mesh";
import { intersectionPlane } from '../Math';
import { point } from './pont';
import Drawable from './Drawable';

class DragHandle extends Drawable {
  radius: number;

  private mesh: Mesh

  constructor(radius: number) {
    super()

    this.mesh = new Mesh(point(radius))

    this.radius = radius;
  }

  render(passEncoder: GPURenderPassEncoder): void {
    this.mesh.translate = this.translate;
    this.mesh.rotate = this.rotate;
    this.mesh.scale = this.scale;
    
    this.mesh.render(passEncoder);
  }

  hitTest(p: Vec4, viewTransform: Mat4): Vec4 | null {
    // Transform point from model space to world space to camera space.
    let t = mat4.multiply(mat4.inverse(viewTransform), this.getTransform());

    let point = vec4.create(t[12], t[13], t[14], t[15])

    if (point[3] !== 1) {
      console.log(`point: ${point[3]}`)
    }

    const p2 = intersectionPlane(point, vec4.create(0, 0, 1, 0), vec4.create(0, 0, 0, 1), p);
  
    if (p2) {
      const d = vec2.distance(point, p2)

      if (d < Math.abs(this.radius * t[14])) {
        console.log('hit!')

        if (p2[3] !== 1) {
          console.log(`p2: ${p2[3]}`)
        }

        // p2[3] = 1;
        const wp = vec4.transformMat4(p2, viewTransform);

        // console.log(`p2: ${p2}`)
        // console.log(`wp: ${wp}`)

        return wp;
      }
    }

    return null;
  }
}

export default DragHandle;
