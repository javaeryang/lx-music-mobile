interface InitState {
  /** 已下载歌曲索引，key 为 musicInfo.id */
  list: LX.Offline.ListInfo
  /** 正在下载的歌曲进度，key 为 musicInfo.id，值为 0-100 */
  tasks: Map<string, number>
}

const state: InitState = {
  list: {},
  tasks: new Map(),
}


export {
  state,
}
