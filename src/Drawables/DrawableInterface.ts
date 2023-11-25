import { Vec4, Vec3, Mat4, Quat } from 'wgpu-matrix';
import PipelineInterface from "../Pipelines/PipelineInterface";

interface DrawableInterface {
  render(passEncoder: GPURenderPassEncoder): void;

  pipeline: PipelineInterface;

  transform: Mat4;

  translate: Vec3;

  qRotate: Quat;

  scale: Vec3;

  tag: string;

  setColor(color: Vec4): void;

  getColor(): Float32Array;

  hitTest(origin: Vec4, vector: Vec4): { point: Vec4, t: number, drawable: DrawableInterface} | null;

  computeTransform(transform?: Mat4, prepend?: boolean): Mat4;

  computeCentroid(): Vec4;

  getTransform(): Mat4;
}

export const isDrawableInterface = (r: unknown): r is DrawableInterface => (
  (r as DrawableInterface).pipeline !== undefined
)

export default DrawableInterface;
