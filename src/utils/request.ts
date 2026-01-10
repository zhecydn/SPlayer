import axios, { AxiosInstance, AxiosRequestConfig, AxiosError, AxiosResponse } from "axios";
import { isDev } from "./env";
import { useSettingStore } from "@/stores";
import { getCookie } from "./cookie";
import { isLogin } from "./auth";
import axiosRetry from "axios-retry";

// 全局地址
const baseURL: string = String(isDev ? "/api/netease" : import.meta.env["VITE_API_URL"]);

// 基础配置
const server: AxiosInstance = axios.create({
  baseURL,
  // 允许跨域
  withCredentials: true,
  // 超时时间
  timeout: 15000,
});

// 请求重试
axiosRetry(server, {
  // 重试次数
  retries: 3,
});

// 请求拦截器
server.interceptors.request.use(
  (request) => {
    // pinia
    const settingStore = useSettingStore();
    if (!request.params) request.params = {};
    // Cookie
    if (!request.params.noCookie && (isLogin() || getCookie("MUSIC_U") !== null)) {
      const cookie = `MUSIC_U=${getCookie("MUSIC_U")};`;
      request.params.cookie = cookie;
    }
    // 自定义 realIP
    if (settingStore.useRealIP) {
      if (settingStore.realIP) {
        request.params.realIP = settingStore.realIP;
      } else {
        request.params.randomCNIP = true;
      }
    }
    // proxy
    if (settingStore.proxyProtocol !== "off") {
      const protocol = settingStore.proxyProtocol.toLowerCase();
      const server = settingStore.proxyServe;
      const port = settingStore.proxyPort;
      const proxy = `${protocol}://${server}:${port}`;
      if (proxy) request.params.proxy = proxy;
    }
    // 发送请求
    return request;
  },
  (error: AxiosError) => {
    console.error("请求发送失败：", error);
    return Promise.reject(error);
  },
);

// 响应拦截器
server.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    const { response } = error;
    // 状态码处理
    switch (response?.status) {
      case 400:
        console.error("客户端错误：", response.status, response.statusText);
        // 执行客户端错误的处理逻辑
        break;
      case 401:
        console.error("未授权：", response.status, response.statusText);
        // 执行未授权的处理逻辑
        break;
      case 403:
        console.error("禁止访问：", response.status, response.statusText);
        // 执行禁止访问的处理逻辑
        break;
      case 404:
        console.error("未找到资源：", response.status, response.statusText);
        // 执行未找到资源的处理逻辑
        break;
      case 500:
        console.error("服务器错误：", response.status, response.statusText);
        // 执行服务器错误的处理逻辑
        break;
      default:
        // 处理其他状态码或错误条件
        console.error("未处理的错误：", error.message);
    }
    // 返回错误
    return Promise.reject(error);
  },
);
// 在 service.interceptors.request.use 中添加
config.interceptors.request.use((config) => {
  // 1. 自动映射所有 v1 接口
  const v1Endpoints = ['/song/url', '/search', '/playlist/detail', '/album', '/artist/songs'];
  
  if (v1Endpoints.some(endpoint => config.url.startsWith(endpoint))) {
    // 如果还没加 v1，就给它加上
    if (!config.url.includes('/v1')) {
      config.url = config.url.replace(/(\/song\/url|\/search|\/playlist\/detail)/, '$1/v1');
    }
  }

  // 2. 音质参数强制转换
  if (config.url.includes('/song/url/v1')) {
    config.params = {
      ...config.params,
      level: 'jymaster', // 强制开启最高音质
      unblock: true      // 开启增强版灵魂：解灰
    };
    delete config.params.br; // 删除旧版参数
  }

  return config;
});
// 请求
const request = async <T = any>(config: AxiosRequestConfig): Promise<T> => {
  // 返回请求数据
  const { data } = await server.request(config);
  return data as T;
};

export default request;
