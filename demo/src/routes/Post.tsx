import React from 'react'
import { useResource } from 'retil'

import { Link } from '../components/Link'
import { postWithUser } from '../resources'

export interface PostProps {
  id: string
}

export default function Post(props: PostProps) {
  const [resource] = useResource(postWithUser, props.id)
  const data = resource.data

  return (
    <div>
      <h1>{data.title}</h1>
      <p>
        By <Link href={`/user/${data.user.id}`}>{data.user.name}</Link>
      </p>
      {data.body.split('\n\n').map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  )
}
