import { bindGroups } from "./BindGroups";
import { gpu } from "./Gpu";
import Mesh from "./Mesh";
import simpleShader from './shaders/simple.wgsl';

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

class Pipeline {
  pipeline: GPURenderPipeline;

  meshes: Mesh[] = [];

  constructor() {
    if (!gpu.device) {
      throw new Error('device is not set')
    }

    const shaderModule = gpu.device.createShaderModule({
      code: simpleShader,
    })
    
    const pipelineLayout = gpu.device.createPipelineLayout({
      bindGroupLayouts: bindGroups.layouts(),
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
      layout: pipelineLayout,
    };
    
    this.pipeline = gpu.device.createRenderPipeline(pipelineDescriptor);
  }

  render(passEncoder: GPURenderPassEncoder) {
    passEncoder.setPipeline(this.pipeline);

    this.meshes.forEach((mesh) => {
      mesh.render(passEncoder);
    })
  }
}

export default Pipeline;
