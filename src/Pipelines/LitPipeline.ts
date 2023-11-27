import { gpu, bindGroups } from "../Renderer";
import PipelineInterface from "./PipelineInterface";
import { litShader } from '../shaders/lit';
import DrawableInterface from "../Drawables/DrawableInterface";

class LitPipeline implements PipelineInterface {
  pipeline: GPURenderPipeline;

  bindGroupLayouts: GPUBindGroupLayout[] = [];

  constructor() {
    if (!gpu) {
      throw new Error('device is not set')
    }

    const shaderModule = gpu.device.createShaderModule({
      label: 'lit',
      code: litShader,
    })
    
    this.bindGroupLayouts = [
      gpu.device.createBindGroupLayout({
        label: 'lit',
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
            format: "float32x4",
          },
        ],
        arrayStride: 16,
        stepMode: "vertex",
      },
      {
        attributes: [
          {
            shaderLocation: 1, // normal
            offset: 0,
            format: "float32x4",
          }
        ],
        arrayStride: 16,
        stepMode: "vertex",
      }
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

export default LitPipeline;
