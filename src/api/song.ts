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
  console.log("🛠️ 开始请求歌曲 URL, ID:", id);

  try {
    // 强制把这个请求包在 try-catch 里
    const res: any = await request({
      url: "/song/url/v1",
      params: { id, level, unblock: true, timestamp: Date.now() },
    }).catch(err => {
      console.error("🔥 Request.ts 内部抛出了错误:", err);
      // 如果这里报错，说明是 baseURL 或 Axios 拦截器直接拦截了
      throw err; 
    });

    console.log("📥 Request 原始响应内容:", res);

    // 结构归一化
    let list = [];
    if (res?.data && Array.isArray(res.data)) list = res.data;
    else if (Array.isArray(res)) list = res;
    else if (res?.url) list = [res];

    if (list.length > 0) {
      const s = list[0];
      s.fee = 0;
      s.st = 0;
      s.payed = 1;
      if (s.url) s.url = s.url.replace(/^http:/, "https:");
      delete s.freeTrialInfo;
      console.log("✅ 成功洗白数据, 准备返回...");
    } else {
      console.warn("⚠️ API 返回了空列表，这会导致 EMPTY 报错");
    }

    const final = { data: list, code: 200 };
    console.log("🚀 终极封装数据:", final);
    return final;

  } catch (error: any) {
    console.error("❌ songUrl 函数彻底崩溃:", error);
    // 这里非常关键：即便报错，我们也返回一个格式正确的空数据，
    // 看看 SPlayer 会报什么，而不是任由它抛出堆栈错误
    return { data: [{ id, url: null }], code: 404 };
  }
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
