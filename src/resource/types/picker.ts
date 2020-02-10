import { Pointer, PointerList } from './pointer'

export type Picker = <P extends Pointer | PointerList>(
  pointerOrList: P,
) => P extends PointerList ? PickerResult[] : PickerResult

export type PickerResult<Data = any, Rejection = any> =
  // Priming; still waiting for initial response
  | {
      data?: undefined
      hasData?: false
      hasRejection?: false
      invalidated?: boolean
      pending: true
      primed: false
      rejection?: undefined
    }
  // Abandoned; no longer waiting for initial response
  | {
      data?: undefined
      hasData: false
      hasRejection: false
      invalidated: false
      pending: false
      primed: true
      rejection?: undefined
    }
  // Data; we received the data we requested
  | {
      data: Data
      hasData: true
      hasRejection?: false
      invalidated: boolean
      pending: boolean
      primed: true
      rejection?: undefined
    }
  // Rejection; we received a well-formed response telling us "no can do".
  | {
      data?: undefined
      hasData?: false
      hasRejection: true
      invalidated: boolean
      pending: boolean
      primed: true
      rejection?: Rejection
    }
