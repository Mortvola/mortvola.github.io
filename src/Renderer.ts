import {
  mat4, vec3, vec4, quat, Vec3, Vec4, Mat4, setDefaultType, Quat,
} from 'wgpu-matrix';
import { runInAction } from 'mobx';
import BindGroups, { lightsStructure } from "./BindGroups";
import Gpu from "./Gpu";
import {
  closestPointsBetweenRays, degToRad, getAngle,
  intersectionPlane, normalizeDegrees,
} from "./Math";
import Mesh from "./Drawables/Mesh";
import CartesianAxes from './CartesianAxes';
import { uvSphere } from './Drawables/shapes/uvsphere';
import { box } from './Drawables/shapes/box';
import { tetrahedron } from './Drawables/shapes/tetrahedron';
import SelectionList from './SelectionList';
import DragHandlesPass from './DragHandlesPass';
import RenderPass from './RenderPass';
import CameraPlaneDragHandle from './Drawables/CameraPlaneDragHandle';
import { plane } from './Drawables/shapes/plane';
import { cylinder } from './Drawables/shapes/cylinder';
import { cone } from './Drawables/shapes/cone';
import ContainerNode from './Drawables/ContainerNode';
import { torus } from './Drawables/shapes/torus';
import SceneNode, { rotationOrder } from './Drawables/SceneNode';
import DrawableInterface from './Drawables/DrawableInterface';
import Light, { isLight } from './Drawables/LIght';

export type ObjectTypes = 'UVSphere' | 'Box' | 'Tetrahedron' | 'Cylinder' | 'Cone';

export type SpaceOrientationType = 'Global' | 'Local';

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
  mesh: DrawableInterface,
  translate: Vec4,
}

type DragMode = 'Translate' | 'ScaleAll' | 'ScaleX' | 'ScaleY' | 'ScaleZ' | 'Rotate';

type DragInfo = {
  mode: DragMode,
  point: Vec4,
  planeNormal: Vec4 | null,
  up?: Vec4,
  rotation?: Vec4,
  axis?: 'x' | 'y' | 'z',
  vector: Vec4 | null,
  startingAngle: number,
  centroid: Vec4,
  initialDistance: number,
  objects: {
    drawable: SceneNode,
    translate: Vec3,
    scale: Vec3,
    qRotate: Quat,
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

  document = new ContainerNode();

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

  dragModel: ContainerNode;

  spaceOrientation: SpaceOrientationType = 'Global';

  onSelectCallback: ((drawable: DrawableInterface | null) => void) | null = null;

  private constructor(dragModel: ContainerNode, cameraPlaneDragHandle: CameraPlaneDragHandle) {
    this.mainRenderPass.addDrawable(new CartesianAxes('line'));

    this.cameraPlaneDragHandle = cameraPlaneDragHandle;
    this.dragModel = dragModel;

    this.dragHandlesPass.addDrawables(this.dragModel);

    const light = new Light();
    light.translate = vec3.create(-3, 3, -3);

    this.document.addNode(light);
  }

  static async createTransformer(cameraPlaneDragHandle: CameraPlaneDragHandle) {
    const planeHandleDimension = 0.75;

    const xColor = Renderer.getDragColor('drag-x');
    const yColor = Renderer.getDragColor('drag-y');
    const zColor = Renderer.getDragColor('drag-z');
    
    const xAxisPlaneDragHandle = await Mesh.create(plane(planeHandleDimension, planeHandleDimension, xColor), 'drag-handles');
    xAxisPlaneDragHandle.rotate(0, degToRad(90), 0);
    xAxisPlaneDragHandle.translate = vec3.create(0, 2, 2);
    xAxisPlaneDragHandle.tag = 'drag-x-axis-plane';

    const xAxis = await this.createAxis('x-axis', xColor);
    xAxis.rotate(0, 0, degToRad(270));

    const yAxisPlaneDragHandle = await Mesh.create(plane(planeHandleDimension, planeHandleDimension, yColor), 'drag-handles');
    yAxisPlaneDragHandle.rotate(degToRad(270), 0, 0);
    yAxisPlaneDragHandle.translate = vec3.create(2, 0, 2);
    yAxisPlaneDragHandle.tag = 'drag-y-axis-plane';

    const yAxis = await Renderer.createAxis('y-axis', yColor);

    const zAxisPlaneDragHandle = await Mesh.create(plane(planeHandleDimension, planeHandleDimension, zColor), 'drag-handles');
    zAxisPlaneDragHandle.translate = vec3.create(2, 2, 0);
    zAxisPlaneDragHandle.tag ='drag-z-axis-plane';

    const zAxis = await Renderer.createAxis('z-axis', zColor);
    zAxis.rotate(degToRad(90), 0, 0);

    const dragModel = new ContainerNode();

    dragModel.addNode(xAxisPlaneDragHandle)
    dragModel.addNode(yAxisPlaneDragHandle)
    dragModel.addNode(zAxisPlaneDragHandle)
    dragModel.addNode(xAxis);
    dragModel.addNode(yAxis);
    dragModel.addNode(zAxis);
    dragModel.addNode(cameraPlaneDragHandle);

    let t = await Mesh.create(torus(32, 8, 2, 0.125, xColor), 'pipeline');
    t.rotate(0, degToRad(90), 0);
    t.tag = 'drag-x-rotate';
    dragModel.addNode(t);

    t = await Mesh.create(torus(32, 8, 2, 0.125, zColor), 'pipeline');
    t.tag = 'drag-z-rotate';
    dragModel.addNode(t);

    t = await Mesh.create(torus(32, 8, 2, 0.125, yColor), 'pipeline');
    t.rotate(degToRad(90), 0, 0);
    t.tag = 'drag-y-rotate';
    dragModel.addNode(t);

    return dragModel;
  }

  static async createAxis(tag: string, color: Vec3): Promise<ContainerNode> {
    const node = new ContainerNode();

    const axisDragHandle = await Mesh.create(cylinder(8, 0.0625, 2.5, color), 'drag-handles');
    axisDragHandle.translate = vec3.create(0, 1.25, 0);
    axisDragHandle.tag = `drag-${tag}-scale`;

    const boxHandle = await Mesh.create(box(0.35, 0.35, 0.35, color), 'drag-handles');
    boxHandle.translate = vec3.create(0, 2.5, 0);
    boxHandle.tag = `drag-${tag}-scale`;

    const coneHandle = await Mesh.create(cone(8, 0.75, 0.20, color), 'drag-handles')
    coneHandle.translate = vec3.create(0, 3.5, 0);
    coneHandle.tag = `drag-${tag}`;

    node.addNode(axisDragHandle);
    node.addNode(boxHandle);
    node.addNode(coneHandle);

    return node;
  }

  static async create() {
    if (gpu) {
      const cameraPlaneDragHandle = await CameraPlaneDragHandle.make(0.02, 'billboard');
      cameraPlaneDragHandle.tag = 'drag-camera-plane';

      const transformer = await Renderer.createTransformer(cameraPlaneDragHandle);

      return new Renderer(transformer, cameraPlaneDragHandle)  
    }

    return null;
  }
  
  async setCanvas(canvas: HTMLCanvasElement) {
    if (!gpu) {
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

  onSelect(callback: (drawable: DrawableInterface | null) => void) {
    this.onSelectCallback = callback;
  }

  selectNode(node: SceneNode) {
    this.selected.clear();
    this.selected.addItem(node);
  }

  async addObject(type: ObjectTypes) {
    let mesh: Mesh;
    switch (type) {
      case 'Box':
        mesh = await Mesh.create(box(2, 2, 2), 'lit');
        mesh.name = 'Box';
        break;
      case 'UVSphere':
        mesh = await Mesh.create(uvSphere(8, 8), 'lit');
        mesh.name = 'UV Sphere';
        break;
      case 'Tetrahedron':
        mesh = await Mesh.create(tetrahedron(), 'lit');
        mesh.name = 'Tetrahedron';
        break;
      case 'Cylinder':
        mesh = await Mesh.create(cylinder(8), 'lit');
        mesh.name = 'Cylinder';
        break;
      case 'Cone':
        mesh = await Mesh.create(cone(8), 'lit');
        mesh.name = 'Cone';
        break;
      default:
        throw new Error('invalid type')
    }
    
    this.document.addNode(mesh);

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
    if (!gpu) {
      throw new Error('device is not set')
    }

    if (!this.context) {
      throw new Error('context is null');
    }

    if (!bindGroups.camera) {
      throw new Error('uniformBuffer is not set');
    }

    const lights: Light[] = [];

    this.document.nodes.forEach((node) => {
      node.computeTransform()

      if (isLight(node)) {
        lights.push(node);
      }
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
      gpu.device.queue.writeBuffer(bindGroups.camera.buffer[0], 0, this.perspectiveTransform as Float32Array);      
    }
    else {
      gpu.device.queue.writeBuffer(bindGroups.camera.buffer[0], 0, this.orthographicTransform as Float32Array);      
    }

    const inverseViewtransform = mat4.inverse(this.viewTransform);
    gpu.device.queue.writeBuffer(bindGroups.camera.buffer[1], 0, inverseViewtransform as Float32Array);

    // Write the camera position

    const cameraPosition = vec4.transformMat4(vec4.create(0, 0, 0, 1), this.viewTransform);
    gpu.device.queue.writeBuffer(bindGroups.camera.buffer[2], 0, cameraPosition as Float32Array);

    // Update the light information
    lightsStructure.set({
      count: lights.length,
      lights: lights.map((light) => ({
        position: vec4.transformMat4(
          vec4.create(light.translate[0], light.translate[1], light.translate[2], 1),
          inverseViewtransform,
        ),
        color: light.lightColor,
      })),
    });

    gpu.device.queue.writeBuffer(bindGroups.camera.buffer[3], 0, lightsStructure.arrayBuffer);

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

      if (this.spaceOrientation === 'Local') {
        mat4.multiply(mat, this.selected.selection[0].node.getRotation(), mat);
      }

      this.dragModel.updateTransforms(mat)

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

  hitTest(x: number, y: number): { point: Vec4, mesh: DrawableInterface } | null {
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
          mode: 'Translate',
          point: intersection!,
          planeNormal,
          vector: null,
          startingAngle: 0,
          centroid: this.selected.getCentroid(),
          initialDistance: vec3.distance(this.selected.getCentroid(), intersection!),
          objects: this.selected.selection.map((object) => ({
            drawable: object.node,
            translate: object.node.translate,
            scale: object.node.scale,
            qRotate: quat.copy(object.node.qRotate),
          }))
        }

        return null;
      }

      const { ray, origin } = this.computeHitTestRay(x, y);
      const best = this.dragModel.modelHitTest(
        origin,
        ray,
        (node: DrawableInterface) => (node.tag !== 'drag-camera-plane' && node.tag !== ''),
      );

      if (best !== null) {
        let planeNormal: Vec4 | null = null;
        let vector: Vec4 | null = null;
        let mode: DragMode = 'Translate';
        let startingAngle: number | undefined;
        let up: Vec4 | undefined;
        let rotation: Vec4 | undefined;
        let axis: 'x' | 'y' | 'z' | undefined;

        switch (best.drawable.tag) {
          case 'drag-z-axis-plane':
            planeNormal = vec4.create(0, 0, 1, 0);
            break;

          case 'drag-x-axis':
            vector = vec4.create(1, 0, 0, 0);
            break;

          case 'drag-x-axis-scale':
            mode = 'ScaleX';
            vector = vec4.create(1, 0, 0, 0);
            break;

          case 'drag-y-axis-plane':
            planeNormal = vec4.create(0, 1, 0, 0);
            break;

          case 'drag-y-axis':
            vector = vec4.create(0, 1, 0, 0);
            break;

          case 'drag-y-axis-scale':
            mode = 'ScaleY';
            vector = vec4.create(0, 1, 0, 0);
            break;

          case 'drag-x-axis-plane':
            planeNormal = vec4.create(1, 0, 0, 0);
            break;

          case 'drag-z-axis':
            vector = vec4.create(0, 0, 1, 0);
            break;

          case 'drag-z-axis-scale':
            mode = 'ScaleZ';
            vector = vec4.create(0, 0, 1, 0);
            break;

          case 'drag-x-rotate':
            mode = 'Rotate';
            planeNormal = vec4.create(1, 0, 0, 0);
            up = vec4.create(0, 1, 0, 0);
            rotation = vec4.create(1, 0, 0, 0);
            axis = 'x';
            break;

          case 'drag-y-rotate':
            mode = 'Rotate';
            planeNormal = vec4.create(0, 1, 0, 0);
            up = vec4.create(1, 0, 0, 0);
            rotation = vec4.create(0, 1, 0, 0);
            axis = 'y';
            break;

          case 'drag-z-rotate':
            mode = 'Rotate';
            planeNormal = vec4.create(0, 0, 1, 0);
            up = vec4.create(0, 1, 0, 0);
            rotation = vec4.create(0, 0, 1, 0);
            axis = 'z';
            break;
        }

        if (this.spaceOrientation === 'Local' && this.selected.selection.length > 0) {
          if (vector) {
            vec4.transformMat4(vector, this.selected.selection[0].node.getRotation(), vector);
          }

          if (planeNormal) {
            vec4.transformMat4(planeNormal, this.selected.selection[0].node.getRotation(), planeNormal);
          }

          if (up) {
            vec4.transformMat4(up, this.selected.selection[0].node.getRotation(), up);
          }
        }
          
        if (planeNormal || vector) {
          switch (best.drawable.tag) {
            case 'drag-x-rotate':
            case 'drag-y-rotate':
            case 'drag-z-rotate':
              startingAngle = getAngle(planeNormal!, up!, this.selected.getCentroid(), origin, ray);
              break;
          }

          this.dragInfo = {
            mode,
            point: best.point,
            planeNormal,
            up,
            rotation,
            vector,
            axis,
            startingAngle: startingAngle ?? 0,
            centroid: this.selected.getCentroid(),
            initialDistance: vec3.distance(this.selected.getCentroid(), best.point),
            objects: this.selected.selection.map((object) => ({
              drawable: object.node,
              translate: vec3.copy(object.node.translate),
              scale: vec3.copy(object.node.scale),
              qRotate: quat.copy(object.node.qRotate),
            }))
          }  

          return null;
        }
      }
    }

    // Check for hits against the other objects
    const { ray, origin } = this.computeHitTestRay(x, y);  
    const best = this.document.modelHitTest(origin, ray);

    if (best) {
      return {
        point: best.point,
        mesh: best.drawable,
      }
    }

    return null;
  }

  scaleObject(drawable: SceneNode, originalScale: Vec3, scale: Vec3) {
    const s = mat4.identity();

    if (this.spaceOrientation === 'Global') {
      mat4.multiply(s, mat4.inverse(drawable.getRotation()), s);
    }

    mat4.scale(s, scale, s);
    
    if (this.spaceOrientation === 'Global') {
      mat4.multiply(s, drawable.getRotation(), s);
    }

    mat4.scale(s, originalScale, s);

    drawable.scale = vec3.create(
      Math.abs(parseFloat(s[0].toFixed(4))),
      Math.abs(parseFloat(s[5].toFixed(4))),
      Math.abs(parseFloat(s[10].toFixed(4))),
    );
  }

  dragObject(x: number, y: number) {
    if (this.dragInfo) {
      const { ray, origin } = this.computeHitTestRay(x, y);

      let intersection: Vec4 | null = null;
      let scale = 1;

      if (this.dragInfo.planeNormal) {
        intersection = intersectionPlane(this.dragInfo.point, this.dragInfo.planeNormal, origin, ray);
      }
      else if (this.dragInfo.vector) {
        [intersection] = closestPointsBetweenRays(this.dragInfo.point, this.dragInfo.vector, origin, ray);
      }

      if (intersection) {
        let moveVector = vec4.subtract(intersection, this.dragInfo.point);

        this.dragInfo.objects.forEach((object) => {
          // Add the move vector to the original translation for the object.
          runInAction(() => {
            switch (this.dragInfo?.mode) {
              case 'Translate':
                object.drawable.translate = vec3.add(object.translate, moveVector);
                break;

              case 'ScaleX':
              case 'ScaleY':
              case 'ScaleZ': {
                if (intersection) {
                  const distance = vec3.distance(intersection, this.dragInfo.centroid);
                  scale = distance / this.dragInfo.initialDistance;
  
                  switch (this.dragInfo?.mode) {
                    case 'ScaleX':
                      this.scaleObject(object.drawable, object.scale, vec3.create(scale, 1, 1));
                      break;
      
                    case 'ScaleY':
                      this.scaleObject(object.drawable, object.scale, vec3.create(1, scale, 1));
                      break;
      
                    case 'ScaleZ':
                      this.scaleObject(object.drawable, object.scale, vec3.create(1, 1, scale));
                      break;    
                  }       
                }
                  
                break;  
              }

              case 'Rotate':
                if (this.dragInfo.planeNormal) {
                  const angle = getAngle(this.dragInfo.planeNormal, this.dragInfo.up!, this.dragInfo.centroid, origin, ray);

                  if (angle) {
                    const deltaAngle = angle - this.dragInfo.startingAngle;

                    let q: Quat;

                    switch (this.dragInfo.axis!) {
                      case 'x':
                        q = quat.fromEuler(deltaAngle, 0, 0, rotationOrder);
                        break;

                      case 'y':
                        q = quat.fromEuler(0, deltaAngle, 0, rotationOrder);
                        break;

                      case 'z':
                        q = quat.fromEuler(0, 0, deltaAngle, rotationOrder);
                        break;

                      default:
                        throw new Error('axis not set');
                    }

                    if (this.spaceOrientation === 'Global') {
                      object.drawable.setQRotate(quat.multiply(q, object.qRotate));
                    }
                    else {
                      object.drawable.setQRotate(quat.multiply(object.qRotate, q));
                    }
                  }
                }
                break;
  
              default:
                break;
            }
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

  prevHover: DrawableInterface | null = null;

  static getDragColor(name: string): Vec4 {
    if (/^drag-x/.test(name)) {
      return vec4.create(0.75, 0, 0, 1);
    }

    if (/^drag-y/.test(name)) {
      return vec4.create(0, 0.75, 0, 1);
    }

    if (/^drag-z/.test(name)) {
      // return vec4.create(0.4, 0.4, 1, 1);
      return vec4.create(0, 0, 1, 1);
    }

    return vec4.create(0, 0, 0, 1);
  }

  static getDragHoverColor(name: string): Vec4 {
    if (/^drag-x/.test(name)) {
      return vec4.create(1, 0, 0, 1);
    }

    if (/^drag-y/.test(name)) {
      return vec4.create(0, 1, 0, 1);
    }

    if (/^drag-z/.test(name)) {
      return vec4.create(0.5, 0.5, 1, 1);
    }

    return vec4.create(0, 0, 0, 1);
  }

  pointerMove(x: number, y: number) {
    if (this.dragInfo) {
      this.dragObject(x, y);
    }
    else if (this.selected.selection.length > 0) {
      const { ray, origin } = this.computeHitTestRay(x, y);
      const best = this.dragModel.modelHitTest(origin, ray);

      if (best && (best.drawable.tag ?? '') !== '') {
        if (this.prevHover) {
          this.prevHover.setColor(Renderer.getDragColor(this.prevHover.tag));
        }

        this.prevHover = best.drawable;

        best.drawable.setColor(Renderer.getDragHoverColor(this.prevHover.tag));
      }
      else if (this.prevHover) {
        this.prevHover.setColor(Renderer.getDragColor(this.prevHover.tag));
        this.prevHover = null;
      }
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

export const gpu = await Gpu.create();
export const bindGroups = new BindGroups();
export const renderer = await Renderer.create();

export default Renderer;
