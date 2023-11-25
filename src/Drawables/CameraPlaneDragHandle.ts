import { Vec4, vec4, Mat4, mat4, vec2 } from 'wgpu-matrix';
import { intersectionPlane } from '../Math';
import Drawable from './Drawable';
import { gpu } from '../Renderer';
import { PipelineTypes } from '../Pipelines/PipelineManager';

class CameraPlaneDragHandle extends Drawable {
  radius = new Float32Array(1);

  bindGroup: GPUBindGroup;

  uniformBuffer: GPUBuffer;

  colorBuffer: GPUBuffer;

  bindGroup2: GPUBindGroup;

  uniformBuffer2: GPUBuffer;

  bindGroup3: GPUBindGroup;

  private constructor(radius: number, pipelineType: PipelineTypes, bitmap: ImageBitmap) {
    super(pipelineType)

    if (!gpu) {
      throw new Error('device is not set')
    }

    this.radius[0] = radius;

    const bindGroupLayouts = this.pipeline.getBindGroupLayouts();

    this.uniformBuffer = gpu.device.createBuffer({
      label: 'model Matrix',
      size: 16 * Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.colorBuffer = gpu.device.createBuffer({
      label: 'color',
      size: Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.bindGroup = gpu.device.createBindGroup({
      label: 'DragHandle',
      layout: bindGroupLayouts[0],
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer }},
        { binding: 1, resource: { buffer: this.colorBuffer }},
      ],
    });

    this.uniformBuffer2 = gpu.device.createBuffer({
      label: 'radius',
      size: Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.bindGroup2 = gpu.device.createBindGroup({
      label: 'radius',
      layout: bindGroupLayouts[1],
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer2 }},
      ],
    });

    const texture = gpu.device!.createTexture({
      // label: url,
      format: 'rgba8unorm',
      size: [bitmap.width, bitmap.height],
      usage: GPUTextureUsage.TEXTURE_BINDING |
             GPUTextureUsage.COPY_DST |
             GPUTextureUsage.RENDER_ATTACHMENT,
    });

    gpu.device.queue.copyExternalImageToTexture(
      { source: bitmap },
      { texture },
      { width: bitmap.width, height: bitmap.height },
    );

    const sampler = gpu.device.createSampler();
    
    this.bindGroup3 = gpu.device.createBindGroup({
      label: 'DragHandle',
      layout: bindGroupLayouts[2],
      entries: [
        { binding: 0, resource: sampler },
        { binding: 1, resource: texture.createView() },
      ],
    });
  }

  static async make(radius: number, pipelineType: PipelineTypes): Promise<CameraPlaneDragHandle> {
    const url = '/target.png';
    const res = await fetch(url);
    const blob = await res.blob();
    const bitmap = await createImageBitmap(blob, { colorSpaceConversion: 'none' });

    return new CameraPlaneDragHandle(radius, pipelineType, bitmap);
  }

  render(passEncoder: GPURenderPassEncoder) {
    if (!gpu) {
      throw new Error('gpu device not set.')
    }

    gpu.device.queue.writeBuffer(this.uniformBuffer, 0, this.getTransform() as Float32Array);
    gpu.device.queue.writeBuffer(this.uniformBuffer2, 0, this.radius);

    passEncoder.setBindGroup(1, this.bindGroup);
    passEncoder.setBindGroup(2, this.bindGroup2);
    passEncoder.setBindGroup(3, this.bindGroup3);

    passEncoder.draw(6);  
  }

  hitTest(p: Vec4, viewTransform: Mat4): { point: Vec4, t: number, drawable: Drawable} | null {
    // Transform point from model space to world space to camera space.
    let t = mat4.multiply(mat4.inverse(viewTransform), this.getTransform());

    let point = vec4.create(t[12], t[13], t[14], t[15])

    const p2 = intersectionPlane(point, vec4.create(0, 0, 1, 0), vec4.create(0, 0, 0, 1), p);
  
    if (p2) {
      const d = vec2.distance(point, p2)

      if (d < Math.abs(this.radius[0] * t[14])) {
        // Transform point to world space
        const wp = vec4.transformMat4(p2, viewTransform);

        return { point: wp, t: 1.0, drawable: this };
      }
    }

    return null;
  }
}

export default CameraPlaneDragHandle;
