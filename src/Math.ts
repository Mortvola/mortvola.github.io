import { vec3, vec4, Vec3, Vec4 } from "wgpu-matrix";

export const degToRad = (d: number) => d * Math.PI / 180;

export const normalizeDegrees = (d: number) => {
  let normalized = d % 360;
  if (normalized < 0) {
    normalized += 360;
  }

  return normalized;
}

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

// This is based on formulas for computing area of a parallelogram.
// ||ba x ca|| = base * height
// ||ba x ca|| = ||ca|| * height
// height = ||ba x ca|| / ||ca||
// If ca is a unit vector then height = ||ba x ca||
// ray is assumed to be a unit vector
export const pointRayDistance = (origin: Vec4, ray: Vec4, point: Vec4) => {
  // Compute vector from origin to point
  let ba = vec3.subtract(point, origin);
  
  // ray is ca in forumla above
  return vec3.length(vec3.cross(ba, ray));
}

// Find the closest points between two rays.
// The derivation of the forumula is based on:
// Q1 = A1 + t1*B1
// Q2 = A2 + t2*B2
// where A1 and A2 are the origins of the rays and B1 and B2 are the directions of the rays
//
// The vector between the closest points:
// v = Q1 - Q1 = A1 + t1 * B1 - A2 - t2 * B2
//
// The vector will be orthoganol to the rays thus:
// v dot B1 = 0
// v dot B2 = 0
//
export const closestPointBetweenRays = (originA: Vec4, rayA: Vec4, originB: Vec4, rayB: Vec4) => {
  const a = vec3.dot(rayA, rayA);
  const b = vec3.dot(rayA, rayB);
  const c = vec3.dot(rayB, rayB);

  const d = vec3.dot(originA, rayA);
  const e = vec3.dot(originA, rayB);
  const f = vec3.dot(originB, rayA);
  const g = vec3.dot(originB, rayB);

  const t1 = (c * (f - d) + b * (e - g)) / (a * c - b * b);
  const p1 = vec4.add(originA, vec4.mulScalar(rayA, t1))

  const t2 = (b * (f - d) + a * (e - g)) / (a * c - b * b);
  const p2 = vec4.add(originB, vec4.mulScalar(rayB, t2))

  return {p1, p2};
}
