import { createDocumentResource, createQueryResource, embed, list } from 'retil'

interface Comment {
  postId: number
  id: number
  name: string
  email: string
  body: string
}

interface Post {
  userId: number
  id: number
  title: string
  body: string
}

interface User {
  id: number
  name: string
  username: string
  email: string
}

const BaseURL = `https://jsonplaceholder.typicode.com`

export const comment = createDocumentResource<Comment>('comments')
export const post = createDocumentResource<Post>('post')
export const user = createDocumentResource<User>('user')

export const postsQuery = createQueryResource('postsQuery', {
  for: list(post),
  load: (userId: string) => BaseURL + `/user/${userId}/posts`,
})

export const userWithPosts = createQueryResource('userAndPosts', {
  // Note that if you have multiple query resources w/ the same embeds, they
  // will get out of sync. If you need them to stay in sync, you'll need to
  // create separate query resources for the embed queries.
  for: embed(user, {
    posts: postsQuery,
  }),
  load: (userId: string) => BaseURL + `/users/${userId}?_embed=posts`,
})

export const userList = createQueryResource('userList', {
  for: list(user),
  load: () => BaseURL + `/users`,
})

export const postWithUser = createQueryResource('postWithUser', {
  for: embed(post, {
    comments: list(comment),
    user,
  }),
  load: (postId: string) =>
    BaseURL + `/posts/${postId}?_expand=user&_embed=comments`,
})
