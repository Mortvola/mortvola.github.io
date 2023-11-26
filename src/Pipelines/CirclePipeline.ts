import { gpu, bindGroups } from "../Renderer";
import PipelineInterface from "./PipelineInterface";
import { circleShader } from '../shaders/circle';
import DrawableInterface from "../Drawables/DrawableInterface";

const label = 'CirclePipeline';

class CirclePipeline implements PipelineInterface {
  pipeline: GPURenderPipeline;

  bindGroupLayouts: GPUBindGroupLayout[] = [];

  constructor() {
    if (!gpu) {
      throw new Error('device is not set')
    }

    const shaderModule = gpu.device.createShaderModule({
      label,
      code: circleShader,
    })
    
    this.bindGroupLayouts = [
      gpu.device.createBindGroupLayout({
        label,
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.VERTEX,
            buffer: {},
          },
        ]
      }),
      gpu.device.createBindGroupLayout({
        label,
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.VERTEX,
            buffer: {},
          },
        ]
      }),
    ]
    
    const pipelineDescriptor: GPURenderPipelineDescriptor = {
      label,
      vertex: {
        module: shaderModule,
        entryPoint: "vertex_circle",
      },
      fragment: {
        module: shaderModule,
        entryPoint: "fragment_circle",
        targets: [
          {
            format: navigator.gpu.getPreferredCanvasFormat(),
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
        label,
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

export default CirclePipeline;
