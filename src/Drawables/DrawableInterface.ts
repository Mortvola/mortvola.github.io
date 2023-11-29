import { Vec4, Vec3, Mat4, Quat } from 'wgpu-matrix';
import PipelineInterface from "../Pipelines/PipelineInterface";
import { AllowedTransformations } from './SceneNode';

interface DrawableInterface {
  uuid: string;

  name: string;

  render(passEncoder: GPURenderPassEncoder): void;

  pipeline: PipelineInterface;

  transform: Mat4;

  translate: Vec3;

  qRotate: Quat;

  scale: Vec3;

  allowedTransformations: AllowedTransformations;

  tag: string;

  angles: number[];

  setColor(color: Vec4): void;

  getColor(): Float32Array;

  hitTest(origin: Vec4, vector: Vec4): { point: Vec4, t: number, drawable: DrawableInterface} | null;

  computeTransform(transform?: Mat4, prepend?: boolean): Mat4;

  computeCentroid(): Vec4;

  getTransform(): Mat4;

  getRotation(): Mat4;

  rotate(x: number, y: number, z: number): void;

  setFromAngles(x: number, y: number, z: number): void;

  setQRotate(q: Quat): void;
}

export const isDrawableInterface = (r: unknown): r is DrawableInterface => (
  (r as DrawableInterface).pipeline !== undefined
)

export default DrawableInterface;
