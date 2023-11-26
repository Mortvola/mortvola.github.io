import { gpu } from "./Renderer";
import {
  makeShaderDataDefinitions,
  makeStructuredView,
} from 'webgpu-utils';
import { lights } from "./shaders/lights";

type BindGroup = {
  bindGroup: GPUBindGroup,
  layout: GPUBindGroupLayout,
  buffer: GPUBuffer[],
}

const defs = makeShaderDataDefinitions(lights);
export const lightsStructure = makeStructuredView(defs.structs.Lights);

class BindGroups {
  camera: BindGroup | null = null;

  constructor() {
    this.createCameraBindGroups()
  }

  createCameraBindGroups() {
    if (gpu) {
      const bindGroupLayout = gpu.device.createBindGroupLayout({
        label: 'camera',
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
          {
            binding: 2,
            visibility: GPUShaderStage.VERTEX,
            buffer: {},
          },
          {
            binding: 3,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: {
              type: "read-only-storage",
            },
          },
        ]
      })
    
      const matrixBufferSize = 16 * Float32Array.BYTES_PER_ELEMENT;

      const projectionTransformBuffer = gpu.device.createBuffer({
        label: 'projection Matrix',
        size: matrixBufferSize,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      const viewTransformBuffer = gpu.device.createBuffer({
        label: 'view Matrix',
        size: matrixBufferSize,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      const cameraPosBuffer = gpu.device.createBuffer({
        label: 'camera position',
        size: 4 * Float32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      const lightsBuffer = gpu.device.createBuffer({
        label: 'lights',
        size: lightsStructure.arrayBuffer.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });

      const cameraBindGroup = gpu.device.createBindGroup({
        label: 'camera',
        layout: bindGroupLayout,
        entries: [
          { binding: 0, resource: { buffer: projectionTransformBuffer }},
          { binding: 1, resource: { buffer: viewTransformBuffer }},
          { binding: 2, resource: { buffer: cameraPosBuffer }},
          { binding: 3, resource: { buffer: lightsBuffer }},
        ],
      });

      this.camera = {
        bindGroup: cameraBindGroup,
        layout: bindGroupLayout,
        buffer: [
            projectionTransformBuffer,
            viewTransformBuffer,
            cameraPosBuffer,
            lightsBuffer,
        ],
      }
    }
  }
}

export default BindGroups;