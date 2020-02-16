import {
  createDocumentResource,
  createQueryResource,
  embed,
  list,
} from '../index'
import { ChunkSchema } from '../types'

const user = createDocumentResource('user', async () => ({
  id: '1',
  name: 'test',
}))

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
const newsletter = createDocumentResource('newsletter', {
  identifiedBy: (data: {
    id: string
    date: string
    language: string
    name: string
  }) => data.id,
})
const newsletterWithVideos = createQueryResource('newsletterWithVideos', {
  for: embed(newsletter, {
    user: user,
    videos: list(video),
  }),
  load: async (vars: { language: string }) => {
    return {
      id: '1',
      date: 'test',
      name: 'test',
      language: vars.language,
      videos: [] as any[],
    }
  },
})

const { chunks: chunks1 } = newsletterWithVideos().chunk({
  id: 'test',
  date: 'test',
  name: 'test',
  language: 'test',
  videos: [],
})

type Schema1 = ChunkSchema<typeof chunks1[number]>
type Types = keyof Schema1

const newsletterList = createQueryResource('newsletterList', {
  for: list(newsletterWithVideos),
  load: async (vars: { language: string; page: number }) => {
    return [] as {
      id: string
      date: string
      name: string
      language: string
      videos: any[]
    }[]
  },
})

const latestNewsletter = createQueryResource('latestNewsletter', {
  for: newsletterWithVideos,
  load: async (vars: { language: string }) => {
    return {
      id: '1',
      date: 'test',
      name: 'test',
      language: vars.language,
      videos: [],
    }
  },
})

const instance = latestNewsletter({ language: 'en' })
const { chunks } = instance.chunk({} as any)

type Schema2 = ChunkSchema<typeof chunks[number]>

const data0 = video
  .request({} as any, {} as any)
  .select({} as any)
  .getCurrentValue().data

const data1 = newsletter
  .request({} as any, {} as any)
  .select({} as any)
  .getCurrentValue().data

const data2 = newsletterWithVideos
  .request({} as any, {} as any)
  .select({} as any)
  .getCurrentValue().data?.videos[0].youtubeId

const value1 = instance.build({} as any, {} as any)
const value2 = newsletterList({ language: 'en', page: 0 }).build(
  {} as any,
  {} as any,
)

const chunkData = newsletter({} as any).chunk({} as any).chunks[0]

console.log(data0, data1, data2, chunkData)

console.log(value1.hasData && value1.data.videos[0].subtitles[0].translations)

console.log(value2.hasData && value2.data)

chunks.forEach(item => {
  switch (item.bucket) {
    case 'newsletterWithVideos':
      return (
        item.payload.type === 'data' &&
        item.payload.data.embed.videos[1].root.bucket
      )

    case 'latestNewsletter':
      return item.payload.type === 'data' && item.payload.data.root.id

    case 'newsletter':
      return item.payload.type === 'data' && item.payload.data.name

    case 'video':
      return (
        item.payload.type === 'data' && item.payload.data.subtitles[0].english
      )
  }
})
