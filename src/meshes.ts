import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { logObject } from './helpers/dump-object'

export type Meshes = {
  brain: THREE.Object3D
  leftHemisphere: THREE.Object3D
  rightHemisphere: THREE.Object3D
  cerebrum: THREE.Mesh
  cerebellum: THREE.Mesh
  boundingMeshLeft: THREE.Mesh
  boundingMeshRight: THREE.Mesh
}

export async function buildMeshes(): Promise<Meshes> {
  const gltfLoader = new GLTFLoader()
  const gltf = await gltfLoader.loadAsync('/models/brain_sliced.glb')
  document.querySelector('#loader')?.remove()

  const cerebrumRight = gltf.scene.getObjectByName('cerebrum-right')! as THREE.Mesh
  const cerebrumMaterial = new THREE.MeshStandardMaterial({
    color: '#F29CA4',
    roughness: 0.35,
    metalness: 0.0,
  })
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
  boundingMeshRight.material = new THREE.MeshPhongMaterial({
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
  boundingMeshLeft.material = new THREE.MeshPhongMaterial({
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
