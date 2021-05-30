import { mountOnce } from 'retil-mount'

import { createStaticNavEnv, createStaticNavResponse, loadMatch } from '../src'

describe('loadMatch()', () => {
  test(`matches parameters with basename`, async () => {
    const loader = loadMatch({
      '/': () => 'fail',
      '/:word': ({ nav }) => nav.params.word,
    })
    const response = createStaticNavResponse()
    const env = createStaticNavEnv({
      url: '/browse/deck/acquisition',
      response,
      basename: '/browse/deck',
    })
    const { content } = await mountOnce(loader, env)
    expect(response.statusCode || 200).toBe(200)
    expect(content).toBe('acquisition')
  })

  test(`calls "nav.notFound()" when there is no match`, async () => {
    const loader = loadMatch({
      '/': () => 'root',
    })
    const env = createStaticNavEnv({
      url: '/test',
    })
    let notFound = false
    mountOnce(loader, {
      ...env,
      nav: {
        ...env.nav,
        notFound: () => {
          notFound = true
        },
      },
    })
    expect(notFound).toBe(true)
  })

  test(`sets matchname correctly when there is a nested path`, async () => {
    const loader = loadMatch({
      '/browse*': ({ nav }) => nav.matchname,
    })
    const env = createStaticNavEnv({
      url: '/browse/deck',
    })
    const { content } = await mountOnce(loader, env)
    expect(content).toBe('/browse')
  })

  test(`sets matchname correctly when there is no nested path`, async () => {
    const loader = loadMatch({
      '/deck*': ({ nav }) => nav.matchname,
    })
    const env = createStaticNavEnv({
      url: '/browse/deck',
      basename: '/browse',
    })
    const { content } = await mountOnce(loader, env)
    expect(content).toBe('/browse/deck')
  })

  test(`matches wildcards`, async () => {
    const loader = loadMatch({
      '/': () => 'fail',
      '*': ({ nav }) => nav.matchname,
    })
    const env = createStaticNavEnv({
      url: '/browse',
      basename: '/test',
    })
    const { content } = await mountOnce(loader, env)
    expect(content).toBe('/test')
  })
})
