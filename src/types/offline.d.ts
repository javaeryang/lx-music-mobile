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
    }

    type ListInfo = Record<string, ItemInfo>

    type Status = 'none' | 'downloading' | 'downloaded'
  }
}
