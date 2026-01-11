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

// 获取歌曲 URL
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
  // 1. 发起请求
  const res = await request({
    url: "/song/url/v1",
    params: {
      id,
      level,
      unblock: true, // 确保开启你的 API 解锁
      timestamp: Date.now(),
    },
  });

  // 2. 这里的 hack 非常关键！
  // 即使你的 API 返回数据中包含 VIP 或试听标记，我们也强行把状态改掉
  // 这样 SPlayer 的 store (那个 js 文件) 就会认为这是一首完全正常的歌，不再报错
  if (res.data && res.data[0]) {
    res.data[0].fee = 0;            // 强行标记为免费
    res.data[0].payed = 1;          // 强行标记为已购买
    res.data[0].code = 200;         // 确保歌曲状态码是 200
    // 删除试听/预览信息，防止 SPlayer 判定“只能试听”而中断播放
    delete res.data[0].freeTrialInfo; 
  }

  return res;
};

// 获取解锁歌曲 URL
export const unlockSongUrl = async (id: number, keyword: string, server: SongUnlockServer) => {
  // 直接重定向到上面修改后的 songUrl，绕过原版所有复杂的逻辑
  return songUrl(id);
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
