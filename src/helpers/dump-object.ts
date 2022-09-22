// source: https://threejs.org/manual/#en/load-gltf

function dumpObject(obj: THREE.Object3D, lines: string[] = [], isLast = true, prefix = '') {
  const localPrefix = isLast ? '└─' : '├─'

  lines.push(`${prefix}${prefix ? localPrefix : ''}${obj.name || '*no-name*'} [${obj.type}]`)

  const newPrefix = prefix + (isLast ? '  ' : '│ ')
  const lastNdx = obj.children.length - 1

  obj.children.forEach((child, ndx) => {
    const isLast = ndx === lastNdx
    dumpObject(child, lines, isLast, newPrefix)
  })

  return lines
}

export function logObject(object: THREE.Object3D) {
  console.log(dumpObject(object).join('\n'))
}
