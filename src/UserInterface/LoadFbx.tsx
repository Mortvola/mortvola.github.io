import React from 'react';
import * as FBXParser from 'fbx-parser'
import { vec3 } from 'wgpu-matrix';
import UploadFileButton from './UploadFileButton';
import SurfaceMesh from '../Drawables/SurfaceMesh';
import Mesh from '../Drawables/Mesh';
import { renderer } from '../Renderer';
import { degToRad } from '../Math';

export const yieldToMain = () => {
  return new Promise(resolve => {
    setTimeout(resolve, 0);
  });
}

const loadGeometry = async (geometry: FBXParser.FBXReaderNode) => {
  const vertices = geometry?.node('Vertices')?.prop(0, 'number[]') ?? [];
  const indexes = geometry?.node('PolygonVertexIndex')?.prop(0, 'number[]') ?? [];
  const normalsNode = geometry?.node('LayerElementNormal');

  const normals = normalsNode
    ?.node('Normals')
    ?.fbxNode.props[0] as number[] ?? []; // ?.prop(0, 'number');

  const mappingInformationType = normalsNode
    ?.node('MappingInformationType')
    ?.prop(0, 'string');

  const referenceInformationType = normalsNode
    ?.node('ReferenceInformationType')
    ?.prop(0, 'string');

  if (vertices.length !== 0 && indexes.length !== 0) {
    const m = new SurfaceMesh();

    // for (let i = 0; i < vertices.length; i += 3) {
    //   m.vertices.push(vertices[i + 0] / 100)
    //   m.vertices.push(vertices[i + 1] / 100)
    //   m.vertices.push(vertices[i + 2] / 100)
    //   m.vertices.push(1)
    // }

    let start = 0;
    let yieldPolyCount = 0;
    const yieldPolyCountMax = 500;

    for (let i = 0; i < indexes.length; i += 1) {
      if (indexes[i] < 0) {
        const vertexCount = i - start + 1;

        if (vertexCount === 3) {
          let index = indexes[start + 0] * 3;

          const v1 = m.addVertex(
            vertices[index + 0] / 100,
            vertices[index + 1] / 100,
            vertices[index + 2] / 100,
          )

          index = indexes[start + 1] * 3;

          const v2 = m.addVertex(
            vertices[index + 0] / 100,
            vertices[index + 1] / 100,
            vertices[index + 2] / 100,
          )

          index = (-indexes[start + 2] - 1) * 3;

          const v3 = m.addVertex(
            vertices[index + 0] / 100,
            vertices[index + 1] / 100,
            vertices[index + 2] / 100,
          )

          let norms: number[] | undefined = undefined;

          if 
            (mappingInformationType === 'ByPolygonVertex' &&
            referenceInformationType === 'Direct'
          ) {
            norms = [
              ...normals.slice(start * 3, (start + 3) * 3)
            ]
          }

          m.addFace([v1, v2, v3], norms);

          yieldPolyCount += 1;

          if (yieldPolyCount >= yieldPolyCountMax) {
            await yieldToMain();
            yieldPolyCount = 0;  
          }
        }
        else if (vertexCount === 4) {
          let index = indexes[start + 0] * 3;

          const v1 = m.addVertex(
            vertices[index + 0] / 100,
            vertices[index + 1] / 100,
            vertices[index + 2] / 100,
          )

          index = indexes[start + 1] * 3;

          const v2 = m.addVertex(
            vertices[index + 0] / 100,
            vertices[index + 1] / 100,
            vertices[index + 2] / 100,
          )

          index = indexes[start + 2] * 3;

          const v3 = m.addVertex(
            vertices[index + 0] / 100,
            vertices[index + 1] / 100,
            vertices[index + 2] / 100,
          )

          index = (-indexes[start + 3] - 1) * 3;

          const v4 = m.addVertex(
            vertices[index + 0] / 100,
            vertices[index + 1] / 100,
            vertices[index + 2] / 100,
          )

          let norms: number[] | undefined = undefined;

          if 
            (mappingInformationType === 'ByPolygonVertex' &&
            referenceInformationType === 'Direct'
          ) {
            norms = [
              ...normals.slice(start * 3, (start + 4) * 3)
            ]
          }

          m.addFace([v1, v2, v3, v4], norms)

          yieldPolyCount += 1;

          if (yieldPolyCount >= yieldPolyCountMax) {
            await yieldToMain();
            yieldPolyCount = 0;  
          }
        }
        else {
          console.log(`unsupported polygon vertex count: ${vertexCount}`)
        }

        start = i + 1;
      }
    }

    return m;
  }
}

type Result = {
  meshes: SurfaceMesh[],
}

const traverseTree = async (
  objectsNode: FBXParser.FBXReaderNode,
  connectionsNode: FBXParser.FBXReaderNode,
  objectId: number,
): Promise<Result> => {
  const result: Result = {
    meshes: [],
  };

  const connections = connectionsNode?.nodes({ 0: "OO", 2: objectId }) ?? [];

  for (let connection of connections) {
    const connectedObjectId = connection.prop(1, 'number');

    if (connectedObjectId) {
      const nodes = objectsNode?.nodes({ 0: connectedObjectId }) ?? [];

      for (const node of nodes) {
        if (node.fbxNode.name === 'Geometry') {
          const mesh = await loadGeometry(node);

          if (mesh) {
            result.meshes.push(mesh);
          }
        }
        
        const objectId = node.prop(0, 'number');
    
        if (objectId) {
          const result2 = await traverseTree(objectsNode, connectionsNode, connectedObjectId);

          if (node.fbxNode.name === 'Model') {
            if (result2.meshes) {
              const [scaling] = node.node('Properties70')?.nodes({ 0: "Lcl Scaling" }) ?? [];
              const [trans] = node.node('Properties70')?.nodes({ 0: "Lcl Translation"}) ?? [];
              const [rot] = node.node('Properties70')?.nodes({ 0: "Lcl Rotation"}) ?? [];

              const xScale = scaling?.prop(4, 'number') ?? 1;
              const yScale = scaling?.prop(5, 'number') ?? 1;
              const zScale = scaling?.prop(6, 'number') ?? 1;

              const xRotation = rot?.prop(4, 'number') ?? 0;
              const yRotation = rot?.prop(5, 'number') ?? 0;
              const zRotation = rot?.prop(6, 'number') ?? 0;

              const xTranslation = (trans?.prop(4, 'number') ?? 0) / 100;
              const yTranslation = (trans?.prop(5, 'number') ?? 0) / 100;
              const zTranslation = (trans?.prop(5, 'number') ?? 0) / 100;

              for (const mesh of result2.meshes) {
                const model = await Mesh.create(mesh, 'lit');

                renderer?.document.addNode(model);

                renderer?.mainRenderPass.addDrawable(model);
            
                model.scale = vec3.create(xScale, yScale, zScale); 
                model.setFromAngles(degToRad(xRotation), degToRad(yRotation), degToRad(zRotation));
                model.translate = vec3.create(xTranslation, yTranslation, zTranslation); 
              }
            }
          }
        }
      }
    }
  }

  return result;
}

const LoadFbx: React.FC = () => {
  const handleOpenFile: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    if (event.target.files && event.target.files[0]) {
      const reader = new FileReader();

      reader.onload = (evt) => {
        if (evt.target) {
          try {
            const buffer = new Uint8Array(evt.target.result as ArrayBuffer)

            let fbx: FBXParser.FBXData;
            try {
              fbx = FBXParser.parseBinary(buffer)
            }
            catch (error) {
              var dataView = new DataView(evt.target.result as ArrayBuffer);
              const decoder = new TextDecoder();
              const text = decoder.decode(dataView);
              console.log(text[0]);
              fbx = FBXParser.parseText(text);
            }

            const root = new FBXParser.FBXReader(fbx);

            // const upAxis = root.node('GlobalSettings')?.node('Properties70')?.node('P', { 0: 'UpAxis' })?.prop(4, 'number')

            const connectionsNode = root.node('Connections');

            if (connectionsNode) {
              const objectsNode = root.node('Objects');

              if (objectsNode) {
                (async () => (
                  await traverseTree(objectsNode, connectionsNode, 0)
                ))()
              }
            }
          }
          catch (error) {
            console.log(error);
          }    
        }
      }
      
      reader.readAsArrayBuffer(event.target.files[0]);
    }
    else {
      console.log('no file selected')
    }
  };

  return (
    <UploadFileButton onFileSelection={handleOpenFile} label="import" />
  )
}

export default LoadFbx;
