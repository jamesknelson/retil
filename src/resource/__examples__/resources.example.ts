import {
  collectionResource,
  documentResource,
  list,
  queryResource,
} from '../index'
import { ChunkSchema } from '../structures/chunk'

interface VideoData {
  id: string
  youtubeId: string
  title: string
  subtitles: {
    english: string
    translations: any[]
  }[]
}

const localVideo = documentResource<VideoData>('newsletter')

const video = documentResource('video', {
  load: async () => {
    return {
      id: '1',
      youtubeId: 'test',
      title: 'test',
      subtitles: [
        {
          english: 'test',
          translations: [] as any[],
        },
      ],
    }
  },
})

interface NewsletterData {
  id: string
  name: string
  videos: any[]
}

const localNewsletter = documentResource<NewsletterData>('newsletter', {
  embedding: {
    videos: list(video),
  },
})

const newsletter = documentResource('newsletter', {
  embedding: {
    videos: list(video),
  },

  load: async () => {
    return {
      id: '1',
      date: 'test',
      description: 'test',
      videos: [] as any[],
    }
  },

  // transformInput: data => data,
})

const newsletterList = collectionResource('newsletterList', {
  of: newsletter,

  load: async (vars: { page: number }) => {
    return [] as {
      id: string
      date: string
      description: string
      videos: any[]
    }[]
  },
})

const latestNewsletter = queryResource('latestNewsletter', {
  for: newsletter,

  load: async () => {
    return {
      id: '1',
      date: 'test',
      description: 'test',
      videos: [],
    }
  },
})

const instance = latestNewsletter({})
const { chunks } = instance.chunk({} as any)

export type Schema = ChunkSchema<typeof chunks[number]['id']>

const data0 = localVideo
  .request({} as any, {} as any)
  .select({} as any)
  .getCurrentValue()
  .getData()

const data1 = localNewsletter
  .request({} as any, {} as any)
  .select({} as any)
  .getCurrentValue()
  .getData()

const data2 = newsletter
  .request({} as any, {} as any)
  .select({} as any)
  .getCurrentValue()
  .getData()

const value1 = instance.build({} as any, {} as any)
const value2 = newsletterList({ page: 0 }).build({} as any, {} as any)

const chunkData = newsletter({} as any).chunk({} as any).chunks[0][1]

console.log(data0, data1, data2, chunkData)

console.log(value1.hasData && value1.data.videos[0].subtitles[0].translations)

console.log(value2.hasData && value2.data)

chunks.forEach(item => {
  switch (item[0].bucket) {
    case 'latestNewsletter':
      return item[1]

    case 'newsletter':
      return item[1].description

    case 'video':
      return item[1].subtitles[0].english
  }
})
