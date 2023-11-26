import { createContext, useContext } from "react";

class Store implements StoreInterface {
}

const store = new Store();

const StoreContext = createContext(store);

const useStores = (): Store => (
  useContext(StoreContext)
);

export { StoreContext, store, useStores };
