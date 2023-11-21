class Gpu {
  device: GPUDevice;

  constructor(device: GPUDevice) {
    this.device = device;
  }

  static async create(): Promise<Gpu | null> {
    if (navigator.gpu) {
      const adapter = await navigator.gpu.requestAdapter();
  
      if (adapter) {  
        const device = await adapter.requestDevice();
      
        if (device) {
          return new Gpu(device);
        }
      }
    }

    return null;
  }
}

export default Gpu;
