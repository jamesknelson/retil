import {
  Rejection,
  Retry,
  createCollectionResource,
  createDocumentResource,
} from 'retil'

export const postResource = createDocumentResource(async (id: string) => {
  const response = await fetch(
    'https://jsonplaceholder.typicode.com/posts/' + id,
  )
  return await response.json()
})

export const postsResource = createCollectionResource({
  of: postResource,
  load: async () => {
    const response = await fetch('https://jsonplaceholder.typicode.com/posts')
    return await response.json()
  },
})
