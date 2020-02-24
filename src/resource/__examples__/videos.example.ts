import {
  createDocumentResource,
  createQueryResource,
  embed,
  list,
} from '../index'

export interface Video {
  id: string
  title: string
  durationInSeconds?: number
  youtubeId: string
  youtubeImageURL: string
  youtubeViews?: number
  youtubePublishedAt?: Date
  youtubeChannelId: string
  youtubeChannelName: string
  createdAt?: any
  updatedAt?: any
}

export interface VideoInput {
  video: {
    name: string
    vidurl: string
  }
  subtitles: any[]
}

export interface VideoSubtitle {
  id: string
  text: string
  start_time: string
  end_time: string
  translations: VideoSubtitleTranslation[]
}

export interface VideoSubtitleTranslation {
  id: string
  subid: string
  text: string
  lang: string
}

export interface VideoVars {
  id: string
  language: string
}

export const videoSubtitle = createDocumentResource({
  identifiedBy: (data: VideoSubtitle) => {
    return (
      data.id +
      '/' +
      data.translations.map(translation => translation.id).join(',')
    )
  },
})

export const video = createDocumentResource<Video>()

export const videoQuery = createQueryResource({
  for: embed(video, {
    subtitles: list(videoSubtitle),
  }),
  load: (vars: VideoVars) => `/video?vid=${vars.id}&langcode=${vars.language}`,
  transformInput: (input: VideoInput, vars: VideoVars) => {
    return {
      id: vars.id,
      title: input.video.name,
      youtubeId: input.video.vidurl.split('&')[0].split('v=')[1],

      subtitles: input.subtitles,
    }
  },
})
