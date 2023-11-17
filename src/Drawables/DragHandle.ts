import { Vec4, vec4, Mat4, mat4, vec2 } from 'wgpu-matrix';
import { intersectionPlane } from '../Math';
import Drawable from './Drawable';
import { gpu } from '../Gpu';

class DragHandle extends Drawable {
  radius = new Float32Array(1);

  bindGroup: GPUBindGroup;

  uniformBuffer: GPUBuffer;

  uniformBufferSize: number;

  bindGroup2: GPUBindGroup;

  uniformBuffer2: GPUBuffer;

  uniformBufferSize2: number;

  constructor(radius: number) {
    super()

    if (!gpu.device) {
      throw new Error('device is not set')
    }

    this.radius[0] = radius;

    const bindGroupLayout = gpu.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: {},
        },
      ]
    })

    const bindGroupLayout2 = gpu.device.createBindGroupLayout({
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

    this.uniformBufferSize2 = 1 * Float32Array.BYTES_PER_ELEMENT;
    this.uniformBuffer2 = gpu.device.createBuffer({
      label: 'uniforms',
      size: this.uniformBufferSize2,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.bindGroup2 = gpu.device.createBindGroup({
      label: 'bind group for model matrix',
      layout: bindGroupLayout2,
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer2 }},
      ],
    });
  }

  render(passEncoder: GPURenderPassEncoder) {
    if (!gpu.device) {
      throw new Error('gpu devcie not set.')
    }

    gpu.device.queue.writeBuffer(this.uniformBuffer, 0, this.getTransform() as Float32Array);
    gpu.device.queue.writeBuffer(this.uniformBuffer2, 0, this.radius);

    passEncoder.setBindGroup(1, this.bindGroup);
    passEncoder.setBindGroup(2, this.bindGroup2);

    passEncoder.draw(6);  
  }

  hitTest(p: Vec4, viewTransform: Mat4): Vec4 | null {
    // Transform point from model space to world space to camera space.
    let t = mat4.multiply(mat4.inverse(viewTransform), this.getTransform());

    let point = vec4.create(t[12], t[13], t[14], t[15])

    if (point[3] !== 1) {
      console.log(`point: ${point[3]}`)
    }

    const p2 = intersectionPlane(point, vec4.create(0, 0, 1, 0), vec4.create(0, 0, 0, 1), p);
  
    if (p2) {
      const d = vec2.distance(point, p2)

      if (d < Math.abs(this.radius[0] * t[14])) {
        if (p2[3] !== 1) {
          console.log(`p2: ${p2[3]}`)
        }

        // p2[3] = 1;
        const wp = vec4.transformMat4(p2, viewTransform);

        // console.log(`p2: ${p2}`)
        // console.log(`wp: ${wp}`)

        return wp;
      }
    }

    return null;
  }
}

export default DragHandle;
