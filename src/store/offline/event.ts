import Event from '@/event/Event'


class OfflineEvent extends Event {
  /**
   * 某首歌的离线状态发生变化（开始下载 / 进度更新 / 下载完成 / 被删除）
   * @param id 歌曲 id
   */
  offline_changed(id: string) {
    this.emit('offline_changed', id)
  }
}


type EventMethods = Omit<EventType, keyof Event>


declare class EventType extends OfflineEvent {
  on<K extends keyof EventMethods>(event: K, listener: EventMethods[K]): any
  off<K extends keyof EventMethods>(event: K, listener: EventMethods[K]): any
}

type OfflineEventTypes = Omit<EventType, keyof Omit<Event, 'on' | 'off'>>


export const event: OfflineEventTypes = new OfflineEvent()
