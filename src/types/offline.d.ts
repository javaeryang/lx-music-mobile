declare namespace LX {
  namespace Offline {
    /** 已下载歌曲的索引项，key 为 musicInfo.id */
    interface ItemInfo {
      /** 音频文件后缀，不含点，如 flac / mp3 */
      ext: string
      /** 实际下载到的音质 */
      quality: LX.Quality
      /** 是否存在同名 .lrc 歌词文件 */
      hasLyric: boolean
      /** 音频文件字节数，用于统计占用空间 */
      size: number
      /** 下载完成时间戳，列表按它倒序 */
      addTime: number
      /** 渲染列表与播放都需要完整的歌曲信息 */
      musicInfo: LX.Music.MusicInfoOnline
    }

    type ListInfo = Record<string, ItemInfo>

    type Status = 'none' | 'downloading' | 'downloaded'

    /** 正在下载的任务 */
    interface TaskInfo {
      progress: number
      musicInfo: LX.Music.MusicInfoOnline
    }

    interface Stats {
      count: number
      size: number
    }
  }
}
