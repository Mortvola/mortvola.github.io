import { vec3, vec4, quat, mat4, Vec3, Vec4, Mat4, Quat } from 'wgpu-matrix';
import { runInAction } from 'mobx';
import Mesh from "./Drawables/Mesh";
import CameraPlaneDragHandle from './Drawables/CameraPlaneDragHandle';
import { closestPointsBetweenRays, degToRad, getAngle, intersectionPlane } from './Math';
import { plane } from './Drawables/shapes/plane';
import ContainerNode, { HitTestResult } from './Drawables/ContainerNode';
import { torus } from './Drawables/shapes/torus';
import { cylinder } from './Drawables/shapes/cylinder';
import { box } from './Drawables/shapes/box';
import { cone } from './Drawables/shapes/cone';
import SceneNode, { rotationOrder } from './Drawables/SceneNode';
import DrawableInterface from './Drawables/DrawableInterface';
import Camera from './Camera';
import SelectionList from './SelectionList';

type DragMode = 'Translate' | 'ScaleAll' | 'ScaleX' | 'ScaleY' | 'ScaleZ' | 'Rotate';

type DragInfo = {
  mode: DragMode,
  point: Vec4,
  planeNormal: Vec4 | null,
  up?: Vec4,
  rotation?: Vec4,
  axis?: 'x' | 'y' | 'z',
  vector: Vec4 | null,
  startingAngle: number,
  centroid: Vec4,
  initialDistance: number,
  objects: {
    drawable: SceneNode,
    translate: Vec3,
    scale: Vec3,
    qRotate: Quat,
  }[],
}

export type SpaceOrientationType = 'Global' | 'Local';

class Transformer {
  translator: ContainerNode;

  rotator: ContainerNode;

  scaler: ContainerNode;

  cameraPlaneDragHandle: CameraPlaneDragHandle;

  dragInfo: DragInfo | null = null;

  spaceOrientation: SpaceOrientationType = 'Global';

  private constructor(
    translator: ContainerNode,
    scaler: ContainerNode,
    rotator: ContainerNode,
    cameraPlaneDragHandle: CameraPlaneDragHandle,
  ){
    this.translator = translator;
    this.scaler = scaler;
    this.rotator = rotator;

    this.cameraPlaneDragHandle = cameraPlaneDragHandle;
  }

  static async create() {
    const cameraPlaneDragHandle = await CameraPlaneDragHandle.make(0.02, 'billboard');
    cameraPlaneDragHandle.tag = 'drag-camera-plane';

    const [translator, scaler, rotator] = await Transformer.createTransformer(cameraPlaneDragHandle);

    return new Transformer(translator, scaler, rotator, cameraPlaneDragHandle);
  }

  static async createTransformer(cameraPlaneDragHandle: CameraPlaneDragHandle) {
    const planeHandleDimension = 0.75;

    const translator = new ContainerNode();
    const rotator = new ContainerNode();
    const scaler = new ContainerNode();

    const xColor = Transformer.getDragColor('drag-x');
    const yColor = Transformer.getDragColor('drag-y');
    const zColor = Transformer.getDragColor('drag-z');
    
    const xAxisPlaneDragHandle = await Mesh.create(plane(planeHandleDimension, planeHandleDimension, xColor), 'drag-handles');
    xAxisPlaneDragHandle.rotate(0, degToRad(90), 0);
    xAxisPlaneDragHandle.translate = vec3.create(0, 2, 2);
    xAxisPlaneDragHandle.tag = 'drag-x-axis-plane';

    let [axis, scale, trans] = await this.createAxis('x-axis', xColor);
    axis.translate = vec3.create(1.25, 0, 0);
    scale.translate = vec3.create(2.5, 0, 0);
    trans.translate = vec3.create(3.5, 0, 0);
    axis.rotate(0, 0, degToRad(270));
    scale.rotate(0, 0, degToRad(270));
    trans.rotate(0, 0, degToRad(270));
    translator.addNode(axis);
    translator.addNode(trans);
    scaler.addNode(scale);

    const yAxisPlaneDragHandle = await Mesh.create(plane(planeHandleDimension, planeHandleDimension, yColor), 'drag-handles');
    yAxisPlaneDragHandle.rotate(degToRad(270), 0, 0);
    yAxisPlaneDragHandle.translate = vec3.create(2, 0, 2);
    yAxisPlaneDragHandle.tag = 'drag-y-axis-plane';

    [axis, scale, trans] = await Transformer.createAxis('y-axis', yColor);
    axis.translate = vec3.create(0, 1.25, 0);
    scale.translate = vec3.create(0, 2.5, 0);
    trans.translate = vec3.create(0, 3.5, 0);
    translator.addNode(axis);
    translator.addNode(trans);
    scaler.addNode(scale);

    const zAxisPlaneDragHandle = await Mesh.create(plane(planeHandleDimension, planeHandleDimension, zColor), 'drag-handles');
    zAxisPlaneDragHandle.translate = vec3.create(2, 2, 0);
    zAxisPlaneDragHandle.tag ='drag-z-axis-plane';

    [axis, scale, trans] = await Transformer.createAxis('z-axis', zColor);
    axis.translate = vec3.create(0, 0, 1.25);
    scale.translate = vec3.create(0, 0, 2.5);
    trans.translate = vec3.create(0, 0, 3.5);
    axis.rotate(degToRad(90), 0, 0);
    scale.rotate(degToRad(90), 0, 0);
    trans.rotate(degToRad(90), 0, 0);
    translator.addNode(axis);
    translator.addNode(trans);
    scaler.addNode(scale);

    translator.addNode(xAxisPlaneDragHandle)
    translator.addNode(yAxisPlaneDragHandle)
    translator.addNode(zAxisPlaneDragHandle)
    translator.addNode(cameraPlaneDragHandle);

    let t = await Mesh.create(torus(32, 8, 2, 0.125, xColor), 'pipeline');
    t.rotate(0, degToRad(90), 0);
    t.tag = 'drag-x-rotate';
    rotator.addNode(t);

    t = await Mesh.create(torus(32, 8, 2, 0.125, zColor), 'pipeline');
    t.tag = 'drag-z-rotate';
    rotator.addNode(t);

    t = await Mesh.create(torus(32, 8, 2, 0.125, yColor), 'pipeline');
    t.rotate(degToRad(90), 0, 0);
    t.tag = 'drag-y-rotate';
    rotator.addNode(t);

    return [translator, scaler, rotator];
  }

  static async createAxis(tag: string, color: Vec3): Promise<[Mesh, Mesh, Mesh]> {
    const axisDragHandle = await Mesh.create(cylinder(8, 0.0625, 2.5, color), 'drag-handles');
    axisDragHandle.tag = `drag-${tag}-scale`;

    const boxHandle = await Mesh.create(box(0.35, 0.35, 0.35, color), 'drag-handles');
    boxHandle.tag = `drag-${tag}-scale`;

    const coneHandle = await Mesh.create(cone(8, 0.75, 0.20, color), 'drag-handles')
    coneHandle.tag = `drag-${tag}`;

    return [axisDragHandle, boxHandle, coneHandle];
  }

  static getDragColor(name: string): Vec4 {
    if (/^drag-x/.test(name)) {
      return vec4.create(0.75, 0, 0, 1);
    }

    if (/^drag-y/.test(name)) {
      return vec4.create(0, 0.75, 0, 1);
    }

    if (/^drag-z/.test(name)) {
      // return vec4.create(0.4, 0.4, 1, 1);
      return vec4.create(0, 0, 1, 1);
    }

    return vec4.create(0, 0, 0, 1);
  }

  static getDragHoverColor(name: string): Vec4 {
    if (/^drag-x/.test(name)) {
      return vec4.create(1, 0, 0, 1);
    }

    if (/^drag-y/.test(name)) {
      return vec4.create(0, 1, 0, 1);
    }

    if (/^drag-z/.test(name)) {
      return vec4.create(0.5, 0.5, 1, 1);
    }

    return vec4.create(0, 0, 0, 1);
  }

  updateTransforms(mat: Mat4) {
    this.translator.updateTransforms(mat)
    this.scaler.updateTransforms(mat)
    this.rotator.updateTransforms(mat)
  }

  hitTest(x: number, y: number, camera: Camera, selected: SelectionList): boolean {
    // Check for hit test of drag handle in screen space
    const p = camera.ndcToCameraSpace(x, y);
    p[3] = 0; // Convert p to a vector

    const point = this.cameraPlaneDragHandle?.hitTest(p, camera.viewTransform);

    if (point) {
      const { ray, origin } = camera.computeHitTestRay(x, y);
      const planeNormal = vec4.transformMat4(vec4.create(0, 0, 1, 0), camera.viewTransform);
      const intersection = intersectionPlane(selected.getCentroid(), planeNormal, origin, ray);

      this.dragInfo = {
        mode: 'Translate',
        point: intersection!,
        planeNormal,
        vector: null,
        startingAngle: 0,
        centroid: selected.getCentroid(),
        initialDistance: vec3.distance(selected.getCentroid(), intersection!),
        objects: selected.selection.map((object) => ({
          drawable: object.node,
          translate: object.node.translate,
          scale: object.node.scale,
          qRotate: quat.copy(object.node.qRotate),
        }))
      }

      return true;
    }

    const { ray, origin } = camera.computeHitTestRay(x, y);
    const best = this.modelHitTest(
      origin,
      ray,
      (node: DrawableInterface) => (node.tag !== 'drag-camera-plane' && node.tag !== ''),
    );

    if (best !== null) {
      let planeNormal: Vec4 | null = null;
      let vector: Vec4 | null = null;
      let mode: DragMode = 'Translate';
      let startingAngle: number | undefined;
      let up: Vec4 | undefined;
      let rotation: Vec4 | undefined;
      let axis: 'x' | 'y' | 'z' | undefined;

      switch (best.drawable.tag) {
        case 'drag-z-axis-plane':
          planeNormal = vec4.create(0, 0, 1, 0);
          break;

        case 'drag-x-axis':
          vector = vec4.create(1, 0, 0, 0);
          break;

        case 'drag-x-axis-scale':
          mode = 'ScaleX';
          vector = vec4.create(1, 0, 0, 0);
          break;

        case 'drag-y-axis-plane':
          planeNormal = vec4.create(0, 1, 0, 0);
          break;

        case 'drag-y-axis':
          vector = vec4.create(0, 1, 0, 0);
          break;

        case 'drag-y-axis-scale':
          mode = 'ScaleY';
          vector = vec4.create(0, 1, 0, 0);
          break;

        case 'drag-x-axis-plane':
          planeNormal = vec4.create(1, 0, 0, 0);
          break;

        case 'drag-z-axis':
          vector = vec4.create(0, 0, 1, 0);
          break;

        case 'drag-z-axis-scale':
          mode = 'ScaleZ';
          vector = vec4.create(0, 0, 1, 0);
          break;

        case 'drag-x-rotate':
          mode = 'Rotate';
          planeNormal = vec4.create(1, 0, 0, 0);
          up = vec4.create(0, 1, 0, 0);
          rotation = vec4.create(1, 0, 0, 0);
          axis = 'x';
          break;

        case 'drag-y-rotate':
          mode = 'Rotate';
          planeNormal = vec4.create(0, 1, 0, 0);
          up = vec4.create(1, 0, 0, 0);
          rotation = vec4.create(0, 1, 0, 0);
          axis = 'y';
          break;

        case 'drag-z-rotate':
          mode = 'Rotate';
          planeNormal = vec4.create(0, 0, 1, 0);
          up = vec4.create(0, 1, 0, 0);
          rotation = vec4.create(0, 0, 1, 0);
          axis = 'z';
          break;
      }

      if (this.spaceOrientation === 'Local' && selected.selection.length > 0) {
        if (vector) {
          vec4.transformMat4(vector, selected.selection[0].node.getRotation(), vector);
        }

        if (planeNormal) {
          vec4.transformMat4(planeNormal, selected.selection[0].node.getRotation(), planeNormal);
        }

        if (up) {
          vec4.transformMat4(up, selected.selection[0].node.getRotation(), up);
        }
      }
        
      if (planeNormal || vector) {
        switch (best.drawable.tag) {
          case 'drag-x-rotate':
          case 'drag-y-rotate':
          case 'drag-z-rotate':
            startingAngle = getAngle(planeNormal!, up!, selected.getCentroid(), origin, ray);
            break;
        }

        this.dragInfo = {
          mode,
          point: best.point,
          planeNormal,
          up,
          rotation,
          vector,
          axis,
          startingAngle: startingAngle ?? 0,
          centroid: selected.getCentroid(),
          initialDistance: vec3.distance(selected.getCentroid(), best.point),
          objects: selected.selection.map((object) => ({
            drawable: object.node,
            translate: vec3.copy(object.node.translate),
            scale: vec3.copy(object.node.scale),
            qRotate: quat.copy(object.node.qRotate),
          }))
        }  

        return true;
      }
    }

    return false;
  }

  scaleObject(drawable: SceneNode, originalScale: Vec3, scale: Vec3) {
    const s = mat4.identity();

    if (this.spaceOrientation === 'Global') {
      mat4.multiply(s, mat4.inverse(drawable.getRotation()), s);
    }

    mat4.scale(s, scale, s);
    
    if (this.spaceOrientation === 'Global') {
      mat4.multiply(s, drawable.getRotation(), s);
    }

    mat4.scale(s, originalScale, s);

    drawable.scale = vec3.create(
      Math.abs(parseFloat(s[0].toFixed(4))),
      Math.abs(parseFloat(s[5].toFixed(4))),
      Math.abs(parseFloat(s[10].toFixed(4))),
    );
  }

  dragObject(x: number, y: number, camera: Camera) {
    if (this.dragInfo) {
      const { ray, origin } = camera.computeHitTestRay(x, y);

      let intersection: Vec4 | null = null;
      let scale = 1;

      if (this.dragInfo.planeNormal) {
        intersection = intersectionPlane(this.dragInfo.point, this.dragInfo.planeNormal, origin, ray);
      }
      else if (this.dragInfo.vector) {
        [intersection] = closestPointsBetweenRays(this.dragInfo.point, this.dragInfo.vector, origin, ray);
      }

      if (intersection) {
        let moveVector = vec4.subtract(intersection, this.dragInfo.point);

        this.dragInfo.objects.forEach((object) => {
          // Add the move vector to the original translation for the object.
          runInAction(() => {
            switch (this.dragInfo?.mode) {
              case 'Translate':
                object.drawable.translate = vec3.add(object.translate, moveVector);
                break;

              case 'ScaleX':
              case 'ScaleY':
              case 'ScaleZ': {
                if (intersection) {
                  const distance = vec3.distance(intersection, this.dragInfo.centroid);
                  scale = distance / this.dragInfo.initialDistance;
  
                  switch (this.dragInfo?.mode) {
                    case 'ScaleX':
                      this.scaleObject(object.drawable, object.scale, vec3.create(scale, 1, 1));
                      break;
      
                    case 'ScaleY':
                      this.scaleObject(object.drawable, object.scale, vec3.create(1, scale, 1));
                      break;
      
                    case 'ScaleZ':
                      this.scaleObject(object.drawable, object.scale, vec3.create(1, 1, scale));
                      break;    
                  }       
                }
                  
                break;  
              }

              case 'Rotate':
                if (this.dragInfo.planeNormal) {
                  const angle = getAngle(this.dragInfo.planeNormal, this.dragInfo.up!, this.dragInfo.centroid, origin, ray);

                  if (angle) {
                    const deltaAngle = angle - this.dragInfo.startingAngle;

                    let q: Quat;

                    switch (this.dragInfo.axis!) {
                      case 'x':
                        q = quat.fromEuler(deltaAngle, 0, 0, rotationOrder);
                        break;

                      case 'y':
                        q = quat.fromEuler(0, deltaAngle, 0, rotationOrder);
                        break;

                      case 'z':
                        q = quat.fromEuler(0, 0, deltaAngle, rotationOrder);
                        break;

                      default:
                        throw new Error('axis not set');
                    }

                    if (this.spaceOrientation === 'Global') {
                      object.drawable.setQRotate(quat.multiply(q, object.qRotate));
                    }
                    else {
                      object.drawable.setQRotate(quat.multiply(object.qRotate, q));
                    }
                  }
                }
                break;
  
              default:
                break;
            }
          })
        })
      }
    }
  }

  modelHitTest(origin: Vec4, ray: Vec4, filter?: (node: DrawableInterface) => boolean): HitTestResult | null {
    let best = this.translator.modelHitTest(origin, ray, filter);

    let result = this.scaler.modelHitTest(origin, ray, filter);

    if (best === null || (result && result.t < best.t)) {
      best = result;
    }

    result = this.rotator.modelHitTest(origin, ray, filter);

    if (best === null || (result && result.t < best.t)) {
      best = result;
    }

    return best;
  }
}

export default Transformer;
