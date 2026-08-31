import { View, TouchableOpacity } from 'react-native'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'
import { BorderWidths } from '@/theme'
import { scaleSizeH } from '@/utils/pixelRatio'

export const MULTI_SELECT_BAR_HEIGHT = scaleSizeH(40)

export default ({ selectedCount, isSelectAll, onSelectAll, onRemove, onExit }: {
  selectedCount: number
  isSelectAll: boolean
  onSelectAll: (isAll: boolean) => void
  onRemove: () => void
  onExit: () => void
}) => {
  const t = useI18n()
  const theme = useTheme()

  return (
    <View style={{
      ...styles.container,
      height: MULTI_SELECT_BAR_HEIGHT,
      backgroundColor: theme['c-content-background'],
      borderTopColor: theme['c-border-background'],
    }}>
      <TouchableOpacity onPress={() => { onSelectAll(!isSelectAll) }} style={styles.btn}>
        <Text color={theme['c-button-font']}>{t(isSelectAll ? 'list_select_unall' : 'list_select_all')}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onRemove} style={styles.btn} disabled={!selectedCount}>
        <Text color={selectedCount ? theme['c-primary'] : theme['c-font-label']}>
          {selectedCount ? `${t('delete')} (${selectedCount})` : t('delete')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onExit} style={styles.btn}>
        <Text color={theme['c-button-font']}>{t('list_select_cancel')}</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = createStyle({
  container: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: BorderWidths.normal,
  },
  btn: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
