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

const loadGeometry = async (
  geometry: FBXParser.FBXReaderNode,
  geoPctComplete: (pct: number) => void,
): Promise<SurfaceMesh | undefined> => {
  const vertices = geometry?.node('Vertices')?.prop(0, 'number[]') ?? [];
  const indexes = geometry?.node('PolygonVertexIndex')?.prop(0, 'number[]') ?? [];
  const normalsNode = geometry?.node('LayerElementNormal');

  const normals = normalsNode
    ?.node('Normals')
    ?.prop(0, 'number[]') ?? [];

  const mappingInformationType = normalsNode
    ?.node('MappingInformationType')
    ?.prop(0, 'string');

  const referenceInformationType = normalsNode
    ?.node('ReferenceInformationType')
    ?.prop(0, 'string');

  if (vertices.length !== 0 && indexes.length !== 0) {
    const m = new SurfaceMesh();

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
            geoPctComplete(i / indexes.length);

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
            geoPctComplete(i / indexes.length);

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
  meshes: Mesh[],
}

type Context = {
  totalOOConnections: number,
  connectionsProcessedCount: number,
  connectionsProcessed: [string, number, number, string][],
}

let yieldIterations = 0;

const traverseTree = async (
  context: Context,
  objectsNode: FBXParser.FBXReaderNode,
  connectionsNode: FBXParser.FBXReaderNode,
  objectId: number,
  setPercentComplete: (pct: number) => void,
  geoPctComplete: (pct: number | null) => void,
): Promise<Result> => {
  const result: Result = {
    meshes: [],
  };

  const connections = connectionsNode?.nodes({ 2: objectId }) ?? [];

  for (let connection of connections) {
    const connectedObjectId = connection.prop(1, 'number');
    const type = connection.prop(3, 'string') ?? '';
    const c = connection.prop(0, 'string') ?? '';

    const processed = context.connectionsProcessed.find(
      (p) => p[0] === c && p[1] === connectedObjectId && p[2] === objectId && p[3] === type
    );

    if (processed) {
      continue;
    }

    if (connectedObjectId) {
      const nodes = objectsNode?.nodes({ 0: connectedObjectId }) ?? [];

      const node = nodes[0];

      if (node) {
        if (node.fbxNode.name === 'Geometry') {
          const geometry = await loadGeometry(node, geoPctComplete);

          if (geometry) {
            const mesh = await Mesh.create(geometry, 'lit');
            
            mesh.name =  node.prop(1, 'string')?.split('::')[1] ?? 'Mesh';

            result.meshes.push(mesh);
          }

          geoPctComplete(null);
        }
        
        const objectId = node.prop(0, 'number');
    
        if (objectId) {
          const result2 = await traverseTree(context, objectsNode, connectionsNode, connectedObjectId, setPercentComplete, geoPctComplete);

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
                renderer?.document.addNode(mesh);

                renderer?.mainRenderPass.addDrawable(mesh);
            
                mesh.scale = vec3.create(xScale, yScale, zScale); 
                mesh.setFromAngles(degToRad(xRotation), degToRad(yRotation), degToRad(zRotation));
                mesh.translate = vec3.create(xTranslation, yTranslation, zTranslation); 
              }
            }
          }
        }
        else {
          console.log(`Object Id not found: ${objectId}`)
        }
      }

      context.connectionsProcessed.push([c, connectedObjectId, objectId, type])
      context.connectionsProcessedCount += 1;  
  
      setPercentComplete(context.connectionsProcessedCount / context.totalOOConnections)
    }
    else {
      console.log('Connected object Id not found.')
    }

    yieldIterations += 1;

    if (yieldIterations > 500) {
      await yieldToMain();
      yieldIterations = 0;
    }
  }

  return result;
}

const LoadFbx: React.FC = () => {
  const [percentComplete, setPercentComplete] = React.useState<number | null>(null);
  const [geoPercent, setGeoPercent] = React.useState<number | null>(null);

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
                (async () => {
                  type ConnectionEdge = {
                    type: string,
                    objectId: number,
                    parentObjectId: number,
                    subType: string,
                    visited: boolean,
                  }
                  let edges: ConnectionEdge[] = [];

                  for (const node of connectionsNode.fbxNode.nodes) {
                    const type = node.props[0] as string;
                    const id1 = node.props[1] as number;
                    const id2 = node.props[2] as number;
                    const subType = node.props[3] as string ?? '';

                    const edge = edges.find((e) => e.type === type && e.objectId === id1 && e.parentObjectId === id2 && e.subType === subType)

                    if (edge) {
                      console.log(`duplicate edge: ${edge}`)
                    }
                    else {
                      edges.push({ type, objectId: id1, parentObjectId: id2, subType, visited: false })
                    }
                  }

                  const stack: number[] = [0];

                  while (stack.length > 0) {
                    const parentId = stack.pop()

                    for (const edge of edges) {
                      if (!edge.visited && edge.parentObjectId === parentId) {
                        edge.visited = true;
                        stack.push(edge.objectId);
                      }
                    }  
                  }

                  edges = edges.filter((edge) => edge.visited);
                  
                  const context: Context = {
                    totalOOConnections: edges.length,
                    connectionsProcessedCount: 0,
                    connectionsProcessed: [],
                  }
                  
                  setPercentComplete(0);

                  await yieldToMain()

                  await traverseTree(
                    context,
                    objectsNode,
                    connectionsNode,
                    0,
                    (pct: number | null) => setPercentComplete(pct),
                    (pct: number | null) => setGeoPercent(pct),
                  );

                  setPercentComplete(null);
                  setGeoPercent(null);
                })()
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
    <>
    {
      percentComplete !== null
        ? (
          <div>
            <div>Loading File: {`${(percentComplete * 100).toFixed(0)}%`}</div>
            {
              geoPercent !== null
                ? <div>Loading Geometry: {`${((geoPercent ?? 0) * 100).toFixed(0)}%`}</div>
                : null
            }
          </div>
        )
        : <UploadFileButton onFileSelection={handleOpenFile} label="import" />
    }
    </>
  )
}

export default LoadFbx;
