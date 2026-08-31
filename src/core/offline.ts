import {
  downloadFile,
  existsFile,
  extname,
  mkdir,
  moveFile,
  privateStorageDirectoryPath,
  readFile,
  stat,
  unlink,
  writeFile,
} from '@/utils/fs'
import {
  getMusicUrl as getOnlineMusicUrl,
  getLyricInfo as getOnlineLyricInfo,
} from './music/online'
import { buildLyricInfo, TRY_QUALITYS_LIST } from './music/utils'
import { parseLyric } from './music/local'
import { buildLyrics } from '@/utils/lrcTools'
import { getOfflineList, saveOfflineList } from '@/utils/data'
import { action, state } from '@/store/offline'
import { toast } from '@/utils/tools'
import { log } from '@/utils/log'

/**
 * 离线歌曲目录。
 * 刻意与播放器缓存目录（privateStorageDirectoryPath + '/TrackPlayer'）平级而非嵌套：
 * 那个目录被 ExoPlayer 的 SimpleCache 接管，会 LRU 淘汰并清理它不认识的文件。
 */
export const OFFLINE_DIR = `${privateStorageDirectoryPath}/offline`

const AUDIO_EXTS = ['mp3', 'flac', 'ape', 'wav', 'm4a', 'aac', 'ogg', 'wma']

const getAudioPath = (id: string, ext: string) => `${OFFLINE_DIR}/${id}.${ext}`
const getLyricPath = (id: string) => `${OFFLINE_DIR}/${id}.lrc`

const persist = () => {
  saveOfflineList(state.list).catch((err: any) => { log.error(err) })
}

const getExt = (url: string, quality: LX.Quality) => {
  const ext = extname(url.split('?')[0].split('#')[0]).toLowerCase()
  if (AUDIO_EXTS.includes(ext)) return ext
  if (quality.startsWith('flac')) return 'flac'
  if (quality == 'ape' || quality == 'wav') return quality
  return 'mp3'
}

/** 从高到低列出这首歌值得尝试的音质，门槛与 getPlayQuality 一致 */
const getQualityCandidates = (musicInfo: LX.Music.MusicInfoOnline): LX.Quality[] => {
  const supported = global.lx.qualityList[musicInfo.source]
  const list = TRY_QUALITYS_LIST.filter(q => musicInfo.meta._qualitys[q] && supported?.includes(q))
  return [...list, '128k']
}

export const init = async() => {
  const list = await getOfflineList()
  // 早期版本的索引没有 musicInfo，渲染与播放都靠它，缺了就只能丢弃
  for (const [id, info] of Object.entries(list)) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    if (!info?.musicInfo?.id) delete list[id]
  }
  action.setOfflineList(list)
}

/** 已下载条目，按下载时间倒序。列表渲染与播放解析共用这一个排序来源 */
export const getOfflineItems = (): LX.Offline.ItemInfo[] => {
  return Object.values(state.list).sort((a, b) => b.addTime - a.addTime)
}

/** 已下载歌曲，顺序与 getOfflineItems 一致 */
export const getOfflineMusicList = (): LX.Music.MusicInfoOnline[] => {
  return getOfflineItems().map(info => info.musicInfo)
}

export const getOfflineStats = (): LX.Offline.Stats => {
  const list = Object.values(state.list)
  return {
    count: list.length,
    size: list.reduce((total, info) => total + (info.size || 0), 0),
  }
}

/** 已下载则返回音频绝对路径（无 file:// 前缀），否则 null */
export const getOfflineAudioPath = async(id: string) => {
  const info = action.getOfflineItem(id)
  if (!info) return null
  const path = getAudioPath(id, info.ext)
  if (await existsFile(path)) return path
  // 文件被外部删掉了，索引跟着失效
  action.removeOfflineItem(id)
  persist()
  return null
}

/** 已下载且存有歌词则返回歌词信息，否则 null */
export const getOfflineLyricInfo = async(id: string): Promise<LX.Player.LyricInfo | null> => {
  const info = action.getOfflineItem(id)
  if (!info?.hasLyric) return null
  const path = getLyricPath(id)
  if (!await existsFile(path)) return null
  const content = await readFile(path, 'utf8').catch(() => null) as string | null
  if (!content) return null
  return buildLyricInfo(parseLyric(content))
}

export const removeOffline = async(id: string) => {
  const info = action.getOfflineItem(id)
  action.removeOfflineItem(id)
  persist()
  if (!info) return
  await Promise.all([
    unlink(getAudioPath(id, info.ext)).catch(() => {}),
    info.hasLyric ? unlink(getLyricPath(id)).catch(() => {}) : Promise.resolve(),
  ])
}

export const removeOfflineMulti = async(ids: string[]) => {
  const infos = ids.map(id => ({ id, info: action.getOfflineItem(id) }))
  action.removeOfflineItems(ids)
  persist()
  await Promise.all(infos.flatMap(({ id, info }) => {
    if (!info) return []
    return [
      unlink(getAudioPath(id, info.ext)).catch(() => {}),
      ...info.hasLyric ? [unlink(getLyricPath(id)).catch(() => {})] : [],
    ]
  }))
}

const resolveUrl = async(musicInfo: LX.Music.MusicInfoOnline) => {
  for (const quality of getQualityCandidates(musicInfo)) {
    const url = await getOnlineMusicUrl({ musicInfo, quality, isRefresh: true }).catch(() => '')
    if (url) return { url, quality }
  }
  return null
}

const saveOfflineLyric = async(musicInfo: LX.Music.MusicInfoOnline) => {
  const lyricInfo = await getOnlineLyricInfo({ musicInfo, isRefresh: false }).catch(() => null)
  const lyric = lyricInfo?.rawlrcInfo.lyric ?? lyricInfo?.lyric ?? ''
  const lxlyric = lyricInfo?.rawlrcInfo.lxlyric ?? lyricInfo?.lxlyric ?? ''
  if (!lyric && !lxlyric) return false
  // 逐字歌词以本项目既有的 [awlrc:...] 扩展格式内嵌，parseLyric 可原样读回。
  // 注意必须只把 lyric / lxlyric 组成新对象传进去：buildLyrics 的后两个开关只控制
  // 「是否追加成可见行」，buildAwlyric 里的 tlrc / rlrc 是无条件内嵌的。
  const content = buildLyrics({ lyric, lxlyric }, true, false, false)
  if (!content) return false
  await writeFile(getLyricPath(musicInfo.id), content, 'utf8')
  return true
}

export const downloadMusic = async(musicInfo: LX.Music.MusicInfoOnline) => {
  const id = musicInfo.id
  if (action.getStatus(id) != 'none') return

  action.startTask(id, musicInfo)
  let tempPath = ''
  try {
    const resolved = await resolveUrl(musicInfo)
    if (!resolved) throw new Error('no available url')

    const ext = getExt(resolved.url, resolved.quality)
    const targetPath = getAudioPath(id, ext)
    tempPath = `${targetPath}.tmp`

    await mkdir(OFFLINE_DIR)
    await unlink(tempPath).catch(() => {})

    let prevProgress = -1
    const { promise } = downloadFile(resolved.url, tempPath, {
      progressDivider: 1,
      progress({ contentLength, bytesWritten }) {
        if (!contentLength) return
        const progress = Math.min(99, Math.floor(bytesWritten / contentLength * 100))
        if (progress == prevProgress) return
        prevProgress = progress
        action.setTaskProgress(id, progress)
      },
    })
    const { statusCode } = await promise
    if (statusCode != 200) throw new Error(`download failed: ${statusCode}`)

    await moveFile(tempPath, targetPath)
    tempPath = ''

    const hasLyric = await saveOfflineLyric(musicInfo).catch(() => false)
    const size = await stat(targetPath).then(info => Number(info.size) || 0).catch(() => 0)

    action.addOfflineItem(id, {
      ext,
      quality: resolved.quality,
      hasLyric,
      size,
      addTime: Date.now(),
      musicInfo,
    })
    persist()
  } catch (err: any) {
    log.error(err)
    action.removeTask(id)
    if (tempPath) void unlink(tempPath).catch(() => {})
    toast(global.i18n.t('download_failed'))
  }
}
