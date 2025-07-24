import Mpegts from "mpegts.js";

/**
 * @description 播放器类型定义
 */
export type IFlvVideoProps = {
  /**
   * 是否显示操作按钮
   */
  actionButton?: boolean;
  /**
   * 指示是否启用 CORS跨域 以进行 http 获取
   */
  cors?: boolean;
  /**
   * 指示数据源是否为直播流
   */
  isLive?: boolean;
  /**
   * 视频元素的类名
   */
  videoClass?: string;
  /**
   * 是否开启录制功能
   */
  videoRecord?: boolean;
  /**
   * 是否开启音频
   */
  hasAudio?: boolean;
  /**
   * 视频类型，可选值为'mse', 'mpegts', 'm2ts', 'flv', 'mp4'
   */
  videoType?: "mse" | "mpegts" | "m2ts" | "flv" | "mp4";
  /**
   * 表示媒体 URL，可以以'https(s)'或开头'ws(s)'(WebSocket)
   */
  videoUrl: string;

  /**
   * 是否自动播放
   */
  autoplay?: boolean;

  /**
   * 是否循环播放
   */
  loop?: boolean;

  /**
   * 视频断流后，重试最大次数，超过最大次数后，将重新连接视频流
   */
  max_count?: number;
  /**
   * 是否静音播放，默认为false
   */
  muted?: boolean;
};

export type IMPEGTSPlayer = Mpegts.Player;
