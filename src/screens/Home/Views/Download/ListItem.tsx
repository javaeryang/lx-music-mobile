import { memo } from 'react'
import { View, TouchableOpacity } from 'react-native'
import Text from '@/components/common/Text'
import Badge, { type BadgeType } from '@/components/common/Badge'
import { Icon } from '@/components/common/Icon'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { scaleSizeH } from '@/utils/pixelRatio'
import { LIST_ITEM_HEIGHT } from '@/config/constant'
import { createStyle, type RowInfo } from '@/utils/tools'

export const ITEM_HEIGHT = scaleSizeH(LIST_ITEM_HEIGHT)

export interface OfflineRow {
  musicInfo: LX.Music.MusicInfoOnline
  /** null 表示已下载完成，数字表示下载进度 */
  progress: number | null
  /** 已下载的实际音质，下载中为 undefined */
  quality?: LX.Quality
}

const useQualityTag = (quality: LX.Quality | undefined) => {
  const t = useI18n()
  if (quality == 'flac24bit') return { type: 'secondary' as BadgeType, text: t('quality_lossless_24bit') }
  if (quality == 'flac' || quality == 'ape' || quality == 'wav') return { type: 'secondary' as BadgeType, text: t('quality_lossless') }
  if (quality == '320k') return { type: 'tertiary' as BadgeType, text: t('quality_high_quality') }
  return null
}

export default memo(({ item, index, isSelected, isMultiSelectMode, onPress, onLongPress, onRemove, rowInfo, isShowAlbumName, isShowInterval }: {
  item: OfflineRow
  index: number
  isSelected: boolean
  isMultiSelectMode: boolean
  onPress: (item: OfflineRow, index: number) => void
  onLongPress: (item: OfflineRow, index: number) => void
  onRemove: (item: OfflineRow) => void
  rowInfo: RowInfo
  isShowAlbumName: boolean
  isShowInterval: boolean
}) => {
  const theme = useTheme()
  const t = useI18n()
  const tagInfo = useQualityTag(item.quality)
  const { musicInfo, progress } = item
  const isDownloading = progress != null

  const singer = `${musicInfo.singer}${isShowAlbumName && musicInfo.meta.albumName ? ` · ${musicInfo.meta.albumName}` : ''}`

  return (
    <View style={{ ...styles.listItem, width: rowInfo.rowWidth, height: ITEM_HEIGHT, backgroundColor: isSelected ? theme['c-primary-background-hover'] : 'rgba(0,0,0,0)' }}>
      <TouchableOpacity
        style={styles.listItemLeft}
        disabled={isDownloading && !isMultiSelectMode}
        onPress={() => { onPress(item, index) }}
        onLongPress={() => { onLongPress(item, index) }}
      >
        <Text style={styles.sn} size={13} color={theme['c-300']}>{index + 1}</Text>
        <View style={styles.itemInfo}>
          <Text numberOfLines={1} color={isDownloading ? theme['c-350'] : theme['c-font']}>{musicInfo.name}</Text>
          <View style={styles.listItemSingle}>
            { isDownloading ? <Badge type="normal">{`${progress}%`}</Badge> : null }
            { tagInfo ? <Badge type={tagInfo.type}>{tagInfo.text}</Badge> : null }
            <Badge type="tertiary">{musicInfo.source}</Badge>
            <Text style={styles.listItemSingleText} size={11} color={theme['c-500']} numberOfLines={1}>{singer}</Text>
          </View>
        </View>
        {
          isShowInterval && !isDownloading ? (
            <Text size={12} color={theme['c-250']} numberOfLines={1}>{musicInfo.interval}</Text>
          ) : null
        }
      </TouchableOpacity>
      {
        isMultiSelectMode || isDownloading ? null : (
          <TouchableOpacity
            onPress={() => { onRemove(item) }}
            style={styles.removeButton}
            accessibilityRole="button"
            accessibilityLabel={t('delete')}
          >
            <Icon name="remove" style={{ color: theme['c-350'] }} size={13} />
          </TouchableOpacity>
        )
      }
    </View>
  )
}, (prevProps, nextProps) => {
  return !!(prevProps.item.musicInfo === nextProps.item.musicInfo &&
    prevProps.item.progress === nextProps.item.progress &&
    prevProps.item.quality === nextProps.item.quality &&
    prevProps.index === nextProps.index &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isMultiSelectMode === nextProps.isMultiSelectMode &&
    prevProps.isShowAlbumName === nextProps.isShowAlbumName &&
    prevProps.isShowInterval === nextProps.isShowInterval
  )
})

const styles = createStyle({
  listItem: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    paddingRight: 2,
    alignItems: 'center',
  },
  listItemLeft: {
    flex: 1,
    flexGrow: 1,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sn: {
    width: 38,
    textAlign: 'center',
    paddingLeft: 3,
    paddingRight: 3,
  },
  itemInfo: {
    flexGrow: 1,
    flexShrink: 1,
    paddingRight: 2,
  },
  listItemSingle: {
    paddingTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  listItemSingleText: {
    flexGrow: 0,
    flexShrink: 1,
    fontWeight: '300',
  },
  removeButton: {
    height: '80%',
    paddingLeft: 14,
    paddingRight: 14,
    justifyContent: 'center',
  },
})
