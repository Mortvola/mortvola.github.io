import { bindGroups } from "../BindGroups";
import { gpu } from "../Gpu";
import PipelineInterface from "./PipelineInterface";
import shader from '../shaders/billboard.wgsl';
import DrawableInterface from "../Drawables/DrawableInterface";

class BillboardPipeline implements PipelineInterface {
  pipeline: GPURenderPipeline;

  constructor() {
    if (!gpu.device) {
      throw new Error('device is not set')
    }

    const shaderModule = gpu.device.createShaderModule({
      label: 'Billboard',
      code: shader,
    })
    
    const bindGroupLayout = gpu.device.createBindGroupLayout({
      label: 'Billboard',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: {},
        },
      ]
    })

    const bindGroupLayout2 = gpu.device.createBindGroupLayout({
      label: 'Billboard Scale',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: {},
        },
      ]
    })
    
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
          },
        ],
      },
      primitive: {
        topology: "triangle-list",
        cullMode: "back",
        frontFace: "ccw",
      },
      layout: gpu.device.createPipelineLayout({
        label: 'Billboard',
        bindGroupLayouts: [
          bindGroups.camera!.layout,
          bindGroupLayout,
          bindGroupLayout2,
        ]
      }),
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
