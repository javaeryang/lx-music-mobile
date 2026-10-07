// if (targetSong.key) { // 如果是已下载的歌曲
//   const filePath = path.join(appSetting['download.savePath'], targetSong.metadata.fileName)
//   // console.log(filePath)

import {
  getMusicUrl as getOnlineMusicUrl,
  getPicUrl as getOnlinePicUrl,
  getLyricInfo as getOnlineLyricInfo,
} from './online'
import {
  getMusicUrl as getDownloadMusicUrl,
  getPicUrl as getDownloadPicUrl,
  getLyricInfo as getDownloadLyricInfo,
} from './download'
import {
  getMusicUrl as getLocalMusicUrl,
  getPicUrl as getLocalPicUrl,
  getLyricInfo as getLocalLyricInfo,
} from './local'
import { LIST_IDS } from '@/config/constant'
import { getOfflineAudioPath, getOfflineLyricInfo } from '@/core/offline'

/** 取歌曲在离线索引中的 key */
const getOfflineId = (musicInfo: LX.Music.MusicInfo | LX.Download.ListItem) => {
  return 'progress' in musicInfo ? musicInfo.metadata.musicInfo.id : musicInfo.id
}


export const getMusicUrl = async({
  musicInfo,
  quality,
  listId,
  isRefresh = false,
  onToggleSource,
  allowToggleSource,
}: {
  musicInfo: LX.Music.MusicInfo | LX.Download.ListItem
  isRefresh?: boolean
  quality?: LX.Quality
  listId?: string | null
  onToggleSource?: (musicInfo?: LX.Music.MusicInfoOnline) => void
  allowToggleSource?: boolean
}): Promise<string> => {
  const offlineOnly = listId == LIST_IDS.DOWNLOAD
  if (offlineOnly || !isRefresh) {
    // 离线列表即使刷新或文件丢失也不能回退到在线音源
    const path = await getOfflineAudioPath(getOfflineId(musicInfo))
    if (path) return path
    if (offlineOnly) throw new Error(global.i18n.t('player__error'))
  }
  if ('progress' in musicInfo) {
    return getDownloadMusicUrl({ musicInfo, isRefresh, onToggleSource, allowToggleSource })
  } else if (musicInfo.source == 'local') {
    return getLocalMusicUrl({ musicInfo, isRefresh, onToggleSource, allowToggleSource })
  } else {
    return getOnlineMusicUrl({ musicInfo, isRefresh, quality, onToggleSource, allowToggleSource })
  }
}

export const getPicPath = async({
  musicInfo,
  isRefresh = false,
  listId,
  onToggleSource,
}: {
  musicInfo: LX.Music.MusicInfo | LX.Download.ListItem
  listId?: string | null
  isRefresh?: boolean
  onToggleSource?: (musicInfo?: LX.Music.MusicInfoOnline) => void
}): Promise<string> => {
  // 离线下载未保存封面，使用默认封面，避免图片组件和系统通知请求网络。
  if (listId == LIST_IDS.DOWNLOAD) return ''
  if ('progress' in musicInfo) {
    return getDownloadPicUrl({ musicInfo, isRefresh, listId, onToggleSource })
  } else if (musicInfo.source == 'local') {
    return getLocalPicUrl({ musicInfo, isRefresh, listId, onToggleSource })
  } else {
    return getOnlinePicUrl({ musicInfo, isRefresh, listId, onToggleSource })
  }
}

export const getLyricInfo = async({
  musicInfo,
  listId,
  isRefresh = false,
  onToggleSource,
}: {
  musicInfo: LX.Music.MusicInfo | LX.Download.ListItem
  isRefresh?: boolean
  listId?: string | null
  onToggleSource?: (musicInfo?: LX.Music.MusicInfoOnline) => void
}): Promise<LX.Player.LyricInfo> => {
  const offlineOnly = listId == LIST_IDS.DOWNLOAD
  if (offlineOnly || !isRefresh) {
    // 已下载的歌曲优先读本地歌词文件
    const lyricInfo = await getOfflineLyricInfo(getOfflineId(musicInfo))
    if (lyricInfo) return lyricInfo
    if (offlineOnly) return { lyric: '', rawlrcInfo: { lyric: '' } }
  }
  if ('progress' in musicInfo) {
    return getDownloadLyricInfo({ musicInfo, isRefresh, onToggleSource })
  } else if (musicInfo.source == 'local') {
    return getLocalLyricInfo({ musicInfo, isRefresh, onToggleSource })
  } else {
    return getOnlineLyricInfo({ musicInfo, isRefresh, onToggleSource })
  }
}
