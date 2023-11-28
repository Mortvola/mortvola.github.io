import {
  mat4, vec3, vec4, quat, Vec4, Mat4, setDefaultType, Quat,
} from 'wgpu-matrix';
import BindGroups, { lightsStructure } from "./BindGroups";
import Gpu from "./Gpu";
import {
  degToRad,
  normalizeDegrees,
} from "./Math";
import Mesh from "./Drawables/Mesh";
import CartesianAxes from './CartesianAxes';
import { uvSphere } from './Drawables/shapes/uvsphere';
import { box } from './Drawables/shapes/box';
import { tetrahedron } from './Drawables/shapes/tetrahedron';
import SelectionList from './SelectionList';
import DragHandlesPass from './DragHandlesPass';
import RenderPass from './RenderPass';
import { plane } from './Drawables/shapes/plane';
import { cylinder } from './Drawables/shapes/cylinder';
import { cone } from './Drawables/shapes/cone';
import ContainerNode from './Drawables/ContainerNode';
import SceneNode from './Drawables/SceneNode';
import DrawableInterface from './Drawables/DrawableInterface';
import Light, { isLight } from './Drawables/LIght';
import Transformer from './Transformer';
import Camera from './Camera';

export type ObjectTypes = 'UVSphere' | 'Box' | 'Tetrahedron' | 'Cylinder' | 'Cone' | 'Plane';

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

  camera = new Camera();

  hitTestInfo: HitTestInfo | null = null;

  depthTextureView: GPUTextureView | null = null;

  renderedDimensions: [number, number] = [0, 0];

  selected = new SelectionList();

  mainRenderPass = new RenderPass();

  dragHandlesPass = new DragHandlesPass();

  transformer: Transformer;

  onSelectCallback: ((drawable: DrawableInterface | null) => void) | null = null;

  private constructor(transformer: Transformer) {
    this.mainRenderPass.addDrawable(new CartesianAxes('line'));

    this.transformer = transformer;

    this.dragHandlesPass.addDrawables(this.transformer.transformer);

    const light = new Light();
    light.translate = vec3.create(-3, 3, -3);

    this.document.addNode(light);
  }

  static async create() {
    if (gpu) {
      const transformer = await Transformer.create();

      return new Renderer(transformer)  
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
    
    this.camera.computeViewTransform();

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
      case 'Plane':
        mesh = await Mesh.create(plane(2, 2), 'lit');
        mesh.name = 'Plane';
        break;
      default:
        throw new Error('invalid type')
    }
    
    this.document.addNode(mesh);

    this.mainRenderPass.addDrawable(mesh);
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

        this.camera.perspectiveTransform = mat4.perspective(
            degToRad(45), // settings.fieldOfView,
            aspect,
            this.near,  // zNear
            this.far,   // zFar
        );

        this.camera.orthographicTransform = mat4.ortho(
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

    if (this.camera.projection === 'Perspective') {
      gpu.device.queue.writeBuffer(bindGroups.camera.buffer[0], 0, this.camera.perspectiveTransform as Float32Array);      
    }
    else {
      gpu.device.queue.writeBuffer(bindGroups.camera.buffer[0], 0, this.camera.orthographicTransform as Float32Array);      
    }

    const inverseViewtransform = mat4.inverse(this.camera.viewTransform);
    gpu.device.queue.writeBuffer(bindGroups.camera.buffer[1], 0, inverseViewtransform as Float32Array);

    // Write the camera position

    const cameraPosition = vec4.transformMat4(vec4.create(0, 0, 0, 1), this.camera.viewTransform);
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
      const origin = vec4.transformMat4(vec4.create(0, 0, 0, 1), this.camera.viewTransform);
      const centroid = this.selected.getCentroid();

      // We want to make the drag handles appear to be the same distance away 
      // from the camera no matter how far the centroid is from the camera.
      const apparentDistance = 25;
      let actualDistance = vec3.distance(origin, centroid);
      const scale = actualDistance / apparentDistance;

      const mat = mat4.translate(mat4.identity(), centroid);
      mat4.scale(mat, vec3.create(scale, scale, scale), mat)

      if (this.transformer.spaceOrientation === 'Local') {
        mat4.multiply(mat, this.selected.selection[0].node.getRotation(), mat);
      }

      this.transformer.updateTransforms(mat)

      this.dragHandlesPass.render(view, this.depthTextureView!, commandEncoder);
    }
  
    gpu.device.queue.submit([commandEncoder.finish()]);  
  }

  hitTest(x: number, y: number): { point: Vec4, mesh: DrawableInterface } | null {
    if (this.selected.selection.length > 0) {
      this.transformer.hitTest(x, y, this.camera, this.selected);
    }

    // Check for hits against the other objects
    const { ray, origin } = this.camera.computeHitTestRay(x, y);  
    const best = this.document.modelHitTest(origin, ray);

    if (best) {
      return {
        point: best.point,
        mesh: best.drawable,
      }
    }

    return null;
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

  pointerMove(x: number, y: number) {
    if (this.transformer.dragInfo) {
      this.transformer.dragObject(x, y, this.camera);
    }
    else if (this.selected.selection.length > 0) {
      const { ray, origin } = this.camera.computeHitTestRay(x, y);
      const best = this.transformer.transformer.modelHitTest(origin, ray);

      if (best && (best.drawable.tag ?? '') !== '') {
        if (this.prevHover) {
          this.prevHover.setColor(Transformer.getDragColor(this.prevHover.tag));
        }

        this.prevHover = best.drawable;

        best.drawable.setColor(Transformer.getDragHoverColor(this.prevHover.tag));
      }
      else if (this.prevHover) {
        this.prevHover.setColor(Transformer.getDragColor(this.prevHover.tag));
        this.prevHover = null;
      }
    }
  }

  pointerUp(x: number, y: number) {
    if (this.transformer.dragInfo) {
      this.transformer.dragObject(x, y, this.camera);
      this.transformer.dragInfo = null;
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
