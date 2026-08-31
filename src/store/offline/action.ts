import { state } from './state'
import { event } from './event'


export const setOfflineList = (list: LX.Offline.ListInfo) => {
  state.list = list
  event.offline_changed('')
}

export const getOfflineItem = (id: string): LX.Offline.ItemInfo | null => state.list[id] ?? null

export const addOfflineItem = (id: string, info: LX.Offline.ItemInfo) => {
  state.list[id] = info
  state.tasks.delete(id)
  event.offline_changed(id)
}

export const removeOfflineItem = (id: string) => {
  if (!(id in state.list)) return
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  delete state.list[id]
  event.offline_changed(id)
}

export const setTaskProgress = (id: string, progress: number) => {
  state.tasks.set(id, progress)
  event.offline_changed(id)
}

export const removeTask = (id: string) => {
  if (!state.tasks.delete(id)) return
  event.offline_changed(id)
}

export const getStatus = (id: string): LX.Offline.Status => {
  if (state.list[id]) return 'downloaded'
  if (state.tasks.has(id)) return 'downloading'
  return 'none'
}

export const getProgress = (id: string) => state.tasks.get(id) ?? 0
