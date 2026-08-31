import { LIST_IDS } from '@/config/constant'
import { playListById, playNext } from '@/core/player/player'
import { removeOffline, removeOfflineMulti } from '@/core/offline'
import playerState from '@/store/player/state'
import { confirmDialog } from '@/utils/tools'

export const handlePlay = (musicInfo: LX.Music.MusicInfoOnline) => {
  void playListById(LIST_IDS.DOWNLOAD, musicInfo.id)
}

/**
 * 正在播放的歌被删掉后播放器会握着一个不存在的文件，先跳走再删
 */
const skipIfPlaying = async(ids: Set<string>) => {
  const playingId = playerState.playMusicInfo.musicInfo?.id
  if (!playingId || !ids.has(playingId)) return
  await playNext()
}

export const handleRemove = async(musicInfo: LX.Music.MusicInfoOnline) => {
  const confirm = await confirmDialog({
    message: global.i18n.t('download_remove_tip', { name: musicInfo.name }),
    confirmButtonText: global.i18n.t('delete'),
  })
  if (!confirm) return
  await skipIfPlaying(new Set([musicInfo.id]))
  await removeOffline(musicInfo.id)
}

export const handleRemoveMulti = async(list: LX.Music.MusicInfoOnline[]) => {
  if (!list.length) return
  const confirm = await confirmDialog({
    message: global.i18n.t('download_remove_multi_tip', { num: list.length }),
    confirmButtonText: global.i18n.t('delete'),
  })
  if (!confirm) return
  const ids = list.map(m => m.id)
  await skipIfPlaying(new Set(ids))
  await removeOfflineMulti(ids)
}
