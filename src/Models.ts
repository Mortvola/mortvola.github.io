import { makeObservable, observable } from 'mobx';
import Mesh from "./Drawables/Mesh";

class Models {
  meshes: Mesh[] = []

  constructor() {
    makeObservable(this, {
      meshes: observable,
    });
  }
}

export default Models;
