import { mat4, vec3, vec4 } from 'webgpu-matrix';
import { bindGroups } from "./BindGroups";
import { gpu } from "./Gpu";
import { degToRad } from "./Math";
import Mesh from "./Mesh";
import Pipeline from "./Pipeline";
import Models from './Models';
import Point from './Shapes/Point';

const requestPostAnimationFrame = (task: (timestamp: number) => void) => {
  requestAnimationFrame((timestamp: number) => {
    setTimeout(() => {
      task(timestamp);
    }, 0);
  });
};

class Renderer {
  initialized = false

  canvas: HTMLCanvasElement | null = null;

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

  async initialize(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    if (!gpu.device) {
      throw new Error('Could not acquire device');
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
      
    this.pipelines.push(new Pipeline())

    const mesh = new Mesh();

    this.document.meshes.push(mesh);

    this.pipelines[0].meshes.push(mesh);

    this.initialized = true;
  }

  start(): void {
    const draw = (timestamp: number) => {
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

          if (this.initialized) {
            this.drawScene();
          }

          this.framesRendered += 1;
        }

        requestPostAnimationFrame(draw);
      }
    };

    requestPostAnimationFrame(draw);
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

    if (!this.canvas) {
      throw new Error('canvas is not set');
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

    const uniformValues = new Float32Array(bindGroups.camera.uniformBuffer[0].size / Float32Array.BYTES_PER_ELEMENT);

    // offsets to the various uniform values in float32 indices
    const kMatrixOffset = 0;

    let matrixValue = uniformValues.subarray(kMatrixOffset, kMatrixOffset + 16);

    const aspect = this.canvas.clientWidth / this.canvas.clientHeight;

    matrixValue = mat4.perspective(
        degToRad(90), // settings.fieldOfView,
        aspect,
        1,      // zNear
        2000,   // zFar
    );

    gpu.device.queue.writeBuffer(bindGroups.camera.uniformBuffer[0].buffer, 0, matrixValue);

    const commandEncoder = gpu.device.createCommandEncoder();

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

    passEncoder.setBindGroup(0, bindGroups.camera.bindGroup);

    this.pipelines.forEach((pipeline) => {
      pipeline.render(passEncoder);
    })
  
    passEncoder.end();
  
    gpu.device.queue.submit([commandEncoder.finish()]);  
  }

  hitTest(x: number, y: number) {
    if (!this.canvas) {
      throw new Error('canvas is not set');
    }

    const aspect = this.canvas.clientWidth / this.canvas.clientHeight;

    const matrix = mat4.perspective(
      degToRad(90), // settings.fieldOfView,
      aspect,
      1,      // zNear
      2000,   // zFar
    );

    const inverseMatrix = mat4.inverse(matrix);

    const point = vec4.create(x, y, 0, 1);

    let p2 = vec4.transformMat4(point, inverseMatrix);
    p2[2] = -1;
    p2[3] = 0;

    const origin = this.cameraPosition;

    for (let mesh of this.document.meshes) {
      if (mesh.hitTest(origin, p2)) {
        break;
      }
    }
  }
}

export default Renderer;
