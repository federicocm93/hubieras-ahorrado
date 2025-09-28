import type { DetailedHTMLProps, HTMLAttributes } from 'react'

declare global {
  interface NumberFlowElement extends HTMLElement {
    animated: boolean
    respectMotionPreference: boolean
    locales?: Intl.LocalesArgument
    format?: Intl.NumberFormatOptions
    numberPrefix?: string
    numberSuffix?: string
    update(value?: number): void
  }

  interface HTMLElementTagNameMap {
    'number-flow': NumberFlowElement
  }

  type NumberFlowProps = DetailedHTMLProps<HTMLAttributes<NumberFlowElement>, NumberFlowElement>

  namespace JSX {
    interface IntrinsicElements {
      'number-flow': NumberFlowProps
    }
  }

  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        'number-flow': NumberFlowProps
      }
    }
  }
}

export {}
