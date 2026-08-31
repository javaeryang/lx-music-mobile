interface InitState {
  /** 已下载歌曲索引，key 为 musicInfo.id */
  list: LX.Offline.ListInfo
  /** 正在下载的歌曲，key 为 musicInfo.id */
  tasks: Map<string, LX.Offline.TaskInfo>
}

const state: InitState = {
  list: {},
  tasks: new Map(),
}


export {
  state,
}
