import React from 'react'
import { useResource } from 'retil'

import { Link } from '../components/Link'
import { userAndPosts } from '../resources'

export interface UserProps {
  id: string
}

export default function User(props: UserProps) {
  const [resource] = useResource(userAndPosts, props.id)

  return (
    <div>
      <h1>Posts by @{resource.data.name}</h1>
      {resource.data.posts.map(item => (
        <div key={item.id}>
          <h2>
            <Link href={`/post/` + item.id}>{item.title}</Link>
          </h2>
        </div>
      ))}
    </div>
  )
}
