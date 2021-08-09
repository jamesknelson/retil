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
import { fromEntries, identity, useOpaqueIdentifier } from 'retil-support'

import { useConfigurator } from './configurator'
import { useEscapeConnector } from './escape'
import { useJoinRefs } from './joinRefs'
import { useKeyMapHandler, useMergeKeyboardProps } from './keyboard'
import {
  PopupPositionerConfig,
  PopupPositionerHandle,
  PopupPositionerReferenceElement,
  PopupPositionerSnapshot,
  popupPositionerServiceConfigurator,
  splitPopupPositionerConfig,
} from './popupPositioner'
import {
  PopupTriggerConfig,
  PopupTriggerHandle,
  popupTriggerServiceConfigurator,
  splitPopupTriggerConfig,
} from './popupTrigger'

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

export type PopupTriggerService = readonly [
  activeSource: Source<boolean>,
  setPopupElement: (element: HTMLElement | SVGElement | null) => void,
]

export interface PopupIds {
  popupId: any
  triggerId: any
}

export interface PopupHandle {
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

export const usePopupProviderConnector = (
  options: UsePopupProviderOptions = {},
): readonly [
  state: { active: boolean },
  mergeProps: typeof identity,
  provide: (children: React.ReactNode) => React.ReactElement,
  handle: PopupHandle,
] => {
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
  const setPopupElementCallbackRef = useRef<
    null | ((element: HTMLElement | SVGElement | null) => void)
  >(null)

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
      if (setPopupElementCallbackRef.current) {
        setPopupElementCallbackRef.current(element)
      }

      return () => {
        if (popupElementRef.current === element) {
          popupElementRef.current = null
          if (setPopupElementCallbackRef.current) {
            setPopupElementCallbackRef.current(null)
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
    (service: PopupTriggerService) => {
      const [activeSource, setPopupElement] = service

      if (
        setPopupElementCallbackRef.current &&
        setPopupElementCallbackRef.current !== setPopupElement
      ) {
        setPopupElementCallbackRef.current(null)
      }

      setPopupElementCallbackRef.current = setPopupElement
      setPopupElement(popupElementRef.current)

      setActiveSource(activeSource)

      return () => {
        if (setPopupElementCallbackRef.current === setPopupElement) {
          setPopupElementCallbackRef.current = null
        }
        setActiveSource((currentActiveSource) =>
          activeSource === currentActiveSource ? null : currentActiveSource,
        )
      }
    },
    [setActiveSource],
  )

  const handle = useMemo<PopupHandle>(
    () => ({
      setPopup,
      setReferenceElement,
      setTriggerService,
    }),
    [setPopup, setReferenceElement, setTriggerService],
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

  return [{ active }, identity, provide, handle]
}

export interface PopupProviderProps extends UsePopupProviderOptions {
  children: React.ReactNode
}

export function PopupProvider({ children, ...options }: PopupProviderProps) {
  const [, , provide] = usePopupProviderConnector(options)
  return provide(children)
}

// ---

export interface PopupTriggerMergedProps<
  TElement extends HTMLElement | SVGElement,
> {
  'aria-controls': string
  'aria-expanded': boolean
  'aria-haspopup': boolean
  id: string
  onKeyDown?: (event: React.KeyboardEvent<TElement>) => void
  ref: (element: TElement) => void
}

export type PopupTriggerMergeableProps<
  TElement extends HTMLElement | SVGElement,
> = {
  'aria-controls'?: never
  'aria-expanded'?: never
  'aria-haspopup'?: never
  id?: never
  onKeyDown?: (event: React.KeyboardEvent<TElement>) => void
  ref?: React.Ref<TElement>
}

export type MergePopupTriggerProps = <
  TElement extends HTMLElement | SVGElement,
  TMergeProps extends PopupTriggerMergeableProps<TElement> = {},
>(
  mergeProps?: TMergeProps &
    PopupTriggerMergeableProps<TElement> &
    Record<string, any>,
) => TMergeProps & PopupTriggerMergedProps<TElement>

export interface PopupTriggerOptions extends PopupTriggerConfig {
  captureKeyboard?: boolean
  externalReference?: boolean
  triggerOnKeys?: string[]
}

export function splitPopupTriggerOptions<P extends PopupTriggerOptions>(
  props: P,
): readonly [PopupTriggerOptions, Omit<P, keyof PopupTriggerOptions>] {
  const { captureKeyboard, externalReference, triggerOnKeys, ...notOurs } =
    props
  const [popupTriggerConfig, rest] = splitPopupTriggerConfig(notOurs)

  return [
    {
      captureKeyboard,
      externalReference,
      triggerOnKeys,
      ...popupTriggerConfig,
    },
    rest as Omit<P, keyof PopupTriggerOptions>,
  ]
}

export function usePopupTriggerConnector(
  options: PopupTriggerOptions,
): readonly [
  state: { active: boolean },
  mergeProps: MergePopupTriggerProps,
  provide: (children: React.ReactNode) => React.ReactElement,
  handle: PopupTriggerHandle,
] {
  const {
    captureKeyboard = false,
    externalReference = false,
    triggerOnKeys = ['Enter', ' '],
    ...triggerConfig
  } = options

  const active = useContext(popupActiveContext)
  const ids = useContext(popupIdsContext)
  const popupHandle = useContext(popupHandleContext)

  const [activeSource, triggerHandle] = useConfigurator(
    popupTriggerServiceConfigurator,
    triggerConfig,
  )
  const { close, open, setPopupElement, setTriggerElement } = triggerHandle

  const cleanupRef = useRef<(() => void) | null>()

  useEffect(
    () => () => {
      if (cleanupRef.current) {
        cleanupRef.current()
      }
    },
    [],
  )

  const keyMapHandler = useKeyMapHandler(
    fromEntries(triggerOnKeys.map((key) => [key, open])),
  )
  const mergeKeyboardProps = useMergeKeyboardProps(
    options.disabled ? null : keyMapHandler,
    {
      capture: captureKeyboard,
    },
  )
  const [, mergeEscapeProps, provideEscape] = useEscapeConnector(close)

  const triggerRef = useCallback(
    (element: SVGElement | HTMLElement | null) => {
      // Adds event handlers, but does not cause any changes in state
      setTriggerElement(element)

      if (cleanupRef.current) {
        cleanupRef.current()
      }
      if (!externalReference) {
        popupHandle.setReferenceElement(element)
      }
      if (element) {
        cleanupRef.current = popupHandle.setTriggerService([
          activeSource,
          setPopupElement,
        ])
      }
    },
    [
      activeSource,
      externalReference,
      popupHandle,
      setPopupElement,
      setTriggerElement,
    ],
  )

  const joinRefs = useJoinRefs()

  const mergeProps: MergePopupTriggerProps = (rawMergeProps = {} as any) => {
    const mergeProps = mergeEscapeProps(mergeKeyboardProps(rawMergeProps))

    const popupTriggerMergedProps: PopupTriggerMergedProps<any> = {
      ...mergeProps,
      id: ids.triggerId,
      ref: joinRefs(triggerRef, mergeProps?.ref),
      'aria-controls': ids.popupId,
      'aria-expanded': active,
      'aria-haspopup': true,
    }

    return {
      ...mergeProps,
      ...popupTriggerMergedProps,
    }
  }

  return [{ active }, mergeProps, provideEscape, triggerHandle]
}

// ---

export interface PopupMergedProps<TElement extends HTMLElement | SVGElement> {
  hidden: boolean
  id: string
  ref: (element: TElement | null) => void
  style: CSSProperties
}

export type PopupMergeableProps<TElement extends HTMLElement | SVGElement> = {
  hidden?: boolean
  id?: never
  ref?: React.Ref<TElement>
  mergeStyle?:
    | React.CSSProperties
    | ((popupStyles?: React.CSSProperties) => React.CSSProperties)
}

export type MergePopupProps = <
  TElement extends HTMLElement | SVGElement,
  TMergeProps extends PopupMergeableProps<TElement> = {},
>(
  mergeProps?: TMergeProps &
    PopupMergeableProps<TElement> &
    Record<string, any>,
) => TMergeProps & PopupMergedProps<TElement>

export interface PopupOptions extends PopupPositionerConfig {}

export const splitPopupOptions = splitPopupPositionerConfig

export function usePopupConnector(
  /**
   * While `active` is available from the context, we require it to be passed in
   * manually, either via a <PopupConsumer> or `usePopupContext()`. This ensures
   * that the popup can be animated in/out.
   */
  popupActive: boolean,
  options: PopupOptions = {},
): readonly [
  state: PopupPositionerSnapshot,
  mergeProps: MergePopupProps,
  provide: (children: React.ReactNode) => React.ReactElement,
  handle: PopupPositionerHandle,
] {
  const popupHandle = useContext(popupHandleContext)
  const popupIds = useContext(popupIdsContext)

  const [positionSource, positionerHandle] = useConfigurator(
    popupPositionerServiceConfigurator,
    options,
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

  useEffect(
    () => () => {
      if (cleanupRef.current) {
        cleanupRef.current()
      }
    },
    [],
  )

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

  const provideArrow = useCallback(
    (children: React.ReactNode) => (
      <popupArrowContext.Provider value={popupArrow}>
        {children}
      </popupArrowContext.Provider>
    ),
    [popupArrow],
  )

  const joinRefs = useJoinRefs()
  const mergeProps: MergePopupProps = (mergeProps = {} as any) => ({
    ...mergeProps,
    hidden: mergeProps?.hidden ?? !popupActive,
    id: popupIds.popupId as string,
    ref: joinRefs(popupRef, mergeProps?.ref),
    style:
      typeof mergeProps?.mergeStyle === 'function'
        ? mergeProps.mergeStyle(position.popupStyles)
        : {
            ...position.popupStyles,
            ...mergeProps?.mergeStyle,
          },
  })

  return [position, mergeProps, provideArrow, positionerHandle]
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
