import { gpu } from "./Gpu";

type BindGroup = {
  bindGroup: GPUBindGroup,
  layout: GPUBindGroupLayout,
  uniformBuffer: {
    buffer: GPUBuffer,
    size: number,
  }[],
}

class BindGroups {
  camera: BindGroup | null = null;

  ready: Promise<boolean>

  constructor() {
    this.ready = gpu.ready.then(() => {
      this.createCameraBindGroups()
    
      return true;
    })
  }

  createCameraBindGroups() {
    if (!gpu.device) {
      throw new Error('device is not set')
    }
  
    const bindGroupLayout = gpu.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: {},
        },
        {
          binding: 1,
          visibility: GPUShaderStage.VERTEX,
          buffer: {},
        },
      ]
    })
  
    const matrixBufferSize = 16 * Float32Array.BYTES_PER_ELEMENT;

    const projectionTransformBuffer = gpu.device.createBuffer({
      label: 'uniforms',
      size: matrixBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const viewTransformBuffer = gpu.device.createBuffer({
      label: 'uniforms',
      size: matrixBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const cameraBindGroup = gpu.device.createBindGroup({
      label: 'bind group for projection matrix',
      layout: bindGroupLayout, // this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: projectionTransformBuffer }},
        { binding: 1, resource: { buffer: viewTransformBuffer }},
      ],
    });

    this.camera = {
      bindGroup: cameraBindGroup,
      layout: bindGroupLayout,
      uniformBuffer: [
        {
          buffer: projectionTransformBuffer,
          size: matrixBufferSize,
        },
        {
          buffer: viewTransformBuffer,
          size: matrixBufferSize,
        },
      ],
    }
  }
}

export const bindGroups = new BindGroups();
