import data from '../data/artifacts.json'
export type Artifact = { id: string; title: string; year: number; medium: string; tag: string; kind: string; art: string; cta: string; tags: string[]; description?: string; series?: string }
export const artifacts = data as Artifact[]
export const TABS = ['All', 'New Works', 'Editorial', 'Objects', 'Motion', 'Archives'] as const
export const TAGS = ['Abstract', 'Botanical', 'Editorial', 'Geometric', 'Texture', 'Poster', 'Object', 'Experimental', 'Monochrome', 'Color Field']
export const mediumOf = (a: Artifact) => a.medium.split(' ·')[0]
export const YEARS = [...new Set(artifacts.map(a => a.year))].sort((a, b) => b - a)
export const tabMatch = (t: string, a: Artifact) => t === 'All' || (t === 'New Works' && a.tag === 'NEW') || (t === 'Editorial' && a.kind === 'Editorial') || (t === 'Objects' && a.kind === 'Object') || (t === 'Motion' && a.kind === 'Motion') || (t === 'Archives' && a.kind === 'Archive')
export type Filters = { tab: string; tag: string; medium: string; year: string; q: string }
export const readFilters = (p: URLSearchParams): Filters => ({ tab: p.get('tab') || 'All', tag: p.get('tag') || '', medium: p.get('medium') || '', year: p.get('year') || '', q: p.get('q') || '' })
export const filterArtifacts = (f: Filters) => artifacts.filter(a =>
  tabMatch(f.tab, a) && (!f.tag || a.tags.includes(f.tag)) && (!f.medium || mediumOf(a) === f.medium) && (!f.year || String(a.year) === f.year) &&
  (!f.q || [a.title, a.medium, a.kind, a.description ?? '', ...a.tags].join(' ').toLowerCase().includes(f.q.toLowerCase())))
