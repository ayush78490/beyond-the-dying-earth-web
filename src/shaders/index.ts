/**
 * Shader sources, assembled once. GLSL lives in plain files (imported as raw strings
 * by Vite) so it gets proper syntax highlighting and diffs.
 */
import common from './common.glsl?raw';
import backdropVertRaw from './backdrop.vert?raw';
import backdropFragRaw from './backdrop.frag?raw';
import water from './water.glsl?raw';
import planet from './planet.glsl?raw';
import quadVertRaw from './quad.vert?raw';
import portalFragRaw from './portal.frag?raw';
import beamFragRaw from './beam.frag?raw';
import atmosphereVertRaw from './atmosphere.vert?raw';
import atmosphereFragRaw from './atmosphere.frag?raw';
import mistFragRaw from './mist.frag?raw';
import portalParticlesVertRaw from './portalParticles.vert?raw';
import dustVertRaw from './dust.vert?raw';
import lightsVertRaw from './lights.vert?raw';
import glowPointFragRaw from './glowPoint.frag?raw';
import earthVertRaw from './earth.vert?raw';
import earthFragRaw from './earth.frag?raw';
import earthAtmoFragRaw from './earthAtmosphere.frag?raw';
import ashVertRaw from './ash.vert?raw';
import energyVertRaw from './energy.vert?raw';
import orbitVertRaw from './orbit.vert?raw';
import crystalFragRaw from './crystal.frag?raw';
import earthBakeFragRaw from './earthBake.frag?raw';
import dioramaFragRaw from './diorama.frag?raw';
import skyVertRaw from './sky.vert?raw';
import skyFragRaw from './sky.frag?raw';
import nebulaFragRaw from './nebula.frag?raw';
import cloudFragRaw from './cloud.frag?raw';
import starsVertRaw from './stars.vert?raw';

const withCommon = (src: string) => `${common}\n${src}`;

export const backdropVert = backdropVertRaw;
export const backdropFrag = withCommon(
  backdropFragRaw.replace('//#pragma water', water).replace('//#pragma planet', planet),
);
export const quadVert = quadVertRaw;
export const portalFrag = withCommon(portalFragRaw);
export const beamFrag = withCommon(beamFragRaw);
export const atmosphereVert = atmosphereVertRaw;
export const atmosphereFrag = withCommon(atmosphereFragRaw);
export const mistFrag = withCommon(mistFragRaw);
export const portalParticlesVert = portalParticlesVertRaw;
export const dustVert = dustVertRaw;
export const lightsVert = lightsVertRaw;
export const glowPointFrag = glowPointFragRaw;
export const earthVert = earthVertRaw;
export const earthFrag = withCommon(earthFragRaw);
export const earthAtmoFrag = earthAtmoFragRaw;
export const ashVert = ashVertRaw;
export const energyVert = energyVertRaw;
export const orbitVert = orbitVertRaw;
export const crystalFrag = crystalFragRaw;
export const earthBakeFrag = withCommon(earthBakeFragRaw);
export const dioramaFrag = withCommon(
  dioramaFragRaw.replace('//#pragma water', water).replace('//#pragma planet', planet),
);
export const skyVert = skyVertRaw;
export const skyFrag = withCommon(skyFragRaw);
export const nebulaFrag = withCommon(nebulaFragRaw);
export const cloudFrag = withCommon(cloudFragRaw);
export const starsVert = starsVertRaw;
