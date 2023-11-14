import { mat4, vec3, vec4 } from 'webgpu-matrix';
import { bindGroups } from "./BindGroups";
import { gpu } from "./Gpu";
import { degToRad, intersectionPlane } from "./Math";
import Mesh from "./Mesh";
import Pipeline from "./Pipeline";
import Models from './Models';
import Vec4 from 'webgpu-matrix/dist/1.x/vec4-impl';

const requestPostAnimationFrame = (task: (timestamp: number) => void) => {
  requestAnimationFrame((timestamp: number) => {
    setTimeout(() => {
      task(timestamp);
    }, 0);
  });
};

class Renderer {
  render = true

  previousTimestamp: number | null = null;

  startFpsTime: number | null = null;

  framesRendered = 0;

  onFpsChange?: (fps: number) => void;

  onLoadChange?: (percentComplete: number) => void;

  context: GPUCanvasContext | null = null;

  pipelines: Pipeline[] = [];

  document = new Models();

  cameraPosition = vec4.create(0, 0, 0, 1);

  viewTransform = mat4.identity();

  dragPoint: { point : Vec4, mesh: Mesh, translate: Vec4 } | null = null;

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

    const mesh = new Mesh();

    this.document.meshes.push(mesh);

    this.pipelines[0].meshes.push(mesh);

    // Initialize the view transform.
    this.resize(canvas.clientWidth, canvas.clientHeight)
    
    this.start();
  }

  resize(width: number, height: number) {
    const aspect = width / height;

    this.viewTransform = mat4.perspective(
        degToRad(90), // settings.fieldOfView,
        aspect,
        1,      // zNear
        2000,   // zFar
    );
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

    if (!bindGroups.camera?.uniformBuffer) {
      throw new Error('uniformBuffer is not set');
    }

    const renderPassDescriptor = {
      colorAttachments: [
        {
          clearValue: { r: 0.0, g: 0.5, b: 1.0, a: 1.0 },
          loadOp: "clear" as GPULoadOp,
          storeOp: "store" as GPUStoreOp,
          view: this.context.getCurrentTexture().createView(),
        },
      ],
    };

    gpu.device.queue.writeBuffer(bindGroups.camera.uniformBuffer[0].buffer, 0, this.viewTransform);

    const commandEncoder = gpu.device.createCommandEncoder();

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

    passEncoder.setBindGroup(0, bindGroups.camera.bindGroup);

    this.pipelines.forEach((pipeline) => {
      pipeline.render(passEncoder);
    })
  
    passEncoder.end();
  
    gpu.device.queue.submit([commandEncoder.finish()]);  
  }

  hitTest(x: number, y: number): { point: Vec4, mesh: Mesh} | null {
    const inverseMatrix = mat4.inverse(this.viewTransform);

    let point = vec4.create(x, y, 0, 1);

    point = vec4.transformMat4(point, inverseMatrix);
    point[2] = -1;
    point[3] = 0;
    point = vec4.normalize(point);

    const origin = this.cameraPosition;

    for (let mesh of this.document.meshes) {
      const intersection = mesh.hitTest(origin, point);
      if (intersection) {
        return intersection;
      }
    }

    return null;
  }

  startDrag(x: number, y: number) {
    const result = this.hitTest(x, y);

    if (result) {
      this.dragPoint = {
        point: result.point,
        mesh: result.mesh,
        translate: result.mesh.translation,
      }
    }
  }

  moveDrag(x: number, y: number) {
    if (this.dragPoint) {
      const inverseMatrix = mat4.inverse(this.viewTransform);

      let point = vec4.create(x, y, 0, 1);

      point = vec4.transformMat4(point, inverseMatrix);
      point[2] = -1;
      point[3] = 0;
      point = vec4.normalize(point);

      let ray = vec4.subtract(point, this.cameraPosition);
      ray[3] = 0;
      ray = vec4.normalize(ray);
    
      const planeNormal = vec4.create(0, 0, 1, 0);

      const intersection = intersectionPlane(this.dragPoint.point, planeNormal, vec4.create(0, 0, 0, 1), ray);

      const delta = vec4.subtract(intersection, this.dragPoint.point);

      const newTranslation = vec4.add(this.dragPoint.translate, delta);

      this.dragPoint.mesh.setTranslation(vec3.create(newTranslation[0], newTranslation[1], newTranslation[2]));
    }
  }

  stopDrag(x: number, y: number) {
    this.dragPoint = null;
  }
}

export default Renderer;
