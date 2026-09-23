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

void main() {
  vec2 pix = floor(vUv * uPlateSize);
  vec2 snapped = (pix + 0.5) / uPlateSize;
  vec3 color = texture(uPlate, snapped).rgb;
  float fromTopPix = (uPlateSize.y - 1.0) - pix.y;
  float skyLine = uSkyFrac * uPlateSize.y;
  float sky = step(fromTopPix + 0.5, skyLine);

  if (uCloud > 0.001) {
    vec2 p = vec2(pix.x * 0.07 + uTime * uCloudSpeed * 6.0, pix.y * 0.1);
    float cover = smoothstep(0.58, 0.86, noise(p));
    color = mix(color, mix(uCloudShade, uCloudLit, cover), cover * uCloud * 0.45 * sky);
    color *= 1.0 - uLandShade * 0.45;
  }

  if (uFog > 0.001) {
    vec2 p = vec2(pix.x * 0.05 + floor(uTime * 2.0) * 0.15, pix.y * 0.08);
    float depth = mix(0.35, 1.0, fromTopPix / max(uPlateSize.y - 1.0, 1.0));
    color = mix(color, uFogColor, uFog * depth * (0.75 + 0.25 * noise(p)));
  }

  if (uShimmer > 0.001) {
    float band = step(abs(fromTopPix - skyLine), 1.5);
    float flick = step(0.0, sin(pix.x * 0.8 + floor(uTime * 2.0)));
    color += vec3(0.14, 0.09, 0.02) * band * flick * uShimmer;
  }

  float rainCutoff = clamp(1.0 - uRainColumns / max(uPlateSize.x, 1.0), 0.0, 0.98);
  if (uRain > 0.001 && hash(vec2(pix.x, 3.0)) > rainCutoff) {
    float jitter = hash(vec2(pix.x, 2.0));
    float speed = (8.0 + jitter * 10.0) * max(uRainSpeed, 0.15);
    float head = mod(fromTopPix + jitter * uPlateSize.y - uTime * speed, uPlateSize.y);
    float drop = step(head, 2.0 + uRainLength * 8.0);
    color = mix(color, uRainColor, drop * uRain);
  }

  if (uLightning > 0.001 && uLightningGap > 0.0) {
    float cycle = floor(uTime / uLightningGap);
    float phase = fract(uTime / uLightningGap);
    float strike = step(0.72, hash(vec2(cycle, 8.0)));
    float flash = strike * (1.0 - smoothstep(0.0, 0.045, phase)) * uLightning;
    color += vec3(0.9, 0.93, 1.0) * flash * (0.25 + 0.75 * sky);
  }

  if (uDust > 0.001 && sky > 0.5) {
    vec2 cell = vec2(pix.x, fromTopPix + floor(uTime * 2.0));
    float mote = step(0.993, hash(cell));
    color = mix(color, vec3(0.72, 0.58, 0.36), mote * uDust);
  }

  if (uBubbles > 0.001 && fromTopPix > uPlateSize.y * 0.62) {
    vec2 cell = vec2(pix.x, pix.y + floor(uTime * 1.5));
    float bubble = step(0.994, hash(cell));
    color = mix(color, vec3(0.78, 0.92, 0.96), bubble * uBubbles);
  }

  outColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;
