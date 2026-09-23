import { DITHER_LEVELS } from "./dither";
import { VISTA_WINDOWS } from "./landscapes";

export const BANNER_VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

export const BANNER_FRAG = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 outColor;

uniform sampler2D uPlate;
uniform vec3 uZenith, uHorizon, uAmbient, uDirect, uOffsets;
uniform vec2 uSun;
uniform vec3 uWindowLight, uFlashLight, uFlashBlue;
uniform float uNight, uHood, uBirds;
uniform float uAtlasWidth, uDitherSize;
uniform vec2 uPlateSize;
uniform float uTime;
uniform float uSkyFrac;
uniform float uCloud;
uniform float uCloudSpeed;
uniform float uLandShade;
uniform float uRain;
uniform float uRainSpeed;
uniform float uRainColumns;
uniform float uRainLength;
uniform float uFog;
uniform float uShimmer;
uniform float uLightning;
uniform float uFlash, uFlashSeed, uGolden, uFlashOrigin, uFlashCool;
uniform float uDust;
uniform float uBubbles;
uniform vec3 uCloudLit;
uniform vec3 uCloudShade;
uniform vec3 uRainColor;
uniform vec3 uFogColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

vec4 layerAt(vec2 uv, float layer, float offset) {
  float margin = (uAtlasWidth - uPlateSize.x) * 0.5;
  float x = (uv.x * uPlateSize.x + margin - offset) / uAtlasWidth;
  float y = clamp(uv.y, 0.5 / 192.0, 1.0 - 0.5 / 192.0);
  return texture(uPlate, vec2(x, (layer + y) / 3.0));
}

float bayer(vec2 pixel) {
  vec2 a = mod(floor(pixel), 2.0);
  vec2 b = mod(floor(pixel / 2.0), 2.0);
  return (4.0 * (2.0 * a.x + 3.0 * a.y - 4.0 * a.x * a.y)
    + (2.0 * b.x + 3.0 * b.y - 4.0 * b.x * b.y) + 0.5) / 16.0 - 0.5;
}

float segment(vec2 p, vec2 a, vec2 b) {
  vec2 d = b - a;
  return length(p - a - d * clamp(dot(p - a, d) / dot(d, d), 0.0, 1.0));
}

void main() {
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
  vec2 p = uv * uPlateSize;
  float skyRamp = smoothstep(0.0, 0.78, uv.y);
  vec3 color = mix(uZenith, uHorizon, skyRamp);
  vec2 sunDelta = (uv - uSun) * vec2(3.3333, 1.0);
  float sunDistance = length(sunDelta);
  float visibility = 1.0 - max(uCloud * 0.85, uFog);
  float radius = mix(0.055 + uGolden * 0.035, 0.035, uNight);
  float core = exp(-pow(sunDistance / radius, 2.0) * 2.0);
  float glow = exp(-pow(sunDistance / (radius * 3.0), 2.0));
  vec3 sunColor = mix(mix(vec3(1.0, 0.91, 0.72), vec3(1.0, 0.68, 0.35), uGolden), vec3(0.65, 0.76, 0.86), uNight);
  color += sunColor * glow * visibility * mix(0.13 + uGolden * 0.13, 0.045, uNight);
  color = mix(color, sunColor, core * visibility * mix(0.85, 0.55, uNight));

  vec2 starCell = floor(p);
  vec2 starLocal = fract(p) - 0.5;
  float magnitude = hash(starCell + 19.0);
  float twinkle = 0.78 + 0.22 * sin(uTime * mix(0.7, 2.1, hash(starCell + 37.0)) + hash(starCell + 53.0) * 6.283185);
  float stars = step(0.989, hash(starCell)) * (1.0 - smoothstep(mix(0.12, 0.3, magnitude), 0.48, length(starLocal)));
  color += stars * mix(0.65, 1.2, magnitude) * twinkle * uNight * visibility * (1.0 - skyRamp);

  float clouds = noise(vec2(p.x * 0.035 - uTime * uCloudSpeed, p.y * 0.10));
  clouds = clouds * 0.65 + noise(vec2(p.x * 0.095 - uTime * uCloudSpeed * 3.4, p.y * 0.23)) * 0.35;
  float cover = smoothstep(0.38, 0.78, clouds) * uCloud;
  float wisps = smoothstep(0.46, 0.72, noise(vec2(p.x * 0.065 - uTime * 0.055, p.y * 0.38)));
  cover += wisps * (1.0 - smoothstep(0.15, 0.65, uv.y)) * (1.0 - uCloud) * 0.22 * (1.0 - uFog);
  color = mix(color, mix(uCloudShade, uCloudLit, clouds), cover * (1.0 - smoothstep(uSkyFrac, 0.86, uv.y)));

  float summitWisp = exp(-pow((p.y - 6.0 - sin(p.x * 0.1 - uTime * 0.07)) / 0.7, 2.0)) * exp(-pow((p.x - 90.0 - sin(uTime * 0.09) * 8.0) / 18.0, 2.0));
  color = mix(color, uCloudLit, summitWisp * uHood * 0.25);
  float flash = uFlash * uLightning;
  vec3 flashColor = mix(uFlashLight, uFlashBlue, uFlashCool);
  color *= 1.0 - flash * 0.6;
  float depth = 0.0;
  float sky = 1.0;
  for (int i = 0; i < 3; i++) {
    float layer = float(i);
    vec4 surface = layerAt(uv, layer, uOffsets[i]);
    // Recover edge color after filtering transparent texels.
    vec3 albedo = surface.rgb / max(surface.a, 0.001);
    float detail = noise(vec2((p.x - uOffsets[i]) * 1.4, p.y * 2.0));
    float direction = clamp(0.55 + (uSun.x - uv.x) * 0.25 + (detail - 0.5) * 0.35, 0.0, 1.0);
    // Broad cloud light reaches the full silhouette without a fixed-height hotspot.
    vec2 toFlash = vec2(uFlashOrigin - p.x, -18.0 - p.y);
    float falloff = 0.12 + 0.88 * exp(-pow(toFlash.x / 60.0, 2.0) - pow(toFlash.y / 130.0, 2.0));
    float flashFacing = 0.88 + 0.12 * normalize(toFlash).y;
    vec3 land = albedo * ((uAmbient + uDirect * direction) * (1.0 - flash * 0.55) + flashColor * flash * falloff * flashFacing * 1.65);
    land *= 1.0 - uLandShade * clouds * 0.3;
    if (i == 1) {
      vec2 local = vec2(p.x - uOffsets[i], p.y);
      float windows = ${VISTA_WINDOWS.map(([left, right, top, bottom]) => `(step(${left.toFixed(1)}, local.x) * (1.0 - step(${right.toFixed(1)}, local.x)) * step(${top.toFixed(1)}, local.y) * (1.0 - step(${bottom.toFixed(1)}, local.y)))`).join(" + ")};
      land += uWindowLight * windows;
    }
    float haze = (2.0 - layer) * 0.14 + uFog * (0.42 - layer * 0.13);
    land = mix(land, uHorizon * (1.0 - flash * 0.6), haze);
    color = mix(color, land, surface.a);
    depth = mix(depth, (layer + 1.0) / 3.0, surface.a);
    sky *= 1.0 - surface.a;
  }

  float birds = 0.0;
  for (int i = 0; i < 3; i++) {
    float id = float(i);
    float speed = 1.8 + id * 0.63;
    float travel = mod(uTime * speed + id * 61.0 + 22.0, 210.0) - 25.0;
    float height = 6.0 + id * 3.3 + sin(uTime * 0.3 + id) * 0.6;
    vec2 bird = p - vec2(travel, height);
    float flap = 0.5 + 0.5 * sin((uTime * (1.7 + id * 0.13) + id * 0.3) * 6.283185);
    float wingY = mix(-0.65, 0.12, flap);
    float shape = min(segment(bird, vec2(-1.0, wingY), vec2(0.0, 0.0)), segment(bird, vec2(0.0, 0.0), vec2(1.0, wingY)));
    float fade = smoothstep(0.0, 18.0, travel) * (1.0 - smoothstep(142.0, 160.0, travel));
    fade *= 0.55 + 0.45 * sin(uTime * 0.21 + id * 2.0);
    birds = max(birds, (1.0 - smoothstep(0.09, 0.23, shape)) * fade);
  }
  color = mix(color, uZenith * 0.28, birds * sky * uBirds * (1.0 - uNight) * (0.7 - uFog * 0.35));

  float fogBreath = 0.87 + 0.13 * sin(uTime * 0.17);
  float mist = noise(vec2(p.x * 0.055 - uTime * 0.04, p.y * 0.12));
  color = mix(color, uFogColor, uFog * fogBreath * (0.16 + mist * 0.3) * (1.0 - depth * 0.65));
  color += uDirect * uShimmer * 0.07 * sin(p.y * 6.0 + sin(p.x * 0.3 - uTime)) * (1.0 - sky);

  if (uRain > 0.001) {
    float gust = 0.5 + 0.3 * sin(uTime * 0.23) + 0.2 * sin(uTime * 0.071 + 1.7);
    // Integrating speed keeps drops continuous while gusts accelerate them.
    float rainTravel = uTime - 0.3 / 0.23 * cos(uTime * 0.23) - 0.2 / 0.071 * cos(uTime * 0.071 + 1.7);
    for (int i = 0; i < 3; i++) {
      float z = float(i);
      float scale = 1.6 - z * 0.4;
      vec2 rainP = vec2(p.x + p.y * (0.12 + gust * 0.12 + z * 0.035), p.y) * scale;
      float columnSeed = hash(vec2(floor(rainP.x / 3.0), z + 91.0));
      rainP.y += columnSeed * 12.0;
      rainP.y -= rainTravel * uRainSpeed * (28.0 + z * 19.0) * (0.8 + columnSeed * 0.4);
      vec2 cell = floor(rainP / vec2(3.0, 12.0));
      vec2 local = mod(rainP, vec2(3.0, 12.0));
      float random = hash(cell + z * 73.0);
      float width = 0.045 + z * 0.025;
      float line = 1.0 - smoothstep(width, width + 0.08, abs(local.x - 0.4 - random * 2.0));
      float length = (1.0 + random * 3.0) * (0.6 + uRainLength * 8.0) * (0.8 + gust * 0.4 + 0.12 * sin(uTime * 0.9 + columnSeed * 6.28));
      float tail = smoothstep(0.0, length, local.y) * (1.0 - smoothstep(length, min(11.8, length + 0.4), local.y));
      tail *= smoothstep(0.0, 0.2, local.x) * (1.0 - smoothstep(2.8, 3.0, local.x));
      float drop = line * tail * smoothstep(1.0 - uRainColumns / 160.0 * (0.7 + gust * 0.5), 1.08 - uRainColumns / 160.0 * (0.7 + gust * 0.5), random);
      vec3 rainLight = mix(uRainColor, uHorizon + vec3(0.16), 0.5);
      color = mix(color, rainLight, drop * uRain * (0.18 + z * 0.18));
    }
    vec2 splashCell = floor(vec2(p.x / 5.0, p.y / 2.0));
    float seed = hash(splashCell);
    float phase = fract(uTime * 1.2 + seed * 7.0);
    vec2 local = fract(vec2(p.x / 5.0, p.y / 2.0)) - 0.5;
    float ring = 1.0 - smoothstep(0.02, 0.07, abs(length(local * vec2(1.0, 2.8)) - phase * 0.5));
    color += uRainColor * ring * pow(sin(phase * 3.141593), 2.0) * step(0.78, seed) * step(0.73, uv.y) * (1.0 - sky) * uRain * 0.22;
  }

  if (uLightning > 0.001) {
    float cycle = uFlashSeed;
    float origin = uFlashOrigin;
    float bolt = 0.0;
    vec2 a = vec2(origin, 1.0);
    for (int i = 1; i <= 7; i++) {
      float n = float(i);
      vec2 b = vec2(origin + (hash(vec2(cycle, n)) - 0.5) * 9.0, n * 3.6);
      bolt = max(bolt, 1.0 - smoothstep(0.08, 0.35, segment(p, a, b)));
      if (i == 3 || i == 5) bolt = max(bolt, (1.0 - smoothstep(0.04, 0.2, segment(p, a, a + vec2(5.0, 4.0)))) * 0.7);
      a = b;
    }
    color += flashColor * flash * (bolt * sky + exp(-pow((p.x - origin) / 18.0, 2.0)) * sky * 0.18);
  }

  vec2 moteP = p * vec2(1.5, 2.0) - vec2(uTime * 0.18, uTime * 0.08);
  vec2 cell = floor(moteP);
  vec2 point = fract(moteP) - vec2(hash(cell), hash(cell + 3.0));
  float mote = exp(-dot(point, point) * 150.0) * step(0.97, hash(cell + 9.0));
  mote *= smoothstep(0.0, 0.15, fract(moteP.x)) * (1.0 - smoothstep(0.85, 1.0, fract(moteP.x))) * smoothstep(0.0, 0.15, fract(moteP.y)) * (1.0 - smoothstep(0.85, 1.0, fract(moteP.y)));
  color += (uHorizon + uDirect) * mote * (0.035 + uDust * 0.16 + uBubbles * step(0.8, uv.y) * 0.12);
  float vignette = 1.0 - 0.10 * dot(uv - 0.5, uv - 0.5);
  color *= vignette;
  // Fixed CSS-sized cells remain visible at both supported device pixel ratios.
  color = floor(clamp(color, 0.0, 1.0) * ${(DITHER_LEVELS - 1).toFixed(1)} + 0.5 + bayer(gl_FragCoord.xy / uDitherSize)) / ${(DITHER_LEVELS - 1).toFixed(1)};
  outColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;
