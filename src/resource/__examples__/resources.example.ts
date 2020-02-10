import {
  createCollectionResource,
  createDocumentResource,
  list,
  createQueryResource,
} from '../index'
import { ChunkSchema } from '../types'

interface VideoData {
  id: string
  youtubeId: string
  title: string
  subtitles: {
    english: string
    translations: any[]
  }[]
}

const localVideo = createDocumentResource<VideoData>('newsletter')

const video = createDocumentResource('video', async () => ({
  id: '1',
  youtubeId: 'test',
  title: 'test',
  subtitles: [
    {
      english: 'test',
      translations: [] as any[],
    },
  ],
}))

interface NewsletterData {
  id: string
  name: string
  videos: any[]
}

const localNewsletter = createDocumentResource<NewsletterData>('newsletter', {
  embedding: {
    videos: list(video),
  },
})

const newsletter = createDocumentResource('newsletter', {
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

const newsletterList = createCollectionResource('newsletterList', {
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

const latestNewsletter = createQueryResource('latestNewsletter', {
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

type Schema = ChunkSchema<typeof chunks[number]>

const data0 = localVideo
  .request({} as any, {} as any)
  .select({} as any)
  .getCurrentValue().data

const data1 = localNewsletter
  .request({} as any, {} as any)
  .select({} as any)
  .getCurrentValue().data

const data2 = newsletter
  .request({} as any, {} as any)
  .select({} as any)
  .getCurrentValue().data

const value1 = instance.build({} as any, {} as any)
const value2 = newsletterList({ page: 0 }).build({} as any, {} as any)

const chunkData = newsletter({} as any).chunk({} as any).chunks[0]

console.log(data0, data1, data2, chunkData)

console.log(value1.hasData && value1.data.videos[0].subtitles[0].translations)

console.log(value2.hasData && value2.data)

chunks.forEach(item => {
  switch (item.bucket) {
    case 'latestNewsletter':
      return item.payload.type === 'data' && item.payload.data

    case 'newsletter':
      return item.payload.type === 'data' && item.payload.data.description

    case 'video':
      return (
        item.payload.type === 'data' && item.payload.data.subtitles[0].english
      )
  }
})
