import { vec4 } from 'wgpu-matrix';
import RenderPass from './RenderPass';

class DragHandlesPass extends RenderPass {
  centroid = vec4.create(0, 0, 0, 1);

  getDescriptor(view: GPUTextureView, depthView: GPUTextureView): GPURenderPassDescriptor {
    const descriptor: GPURenderPassDescriptor = {
      label: 'drag handles pass',
      colorAttachments: [
        {
          view,
          clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
          loadOp: "load" as GPULoadOp,
          storeOp: "store" as GPUStoreOp,
        },
      ],
    };

    if (depthView) {
      descriptor.depthStencilAttachment = {
        view: depthView,
        depthClearValue: 1.0,
        depthLoadOp: "clear" as GPULoadOp,
        depthStoreOp: "store" as GPUStoreOp,
      };
    }

    return descriptor;
  }

  hitTest(x: number, y: number) {

  }
}

export default DragHandlesPass;
