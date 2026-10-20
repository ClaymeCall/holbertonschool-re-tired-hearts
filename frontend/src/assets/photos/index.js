import womanSweaterSmall from './woman-white-sweater-480.webp'
import womanSweaterLarge from './woman-white-sweater-800.webp'
import womanYoga from './woman-yoga-480.webp'
import womanHeadscarf from './woman-headscarf-480.webp'
import manGrayBeard from './man-gray-beard-480.webp'
import womanPortrait from './woman-portrait-480.webp'
import pottery from './pottery-workshop-640.webp'
import joyfulWalk from './couple-joyful-walk-640.webp'
import dancing from './couple-dancing-640.webp'
import smiling from './couple-smiling-640.webp'
import conversation from './couple-conversation-640.webp'

// Photos Pexels (licence Pexels, usage libre).
export const photos = {
  womanSweater: {
    src: womanSweaterSmall,
    srcset: `${womanSweaterSmall} 480w, ${womanSweaterLarge} 800w`,
    width: 800,
    height: 1200,
    alt: 'Portrait d’une femme aux cheveux clairs, souriante, dans un pull blanc.',
  },
  womanYoga: {
    src: womanYoga,
    width: 480,
    height: 720,
    alt: 'Une femme aux cheveux gris tient une posture d’équilibre pendant un cours de yoga.',
  },
  womanHeadscarf: {
    src: womanHeadscarf,
    width: 480,
    height: 720,
    alt: 'Portrait d’une femme âgée souriante, coiffée d’un foulard fleuri.',
  },
  manGrayBeard: {
    src: manGrayBeard,
    width: 480,
    height: 720,
    alt: 'Portrait d’un homme âgé à la barbe grise, qui sourit chaleureusement.',
  },
  womanPortrait: {
    src: womanPortrait,
    width: 480,
    height: 720,
    alt: 'Portrait en gros plan d’une femme âgée aux cheveux courts et blonds, souriante.',
  },
  pottery: {
    src: pottery,
    width: 640,
    height: 427,
    alt: 'Trois personnes âgées peignent de la poterie autour d’une grande table dans un atelier.',
  },
  joyfulWalk: {
    src: joyfulWalk,
    width: 640,
    height: 427,
    alt: 'Un couple de seniors marche en riant dans un bois, accompagné de son chien.',
  },
  dancing: {
    src: dancing,
    width: 640,
    height: 427,
    alt: 'Un couple de seniors danse en se tenant les mains, dans une pièce lumineuse.',
  },
  smiling: {
    src: smiling,
    width: 640,
    height: 427,
    alt: 'Un couple de seniors joue contre joue, la femme sourit.',
  },
  conversation: {
    src: conversation,
    width: 640,
    height: 427,
    alt: 'Une femme en salopette et un homme en chemise à carreaux discutent en riant dans un jardin.',
  },
}
