import { createDocumentResource, createQueryResource, embed, list } from 'retil'

interface User {
  id: number
  name: string
  username: string
  email: string
}

interface Post {
  userId: number
  id: number
  title: string
  body: string
}

const BaseURL = `https://jsonplaceholder.typicode.com`

export const userResource = createDocumentResource<User>()
export const postResource = createDocumentResource<Post>()

export const userAndPostsResource = createQueryResource({
  // Note that if you have multiple query resources w/ the same embeds, they
  // will get out of sync. If you need them to stay in sync, you'll need to
  // create separate query resources for the embed queries.
  for: embed(userResource, {
    posts: (userId: string) => postListResource(userId),
  }),
  load: (userId: string) => BaseURL + `/users/${userId}?_embed=posts`,
})

export const userListResource = createQueryResource({
  for: list(userResource),
  load: () => BaseURL + `/users`,
})

export const postAndUserResource = createQueryResource({
  for: embed(postResource, {
    user: () => userResource(),
  }),
  load: (postId: string) => BaseURL + `/posts/${postId}`,
})

export const postListResource = createQueryResource({
  for: list(postResource),
  load: (userId: string) => BaseURL + `/user/${userId}/posts`,
})
