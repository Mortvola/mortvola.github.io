import { perspective, translate } from "./Matrix";
import SurfaceMesh from "./Shapes/SurfaceMesh";
import { uvSphere } from "./Shapes/uvsphere";

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
@group(0) @binding(1) var<uniform> model: mat4x4f;

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

const degToRad = (d: number) => d * Math.PI / 180;

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

  clientWidth: number;

  clientHeight: number;

  pipeline: GPURenderPipeline;

  bindGroup: GPUBindGroup;

  vertexBuffer: GPUBuffer;

  indexBuffer: GPUBuffer;

  sphere: SurfaceMesh;

  uniformBuffer: GPUBuffer;

  uniformBufferSize: number;

  uniformBuffer2: GPUBuffer;

  uniformBufferSize2: number;

  constructor(device: GPUDevice, clientWidth: number, clientHeight: number) {
    this.device = device;
    this.clientWidth = clientWidth;
    this.clientHeight = clientHeight;

    const shaderModule = device.createShaderModule({
      code: shaders,
    })

    this.sphere = uvSphere(8, 8);

    this.vertexBuffer = device.createBuffer({
      size: this.sphere.vertices.length * Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    });  
    {
      const mapping = new Float32Array(this.vertexBuffer.getMappedRange());
      // for (let i = 0; i < vertices.length; ++i) {
        mapping.set(this.sphere.vertices, 0);
      // }
      this.vertexBuffer.unmap();  
    }
  
    this.indexBuffer = device.createBuffer({
      size: (this.sphere.indexes.length * Uint16Array.BYTES_PER_ELEMENT + 3) & ~3, // Make sure it is a multiple of four
      usage: GPUBufferUsage.INDEX,
      mappedAtCreation: true,
    })
    {
      const mapping = new Uint16Array(this.indexBuffer.getMappedRange());
      mapping.set(this.sphere.indexes, 0);
      this.indexBuffer.unmap();  
    }
    
    // matrix
    this.uniformBufferSize = 16 * Float32Array.BYTES_PER_ELEMENT;
    this.uniformBuffer = device.createBuffer({
      label: 'uniforms',
      size: this.uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.uniformBufferSize2 = 16 * Float32Array.BYTES_PER_ELEMENT;
    this.uniformBuffer2 = device.createBuffer({
      label: 'uniforms',
      size: this.uniformBufferSize2,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    
    const bindGroupLayout = device.createBindGroupLayout({
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
    })
    
    const pipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [
        bindGroupLayout, // @group(0)
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
      layout: pipelineLayout,
    };
    
    this.pipeline = device.createRenderPipeline(pipelineDescriptor);

    this.bindGroup = device.createBindGroup({
      label: 'bind group for object',
      layout: bindGroupLayout, // this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer }},
        { binding: 1, resource: { buffer: this.uniformBuffer2 }},
      ],
    });  
  }

  render(passEncoder: GPURenderPassEncoder) {
    const uniformValues = new Float32Array(this.uniformBufferSize / Float32Array.BYTES_PER_ELEMENT);

    // offsets to the various uniform values in float32 indices
    const kMatrixOffset = 0;

    let matrixValue = uniformValues.subarray(kMatrixOffset, kMatrixOffset + 16);

    const aspect = this.clientWidth / this.clientHeight;

    matrixValue = perspective(
        degToRad(90), // settings.fieldOfView,
        aspect,
        1,      // zNear
        2000,   // zFar
    );

    this.device.queue.writeBuffer(this.uniformBuffer, 0, matrixValue);

    const uniformValues2 = new Float32Array(this.uniformBufferSize / Float32Array.BYTES_PER_ELEMENT);

    let matrixValue2 = uniformValues2.subarray(kMatrixOffset, kMatrixOffset + 16);
    matrixValue2 = translate(0, 0, -2);

    this.device.queue.writeBuffer(this.uniformBuffer2, 0, matrixValue2);
    passEncoder.setPipeline(this.pipeline);
    passEncoder.setBindGroup(0, this.bindGroup);
    passEncoder.setVertexBuffer(0, this.vertexBuffer);
    passEncoder.setIndexBuffer(this.indexBuffer, "uint16");
    passEncoder.drawIndexed(this.sphere.indexes.length);  
  }
}

export default Pipeline;
