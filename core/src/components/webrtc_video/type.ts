/**
 * @description WebRTC WHEP 播放器的 Props 类型定义
 */
export interface IWebRtcPlayerProps {
  /**
   * @description (必需) WHEP 视频流的 URL 地址。
   * @example http://your-server:1985/rtc/v1/whep/?app=live&stream=test
   */
  url: string;

  /**
   * @description 是否自动播放。
   * @default true
   */
  autoplay?: boolean;

  /**
   * @description 是否静音播放。浏览器策略通常要求自动播放时必须静音。
   * @default true
   */
  muted?: boolean;

  /**
   * @description 是否显示视频原生控制条。
   * @default false
   */
  controls?: boolean;

  /**
   * @description 是否在连接失败或断流后启用自动重连。
   * @default true
   */
  enableReconnect?: boolean;

  /**
   * @description 最大重连尝试次数。
   * @default 5
   */
  maxReconnectAttempts?: number;

  /**
   * @description 初始重连间隔（毫秒），后续会按指数退避增加。
   * @default 2000
   */
  reconnectInterval?: number;

  /**
   * @description 视频卡顿检测超时（毫秒）。如果视频当前播放在此时间内没有变化，则视为卡顿并触发重连。
   * @default 5000
   */
  stallTimeout?: number;
}
