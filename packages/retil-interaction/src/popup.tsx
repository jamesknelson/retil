import React, {
  CSSProperties,
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
} from 'react'
import { Source, createState, fuse, useSource } from 'retil-source'
import {
  KeyPartitioner,
  composeKeyPartitioners,
  identity,
  partitionByKeys,
  useJoinRefs,
  useOpaqueIdentifier,
} from 'retil-support'

import { useConfigurator } from './configurator'
import { Connector } from './connector'
import { useEscapeConnector } from './escape'
import { ProvideIncreasedKeyboardPriority } from './keyboard'
import {
  PopupPositionerConfig,
  PopupPositionerReferenceElement,
  PopupPositionerSnapshot,
  popupPositionerServiceConfigurator,
  partitionPopupPositionerConfig,
} from './popupPositioner'
import { PopupTriggerHandle, PopupTriggerService } from './popupTrigger'

// ---

const popupActiveContext = createContext(false)
const popupArrowContext = createContext<PopupArrowContext>(undefined as any)
const popupIdsContext = createContext<PopupIds>(undefined as any)
const popupHandleContext = createContext<PopupHandle>(undefined as any)

export function usePopupActive() {
  return useContext(popupActiveContext)
}

export function usePopupArrow() {
  return useContext(popupArrowContext)
}

export function usePopupHandle() {
  return useContext(popupHandleContext)
}

export function usePopupIds() {
  return useContext(popupIdsContext)
}

export interface PopupConsumerProps {
  children: (active: boolean, ids: PopupIds) => React.ReactNode
}

export function PopupConsumer(props: PopupConsumerProps) {
  const active = useContext(popupActiveContext)
  const ids = useContext(popupIdsContext)
  return <>{props.children(active, ids)}</>
}

// ---

export interface PopupIds {
  popupId: any
  triggerId: any
}

export interface PopupHandle {
  close: () => void

  setPopup: (
    element: HTMLElement | SVGElement,
    setReferenceElement: (
      element: PopupPositionerReferenceElement | null,
    ) => void,
  ) => () => void
  setReferenceElement: (element: PopupPositionerReferenceElement | null) => void
  setTriggerService: (service: PopupTriggerService) => () => void
}

// ---

export interface UsePopupProviderOptions {
  popupId?: string
  triggerId?: string
}

export interface PopupProviderSnapshot {
  active: boolean
  handle: PopupHandle
  ids: PopupIds
}

export type PopupProviderConnector = Connector<PopupProviderSnapshot>

export const usePopupProviderConnector = (
  options: UsePopupProviderOptions = {},
): PopupProviderConnector => {
  const defaultPopupId = useOpaqueIdentifier()
  const defaultTriggerId = useOpaqueIdentifier()

  const { popupId = defaultPopupId, triggerId = defaultTriggerId } = options

  // Allow descendent elements to set a Source from which we'll take the active
  // state of the menu. Instead of using React state, we'll use a Retil source
  // so that the we can avoid re-renders until the state actually goes active –
  // which for popup menus, generally shouldn't happen without user interaction.
  const [[activeSourceSource, setActiveSource, sealActiveSourceSource]] =
    useState(() => createState<Source<boolean> | null>(null))
  const activeSource = useMemo(
    () =>
      fuse((use) => {
        const activeSource = use(activeSourceSource)
        return activeSource ? use(activeSource) : false
      }),
    [activeSourceSource],
  )
  const active = useSource(activeSource)

  // Clean up the active source source after usage
  useEffect(() => sealActiveSourceSource, [sealActiveSourceSource])

  const popupElementRef = useRef<HTMLElement | SVGElement | null>(null)
  const popupTriggerHandleRef = useRef<null | PopupTriggerHandle>(null)

  const referenceElementRef = useRef<PopupPositionerReferenceElement | null>(
    null,
  )
  const setReferenceElementCallbackRef = useRef<
    null | ((element: PopupPositionerReferenceElement | null) => void)
  >(null)

  const setPopup = useCallback(
    (
      element: HTMLElement | SVGElement,
      setReferenceElement: (
        element: PopupPositionerReferenceElement | null,
      ) => void,
    ) => {
      if (
        setReferenceElementCallbackRef.current &&
        setReferenceElementCallbackRef.current !== setReferenceElement
      ) {
        setReferenceElementCallbackRef.current(null)
      }

      setReferenceElementCallbackRef.current = setReferenceElement
      setReferenceElement(referenceElementRef.current)

      popupElementRef.current = element
      if (popupTriggerHandleRef.current) {
        popupTriggerHandleRef.current.setPopupElement(element)
      }

      return () => {
        if (popupElementRef.current === element) {
          popupElementRef.current = null
          if (popupTriggerHandleRef.current) {
            popupTriggerHandleRef.current.setPopupElement(null)
          }
        }

        if (setReferenceElementCallbackRef.current === setReferenceElement) {
          setReferenceElementCallbackRef.current(null)
          setReferenceElementCallbackRef.current = null
        }
      }
    },
    [],
  )

  const setReferenceElement = useCallback(
    (element: PopupPositionerReferenceElement | null) => {
      referenceElementRef.current = element
      if (setReferenceElementCallbackRef.current) {
        setReferenceElementCallbackRef.current(element)
      }
    },
    [],
  )

  const setTriggerService = useCallback(
    ([activeSource, triggerHandle]: PopupTriggerService) => {
      if (
        popupTriggerHandleRef.current &&
        popupTriggerHandleRef.current !== triggerHandle
      ) {
        popupTriggerHandleRef.current.setPopupElement(null)
      }

      popupTriggerHandleRef.current = triggerHandle
      triggerHandle.setPopupElement(popupElementRef.current)

      setActiveSource(activeSource)

      return () => {
        if (popupTriggerHandleRef.current === triggerHandle) {
          popupTriggerHandleRef.current = null
        }
        setActiveSource((currentActiveSource) =>
          activeSource === currentActiveSource ? null : currentActiveSource,
        )
      }
    },
    [setActiveSource],
  )

  const close = useCallback(() => {
    popupTriggerHandleRef.current?.close()
  }, [])

  const handle = useMemo<PopupHandle>(
    () => ({
      close,
      setPopup,
      setReferenceElement,
      setTriggerService,
    }),
    [close, setPopup, setReferenceElement, setTriggerService],
  )

  const ids = useMemo(
    () => ({
      popupId,
      triggerId,
    }),
    [popupId, triggerId],
  )

  const provide = useCallback(
    (children: React.ReactNode) => (
      <popupIdsContext.Provider value={ids}>
        <popupActiveContext.Provider value={active}>
          <popupHandleContext.Provider value={handle}>
            {children}
          </popupHandleContext.Provider>
        </popupActiveContext.Provider>
      </popupIdsContext.Provider>
    ),
    [active, handle, ids],
  )

  return [{ active, handle, ids }, identity, provide]
}

export interface PopupProviderProps extends UsePopupProviderOptions {
  children: React.ReactNode
}

export function PopupProvider({ children, ...options }: PopupProviderProps) {
  const [, , provide] = usePopupProviderConnector(options)
  return provide(children)
}

// ---

export interface PopupMergedProps<TElement extends HTMLElement | SVGElement> {
  hidden: boolean
  id: string
  ref: (element: TElement | null) => void
  style?: CSSProperties
}

export type PopupMergeableProps<TElement extends HTMLElement | SVGElement> = {
  hidden?: boolean
  id?: never
  ref?: React.Ref<TElement>
  style?: CSSProperties
}

export type MergePopupProps = <
  TElement extends HTMLElement | SVGElement,
  TMergeProps extends PopupMergeableProps<TElement> & Record<string, any> = {},
>(
  mergeProps?: TMergeProps &
    PopupMergeableProps<TElement> &
    Record<string, any>,
) => Omit<TMergeProps, keyof PopupMergeableProps<TElement>> &
  PopupMergedProps<TElement>

export interface PopupOwnOptions {
  mergeStyle?: (
    popupStyles?: React.CSSProperties,
    elementStyles?: React.CSSProperties,
  ) => React.CSSProperties | undefined
}

const partitionOwnOptions: KeyPartitioner<PopupOwnOptions> = (object) =>
  partitionByKeys(['mergeStyle'], object)

export interface PopupOptions extends PopupPositionerConfig, PopupOwnOptions {}

export const partitionPopupOptions = composeKeyPartitioners(
  partitionPopupPositionerConfig,
  partitionOwnOptions,
)

export interface PopupSnapshot extends PopupPositionerSnapshot {
  updatePosition: () => void
  forceUpdatePosition: () => void
}

export type PopupConnector = Connector<PopupSnapshot, MergePopupProps>

export function usePopupConnector(
  /**
   * While `active` is available from the context, we require it to be passed in
   * manually, either via a <PopupConsumer> or `usePopupContext()`. This ensures
   * that the popup can be animated in/out without being affected by stale
   * context.
   */
  popupActive: boolean,
  allOptions: PopupOptions = {},
): PopupConnector {
  const popupHandle = useContext(popupHandleContext)
  const popupIds = useContext(popupIdsContext)

  const [ownOptions, popupPositionerOptions] = partitionOwnOptions(allOptions)

  const { mergeStyle = defaultStyleMerger } = ownOptions

  const [positionSource, positionerHandle] = useConfigurator(
    popupPositionerServiceConfigurator,
    popupPositionerOptions,
  )
  const position = useSource(positionSource)
  const {
    arrowStyles,
    // hasPopupEscaped,
    // isReferenceHidden,
    placement,
    popupStyles,
  } = position
  const { forceUpdate, setArrowElement, setPopupElement, setReferenceElement } =
    positionerHandle

  const cleanupRef = useRef<(() => void) | null>()
  const popupRef = useCallback(
    (element: SVGElement | HTMLElement | null) => {
      setPopupElement(element)

      if (cleanupRef.current) {
        cleanupRef.current()
      }
      if (element) {
        cleanupRef.current = popupHandle.setPopup(element, setReferenceElement)
      }
    },
    [popupHandle, setPopupElement, setReferenceElement],
  )

  const [, mergeEscapeProps, provideEscape] = useEscapeConnector(
    popupHandle.close,
  )

  const isVisible = popupActive && popupStyles?.visibility !== 'hidden'
  const popupArrow = useMemo(
    () => ({
      forceUpdate,
      isVisible,
      placement,
      setArrowElement,
      style: arrowStyles,
    }),
    [arrowStyles, forceUpdate, isVisible, placement, setArrowElement],
  )

  const provide = (children: React.ReactNode) => (
    <ProvideIncreasedKeyboardPriority>
      {provideEscape(
        <popupArrowContext.Provider value={popupArrow}>
          {children}
        </popupArrowContext.Provider>,
      )}
    </ProvideIncreasedKeyboardPriority>
  )

  const joinRefs = useJoinRefs()
  const mergeProps: MergePopupProps = (rawMergeProps = {} as any) => {
    const { id, ...mergeProps } = mergeEscapeProps(rawMergeProps)
    const popupMergedProps: PopupMergedProps<any> = {
      ...mergeProps,
      hidden: mergeProps.hidden ?? !popupActive,
      id: popupIds.popupId as string,
      ref: joinRefs(popupRef, mergeProps?.ref),
      style: mergeStyle(position.popupStyles, mergeProps?.mergeStyle),
    }

    return Object.assign({
      ...mergeProps,
      ...popupMergedProps,
    })
  }

  const snapshot: PopupSnapshot = {
    ...position,
    forceUpdatePosition: positionerHandle.forceUpdate,
    updatePosition: positionerHandle.update,
  }

  return [snapshot, mergeProps, provide]
}

// ---

export interface PopupArrowContext {
  forceUpdate: () => void
  isVisible: boolean
  placement: string
  setArrowElement: React.Ref<HTMLElement | SVGElement | null>
  style?: CSSProperties
}

export interface PopupArrowMergedProps<
  TElement extends HTMLElement | SVGElement,
> {
  ref: React.RefCallback<TElement>
  style: CSSProperties | undefined
  'data-placement': string
}

export type PopupArrowMergeableProps<
  TElement extends HTMLElement | SVGElement,
> = {
  'data-placement'?: never
  style?: CSSProperties
  ref?: React.Ref<TElement | null>
}

export type MergePopupArrowProps = <
  TElement extends HTMLElement | SVGElement,
  TMergeProps extends PopupArrowMergeableProps<TElement> = {},
>(
  mergeProps?: TMergeProps &
    PopupArrowMergeableProps<TElement> &
    Record<string, any>,
) => TMergeProps & PopupArrowMergedProps<TElement>

export function useMergePopupArrowProps(): MergePopupArrowProps {
  const { forceUpdate, isVisible, placement, setArrowElement, style } =
    useContext(popupArrowContext)

  const joinRefs = useJoinRefs()

  // The positioner doesn't seem to know how to position the arrow until the
  // popup element itself is visible.
  useLayoutEffect(() => {
    if (isVisible) {
      forceUpdate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible])

  const mergeProps: MergePopupArrowProps = (mergeProps = {} as any) => ({
    ...mergeProps,
    ref: joinRefs(setArrowElement, mergeProps?.ref),
    style: {
      ...style,
      ...mergeProps?.style,
    },
    'data-placement': placement,
  })

  return mergeProps
}

// ---

export const PopupDialogArrowDiv = forwardRef(function PopupDialogArrowDiv(
  props: JSX.IntrinsicElements['div'],
  ref: React.Ref<HTMLDivElement>,
) {
  const mergeArrowProps = useMergePopupArrowProps()
  return <div {...mergeArrowProps({ ...props, ref })} />
})

// ---

function defaultStyleMerger(
  popupStyles?: React.CSSProperties,
  elementStyles?: React.CSSProperties,
): React.CSSProperties | undefined {
  return popupStyles || elementStyles
    ? Object.assign({}, popupStyles, elementStyles)
    : undefined
}
