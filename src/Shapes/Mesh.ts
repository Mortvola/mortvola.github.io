import { mat4, vec3, vec4, Vec3, Vec4 } from 'wgpu-matrix';
import { gpu } from "../Gpu";
import SurfaceMesh from "./SurfaceMesh";
import DrawableInterface from '../Pipelines/DrawableInterface';

class Mesh implements DrawableInterface {
  mesh: SurfaceMesh;

  vertexBuffer: GPUBuffer;

  indexBuffer: GPUBuffer;

  transform = mat4.identity();

  translate = vec3.create(0, 0, 0);

  rotate = vec3.create(0, 0, 0);

  scale = vec3.create(1, 1, 1);

  bindGroup: GPUBindGroup;

  uniformBuffer: GPUBuffer;

  uniformBufferSize: number;

  constructor(mesh: SurfaceMesh) {
    if (!gpu.device) {
      throw new Error('device is not set')
    }

    this.mesh = mesh;

    this.vertexBuffer = gpu.device.createBuffer({
      size: this.mesh.vertices.length * Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    });  

    {
      const mapping = new Float32Array(this.vertexBuffer.getMappedRange());
      mapping.set(this.mesh.vertices, 0);
      this.vertexBuffer.unmap();  
    }
  
    this.indexBuffer = gpu.device.createBuffer({
      size: (this.mesh.indexes.length * Uint16Array.BYTES_PER_ELEMENT + 3) & ~3, // Make sure it is a multiple of four
      usage: GPUBufferUsage.INDEX,
      mappedAtCreation: true,
    })

    {
      const mapping = new Uint16Array(this.indexBuffer.getMappedRange());
      mapping.set(this.mesh.indexes, 0);
      this.indexBuffer.unmap();  
    }

    const bindGroupLayout = gpu.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: {},
        },
      ]
    })

    this.uniformBufferSize = 16 * Float32Array.BYTES_PER_ELEMENT;
    this.uniformBuffer = gpu.device.createBuffer({
      label: 'uniforms',
      size: this.uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.bindGroup = gpu.device.createBindGroup({
      label: 'bind group for model matrix',
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer }},
      ],
    });

  }

  getTransform() {
    this.transform = mat4.identity();

    mat4.translate(this.transform, this.translate, this.transform);
    mat4.rotateX(this.transform, this.rotate[0], this.transform);
    mat4.rotateY(this.transform, this.rotate[1], this.transform);
    mat4.rotateZ(this.transform, this.rotate[2], this.transform);
    mat4.scale(this.transform, this.scale, this.transform);

    return this.transform;
  }

  setTranslation(translate: Vec3) {
    this.translate = translate;
  }

  render(passEncoder: GPURenderPassEncoder) {
    if (!gpu.device) {
      throw new Error('gpu devcie not set.')
    }

    gpu.device.queue.writeBuffer(this.uniformBuffer, 0, this.getTransform() as Float32Array);

    passEncoder.setBindGroup(1, this.bindGroup);

    passEncoder.setVertexBuffer(0, this.vertexBuffer);
    passEncoder.setIndexBuffer(this.indexBuffer, "uint16");
    passEncoder.drawIndexed(this.mesh.indexes.length);  
  }

  hitTest(origin: Vec4, vector: Vec4): { point: Vec4, t: number, mesh: Mesh} | null {
    const inverseTransform = mat4.inverse(this.getTransform());

    const localVector = vec4.transformMat4(vector, inverseTransform);
    const localOrigin = vec4.transformMat4(origin, inverseTransform);

    const result = this.mesh.hitTest(localOrigin, localVector);

    if (result) {
        // Convert the intersection point into world coordinates.
        const point = vec4.transformMat4(result.point, this.getTransform());

        return { point, t: result.t, mesh: this };      
    }

    return null;
  }

  computeCentroid(): Vec4 {
    return this.mesh.computeCentroid()
  }
}

export default Mesh;
