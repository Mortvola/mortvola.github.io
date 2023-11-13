import Pipeline from "./Pipeline";

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

  device: GPUDevice | null = null;

  context: GPUCanvasContext | null = null;

  pipelines: Pipeline[] = [];

  renderPassDescriptor: GPURenderPassDescriptor | null = null;

  async initialize(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    if (!navigator.gpu) {
      throw new Error('gpu not supported');
    }
  
    const adapter = await navigator.gpu.requestAdapter();
  
    if (!adapter) {
      throw new Error('Could not acquire adapater.');
    }
  
    this.device = await adapter.requestDevice();
  
    if (!this.device) {
      throw new Error('Could not acquire device');
    }

    this.context = canvas.getContext("webgpu");

    if (!this.context) {
      throw new Error('context is null');
    }

    this.context.configure({
      device: this.device,
      format: navigator.gpu.getPreferredCanvasFormat(),
      alphaMode: "premultiplied",
    });
      
    this.pipelines = [new Pipeline(this.device, canvas.clientWidth, canvas.clientHeight)]

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
    if (!this.device) {
      throw new Error('device is not set')
    }

    if (!this.context) {
      throw new Error('context is null');
    }

    this.renderPassDescriptor = {
      colorAttachments: [
        {
          clearValue: { r: 0.0, g: 0.5, b: 1.0, a: 1.0 },
          loadOp: "clear" as GPULoadOp,
          storeOp: "store" as GPUStoreOp,
          view: this.context.getCurrentTexture().createView(),
        },
      ],
    };

    const commandEncoder = this.device.createCommandEncoder();

    const passEncoder = commandEncoder.beginRenderPass(this.renderPassDescriptor);

    this.pipelines.forEach((pipeline) => {
      pipeline.render(passEncoder);
    })
  
    passEncoder.end();
  
    this.device.queue.submit([commandEncoder.finish()]);  
  }
}

export default Renderer;
