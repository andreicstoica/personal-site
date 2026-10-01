import { DITHER_LEVELS } from "./dither";
import { VISTA_WINDOWS } from "./landscapes";
import { MOON_MARIA, MOON_RADIUS } from "./moon";

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
uniform float uFlash, uFlashSecond, uFlashSeed, uGolden, uFlashOrigin, uFlashSplit;
uniform float uDust;
uniform float uBubbles;
uniform vec3 uCloudLit;
uniform vec3 uCloudShade;
uniform vec3 uRainColor;
uniform vec3 uFogColor;

const float STAR_CELL_SIZE = 2.0;
const float PHI_INVERSE = 0.61803398875;
const float PHI_INVERSE_SQUARED = 0.38196601125;

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

// Fractal noise. Low octaves set the shape, high ones the edge detail:
// clouds use five for ragged billows, fog and shading samples use three.
float fbm(vec2 p, int octaves) {
  float value = 0.0;
  float amplitude = 0.5;
  float total = 0.0;
  for (int i = 0; i < 5; i++) {
    if (i >= octaves) break;
    value += amplitude * noise(p);
    total += amplitude;
    p = p * 2.02 + vec2(17.3, 9.1);
    amplitude *= 0.5;
  }
  return value / total;
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

// Returns (core, distance). Segments past split draw from a second seed, so a
// repeat strike follows the first path to the split, then forks away from it.
vec2 boltAt(vec2 p, float cycle, float origin, float split) {
  float core = 0.0;
  float dist = 1e4;
  vec2 a = vec2(origin, 1.0);
  for (int i = 1; i <= 10; i++) {
    float n = float(i);
    float path = n > split ? cycle + 211.0 : cycle;
    float drift = (hash(vec2(path + 17.0, n)) - 0.5) * 3.4;
    vec2 b = vec2(a.x + drift + (origin - a.x) * 0.16, 1.0 + n * 2.8);
    float d = segment(p, a, b);
    dist = min(dist, d);
    core = max(core, 1.0 - smoothstep(0.06, 0.28, d));
    if (i == 3 || i == 6 || i == 8) {
      vec2 forkRoot = mix(a, b, 0.55);
      float forkSide = hash(vec2(path + 31.0, n)) < 0.5 ? -1.0 : 1.0;
      vec2 forkTip = forkRoot + vec2(forkSide * mix(2.4, 4.6, hash(vec2(path + 47.0, n))), mix(2.0, 3.5, hash(vec2(path + 59.0, n))));
      float firstFork = 1.0 - smoothstep(0.05, 0.22, segment(p, forkRoot, forkTip));
      core = max(core, firstFork * 0.55);
      vec2 nestedTip = forkTip + vec2(forkSide * mix(1.1, 2.5, hash(vec2(path + 71.0, n))), mix(1.2, 2.3, hash(vec2(path + 83.0, n))));
      float nestedFork = 1.0 - smoothstep(0.04, 0.15, segment(p, forkTip, nestedTip));
      core = max(core, nestedFork * 0.35);
    }
    a = b;
  }
  return vec2(core, dist);
}

// Light around a strike: a tight halo on the path and a wide bloom that widens
// as the pulse peaks, brightest in open sky and spilling onto the land.
vec3 strikeLight(vec2 p, float pulse, float cycle, float origin, float split, vec3 tint, float sky) {
  vec2 bolt = boltAt(p, cycle, origin, split);
  float halo = exp(-bolt.y / 1.6);
  float bloom = exp(-bolt.y / mix(5.0, 11.0, pulse));
  // The pulse-scaled lift flares the whole scene on the first frames and is
  // gone by mid-decay, so a strike reads as one hard flash.
  float lift = (0.1 + 0.32 * pulse) * mix(0.6, 1.0, sky);
  float light = lift + bolt.x * sky + (halo * 0.55 + bloom * 0.3) * mix(0.35, 1.0, sky);
  return tint * pulse * light;
}

void main() {
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
  vec2 p = uv * uPlateSize;
  float skyRamp = smoothstep(0.0, 0.78, uv.y);
  vec3 color = mix(uZenith, uHorizon, skyRamp);
  vec2 sunDelta = (uv - uSun) * vec2(3.3333, 1.0);
  float sunDistance = length(sunDelta);
  float visibility = 1.0 - max(uCloud * 0.85, uFog);
  float radius = mix(0.055 + uGolden * 0.035, 0.081, uNight);
  float core = exp(-pow(sunDistance / radius, 2.0) * 2.0);
  float glow = exp(-pow(sunDistance / (radius * 3.0), 2.0));
  vec3 sunColor = mix(mix(vec3(1.0, 0.91, 0.72), vec3(1.0, 0.68, 0.35), uGolden), vec3(0.65, 0.76, 0.86), uNight);
  // Day: a warm glow plus a broad lift, as bright air around the sun.
  // Night: a tight cool halo hugging the moon over a faint haze falloff.
  float sunLift = exp(-sunDistance / (radius * 7.0)) * 0.06;
  float moonHalo = exp(-pow(sunDistance / (radius * 2.0), 2.0)) * 0.16 + exp(-sunDistance / (radius * 5.0)) * 0.05;
  color += sunColor * visibility * mix(glow * (0.16 + uGolden * 0.13) + sunLift, moonHalo, uNight);
  color = mix(color, sunColor, core * visibility * 0.90 * (1.0 - uNight));

  vec2 starCell = floor(p / STAR_CELL_SIZE);
  float starIndex = starCell.x + starCell.y * 89.0;
  // Golden-ratio offsets break the coarse cell grid without clustered randomness.
  vec2 starOffset = vec2(fract((starIndex + 0.5) * PHI_INVERSE), fract((starIndex + 0.5) * PHI_INVERSE_SQUARED));
  vec2 starCenter = (starCell + 0.5) * STAR_CELL_SIZE + (starOffset - 0.5) * 1.1;
  vec2 starLocal = p - starCenter;
  float magnitude = hash(starCell + 19.0);
  float twinkle = 0.90 + 0.07 * sin(uTime * mix(0.45, 1.25, hash(starCell + 37.0)) + hash(starCell + 53.0) * 6.283185);
  float stars = step(0.958, hash(starCell)) * (1.0 - smoothstep(mix(0.10, 0.25, magnitude), 0.40, length(starLocal)));
  color += stars * mix(0.68, 1.16, magnitude) * twinkle * uNight * visibility * (1.0 - skyRamp);

  if (uNight > 0.5) {
    vec2 m = floor(sunDelta * 48.0 * 2.0) / 2.0 + 0.25;
    float limb = ${MOON_RADIUS} + 0.09 * sin(m.x * 3.0 + m.y * 2.0);
    if (length(m) <= limb) {
      float maria = 0.0;
      ${MOON_MARIA.map(([x, y, rx, ry]) => `maria = max(maria, 1.0 - step(1.0, dot((m - vec2(${x}, ${y})) / vec2(${rx}, ${ry}), (m - vec2(${x}, ${y})) / vec2(${rx}, ${ry}))));`).join("\n      ")}
      color = mix(color, mix(vec3(214.0, 223.0, 218.0), vec3(128.0, 151.0, 166.0), maria) / 255.0, visibility);
    }
  }

  // Domain-warped fBm billows like cumulus instead of smearing into haze.
  // Heavier weather lowers the threshold, so cover grows as solid bodies
  // rather than as a thicker veil.
  vec2 cloudP = vec2(p.x * 0.05 - uTime * uCloudSpeed, p.y * 0.11);
  vec2 warp = vec2(
    fbm(cloudP * 0.7 + vec2(3.1, 7.7), 3),
    fbm(cloudP * 0.7 + vec2(11.4, 2.9 + uTime * 0.01), 3)
  );
  vec2 cloudQ = cloudP + (warp - 0.5) * 1.1;
  float clouds = fbm(cloudQ, 5);
  // Rain (uCloud near 1) closes the sky to near overcast; cloudy keeps gaps.
  float threshold = mix(0.68, 0.36, uCloud) - 0.14 * smoothstep(0.85, 1.0, uCloud);
  float opacity = mix(0.35, 1.0, smoothstep(0.3, 0.8, uCloud)) * step(0.001, uCloud);
  float cover = smoothstep(threshold, threshold + 0.1, clouds) * opacity;
  // Less cloud just above a texel means it faces the sky: lit tops, shaded bellies.
  float above = fbm(cloudQ - vec2(0.0, 0.35), 3);
  float cloudLight = clamp(0.5 + (clouds - above) * 6.0 + (clouds - threshold) * 1.2, 0.0, 1.0);
  float wisps = smoothstep(0.46, 0.72, noise(vec2(p.x * 0.065 - uTime * 0.055, p.y * 0.38)));
  cover += wisps * (1.0 - smoothstep(0.15, 0.65, uv.y)) * (1.0 - uCloud) * 0.22 * (1.0 - uFog);
  color = mix(color, mix(uCloudShade, uCloudLit, cloudLight), cover * (1.0 - smoothstep(uSkyFrac, 0.86, uv.y)));

  float summitWisp = exp(-pow((p.y - 6.0 - sin(p.x * 0.1 - uTime * 0.07)) / 0.7, 2.0)) * exp(-pow((p.x - 90.0 - sin(uTime * 0.09) * 8.0) / 18.0, 2.0));
  color = mix(color, uCloudLit, summitWisp * uHood * 0.25);
  float depth = 0.0;
  float sky = 1.0;
  for (int i = 0; i < 3; i++) {
    float layer = float(i);
    vec4 surface = layerAt(uv, layer, uOffsets[i]);
    // Recover edge color after filtering transparent texels.
    vec3 albedo = surface.rgb / max(surface.a, 0.001);
    float detail = noise(vec2((p.x - uOffsets[i]) * 1.4, p.y * 2.0));
    float direction = clamp(0.55 + (uSun.x - uv.x) * 0.25 + (detail - 0.5) * 0.35, 0.0, 1.0);
    vec3 land = albedo * (uAmbient + uDirect * direction);
    land *= 1.0 - uLandShade * clouds * 0.3;
    if (i == 1) {
      vec2 local = vec2(p.x - uOffsets[i], p.y);
      float windows = ${VISTA_WINDOWS.map(([left, right, top, bottom]) => `(step(${left.toFixed(1)}, local.x) * (1.0 - step(${right.toFixed(1)}, local.x)) * step(${top.toFixed(1)}, local.y) * (1.0 - step(${bottom.toFixed(1)}, local.y)))`).join(" + ")};
      land += uWindowLight * windows;
    }
    float haze = (2.0 - layer) * 0.14 + uFog * (0.26 - layer * 0.08);
    land = mix(land, uHorizon, haze);
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

  if (uFog > 0.001) {
    // Fog banks settle in the middle and low scene over a thin base haze.
    // A slow drifting warp makes the banks curl and waft rather than slide
    // as a rigid texture; the near bank moves faster than the far one.
    float fogBreath = 0.87 + 0.13 * sin(uTime * 0.17);
    vec2 fogP = vec2(p.x * 0.032, p.y * 0.11);
    vec2 fogWarp = vec2(
      fbm(fogP * 0.6 + vec2(uTime * 0.03, 4.2), 3),
      fbm(fogP * 0.6 + vec2(7.9, -uTime * 0.02), 3)
    );
    float nearBank = fbm(fogP + (fogWarp - 0.5) * 1.4 - vec2(uTime * 0.05, 0.0), 3);
    float farBank = fbm(fogP * 0.7 + (fogWarp - 0.5) + vec2(31.0 - uTime * 0.025, 5.0), 3);
    float banks = smoothstep(0.32, 0.6, mix(farBank, nearBank, 0.6));
    float band = smoothstep(0.25, 0.6, uv.y);
    float veil = min(1.0, 0.28 + banks * band * 0.9);
    color = mix(color, uFogColor, uFog * fogBreath * veil * (1.0 - depth * 0.3));
  }
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
    // The repeat strike never overlaps the first, so each owns its glow.
    if (uFlash > 0.001) {
      color += strikeLight(p, uFlash * uLightning, uFlashSeed, uFlashOrigin, 99.0, uFlashLight, sky);
    }
    if (uFlashSecond > 0.001) {
      color += strikeLight(p, uFlashSecond * uLightning, uFlashSeed, uFlashOrigin, uFlashSplit, uFlashBlue, sky);
    }
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
