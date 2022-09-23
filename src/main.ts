import * as THREE from 'three'
import { MeshPhongMaterial } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { logObject } from './helpers/dump-object'
import { resizeRendererToDisplaySize } from './helpers/responsiveness'
import './style.css'

const CANVAS_ID = 'lebrain'

async function main() {
  const grid = new THREE.GridHelper(20, 20, 'teal', 'darkgray')

  const ambientLight = new THREE.AmbientLight('orange', 0.2)
  const pointLight01 = new THREE.PointLight('white', 0.8, 100)
  pointLight01.position.set(-5, 3, -1)
  const pointLight02 = new THREE.PointLight('white', 0.8, 100)
  pointLight02.position.set(5, 3, 3)

  const camera = new THREE.PerspectiveCamera(50, 2, 0.1, 200)
  camera.position.set(5.3, 1.6, 5.6)

  const scene = new THREE.Scene()
  scene.add(grid)
  scene.add(ambientLight)
  scene.add(pointLight01)
  scene.add(pointLight02)

  let brain = await makeBrain()
  scene.add(brain)

  const canvas: HTMLElement = document.querySelector(`canvas#${CANVAS_ID}`)!

  const controls = new OrbitControls(camera, canvas)
  controls.autoRotate = true

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })

  function renderLoop() {
    // animation goes here

    if (brain) {
      // brain.rotateY(Math.PI / 500)

      const { x: ctrlTargetX, y: ctrlTargetY, z: ctrlTargetZ } = brain.position
      controls.target.set(ctrlTargetX, ctrlTargetY, ctrlTargetZ)
      controls.update()
    }

    // responsiveness
    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement
      camera.aspect = canvas.clientWidth / canvas.clientHeight
      camera.updateProjectionMatrix()
    }

    logObject(camera)

    renderer.render(scene, camera)
    requestAnimationFrame(renderLoop)
  }
  requestAnimationFrame(renderLoop)
}

async function makeBrain() {
  const gltfLoader = new GLTFLoader()
  const gltf = await gltfLoader.loadAsync('/models/brain_sliced.glb')
  const cerebrumRight = gltf.scene.getObjectByName('cerebrum-right')! as THREE.Mesh
  const cerebrumMaterial = new MeshPhongMaterial({ color: 'pink', shininess: 50 })
  cerebrumRight.material = cerebrumMaterial // override material

  const cerebrumLeft = new THREE.Mesh()
  cerebrumLeft.copy(cerebrumRight)
  cerebrumLeft.name = 'cerebrum-left'
  cerebrumLeft.applyMatrix4(new THREE.Matrix4().makeScale(-1, 1, 1)) // mirror geometry
  cerebrumLeft.castShadow = true

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

  const brain = new THREE.Object3D()
  brain.name = 'brain'
  brain.add(leftHemisphere)
  brain.add(rightHemisphere)
  brain.scale.setScalar(3)
  brain.position.set(0, 1.5, 0)

  registerMeshControls(leftHemisphere)

  logObject(brain)

  return brain
}

function registerMeshControls(mesh: THREE.Object3D) {
  const originalPosition = mesh.position.clone()

  document.addEventListener('keydown', (event: KeyboardEvent) => {
    const stepSize = 0.1
    switch (event.key) {
      case 'ArrowLeft': {
        const currentPosition = mesh.position
        mesh.position.set(currentPosition.x - stepSize, currentPosition.y, currentPosition.z)
        break
      }
      case 'ArrowRight': {
        const currentPosition = mesh.position
        mesh.position.set(currentPosition.x + stepSize, currentPosition.y, currentPosition.z)
        break
      }
      case 'ArrowUp': {
        const currentPosition = mesh.position
        mesh.position.set(currentPosition.x, currentPosition.y, currentPosition.z - stepSize)
        break
      }
      case 'ArrowDown': {
        const currentPosition = mesh.position
        mesh.position.set(currentPosition.x, currentPosition.y, currentPosition.z + stepSize)
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
  .then(() => console.log('👍'))
  .catch((e) => console.error('le poop: ', e))
