<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import { IWebRtcPlayerProps } from "./type";

defineOptions({ name: "zy-webrtc-player" });

const props = withDefaults(
  defineProps<IWebRtcPlayerProps & { objectFit?: string }>(),
  {
    autoplay: true,
    muted: true,
    controls: false,
    enableReconnect: true,
    maxReconnectAttempts: 5,
    reconnectInterval: 2000,
    stallTimeout: 5000,
    objectFit: "fill",
  }
);

const LOG_PREFIX = "[zy-webrtc-player]";

const videoRef = ref<HTMLVideoElement | null>(null);
const statusText = ref("等待初始化...");
const isShowingStatus = ref(true);
const peerConnection = ref<RTCPeerConnection | null>(null);
const whepSessionUrl = ref<string | null>(null);
const hasStopped = ref(false);
const reconnectTimer = ref<NodeJS.Timeout | null>(null);
const stallDetectorTimer = ref<NodeJS.Timeout | null>(null);
const reconnectAttempts = ref(0);
let lastVideoTime = -1;

// 日志辅助函数
function logInfo(msg: string, ...args: any[]) {
  console.log(`[zy-webrtc-player][${props.url}]`, msg, ...args);
}
function logWarn(msg: string, ...args: any[]) {
  console.warn(`[zy-webrtc-player][${props.url}]`, msg, ...args);
}
function logError(msg: string, ...args: any[]) {
  console.error(`[zy-webrtc-player][${props.url}]`, msg, ...args);
}

// 彻底释放 video 的流
function releaseVideoStream() {
  if (videoRef.value && videoRef.value.srcObject) {
    const ms = videoRef.value.srcObject as MediaStream;
    ms.getTracks().forEach((track) => track.stop());
    videoRef.value.srcObject = null;
  }
}

const cleanup = async () => {
  logInfo("执行 cleanup，释放资源");
  if (reconnectTimer.value) clearTimeout(reconnectTimer.value);
  if (stallDetectorTimer.value) clearTimeout(stallDetectorTimer.value);
  reconnectTimer.value = null;
  stallDetectorTimer.value = null;

  if (peerConnection.value) {
    logInfo("关闭 PeerConnection");
    peerConnection.value.onconnectionstatechange = null;
    peerConnection.value.ontrack = null;
    peerConnection.value.onicegatheringstatechange = null;
    peerConnection.value.close();
    peerConnection.value = null;
  }

  if (whepSessionUrl.value) {
    try {
      await fetch(whepSessionUrl.value, { method: "DELETE" });
      logInfo("删除 WHEP 会话", whepSessionUrl.value);
    } catch (e) {
      logWarn("删除 WHEP 会话失败", e);
    }
    whepSessionUrl.value = null;
  }

  releaseVideoStream();
  lastVideoTime = -1;
};

const startStallDetector = () => {
  if (!videoRef.value || !props.enableReconnect || hasStopped.value) return;
  if (stallDetectorTimer.value) clearTimeout(stallDetectorTimer.value);

  stallDetectorTimer.value = setTimeout(() => {
    if (!videoRef.value || hasStopped.value) return;
    const currentTime = videoRef.value.currentTime;
    if (
      lastVideoTime !== -1 &&
      lastVideoTime === currentTime &&
      !videoRef.value.paused
    ) {
      logWarn("检测到视频卡顿，currentTime 未变化，触发重连");
      statusText.value = "视频流卡顿，正在重连...";
      isShowingStatus.value = true;
      handleReconnect();
    } else {
      lastVideoTime = currentTime;
      startStallDetector();
    }
  }, props.stallTimeout);
};

const handleReconnect = () => {
  if (hasStopped.value) return;
  isShowingStatus.value = true;
  if (reconnectAttempts.value >= props.maxReconnectAttempts) {
    logError("重连次数已达上限，停止重连");
    statusText.value =
      "连接失败，请检查网络连接、视频流地址是否正确，或联系管理员后刷新重试。";
    hasStopped.value = true;
    if (reconnectTimer.value) clearTimeout(reconnectTimer.value);
    if (stallDetectorTimer.value) clearTimeout(stallDetectorTimer.value);
    return;
  }
  reconnectAttempts.value++;
  const delay =
    props.reconnectInterval * Math.pow(2, reconnectAttempts.value - 1);
  logWarn(
    `连接中断，第${reconnectAttempts.value}次重连，${delay / 1000}s 后重试`
  );
  statusText.value = `连接中断，${delay / 1000}秒后尝试第${
    reconnectAttempts.value
  }次重连...`;
  cleanup().then(() => {
    if (hasStopped.value) return;
    reconnectTimer.value = setTimeout(_executePlay, delay);
  });
};

const _executePlay = async () => {
  if (!props.url) {
    statusText.value = "错误：未提供视频流地址";
    isShowingStatus.value = true;
    throw new Error("未提供视频流地址，请检查组件的 url 属性是否正确传递。");
  }
  await cleanup();
  if (reconnectAttempts.value === 0) statusText.value = "正在初始化...";
  isShowingStatus.value = true;

  try {
    logInfo("创建 PeerConnection");
    const pc = new RTCPeerConnection();
    peerConnection.value = pc;

    const iceGatheringPromise = new Promise<void>((resolve) => {
      pc.onicegatheringstatechange = () => {
        logInfo("ICE gathering state:", pc.iceGatheringState);
        if (pc.iceGatheringState === "complete") resolve();
      };
    });

    pc.ontrack = (event) => {
      logInfo("收到 track", event.track.kind, event.track.id);
      if (videoRef.value) {
        if (!videoRef.value.srcObject) {
          videoRef.value.srcObject = new MediaStream();
        }
        (videoRef.value.srcObject as MediaStream).addTrack(event.track);
        videoRef.value.onplaying = () => {
          logInfo("video onplaying，流已开始播放");
          statusText.value = "正在播放";
          isShowingStatus.value = false;
          reconnectAttempts.value = 0;
          startStallDetector();
        };
      }
    };

    pc.onconnectionstatechange = () => {
      logInfo("PeerConnection 状态变更:", pc.connectionState);
      if (!pc || hasStopped.value) return;
      // 连接状态日志
      switch (pc.connectionState) {
        case "connected":
          statusText.value = "已连接，等待媒体数据...";
          break;
        case "disconnected":
        case "failed":
        case "closed":
          statusText.value = `连接已断开（${pc.connectionState}），正在尝试重连...`;
          if (props.enableReconnect) handleReconnect();
          break;
        default:
          statusText.value = `连接状态：${pc.connectionState}`;
      }
    };

    logInfo("添加 transceiver: video/recvonly, audio/recvonly");
    pc.addTransceiver("video", { direction: "recvonly" });
    pc.addTransceiver("audio", { direction: "recvonly" });

    logInfo("创建 offer");
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await iceGatheringPromise;
    statusText.value = "正在协商媒体流...";

    logInfo("发送 WHEP 请求", props.url);
    const response = await fetch(props.url, {
      method: "POST",
      headers: { "Content-Type": "application/sdp" },
      body: pc.localDescription?.sdp,
    });

    if (!response.ok || response.status !== 201) {
      logError(`WHEP 请求失败，状态码: ${response.status}`);
      throw new Error(
        `WHEP 请求失败，状态码: ${response.status}。\n可能原因：\n1. 视频流服务未启动或地址错误。\n2. 网络不通或被防火墙拦截。\n3. 服务器不支持 WHEP 协议。\n解决方案：\n- 检查视频流地址和网络连通性。\n- 联系服务端管理员确认接口可用。`
      );
    }

    const answerSdp = await response.text();
    const location = response.headers.get("Location");
    if (!location) {
      logError("WHEP 响应中未找到 Location 头");
      throw new Error(
        "WHEP 响应中未找到 Location 头。\n可能原因：\n1. 服务端未正确实现 WHEP 协议。\n2. 服务器返回异常。\n解决方案：\n- 联系服务端管理员排查接口实现。"
      );
    }
    whepSessionUrl.value = new URL(location, props.url).href;

    logInfo("设置远端 SDP");
    await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
  } catch (error) {
    if (hasStopped.value) return;
    let errMsg = error instanceof Error ? error.message : String(error);
    statusText.value = `播放失败：${errMsg}`;
    logError("播放失败", error);
    if (props.enableReconnect) handleReconnect();
    else isShowingStatus.value = true;
    throw new Error(`播放失败：${errMsg}`);
  }
};

const startPlay = async () => {
  hasStopped.value = false;
  reconnectAttempts.value = 0;
  await _executePlay();
};

const stopPlay = () => {
  hasStopped.value = true;
  cleanup().then(() => {
    statusText.value = "已停止";
    isShowingStatus.value = true;
  });
};

watch(
  () => props.url,
  (newUrl, oldUrl) => {
    if (newUrl && newUrl !== oldUrl) startPlay();
  }
);

onMounted(() => {
  if (props.autoplay) startPlay();
});

onUnmounted(() => {
  stopPlay();
});

defineExpose({ startPlay, stopPlay });
</script>

<template>
  <!-- ... 模板部分没有变化 ... -->
  <div class="webrtc-player-container">
    <video
      ref="videoRef"
      :autoplay="props.autoplay"
      :muted="props.muted"
      :controls="props.controls"
      playsinline
      class="video-element"
      :style="`object-fit: ${props.objectFit}`"
    ></video>
    <div class="status-overlay" v-if="isShowingStatus">
      <span class="status-text">{{ statusText }}</span>
    </div>
  </div>
</template>

<style scoped>
/* ... 样式部分没有变化 ... */
.webrtc-player-container {
  width: 100%;
  height: 100%;
  position: relative;
  background-color: #000;
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}
.video-element {
  width: 100%;
  height: 100%;
}
.status-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.5);
  pointer-events: none;
}
.status-text {
  padding: 8px 16px;
  background-color: rgba(0, 0, 0, 0.7);
  border-radius: 5px;
  font-size: 16px;
  text-align: center;
}
</style>
