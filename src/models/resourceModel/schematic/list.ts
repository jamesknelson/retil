import { ResourceListPointer, ResourceRecordPointer } from '../types'

import { NormalizedChunk, Schematic } from './schematic'

export function list<
  ChildResult,
  Props,
  ChildInput,
  Child extends Schematic<
    ChildResult,
    Props,
    ChildInput,
    ResourceRecordPointer<ChildBucket>,
    ChildChunk
  >,
  ChildBucket extends string,
  ChildChunk extends NormalizedChunk
>(
  type: Child &
    Schematic<
      ChildResult,
      Props,
      ChildInput,
      ResourceRecordPointer<ChildBucket>,
      ChildChunk
    >,
): Schematic<
  ChildResult[],
  Props,
  ChildInput[],
  ResourceListPointer<ChildBucket>,
  ChildChunk
> {
  // TODO: the root needs to be switched to an array
}
