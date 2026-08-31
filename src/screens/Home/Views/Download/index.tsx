import { useCallback, useEffect, useMemo, useState } from 'react'
import { View } from 'react-native'
import { createStyle } from '@/utils/tools'
import { event, state } from '@/store/offline'
import { getOfflineItems, getOfflineStats } from '@/core/offline'
import Header from './Header'
import List from './List'
import { type OfflineRow } from './ListItem'
import MultipleModeBar from './MultipleModeBar'
import { handlePlay, handleRemove, handleRemoveMulti } from './listAction'

/**
 * 下载中的排在最前（它们最新），其后是已下载的。
 * 已下载部分的顺序直接取自 getOfflineItems()，和播放器 getList(LIST_IDS.DOWNLOAD)
 * 用的是同一个排序来源，不在这里重复排序。
 */
const buildRows = (): OfflineRow[] => {
  const tasks: OfflineRow[] = [...state.tasks.values()].map(task => ({
    musicInfo: task.musicInfo,
    progress: task.progress,
  }))
  const downloaded: OfflineRow[] = getOfflineItems().map(info => ({
    musicInfo: info.musicInfo,
    progress: null,
    quality: info.quality,
  }))
  return [...tasks, ...downloaded]
}

export default () => {
  const [rows, setRows] = useState<OfflineRow[]>(buildRows)
  const [stats, setStats] = useState<LX.Offline.Stats>(getOfflineStats)
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    const handleUpdate = () => {
      setRows(buildRows())
      setStats(getOfflineStats())
    }
    event.on('offline_changed', handleUpdate)
    return () => {
      event.off('offline_changed', handleUpdate)
    }
  }, [])

  // 索引里已经没有的歌不该继续处于选中态
  useEffect(() => {
    if (!isMultiSelectMode) return
    setSelectedIds(prev => {
      const alive = new Set(rows.filter(r => r.progress == null).map(r => r.musicInfo.id))
      const next = new Set([...prev].filter(id => alive.has(id)))
      return next.size == prev.size ? prev : next
    })
  }, [rows, isMultiSelectMode])

  const exitSelectMode = useCallback(() => {
    setIsMultiSelectMode(false)
    setSelectedIds(new Set())
  }, [])

  const handleItemPress = useCallback((item: OfflineRow) => {
    if (isMultiSelectMode) {
      if (item.progress != null) return
      setSelectedIds(prev => {
        const next = new Set(prev)
        if (next.has(item.musicInfo.id)) next.delete(item.musicInfo.id)
        else next.add(item.musicInfo.id)
        return next
      })
      return
    }
    if (item.progress != null) return
    handlePlay(item.musicInfo)
  }, [isMultiSelectMode])

  const handleItemLongPress = useCallback((item: OfflineRow) => {
    if (isMultiSelectMode || item.progress != null) return
    setIsMultiSelectMode(true)
    setSelectedIds(new Set([item.musicInfo.id]))
  }, [isMultiSelectMode])

  const handleItemRemove = useCallback((item: OfflineRow) => {
    void handleRemove(item.musicInfo)
  }, [])

  const downloadedRows = useMemo(() => rows.filter(r => r.progress == null), [rows])
  const isSelectAll = downloadedRows.length > 0 && selectedIds.size == downloadedRows.length

  const handleSelectAll = useCallback((isAll: boolean) => {
    setSelectedIds(isAll ? new Set(downloadedRows.map(r => r.musicInfo.id)) : new Set())
  }, [downloadedRows])

  const handleRemoveSelected = useCallback(() => {
    const list = downloadedRows.filter(r => selectedIds.has(r.musicInfo.id)).map(r => r.musicInfo)
    void handleRemoveMulti(list).then(exitSelectMode)
  }, [downloadedRows, selectedIds, exitSelectMode])

  const handleEnterSelectMode = useCallback(() => {
    setIsMultiSelectMode(true)
    setSelectedIds(new Set())
  }, [])

  return (
    <View style={styles.container}>
      <Header stats={stats} isMultiSelectMode={isMultiSelectMode} onEnterSelectMode={handleEnterSelectMode} />
      <List
        list={rows}
        selectedIds={selectedIds}
        isMultiSelectMode={isMultiSelectMode}
        onPress={handleItemPress}
        onLongPress={handleItemLongPress}
        onRemove={handleItemRemove}
      />
      {
        isMultiSelectMode
          ? (
              <MultipleModeBar
                selectedCount={selectedIds.size}
                isSelectAll={isSelectAll}
                onSelectAll={handleSelectAll}
                onRemove={handleRemoveSelected}
                onExit={exitSelectMode}
              />
            )
          : null
      }
    </View>
  )
}

const styles = createStyle({
  container: {
    flex: 1,
  },
})
