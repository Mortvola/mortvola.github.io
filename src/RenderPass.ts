import { bindGroups } from "./BindGroups";
import PipelineManager, { PipelineTypes } from "./Pipelines/PipelineManager";
import DrawableInterface from "./Pipelines/DrawableInterface";
import PipelineInterface from "./Pipelines/PipelineInterface";

type PipelineEntry = {
  type: PipelineTypes,
  pipeline: PipelineInterface,
  drawables: DrawableInterface[],
}

class RenderPass {
  pipelines: PipelineEntry[] = [];

  addDrawable(drawable: DrawableInterface, pipelineType: PipelineTypes) {
    let pipelineEntry = this.pipelines.find((p) => p.type === pipelineType) ?? null;

    if (!pipelineEntry) {
      const pipeline = PipelineManager.getInstance().getPipeline(pipelineType);

      if (pipeline) {
        this.pipelines.push({
          type: pipelineType,
          pipeline,
          drawables: []
        })

        pipelineEntry = this.pipelines[this.pipelines.length - 1];
      }
      else {
        console.log(`pipeline ${pipelineType} not found`)
      }
    }

    if (pipelineEntry) {
      pipelineEntry.drawables.push(drawable)
    }
  }

  getDescriptor(view: GPUTextureView, depthView: GPUTextureView | null): GPURenderPassDescriptor {
    const descriptor: GPURenderPassDescriptor = {
      label: 'main render pass',
      colorAttachments: [
        {
          view,
          clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
          loadOp: "clear" as GPULoadOp,
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

  render(view: GPUTextureView, depthView: GPUTextureView | null, commandEncoder: GPUCommandEncoder) {
    if (!bindGroups.camera) {
      throw new Error('uniformBuffer is not set');
    }

    const passEncoder = commandEncoder.beginRenderPass(this.getDescriptor(view, depthView));

    passEncoder.setBindGroup(0, bindGroups.camera.bindGroup);

    this.pipelines.forEach((entry) => {
      entry.pipeline.render(passEncoder, entry.drawables);
    })

    passEncoder.end();
  }
}

export default RenderPass;
