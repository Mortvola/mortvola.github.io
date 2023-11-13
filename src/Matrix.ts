export const degToRad = (d: number) => d * Math.PI / 180;

export const identity = (dst?: Float32Array) => {
  dst = dst || new Float32Array(16);

  dst[0] = 1.0;
  dst[1] = 0.0;
  dst[2] = 0.0;
  dst[3] = 0.0;

  dst[4] = 0.0;
  dst[5] = 1.0;
  dst[6] = 0.0;
  dst[7] = 0.0;

  dst[8] = 0.0;
  dst[9] = 0.0;
  dst[10] = 1.0;
  dst[11] = 0.0;

  dst[12] = 0.0;
  dst[13] = 0.0;
  dst[14] = 0.0;
  dst[15] = 1.0;

  return dst;
}

export const perspective = (fieldOfViewYInRadians: number, aspect: number, zNear: number, zFar: number, dst?: Float32Array) => {
  dst = dst || new Float32Array(16);

  const f = Math.tan(Math.PI * 0.5 - 0.5 * fieldOfViewYInRadians);
  const rangeInv = 1 / (zNear - zFar);

  dst[0] = f / aspect;
  dst[1] = 0;
  dst[2] = 0;
  dst[3] = 0;

  dst[4] = 0;
  dst[5] = f;
  dst[6] = 0;
  dst[7] = 0;

  dst[8] = 0;
  dst[9] = 0;
  dst[10] = zFar * rangeInv;
  dst[11] = -1;

  dst[12] = 0;
  dst[13] = 0;
  dst[14] = zNear * zFar * rangeInv;
  dst[15] = 0;

  return dst;
}

export const translate = (tx: number, ty: number, tz: number, dst?: Float32Array) => {
  dst = dst || new Float32Array(16);
  dst[ 0] = 1;   dst[ 1] = 0;   dst[ 2] = 0;   dst[ 3] = 0;
  dst[ 4] = 0;   dst[ 5] = 1;   dst[ 6] = 0;   dst[ 7] = 0;
  dst[ 8] = 0;   dst[ 9] = 0;   dst[10] = 1;   dst[11] = 0;
  dst[12] = tx;  dst[13] = ty;  dst[14] = tz;  dst[15] = 1;
  return dst;
}
