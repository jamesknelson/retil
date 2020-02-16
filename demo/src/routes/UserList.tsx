import React from 'react'
import { useResource } from 'retil'

import { Link } from '../components/Link'
import { userList } from '../resources'

export default function UserList() {
  const [resource] = useResource(userList)

  return (
    <div>
      <h1>Fakebook</h1>
      {resource.data.map(item => (
        <div key={item.id}>
          <h2>
            <Link href={`/user/` + item.id}>{item.name}</Link>
          </h2>
          <p>
            @{item.username}
            <br />
            {item.email}
          </p>
        </div>
      ))}
    </div>
  )
}
