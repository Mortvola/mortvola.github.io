import { createContext, useContext } from "react";
import Models from "../Models";

class Store implements StoreInterface {
  document = new Models();
}

const store = new Store();

const StoreContext = createContext(store);

const useStores = (): Store => (
  useContext(StoreContext)
);

export { StoreContext, store, useStores };
