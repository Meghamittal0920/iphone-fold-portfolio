import * as THREE from 'three';
import { USDLoader } from 'three/addons/loaders/USDLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadDefaultUIs, drawSafariHeader } from './ui.js';

const loadingShell = document.querySelector('#loading');
const loadingLine = loadingShell.querySelector('.page-loading-indicator');
function loadingMilestone(progress, finished = false) {
  loadingLine.style.transform = `scaleX(${progress})`;
  if (finished) {
    loadingLine.dataset.finished = 'true';
    loadingShell.dataset.phase = 'complete';
    const delay = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180;
    setTimeout(() => { loadingShell.hidden = true; }, delay);
  }
}
const viewport = document.querySelector('#viewport');
const slider = document.querySelector('#angle');
const play = document.querySelector('#play');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, .1, 250);
camera.position.set(0, 0, 40);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 3));
renderer.setClearColor(0xf6f6f3, 0);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
viewport.appendChild(renderer.domElement);
const environment = new RoomEnvironment();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(environment, .04).texture;
environment.dispose();
pmrem.dispose();
scene.environmentIntensity = 1.35;
scene.add(new THREE.HemisphereLight(0xffffff, 0xb5baa8, 1.8));
const key = new THREE.DirectionalLight(0xfffcf5, 2.6);
key.position.set(-15, 25, 30);
scene.add(key);
const rim = new THREE.DirectionalLight(0xe8edf5, 2);
rim.position.set(15, 5, -15);
scene.add(rim);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 21;
controls.maxDistance = 65;
controls.target.set(0, 0, .275454);
controls.update();
const phone = new THREE.Group();
scene.add(phone);
const bend = { value: 0 };
let angle = 0;
let playing = false;
let phase = 0;
let cyclePositionValid = false;
const openHold = 32;
let transition = null;
let ready = false;
let previewPresented = false;
let autoOpenTimer;
let previewInteracted = false;
let autoStarted = false;
function cancelAutoOpen() {
  previewInteracted = true;
  clearTimeout(autoOpenTimer);
}
function scheduleAutoOpen() {
  clearTimeout(autoOpenTimer);
  if (!ready || !previewPresented || previewInteracted || autoStarted || document.hidden
    || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  autoOpenTimer = setTimeout(() => {
    if (previewInteracted || document.hidden) return;
    autoStarted = true;
    setPlaying(false);
    setAngle(0);
    transition = { from: 0, to: 180, elapsed: 0, duration: 3.2 };
  }, 3000);
}
for (const event of ['pointerdown', 'keydown', 'wheel']) {
  document.addEventListener(event, cancelAutoOpen, { once: true, passive: true });
}
document.addEventListener('visibilitychange', scheduleAutoOpen);

const screens = {};
const uiReferenceEye = new THREE.Vector3(0, 0, 40);
const innerUIFrame = new THREE.Vector4(-7.89935, .34562 - 5.8974, 15.7987, 11.1035);
const outerUIFrame = new THREE.Vector4(.23396, .27173 - 5.8974, 7.73936, 11.2513)
  .multiplyScalar((uiReferenceEye.z - .24948) / (uiReferenceEye.z - .825538));
const defaultUIs = await loadDefaultUIs();
loadingMilestone(.35);
let uiTheme = 'portfolio';
for (const kind of ['inner', 'outer']) {
  const defaultTextures = {};
  for (const [theme, canvases] of Object.entries(defaultUIs)) {
    const texture = new THREE.CanvasTexture(canvases[kind]);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    defaultTextures[theme] = texture;
  }
  const material = new THREE.MeshBasicMaterial({ map: defaultTextures[uiTheme], toneMapped: false });
  screens[kind] = {
    material, defaultTextures,
    frame: { value: (kind === 'inner' ? innerUIFrame : outerUIFrame).clone() },
    gradient: { value: new THREE.Vector2(kind === 'inner' ? .5 : 0, kind === 'inner' ? 0 : 1) },
    pixel: { value: new THREE.Vector2(1 / defaultUIs[uiTheme][kind].width, 1 / defaultUIs[uiTheme][kind].height) },
  };
}
const demo = document.createElement('video');
demo.id = 'navigation-demo'; demo.hidden = true; document.body.appendChild(demo);
demo.src = './previews/navigation.mp4';
demo.muted = true; demo.defaultMuted = true; demo.playsInline = true; demo.loop = false; demo.preload = 'auto';
// The recording is 16:9 but the open screen is 1440:1012, so letterbox it under the browser bar instead of stretching.
const demoCanvas = document.createElement('canvas');
demoCanvas.width = 1440 * 1.5; demoCanvas.height = 1012 * 1.5;
const demoContext = demoCanvas.getContext('2d');
function drawDemoFrame() {
  const { width, height } = demoCanvas;
  demoContext.fillStyle = '#fcfcfc'; demoContext.fillRect(0, 0, width, height);
  const top = drawSafariHeader(demoCanvas, 'inner');
  if (!demo.videoWidth) return;
  const scale = Math.min(width / demo.videoWidth, (height - top) / demo.videoHeight);
  const w = demo.videoWidth * scale, h = demo.videoHeight * scale;
  demoContext.drawImage(demo, (width - w) / 2, top + (height - top - h) / 2, w, h);
}
const demoTexture = new THREE.CanvasTexture(demoCanvas);
demoTexture.colorSpace = THREE.SRGBColorSpace;
// Filter the high-resolution recording when the device occupies fewer screen pixels.
demoTexture.generateMipmaps = true;
demoTexture.minFilter = THREE.LinearMipmapLinearFilter;
demoTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
let demoEnabled = true, demoPaused = false, demoPending = false, demoWasOpen = false;
const demoButton = document.querySelector('#demo-play');
function updateDemo() {
  const open = demoEnabled && angle >= 179.99;
  if (!open && demoWasOpen) { demo.pause(); demo.currentTime = 0; }
  demoWasOpen = open;
  demoButton.hidden = !open;
  const run = open && !demoPaused && !document.hidden;
  if (run && demo.paused && !demo.ended && !demoPending) {
    demoPending = true;
    demo.play().catch(() => { demoPaused = true; }).finally(() => { demoPending = false; });
  } else if (!run) demo.pause();
  const screen = screens.inner;
  const texture = open && demo.readyState >= 2 ? demoTexture : screen.defaultTextures.portfolio;
  if (texture === demoTexture && demoEnabled) { drawDemoFrame(); demoTexture.needsUpdate = true; }
  if (demoEnabled && screen.material.map !== texture) {
    screen.material.map = texture; screen.material.needsUpdate = true;
    screen.pixel.value.set(1 / (texture.image.width), 1 / (texture.image.height));
  }
  demoButton.textContent = demo.ended ? 'Replay demo' : demoPaused ? 'Play demo' : 'Pause demo';
}
demoButton.addEventListener('click', () => { if (demo.ended) { demo.currentTime = 0; demoPaused = false; } else demoPaused = !demoPaused; updateDemo(); });
document.addEventListener('visibilitychange', updateDemo);
for (const kind of ['outer', 'inner']) {
  const input = document.querySelector(`#${kind}-upload`);
  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    try {
      const image = new Image(); image.src = url; await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = kind === 'inner' ? 1440 : 390;
      canvas.height = kind === 'inner' ? 1012 : 567;
      const c = canvas.getContext('2d'); c.fillStyle = '#ffffff'; c.fillRect(0, 0, canvas.width, canvas.height);
      const scale = Math.min(canvas.width / image.width, canvas.height / image.height);
      c.drawImage(image, (canvas.width-image.width*scale)/2, (canvas.height-image.height*scale)/2, image.width*scale, image.height*scale);
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      const screen = screens[kind];
      if (kind === 'inner') { demoEnabled = false; demo.pause(); }
      if (screen.material.map !== screen.defaultTextures.portfolio && screen.material.map !== demoTexture) screen.material.map.dispose();
      screen.material.map = texture; screen.material.needsUpdate = true;
      screen.pixel.value.set(1/canvas.width, 1/canvas.height);
      moveTo(kind === 'inner' ? 180 : 0);
      document.querySelector('#status').textContent = '';
    } catch { document.querySelector('#status').textContent = 'That image could not be opened. Try a PNG, JPG or WebP.'; }
    finally { URL.revokeObjectURL(url); input.value = ''; }
  });
}
function showDefaultUI() {
  demoEnabled = true; demoPaused = matchMedia('(prefers-reduced-motion: reduce)').matches;
  for (const [kind, screen] of Object.entries(screens)) {
    const texture = screen.defaultTextures[uiTheme];
    screen.material.map = texture; screen.material.needsUpdate = true;
    screen.pixel.value.set(1 / texture.image.width, 1 / texture.image.height);
    screen.frame.value.copy(kind === 'inner' ? innerUIFrame : outerUIFrame);
    screen.gradient.value.set(kind === 'inner' ? .5 : 0, kind === 'inner' ? 0 : 1);
  }
  document.querySelectorAll('[data-ui-theme]').forEach(button => button.setAttribute('aria-selected', String(button.dataset.uiTheme === uiTheme)));
}
document.querySelector('#reset-screens').addEventListener('click', showDefaultUI);
function moveTo(to) {
  cyclePositionValid = false;
  setPlaying(false);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { transition = null; setAngle(to); }
  else transition = { from: angle, to, elapsed: 0 };
}
document.querySelector('#opened').addEventListener('click', () => moveTo(180));
document.querySelector('#closed').addEventListener('click', () => moveTo(0));
document.querySelector('#reset-view').addEventListener('click', () => { camera.position.set(0, 0, 40); controls.target.set(0, 0, .275454); controls.update(); });
document.querySelector('#customize-open').addEventListener('click', event => {
  event.preventDefault(); showInfo(false); document.querySelector('#customize').hidden = false;
});
document.querySelector('#background').addEventListener('input', event => document.documentElement.style.setProperty('--canvas', event.target.value));

function setPlaying(value) {
  playing = value;
  play.textContent = value ? 'Pause' : 'Play';
  play.setAttribute('aria-label', value ? 'Pause animation' : 'Play animation');
}
function setAngle(value) {
  angle = value;
  phone.position.x = -4 * (1 - value / 180);
  document.querySelector('#degrees').textContent = `${Math.round(value)}°`;
  document.querySelector('#surface-state').textContent = value < 20 ? 'The cover introduces me. Open the device to explore the work.' : value > 160 ? 'On the left, who I am and what I build. The larger surface on the right lets you explore it in detail.' : 'As the device opens, the introduction expands into three connected surfaces.';
  slider.value = value;
  slider.style.setProperty('--progress', `${value / 1.8}%`);
  bend.value = (180 - value) / 180 * Math.PI;
  screens.outer.material.color.setScalar(value >= 180 ? 0 : 1);
}
play.addEventListener('click', () => {
  transition = null;
  if (!playing && !cyclePositionValid) {
    // Manual positioning starts by opening; pause/resume keeps its direction.
    phase = angle >= 180 ? 0 : openHold + 4.3 + Math.acos(1 - 2 * angle / 180) / Math.PI * 3.1;
    cyclePositionValid = true;
  }
  setPlaying(!playing);
});
slider.addEventListener('input', () => {
  cyclePositionValid = false;
  transition = null;
  setPlaying(false);
  setAngle(Number(slider.value));
});
function resize() {
  const { width, height } = viewport.getBoundingClientRect();
  renderer.setSize(width, height);
  camera.aspect = width / height;
  const pixelsPerUnit = Math.min(width / 21, height / 15.5, 45);
  camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(height / pixelsPerUnit / 2 / 40));
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(viewport);

const screenShader = `
uniform float foldAngle;
uniform vec2 uiPixel;
uniform vec4 uiFrame;
uniform vec2 uiGradient;
uniform vec3 uiReferenceEye;
varying vec3 vUIPosition;
vec3 screenColor() {
  // Intersect the fixed front-view ray with the unfolded inner-screen plane.
  float depth = (0.24948 - uiReferenceEye.z) / (vUIPosition.z - uiReferenceEye.z);
  vec2 projected = uiReferenceEye.xy + (vUIPosition.xy - uiReferenceEye.xy) * depth;
  vec2 sourceUV = (projected - uiFrame.xy) / uiFrame.zw;
  #ifdef INNER_UI
    float progress = clamp(foldAngle / 1.570796327, 0.0, 1.0);
  #else
    // Anchor the image to the projected hinge-side edge of the outer screen.
    float c = cos(foldAngle), s = sin(foldAngle);
    vec2 hingeEdge = vec2(-0.23396, -0.27463 - 0.275454);
    vec2 foldedEdge = vec2(c * hingeEdge.x + s * hingeEdge.y,
      -s * hingeEdge.x + c * hingeEdge.y + 0.275454);
    float edgeDepth = (0.24948 - uiReferenceEye.z) / (foldedEdge.y - uiReferenceEye.z);
    float anchorX = uiReferenceEye.x + (foldedEdge.x - uiReferenceEye.x) * edgeDepth;
    sourceUV.x = uiGradient.x + (projected.x - anchorX) / uiFrame.z;
    float progress = clamp((3.141592654 - foldAngle) / 1.570796327, 0.0, 1.0);
  #endif
  float edge = (sourceUV.x - uiGradient.x) / (uiGradient.y - uiGradient.x);
  float motion = smoothstep(0.0, 1.0, progress);
  float blurGradient = clamp(edge, 0.0, 1.0);
  float darkenGradient = clamp((edge - 0.2) / 0.8, 0.0, 1.0);
  float effect = motion * pow(darkenGradient, 1.35);
  float radius = 72.0 * motion * pow(blurGradient, 1.35);
  vec2 aa = max(fwidth(sourceUV), uiPixel * 0.5);
  vec2 dx = dFdx(sourceUV) / uiPixel;
  vec2 dy = dFdy(sourceUV) / uiPixel;
  float baseLod = log2(max(1.0, max(length(dx), length(dy))));
  vec2 coverage = smoothstep(-aa, aa, sourceUV)
    * (1.0 - smoothstep(vec2(1.0) - aa, vec2(1.0) + aa, sourceUV));
  vec3 color = textureLod(map, clamp(sourceUV, vec2(0.0), vec2(1.0)), baseLod).rgb * coverage.x * coverage.y;
  if (radius > 0.0) {
    // Use the same mip level at zero blur, then increase it continuously.
    float lod = max(baseLod, log2(max(1.0, radius)));
    vec2 footprint = max(aa, uiPixel * radius * 0.75);
    color = vec3(0.0);
    for (int y = -2; y <= 2; y++) {
      for (int x = -2; x <= 2; x++) {
        float wx = x == 0 ? 6.0 : (abs(x) == 1 ? 4.0 : 1.0);
        float wy = y == 0 ? 6.0 : (abs(y) == 1 ? 4.0 : 1.0);
        vec2 sampleUV = sourceUV + vec2(float(x), float(y)) * uiPixel * radius;
        // Blur the image and its coverage together so color spreads into the black margin.
        vec2 coverage = smoothstep(-footprint, footprint, sampleUV)
          * (1.0 - smoothstep(vec2(1.0) - footprint, vec2(1.0) + footprint, sampleUV));
        color += textureLod(map, clamp(sampleUV, vec2(0.0), vec2(1.0)), lod).rgb
          * coverage.x * coverage.y * wx * wy / 256.0;
      }
    }
  }
  #ifdef DECODE_VIDEO_TEXTURE
    color = sRGBTransferEOTF(vec4(color, 1.0)).rgb;
  #endif
  return color * (1.0 - min(1.0, effect * 2.0));
}
`;

// The camera half stays in its original transform. Only the cover half rotates.
const foldShader = `
uniform float foldAngle;
vec2 rotateHinge(vec2 p) {
  float c = cos(foldAngle), s = sin(foldAngle);
  p.y -= 0.275454;
  return vec2(c * p.x + s * p.y, -s * p.x + c * p.y + 0.275454);
}
#ifdef FLEXIBLE_SCREEN
vec4 bendStrip(vec3 p) {
  float halfWidth = 0.35;
  if (p.x >= halfWidth) return vec4(p.x, p.z, 1.0, 0.0);
  if (p.x <= -halfWidth) return vec4(rotateHinge(p.xz), cos(foldAngle), -sin(foldAngle));
  float t = (p.x + halfWidth) / (2.0 * halfWidth);
  float t2 = t*t, t3 = t2*t;
  vec2 a = rotateHinge(vec2(-halfWidth, p.z));
  vec2 b = vec2(halfWidth, p.z);
  vec2 ta = 2.0 * halfWidth * vec2(cos(foldAngle), -sin(foldAngle));
  vec2 tb = vec2(2.0 * halfWidth, 0.0);
  vec2 point = (2.0*t3-3.0*t2+1.0)*a + (t3-2.0*t2+t)*ta + (-2.0*t3+3.0*t2)*b + (t3-t2)*tb;
  vec2 tangent = normalize((6.0*t2-6.0*t)*a + (3.0*t2-4.0*t+1.0)*ta + (-6.0*t2+6.0*t)*b + (3.0*t2-2.0*t)*tb);
  return vec4(point, tangent);
}
#endif
`;
try {
  const model = await new USDLoader().loadAsync('./assets/iPhone_Duo_Render.usdc');
  loadingMilestone(.8);
  model.scale.multiplyScalar(100);
  model.updateMatrixWorld(true);
  const count = { moving: 0, fixed: 0, flexible: 0 };
  model.traverse(object => {
    if (!object.isMesh) return;
    const geometry = object.geometry.clone().applyMatrix4(object.matrixWorld);
    geometry.translate(0, -5.8974, 0);
    let ancestor = object;
    while (ancestor && !['upTUAKvMVkPOMKq', 'SiftyleUEEZwLhF'].includes(ancestor.name)) ancestor = ancestor.parent;
    const moving = ancestor?.name === 'upTUAKvMVkPOMKq';
    const flexible = ['JnJdTkxbQgUtLwU', 'xdyyaajWsatVNxN', 'UXtsBZYlaUvHoEh', 'MvKPXGSdYDVvSpk'].includes(object.name);
    const kind = object.name === 'UXtsBZYlaUvHoEh' ? 'inner' : object.name === 'hhgAIoCGsHXeDPY' ? 'outer' : null;
    const material = kind ? screens[kind].material : object.material.clone();
    if (kind) {
      const p = geometry.attributes.position;
      const uv = new Float32Array(p.count * 2);
      for (let i = 0; i < p.count; i++) {
        uv[i * 2] = kind === 'inner' ? (p.getX(i) + 7.89935) / 15.7987 : (-.23396 - p.getX(i)) / 7.73936;
        uv[i * 2 + 1] = kind === 'inner' ? (p.getY(i) + 5.8974 - .34562) / 11.1035 : (p.getY(i) + 5.8974 - .27173) / 11.2513;
      }
      geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    }
    if (moving || flexible) {
      material.onBeforeCompile = shader => {
        shader.uniforms.foldAngle = bend;
        if (kind) {
          shader.uniforms.uiFrame = screens[kind].frame;
          shader.uniforms.uiGradient = screens[kind].gradient;
          shader.uniforms.uiReferenceEye = { value: uiReferenceEye };
          shader.uniforms.uiPixel = screens[kind].pixel;
          shader.fragmentShader = shader.fragmentShader.replace('#include <map_pars_fragment>', `
            #include <map_pars_fragment>
            ${kind === 'inner' ? '#define INNER_UI' : ''}
            ${screenShader}
          `).replace('#include <map_fragment>', 'diffuseColor.rgb *= screenColor();');
          shader.vertexShader = `varying vec3 vUIPosition;\n${shader.vertexShader}`;
          shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', `
            vUIPosition = transformed;
            #include <project_vertex>
          `);
        }
        shader.vertexShader = `${flexible ? '#define FLEXIBLE_SCREEN\n' : ''}${foldShader}\n${shader.vertexShader}`;
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', flexible ? `
          vec4 folded = bendStrip(position);
          vec3 transformed = vec3(folded.x, position.y, folded.y);
        ` : `
          vec2 folded = rotateHinge(position.xz);
          vec3 transformed = vec3(folded.x, position.y, folded.y);
        `);
        shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', `
          vec3 objectNormal = vec3(normal);
          ${flexible ? 'vec4 strip = bendStrip(position); float a = atan(-strip.w, strip.z);' : 'float a = foldAngle;'}
          objectNormal.x = cos(a) * normal.x + sin(a) * normal.z;
          objectNormal.z = -sin(a) * normal.x + cos(a) * normal.z;
        `);
      };
      material.customProgramCacheKey = () => `${flexible ? 'fold-flexible' : 'fold-cover'}-${kind || 'body'}`;
    }
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = object.name;
    mesh.frustumCulled = false;
    phone.add(mesh);
    count[flexible ? 'flexible' : moving ? 'moving' : 'fixed']++;
  });
  console.info('Official model ready', JSON.stringify({ ...count, sourceMeshes: phone.children.length, innerUI: true, outerUI: true, fixedHalf: 'rear camera' }));
  showDefaultUI();
  document.querySelectorAll('button, input').forEach(element => element.disabled = false);
  ready = true;
  setAngle(0);
  document.querySelector('#status').textContent = '';
  document.documentElement.dataset.ready = 'true';
  requestAnimationFrame(() => loadingMilestone(1, true));
} catch (error) {
  document.documentElement.dataset.ready = 'error';
  loadingShell.hidden = true;
  document.querySelector('#status').textContent = 'The 3D model could not load. Check the asset setup in the README and reload.';
  console.error(error);
}
let lastTime = performance.now();
// Background time must not advance the fold, but slow visible frames must.
document.addEventListener('visibilitychange', () => { lastTime = performance.now(); });
renderer.setAnimationLoop(now => {
  const delta = document.hidden ? 0 : Math.max(0, (now - lastTime) / 1000);
  lastTime = now;
  if (ready && playing) {
    phase = (phase + delta) % (openHold + 7.4);
    let value;
    if (phase < openHold) value = 180;
    else if (phase < openHold + 3.1) value = 90 * (1 + Math.cos((phase - openHold) / 3.1 * Math.PI));
    else if (phase < openHold + 4.3) value = 0;
    else value = 90 * (1 - Math.cos((phase - openHold - 4.3) / 3.1 * Math.PI));
    setAngle(value);
  } else if (transition) {
    transition.elapsed += delta;
    const progress = Math.min(transition.elapsed / (transition.duration ?? 1.4), 1);
    const ease = progress * progress * (3 - 2 * progress);
    setAngle(THREE.MathUtils.lerp(transition.from, transition.to, ease));
    if (progress === 1) transition = null;
  }
  if (ready) updateDemo();
  controls.update();
  renderer.render(scene, camera);
  if (ready && !previewPresented) {
    previewPresented = true;
    // Begin the delay after the closed device has actually reached the screen.
    requestAnimationFrame(() => requestAnimationFrame(scheduleAutoOpen));
  }
});

const infoToggle = document.querySelector('#info-toggle');
const infoPanel = document.querySelector('#preview-info');
function showInfo(open) {
  if (open) document.querySelector('#customize').hidden = true;
  infoPanel.hidden = !open;
  infoToggle.setAttribute('aria-expanded', String(open));
}
infoToggle.addEventListener('click', () => showInfo(infoPanel.hidden));
document.querySelector('#info-close').addEventListener('click', () => { showInfo(false); infoToggle.focus(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !infoPanel.hidden) { showInfo(false); infoToggle.focus(); } });
document.addEventListener('pointerdown', event => { if (!infoPanel.contains(event.target) && !infoToggle.contains(event.target)) showInfo(false); });


document.querySelector('#customize-close').addEventListener('click', () => {
  document.querySelector('#customize').hidden = true;
  infoToggle.focus();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !document.querySelector('#customize').hidden) {
    document.querySelector('#customize').hidden = true;
    infoToggle.focus();
  }
});

document.querySelectorAll('[data-upload]').forEach(button => {
  button.addEventListener('click', () => document.getElementById(button.dataset.upload).click());
});
