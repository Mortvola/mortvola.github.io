class Gpu {
  device: GPUDevice | null = null;

  ready: Promise<boolean>

  constructor() {
    this.ready = new Promise<boolean>((resolve, reject) => {
      (async () => {
        if (!navigator.gpu) {
          reject();
          throw new Error('gpu not supported');
        }
      
        const adapter = await navigator.gpu.requestAdapter();
      
        if (!adapter) {
          reject();
          throw new Error('Could not acquire adapater.');
        }
      
        this.device = await adapter.requestDevice();
      
        if (!this.device) {
          reject();
          throw new Error('Could not acquire device');
        }

        resolve(true);
      })();
     })
  }
}

export const gpu = new Gpu();
