import ZyFlvVideo from "./components/flv_video/index.vue";
import ZyWebRtcVideo from "./components/webrtc_video/index.vue";
import { withInstall } from "./utils/with-install";

// 确保 VideoView 的类型是 DefineComponent
const zyFlvVideoView = withInstall(ZyFlvVideo);
const zyWebRtcVideoView = withInstall(ZyWebRtcVideo);

// 创建一个包含所有组件的对象作为默认导出
const ZyVideoView = {
  zyFlvVideoView,
  zyWebRtcVideoView,
  install(app: any) {
    app.component("zy-flv-video-view", zyFlvVideoView);
    app.component("zy-webrtc-video-view", zyWebRtcVideoView);
  },
};

// 默认导出
export default ZyVideoView;

// 命名导出
export { zyFlvVideoView, zyWebRtcVideoView };

// 类型导出
export type { IFlvVideoProps } from "./components/flv_video/type";
export type { IWebRtcPlayerProps } from "./components/webrtc_video/type";
