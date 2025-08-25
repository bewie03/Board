/// <reference types="vite/client" />

// Type declarations for our modules
declare module '*.tsx' {
  import type { ComponentType } from 'react'
  const component: ComponentType
  export default component
}

declare module '*.png' {
  const value: string
  export default value
}

declare module '*.jpg' {
  const value: string
  export default value
}

declare module '*.svg' {
  import React = require('react')
  export const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>
  const src: string
  export default src
}
