import { useEffect, useState } from 'react'
import { event } from './event'
import { getProgress, getStatus } from './action'


export const useOfflineStatus = (id: string) => {
  const [status, setStatus] = useState<LX.Offline.Status>(() => getStatus(id))
  const [progress, setProgress] = useState(() => getProgress(id))

  useEffect(() => {
    const handleUpdate = (changedId: string) => {
      // 空字符串表示整个索引被替换（启动时加载）
      if (changedId && changedId != id) return
      setStatus(getStatus(id))
      setProgress(getProgress(id))
    }
    handleUpdate(id)
    event.on('offline_changed', handleUpdate)
    return () => {
      event.off('offline_changed', handleUpdate)
    }
  }, [id])

  return { status, progress }
}
