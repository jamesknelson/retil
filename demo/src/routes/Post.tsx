import React from 'react'
import { useResource } from 'retil'

import { Link } from '../components/Link'
import { postWithUser } from '../resources'

export interface PostProps {
  id: string
}

export default function Post(props: PostProps) {
  const [state, controller] = useResource(postWithUser, props.id)

  const data = state.data

  // If you know the data is out of date and needs to be reloaded, you can let
  // Retil know via the controller's `invalidate()` function
  const refresh = () => controller.invalidate()

  return (
    <div>
      <h1>
        {data.title}
        <button onClick={refresh}>
          {state.pending ? 'Refreshing...' : 'Refresh'}
        </button>
      </h1>
      <p>
        By <Link href={`/user/${data.user.id}`}>{data.user.name}</Link>
      </p>
      {data.body.split('\n\n').map((p, i) => (
        <p key={i}>{p}</p>
      ))}
      <h2>Comments</h2>
      {data.comments.map(comment => (
        <div key={comment.id}>
          <h3>{comment.name}</h3>
          <p>{comment.body}</p>
        </div>
      ))}
    </div>
  )
}
