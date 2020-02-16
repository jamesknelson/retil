import './App.css'
import React, { useState } from 'react'
import {
  createCollectionResource,
  createDocumentResource,
  useResource,
} from 'retil'

export const albumResource = createDocumentResource<{
  albumId: number
  id: number
  title: string
  url: string
  thumbnailUrl: string
}>()

export const photoResource = createDocumentResource<{
  albumId: number
  id: number
  title: string
  url: string
  thumbnailUrl: string
}>()

export const albumsResource = createCollectionResource({
  of: photoResource,
  load: async () => {
    const response = await fetch('https://jsonplaceholder.typicode.com/albums')
    return await response.json()
  },
})

export const photoListResource = createCollectionResource({
  of: photoResource,
  load: async () => {
    const response = await fetch('https://jsonplaceholder.typicode.com/photos')
    return await response.json()
  },
})

function App() {
  const [selectedId, setSelectedId] = useState<null | number>(null)
  const [photoList] = useResource(photoListResource)

  return (
    <div className="App">
      {photoList.data.slice(0, 10).map(photo => (
        <figure
          key={photo.id}
          onClick={event => {
            event.preventDefault()
            setSelectedId(photo.id)
          }}>
          <img src={photo.thumbnailUrl} alt="" />
          <figcaption>{photo.title}</figcaption>
        </figure>
      ))}
    </div>
  )
}

export default App
