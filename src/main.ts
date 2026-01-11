import { createApp } from "vue";
import App from "./App.vue";
// --- 核心改动：必须先引入 axios 进行全局“洗脑” ---
import axios from "axios";

// 1. 强制劫持全局 Axios 的原型链
// 不管是哪个实例发送请求，都会经过这个全局响应拦截器
axios.interceptors.response.use((response) => {
  // 扩大捕获范围：匹配任何获取 URL 的接口
  if (response.config?.url?.includes("/song/") || response.config?.url?.includes("/url")) {
    console.log("🚀 [Global Hijack] 捕捉到音频接口请求:", response.config.url);
    
    // 兼容多种数据返回格式
    let raw = response.data;
    let songList = raw?.data || (Array.isArray(raw) ? raw : []);

    if (songList[0]) {
      const s = songList[0];
      // 抹除所有可能触发 SPlayer "EMPTY" 报错的字段
      s.fee = 0;
      s.st = 0;
      s.payed = 1;
      s.cp = 1;
      if (s.url) s.url = s.url.replace(/^http:/, "https:");
      delete s.freeTrialInfo;
      delete s.trialDuration;
      console.log("✅ 数据注入成功，伪造为全权限音源:", s.url);
    }

    // 重新封装成 SPlayer 期待的 Axios 响应结构
    // 确保返回的是 { data: { data: [...] } }
    response.data = {
      code: 200,
      data: songList,
      success: true
    };
  }
  return response;
}, (err) => Promise.reject(err));

console.log("💉 全域 Axios 拦截系统已上线");

// --- 原有 Import 保持不变 ---
import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import router from "@/router";
import { debounceDirective, throttleDirective, visibleDirective } from "@/utils/instruction";
import initIpc from "@/utils/initIpc";
import { useSettingStore } from "@/stores";
import { sendRegisterProtocol } from "@/utils/protocol";
import "@/style/main.scss";
import "@/style/animate.scss";
import "github-markdown-css/github-markdown.css";
import { isElectron } from "./utils/env";
// 注意：即使这里引用了自定义 request，它底层也是 axios，会被上面的全局拦截器覆盖
import request from "@/utils/request";

// 挂载
const app = createApp(App);
const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);
app.use(pinia);
app.use(router);
app.directive("debounce", debounceDirective);
app.directive("throttle", throttleDirective);
app.directive("visible", visibleDirective);
app.mount("#app");

initIpc();

if (isElectron) {
  const settings = useSettingStore();
  sendRegisterProtocol("orpheus", settings.registryProtocol.orpheus);
}
