import { create } from 'zustand';
import {
  SourceBean,
  Video,
  VodInfo,
  ViewMode,
  ClientInfo,
  EpisodeInfo,
} from '../types';
import {
  CatVodResult,
  resultToAbsSortXml,
  resultToAbsXml,
  catVodPlayContentToTvBoxPlayContent,
  historyToVodInfo,
  TvBoxMovieSort,
  TvBoxVideo,
} from '../lib/converter';

const MessageCodes = {
  REGISTER: 100,
  GET_SOURCE_BEAN_LIST: 201,
  GET_HOME_CONTENT: 203,
  GET_CATEGORY_CONTENT: 205,
  GET_DETAIL_CONTENT: 207,
  GET_PLAYER_CONTENT: 209,
  GET_PLAY_HISTORY: 211,
  GET_SEARCH_CONTENT: 213,
  SAVE_PLAY_HISTORY: 215,
  GET_ONE_PLAY_HISTORY: 225,
} as const;

const SEARCH_CONFIG_KEY = 'pcbox_search_config';

interface SearchConfig {
  selectedSources: string[];
  showCount: number;
}

function loadSearchConfig(): SearchConfig {
  try {
    const raw = localStorage.getItem(SEARCH_CONFIG_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return { selectedSources: [], showCount: 15 };
}

function saveSearchConfig(config: SearchConfig): void {
  try {
    localStorage.setItem(SEARCH_CONFIG_KEY, JSON.stringify(config));
  } catch {}
}

function generateTopicId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

async function tryParseUrl(encryptedUrl: string): Promise<string | null> {
  const videoExtensions = ['.mp4', '.m3u8', '.flv', '.avi', '.mkv', '.ts', '.mp3'];
  const lowerUrl = encryptedUrl.toLowerCase();

  if (videoExtensions.some((ext) => lowerUrl.includes(ext)) || lowerUrl.startsWith('http')) {
    return encryptedUrl;
  }

  try {
    const base64Part = encryptedUrl.split(':')[0];
    const decoded = atob(base64Part);
    if (decoded.startsWith('http')) {
      return decoded;
    }
  } catch {}

  try {
    const decoded = decodeURIComponent(encryptedUrl);
    if (decoded.startsWith('http')) {
      return decoded;
    }
  } catch {}

  return null;
}

function sendTopicMessage(
  code: number,
  data: any,
  callback: (data: any) => void
): void {
  const api = (window as any).electronAPI;
  if (!api) return;

  const topicId = generateTopicId();

  useStore.getState().addTopicCallback(topicId, callback);

  const client = useStore.getState().connectedClient;
  if (!client) return;

  api.sendMessage(client.id, code, { ...data, topicId });
}

interface AppState {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  wsRunning: boolean;
  wsPort: number;
  localIp: string;
  setWsStatus: (running: boolean, port: number) => void;
  setLocalIp: (ip: string) => void;

  connectedClient: ClientInfo | null;
  setConnectedClient: (client: ClientInfo | null) => void;

  sources: SourceBean[];
  setSources: (sources: SourceBean[]) => void;
  currentSource: SourceBean | null;
  setCurrentSource: (source: SourceBean | null) => void;

  categories: TvBoxMovieSort | null;
  setCategories: (categories: TvBoxMovieSort | null) => void;

  videoList: TvBoxVideo[];
  setVideoList: (videos: TvBoxVideo[]) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalCount: number;
  setTotalCount: (count: number) => void;

  currentVideo: TvBoxVideo | null;
  setCurrentVideo: (video: TvBoxVideo | null) => void;

  currentEpisode: EpisodeInfo | null;
  currentEpisodeIndex: number;
  currentPlayFlag: string;
  playUrl: string;
  playHeaders: Record<string, string>;
  setPlayState: (
    episode: EpisodeInfo | null,
    episodeIndex: number,
    playFlag: string,
    url: string,
    headers?: Record<string, string>
  ) => void;

  history: VodInfo[];
  setHistory: (history: VodInfo[]) => void;

  historyHighlightEpisode: { playFlag: string; episodeUrl: string } | null;
  setHistoryHighlightEpisode: (info: { playFlag: string; episodeUrl: string } | null) => void;

  searchKeyword: string;
  setSearchKeyword: (keyword: string) => void;
  searchResults: TvBoxVideo[];
  setSearchResults: (results: TvBoxVideo[]) => void;

  searchSelectedSources: Set<string>;
  toggleSearchSource: (sourceKey: string) => void;
  selectAllSearchSources: () => void;
  searchSourcesShowCount: number;
  setSearchSourcesShowCount: (count: number) => void;

  loading: boolean;
  setLoading: (loading: boolean) => void;

  topicCallbacks: Map<string, (data: any) => void>;
  addTopicCallback: (topicId: string, callback: (data: any) => void) => void;
  removeTopicCallback: (topicId: string) => void;

  loadSources: () => void;
  loadHomeContent: () => void;
  loadCategoryContent: (tid: string, page: string) => void;
  loadDetailContent: (vodId: string) => void;
  loadPlayerContent: (sourceKey: string, playFlag: string, vodId: string) => Promise<{ url: string; headers: Record<string, string> } | null>;
  search: (keyword: string) => void;
  loadHistory: () => void;
  saveHistory: (history: Omit<VodInfo, 'timestamp'>) => void;
}

export const useStore = create<AppState>((set, get) => ({
  viewMode: 'home',
  setViewMode: (mode) => set({ viewMode: mode }),

  wsRunning: false,
  wsPort: 9898,
  localIp: '127.0.0.1',
  setWsStatus: (running, port) => set({ wsRunning: running, wsPort: port }),
  setLocalIp: (ip) => set({ localIp: ip }),

  connectedClient: null,
  setConnectedClient: (client) => set({ connectedClient: client }),

  sources: [],
  setSources: (sources) => set({ sources }),
  currentSource: null,
  setCurrentSource: (source) => set({ currentSource: source }),

  categories: null,
  setCategories: (categories) => set({ categories }),

  videoList: [],
  setVideoList: (videos) => set({ videoList: videos }),
  currentPage: 1,
  setCurrentPage: (page) => set({ currentPage: page }),
  totalCount: 0,
  setTotalCount: (count) => set({ totalCount: count }),

  currentVideo: null,
  setCurrentVideo: (video) => set({ currentVideo: video }),

  currentEpisode: null,
  currentEpisodeIndex: 0,
  currentPlayFlag: '',
  playUrl: '',
  playHeaders: {},
  setPlayState: (episode, episodeIndex, playFlag, url, headers = {}) =>
    set({ currentEpisode: episode, currentEpisodeIndex: episodeIndex, currentPlayFlag: playFlag, playUrl: url, playHeaders: headers }),

  history: [],
  setHistory: (history) => set({ history }),

  historyHighlightEpisode: null,
  setHistoryHighlightEpisode: (info) => set({ historyHighlightEpisode: info }),

  searchKeyword: '',
  setSearchKeyword: (keyword) => set({ searchKeyword: keyword }),
  searchResults: [],
  setSearchResults: (results) => set({ searchResults: results }),

  searchSelectedSources: new Set<string>(loadSearchConfig().selectedSources),
  toggleSearchSource: (sourceKey) => {
    const state = get();
    const next = new Set(state.searchSelectedSources);
    if (next.has(sourceKey)) {
      next.delete(sourceKey);
    } else {
      next.add(sourceKey);
    }
    set({ searchSelectedSources: next });
    saveSearchConfig({ selectedSources: Array.from(next), showCount: state.searchSourcesShowCount });
  },
  selectAllSearchSources: () => {
    const state = get();
    const allKeys = state.sources.filter((s) => s.searchable === 1).map((s) => s.key);
    const allSelected = allKeys.every((k) => state.searchSelectedSources.has(k));
    const next = allSelected ? new Set<string>() : new Set(allKeys);
    set({ searchSelectedSources: next });
    saveSearchConfig({ selectedSources: Array.from(next), showCount: state.searchSourcesShowCount });
  },
  searchSourcesShowCount: loadSearchConfig().showCount,
  setSearchSourcesShowCount: (count) => {
    set({ searchSourcesShowCount: count });
    const state = get();
    saveSearchConfig({ selectedSources: Array.from(state.searchSelectedSources), showCount: count });
  },

  loading: false,
  setLoading: (loading) => set({ loading }),

  topicCallbacks: new Map(),
  addTopicCallback: (topicId, callback) => {
    const state = get();
    const newMap = new Map(state.topicCallbacks);
    newMap.set(topicId, callback);
    set({ topicCallbacks: newMap });
  },
  removeTopicCallback: (topicId) => {
    const state = get();
    const newMap = new Map(state.topicCallbacks);
    newMap.delete(topicId);
    set({ topicCallbacks: newMap });
  },

  loadSources: () => {
    const state = get();
    if (!state.connectedClient) return;

    set({ loading: true });
    sendTopicMessage(MessageCodes.GET_SOURCE_BEAN_LIST, null, (data) => {
      set({ loading: false });
      if (Array.isArray(data)) {
        set({ sources: data });

        const config = loadSearchConfig();
        if (config.selectedSources.length === 0) {
          const allSearchable = data.filter((s: SourceBean) => s.searchable === 1).map((s: SourceBean) => s.key);
          set({ searchSelectedSources: new Set(allSearchable) });
          saveSearchConfig({ selectedSources: allSearchable, showCount: config.showCount });
        }
      }
    });
  },

  loadHomeContent: () => {
    const state = get();
    if (!state.currentSource || !state.connectedClient) return;

    console.log('[PcBox] Loading home content, source:', state.currentSource.key);
    set({ loading: true });
    sendTopicMessage(
      MessageCodes.GET_HOME_CONTENT,
      state.currentSource,
      (data) => {
        console.log('[PcBox] Home response:', JSON.stringify(data)?.substring(0, 500));
        set({ loading: false });
        if (!data) return;

        const absSortXml = resultToAbsSortXml(data, state.currentSource!.key);
        console.log('[PcBox] Home categories:', absSortXml.classes.sortList.length, 'videos:', absSortXml.list?.videoList.length);
        if (absSortXml.classes.sortList.length > 0) {
          set({ categories: absSortXml.classes });
        }
        if (absSortXml.list) {
          set({ videoList: absSortXml.list.videoList });
        }
      }
    );
  },

  loadCategoryContent: (tid: string, page: string) => {
    const state = get();
    if (!state.currentSource || !state.connectedClient) return;

    set({ loading: true });
    sendTopicMessage(
      MessageCodes.GET_CATEGORY_CONTENT,
      {
        sourceKey: state.currentSource.key,
        tid,
        filter: false,
        page,
        extend: {},
      },
      (data) => {
        set({ loading: false });
        if (!data) return;

        const absSortXml = resultToAbsSortXml(data, state.currentSource!.key);
        if (absSortXml.list) {
          set({ videoList: absSortXml.list.videoList });
        }
      }
    );
  },

  loadDetailContent: (vodId: string) => {
    const state = get();
    if (!state.currentSource || !state.connectedClient) return;

    console.log('[PcBox] Loading detail:', vodId, 'source:', state.currentSource.key);
    set({ loading: true });
    sendTopicMessage(
      MessageCodes.GET_DETAIL_CONTENT,
      {
        sourceKey: state.currentSource.key,
        vodId,
      },
      (data) => {
        console.log('[PcBox] Detail response:', JSON.stringify(data)?.substring(0, 500));
        set({ loading: false });
        if (!data) return;

        const absXml = resultToAbsXml(data, state.currentSource!.key);
        console.log('[PcBox] Detail videos:', absXml.movie.videoList.length);
        if (absXml.movie.videoList.length > 0) {
          const video = absXml.movie.videoList[0];
          video.sourceKey = state.currentSource!.key;
          console.log('[PcBox] Detail video episodes:', video.urlBean?.infoList?.map(f => ({ flag: f.flag, episodes: f.beanList?.length })));
          set({ currentVideo: video });
        }
      }
    );
  },

  loadPlayerContent: async (sourceKey: string, playFlag: string, vodId: string): Promise<{ url: string; headers: Record<string, string> } | null> => {
    const state = get();
    if (!state.connectedClient) return null;

    return new Promise((resolve) => {
      sendTopicMessage(
        MessageCodes.GET_PLAYER_CONTENT,
        { sourceKey, playFlag, vodId },
        async (data) => {
          console.log('[PcBox] Player content:', JSON.stringify(data)?.substring(0, 500));

          if (!data) {
            resolve(null);
            return;
          }

          let videoUrl: string | null = null;
          let headers: Record<string, string> = {};
          let parse = 0;
          let jx = 0;

          if (typeof data.parse === 'number') parse = data.parse;
          if (typeof data.jx === 'number') jx = data.jx;

          if (data.header) {
            try {
              if (typeof data.header === 'string') {
                headers = JSON.parse(data.header);
              } else if (typeof data.header === 'object') {
                headers = data.header;
              }
            } catch (e) {
              console.warn('[PcBox] Failed to parse headers:', e);
            }
          }

          const converted = catVodPlayContentToTvBoxPlayContent(data);
          if (converted?.nameValuePairs?.url) {
            videoUrl = converted.nameValuePairs.url;
          } else if (data.url && typeof data.url === 'string') {
            videoUrl = data.url;
          }

          if (videoUrl) {
            const source = state.sources.find((s) => s.key === sourceKey);
            const playUrlPrefix = data.playUrl || source?.playerUrl || '';
            if (playUrlPrefix && videoUrl && !videoUrl.startsWith('http') && !videoUrl.startsWith('file:')) {
              videoUrl = playUrlPrefix + videoUrl;
            }
          }

          if (!videoUrl) {
            resolve(null);
            return;
          }

          if (parse === 1) {
            if (jx === 0) {
              console.log('[PcBox] parse=1, jx=0: URL needs local parsing');
            } else {
              console.log('[PcBox] parse=1, jx=1: URL needs external parsing service');
            }

            const parsedUrl = await tryParseUrl(videoUrl);
            if (parsedUrl) {
              console.log('[PcBox] URL parsed successfully:', parsedUrl.substring(0, 100));
              resolve({ url: parsedUrl, headers });
              return;
            }

            console.warn('[PcBox] Failed to parse encrypted URL. Source may require a parsing service.');
            resolve(null);
            return;
          }

          resolve({ url: videoUrl, headers });
        }
      );

      setTimeout(() => resolve(null), 15000);
    });
  },

  search: (keyword: string) => {
    const state = get();
    if (!state.connectedClient || state.sources.length === 0) return;

    const searchableSources = state.sources.filter((s) => s.searchable === 1);
    if (searchableSources.length === 0) return;

    const selectedSources =
      state.searchSelectedSources.size > 0
        ? searchableSources.filter((s) => state.searchSelectedSources.has(s.key))
        : searchableSources;

    if (selectedSources.length === 0) return;

    console.log('[PcBox] Searching:', keyword, 'across', selectedSources.length, 'sources');
    set({ loading: true, searchKeyword: keyword, searchResults: [] });

    const allResults: TvBoxVideo[] = [];
    let completedCount = 0;
    const totalSources = selectedSources.length;
    const MAX_CONCURRENT = 15;

    const checkDone = () => {
      completedCount++;
      if (completedCount >= totalSources) {
        set({ loading: false, searchResults: allResults });
      }
    };

    const sendSearch = (source: SourceBean) => {
      sendTopicMessage(
        MessageCodes.GET_SEARCH_CONTENT,
        { sourceKey: source.key, keyword },
        (data) => {
          if (data) {
            const absXml = resultToAbsXml(data, source.key);
            if (absXml.movie.videoList.length > 0) {
              allResults.push(...absXml.movie.videoList);
            }
          }
          checkDone();
        }
      );
    };

    const queue = [...selectedSources];
    let activeCount = 0;

    const drainQueue = () => {
      while (activeCount < MAX_CONCURRENT && queue.length > 0) {
        const source = queue.shift()!;
        activeCount++;
        sendTopicMessage(
          MessageCodes.GET_SEARCH_CONTENT,
          { sourceKey: source.key, keyword },
          (data) => {
            if (data) {
              const absXml = resultToAbsXml(data, source.key);
              if (absXml.movie.videoList.length > 0) {
                allResults.push(...absXml.movie.videoList);
              }
            }
            activeCount--;
            completedCount++;
            if (completedCount >= totalSources) {
              set({ loading: false, searchResults: allResults });
            } else {
              drainQueue();
            }
          }
        );
      }
    };

    drainQueue();
  },

  loadHistory: () => {
    const state = get();
    if (!state.connectedClient) return;

    sendTopicMessage(
      MessageCodes.GET_PLAY_HISTORY,
      { limit: 50 },
      (data) => {
        if (!data) {
          set({ history: [] });
          return;
        }

        if (Array.isArray(data)) {
          const converted = data.map((h: any) => historyToVodInfo(h));
          set({ history: converted });
        } else if (data.list) {
          const converted = data.list.map((h: any) => historyToVodInfo(h));
          set({ history: converted });
        }
      }
    );
  },

  saveHistory: (historyItem) => {
    const state = get();
    if (!state.connectedClient) return;

    const api = (window as any).electronAPI;
    if (!api) return;

    api.sendMessage(
      state.connectedClient.id,
      MessageCodes.SAVE_PLAY_HISTORY,
      { ...historyItem, timestamp: Date.now() }
    );
  },
}));
