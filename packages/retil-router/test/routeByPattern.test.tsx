import { getInitialStateAndResponse, routeByPattern } from '../src'
import { ReactElement } from 'react'

describe('routeByPattern', () => {
  test(`matches parameters with basename`, async () => {
    const router = routeByPattern({
      '/': () => 'fail',
      '/:word': ({ params }) => params.word,
    })
    const [state, response] = await getInitialStateAndResponse(
      router,
      '/browse/deck/acquisition',
      {
        basename: '/browse/deck',
      },
    )
    expect(response.status || 200).toBe(200)
    expect((state.content as ReactElement).props.content).toBe('acquisition')
  })

  test(`sets nested basename correctly`, async () => {
    const router = routeByPattern({
      '/browse*': ({ basename }) => basename,
    })
    const [state] = await getInitialStateAndResponse(router, '/browse/deck')
    expect((state.content as ReactElement).props.content).toBe('/browse')
  })

  test(`matches wildcards`, async () => {
    const router = routeByPattern({
      '/': () => 'fail',
      '*': ({ basename }) => basename,
    })
    const [state, response] = await getInitialStateAndResponse(
      router,
      '/browse',
    )
    expect(response.status || 200).toBe(200)
    expect((state.content as ReactElement).props.content).toBe('/browse')
  })
})
