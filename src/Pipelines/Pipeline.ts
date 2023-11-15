import { bindGroups } from "../BindGroups";
import { gpu } from "../Gpu";
import Mesh from "../Mesh";
import PipelineInterface from "./PipelineInterface";
import simpleShader from '../shaders/simple.wgsl';

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

class Pipeline implements PipelineInterface {
  pipeline: GPURenderPipeline;

  drawables: Mesh[] = [];

  constructor() {
    if (!gpu.device) {
      throw new Error('device is not set')
    }

    const shaderModule = gpu.device.createShaderModule({
      code: simpleShader,
    })
    
    const bindGroupLayout = gpu.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: {},
        },
      ]
    })

    const pipelineLayout = gpu.device.createPipelineLayout({
      bindGroupLayouts: [
        bindGroups.camera!.layout,
        bindGroupLayout,
      ]
    });
    
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
        topology: "triangle-list",
        cullMode: "back",
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

  render(passEncoder: GPURenderPassEncoder) {
    passEncoder.setPipeline(this.pipeline);

    this.drawables.forEach((drawable) => {
      drawable.render(passEncoder);
    })
  }
}

export default Pipeline;
