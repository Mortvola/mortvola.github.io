import { bindGroups } from "./BindGroups";
import { gpu } from "./Gpu";
import { perspective, translate } from "./Matrix";
import Mesh from "./Mesh";

const shaders = `
struct Vertex {
  @location(0) position: vec4f,
  @location(1) color: vec4f,
}

struct VertexOut {
  @builtin(position) position : vec4f,
  @location(0) color : vec4f
}

@group(0) @binding(0) var<uniform> perspective: mat4x4f;
@group(1) @binding(0) var<uniform> model: mat4x4f;

@vertex
fn vertex_main(vert: Vertex) -> VertexOut
{
  var output : VertexOut;

  output.position = perspective * model * vert.position;
  output.color = vert.color;
  return output;
}

@fragment
fn fragment_main(fragData: VertexOut) -> @location(0) vec4f
{
  return fragData.color;
}
`;

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
  device: GPUDevice;

  pipeline: GPURenderPipeline;

  meshes: Mesh[] = [];

  constructor() {
    if (!gpu.device) {
      throw new Error('device is not set')
    }

    this.device = gpu.device;

    const shaderModule = gpu.device.createShaderModule({
      code: shaders,
    })
    
    // const bindGroupLayout = device.createBindGroupLayout({
    //   entries: [
    //     {
    //       binding: 0,
    //       visibility: GPUShaderStage.VERTEX,
    //       buffer: {},
    //     },
    //     {
    //       binding: 1,
    //       visibility: GPUShaderStage.VERTEX,
    //       buffer: {},
    //     }
    //   ]
    // })
    
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

    this.meshes[0].render(passEncoder);
  }
}

export default Pipeline;
