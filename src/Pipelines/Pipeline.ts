import { gpu, bindGroups } from "../Renderer";
import PipelineInterface from "./PipelineInterface";
import { simpleShader } from '../shaders/simple';
import DrawableInterface from "../Drawables/DrawableInterface";

class Pipeline implements PipelineInterface {
  pipeline: GPURenderPipeline;

  bindGroupLayouts: GPUBindGroupLayout[] = [];

  constructor() {
    if (!gpu) {
      throw new Error('device is not set')
    }

    const shaderModule = gpu.device.createShaderModule({
      label: 'pipeline',
      code: simpleShader,
    })
    
    this.bindGroupLayouts = [
      gpu.device.createBindGroupLayout({
        label: 'pipeline',
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
          }
        ]
      }),
    ]

    const pipelineLayout = gpu.device.createPipelineLayout({
      bindGroupLayouts: [
        bindGroups.camera!.layout,
        ...this.bindGroupLayouts,
      ],
    });
    
    const vertexBufferLayout: GPUVertexBufferLayout[] = [
      {
        attributes: [
          {
            shaderLocation: 0, // position
            offset: 0,
            format: "float32x4" as GPUVertexFormat,
          },
        ],
        arrayStride: 16,
        stepMode: "vertex",
      },
    ];
    
    const pipelineDescriptor: GPURenderPipelineDescriptor = {
      vertex: {
        module: shaderModule,
        entryPoint: "vertex_simple",
        buffers: vertexBufferLayout,
      },
      fragment: {
        module: shaderModule,
        entryPoint: "fragment_simple",
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

export default Pipeline;
