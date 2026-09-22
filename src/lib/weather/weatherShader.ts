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
  vec2 snapped = (floor(vUv * uPlateSize) + 0.5) / uPlateSize;
  vec3 color = texture(uPlate, snapped).rgb;
  float fromTop = 1.0 - vUv.y;
  float sky = 1.0 - step(uSkyFrac, fromTop);

  if (uCloud > 0.001) {
    float n = noise(vec2(vUv.x * 2.4 + uTime * uCloudSpeed, fromTop * 5.5));
    float cover = smoothstep(0.42, 0.78, n);
    vec3 cloud = mix(uCloudShade, uCloudLit, cover);
    color = mix(color, cloud, cover * uCloud * sky);
    color *= 1.0 - uLandShade * (0.35 + 0.65 * sky);
  }

  if (uFog > 0.001) {
    float wisp = noise(vec2(vUv.x * 1.8 + uTime * 0.04, fromTop * 2.4 - uTime * 0.03));
    float depth = mix(0.28, 1.0, fromTop);
    color = mix(color, uFogColor, uFog * depth * (0.72 + 0.28 * wisp));
  }

  if (uShimmer > 0.001) {
    float band = smoothstep(uSkyFrac + 0.12, uSkyFrac - 0.02, fromTop);
    float wave = sin(vUv.x * 90.0 + uTime * 2.6) * sin(fromTop * 46.0 - uTime * 1.8);
    color += vec3(0.16, 0.1, 0.02) * band * wave * uShimmer;
  }

  if (uRain > 0.001) {
    float col = floor(vUv.x * uRainColumns);
    float across = abs(fract(vUv.x * uRainColumns) - 0.5);
    float jitter = hash(vec2(col, 2.0));
    float streak = fract(fromTop * 1.35 - uTime * uRainSpeed * (0.55 + jitter) + jitter);
    float drop = (1.0 - smoothstep(0.0, uRainLength, streak));
    drop *= step(0.42, hash(vec2(col, 5.0)));
    drop *= 1.0 - smoothstep(0.02, 0.16, across);
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
    vec2 grid = vec2(vUv.x * 90.0, fromTop * 50.0 - uTime * 3.0);
    vec2 cell = floor(grid);
    float mote = step(0.985, hash(cell));
    mote *= 1.0 - smoothstep(0.04, 0.16, length(fract(grid) - 0.5));
    color = mix(color, vec3(0.72, 0.58, 0.36), mote * uDust);
  }

  if (uBubbles > 0.001 && fromTop > 0.62) {
    vec2 grid = vec2(vUv.x * 55.0, (1.0 - fromTop) * 28.0 + uTime * 1.2);
    vec2 cell = floor(grid);
    float bubble = step(0.972, hash(cell));
    bubble *= 1.0 - smoothstep(0.05, 0.18, length(fract(grid) - 0.5));
    color = mix(color, vec3(0.78, 0.92, 0.96), bubble * uBubbles);
  }

  outColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;
