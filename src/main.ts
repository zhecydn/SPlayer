import { createApp } from "vue";
import App from "./App.vue";
// pinia
import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
// router
import router from "@/router";
// 自定义指令
import { debounceDirective, throttleDirective, visibleDirective } from "@/utils/instruction";
// ipc
import initIpc from "@/utils/initIpc";
// use-store
import { useSettingStore } from "@/stores";
import { sendRegisterProtocol } from "@/utils/protocol";
// 全局样式
import "@/style/main.scss";
import "@/style/animate.scss";
import "github-markdown-css/github-markdown.css";
import { isElectron } from "./utils/env";
import request from "@/utils/request";

// --- 强制底层劫持逻辑开始 ---
// @ts-ignore
request.interceptors?.response.use((response) => {
  // 监控所有包含歌曲地址的请求
  if (response.config?.url?.includes("/song/url")) {
    console.log("🎸 底层劫持：检测到音频数据返回");

    // 1. 拿到原始数据（根据你的 request.ts，这可能是剥离后的内容）
    let rawData = response.data;
    
    // 2. 自动兼容：如果 data 里面还有个 data，就取里面的
    let songs = rawData?.data || (Array.isArray(rawData) ? rawData : []);

    // 3. 强制洗白：这是对抗 AUDIO_SOURCE_EMPTY 的核心
    if (songs[0]) {
      const s = songs[0];
      s.fee = 0;
      s.st = 0;
      s.payed = 1;
      s.cp = 1;
      if (s.url) s.url = s.url.replace(/^http:/, "https:");
      // 必须删掉这个，这是 SPlayer 报 EMPTY 的最大诱因
      delete s.freeTrialInfo;
      console.log("✅ 劫持成功：数据已强制洗白，URL 为:", s.url);
    }

    // 4. 强制构造 Store 期待的结构
    // 无论如何，返回给上一层的东西必须长这样：{ data: [ { url: '...' } ] }
    response.data = {
      code: 200,
      data: songs
    };
  }
  return response;
}, (error) => {
  return Promise.reject(error);
});
// --- 强制底层劫持逻辑结束 ---

// 挂载
const app = createApp(App);
// pinia
const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);
app.use(pinia);
// router
app.use(router);
// 自定义指令
app.directive("debounce", debounceDirective);
app.directive("throttle", throttleDirective);
app.directive("visible", visibleDirective);
// app
app.mount("#app");

// 初始化 ipc
initIpc();

// 根据设置判断是否要注册协议
if (isElectron) {
  const settings = useSettingStore();
  sendRegisterProtocol("orpheus", settings.registryProtocol.orpheus);
}
