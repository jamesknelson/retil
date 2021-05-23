import { createRequest, getInitialSnapshot, routeByPattern } from '../src'
import { ReactElement } from 'react'

describe('routeByPattern', () => {
  test(`matches parameters with basename`, async () => {
    const router = routeByPattern({
      '/': () => 'fail',
      '/:word': ({ params }) => params.word,
    })
    const route = await getInitialSnapshot(
      router,
      createRequest('/browse/deck/acquisition', {
        basename: '/browse/deck',
      }),
    )
    expect(route.response.status || 200).toBe(200)
    expect((route.content as ReactElement).props.content).toBe('acquisition')
  })

  test(`sets basename correctly when there is a nested path`, async () => {
    const router = routeByPattern({
      '/browse*': ({ basename }) => basename,
    })
    const route = await getInitialSnapshot(
      router,
      createRequest('/browse/deck'),
    )
    expect((route.content as ReactElement).props.content).toBe('/browse')
  })

  test(`sets basename correctly when there is no nested path`, async () => {
    const router = routeByPattern({
      '/deck*': ({ basename }) => basename,
    })
    const route = await getInitialSnapshot(
      router,
      createRequest('/browse/deck', {
        basename: '/browse',
      }),
    )
    expect((route.content as ReactElement).props.content).toBe('/browse/deck')
  })

  test(`matches wildcards`, async () => {
    const router = routeByPattern({
      '/': () => 'fail',
      '*': ({ basename }) => basename,
    })
    const route = await getInitialSnapshot(
      router,
      createRequest('/browse', {
        basename: '/test',
      }),
    )
    expect(route.response.status || 200).toBe(200)
    expect((route.content as ReactElement).props.content).toBe('/test')
  })
})
