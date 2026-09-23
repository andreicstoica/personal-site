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
uniform vec3 uZenith, uHorizon, uAmbient, uDirect, uSpeeds;
uniform vec2 uSun;
uniform float uNight, uCoast;
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
uniform float uLightningGap;
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

vec4 layerAt(vec2 uv, float layer, float speed) {
  float x = fract(uv.x - mod(uTime * speed, uPlateSize.x) / uPlateSize.x);
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
  color += uDirect * exp(-sunDistance * 6.0) * visibility * 0.55;
  float disc = 1.0 - smoothstep(0.027, 0.031, sunDistance);
  color = mix(color, mix(vec3(1.0, 0.88, 0.64), vec3(0.78, 0.86, 0.9), uNight), disc * visibility);

  vec2 starCell = floor(p * 2.0);
  vec2 starLocal = fract(p * 2.0) - 0.5;
  float stars = step(0.996, hash(starCell)) * exp(-dot(starLocal, starLocal) * 65.0);
  color += stars * uNight * visibility * (1.0 - skyRamp) * 0.55;

  float clouds = noise(vec2(p.x * 0.035 - uTime * uCloudSpeed, p.y * 0.10));
  clouds = clouds * 0.65 + noise(vec2(p.x * 0.095 - uTime * uCloudSpeed * 1.5, p.y * 0.23)) * 0.35;
  float cover = smoothstep(0.38, 0.78, clouds) * uCloud;
  color = mix(color, mix(uCloudShade, uCloudLit, clouds), cover * (1.0 - smoothstep(uSkyFrac, 0.86, uv.y)));

  float depth = 0.0;
  float sky = 1.0;
  for (int i = 0; i < 3; i++) {
    float layer = float(i);
    vec4 surface = layerAt(uv, layer, uSpeeds[i]);
    // Recover edge color after filtering transparent texels.
    vec3 albedo = surface.rgb / max(surface.a, 0.001);
    float detail = noise(vec2(p.x * 1.4 - uTime * uSpeeds[i] * 1.4, p.y * 2.0));
    float direction = clamp(0.55 + (uSun.x - uv.x) * 0.25 + (detail - 0.5) * 0.35, 0.0, 1.0);
    vec3 land = albedo * (uAmbient + uDirect * direction);
    land *= 1.0 - uLandShade * clouds * 0.3;
    float haze = (2.0 - layer) * 0.14 + uFog * (0.42 - layer * 0.13);
    land = mix(land, uHorizon, haze);
    color = mix(color, land, surface.a);
    depth = mix(depth, (layer + 1.0) / 3.0, surface.a);
    sky *= 1.0 - surface.a;
  }

  float mist = noise(vec2(p.x * 0.055 - uTime * 0.04, p.y * 0.12));
  color = mix(color, uFogColor, uFog * (0.16 + mist * 0.3) * (1.0 - depth * 0.65));
  color += uDirect * uShimmer * 0.07 * sin(p.y * 6.0 + sin(p.x * 0.3 - uTime)) * (1.0 - sky);

  // A passing dorsal fin stays in the offshore band and behind the beach.
  if (uCoast > 0.5) {
    float whaleX = mod(uTime * 1.6 + 35.0, 190.0) - 15.0;
    vec2 whale = p - vec2(whaleX, 27.5);
    float body = 1.0 - smoothstep(0.8, 1.0, length(whale / vec2(3.4, 0.55)));
    float fin = step(-1.8, whale.y) * step(whale.y, 0.0) * (1.0 - smoothstep(0.12, 0.28, abs(whale.x + whale.y * 0.25)));
    color = mix(color, vec3(0.025, 0.045, 0.055) * (uAmbient + uDirect), max(body, fin) * (1.0 - step(0.5, depth)));
    float eye = 1.0 - smoothstep(0.7, 1.0, length((whale - vec2(1.7, -0.1)) / vec2(0.55, 0.19)));
    color = mix(color, uHorizon, eye * body * (1.0 - step(0.5, depth)));
    float wave = sin(p.y * 8.0 + sin(p.x * 0.22 + uTime * 0.6));
    color += uHorizon * 0.07 * smoothstep(0.8, 1.0, wave) * step(22.0, p.y) * (1.0 - step(0.5, depth));
  }

  if (uRain > 0.001) {
    for (int i = 0; i < 3; i++) {
      float z = float(i);
      float scale = 1.6 - z * 0.4;
      vec2 rainP = vec2(p.x + p.y * (0.18 + z * 0.035), p.y) * scale;
      float columnSeed = hash(vec2(floor(rainP.x / 3.0), z + 91.0));
      rainP.y += columnSeed * 12.0;
      rainP.y -= uTime * uRainSpeed * (28.0 + z * 19.0) * (0.8 + columnSeed * 0.4);
      vec2 cell = floor(rainP / vec2(3.0, 12.0));
      vec2 local = mod(rainP, vec2(3.0, 12.0));
      float random = hash(cell + z * 73.0);
      float width = 0.045 + z * 0.025;
      float line = 1.0 - smoothstep(width, width + 0.08, abs(local.x - 0.4 - random * 2.0));
      float length = (1.0 + random * 3.0) * (0.6 + uRainLength * 8.0);
      float tail = smoothstep(0.0, length, local.y) * (1.0 - smoothstep(length, length + 0.4, local.y));
      float drop = line * tail * step(1.0 - uRainColumns / 160.0, random);
      vec3 rainLight = mix(uRainColor, uHorizon + vec3(0.16), 0.5);
      color = mix(color, rainLight, drop * uRain * (0.13 + z * 0.13));
    }
    vec2 splashCell = floor(vec2(p.x / 5.0, p.y / 2.0));
    float seed = hash(splashCell);
    float phase = fract(uTime * 1.2 + seed * 7.0);
    vec2 local = fract(vec2(p.x / 5.0, p.y / 2.0)) - 0.5;
    float ring = 1.0 - smoothstep(0.02, 0.07, abs(length(local * vec2(1.0, 2.8)) - phase * 0.5));
    color += uRainColor * ring * (1.0 - phase) * step(0.78, seed) * step(0.73, uv.y) * (1.0 - sky) * uRain * 0.22;
  }

  if (uLightning > 0.001) {
    float cycle = floor(uTime / uLightningGap);
    float phase = mod(uTime, uLightningGap);
    float flash = (1.0 - smoothstep(0.03, 0.18, phase)) * step(0.72, hash(vec2(cycle, 8.0))) * uLightning;
    float origin = 25.0 + hash(vec2(cycle, 2.0)) * 110.0;
    float bolt = 0.0;
    vec2 a = vec2(origin, 1.0);
    for (int i = 1; i <= 7; i++) {
      float n = float(i);
      vec2 b = vec2(origin + (hash(vec2(cycle, n)) - 0.5) * 9.0, n * 3.6);
      bolt = max(bolt, 1.0 - smoothstep(0.08, 0.35, segment(p, a, b)));
      if (i == 3 || i == 5) bolt = max(bolt, (1.0 - smoothstep(0.04, 0.2, segment(p, a, a + vec2(5.0, 4.0)))) * 0.7);
      a = b;
    }
    color += vec3(0.65, 0.75, 0.9) * flash * (0.1 + bolt * sky);
  }

  vec2 moteP = p * vec2(1.5, 2.0) - vec2(uTime * 0.18, uTime * 0.08);
  vec2 cell = floor(moteP);
  vec2 point = fract(moteP) - vec2(hash(cell), hash(cell + 3.0));
  float mote = exp(-dot(point, point) * 150.0) * step(0.97, hash(cell + 9.0));
  color += (uHorizon + uDirect) * mote * (0.035 + uDust * 0.16 + uBubbles * step(0.8, uv.y) * 0.12);
  float vignette = 1.0 - 0.10 * dot(uv - 0.5, uv - 0.5);
  color *= vignette;
  color += bayer(gl_FragCoord.xy) * (1.5 / 255.0);
  outColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;
