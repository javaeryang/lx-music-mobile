import { LIST_IDS } from '@/config/constant'
import { event as offlineEvent } from '@/store/offline'
import { playNext, resetRandomNextMusicInfo } from '@/core/player/player'
import { updatePlayIndex } from '@/core/player/playInfo'
import { throttleBackgroundTimer } from '@/utils/tools'
import playerState from '@/store/player/state'

const changedListIds = new Set<string | null>()

export default () => {
  const throttleListChange = throttleBackgroundTimer(() => {
    const isSkip = !changedListIds.has(playerState.playInfo.playerListId) && !changedListIds.has(playerState.playMusicInfo.listId)
    changedListIds.clear()
    if (isSkip) return

    const { playIndex } = updatePlayIndex()
    if (playIndex < 0) { // 歌曲被移除
      // if (global.lx.isPlayedStop) {
      //   stop()
      //   setTimeout(() => {
      //     setPlayMusicInfo(null, null)
      //   })
      // } else
      if (!playerState.playMusicInfo.isTempPlay) {
        // console.log('current music removed')
        void playNext(true)
      }
    }
  })

  const handleListChange = (listIds: string[]) => {
    for (const id of listIds) {
      changedListIds.add(id)
    }
    throttleListChange()
  }

  const handleDownloadListChange = () => {
    handleListChange(['download'])
  }

  offlineEvent.on('offline_changed', () => {
    if (playerState.playInfo.playerListId != LIST_IDS.DOWNLOAD && playerState.playMusicInfo.listId != LIST_IDS.DOWNLOAD) return
    resetRandomNextMusicInfo()
    updatePlayIndex()
  })

  global.app_event.on('myListMusicUpdate', handleListChange)
  global.app_event.on('downloadListUpdate', handleDownloadListChange)
}
