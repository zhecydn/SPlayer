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
  try {
    const response: any = await request({
      url: "/song/url/v1",
      params: {
        id,
        level,
        unblock: true, 
        timestamp: Date.now(),
      },
    });

    // --- 结构自适应修正 ---
    // 情况 A: request.ts 没剥离数据，response 还是 { data: [...] }
    // 情况 B: request.ts 剥离了数据，response 直接就是 { code: 200, data: [...] } 或直接就是 [...]
    
    let finalData = response?.data || (Array.isArray(response) ? response : null);
    
    // 如果 response 直接包含 data 数组 (标准的网易云接口结构)
    if (response && Array.isArray(response.data)) {
        finalData = response.data;
    }

    if (finalData && finalData[0]) {
      // 强制清洗第一首歌曲的数据
      const song = finalData[0];
      song.fee = 0;
      song.payed = 1;
      song.code = 200;
      if (song.freeTrialInfo) delete song.freeTrialInfo;
      
      if (song.url) {
        song.url = song.url.replace(/^http:/, "https:");
      } else {
        console.error("❌ 严重：API 返回的对象里没有 url 字段", song);
      }
    } else {
      console.error("❌ 严重：API 返回结构不包含有效的 data 数组", response);
    }

    // --- 重点：包装成 Store 预期的原始 Axios 结构 ---
    // SPlayer 的 Store 逻辑通常会执行类似 (await songUrl(id)).data[0].url
    // 如果我们的 request.ts 已经把 data 剥离了，我们这里必须把它包回去！
    const finalResult = response?.data ? response : { data: response };

    console.log("✅ 发送给播放器的数据结构:", finalResult);
    return finalResult;

  } catch (error) {
    console.error("songUrl 内部执行出错:", error);
    return { data: [{ id, url: null, code: 404 }] };
  }
};

// 获取解锁歌曲 URL
export const unlockSongUrl = async (id: number, keyword: string, server: SongUnlockServer) => {
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
