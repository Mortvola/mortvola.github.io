import { vec4, Vec4 } from 'wgpu-matrix';
import Mesh from "./Drawables/Mesh";

type SelectedItem = {
  mesh: Mesh,
  centroid: Vec4,
}

class SelectionList {
  selection: SelectedItem[] = []

  addItem(mesh: Mesh) {
    // Determine if mesh is already in the list. If so, don't add it.
    const result = this.selection.find((entry) => entry.mesh === mesh);

    if (!result) {
      const centroid = mesh.computeCentroid();

      this.selection.push({
        mesh,
        centroid,
      })  
    }
  }

  getCentroid(): Vec4 {
    const sum = this.selection.reduce((accum, item) => {
      const centroid = vec4.transformMat4(item.centroid, item.mesh.getTransform());
      
      return vec4.add(centroid, accum);
    }, vec4.create(0, 0, 0, 0))

    return vec4.divScalar(sum, this.selection.length);
  }

  clear() {
    this.selection = [];
  }
}

export default SelectionList;
