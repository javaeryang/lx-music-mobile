import { View, TouchableOpacity } from 'react-native'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'
import { sizeFormate } from '@/utils/common'
import { BorderWidths } from '@/theme'
import { scaleSizeH } from '@/utils/pixelRatio'

export const HEADER_HEIGHT = scaleSizeH(38)

export default ({ stats, isMultiSelectMode, onEnterSelectMode }: {
  stats: LX.Offline.Stats
  isMultiSelectMode: boolean
  onEnterSelectMode: () => void
}) => {
  const t = useI18n()
  const theme = useTheme()

  return (
    <View style={{ ...styles.container, height: HEADER_HEIGHT, borderBottomColor: theme['c-border-background'] }}>
      <Text size={13} color={theme['c-font-label']} numberOfLines={1}>
        {t('download_stats', { count: stats.count, size: sizeFormate(stats.size) })}
      </Text>
      {
        stats.count && !isMultiSelectMode
          ? (
              <TouchableOpacity onPress={onEnterSelectMode} style={styles.btn} accessibilityRole="button">
                <Text size={13} color={theme['c-button-font']}>{t('list_select_all')}</Text>
              </TouchableOpacity>
            )
          : null
      }
    </View>
  )
}

const styles = createStyle({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 15,
    paddingRight: 5,
    borderBottomWidth: BorderWidths.normal,
  },
  btn: {
    paddingLeft: 12,
    paddingRight: 12,
    height: '100%',
    justifyContent: 'center',
  },
})
