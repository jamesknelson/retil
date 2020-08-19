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

  test(`sets basename correctly when there is a nested path`, async () => {
    const router = routeByPattern({
      '/browse*': ({ basename }) => basename,
    })
    const [state] = await getInitialStateAndResponse(router, '/browse/deck')
    expect((state.content as ReactElement).props.content).toBe('/browse')
  })

  test(`sets basename correctly when there is no nested path`, async () => {
    const router = routeByPattern({
      '/deck*': ({ basename }) => basename,
    })
    const [state] = await getInitialStateAndResponse(router, '/browse/deck', {
      basename: '/browse',
    })
    expect((state.content as ReactElement).props.content).toBe('/browse/deck')
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
