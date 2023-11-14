import { vec3, vec4, Vec3, Vec4 } from "wgpu-matrix";

export const degToRad = (d: number) => d * Math.PI / 180;

// Implementation of the Möller-Trumbore algorithm
export const intersectTriangle = (
  origin: Vec3, dir: Vec3, v0: Vec3, v1: Vec3, v2: Vec3,
): [number, number, number] | null => {
  const epsilon = 0.000001;

  const edge1 = vec3.subtract(v1, v0);
  const edge2 = vec3.subtract(v2, v0);

  const pvec = vec3.cross(dir, edge2);

  const det = vec3.dot(edge1, pvec);

  if (det < epsilon) {
    return null;
  }

  const inverseDet = 1 / det;

  const tvec = vec3.subtract(origin, v0);

  const u = vec3.dot(tvec, pvec) * inverseDet;
  if (u < 0.0 || u > 1.0) {
    return null;
  }

  const qvec = vec3.cross(tvec, edge1);

  const v = vec3.dot(dir, qvec) * inverseDet;
  if (v < 0.0 || u + v > 1.0) {
    return null;
  }

  const t = vec3.dot(edge2, qvec) * inverseDet;

  return [t, u, v];
}

export const intersectionPlane = (planePoint: Vec4, planeNormal: Vec4, origin: Vec4, ray: Vec4): Vec4 | null => {
  const denom = vec4.dot(ray, planeNormal);

  if (denom < -1e-6 || denom > 1e-6) {
    const v = vec4.subtract(planePoint, origin);
    const t = vec4.dot(v, planeNormal) / denom;

    if (t >= 0) {
      return vec4.add(origin, vec4.mulScalar(ray, t))
    }
  }

  return null;
}