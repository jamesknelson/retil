import {
  collectionResource,
  documentResource,
  list,
  queryResource,
} from './index'

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
const { chunks } = instance.split({} as any)

const data0 = localVideo
  .request({} as any, {} as any)
  .select({} as any)
  .getCurrentValue()[0]
  .data()

const data1 = localNewsletter
  .request({} as any, {} as any)
  .select({} as any)
  .getCurrentValue()[0]
  .data()

const data2 = newsletter
  .request({} as any, {} as any)
  .select({} as any)
  .getCurrentValue()[0]
  .data()

const value1 = instance.build({} as any, {} as any)
const value2 = newsletterList({ page: 0 }).build({} as any, {} as any)

const chunkData = newsletter({} as any).split({} as any).chunks[0][2]

console.log(data0, data1, data2, chunkData)

console.log(value1.hasData && value1.data.videos[0].subtitles[0].translations)

console.log(value2.hasData && value2.data)

chunks.forEach(item => {
  switch (item[0]) {
    case 'latestNewsletter':
      return item[2]

    case 'newsletter':
      return item[2].description

    case 'video':
      return item[2].subtitles[0].english
  }
})
