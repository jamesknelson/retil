import { list, record, query } from './index'

interface VideoData {
  id: string
  name: string
  subtitles: {
    id: string
    english: string
    translations: {
      id: string
      language: string
      text: string
    }[]
  }[]
}
const video = record('video', {
  identifiedBy: (data: VideoData) => data.id,
})

interface NewsletterData {
  id: string
  name: string
  videos: any
}
const newsletter = record('newsletter', {
  identifiedBy: (data: NewsletterData) => data.id,
  embedding: {
    videos: list(video),
  },
})

const newsletterList = query('newsletterList', {
  for: list(newsletter),
})

const latestNewsletter = query('latestNewsletter', {
  for: newsletter,
})

//
// ---
//

const instance = latestNewsletter({})
const { chunks } = instance.split({} as any)
const source = instance.build({} as any, {} as any)

console.log(
  source.getCurrentValue().videos[0].subtitles[0].translations[0].language,
)

console.log(
  newsletterList({ page: 0 })
    .build({} as any, {} as any)
    .getCurrentValue()[0].name,
)

chunks.forEach(item => {
  switch (item[0]) {
    case 'latestNewsletter':
      return item[2]

    case 'newsletter':
      return item[2].name

    case 'video':
      return item[2].subtitles[0].english
  }
})
