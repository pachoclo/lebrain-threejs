import GUI from 'lil-gui'
import * as THREE from 'three'
import { PointLightHelper, Vector3 } from 'three'
import { InteractionManager } from 'three.interactive'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import Stats from 'three/examples/jsm/libs/stats.module'
import { resizeRendererToDisplaySize } from './helpers/responsiveness'
import { infoPanel } from './info-panel'
import { buildMeshes, Meshes } from './meshes'
import { soundLibrary } from './sound-library'
import './style.css'
import { makeToaster } from './toaster'

const CANVAS_ID = 'lebrain'

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

const toaster = makeToaster('.debuggy')

let brainBoxHelper: THREE.BoxHelper

const isDevEnvironment = import.meta.env.DEV

const state = {
  forward: false,
  reverse: false,
  right: false,
  left: false,
  warp: false,
  isDriving() {
    return this.forward || this.reverse
  },
  squished: false,
  bouncing: true,
}

init()
  .then(() => main())
  .then(() => console.log('🧠 -> 👍'))
  .catch((e) => console.error('le poop: ', e))

async function init() {
  grid = new THREE.GridHelper(20, 20, 'teal', 'darkgray')
  grid.position.set(0, -0.4, 0)

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

  camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200)
  camera.position.set(2.3, 0.6, 3)

  canvas = document.querySelector(`canvas#${CANVAS_ID}`)!

  cameraOrbitControls = new OrbitControls(camera, canvas)
  cameraOrbitControls.autoRotateSpeed = 5

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  interactionManager = new InteractionManager(renderer, camera, renderer.domElement, false)

  meshes = await buildMeshes()

  if (isDevEnvironment) {
    lightHelpers = {
      pointLight01Helper: new PointLightHelper(lights.pointLight01),
      pointLight02Helper: new PointLightHelper(lights.pointLight02),
    }
    lightHelpers.pointLight01Helper.visible = false
    lightHelpers.pointLight02Helper.visible = false

    brainBoxHelper = new THREE.BoxHelper(meshes.brain)
    brainBoxHelper.visible = false

    stats = Stats()
  }

  clock = new THREE.Clock()

  scene = new THREE.Scene()
}

async function main() {
  Object.values(lights).forEach((light) => scene.add(light))
  scene.add(grid)
  scene.add(meshes.brain)
  if (isDevEnvironment) {
    Object.values(lightHelpers).forEach((lightHelper) => scene.add(lightHelper))
    scene.add(brainBoxHelper)
  }

  interactionManager.add(meshes.boundingMeshLeft)
  interactionManager.add(meshes.boundingMeshRight)

  const handleHemisphereHover = (event: THREE.Event) => {
    event.stopPropagation()
    toaster.display(event)
  }

  meshes.boundingMeshRight.addEventListener('mouseover', handleHemisphereHover)
  meshes.boundingMeshLeft.addEventListener('mouseover', handleHemisphereHover)

  meshes.boundingMeshRight.addEventListener('click', (event) => {
    event.stopPropagation()
    infoPanel('frontalLobe')
  })
  meshes.boundingMeshLeft.addEventListener('click', (event) => {
    event?.stopPropagation()
    soundLibrary.squish.paused && soundLibrary.squish.play()
    interactionManager.remove(meshes.boundingMeshLeft)
    meshes.leftHemisphere.remove(meshes.boundingMeshLeft)
    meshes.leftHemisphere.parent?.remove(meshes.leftHemisphere)
    state.bouncing = false
    infoPanel('parietalLobe')
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

  if (isDevEnvironment) {
    document.body.appendChild(stats.dom)
    makeGUI()
  }

  animate()
}

function animate() {
  if (isDevEnvironment) {
    stats.update()
    brainBoxHelper.update()
    interactionManager.update()
  }

  requestAnimationFrame(animate)

  driveBrain()
  state.bouncing && !state.isDriving() && bounceBrain()

  // responsiveness
  if (resizeRendererToDisplaySize(renderer)) {
    const canvas = renderer.domElement
    camera.aspect = canvas.clientWidth / canvas.clientHeight
    camera.updateProjectionMatrix()
  }

  // make sure the camera is always looking at the brain
  const rightHemispherePosition = meshes.brain.getWorldPosition(new Vector3())
  cameraOrbitControls.target.set(rightHemispherePosition.x, 0.2, rightHemispherePosition.z + 0.1)
  cameraOrbitControls.update()

  renderer.render(scene, camera)
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

  const boundingBoxControls = gui.addFolder('Bounding Box')
  boundingBoxControls.add(brainBoxHelper, 'visible').name('Brain')
  boundingBoxControls.close()

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

function registerKeyboardEvents() {
  document.addEventListener('keydown', (event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowUp': {
        state.forward = true
        break
      }
      case 'ArrowDown': {
        state.reverse = true
        break
      }
      case 'ArrowRight': {
        state.right = true
        break
      }
      case 'ArrowLeft': {
        state.left = true
        break
      }
      case 'Shift': {
        state.warp = true
        break
      }
    }
  })

  document.addEventListener('keyup', (event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowUp': {
        state.forward = false
        break
      }
      case 'ArrowDown': {
        state.reverse = false
        break
      }
      case 'ArrowRight': {
        state.right = false
        break
      }
      case 'ArrowLeft': {
        state.left = false
        break
      }
      case 'Shift': {
        state.warp = false
        break
      }
    }
  })
}

function driveBrain() {
  const mesh = meshes.brain
  const rotationAngle = Math.PI
  const speed = 10
  const delta = clock.getDelta()
  const turbo = state.warp ? 10 : 0
  const distance = delta * speed + turbo

  state.forward && mesh.translateZ(distance)
  state.reverse && mesh.translateZ(-distance)
  state.isDriving() && state.right && mesh.rotateY(-(delta * rotationAngle))
  state.isDriving() && state.left && mesh.rotateY(delta * rotationAngle)

  if (state.isDriving()) {
    soundLibrary.spaceship.play()
    state.warp && soundLibrary.spaceshipBoost.play()
  } else {
    soundLibrary.spaceship.currentTime = 0
    soundLibrary.spaceship.pause()
    soundLibrary.spaceshipBoost.currentTime = 0
    soundLibrary.spaceshipBoost.pause()
  }
}

function bounceBrain() {
  const mesh = meshes.brain
  const bounceSpeed = 1.5
  const amplitude = 0.4

  const elapsed = clock.getElapsedTime()
  const yPos = Math.abs(Math.sin(elapsed * bounceSpeed) * amplitude)

  mesh.position.y = yPos

  if (yPos < 0.04) {
    mesh.scale.set(1.05, 0.85, 1.05)
    state.squished = true
  }
  if (yPos >= 0.04 && state.squished) {
    mesh.scale.set(1, 1, 1)
    state.squished = false
  }
}
