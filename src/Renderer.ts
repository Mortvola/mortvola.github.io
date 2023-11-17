import { mat4, vec3, vec4, quat, Vec3, Vec4, setDefaultType } from 'wgpu-matrix';
import { bindGroups } from "./BindGroups";
import { gpu } from "./Gpu";
import { degToRad, intersectionPlane, normalizeDegrees } from "./Math";
import Mesh from "./Drawables/Mesh";
import Models from './Models';
import CartesianAxes from './CartesianAxes';
import { uvSphere } from './Drawables/uvsphere';
import { box } from './Drawables/box';
import { tetrahedron } from './Drawables/tetrahedron';
import SelectionList from './SelectionList';
import DragHandlesPass from './DragHandlesPass';
import RenderPass from './RenderPass';
import DragHandle from './Drawables/DragHandle';

export type ObjectTypes = 'UVSphere' | 'Box' | 'Tetrahedron';

const requestPostAnimationFrame = (task: (timestamp: number) => void) => {
  requestAnimationFrame((timestamp: number) => {
    setTimeout(() => {
      task(timestamp);
    }, 0);
  });
};

setDefaultType(Float32Array);

type HitTestInfo = {
  point : Vec4,
  mesh: Mesh,
  translate: Vec4,
}

type DragInfo = {
  point: Vec4,
  objects: {
    mesh: Mesh,
    translate: Vec4
  }[],
}

class Renderer {
  initialized = false;

  render = true

  previousTimestamp: number | null = null;

  startFpsTime: number | null = null;

  framesRendered = 0;

  onFpsChange?: (fps: number) => void;

  onLoadChange?: (percentComplete: number) => void;

  context: GPUCanvasContext | null = null;

  document = new Models();

  near = 0.125;
  
  far = 2000;

  cameraPosition = vec4.create(0, 0, 25, 1);

  rotateX = 330;

  rotateY = 45;

  clipTransform = mat4.identity();

  viewTransform = mat4.identity();

  hitTestInfo: HitTestInfo | null = null;

  dragInfo: DragInfo | null = null;

  depthTextureView: GPUTextureView | null = null;

  renderedDimensions: [number, number] = [0, 0];

  selected = new SelectionList();

  mainRenderPass = new RenderPass();

  dragHandlesPass = new DragHandlesPass();

  dragHandle: DragHandle | null = null;

  async setCanvas(canvas: HTMLCanvasElement) {
    await gpu.ready

    if (!gpu.device) {
      throw new Error('Could not acquire device');
    }

    if (this.context) {
      this.context.unconfigure();
    }

    this.context = canvas.getContext("webgpu");
    
    if (!this.context) {
      throw new Error('context is null');
    }

    this.context.configure({
      device: gpu.device,
      format: navigator.gpu.getPreferredCanvasFormat(),
      alphaMode: "opaque",
    });
    
    if (!this.initialized) {
      this.mainRenderPass.addDrawable(new CartesianAxes('line'));

      this.dragHandle = await DragHandle.make(0.02, 'billboard');
      this.dragHandlesPass.addDrawable(this.dragHandle)

      this.document.meshes = [];
    }

    this.computeViewTransform();

    this.start();

    this.initialized = true;
  }
  
  addObject(type: ObjectTypes) {
    let mesh: Mesh;
    switch (type) {
      case 'Box':
        mesh = new Mesh(box(8, 8), 'pipeline');
        break;
      case 'UVSphere':
        mesh = new Mesh(uvSphere(8, 8), 'pipeline');
        break;
      case 'Tetrahedron':
        mesh = new Mesh(tetrahedron(), 'pipeline');
        break;
      default:
        throw new Error('invalid type')
    }
    
    this.document.meshes.push(mesh);

    this.mainRenderPass.addDrawable(mesh);
  }

  computeViewTransform() {
    const cameraQuat = quat.fromEuler(degToRad(this.rotateX), degToRad(this.rotateY), 0, "yxz");
    const t = mat4.fromQuat(cameraQuat);
    this.viewTransform = mat4.translate(t, this.cameraPosition)
  }

  changeCameraPos(deltaX: number, deltaY: number) {
    this.cameraPosition[0] += deltaX;
    this.cameraPosition[2] += deltaY;

    this.computeViewTransform();
  }

  changeCameraRotation(deltaX: number, deltaY: number) {
    this.rotateX = normalizeDegrees(this.rotateX + deltaY);

    if (this.rotateX > 90 && this.rotateX < 270) {
      this.rotateY = normalizeDegrees(this.rotateY - deltaX);
    }
    else {
      this.rotateY = normalizeDegrees(this.rotateY + deltaX);
    }

    this.computeViewTransform();
  }

  draw = (timestamp: number) => {
    if (this.render) {
      if (timestamp !== this.previousTimestamp) {
        if (this.startFpsTime === null) {
          this.startFpsTime = timestamp;
        }

        // Update the fps display every second.
        const fpsElapsedTime = timestamp - this.startFpsTime;

        if (fpsElapsedTime > 1000) {
          const fps = this.framesRendered / (fpsElapsedTime * 0.001);
          this.onFpsChange && this.onFpsChange(fps);
          this.framesRendered = 0;
          this.startFpsTime = timestamp;
        }

        // Move the camera using the set velocity.
        if (this.previousTimestamp !== null) {
          // const elapsedTime = (timestamp - this.previousTimestamp) * 0.001;

          // this.updateTimeOfDay(elapsedTime);
          // this.updateCameraPosition(elapsedTime);

          // if (this.fadePhoto && this.photoAlpha > 0) {
          //   if (this.fadeSTartTime === null) {
          //     this.fadeSTartTime = timestamp;
          //   }
          //   else {
          //     const eTime = (timestamp - this.fadeSTartTime) * 0.001;
          //     this.photoAlpha = 1 - eTime / this.photoFadeDuration;
          //     if (this.photoAlpha < 0) {
          //       this.photoAlpha = 0;
          //       this.fadePhoto = false;
          //     }
          //   }
          // }
        }

        this.previousTimestamp = timestamp;

        this.drawScene();

        this.framesRendered += 1;
      }

      requestPostAnimationFrame(this.draw);
    }
  };

  started = false;

  start(): void {
    if (!this.started) {
      this.started = true;
      requestPostAnimationFrame(this.draw);
    }
  }

  stop(): void {
    this.render = false;
  }

  drawScene() {
    if (!gpu.device) {
      throw new Error('device is not set')
    }

    if (!this.context) {
      throw new Error('context is null');
    }

    if (!bindGroups.camera) {
      throw new Error('uniformBuffer is not set');
    }

    if (this.context.canvas.width !== this.renderedDimensions[0]
      || this.context.canvas.height !== this.renderedDimensions[1]
    ) {
        const depthTexture = gpu.device!.createTexture({
          size: {width: this.context.canvas.width, height: this.context.canvas.height},
          format: "depth24plus",
          usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });
        this.depthTextureView = depthTexture.createView();

        const aspect = this.context.canvas.width / this.context.canvas.height;

        this.clipTransform = mat4.perspective(
            degToRad(45), // settings.fieldOfView,
            aspect,
            this.near,  // zNear
            this.far,   // zFar
        );
    
        this.renderedDimensions = [this.context.canvas.width, this.context.canvas.height]
    }

    const view = this.context.getCurrentTexture().createView();

    gpu.device.queue.writeBuffer(bindGroups.camera.uniformBuffer[0].buffer, 0, this.clipTransform as Float32Array);
    gpu.device.queue.writeBuffer(bindGroups.camera.uniformBuffer[1].buffer, 0, mat4.inverse(this.viewTransform)  as Float32Array);

    const commandEncoder = gpu.device.createCommandEncoder();

    this.mainRenderPass.render(view, this.depthTextureView!, commandEncoder)

    if (this.selected.selection.length > 0) {
      // Trnslate the drag handle to the centroid of the selectd items.
      this.dragHandle!.translate = this.selected.getCentroid();

      // Compute scaling so that the drag handle remains the same size no matter
      // how far away it is.
      // const transform = mat4.multiply(mat4.inverse(this.viewTransform), this.dragHandle!.getTransform())
      // const scale = Math.abs(transform[14]); // This is the amount the point is translated from the camera space origin
      // this.dragHandle!.scale = vec3.create(scale, scale, scale);

      this.dragHandlesPass.render(view, null, commandEncoder);
    }
  
    gpu.device.queue.submit([commandEncoder.finish()]);  
  }

  ndcToCameraSpace(x: number, y: number) {
    const inverseMatrix = mat4.inverse(this.clipTransform);

    // Transform point from NDC to camera space.
    let point = vec4.create(x, y, 0, 1);
    point = vec4.transformMat4(point, inverseMatrix);
    point = vec4.divScalar(point, point[3])

    return point;
  }

  // Returns ray and origin in world space coordinates.
  computeHitTestRay(x: number, y: number): { ray: Vec4, origin: Vec4 } {
    let point = this.ndcToCameraSpace(x, y);
  
    // Transform point and camera to world space.
    point = vec4.transformMat4(point, this.viewTransform)
    const origin = vec4.transformMat4(vec4.create(0, 0, 0, 1), this.viewTransform);

    // Compute ray from camera through point
    let ray = vec4.subtract(point, origin);
    ray[3] = 0;
    ray = vec4.normalize(ray);

    return ({
      ray,
      origin,
    })
  }

  hitTest(x: number, y: number): { point: Vec4, mesh: Mesh} | null {
    if (this.selected.selection.length > 0) {
      // Check for hit test of drag handle in screen space
      const p = this.ndcToCameraSpace(x, y);
      p[3] = 0; // Convert p to a vector

      const point = this.dragHandle?.hitTest(p, this.viewTransform);

      if (point) {
        this.dragInfo = {
          point,
          objects: this.selected.selection.map((object) => ({
            mesh: object.mesh,
            translate: object.mesh.translate,
          }))
        }

        return null;
      }
    }

    // Check for hits against the other objects
    const { ray, origin } = this.computeHitTestRay(x, y);
    let best: {
      mesh: Mesh,
      t: number,
      point: Vec3
    } | null = null;
  
    for (let mesh of this.document.meshes) {
      const result = mesh.hitTest(origin, ray);

      if (result) {
        if (best === null || result.t < best.t) {
          best = {
            mesh: result.mesh,
            t: result.t,
            point: result.point,
          }
        }
      }
    }

    if (best) {
      return {
        point: best.point,
        mesh: best.mesh,
      }
    }

    return null;
  }

  dragObject(x: number, y: number) {
    if (this.dragInfo) {
      const { ray, origin } = this.computeHitTestRay(x, y);

      // Transform plane normal to world space
      let planeNormal = vec4.create(0, 0, 1, 0);
      planeNormal = vec4.transformMat4(planeNormal, this.viewTransform)

      const intersection = intersectionPlane(this.dragInfo.point, planeNormal, origin, ray);

      if (intersection) {
        let moveVector = vec4.subtract(intersection, this.dragInfo.point);

        this.dragInfo.objects.forEach((object) => {
          // Transform move vector from world to model space
          moveVector = vec4.transformMat4(moveVector, mat4.inverse(object.mesh.getTransform()))

          // Add the move vector to the original translation for the object.
          const newTranslation = vec4.add(object.translate, moveVector);
          object.mesh.translate = vec3.create(newTranslation[0], newTranslation[1], newTranslation[2]);  
        })
      }
    }
  }

  pointerDown(x: number, y: number) {
    const result = this.hitTest(x, y);

    if (result) {
      this.hitTestInfo = {
        point: result.point,
        mesh: result.mesh,
        translate: result.mesh.translate,
      }
    }
  }

  pointerMove(x: number, y: number) {
    if (this.dragInfo) {
      this.dragObject(x, y);
    }
  }

  pointerUp(x: number, y: number) {
    if (this.dragInfo) {
      this.dragObject(x, y);
      this.dragInfo = null;
    }
    else if (this.hitTestInfo) {
      // Use the hit test again to see if the pointer
      // is still over the previously hit object. If it is,
      // then add the object to the selected list.
      const result = this.hitTest(x, y);

      if (result && result.mesh === this.hitTestInfo.mesh) {
        this.selected.clear();
        this.selected.addItem(result.mesh)
      }
    }
    else {
      this.selected.clear()
    }

    this.hitTestInfo = null;
  }
}

export default Renderer;
