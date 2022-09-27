import GUI from 'lil-gui'
import * as THREE from 'three'
import { MeshPhongMaterial, PointLightHelper } from 'three'
import { InteractionManager } from 'three.interactive'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import Stats from 'three/examples/jsm/libs/stats.module'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { logObject } from './helpers/dump-object'
import { resizeRendererToDisplaySize } from './helpers/responsiveness'
import './style.css'

const CANVAS_ID = 'lebrain'

type Meshes = {
  brain: THREE.Object3D
  leftHemisphere: THREE.Object3D
  rightHemisphere: THREE.Object3D
  cerebrum: THREE.Mesh
  cerebellum: THREE.Mesh
  boundingGeometryLeft: THREE.Mesh
  boundingGeometryRight: THREE.Mesh
}

type Lights = {
  ambientLight: THREE.AmbientLight
  pointLight01: THREE.PointLight
  pointLight02: THREE.PointLight
}

type LightHelpers = {
  pointLight01Helper: PointLightHelper
  pointLight02Helper: PointLightHelper
}

let grid: THREE.GridHelper
let lights: Lights
let camera: THREE.PerspectiveCamera
let canvas: HTMLElement
let cameraOrbitControls: OrbitControls
let renderer: THREE.WebGLRenderer
let meshes: Meshes
let scene: THREE.Scene
let interactionManager: InteractionManager
let stats: Stats
let lightHelpers: LightHelpers

async function initialize() {
  grid = new THREE.GridHelper(20, 20, 'teal', 'darkgray')

  lights = {
    ambientLight: new THREE.AmbientLight('orange', 0.2),
    pointLight01: new THREE.PointLight('#69ffeb', 0.65, 100),
    pointLight02: new THREE.PointLight('#ffe9fc', 0.8, 100),
  }

  lights.pointLight01.position.set(-5, 3, 2)
  lights.pointLight02.position.set(5, 3, 3)

  lightHelpers = {
    pointLight01Helper: new PointLightHelper(lights.pointLight01),
    pointLight02Helper: new PointLightHelper(lights.pointLight02),
  }

  lightHelpers.pointLight01Helper.visible = false
  lightHelpers.pointLight02Helper.visible = false

  camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200)
  camera.position.set(5.3, 1.6, 5.6)

  canvas = document.querySelector(`canvas#${CANVAS_ID}`)!

  cameraOrbitControls = new OrbitControls(camera, canvas)
  cameraOrbitControls.autoRotateSpeed = 5

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })

  interactionManager = new InteractionManager(renderer, camera, renderer.domElement, false)

  stats = Stats()

  meshes = await makeMeshes()

  scene = new THREE.Scene()
}

async function main() {
  await initialize()

  Object.values(lights).forEach((light) => scene.add(light))
  Object.values(lightHelpers).forEach((lightHelper) => scene.add(lightHelper))
  scene.add(grid)
  scene.add(meshes.brain)

  interactionManager.add(meshes.boundingGeometryLeft)
  interactionManager.add(meshes.boundingGeometryRight)

  meshes.boundingGeometryLeft.addEventListener('click', (event) => {
    event.stopPropagation()
    console.log('Clicked on the Left hemisphere 👉🧠')
  })
  meshes.boundingGeometryRight.addEventListener('click', (event) => {
    event.stopPropagation()
    console.log('Clicked on the Right hemisphere 🧠👈')
  })

  document.body.appendChild(stats.dom)

  makeGUI()

  animate()
}

function animate() {
  requestAnimationFrame(animate)
  stats.update()

  // responsiveness
  if (resizeRendererToDisplaySize(renderer)) {
    const canvas = renderer.domElement
    camera.aspect = canvas.clientWidth / canvas.clientHeight
    camera.updateProjectionMatrix()
  }

  // make sure the camera is always looking at the brain
  const { x: ctrlTargetX, y: ctrlTargetY, z: ctrlTargetZ } = meshes.brain.position
  cameraOrbitControls.target.set(ctrlTargetX, ctrlTargetY, ctrlTargetZ)
  cameraOrbitControls.update()

  interactionManager.update()
  renderer.render(scene, camera)
}

async function makeMeshes(): Promise<Meshes> {
  const gltfLoader = new GLTFLoader()
  const gltf = await gltfLoader.loadAsync('/models/brain_sliced.glb')
  document.querySelector('#loader')?.remove()

  const cerebrumRight = gltf.scene.getObjectByName('cerebrum-right')! as THREE.Mesh
  const cerebrumMaterial = new MeshPhongMaterial({ color: 'pink', shininess: 50 })
  cerebrumRight.material = cerebrumMaterial // override material

  const cerebrumLeft = new THREE.Mesh()
  cerebrumLeft.copy(cerebrumRight)
  cerebrumLeft.name = 'cerebrum-left'
  cerebrumLeft.applyMatrix4(new THREE.Matrix4().makeScale(-1, 1, 1)) // mirror geometry

  const cerebellumRight = gltf.scene.getObjectByName('cerebellum-right') as THREE.Mesh

  const cerebellumLeft = new THREE.Mesh()
  cerebellumLeft.copy(cerebellumRight)
  cerebellumLeft.name = 'cerebellum-left'
  cerebellumLeft.applyMatrix4(new THREE.Matrix4().makeScale(-1, 1, 1))

  const rightHemisphere = new THREE.Group()
  rightHemisphere.name = 'right-hemisphere'
  rightHemisphere.add(cerebrumRight)
  rightHemisphere.add(cerebellumRight)

  const leftHemisphere = new THREE.Group()
  leftHemisphere.name = 'left-hemisphere'
  leftHemisphere.add(cerebrumLeft)
  leftHemisphere.add(cerebellumLeft)

  const boundingGeometryRight = gltf.scene.getObjectByName('bounding-box') as THREE.Mesh
  boundingGeometryRight.material = new MeshPhongMaterial({
    flatShading: true,
    visible: false,
    opacity: 0.5,
    transparent: true,
    color: 'green',
    shininess: 200,
  })
  rightHemisphere.add(boundingGeometryRight)

  const boundingGeometryLeft = new THREE.Mesh()
  boundingGeometryLeft.copy(boundingGeometryRight)
  boundingGeometryLeft.applyMatrix4(new THREE.Matrix4().makeScale(-1, 1, 1))
  boundingGeometryLeft.material = new MeshPhongMaterial({
    flatShading: true,
    visible: false,
    opacity: 0.5,
    transparent: true,
    color: 'blue',
    shininess: 200,
  })
  leftHemisphere.add(boundingGeometryLeft)

  const brain = new THREE.Object3D()
  brain.name = 'brain'
  brain.add(leftHemisphere)
  brain.add(rightHemisphere)
  brain.scale.setScalar(3)
  brain.position.set(0, 1.5, 0)

  registerMeshControls(leftHemisphere)

  logObject(brain)

  return {
    brain,
    cerebrum: cerebrumRight,
    cerebellum: cerebellumRight,
    leftHemisphere,
    rightHemisphere,
    boundingGeometryLeft,
    boundingGeometryRight,
  }
}

function makeGUI() {
  const gui = new GUI({ title: '⚙️ Config' })

  const cameraControls = gui.addFolder('Camera')
  cameraControls.add(cameraOrbitControls, 'autoRotate')
  cameraControls.close()

  const lightsControls = gui.addFolder('Lights')
  lightsControls.close()

  const pointLight01Controls = lightsControls.addFolder('Point Light 01')
  pointLight01Controls.add(lightHelpers.pointLight01Helper, 'visible').name('helper')
  pointLight01Controls.addColor(lights.pointLight01, 'color')
  pointLight01Controls.close()

  const pointLight02Controls = lightsControls.addFolder('Point Light 02')
  pointLight02Controls.add(lightHelpers.pointLight02Helper, 'visible').name('helper')
  pointLight02Controls.addColor(lights.pointLight02, 'color')
  pointLight02Controls.close()

  const ambientLightControls = lightsControls.addFolder('Ambient Light')
  ambientLightControls.addColor(lights.ambientLight, 'color')
  ambientLightControls.add(lights.ambientLight, 'intensity', 0, 2, 0.05).name('helper')
  ambientLightControls.close()

  const boundingGeometryControls = gui.addFolder('Bounding Geometry')
  boundingGeometryControls.add(meshes.boundingGeometryLeft.material, 'visible').name('Left visible')
  boundingGeometryControls
    .add(meshes.boundingGeometryRight.material, 'visible')
    .name('Right visible')
  boundingGeometryControls.close()

  return gui
}

function registerMeshControls(mesh: THREE.Object3D) {
  const originalPosition = mesh.position.clone()
  const stepSize = 0.1

  document.addEventListener('keydown', (event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowLeft': {
        mesh.translateX(-stepSize)
        break
      }
      case 'ArrowRight': {
        mesh.translateX(stepSize)
        break
      }
      case 'ArrowUp': {
        mesh.translateZ(-stepSize)
        break
      }
      case 'ArrowDown': {
        mesh.translateZ(stepSize)
        break
      }
      case 'r': {
        mesh.position.set(originalPosition.x, originalPosition.y, originalPosition.z)
        break
      }
    }
  })
}

main()
  .then(() => console.log('🧠 -> 👍'))
  .catch((e) => console.error('le poop: ', e))
