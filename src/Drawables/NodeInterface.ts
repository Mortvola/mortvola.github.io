import DrawableInterface from "./DrawableInterface";

interface NodeInterface {
  drawables: (DrawableInterface | NodeInterface)[];
}

export default NodeInterface;
