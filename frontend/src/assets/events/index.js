import cycling from './cycling-640.webp'
import pottery from './pottery-640.webp'
import hiking from './hiking-640.webp'
import yoga from './yoga-640.webp'
import dance from './dance-640.webp'
import garden from './garden-640.webp'
import generic from './generic-640.webp'

// Photos Pexels (licence Pexels, usage libre), une par type de sortie : aucune n'est utilisée ailleurs sur le site.
export const eventPhotos = {
  cycling: { src: cycling, position: 'object-center' },
  hiking: { src: hiking, position: 'object-[50%_25%]' },
  yoga: { src: yoga, position: 'object-center' },
  pottery: { src: pottery, position: 'object-[50%_35%]' },
  dance: { src: dance, position: 'object-[50%_35%]' },
  garden: { src: garden, position: 'object-center' },
  generic: { src: generic, position: 'object-[50%_40%]' },
}
