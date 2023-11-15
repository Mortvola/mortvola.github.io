import { mat4, vec3, vec4, quat, Vec3, Vec4, setDefaultType } from 'wgpu-matrix';
import { bindGroups } from "./BindGroups";
import { gpu } from "./Gpu";
import { degToRad, intersectionPlane, normalizeDegrees } from "./Math";
import Mesh from "./Mesh";
import Pipeline from "./Pipelines/Pipeline";
import Models from './Models';
import LinePipeline from './Pipelines/LInePipeline';
import PipelineInterface from './Pipelines/PipelineInterface';
import CartesianAxes from './CartesianAxes';
import { uvSphere } from './Shapes/uvsphere';
import { box } from './Shapes/box';
import { tetrahedron } from './Shapes/tetrahedron';

export type ObjectTypes = 'UVSphere' | 'Box' | 'Tetrahedron';

const requestPostAnimationFrame = (task: (timestamp: number) => void) => {
  requestAnimationFrame((timestamp: number) => {
    setTimeout(() => {
      task(timestamp);
    }, 0);
  });
};

setDefaultType(Float32Array);

class Renderer {
  render = true

  previousTimestamp: number | null = null;

  startFpsTime: number | null = null;

  framesRendered = 0;

  onFpsChange?: (fps: number) => void;

  onLoadChange?: (percentComplete: number) => void;

  context: GPUCanvasContext | null = null;

  pipelines: PipelineInterface[] = [];

  document = new Models();

  near = 0.125;
  
  far = 2000;

  cameraPosition = vec4.create(0, 0, 10, 1);

  rotateX = 330;

  rotateY = 45;

  clipTransform = mat4.identity();

  viewTransform = mat4.identity();

  dragInfo: { point : Vec4, mesh: Mesh, translate: Vec4 } | null = null;

  depthTextureView: GPUTextureView | null = null;

  renderedDimensions: [number, number] = [0, 0];

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
      alphaMode: "premultiplied",
    });
      
    this.pipelines = [];
    this.document.meshes = [];

    this.pipelines.push(new Pipeline())
    this.pipelines.push(new LinePipeline());

    this.pipelines[1].drawables.push(new CartesianAxes())

    this.computeViewTransform();

    this.start();
  }
  
  addObject(type: ObjectTypes) {
    let mesh: Mesh;
    switch (type) {
      case 'Box':
        mesh = new Mesh(box(8, 8));
        break;
      case 'UVSphere':
        mesh = new Mesh(uvSphere(8, 8));
        break;
      case 'Tetrahedron':
        mesh = new Mesh(tetrahedron());
        break;
      default:
        throw new Error('invalid type')
    }
    
    this.document.meshes.push(mesh);
    this.pipelines[0].drawables.push(mesh);
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
            degToRad(90), // settings.fieldOfView,
            aspect,
            this.near,  // zNear
            this.far,   // zFar
        );
    
        this.renderedDimensions = [this.context.canvas.width, this.context.canvas.height]
    }

    const renderPassDescriptor = {
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
          loadOp: "clear" as GPULoadOp,
          storeOp: "store" as GPUStoreOp,
        },
      ],
      depthStencilAttachment: {
        view: this.depthTextureView!,
        depthClearValue: 1.0,
        depthLoadOp: "clear" as GPULoadOp,
        depthStoreOp: "store" as GPUStoreOp,
      },
    };

    gpu.device.queue.writeBuffer(bindGroups.camera.uniformBuffer[0].buffer, 0, this.clipTransform as Float32Array);
    gpu.device.queue.writeBuffer(bindGroups.camera.uniformBuffer[1].buffer, 0, mat4.inverse(this.viewTransform)  as Float32Array);

    const commandEncoder = gpu.device.createCommandEncoder();

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

    passEncoder.setBindGroup(0, bindGroups.camera.bindGroup);

    this.pipelines.forEach((pipeline) => {
      pipeline.render(passEncoder);
    })
  
    passEncoder.end();
  
    gpu.device.queue.submit([commandEncoder.finish()]);  
  }

  // Returns ray and origin in world space coordinates.
  computeHitTestRay(x: number, y: number): { ray: Vec4, origin: Vec4 } {
    const inverseMatrix = mat4.inverse(this.clipTransform);

    // Transform point from NDC to camera space.
    let point = vec4.create(x, y, 0, 1);
    point = vec4.transformMat4(point, inverseMatrix);
    point = vec4.divScalar(point, point[3])

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

        // Transform move vector to model space
        moveVector = vec4.transformMat4(moveVector, mat4.inverse(this.dragInfo.mesh.getTransform()))
        const newTranslation = vec4.add(this.dragInfo.translate,  moveVector);

        this.dragInfo.mesh.setTranslation(vec3.create(newTranslation[0], newTranslation[1], newTranslation[2]));  
      }
    }
  }

  startDrag(x: number, y: number) {
    const result = this.hitTest(x, y);

    if (result) {
      this.dragInfo = {
        point: result.point,
        mesh: result.mesh,
        translate: result.mesh.translation,
      }
    }
  }

  moveDrag(x: number, y: number) {
    this.dragObject(x, y);
  }

  stopDrag(x: number, y: number) {
    this.dragObject(x, y);
    this.dragInfo = null;
  }
}

export default Renderer;
