import { PipelineTypes } from "../Pipelines/PipelineManager";
import Drawable from "./Drawable";

class AxisPlaneDragHandle extends Drawable {
  private constructor(pipelineType: PipelineTypes) {
    super(pipelineType)
  }

  static async make(pipelineType: PipelineTypes) {
    return new AxisPlaneDragHandle(pipelineType);
  }
}

export default AxisPlaneDragHandle;
