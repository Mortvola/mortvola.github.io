import { gpu } from "../Gpu";
import PipelineInterface from "./PipelineInterface";
import lineShader from '../shaders/line.wgsl';
import DrawableInterface from "../Drawables/DrawableInterface";

class LinePipeline implements PipelineInterface {
  pipeline: GPURenderPipeline;

  bindGroupLayouts: GPUBindGroupLayout[] = [];

  constructor() {
    if (!gpu.device) {
      throw new Error('device is not set')
    }

    const shaderModule = gpu.device.createShaderModule({
      label: 'line',
      code: lineShader,
    })

    this.bindGroupLayouts = [
      gpu.device.createBindGroupLayout({
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
    ]

    const pipelineLayout = gpu.device.createPipelineLayout({
      bindGroupLayouts: this.bindGroupLayouts,
    });

    const vertexBufferLayout: GPUVertexBufferLayout[] = [
      {
        attributes: [
          {
            shaderLocation: 0, // position
            offset: 0,
            format: "float32x4" as GPUVertexFormat,
          },
          {
            shaderLocation: 1, // color
            offset: 16,
            format: "float32x4" as GPUVertexFormat,
          },
        ],
        arrayStride: 32,
        stepMode: "vertex",
      },
    ];    
    
    const pipelineDescriptor: GPURenderPipelineDescriptor = {
      vertex: {
        module: shaderModule,
        entryPoint: "vertex_main",
        buffers: vertexBufferLayout,
      },
      fragment: {
        module: shaderModule,
        entryPoint: "fragment_main",
        targets: [
          {
            format: navigator.gpu.getPreferredCanvasFormat(),
          },
        ],
      },
      primitive: {
        topology: "line-list",
        cullMode: "none",
      },
      depthStencil: {
        depthWriteEnabled: true,
        depthCompare: "less",
        format: "depth24plus"
      },
      layout: pipelineLayout,
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

export default LinePipeline;
