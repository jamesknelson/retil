import './App.css'
import React from 'react'
import {
  createCollectionResource,
  createDocumentResource,
  useResource,
} from 'retil'

export const postResource = createDocumentResource<{
  userId: number
  id: number
  title: string
  body: string
}>()

export const postsResource = createCollectionResource({
  of: postResource,
  load: async () => {
    const response = await fetch('https://jsonplaceholder.typicode.com/posts')
    return await response.json()
  },
})

function App() {
  const [posts] = useResource(postsResource)

  return (
    <div className="App">
      {posts.data.map(post => (
        <article key={post.id}>
          <h2>{post.title}</h2>
        </article>
      ))}
    </div>
  )
}

export default App
