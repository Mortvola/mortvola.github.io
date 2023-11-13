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

  mesh: BindGroup | null = null;

  ready: Promise<boolean>

  constructor() {
    this.ready = gpu.ready.then(() => {
      this.createCameraBindGroups()
      this.createMeshBindGroup()
    
      return true;
    })
  }

  layouts() {
    if (!this.camera) {
      throw new Error('camera bind group not set')
    }

    if (!this.mesh) {
      throw new Error('mesh bind group not set')
    }

    return [
      this.camera.layout,
      this.mesh.layout,
    ]
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
      ]
    })
  
    const uniformBufferSize = 16 * Float32Array.BYTES_PER_ELEMENT;
    const uniformBuffer = gpu.device.createBuffer({
      label: 'uniforms',
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
  
    const cameraBindGroup = gpu.device.createBindGroup({
      label: 'bind group for perspective matrix',
      layout: bindGroupLayout, // this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: uniformBuffer }},
      ],
    });

    this.camera = {
      bindGroup: cameraBindGroup,
      layout: bindGroupLayout,
      uniformBuffer: [{
        buffer: uniformBuffer,
        size: uniformBufferSize,
      }],
    }
  }

  createMeshBindGroup() {
    if (!gpu.device) {
      throw new Error('device is not set')
    }

    const layout = gpu.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: {},
        },
      ]
    })

    const uniformBufferSize = 16 * Float32Array.BYTES_PER_ELEMENT;
    const uniformBuffer = gpu.device.createBuffer({
      label: 'uniforms',
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindGroup = gpu.device.createBindGroup({
      label: 'bind group for model matrix',
      layout: layout,
      entries: [
        { binding: 0, resource: { buffer: uniformBuffer }},
      ],
    });

    this.mesh = {
      bindGroup,
      layout,
      uniformBuffer: [
        {
          buffer: uniformBuffer,
          size: uniformBufferSize,
        },
      ],
    }
  }
}

export const bindGroups = new BindGroups();
