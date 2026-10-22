export type ContentSection = '通讯' | '书讯' | '书评' | '观点' | '文艺' | '译林' | '文史' | '论文' | '古籍' | '书库'

export interface ArticleData extends Record<string, unknown> {
  id: number
  标题: string
  内容?: string | null
  图片?: string | null
  文档?: string | null
  作者?: string | null
  likes?: number
  dislikes?: number
  is_liked?: boolean
  is_disliked?: boolean
  app_label?: string
  model_name?: ContentSection
}

export interface ContentPage<T> {
  count: number
  results: T[]
  page?: number
  page_size?: number
}
