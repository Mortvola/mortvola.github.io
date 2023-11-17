import BillboardPipeline from "./BillboardPipeline";
import LinePipeline from "./LInePipeline";
import Pipeline from "./Pipeline";
import PipelineInterface from "./PipelineInterface";

export type PipelineTypes = 'pipeline' | 'line' | 'billboard';

type Pipelines = {
  type: PipelineTypes,
  pipeline: PipelineInterface,
}

class PipelineManager {
  private static instance: PipelineManager | null = null;

  pipelines: Pipelines[] = [];

  private constructor() {
    this.pipelines = [];

    this.pipelines.push({ type: 'pipeline', pipeline: new Pipeline() })
    this.pipelines.push({ type: 'line', pipeline: new LinePipeline() });
    this.pipelines.push({ type: 'billboard', pipeline: new BillboardPipeline() });
  }

  public static getInstance(): PipelineManager {
    if (PipelineManager.instance === null) {
      PipelineManager.instance = new PipelineManager();
    }

    return this.instance!
  }

  getPipeline(type: PipelineTypes): PipelineInterface | null {
    const entry = this.pipelines.find((pipeline) => pipeline.type === type);

    if (entry) {
      return entry.pipeline;
    }

    return null;
  }
}

export default PipelineManager;