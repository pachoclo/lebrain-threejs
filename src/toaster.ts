export function makeToaster(selector: string) {
  const el = document.querySelector(selector)! as HTMLElement
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
