import { bindGroups } from "../BindGroups";
import { gpu } from "../Gpu";
import PipelineInterface from "./PipelineInterface";
import simpleShader from '../shaders/billboard.wgsl';
import DrawableInterface from "./DrawableInterface";

class BillboardPipeline implements PipelineInterface {
  pipeline: GPURenderPipeline;

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
        topology: "triangle-list",
        cullMode: "back",
        frontFace: "ccw",
      },
      layout: pipelineLayout,
    };
    
    this.pipeline = gpu.device.createRenderPipeline(pipelineDescriptor);
  }

  render(passEncoder: GPURenderPassEncoder, drawables: DrawableInterface[]) {
    passEncoder.setPipeline(this.pipeline);

    drawables.forEach((drawable) => {
      drawable.render(passEncoder);
    })
  }
}

export default BillboardPipeline;
