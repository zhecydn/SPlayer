import { isElectron } from "@/utils/env";
import { defaultAMLLDbServer, songLevelData } from "@/utils/meta";
import { SongUnlockServer } from "@/core/player/SongManager";
import { useSettingStore } from "@/stores";
import request from "@/utils/request";

// 获取歌曲详情
export const songDetail = (ids: number | number[]) => {
  return request({
    url: "/song/detail",
    method: "post",
    params: { timestamp: Date.now() },
    data: { ids: Array.isArray(ids) ? ids.join(",") : ids.toString() },
  });
};

/**
 * 歌曲音质详情
 * @param id 歌曲 id
 */
export const songQuality = (id: number) => {
  return request({
    url: "/song/music/detail",
    params: { id },
  });
};

export const songUrl = async (
  id: number,
  level:
    | "standard"
    | "higher"
    | "exhigh"
    | "lossless"
    | "hires"
    | "jyeffect"
    | "sky"
    | "jymaster" = "exhigh",
) => {
  // 注意：这里的 res 已经是 request.ts 剥离出的业务对象了 { code: 200, data: [...] }
  const res: any = await request({
    url: "/song/url/v1",
    params: {
      id,
      level,
      unblock: true, 
      timestamp: Date.now(),
    },
  });

  console.log("DEBUG: request.ts 返回给 songUrl 的原始数据:", res);

  // 1. 获取歌曲数组 (考虑到多种 API 返回可能)
  const songs = res?.data || (Array.isArray(res) ? res : []);
  
  if (songs.length > 0) {
    const s = songs[0];
    // 强制洗白所有导致 SPlayer 报 EMPTY 的属性
    s.url = s.url ? s.url.replace(/^http:/, "https:") : null;
    s.fee = 0;
    s.payed = 1;
    s.st = 0;
    s.cp = 1;
    if (s.freeTrialInfo) delete s.freeTrialInfo;
  }

  // 2. 【核心重点】重新包装！
  // 因为 SPlayer 的 Store 会去读结果的 .data 属性
  // 我们必须在这里手动包一层，让它拿到 { data: [...] }
  return {
    data: songs,
    code: 200,
    success: true
  };
};

export const unlockSongUrl = async (id: number) => {
  return await songUrl(id);
};

// 获取歌曲歌词
export const songLyric = (id: number) => {
  return request({
    url: "/lyric/new",
    params: {
      id,
    },
  });
};

/**
 * 获取歌曲 TTML 歌词
 * @param id 音乐 id
 * @returns TTML 格式歌词
 */
export const songLyricTTML = async (id: number) => {
  if (isElectron) {
    return request({ url: "/lyric/ttml", params: { id, noCookie: true } });
  } else {
    const settingStore = useSettingStore();
    const server = settingStore.amllDbServer || defaultAMLLDbServer;
    const url = server.replace("%s", String(id));
    try {
      const response = await fetch(url);
      if (response === null || response.status !== 200) {
        return null;
      }
      const data = await response.text();
      return data;
    } catch {
      return null;
    }
  }
};

/**
 * 获取歌曲下载链接
 * @param id 音乐 id
 * @param level 播放音质等级, 分为 standard => 标准,higher => 较高, exhigh=>极高, lossless=>无损, hires=>Hi-Res, jyeffect => 高清环绕声, sky => 沉浸环绕声, `dolby` => `杜比全景声`, jymaster => 超清母带
 * @returns
 */
export const songDownloadUrl = (id: number, level: keyof typeof songLevelData = "h") => {
  // 获取对应音质
  const levelName = songLevelData[level].level;
  return request({
    url: "/song/download/url/v1",
    params: { id, level: levelName, timestamp: Date.now() },
  });
};

// 喜欢歌曲
export const likeSong = (id: number, like: boolean = true) => {
  return request({
    url: "/like",
    params: { id, like, timestamp: Date.now() },
  });
};

/**
 * 本地歌曲文件匹配
 * @param {string} title - 文件的标题信息，是文件属性里的标题属性，并非文件名
 * @param {string} album - 文件的专辑信息
 * @param {string} artist - 文件的艺术家信息
 * @param {number} duration - 文件的时长，单位为秒
 * @param {string} md5 - 文件的 md5
 */

export const matchSong = (
  title: string,
  artist: string,
  album: string,
  duration: number,
  md5: string,
) => {
  return request({
    url: "/search/match",
    params: { title, artist, album, duration, md5 },
  });
};

/**
 * 歌曲动态封面
 * @param {number} id - 歌曲 id
 */
export const songDynamicCover = (id: number) => {
  return request({
    url: "/song/dynamic/cover",
    params: { id },
  });
};

/**
 * 副歌时间
 * @param {number} id - 歌曲 id
 */
export const songChorus = (id: number) => {
  return request({
    url: "/song/chorus",
    params: { id },
  });
};
