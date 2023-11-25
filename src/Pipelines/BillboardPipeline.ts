import { gpu, bindGroups } from "../Renderer";
import PipelineInterface from "./PipelineInterface";
import shader from '../shaders/billboard.wgsl';
import DrawableInterface from "../Drawables/DrawableInterface";

class BillboardPipeline implements PipelineInterface {
  pipeline: GPURenderPipeline;

  bindGroupLayouts: GPUBindGroupLayout[] = [];

  constructor() {
    if (!gpu) {
      throw new Error('device is not set')
    }

    const shaderModule = gpu.device.createShaderModule({
      label: 'Billboard',
      code: shader,
    })
    
    this.bindGroupLayouts = [
      gpu.device.createBindGroupLayout({
        label: 'Billboard',
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
      }),
      gpu.device.createBindGroupLayout({
        label: 'Billboard Scale',
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.VERTEX,
            buffer: {},
          },
        ]
      }),
      gpu.device.createBindGroupLayout({
        label: 'Billboard',
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT,
            sampler: {},
          },
          {
            binding: 1,
            visibility: GPUShaderStage.FRAGMENT,
            texture: {},
          },
        ]
      })
    ]
    
    const pipelineDescriptor: GPURenderPipelineDescriptor = {
      label: 'Billboard',
      vertex: {
        module: shaderModule,
        entryPoint: "vertex_billboard",
      },
      fragment: {
        module: shaderModule,
        entryPoint: "fragment_billboard",
        targets: [
          {
            format: navigator.gpu.getPreferredCanvasFormat(),
            blend: {
              color: {
                srcFactor: 'src-alpha' as GPUBlendFactor,
                dstFactor: 'one-minus-src-alpha' as GPUBlendFactor,
              },
              alpha: {
                srcFactor: 'src-alpha' as GPUBlendFactor,
                dstFactor: 'one-minus-src-alpha' as GPUBlendFactor,
              },
            },
          },
        ],
      },
      primitive: {
        topology: "triangle-list",
        cullMode: "back",
        frontFace: "ccw",
      },
      depthStencil: {
        depthWriteEnabled: true,
        depthCompare: "less",
        format: "depth24plus"
      },
      layout: gpu.device.createPipelineLayout({
        label: 'Billboard',
        bindGroupLayouts: [
          bindGroups.camera!.layout,
          ...this.bindGroupLayouts,
        ]
      }),
    };
    
    this.pipeline = gpu.device.createRenderPipeline(pipelineDescriptor);
  }

  getBindGroupLayouts(): GPUBindGroupLayout[] {
    return this.bindGroupLayouts;
  }

  render(passEncoder: GPURenderPassEncoder, drawables: DrawableInterface[]) {
    passEncoder.setPipeline(this.pipeline);

    drawables.forEach((drawable) => {
      drawable.render(passEncoder);
    })
  }
}

export default BillboardPipeline;
