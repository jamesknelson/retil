import {
  createPopper,
  Instance as PopperInstance,
  Options as PopperOptions,
  Placement,
  PositioningStrategy,
  State as PopperState,
  VirtualElement,
} from '@popperjs/core'
import * as CSS from 'csstype'
import isDeepEqual from 'fast-deep-equal'
import { createState } from 'retil-source'

import { Configurator } from './configurator'
import { Service } from './service'

export type PopupPositionerReferenceElement = Element | VirtualElement

export type PopupPositionerService = Service<
  PopupPositionerSnapshot,
  PopupPositionerController
>

export type PopupPositionerServiceConfigurator = Configurator<
  PopupPositionerConfig,
  PopupPositionerService
>

const areConfigsEqual = isDeepEqual
export interface PopupPositionerConfig {
  adaptive?: boolean
  gpuAcceleration?: boolean
  defaultReference?: ClientRect | DOMRect // TODO
  offset?: readonly [along: number, away: number]
  placement?: Placement
  strategy?: PositioningStrategy
  delayTeardownPopup?: number
}

type PopupPositionerConfigWithDefaults = Omit<
  Required<PopupPositionerConfig>,
  'defaultReference'
> &
  Pick<PopupPositionerConfig, 'defaultReference'>

export const popupPositionerConfigDefaults = {
  adaptive: true,
  gpuAcceleration: true,
  delayTeardownPopup: 500,
  offset: [0, 10] as const,
  placement: 'bottom' as const,
  strategy: 'absolute' as const,
}

const areSnapshotsEqual = isDeepEqual
export interface PopupPositionerSnapshot {
  arrowStyles: CSS.Properties | undefined
  hasPopupEscaped: boolean
  isReferenceHidden: boolean
  placement: Placement
  popupStyles: CSS.Properties | undefined
}

export interface PopupPositionerController {
  update: () => void
  forceUpdate: () => void
  setArrowElement: (node: HTMLElement | null) => void
  setReferenceElement: (node: PopupPositionerReferenceElement | null) => void
  setPopupElement: (node: HTMLElement | null) => void
}

export const popupPositionerServiceConfigurator: PopupPositionerServiceConfigurator = (
  initialConfig: PopupPositionerConfig,
) => {
  let mutableArrowElement: HTMLElement | null = null
  let mutablePopupElement: HTMLElement | null = null
  let mutableReferenceElement: PopupPositionerReferenceElement | null = null

  let mutableConfig: PopupPositionerConfigWithDefaults = {
    ...popupPositionerConfigDefaults,
    ...initialConfig,
  }

  let mutableInstance: PopperInstance | null = null

  const [source, setSnapshot] = createState(
    createSnapshot(mutableConfig),
    areSnapshotsEqual,
  )

  const updateInstance = () => {
    if (mutableTeardownPopupTimeout) {
      clearTimeout(mutableTeardownPopupTimeout)
      mutableTeardownPopupTimeout = undefined
    }

    if (mutableInstance) {
      mutableInstance.destroy()
    }
    if (mutableReferenceElement && mutablePopupElement) {
      // Unfortunately the popper doesn't synchronously produce styles, so
      // we can't immediately emit a snapshot. Instead, we'll need to hide the
      // initial element with { visibility: hidden }, before revealing it once
      // the styles are available.
      mutableInstance = createPopper(
        mutableReferenceElement,
        mutablePopupElement,
        getPopperOptions(mutableConfig, setSnapshot, mutableArrowElement),
      )
    } else if (mutableInstance) {
      setSnapshot(createSnapshot(mutableConfig))
      mutableInstance = null
    }
  }

  const setArrowElement = (element: HTMLElement | null) => {
    if (element !== mutableArrowElement) {
      mutableArrowElement = element
      if (mutableInstance) {
        if (mutablePopupElement) {
          mutableInstance.setOptions(
            getPopperOptions(mutableConfig, setSnapshot, element),
          )
        } else {
          updateInstance()
        }
      }
    }
  }

  const setReferenceElement = (
    element: PopupPositionerReferenceElement | null,
  ) => {
    if (element !== mutableReferenceElement) {
      mutableReferenceElement = element
      updateInstance()
    }
  }

  let mutableTeardownPopupTimeout: any | undefined
  const setPopupElement = (element: HTMLElement | null) => {
    if (element !== mutablePopupElement) {
      if (mutableTeardownPopupTimeout) {
        clearTimeout(mutableTeardownPopupTimeout)
        mutableTeardownPopupTimeout = undefined
      }

      mutablePopupElement = element

      if (element !== null) {
        updateInstance()
      } else {
        // Delay reaction teardowns to avoid closing popups due to badly
        // written libraries nulling out elements in the wrong order.
        mutableTeardownPopupTimeout = setTimeout(
          updateInstance,
          mutableConfig.delayTeardownPopup ??
            popupPositionerConfigDefaults.delayTeardownPopup,
        )
      }
    }
  }

  const controller: PopupPositionerController = {
    update: () => {
      mutableInstance?.update()
    },
    forceUpdate: () => {
      mutableInstance?.forceUpdate()
    },
    setArrowElement,
    setReferenceElement,
    setPopupElement,
  }

  const reconfigure = (nextConfig: PopupPositionerConfig) => {
    const nextConfigWithDefaults = {
      ...popupPositionerConfigDefaults,
      ...nextConfig,
    }
    if (!areConfigsEqual(mutableConfig, nextConfigWithDefaults)) {
      mutableConfig = nextConfigWithDefaults
      if (mutableInstance) {
        mutableInstance.setOptions(
          getPopperOptions(mutableConfig, setSnapshot, mutableArrowElement),
        )
      }
    }
  }

  return [reconfigure, [source, controller]]
}

// Hide the popup until we have the styles to avoid a flash of incorrectly
// positioned content.
const hiddenStyles = {
  position: 'absolute',
  visibility: 'hidden',
  zIndex: -999,
}

const createSnapshot = (
  config: PopupPositionerConfigWithDefaults,
  state?: PopperState,
): PopupPositionerSnapshot => ({
  arrowStyles: (state?.styles.arrow as CSS.Properties) || hiddenStyles,
  placement: state?.placement || config.placement,
  hasPopupEscaped:
    state && state.modifiersData.hide
      ? !!state.modifiersData.hide.hasPopperEscaped
      : false,
  isReferenceHidden:
    state && state.modifiersData.hide
      ? !!state.modifiersData.hide.isReferenceHidden
      : false,
  popupStyles: (state?.styles.popper as CSS.Properties) || hiddenStyles,
})

const getPopperOptions = (
  config: PopupPositionerConfigWithDefaults,
  setSnapshot: (snapshot: PopupPositionerSnapshot) => void,
  arrowElement: HTMLElement | null,
): PopperOptions => ({
  modifiers: [
    {
      name: 'arrow',
      enabled: !!arrowElement,
      options: { element: arrowElement },
    },
    {
      name: 'offset',
      options: {
        offset: config.offset,
      },
    },
    {
      name: 'preventOverflow',
      enabled: true,
    },
    {
      name: 'computeStyles',
      options: {
        adaptive: config.adaptive,
        gpuAcceleration: config.gpuAcceleration,
      },
    },
    {
      name: 'updateState',
      enabled: true,
      phase: 'write',
      fn: ({ state }: { state: PopperState }) => {
        setSnapshot(createSnapshot(config, state))
      },
      requires: ['computeStyles'],
    },
    { name: 'applyStyles', enabled: false },
  ],
  placement: config.placement,
  strategy: config.strategy,
})
