import React from 'react'

export interface PostProps {
  id: string
}

export default function Post(props: PostProps) {
  return (
    <div>
      <h1>Post</h1>
    </div>
  )
}
