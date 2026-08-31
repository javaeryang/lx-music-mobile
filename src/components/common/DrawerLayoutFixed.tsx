import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react'
import { DrawerLayoutAndroid, type DrawerLayoutAndroidProps, View, type LayoutChangeEvent, Platform, TouchableWithoutFeedback, Dimensions } from 'react-native'
// import { getWindowSise } from '@/utils/tools'
import { usePageVisible } from '@/store/common/hook'
import { type COMPONENT_IDS } from '@/config/constant'

interface Props extends DrawerLayoutAndroidProps {
  visibleNavNames: COMPONENT_IDS[]
  widthPercentage: number
  widthPercentageMax?: number
}

export interface DrawerLayoutFixedType {
  openDrawer: () => void
  closeDrawer: () => void
  fixWidth: () => void
}

const DrawerLayoutFixed = forwardRef<DrawerLayoutFixedType, Props>(({ visibleNavNames, widthPercentage, widthPercentageMax, children, ...props }, ref) => {
  const drawerLayoutRef = useRef<DrawerLayoutAndroid>(null)
  const [w, setW] = useState<number | `${number}%`>('100%')
  const [drawerWidth, setDrawerWidth] = useState(() => {
    const width = Dimensions.get('window').width
    const wp = Math.floor(width * widthPercentage)
    return widthPercentageMax ? Math.min(wp, widthPercentageMax) : wp
  })
  const [iosDrawerVisible, setIosDrawerVisible] = useState(false)
  const changedRef = useRef({ width: 0, changed: false })
  const isAndroid = Platform.OS == 'android'
  const isLeft = props.drawerPosition != 'right'

  const fixDrawerWidth = useCallback(() => {
    if (!isAndroid) return
    if (!changedRef.current.width) return
    changedRef.current.changed = true
    // console.log('usePageVisible', visible, changedRef.current.width)
    setW(changedRef.current.width - 1)
  }, [isAndroid])

  // 修复 DrawerLayoutAndroid 在导航到其他屏幕再返回后无法打开的问题
  usePageVisible(visibleNavNames, useCallback((visible) => {
    if (!visible || !changedRef.current.width) return
    fixDrawerWidth()
  }, [fixDrawerWidth]))

  useImperativeHandle(ref, () => ({
    openDrawer() {
      if (isAndroid) {
        drawerLayoutRef.current?.openDrawer()
        return
      }
      setIosDrawerVisible(true)
    },
    closeDrawer() {
      if (isAndroid) {
        drawerLayoutRef.current?.closeDrawer()
        return
      }
      setIosDrawerVisible(false)
    },
    fixWidth() {
      fixDrawerWidth()
    },
  }), [fixDrawerWidth, isAndroid])


  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width
    if (changedRef.current.width != width) {
      changedRef.current.width = width
      const wp = Math.floor(width * widthPercentage)
      setDrawerWidth(widthPercentageMax ? Math.min(wp, widthPercentageMax) : wp)
    }
    if (!isAndroid) return
    if (changedRef.current.changed) {
      setW('100%')
      changedRef.current.changed = false
      return
    }
    changedRef.current.changed = true
    setW(width - 1)
  }, [widthPercentage, widthPercentageMax, isAndroid])

  if (!isAndroid) {
    return (
      <View style={{ width: '100%', flex: 1 }} onLayout={handleLayout}>
        {children}
        <View
          pointerEvents={iosDrawerVisible ? 'auto' : 'none'}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            // 关闭状态下抽屉面板是靠 translateX 移到左侧屏幕外的，而 iOS 的 View 默认不裁剪子视图，
            // 面板会溢出到相邻的 PagerView 页面上（排行榜的榜单列表盖住歌单页等）。必须在这里裁掉。
            overflow: 'hidden',
          }}
        >
          <TouchableWithoutFeedback onPress={() => { setIosDrawerVisible(false) }}>
            <View style={{ flex: 1, backgroundColor: iosDrawerVisible ? 'rgba(0, 0, 0, 0.35)' : 'transparent' }}>
              <TouchableWithoutFeedback>
                <View
                  style={{
                    width: drawerWidth,
                    height: '100%',
                    backgroundColor: props.drawerBackgroundColor ?? 'white',
                    marginLeft: isLeft ? 0 : undefined,
                    marginRight: isLeft ? undefined : 0,
                    alignSelf: isLeft ? 'flex-start' : 'flex-end',
                    transform: [{ translateX: iosDrawerVisible ? 0 : (isLeft ? -drawerWidth : drawerWidth) }],
                  }}
                >
                  <View style={{ flex: 1 }}>
                    {props.renderNavigationView?.()}
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </View>
    )
  }

  return (
    <View
      onLayout={handleLayout}
      style={{ width: w, flex: 1 }}
    >
      <DrawerLayoutAndroid
        ref={drawerLayoutRef}
        keyboardDismissMode="on-drag"
        drawerWidth={drawerWidth}
        {...props}
      >
        <View style={{ marginRight: w == '100%' ? 0 : -1, flex: 1 }}>
          {children}
        </View>
      </DrawerLayoutAndroid>
    </View>
  )
})

// const styles = createStyle({
//   container: {
//     flex: 1,
//   },
// })

export default DrawerLayoutFixed
