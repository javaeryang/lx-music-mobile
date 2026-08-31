import TrackPlayer, { type NowPlayingMetadata, type NowPlayingTitles } from 'react-native-track-player'
import { NativeModules, Platform } from 'react-native'
import { getDuration } from './time'

export type { NowPlayingTitles }

interface NativeTrackPlayerModule {
  updateNowPlayingMetadata?: (metadata: NowPlayingMetadata) => Promise<void>
  updateNowPlayingTitles?: (titles: NowPlayingTitles) => Promise<void>
}

const nativeTrackPlayer = NativeModules.TrackPlayerModule as NativeTrackPlayerModule

// iOS 原生的 updateNowPlayingMetadata 只接收 metadata 一个参数，
// 直接调用 TrackPlayer.updateNowPlayingMetadata(metadata, playing) 会因参数个数不匹配而抛异常
export const updateNowPlayingMetadata = async(metadata: NowPlayingMetadata, playing = true) => {
  if (Platform.OS == 'ios' && typeof nativeTrackPlayer.updateNowPlayingMetadata == 'function') {
    return nativeTrackPlayer.updateNowPlayingMetadata(metadata)
  }
  return TrackPlayer.updateNowPlayingMetadata(metadata, playing)
}

// updateNowPlayingTitles 仅 Android 有原生实现，iOS 退回到 updateNowPlayingMetadata
export const updateNowPlayingTitles = async(titles: NowPlayingTitles) => {
  console.log('set playing titles', titles)
  if (Platform.OS == 'ios' && typeof nativeTrackPlayer.updateNowPlayingTitles != 'function') {
    const { title, artist, album } = titles
    // iOS 没有对应的整段歌词字段，只有歌词行时无需更新
    if (title == null && artist == null && album == null) return
    return updateNowPlayingMetadata({ title, artist, album, duration: await getDuration() })
  }
  return TrackPlayer.updateNowPlayingTitles(titles)
}
