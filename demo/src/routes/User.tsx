import React from 'react'
import { useResource } from 'retil'

import { Link } from '../components/Link'
import { userWithPosts } from '../resources'

export interface UserProps {
  id: string
}

export default function User(props: UserProps) {
  const [state] = useResource(userWithPosts, props.id)
  const data = state.data

  return (
    <div>
      <p>
        <Link href="/">&laquo; Back to top</Link>
      </p>
      <h1>{data.name}</h1>
      <p>
        @{data.username}
        <br />
        {data.email}
      </p>
      <h2>Posts</h2>
      {state.data.posts.map(item => (
        <div key={item.id}>
          <h3>
            <Link href={`/post/` + item.id}>{item.title}</Link>
          </h3>
        </div>
      ))}
    </div>
  )
}
