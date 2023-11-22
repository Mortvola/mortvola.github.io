import SceneNode from "./SceneNode";
import SceneNodeInterface from "./SceneNodeInterface";

class ContainerNode extends SceneNode {
  nodes: SceneNodeInterface[] = [];
}

export const isContainerNode = (r: unknown): r is ContainerNode => (
  (r as ContainerNode).nodes !== undefined
)

export default ContainerNode;
