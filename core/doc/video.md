# 组件文档： `zy-video-view` & `zy-webrtc-player`

本文档为 `zy-video-view` (FLV/MP4 播放器) 和 `zy-webrtc-player` (WebRTC 播放器) 两个核心视频组件提供详细的使用说明和代码示例。

- [zy-video-view (支持 FLV/MP4)](#zy-video-view-支持-flv-mp4)
- [zy-webrtc-player (支持 WebRTC)](#zy-webrtc-player-支持-webrtc)

---

## `zy-video-view` (支持 FLV/MP4)

一个基于 **`mpegts.js`** 的多功能视频播放器。它主要用于 **HTTP-FLV** 格式的直播，同时也**兼容播放标准的 MP4 文件**。组件内置了针对直播的断流重连机制，并支持详细日志输出、彻底资源释放、object-fit 拉伸、录制面板等特性。多实例场景下每路互不干扰，便于高并发和问题排查。

_在你的使用示例中，它被命名为 `zyFlvVideoView`。_

### 代码演示

#### 1. 播放 FLV 直播流 (常用)

这是组件的核心用途。通过设置 `videoUrl` 和 `videoType: 'flv'` 来播放 FLV 直播。组件会自动输出详细的控制台日志，便于排查流状态、重连、卡顿、资源释放等问题。

```vue
<script setup lang="ts">
import { ref } from "vue";
import { zyFlvVideoView } from "zy-video-view";
const flvUrl = ref("http://your-server.com/live/stream.flv");
</script>

<template>
  <div style="width: 600px; height: 400px;">
    <zyFlvVideoView
      :videoUrl="flvUrl"
      :videoType="'flv'"
      :actionButton="true"
      :cors="true"
      :isLive="true"
      :objectFit="'cover'"
      :videoRecord="true"
    />
  </div>
</template>
```

> - `videoUrl`: 直播流地址。
> - `videoType: 'flv'`: 明确告知 `mpegts.js` 按 FLV 格式解码。
> - `actionButton: true`: 显示浏览器原生的控制条。
> - `isLive: true`: **必须设置**，用于启用直播缓冲策略和断流重连。
> - `cors: true`: 如果视频源需要跨域访问，请设置为 true。

> **关键属性解读**：
>
> - `videoUrl`: 直播流地址。
> - `videoType: 'flv'`: 明确告知 `mpegts.js` 按 FLV 格式解码。
> - `actionButton: true`: 显示浏览器原生的控制条。
> - `isLive: true`: **必须设置**，用于启用直播缓冲策略和断流重连。
> - `cors: true`: 如果视频源需要跨域访问，请设置为 true。
> - `objectFit`: 控制 `<video>` 拉伸/铺满（如 'cover', 'contain', 'fill' 等）。
> - `videoRecord`: 显示录制面板（仅 UI，非实际录制）。
> - 控制台会自动输出详细日志，便于排查每一路流的状态、重连、卡顿、资源释放等。

#### 2. 播放 MP4 点播视频

该组件也可用于播放普通的 MP4 文件。只需将 `isLive` 设置为 `false`，并相应地调整 `videoType`。所有资源会在组件卸载或 videoUrl 变更时彻底释放。

```vue
<script setup lang="ts">
import { ref } from "vue";
import { zyFlvVideoView } from "zy-video-view";

const mp4Url = ref("https://media.w3.org/2010/05/sintel/trailer.mp4");
</script>

<template>
  <div style="width: 600px; height: 400px;">
    <zyFlvVideoView
      :videoUrl="mp4Url"
      :videoType="'mp4'"
      :isLive="false"
      :autoplay="false"
      :loop="false"
      :hasAudio="true"
      :actionButton="true"
    />
  </div>
</template>
```

> **关键属性解读**：
>
> - `videoType: 'mp4'`: 明确指定视频类型为 MP4。
> - `isLive: false`: **必须设置**，关闭直播模式，使用点播模式。
> - `loop: false`: 在点播模式下，通常不循环播放。此设置也会**禁用断流重连**机制。
> - `autoplay: false`: 点播视频通常不需要自动播放。
> - `hasAudio: true`: 如果 MP4 文件包含音轨，设置为 true。

### Attributes (Props)

| Attribute      | Description                                                                                               | Type      | Default  |
| -------------- | --------------------------------------------------------------------------------------------------------- | --------- | -------- |
| `videoUrl`     | **[常用]** 视频流的 URL 地址。                                                                            | `string`  | `''`     |
| `videoType`    | **[常用]** 视频流的类型，例如 `'flv'`, `'mp4'`, `'ts'`。`mpegts.js` 依赖此项选择解码器。                  | `string`  | `'flv'`  |
| `isLive`       | **[常用]** 是否为直播流。`true` 启用直播模式和重连，`false` 启用点播模式。                                | `boolean` | `true`   |
| `actionButton` | **[常用]** 是否显示浏览器原生控制条（播放/暂停、音量、全屏等）。**等同于 `<video>` 的 `controls` 属性**。 | `boolean` | `true`   |
| `autoplay`     | **[常用]** 是否自动播放。                                                                                 | `boolean` | `true`   |
| `muted`        | **[常用]** 是否静音播放。在某些浏览器中，`autoplay` 必须配合 `muted` 才能生效。                           | `boolean` | `true`   |
| `loop`         | 是否循环播放。**注意：在直播模式下 (`isLive: true`)，此属性还控制是否启用断流重连检测**。                 | `boolean` | `true`   |
| `hasAudio`     | 指示视频流是否包含音频。                                                                                  | `boolean` | `false`  |
| `cors`         | 是否启用 CORS（跨域）凭证。                                                                               | `boolean` | `false`  |
| `max_count`    | 断流检测阈值。连续 `max_count` 次解码帧未增加即重连（仅 `isLive` 和 `loop` 都为 `true` 时有效）。         | `number`  | `30`     |
| `videoRecord`  | 是否显示录制面板（仅 UI，非实际录制）。                                                                   | `boolean` | `false`  |
| `videoClass`   | 应用于内部 `<video>` 元素的自定义 CSS 类名。                                                              | `string`  | `''`     |
| `objectFit`    | `<video>` 的 object-fit 拉伸模式（如 'cover', 'contain', 'fill' 等）。                                    | `string`  | `'fill'` |

### Exposed Methods

此组件不向外暴露任何方法。所有控制均通过 `props` 的变化来触发。组件会自动彻底释放资源（包括 mpegts.js 实例、video、定时器等），无需手动清理。

### 注意事项

1. **核心依赖**：此组件强依赖 `mpegts.js`。
2. **`isLive` 是关键**：务必根据视频源是直播还是点播文件来正确设置 `isLive` 属性，它会影响底层库的缓冲和播放行为。
3. **重连机制**：断流重连仅在 `isLive: true` 和 `loop: true` 时生效。
4. **详细日志**：组件会自动输出每一路流的创建、播放、卡顿、重连、销毁等详细日志，便于排查问题。
5. **彻底释放**：组件卸载或 videoUrl 变更时会彻底释放所有资源，避免内存泄漏和多实例冲突。
6. **object-fit**：支持自定义 `<video>` 拉伸模式，适配不同 UI 场景。
7. **录制面板**：`videoRecord` 仅为 UI 展示，不涉及实际录制。

---

## `zy-webrtc-player` (支持 WebRTC)

一个基于 **WebRTC** 技术的低延迟视频播放器，专门用于播放 **WHEP** 协议的视频流，非常适合实时性要求高的场景。支持多实例隔离、详细日志输出、彻底资源释放、自动重连、卡顿检测等。

_在你的使用示例中，它被命名为 `zyWebRtcVideoView`。_

### 代码演示

#### 播放 WebRTC (WHEP) 直播流

通过 `url` 属性指定 WHEP 服务地址。使用 `controls` 属性可以快速开启原生控制条。组件会自动输出详细日志，便于排查每一路的连接、重连、释放等状态。

```vue
<script setup lang="ts">
import { ref } from "vue";
import { zyWebRtcVideoView } from "zy-video-view"; // 假设已从你的库中导入

const webrtcUrl = ref(
  "http://your-server/rtc/v1/whep/?app=live&stream=stream-id"
);
</script>

<template>
  <div style="width: 600px; height: 400px;">
    <zyWebRtcVideoView
      :url="webrtcUrl"
      :controls="true"
      :reconnectInterval="5000"
    />
  </div>
</template>
```

> **关键属性解读**：
>
> - `url`: WHEP 视频流的服务地址。
> - `controls: true`: 显示浏览器原生的控制条，**这是实现全屏/非全屏切换最简单的方式**。
> - `reconnectInterval`: 自定义重连的初始间隔时间，这里设置为 5 秒。

### Attributes (Props)

| Attribute              | Description                                                       | Type      | Default |
| ---------------------- | ----------------------------------------------------------------- | --------- | ------- |
| `url`                  | **[常用]** **必需**。WHEP 视频流的服务地址。                      | `string`  | `''`    |
| `controls`             | **[常用]** 是否显示浏览器原生的视频控制条，**内置全屏切换按钮**。 | `boolean` | `false` |
| `autoplay`             | **[常用]** 是否在组件加载后自动播放视频。                         | `boolean` | `true`  |
| `muted`                | **[常用]** 是否静音播放。                                         | `boolean` | `true`  |
| `enableReconnect`      | 是否启用自动重连机制。                                            | `boolean` | `true`  |
| `reconnectInterval`    | 初始重连的间隔时间（单位：毫秒）。后续重连间隔会指数级增长。      | `number`  | `2000`  |
| `maxReconnectAttempts` | 最大重连尝试次数。                                                | `number`  | `5`     |
| `stallTimeout`         | 视频卡顿检测的超时时间（单位：毫秒）。                            | `number`  | `5000`  |

### Exposed Methods

通过 `ref` 获取到组件实例后，可以调用以下方法进行手动控制。所有资源（PeerConnection、MediaStream、video 等）会在 stopPlay 或组件卸载时彻底释放，控制台会输出详细日志。

| Method Name | Description                                                    | Parameters |
| ----------- | -------------------------------------------------------------- | ---------- |
| `startPlay` | 手动开始一次全新的播放。如果之前已失败，会重置状态并重新尝试。 | -          |
| `stopPlay`  | 彻底停止播放并清理所有资源。                                   | -          |

```vue
<!-- 调用示例 -->
<script setup lang="ts">
import { ref } from "vue";
import { zyWebRtcVideoView } from "zy-video-view";

const webrtcPlayerRef = ref<InstanceType<typeof zyWebRtcVideoView> | null>(
  null
);

const handleStop = () => {
  webrtcPlayerRef.value?.stopPlay();
};
</script>

<template>
  <zyWebRtcVideoView ref="webrtcPlayerRef" ... />
  <button @click="handleStop">手动停止</button>
</template>
```

### 注意事项

1.  **协议特定**：此组件仅支持 **WHEP** 协议。
2.  **自动播放**：为保证 `autoplay` 生效，建议始终配合 `muted: true` 使用。
3.  **全屏功能**：将 `controls` 属性设置为 `true` 是实现全屏功能最简单直接的方式。浏览器自带的控制条中包含了全屏按钮。
4.  **详细日志**：组件会自动输出每一路的连接、重连、释放等详细日志，便于排查多路并发和资源释放。
5.  **彻底释放**：组件卸载或 stopPlay 时会彻底释放所有资源，避免内存泄漏和历史连接残留。
6.  **多实例隔离**：支持多路并发播放，互不干扰。
