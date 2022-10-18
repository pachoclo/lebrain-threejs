import './info-panel.css'

export const partInfo = {
  frontalLobe: {
    title: 'Frontal Lobe',
    content: `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`,
    image: 'frontal-lobe.png',
  },
  parietalLobe: {
    title: 'Parietal Lobe',
    content: `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`,
    image: 'parietal-lobe.png',
  },
}

let overlay = document.querySelector('.overlay')!
let infoPanelContainer = document.querySelector('.info-panel-container')!

let hide = () => {
  infoPanelContainer.classList.add('info-panel-container__hidden')
  setTimeout(() => {
    overlay?.classList.add('overlay__hidden')
  }, 200)
}

let show = () => {
  overlay?.classList.remove('overlay__hidden')
  setTimeout(() => {
    infoPanelContainer.classList.remove('info-panel-container__hidden')
  }, 50)
}

let closeButton = document.createElement('button')
closeButton.classList.add('info-panel-close')
closeButton.textContent = 'close'

closeButton.addEventListener('mousedown', hide)
overlay?.addEventListener('mousedown', (event) => {
  const { target } = event
  if (target && (target as HTMLElement).className === 'overlay') {
    hide()
  }
})

export function infoPanel(partName: keyof typeof partInfo) {
  let info = partInfo[partName]

  infoPanelContainer.innerHTML = `
  <article>
  <h1>${info.title}</h1>
  <p>
  <img src="/images/${info.image}"/>
  </p>
  <p>${info.content}</p>
  </article>
  `

  infoPanelContainer.prepend(closeButton)

  show()
}
