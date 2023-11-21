import {
  mat4, vec3, vec4, quat, Vec3, Vec4, Mat4, setDefaultType,
} from 'wgpu-matrix';
import { runInAction } from 'mobx';
import { bindGroups } from "./BindGroups";
import { gpu } from "./Gpu";
import { closestPointBetweenRays, degToRad, intersectionPlane, normalizeDegrees } from "./Math";
import Mesh from "./Drawables/Mesh";
import Models from './Models';
import CartesianAxes from './CartesianAxes';
import { uvSphere } from './Drawables/uvsphere';
import { box } from './Drawables/box';
import { tetrahedron } from './Drawables/tetrahedron';
import SelectionList from './SelectionList';
import DragHandlesPass from './DragHandlesPass';
import RenderPass from './RenderPass';
import CameraPlaneDragHandle from './Drawables/CameraPlaneDragHandle';
import { plane } from './Drawables/plane';
import Drawable from './Drawables/Drawable';
import { cylinder } from './Drawables/cylinder';

export type ObjectTypes = 'UVSphere' | 'Box' | 'Tetrahedron' | 'Cylinder';

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
  mesh: Drawable,
  translate: Vec4,
}

type DragInfo = {
  point: Vec4,
  planeNormal: Vec4 | null,
  vector: Vec4 | null,
  objects: {
    drawable: Drawable,
    translate: Vec4
  }[],
}

export type ProjectionType = 'Perspective' | 'Orthographic';

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

  projection: ProjectionType = 'Perspective';

  perspectiveTransform = mat4.identity();

  orthographicTransform = mat4.identity();

  viewTransform = mat4.identity();

  hitTestInfo: HitTestInfo | null = null;

  dragInfo: DragInfo | null = null;

  depthTextureView: GPUTextureView | null = null;

  renderedDimensions: [number, number] = [0, 0];

  selected = new SelectionList();

  mainRenderPass = new RenderPass();

  dragHandlesPass = new DragHandlesPass();

  cameraPlaneDragHandle: CameraPlaneDragHandle;

  dragModel: Drawable[] = [];

  onSelectCallback: ((drawable: Drawable | null) => void) | null = null;

  constructor(cameraPlaneDragHandle: CameraPlaneDragHandle) {
    this.mainRenderPass.addDrawable(new CartesianAxes('line'));

    const xAxisPlaneDragHandle = new Mesh(plane(1, 1, vec3.create(1, 0, 0)), 'drag-handles');
    xAxisPlaneDragHandle.translate = vec3.create(2, 2, 0);
    xAxisPlaneDragHandle.tag ='drag-x-axis-plane';

    const xAxisDragHandle = new Mesh(cylinder(8, 0.125, vec3.create(1, 0, 0)), 'drag-handles');
    xAxisDragHandle.rotate = vec3.create(0, 0, degToRad(270));
    xAxisDragHandle.translate = vec3.create(1, 0, 0);
    xAxisDragHandle.tag = 'drag-x-axis';

    const yAxisPlaneDragHandle = new Mesh(plane(1, 1, vec3.create(0, 0, 1)), 'drag-handles');
    yAxisPlaneDragHandle.rotate = vec3.create(degToRad(270), 0, 0);
    yAxisPlaneDragHandle.translate = vec3.create(2, 0, 2);
    yAxisPlaneDragHandle.tag = 'drag-y-axis-plane';

    const yAxisDragHandle = new Mesh(cylinder(8, 0.125, vec3.create(0, 0, 1)), 'drag-handles');
    yAxisDragHandle.translate = vec3.create(0, 1, 0);
    yAxisDragHandle.tag = 'drag-y-axis';

    const zAxisPlaneDragHandle = new Mesh(plane(1, 1, vec3.create(0, 1, 0)), 'drag-handles');
    zAxisPlaneDragHandle.rotate = vec3.create(0, degToRad(90), 0);
    zAxisPlaneDragHandle.translate = vec3.create(0, 2, 2);
    zAxisPlaneDragHandle.tag = 'drag-z-axis-plane';

    const zAxisDragHandle = new Mesh(cylinder(8, 0.125, vec3.create(0, 1, 0)), 'drag-handles');
    zAxisDragHandle.rotate = vec3.create(degToRad(270), 0, 0);
    zAxisDragHandle.translate = vec3.create(0, 0, 1);
    zAxisDragHandle.tag = 'drag-z-axis';

    this.cameraPlaneDragHandle = cameraPlaneDragHandle;
    this.cameraPlaneDragHandle.tag = 'drag-camera-plane';

    this.dragModel.push(xAxisPlaneDragHandle)
    this.dragModel.push(xAxisDragHandle);
    this.dragModel.push(yAxisPlaneDragHandle)
    this.dragModel.push(yAxisDragHandle);
    this.dragModel.push(zAxisPlaneDragHandle)
    this.dragModel.push(zAxisDragHandle);
    this.dragModel.push(cameraPlaneDragHandle);

    this.dragHandlesPass.addDrawables(this.dragModel);

    this.document.meshes = [];
  }

  static async create() {
    await gpu.ready

    const cameraPlaneDragHandle = await CameraPlaneDragHandle.make(0.02, 'billboard');

    return new Renderer(cameraPlaneDragHandle)
  }
  
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
    
    this.computeViewTransform();

    this.start();

    this.initialized = true;
  }

  onSelect(callback: (drawable: Drawable | null) => void) {
    this.onSelectCallback = callback;
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
      case 'Cylinder':
        mesh = new Mesh(cylinder(8), 'pipeline');
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

    this.document.meshes.forEach((mesh) => {
      mesh.computeTransform()
    })

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

        this.perspectiveTransform = mat4.perspective(
            degToRad(45), // settings.fieldOfView,
            aspect,
            this.near,  // zNear
            this.far,   // zFar
        );

        this.orthographicTransform = mat4.ortho(
          -this.context.canvas.width / 80,
          this.context.canvas.width / 80,
          -this.context.canvas.height / 80,
          this.context.canvas.height/ 80,
          // this.near, this.far,
          -200, 200,
        );
    
        this.renderedDimensions = [this.context.canvas.width, this.context.canvas.height]
    }

    const view = this.context.getCurrentTexture().createView();

    if (this.projection === 'Perspective') {
      gpu.device.queue.writeBuffer(bindGroups.camera.uniformBuffer[0].buffer, 0, this.perspectiveTransform as Float32Array);      
    }
    else {
      gpu.device.queue.writeBuffer(bindGroups.camera.uniformBuffer[0].buffer, 0, this.orthographicTransform as Float32Array);      
    }

    gpu.device.queue.writeBuffer(bindGroups.camera.uniformBuffer[1].buffer, 0, mat4.inverse(this.viewTransform)  as Float32Array);

    const commandEncoder = gpu.device.createCommandEncoder();

    this.mainRenderPass.render(view, this.depthTextureView!, commandEncoder)

    if (this.selected.selection.length > 0) {
      // Transform camera position to world space.
      const origin = vec4.transformMat4(vec4.create(0, 0, 0, 1), this.viewTransform);
      const centroid = this.selected.getCentroid();

      // We want to make the drag handles appear to be the same distance away 
      // from the camera no matter how far the centroid is from the camera.
      const apparentDistance = 25;
      let actualDistance = vec3.distance(origin, centroid);
      const scale = actualDistance / apparentDistance;

      const mat = mat4.translate(mat4.identity(), centroid);
      mat4.scale(mat, vec3.create(scale, scale, scale), mat)

      this.dragModel.forEach((drawable) => {
        drawable.computeTransform(mat);
      })

      this.dragHandlesPass.render(view, this.depthTextureView!, commandEncoder);
    }
  
    gpu.device.queue.submit([commandEncoder.finish()]);  
  }

  ndcToCameraSpace(x: number, y: number) {
    let inverseMatrix: Mat4;
    if (this.projection === 'Perspective') {
      inverseMatrix = mat4.inverse(this.perspectiveTransform);
    }
    else {
      inverseMatrix = mat4.inverse(this.orthographicTransform);
    }

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

  hitTest(x: number, y: number): { point: Vec4, mesh: Drawable} | null {
    if (this.selected.selection.length > 0) {
      // Check for hit test of drag handle in screen space
      const p = this.ndcToCameraSpace(x, y);
      p[3] = 0; // Convert p to a vector

      const point = this.cameraPlaneDragHandle?.hitTest(p, this.viewTransform);

      if (point) {
        const { ray, origin } = this.computeHitTestRay(x, y);
        const planeNormal = vec4.transformMat4(vec4.create(0, 0, 1, 0), this.viewTransform);
        const intersection = intersectionPlane(this.selected.getCentroid(), planeNormal, origin, ray);

        this.dragInfo = {
          point: intersection!,
          planeNormal,
          vector: null,
          objects: this.selected.selection.map((object) => ({
            drawable: object.drawable,
            translate: object.drawable.translate,
          }))
        }

        return null;
      }

      const { ray, origin } = this.computeHitTestRay(x, y);
      let best: {
        drawable: Drawable,
        t: number,
        point: Vec3
      } | null = null;

      for (let drawable of this.dragModel) {
        if (drawable.tag !== 'drag-camera-plane' && drawable.tag !== '') {
          const result = drawable.hitTest(origin, ray)
    
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
      }

      if (best !== null) {
        let planeNormal: Vec4 | null = null;
        let vector: Vec4 | null = null;

        switch (best.drawable.tag) {
          case 'drag-x-axis-plane':
            planeNormal = vec4.create(0, 0, 1, 0);
            break;

          case 'drag-x-axis':
            vector = vec4.create(1, 0, 0, 0);
            break;

          case 'drag-y-axis-plane':
            planeNormal = vec4.create(0, 1, 0, 0);
            break;

          case 'drag-y-axis':
            vector = vec4.create(0, 1, 0, 0);
            break;

          case 'drag-z-axis-plane':
            planeNormal = vec4.create(1, 0, 0, 0);
            break;

          case 'drag-z-axis':
            vector = vec4.create(0, 0, 1, 0);
            break;
        }

        if (planeNormal || vector) {
          this.dragInfo = {
            point: best.point,
            planeNormal,
            vector,
            objects: this.selected.selection.map((object) => ({
              drawable: object.drawable,
              translate: object.drawable.translate,
            }))
          }  

          return null;
        }
      }
    }

    // Check for hits against the other objects
    const { ray, origin } = this.computeHitTestRay(x, y);
    let best: {
      drawable: Drawable,
      t: number,
      point: Vec3
    } | null = null;
  
    for (let mesh of this.document.meshes) {
      const result = mesh.hitTest(origin, ray);

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

    if (best) {
      return {
        point: best.point,
        mesh: best.drawable,
      }
    }

    return null;
  }

  dragObject(x: number, y: number) {
    if (this.dragInfo) {
      const { ray, origin } = this.computeHitTestRay(x, y);

      let intersection: Vec4 | null = null;

      if (this.dragInfo.planeNormal) {
        intersection = intersectionPlane(this.dragInfo.point, this.dragInfo.planeNormal, origin, ray);
      }
      else if (this.dragInfo.vector) {
        const { p1 } = closestPointBetweenRays(this.dragInfo.point, this.dragInfo.vector, origin, ray);
        intersection = p1;
      }

      if (intersection) {
        let moveVector = vec4.subtract(intersection, this.dragInfo.point);
        this.dragInfo.objects.forEach((object) => {
          // Add the move vector to the original translation for the object.
          runInAction(() => {
            object.drawable.translate = vec3.add(object.translate, moveVector);
          })
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

        if (this.onSelectCallback) {
          this.onSelectCallback(result.mesh);
        }
      }
    }
    else {
      this.selected.clear()

      if (this.onSelectCallback) {
        this.onSelectCallback(null);
      }
    }

    this.hitTestInfo = null;
  }
}

export default Renderer;
