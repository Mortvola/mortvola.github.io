import Drawable from "./Drawable";
import SceneNode from "./SceneNode";

class Node extends SceneNode {
  drawables: (Drawable | Node)[] = [];
}

export default Node;
