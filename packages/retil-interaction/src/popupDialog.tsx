import React, {
  CSSProperties,
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useImperativeHandle,
  useMemo,
  useLayoutEffect,
} from 'react'

import { useJoinRefs } from './joinRefs'
import { ConnectSurface, splitSurfaceProps, SurfaceProps } from './surface'
import {
  PopupHandle,
  UsePopupConfig,
  usePopup,
  usePopupPosition,
} from './popup'

const useOpaqueIdentifier = (React as any)
  .unstable_useOpaqueIdentifier as () => any

export interface PopupDialogConfig {
  disabled: boolean
  popupId: string
  triggerId: string
  triggerOnFocus: boolean
}

const PopupDialogConfigContext = createContext<PopupDialogConfig>(
  undefined as any,
)
const PopupDialogHandleContext = createContext<PopupHandle>(undefined as any)
const PopupDialogActiveContext = createContext(false)

interface ProvidePopupDialogProps
  extends UsePopupConfig,
    Partial<PopupDialogConfig> {
  children: React.ReactNode
}

export const ProvidePopupDialog = forwardRef<
  PopupHandle,
  ProvidePopupDialogProps
>((props, ref) => {
  const defaultPopupId = useOpaqueIdentifier()
  const defaultTriggerId = useOpaqueIdentifier()

  const {
    children,
    popupId = defaultPopupId,
    triggerId = defaultTriggerId,
    ...popupConfig
  } = props

  const triggerOnFocus = popupConfig.triggerOnFocus ?? false
  const disabled = !!props.disabled
  const config = useMemo(
    () => ({
      disabled,
      popupId,
      triggerId,
      triggerOnFocus,
    }),
    [disabled, popupId, triggerId, triggerOnFocus],
  )

  const [active, handle] = usePopup(popupConfig)

  useImperativeHandle(ref, () => handle)

  return (
    <PopupDialogHandleContext.Provider value={handle}>
      <PopupDialogConfigContext.Provider value={config}>
        <PopupDialogActiveContext.Provider value={active}>
          {children}
        </PopupDialogActiveContext.Provider>
      </PopupDialogConfigContext.Provider>
    </PopupDialogHandleContext.Provider>
  )
})

export function usePopupDialogActive() {
  return useContext(PopupDialogActiveContext)
}

export function usePopupDialogHandle() {
  return useContext(PopupDialogHandleContext)
}

// ---

export interface PopupDialogProps<PopupElement extends HTMLElement> {
  hidden: boolean
  id: string
  ref: (element: PopupElement | null) => void
  role: 'dialog'
  tabIndex: number
  style: CSSProperties
}

export type PopupDialogMergeableProps<PopupElement extends HTMLElement> = {
  hidden?: boolean
  id?: never
  ref?: React.Ref<PopupElement | null>
  role?: never
  tabIndex?: never
  style?: CSSProperties
} & {
  [propName: string]: any
}

export function usePopupDialogProps<
  PopupElement extends HTMLElement = HTMLElement,
  MergeProps extends PopupDialogMergeableProps<PopupElement> = {}
>(
  mergeProps?: MergeProps & {
    ref?: React.Ref<PopupElement | null>
  },
): PopupDialogProps<PopupElement> &
  Omit<MergeProps, keyof PopupDialogProps<any>> {
  const active = useContext(PopupDialogActiveContext)
  const config = useContext(PopupDialogConfigContext)
  const handle = useContext(PopupDialogHandleContext)

  const position = usePopupPosition(handle)

  const joinRefs = useJoinRefs()

  return {
    ...mergeProps!,
    hidden: !active || mergeProps?.hidden,
    id: config.popupId,
    ref: joinRefs(handle.setPopupElement, mergeProps?.ref),
    role: 'dialog',
    tabIndex: -1,
    style: {
      ...position.popupStyles,
      ...mergeProps?.style,
    },
  }
}

export interface ConnectPopupDialogProps<
  PopupElement extends HTMLElement,
  MergeProps extends PopupDialogMergeableProps<PopupElement> = {}
> {
  children: (
    props: PopupDialogProps<PopupElement> &
      Omit<MergeProps, keyof PopupDialogProps<any>>,
  ) => React.ReactNode
  mergeProps?: MergeProps
}

export function ConnectPopupDialog<
  PopupElement extends HTMLElement = HTMLElement,
  MergeProps extends PopupDialogMergeableProps<PopupElement> = {}
>(props: ConnectPopupDialogProps<PopupElement, MergeProps>) {
  const { children, mergeProps } = props
  const popupDialogProps = usePopupDialogProps(mergeProps)
  return <>{children(popupDialogProps)}</>
}

// ---

export interface PopupDialogTriggerProps<TriggerElement extends HTMLElement> {
  'aria-controls': string
  'aria-expanded': boolean
  'aria-haspopup': boolean
  disabled: boolean
  id: string
  ref: (element: TriggerElement | null) => void
  role: 'button'
  tabIndex?: number
}

export type PopupDialogTriggerMergeableProps<
  TriggerElement extends HTMLElement
> = {
  'aria-controls'?: never
  'aria-expanded'?: never
  'aria-haspopup'?: never
  disabled?: boolean
  id?: never
  ref?: React.Ref<TriggerElement | null>
  role?: never
  tabIndex?: number
} & {
  [propName: string]: any
}

export function usePopupDialogTriggerProps<
  TriggerElement extends HTMLElement,
  MergeProps extends PopupDialogTriggerMergeableProps<TriggerElement>
>(
  mergeProps?: MergeProps & {
    ref?: React.Ref<TriggerElement | null>
  },
): PopupDialogTriggerProps<TriggerElement> &
  Omit<MergeProps, keyof PopupDialogTriggerProps<any>> {
  const active = useContext(PopupDialogActiveContext)
  const config = useContext(PopupDialogConfigContext)
  const handle = useContext(PopupDialogHandleContext)

  const triggerRef = useCallback(
    (element: TriggerElement | null) => {
      handle.setReferenceElement(element)
      handle.setTriggerElement(element)
    },
    [handle],
  )

  const joinRefs = useJoinRefs()

  return {
    ...mergeProps!,
    disabled: mergeProps?.disabled || config.disabled,
    id: config.triggerId,
    ref: joinRefs(triggerRef, mergeProps?.ref),
    role: 'button' as const,
    tabIndex: mergeProps?.tabIndex ?? (config.triggerOnFocus ? 0 : undefined),
    'aria-controls': config.popupId,
    'aria-expanded': active,
    'aria-haspopup': true,
  }
}

export interface PopupDialogTriggerSurfaceProps
  extends SurfaceProps,
    Omit<
      React.HTMLAttributes<HTMLDivElement>,
      'aria-controls' | 'aria-expanded' | 'aria-haspopup' | 'id' | 'role'
    > {}

// nest a button in here to build your popup trigger
export const PopupDialogTriggerSurface = forwardRef<
  HTMLDivElement,
  PopupDialogTriggerSurfaceProps
>((props, ref) => {
  const [surfaceProps, divProps] = splitSurfaceProps(props)
  const { disabled, ...triggerProps } = usePopupDialogTriggerProps({
    ...divProps,
    ref,
  })

  return (
    <ConnectSurface
      // Pass down disabled from the popup context to ensure the surface acts
      // as disabled when the popup menu is.
      disabled={disabled || surfaceProps.disabled}
      mergeProps={triggerProps}
      {...surfaceProps}>
      {(props) => <div {...props} />}
    </ConnectSurface>
  )
})

// ---

export interface PopupDialogArrowProps<ArrowElement extends HTMLElement> {
  ref: React.RefCallback<ArrowElement>
  style: CSSProperties | undefined
  'data-placement': string
}

export type PopupDialogArrowMergeableProps<ArrowElement extends HTMLElement> = {
  'data-placement'?: never
  style?: CSSProperties
  ref?: React.Ref<ArrowElement | null>
} & {
  [propName: string]: any
}

export function usePopupDialogArrowProps<
  ArrowElement extends HTMLElement = HTMLElement,
  MergeProps extends PopupDialogArrowMergeableProps<ArrowElement> = {}
>(
  mergeProps?: MergeProps & {
    ref?: React.Ref<ArrowElement | null>
  },
): PopupDialogArrowProps<ArrowElement> &
  Omit<MergeProps, keyof PopupDialogArrowProps<any>> {
  const handle = useContext(PopupDialogHandleContext)
  const active = usePopupDialogActive()
  const position = usePopupPosition(handle)
  const joinRefs = useJoinRefs()
  const isVisible = active && position.popupStyles?.visibility !== 'hidden'

  // The positioner doesn't seem to know how to position the arrow until the
  // popup element itself is visible.
  useLayoutEffect(() => {
    if (isVisible) {
      handle.forceUpdatePosition()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible])

  return {
    ...mergeProps!,
    ref: joinRefs(handle.setArrowElement, mergeProps?.ref),
    style: {
      ...mergeProps?.style,
      ...position.arrowStyles,
    },
    'data-placement': position.placement,
  }
}

export const PopupDialogArrowDiv = forwardRef(function PopupDialogArrowDiv(
  props: JSX.IntrinsicElements['div'],
  ref: React.Ref<HTMLDivElement>,
) {
  const arrowProps = usePopupDialogArrowProps({ ...props, ref })
  return <div {...arrowProps} />
})
