import type { Transition } from 'framer-motion'

export const spring: Transition = {
  type: 'spring',
  stiffness: 380,
  damping: 32,
  mass: 0.9
}

export const springSoft: Transition = {
  type: 'spring',
  stiffness: 200,
  damping: 28,
  mass: 1
}

export const fade: Transition = {
  duration: 0.22,
  ease: [0.16, 1, 0.3, 1]
}

export const windowOpen = {
  initial: { scale: 0.92, opacity: 0, filter: 'blur(20px)' },
  animate: { scale: 1, opacity: 1, filter: 'blur(0px)' },
  exit: { scale: 0.96, opacity: 0, filter: 'blur(14px)' },
  transition: spring
}
