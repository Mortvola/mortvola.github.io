import { vec4, Vec4 } from 'wgpu-matrix';
import { makeObservable, observable } from 'mobx';
import Drawable from './Drawables/Drawable';

type SelectedItem = {
  drawable: Drawable,
  centroid: Vec4,
}

class SelectionList {
  selection: SelectedItem[] = []

  constructor() {
    makeObservable(this, {
      selection: observable,
    })
  }

  addItem(drawable: Drawable) {
    // Determine if mesh is already in the list. If so, don't add it.
    const result = this.selection.find((entry) => entry.drawable === drawable);

    if (!result) {
      const centroid = drawable.computeCentroid();

      this.selection.push({
        drawable,
        centroid,
      })  
    }
  }

  // Returns centroid of all selected objects in world space coordinates.
  getCentroid(): Vec4 {
    const sum = this.selection.reduce((accum, item) => {
      const centroid = vec4.transformMat4(item.centroid, item.drawable.getTransform());
      
      return vec4.add(centroid, accum);
    }, vec4.create(0, 0, 0, 0))

    return vec4.divScalar(sum, this.selection.length);
  }

  clear() {
    this.selection = [];
  }
}

export default SelectionList;
