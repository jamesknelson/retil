import isEqual from 'fast-deep-equal'
// import clamp from 'lodash/clamp'
// import {
//   KeyboardEvent,
//   Reducer,
//   SyntheticEvent,
//   useCallback,
//   useState,
// } from 'react'

// type ListSelectionAction =
//   | ['ArrowUp']
//   | ['ArrowDown']
//   | ['Home']
//   | ['End']
//   | ['Escape']
//   | ['PageUp']
//   | ['PageDown']

// interface ListSelectionReducerOptions<T> {
//   /**
//    * If true, then the escape key will set the selection to `null`.
//    */
//   escapeSelectsNull?: boolean

//   indexOf?: (list: T[], value: T) => number

//   /**
//    * If true, then "leaving", i.e. moving above the top options or below
//    * the bottom option, will set the selection to `null`.
//    */
//   leaveSelectsNull?: boolean

//   pageSize?: number
// }

// export function createListSelectionReducer<T>(
//   list: T[],
//   options: ListSelectionReducerOptions<T> = {},
// ): SelectionReducer<T | null, ListSelectionAction> {
//   const {
//     escapeSelectsNull = false,
//     indexOf = defaultIndexOf,
//     leaveSelectsNull = false,
//     pageSize = 5,
//   } = options
//   const size = list.length
//   const lastIndex = size - 1
//   const jumps = {
//     PageUp: -pageSize,
//     PageDown: pageSize,
//     ArrowUp: -1,
//     ArrowDown: 1,
//     Home: -size,
//     End: size,
//   }

//   if (!size) {
//     return () => null
//   } else {
//     return (previousSelection: T | null, [type]: ListSelectionAction) => {
//       if (type === 'Escape' && escapeSelectsNull) {
//         return null
//       } else if (type in jumps) {
//         const currentIndex =
//           previousSelection === null ? -1 : indexOf(list, previousSelection)
//         const nextIndex = currentIndex + jumps[type as keyof typeof jumps]
//         const hasLeft =
//           (currentIndex === 0 && nextIndex < 0) ||
//           (currentIndex === lastIndex && nextIndex > lastIndex)
//         return leaveSelectsNull && hasLeft
//           ? null
//           : list[clamp(nextIndex, 0, lastIndex)]
//       } else {
//         return previousSelection
//       }
//     }
//   }
// }

// export type SelectionAction = [string, ...any]

// export type SelectionReducer<T, Action extends SelectionAction> = Reducer<
//   T,
//   Action
// >

// export interface SelectionOptions<T, Action extends SelectionAction> {
//   // If provided, this will act as a "controlled component", with changes in
//   // selection required to be listened to via `onSelect`, and passed through
//   // here. Incompatible with `defaultSelection`.
//   value?: T

//   // If provided, this will act as an uncontrolled component.
//   defaultValue?: T

//   /**
//    * Allows pointer events on this surface to delegate their focus to another
//    * element. This is useful when creating buttons where the action involves
//    * editing some field, e.g. for a calendar popup or editor "bold" command.
//    */
//   delegateFocus?: (event: SyntheticEvent) => void

//   onChange?: (callback: (selection: T) => void) => void

//   /**
//    * Sets whether to null out values after their corresponding options are
//    * removed. Defaults to true only no default value is provided.
//    */
//   nullRemovedOptions?: boolean

//   createActionFromKeyboardEvent?: (event: KeyboardEvent) => Action | null

//   reducer: SelectionReducer<T, Action>

//   // defaults to 0, cannot be used with delegateFocusTo
//   tabIndex?: number
// }

// export interface SelectionHandle<T, Action extends SelectionAction> {
//   blur(): void
//   focus(): void

//   dispatch(...action: Action): void
//   select(value: T): void

//   setElement(element: Element | null): void
//   setOptionElement(value: T, element: Element | null): void
// }

// export function useSelection<T, Action extends SelectionAction>(
//   options: SelectionOptions<T, Action>,
// ): readonly [T, SelectionHandle<T>] {
//   const { value, defaultValue } = options

//   const [selection, select] = useState<T>(() => {
//     if (process.env.NODE_ENV !== 'production') {
//       if (value !== undefined && defaultValue !== undefined) {
//         throw new Error(
//           'useSelection: received a value for both value and defaultValue. Using value.',
//         )
//       }
//     }
//     return (value === undefined ? defaultValue : value) || null
//   })

//   const dispatch = useCallback(() => )

//   const setKeyboardElement = useCallback((element: Element | null) => {}, [])

//   const setOptionElement = useCallback((value: T, element: Element | null) => {
//     // If not delegating focus, and this option is currently active, then
//     // focus it. This can happen after e.g. opening a popup menu.
//   }, [])

//   const handle: SelectionHandle<T, Action> = {
//     blur,
//     focus,
//     dispatch,
//     select,
//     setKeyboardElement,
//     setOptionElement,
//   }

//   return [selection, handle]
// }

// export interface SelectionKeyboardProps<PopupElement extends HTMLElement> {
//   hidden: boolean
//   id: string
//   ref: (element: PopupElement | null) => void
//   role: 'dialog'
//   tabIndex: number
//   style: CSSProperties
// }

// export type PopupDialogMergeableProps<PopupElement extends HTMLElement> = {
//   hidden?: boolean
//   id?: never
//   ref?: React.Ref<PopupElement | null>
//   role?: never
//   tabIndex?: never
//   style?: CSSProperties
// } & {
//   [propName: string]: any
// }

// export function useSelectionKeyboardProps<
//   PopupElement extends HTMLElement = HTMLElement,
//   MergeProps extends PopupDialogMergeableProps<PopupElement> = {}
// >(
//   mergeProps?: MergeProps & {
//     ref?: React.Ref<PopupElement | null>
//   },
// ): PopupDialogProps<PopupElement> &
//   Omit<MergeProps, keyof PopupDialogProps<any>> {
//   const active = useContext(PopupDialogActiveContext)
//   const config = useContext(PopupDialogConfigContext)
//   const handle = useContext(PopupDialogHandleContext)

//   const position = usePopupPosition(handle)

//   const joinRefs = useJoinRefs()

//   return {
//     ...mergeProps!,
//     hidden: !active || mergeProps?.hidden,
//     id: config.popupId,
//     ref: joinRefs(handle.setPopupElement, mergeProps?.ref),
//     role: 'dialog',
//     tabIndex: -1,
//     style: {
//       ...position.popupStyles,
//       ...mergeProps?.style,
//     },
//   }
// }

// /**
//  * When focus is inside of the connected component, the user will be able to
//  * update the selection via the keyboard, and navigate to the connected
//  * component via tabbing.
//  *
//  * Note that when delegating focus to another element, for example a search
//  * field, then the ConnectSelection component will need to wrap the element
//  * that focus has been delegated to, instead of the options themselves.
//  */
// export function ConnectSelectionFocus() {}

// export function ConnectSelectionOption() {}

// function defaultIndexOf<T>(list: T[], item: T): number {
//   return typeof item !== 'object' || item === null
//     ? list.indexOf(item)
//     : list.findIndex((listItem) => isEqual(listItem, item))
// }

// function defaultCreateActionFromKeyboardEvent(
//   event: KeyboardEvent,
// ): SelectionAction | null {
//   // Emulate Home/End for mac
//   if (event.metaKey) {
//     switch (event.key) {
//       case 'ArrowUp':
//         return ['Home']
//       case 'ArrowDown':
//         return ['End']
//       default:
//         return ['Meta', event.key]
//     }
//   }

//   return [event.key]
// }
