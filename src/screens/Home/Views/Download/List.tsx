import { useMemo, useRef } from 'react'
import { FlatList, type FlatListProps, View } from 'react-native'
import Text from '@/components/common/Text'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { useSettingValue } from '@/store/setting/hook'
import { createStyle, getRowInfo } from '@/utils/tools'
import ListItem, { ITEM_HEIGHT, type OfflineRow } from './ListItem'
import { MULTI_SELECT_BAR_HEIGHT } from './MultipleModeBar'

type FlatListType = FlatListProps<OfflineRow>

export default ({ list, selectedIds, isMultiSelectMode, onPress, onLongPress, onRemove }: {
  list: OfflineRow[]
  selectedIds: Set<string>
  isMultiSelectMode: boolean
  onPress: (item: OfflineRow, index: number) => void
  onLongPress: (item: OfflineRow, index: number) => void
  onRemove: (item: OfflineRow) => void
}) => {
  const t = useI18n()
  const theme = useTheme()
  const rowInfo = useRef(getRowInfo())
  const isShowAlbumName = useSettingValue('list.isShowAlbumName')
  const isShowInterval = useSettingValue('list.isShowInterval')

  const renderItem: FlatListType['renderItem'] = ({ item, index }) => (
    <ListItem
      item={item}
      index={index}
      isSelected={selectedIds.has(item.musicInfo.id)}
      isMultiSelectMode={isMultiSelectMode}
      onPress={onPress}
      onLongPress={onLongPress}
      onRemove={onRemove}
      rowInfo={rowInfo.current}
      isShowAlbumName={isShowAlbumName}
      isShowInterval={isShowInterval}
    />
  )
  const getKey: FlatListType['keyExtractor'] = item => item.musicInfo.id
  const getItemLayout: FlatListType['getItemLayout'] = (data, index) => {
    return { length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index }
  }

  const emptyComponent = useMemo(() => (
    <View style={styles.empty}>
      <Text style={styles.emptyText} color={theme['c-font-label']}>{t('download_list_empty')}</Text>
    </View>
  ), [t, theme])

  const footerComponent = useMemo(() => (
    <View style={{ width: '100%', paddingBottom: isMultiSelectMode ? MULTI_SELECT_BAR_HEIGHT : 0 }} />
  ), [isMultiSelectMode])

  return (
    <FlatList
      style={styles.list}
      data={list}
      numColumns={rowInfo.current.rowNum}
      horizontal={false}
      maxToRenderPerBatch={4}
      windowSize={8}
      removeClippedSubviews={true}
      initialNumToRender={12}
      renderItem={renderItem}
      keyExtractor={getKey}
      getItemLayout={getItemLayout}
      ListEmptyComponent={emptyComponent}
      ListFooterComponent={footerComponent}
    />
  )
}

const styles = createStyle({
  list: {
    flexGrow: 1,
    flexShrink: 1,
  },
  empty: {
    paddingTop: 60,
    paddingLeft: 30,
    paddingRight: 30,
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 22,
  },
})
