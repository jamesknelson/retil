import { useCallback, useMemo } from 'react'
import { Source, useSource } from 'retil-source'

import { useConfigurator } from './configurator'
import {
  PopupPositionerConfig,
  PopupPositionerReferenceElement,
  PopupPositionerSnapshot,
  popupPositionerServiceConfigurator,
} from './popupPositioner'
import {
  PopupTriggerConfig,
  popupTriggerServiceConfigurator,
  splitPopupTriggerConfig,
} from './popupTrigger'
import { useService } from './service'

export interface PopupHandle {
  positionSource: Source<PopupPositionerSnapshot>

  close: () => void
  open: () => void
  toggle: () => void

  forceUpdatePosition: () => void
  updatePosition: () => void

  setArrowElement: (element: HTMLElement | null) => void
  setPopupElement: (element: HTMLElement | null) => void
  setReferenceElement: (element: PopupPositionerReferenceElement | null) => void
  setTriggerElement: (element: HTMLElement | null) => void
}

export interface UsePopupConfig
  extends PopupTriggerConfig,
    PopupPositionerConfig {}

export const usePopup = (
  config: UsePopupConfig,
): readonly [boolean, PopupHandle] => {
  const [triggerConfig, positionerConfig] = splitPopupTriggerConfig(config)

  const [positionSource, positionerController] = useConfigurator(
    popupPositionerServiceConfigurator,
    positionerConfig,
  )
  const triggerService = useConfigurator(
    popupTriggerServiceConfigurator,
    triggerConfig,
  )

  const [active, triggerController] = useService(triggerService)

  const setPopupElement = useCallback(
    (element: HTMLElement | null) => {
      positionerController.setPopupElement(element)
      triggerController.setPopupElement(element)
    },
    [triggerController, positionerController],
  )

  const handle = useMemo<PopupHandle>(
    () => ({
      positionSource,

      close: triggerController.close,
      open: triggerController.open,
      toggle: triggerController.toggle,

      forceUpdatePosition: positionerController.forceUpdate,
      updatePosition: positionerController.update,

      setArrowElement: positionerController.setArrowElement,
      setPopupElement,
      setReferenceElement: positionerController.setReferenceElement,
      setTriggerElement: triggerController.setTriggerElement,
    }),
    [positionerController, setPopupElement, positionSource, triggerController],
  )

  return [active, handle]
}

export const usePopupPosition = (popupHandle: PopupHandle) =>
  useSource(popupHandle.positionSource)
