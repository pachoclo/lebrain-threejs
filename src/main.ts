import GUI from 'lil-gui'
import * as THREE from 'three'
import { MeshPhongMaterial, PointLightHelper } from 'three'
import { InteractionManager } from 'three.interactive'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import Stats from 'three/examples/jsm/libs/stats.module'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { logObject } from './helpers/dump-object'
import { resizeRendererToDisplaySize } from './helpers/responsiveness'
import { soundLibrary } from './sound-library'
import './style.css'

const CANVAS_ID = 'lebrain'

type Meshes = {
  brain: THREE.Object3D
  leftHemisphere: THREE.Object3D
  rightHemisphere: THREE.Object3D
  cerebrum: THREE.Mesh
  cerebellum: THREE.Mesh
  boundingMeshLeft: THREE.Mesh
  boundingMeshRight: THREE.Mesh
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
let clock: THREE.Clock

const toaster = Toaster()

init()
  .then(() => main())
  .then(() => console.log('🧠 -> 👍'))
  .catch((e) => console.error('le poop: ', e))

async function init() {
  grid = new THREE.GridHelper(20, 20, 'teal', 'darkgray')

  lights = {
    ambientLight: new THREE.AmbientLight('orange', 0.2),
    pointLight01: new THREE.PointLight('#69ffeb', 0.65, 100),
    pointLight02: new THREE.PointLight('#ffe9fc', 0.8, 100),
  }

  lights.pointLight01.position.set(-5, 3, 2)
  lights.pointLight02.position.set(5, 3, 3)
  lights.pointLight02.castShadow = true
  lights.pointLight02.shadow.radius = 5
  lights.pointLight02.shadow.camera.near = 0.1
  lights.pointLight02.shadow.camera.far = 400
  lights.pointLight02.shadow.mapSize.width = 1000
  lights.pointLight02.shadow.mapSize.height = 1000

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
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  interactionManager = new InteractionManager(renderer, camera, renderer.domElement, false)

  meshes = await makeMeshes()

  stats = Stats()

  clock = new THREE.Clock()

  scene = new THREE.Scene()
}

async function main() {
  Object.values(lights).forEach((light) => scene.add(light))
  Object.values(lightHelpers).forEach((lightHelper) => scene.add(lightHelper))
  scene.add(grid)
  scene.add(meshes.brain)

  interactionManager.add(meshes.boundingMeshLeft)
  interactionManager.add(meshes.boundingMeshRight)

  const handleHemisphereClick = (event: THREE.Event) => {
    event.stopPropagation()
    toaster.display(event)
  }
  meshes.boundingMeshRight.addEventListener('mouseover', handleHemisphereClick)
  meshes.boundingMeshRight.addEventListener('click', (event) => {
    event.stopPropagation()
  })
  meshes.boundingMeshLeft.addEventListener('mouseover', handleHemisphereClick)

  meshes.boundingMeshLeft.addEventListener('click', (event) => {
    event?.stopPropagation()
    soundLibrary.squish.paused && soundLibrary.squish.play()
    interactionManager.remove(meshes.boundingMeshLeft)
    meshes.leftHemisphere.remove(meshes.boundingMeshLeft)
    meshes.leftHemisphere.parent?.remove(meshes.leftHemisphere)
  })

  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.visibilityState === 'hidden') {
        clock.stop()
        console.log('⏸ animation paused')
      } else if (document.visibilityState === 'visible') {
        clock.start()
        console.log('▶️ animation resumed')
      }
    },
    false
  )

  registerKeyboardEvents()

  document.body.appendChild(stats.dom)

  makeGUI()

  animate()
}

function animate() {
  stats.update()
  requestAnimationFrame(animate)

  // responsiveness
  if (resizeRendererToDisplaySize(renderer)) {
    const canvas = renderer.domElement
    camera.aspect = canvas.clientWidth / canvas.clientHeight
    camera.updateProjectionMatrix()
  }

  // make sure the camera is always looking at the brain
  const { x: ctrlTargetX, y: ctrlTargetY, z: ctrlTargetZ } = meshes.rightHemisphere.position
  cameraOrbitControls.target.set(ctrlTargetX, ctrlTargetY + 1.4, ctrlTargetZ + 0.4)
  cameraOrbitControls.update()

  interactionManager.update()

  updateRightHemisphere()
  updateLeftHemisphere()

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
  rightHemisphere.children.forEach((child) => {
    if (child.type === 'Mesh') {
      child.receiveShadow = true
    }
  })

  const leftHemisphere = new THREE.Group()
  leftHemisphere.name = 'left-hemisphere'
  leftHemisphere.add(cerebrumLeft)
  leftHemisphere.add(cerebellumLeft)
  leftHemisphere.children.forEach((child) => {
    if (child.type === 'Mesh') {
      child.castShadow = true
    }
  })

  const boundingMeshRight = gltf.scene.getObjectByName('bounding-mesh') as THREE.Mesh
  boundingMeshRight.name = 'bounding-mesh-right-hemisphere'
  boundingMeshRight.material = new MeshPhongMaterial({
    flatShading: true,
    visible: false,
    opacity: 0.5,
    transparent: true,
    color: 'green',
    shininess: 200,
  })
  rightHemisphere.add(boundingMeshRight)

  const boundingMeshLeft = new THREE.Mesh()
  boundingMeshLeft.copy(boundingMeshRight)
  boundingMeshLeft.name = 'bounding-mesh-left-hemisphere'
  boundingMeshLeft.applyMatrix4(new THREE.Matrix4().makeScale(-1, 1, 1))
  boundingMeshLeft.material = new MeshPhongMaterial({
    flatShading: true,
    visible: false,
    opacity: 0.5,
    transparent: true,
    color: 'blue',
    shininess: 200,
  })
  leftHemisphere.add(boundingMeshLeft)

  const brain = new THREE.Object3D()
  brain.name = 'brain'
  brain.add(leftHemisphere)
  brain.add(rightHemisphere)
  brain.scale.setScalar(3)
  brain.position.set(0, 1.5, 0)

  logObject(brain)

  return {
    brain,
    cerebrum: cerebrumRight,
    cerebellum: cerebellumRight,
    leftHemisphere,
    rightHemisphere,
    boundingMeshLeft,
    boundingMeshRight,
  }
}

function makeGUI() {
  const gui = new GUI({ title: '⚙️ Settings' })
  gui.close()

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
  ambientLightControls.add(lights.ambientLight, 'intensity', 0, 2, 0.05)
  ambientLightControls.close()

  const boundingGeometryControls = gui.addFolder('Bounding Meshes')
  boundingGeometryControls.add(meshes.boundingMeshLeft.material, 'visible').name('Left visible')
  boundingGeometryControls.add(meshes.boundingMeshRight.material, 'visible').name('Right visible')
  boundingGeometryControls.close()

  let castShadows = {
    enabled: true,
  }
  const castShadowsControls = gui.addFolder('Cast Shadows - Left Hem.')
  castShadowsControls.add(castShadows, 'enabled').onChange((enabled: boolean) => {
    meshes.leftHemisphere.children.forEach((child) => {
      if (child.type === 'Mesh') {
        child.castShadow = enabled
      }
    })
  })
  castShadowsControls.close()

  return gui
}

function Toaster() {
  const el = document.querySelector('.debuggy')! as HTMLElement
  let isHidden = true
  let timeoutId: number | null = null

  const hide = () => {
    cancelTimeout()
    if (!isHidden) {
      el.classList.add('hidden')
      isHidden = true
    }
  }

  const display = (event: THREE.Event, msg?: string) => {
    cancelTimeout()
    const name: string = event.target.parent.name
      .split('-')
      .map((word: string) => word.at(0)?.toUpperCase() + word.slice(1))
      .join(' ')
    el.textContent = name + (msg ? ` ${msg}` : '')
    if (isHidden) {
      el.classList.remove('hidden')
      isHidden = false
    }
    timeoutId = setTimeout(hide, 3000)
  }

  const cancelTimeout = () => {
    timeoutId && clearTimeout(timeoutId)
    timeoutId = null
  }

  return {
    display,
  }
}

let movement = {
  forward: false,
  reverse: false,
  right: false,
  left: false,
  warp: false,
  isMoving() {
    return this.forward || this.reverse || this.left || this.right
  },
}

function registerKeyboardEvents() {
  document.addEventListener('keydown', (event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowUp': {
        movement.forward = true
        break
      }
      case 'ArrowDown': {
        movement.reverse = true
        break
      }
      case 'ArrowRight': {
        movement.right = true
        break
      }
      case 'ArrowLeft': {
        movement.left = true
        break
      }
      case 'Shift': {
        movement.warp = true
        break
      }
    }
  })

  document.addEventListener('keyup', (event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowUp': {
        movement.forward = false
        break
      }
      case 'ArrowDown': {
        movement.reverse = false
        break
      }
      case 'ArrowRight': {
        movement.right = false
        break
      }
      case 'ArrowLeft': {
        movement.left = false
        break
      }
      case 'Shift': {
        movement.warp = false
        break
      }
    }
  })
}

function updateRightHemisphere() {
  const delta = clock.getDelta()
  const mesh = meshes.rightHemisphere
  const turbo = movement.warp ? 2 : 0
  const distance = delta * 2 + turbo

  movement.forward && mesh.translateZ(distance)
  movement.reverse && mesh.translateZ(-distance)
  movement.right && mesh.translateX(-distance)
  movement.left && mesh.translateX(distance)

  if (movement.isMoving()) {
    soundLibrary.spaceship.play()
    movement.warp && soundLibrary.spaceshipBoost.play()
  } else {
    soundLibrary.spaceship.fastSeek(0)
    soundLibrary.spaceship.pause()
    soundLibrary.spaceshipBoost.fastSeek(0)
    soundLibrary.spaceshipBoost.pause()
  }
}

function updateLeftHemisphere() {
  const elapsed = clock.getElapsedTime()
  const bounceSpeed = 1.5
  const amplitude = 0.4
  meshes.leftHemisphere.position.y = Math.abs(Math.sin(elapsed * bounceSpeed) * amplitude)
}
