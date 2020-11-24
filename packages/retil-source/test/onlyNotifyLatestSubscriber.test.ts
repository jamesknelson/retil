import {
  createState,
  getSnapshot,
  onlyNotifyLatestSubscriber,
  subscribe,
} from '../src'

describe(`onlyNotifyLatestSubscriber`, () => {
  test(`stops notifying first subscriber when second is added`, () => {
    const [inputSource, setState] = createState(1)
    const source = onlyNotifyLatestSubscriber(inputSource)

    const output1 = [] as any[]
    const output2 = [] as any[]

    subscribe(source, () => output1.unshift(getSnapshot(source)))

    setState(2)

    subscribe(source, () => output2.unshift(getSnapshot(source)))

    setState(3)

    expect(output1).toEqual([2])
    expect(output2).toEqual([3])
  })

  test(`immediately notifies first subscriber when second is removed after a change`, () => {
    const [inputSource, setState] = createState(1)
    const source = onlyNotifyLatestSubscriber(inputSource)

    const output1 = [] as any[]
    const output2 = [] as any[]

    subscribe(source, () => output1.unshift(getSnapshot(source)))

    setState(2)

    expect(output1).toEqual([2])

    const unsubscribe = subscribe(source, () =>
      output2.unshift(getSnapshot(source)),
    )

    setState(3)

    unsubscribe()

    expect(output1).toEqual([3, 2])
  })

  test(`does not immediately notifies first subscriber when second is removed without any changes`, () => {
    const [inputSource, setState] = createState(1)
    const source = onlyNotifyLatestSubscriber(inputSource)

    const output1 = [] as any[]
    const output2 = [] as any[]

    subscribe(source, () => output1.unshift(getSnapshot(source)))

    setState(2)

    expect(output1).toEqual([2])

    const unsubscribe = subscribe(source, () =>
      output2.unshift(getSnapshot(source)),
    )
    unsubscribe()

    expect(output1).toEqual([2])
  })
})
