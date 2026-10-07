const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const { test } = require('node:test')
const vm = require('node:vm')
const ts = require('typescript')

// Run the actual TypeScript modules with native/network boundaries replaced.
const load = (path, mocks, globals = {}) => {
  const exports = {}
  const code = ts.transpileModule(readFileSync(resolve(__dirname, '..', path), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  vm.runInNewContext(code, {
    exports,
    require: name => {
      assert.ok(name in mocks, `Missing mock: ${name}`)
      return mocks[name]
    },
    global: globals,
    console: { log() {} },
    setTimeout,
    clearTimeout,
  }, { filename: path })
  return exports
}
const constants = { LIST_IDS: { DOWNLOAD: 'download' } }
const song = id => ({ id, source: 'kw', name: id, singer: '', meta: { picUrl: 'https://example.com/cover' } })
const createResources = () => {
  const calls = []
  let audio = '/offline/a.mp3'
  let lyric = { lyric: '[00:01]local', rawlrcInfo: { lyric: '[00:01]local' } }
  const remote = Object.fromEntries(['getMusicUrl', 'getPicUrl', 'getLyricInfo'].map(name => [name, async() => {
    calls.push(name)
    return 'online'
  }]))
  const resources = load('src/core/music/index.ts', {
    './online': remote,
    './download': remote,
    './local': remote,
    '@/config/constant': constants,
    '@/core/offline': {
      getOfflineAudioPath: async() => audio,
      getOfflineLyricInfo: async() => lyric,
    },
  }, { i18n: { t: key => key } })
  return { resources, calls, setAudio: value => { audio = value }, setLyric: value => { lyric = value } }
}

test('download playback and refresh use local audio and lyrics without fetching artwork', async() => {
  const { resources, calls } = createResources()
  for (const isRefresh of [false, true]) {
    const options = { musicInfo: song('a'), listId: 'download', isRefresh }
    assert.equal(await resources.getMusicUrl(options), '/offline/a.mp3')
    assert.equal((await resources.getLyricInfo(options)).lyric, '[00:01]local')
    assert.equal(await resources.getPicPath(options), '')
  }
  assert.deepEqual(calls, [])
})

test('missing offline audio fails and missing lyrics stay empty, including refresh', async() => {
  const { resources, calls, setAudio, setLyric } = createResources()
  setAudio(null)
  setLyric(null)
  for (const isRefresh of [false, true]) {
    const options = { musicInfo: song('a'), listId: 'download', isRefresh }
    await assert.rejects(resources.getMusicUrl(options), /player__error/)
    assert.equal((await resources.getLyricInfo(options)).lyric, '')
  }
  assert.deepEqual(calls, [])
})

test('ordinary online lists retain their online fallback', async() => {
  const { resources, calls, setAudio, setLyric } = createResources()
  setAudio(null)
  setLyric(null)
  const options = { musicInfo: song('a'), listId: 'default' }
  assert.equal(await resources.getMusicUrl(options), 'online')
  assert.equal(await resources.getLyricInfo(options), 'online')
  assert.equal(await resources.getPicPath(options), 'online')
  assert.equal(calls.length, 3)
})

const createPlayer = () => {
  const list = ['a', 'b', 'c'].map(song)
  list[1].meta.toggleMusicInfo = song('online-alternative')
  const state = { playInfo: { playerListId: null, playerPlayIndex: -1 }, playMusicInfo: {}, musicInfo: {}, progress: { nowPlayTime: 0 }, playedList: [], tempPlayList: [] }
  const actions = {
    setMusicInfo: info => Object.assign(state.musicInfo, info),
    setPlayListId: id => { state.playInfo.playerListId = id },
    setPlayMusicInfo: (listId, musicInfo, isTempPlay) => { state.playMusicInfo = { listId, musicInfo, isTempPlay } },
    updatePlayIndex: (playIndex, playerPlayIndex) => Object.assign(state.playInfo, { playIndex, playerPlayIndex }),
  }
  const globals = { lx: { playerStatus: {}, gettingUrlId: '' }, i18n: { t: key => key }, app_event: new Proxy({}, { get: () => () => {} }) }
  const playInfo = load('src/core/player/playInfo.ts', {
    '@/store/player/action': { default: actions },
    '@/store/player/state': { default: state },
    '@/utils/listManage': { getListMusicSync: () => [] },
    '@/core/player/progress': { setProgress() {} },
    '@/config/constant': constants,
    '@/core/offline': { getOfflineMusicList: () => list },
  }, globals)
  const resourceCalls = []
  const played = []
  const player = load('src/core/player/player.ts', {
    '@/plugins/player': { isInitialized: () => true, setStop: async() => {}, setResource: (info, url) => played.push({ id: info.id, url }) },
    '@/core/player/playStatus': { setStatusText() {} },
    '@/store/player/state': { default: state },
    '@/store/setting/state': { default: { setting: { 'player.togglePlayMethod': 'listLoop' } } },
    '@/core/player/playInfo': playInfo,
    '@/core/player/playedList': { clearPlayedList: () => { state.playedList = [] } },
    '@/core/player/tempPlayList': { clearTempPlayeList: () => { state.tempPlayList = [] } },
    '@/core/music': Object.fromEntries(['getMusicUrl', 'getPicPath', 'getLyricInfo'].map(name => [name, async options => {
      resourceCalls.push({ name, ...options })
      return name == 'getLyricInfo' ? { lyric: '', rawlrcInfo: { lyric: '' } } : name == 'getPicPath' ? '' : '/offline/a.mp3'
    }])),
    '@/utils/message': { requestMsg: {} },
    '@/utils/common': { getRandom: () => 0 },
    './utils': { filterList: async({ list, playerMusicInfo }) => ({ filteredList: list, playerIndex: list.indexOf(playerMusicInfo) }) },
    'react-native-background-timer': { default: { setTimeout: () => 1, clearTimeout() {} } },
    '@/utils/tools': { debounceBackgroundTimer: fn => fn },
    '@/config/constant': constants,
    '@/core/list': {},
    '@/core/dislikeList': {},
    'react-native': { Platform: { OS: 'ios' } },
  }, globals)
  return { player, playInfo, state, list, resourceCalls, played }
}
const flush = () => new Promise(resolve => setImmediate(resolve))

test('click selects full offline queue, uses correct index and skips saved online alternative', async() => {
  const { player, playInfo, state, list, resourceCalls, played } = createPlayer()
  state.tempPlayList.push({ musicInfo: song('queued-online') })
  await player.playListById('download', 'b')
  await flush()
  assert.equal(state.playInfo.playerListId, 'download')
  assert.equal(state.playInfo.playerPlayIndex, 1)
  assert.equal(playInfo.getList('download').length, 3)
  assert.equal(state.tempPlayList.length, 0)
  assert.equal(state.musicInfo.pic, '')
  assert.ok(resourceCalls.every(call => call.listId == 'download' && call.musicInfo.id == 'b'))
  player.setMusicUrl(list[1], true)
  await flush()
  assert.ok(resourceCalls.some(call => call.name == 'getMusicUrl' && call.isRefresh && call.listId == 'download'))
  await player.playNext()
  await flush()
  assert.equal(state.playMusicInfo.musicInfo.id, 'c')
  assert.equal(state.playInfo.playerPlayIndex, 2)
  await player.playPrev()
  await flush()
  assert.equal(state.playMusicInfo.musicInfo.id, 'b')
  assert.deepEqual(played.map(info => info.id), ['b', 'b', 'c', 'b'])
})

test('offline queue index follows new downloads and initial artwork never contains remote URL', () => {
  const { playInfo, state, list } = createPlayer()
  playInfo.setPlayListId('download')
  playInfo.setPlayMusicInfo('download', list[1])
  assert.equal(state.musicInfo.pic, null)
  list.unshift(song('new'))
  playInfo.updatePlayIndex()
  assert.equal(state.playInfo.playerPlayIndex, 2)
})

test('offline playback never preloads or probes network URLs', async() => {
  const handlers = {}
  let calls = 0
  const unexpected = () => { calls++; throw new Error('Unexpected network/preload call') }
  const init = load('src/core/init/player/preloadNextMusic.ts', {
    '@/config/constant': constants,
    '@/core/music': { getMusicUrl: unexpected },
    '@/core/player/player': { getNextPlayMusicInfo: unexpected },
    '@/utils/request': { checkUrl: unexpected },
    '@/store/player/state': { default: { playMusicInfo: { listId: 'download' } } },
    '@/plugins/player/utils': { isCached: unexpected },
  }, {
    app_event: { on() {} },
    state_event: { on: (event, fn) => { handlers[event] = fn } },
  }).default
  init()
  handlers.playProgressChanged({ maxPlayTime: 100, nowPlayTime: 95 })
  await flush()
  assert.equal(calls, 0)
})

test('startup restores saved offline queue position without loading ordinary lists', async() => {
  const calls = []
  const saved = { listId: 'download', index: 1, time: 10 }
  const globals = { lx: {} }
  const init = load('src/core/init/player/playInfo.ts', {
    '@/utils/data': { getPlayInfo: async() => saved },
    '@/config/constant': constants,
    '@/core/player/playInfo': { getList: () => [song('a'), song('b')] },
    '@/core/list': { getListMusics: () => assert.fail('Offline restore must not load ordinary lists') },
    '@/core/player/player': { playList: async(...args) => calls.push(args) },
  }, globals).default
  await init({})
  assert.deepEqual(calls, [['download', 1]])
  assert.equal(globals.lx.restorePlayInfo, saved)
})
