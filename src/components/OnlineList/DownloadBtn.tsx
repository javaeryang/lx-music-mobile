import { memo } from 'react'
import { TouchableOpacity } from 'react-native'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { useOfflineStatus } from '@/store/offline'
import { downloadMusic } from '@/core/offline'
import { createStyle } from '@/utils/tools'

export default memo(({ musicInfo }: {
  musicInfo: LX.Music.MusicInfoOnline
}) => {
  const t = useI18n()
  const theme = useTheme()
  const { status, progress } = useOfflineStatus(musicInfo.id)

  const handlePress = () => {
    if (status != 'none') return
    void downloadMusic(musicInfo)
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={styles.button}
      accessibilityRole="button"
      accessibilityLabel={t('download')}
      accessibilityState={{ disabled: status != 'none', busy: status == 'downloading' }}
    >
      {
        status == 'downloading'
          ? <Text size={10} color={theme['c-primary']}>{progress}%</Text>
          : <Icon name="download-2" style={{ color: status == 'downloaded' ? theme['c-primary'] : theme['c-350'] }} size={13} />
      }
    </TouchableOpacity>
  )
})

const styles = createStyle({
  button: {
    height: '80%',
    width: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
