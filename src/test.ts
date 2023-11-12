import { mat4 } from "gl-matrix";
import { uvSphere } from "./Shapes/uvsphere";
import { identity, perspective, translate } from "./Matrix";

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

export const initialize = async (canvas: HTMLCanvasElement) => {
  if (!navigator.gpu) {
    throw new Error('gpu not supported');
  }

  const adapter = await navigator.gpu.requestAdapter();

  if (!adapter) {
    throw new Error('Could not acquire adapater.');
  }

  const device = await adapter.requestDevice();

  if (!device) {
    throw new Error('Could not acquire device');
  }

  const shaderModule = device.createShaderModule({
    code: shaders,
  })

  const context = canvas.getContext("webgpu");

  if (!context) {
    throw new Error('context is null');
  }

  context.configure({
    device: device,
    format: navigator.gpu.getPreferredCanvasFormat(),
    alphaMode: "premultiplied",
  });

  const sphere = uvSphere(8, 8);

  const vertexBuffer = device.createBuffer({
    size: sphere.vertices.length * Float32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });  
  {
    const mapping = new Float32Array(vertexBuffer.getMappedRange());
    // for (let i = 0; i < vertices.length; ++i) {
      mapping.set(sphere.vertices, 0);
    // }
    vertexBuffer.unmap();  
  }

  const indexBuffer = device.createBuffer({
    size: (sphere.indexes.length * Uint16Array.BYTES_PER_ELEMENT + 3) & ~3, // Make sure it is a multiple of four
    usage: GPUBufferUsage.INDEX,
    mappedAtCreation: true,
  })
  {
    const mapping = new Uint16Array(indexBuffer.getMappedRange());
    mapping.set(sphere.indexes, 0);
    indexBuffer.unmap();  
  }

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
  
  const renderPipeline = device.createRenderPipeline(pipelineDescriptor);

  // matrix
  const uniformBufferSize = 16 * Float32Array.BYTES_PER_ELEMENT;
  const uniformBuffer = device.createBuffer({
    label: 'uniforms',
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const uniformValues = new Float32Array(uniformBufferSize / Float32Array.BYTES_PER_ELEMENT);

  // offsets to the various uniform values in float32 indices
  const kMatrixOffset = 0;

  let matrixValue = uniformValues.subarray(kMatrixOffset, kMatrixOffset + 16);

  const aspect = canvas.clientWidth / canvas.clientHeight;

  matrixValue = perspective(
      degToRad(90), // settings.fieldOfView,
      aspect,
      1,      // zNear
      2000,   // zFar
  );

  // matrixValue = identity();
  // mat4.identity(matrixValue)
  // mat4.transpose(matrixValue, matrixValue)

  device.queue.writeBuffer(uniformBuffer, 0, matrixValue);

  const uniformBufferSize2 = 16 * Float32Array.BYTES_PER_ELEMENT;
  const uniformBuffer2 = device.createBuffer({
    label: 'uniforms',
    size: uniformBufferSize2,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const uniformValues2 = new Float32Array(uniformBufferSize / Float32Array.BYTES_PER_ELEMENT);

  let matrixValue2 = uniformValues2.subarray(kMatrixOffset, kMatrixOffset + 16);
  matrixValue2 = translate(0, 0, -2);

  device.queue.writeBuffer(uniformBuffer2, 0, matrixValue2);

  const bindGroup = device.createBindGroup({
    label: 'bind group for object',
    layout: renderPipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: uniformBuffer }},
      { binding: 1, resource: { buffer: uniformBuffer2 }},
    ],
  });
  
  const commandEncoder = device.createCommandEncoder();

  const clearColor = { r: 0.0, g: 0.5, b: 1.0, a: 1.0 };

  const renderPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        clearValue: clearColor,
        loadOp: "clear" as GPULoadOp,
        storeOp: "store" as GPUStoreOp,
        view: context.getCurrentTexture().createView(),
      },
    ],
  };

  const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

  passEncoder.setPipeline(renderPipeline);
  passEncoder.setBindGroup(0, bindGroup);
  passEncoder.setVertexBuffer(0, vertexBuffer);
  passEncoder.setIndexBuffer(indexBuffer, "uint16"); //, 0, sphere.indexes.length * Uint16Array.BYTES_PER_ELEMENT);
  // passEncoder.draw(3);
  passEncoder.drawIndexed(sphere.indexes.length);

  passEncoder.end();

  device.queue.submit([commandEncoder.finish()]);
}
