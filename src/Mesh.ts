import { mat4, vec3, vec4, Vec3, Vec4 } from 'wgpu-matrix';
import { gpu } from "./Gpu";
import SurfaceMesh from "./Shapes/SurfaceMesh";
import { uvSphere } from "./Shapes/uvsphere";
import { intersectTriangle } from './Math';
import DrawableInterface from './Pipelines/DrawableInterface';

class Mesh implements DrawableInterface {
  mesh: SurfaceMesh;

  vertexBuffer: GPUBuffer;

  indexBuffer: GPUBuffer;

  transform = mat4.identity();

  translation = vec3.create(0, 0, 0);

  bindGroup: GPUBindGroup;

  uniformBuffer: GPUBuffer;

  uniformBufferSize: number;

  constructor(mesh: SurfaceMesh) {
    if (!gpu.device) {
      throw new Error('device is not set')
    }

    this.mesh = mesh;

    this.translation = vec3.create(0, 0, 0)

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
    this.transform = mat4.translate(mat4.identity(), this.translation);

    return this.transform;
  }

  setTranslation(translation: Vec3) {
    this.translation = translation;
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

  hitTest(origin: Vec4, vector: Vec4): { point: Vec4, mesh: Mesh} | null {
    const inverseTransform = mat4.inverse(this.getTransform());

    const localVector = vec4.transformMat4(vector, inverseTransform);
    const localOrigin = vec4.transformMat4(origin, inverseTransform);

    for (let i = 0; i < this.mesh.indexes.length; i += 3) {
      const index0 = this.mesh.indexes[i + 0] * 8;
      const index1 = this.mesh.indexes[i + 1] * 8;
      const index2 = this.mesh.indexes[i + 2] * 8;

      const v0 = vec3.create(
        this.mesh.vertices[index0 + 0],
        this.mesh.vertices[index0 + 1],
        this.mesh.vertices[index0 + 2],
      )

      const v1 = vec3.create(
        this.mesh.vertices[index1 + 0],
        this.mesh.vertices[index1 + 1],
        this.mesh.vertices[index1 + 2],
      )

      const v2 = vec3.create(
        this.mesh.vertices[index2 + 0],
        this.mesh.vertices[index2 + 1],
        this.mesh.vertices[index2 + 2],
      )

      const result = intersectTriangle(localOrigin, localVector, v0, v1, v2);

      if (result) {
        let intersection = vec4.add(localOrigin, vec4.mulScalar(localVector, result[0]))

        // Convert the intersection point into world coordinates.
        intersection = vec4.transformMat4(intersection, this.getTransform());

        return { point: intersection, mesh: this };
      }
    }

    return null;
  }
}

export default Mesh;
