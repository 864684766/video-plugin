<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import { IWebRtcPlayerProps } from "./type";

// --- 组件定义 ---
defineOptions({
  name: "zy-webrtc-player",
});

const props = withDefaults(defineProps<IWebRtcPlayerProps>(), {
  autoplay: true,
  muted: true,
  controls: false,
  enableReconnect: true,
  maxReconnectAttempts: 5,
  reconnectInterval: 2000,
  stallTimeout: 5000,
});

const LOG_PREFIX = "[zy-webrtc-player]";

// --- DOM 引用 ---
const videoRef = ref<HTMLVideoElement | null>(null);

// --- 状态与资源管理 ---
const statusText = ref("等待初始化...");
const isShowingStatus = ref(true);
const peerConnection = ref<RTCPeerConnection | null>(null);
const whepSessionUrl = ref<string | null>(null);

const hasStopped = ref(false);

// --- 重连与卡顿检测状态 ---
const reconnectTimer = ref<NodeJS.Timeout | null>(null);
const reconnectAttempts = ref(0);
const stallDetectorTimer = ref<NodeJS.Timeout | null>(null);
let lastVideoTime = -1;

/**
 * @description 彻底清理资源，在开始播放前或组件卸载时调用
 * // <<< 变化点：移除了所有 statusText 的设置，让函数职责更单一 >>>
 */
const cleanup = async () => {
  console.log(`${LOG_PREFIX} Cleaning up resources...`);

  if (reconnectTimer.value) clearTimeout(reconnectTimer.value);
  if (stallDetectorTimer.value) clearTimeout(stallDetectorTimer.value);
  reconnectTimer.value = null;
  stallDetectorTimer.value = null;

  if (peerConnection.value) {
    peerConnection.value.onconnectionstatechange = null;
    peerConnection.value.ontrack = null;
    peerConnection.value.onicegatheringstatechange = null;
    peerConnection.value.close();
    peerConnection.value = null;
  }

  if (whepSessionUrl.value) {
    try {
      await fetch(whepSessionUrl.value, { method: "DELETE" });
      console.log(`${LOG_PREFIX} WHEP session terminated successfully.`);
    } catch (e) {
      console.warn(
        `${LOG_PREFIX} Failed to terminate WHEP session, it might have already expired.`,
        e
      );
    }
    whepSessionUrl.value = null;
  }

  if (videoRef.value) {
    videoRef.value.srcObject = null;
  }

  // lastVideoTime 应该在这里重置，因为它与播放会话紧密相关
  lastVideoTime = -1;
};

/**
 * @description 视频卡顿/断流检测器
 */
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
      console.warn(
        `${LOG_PREFIX} Stream stalled (video time not updating). Triggering reconnect.`
      );
      statusText.value = "视频流卡顿，正在重连...";
      isShowingStatus.value = true;
      handleReconnect();
    } else {
      lastVideoTime = currentTime;
      startStallDetector();
    }
  }, props.stallTimeout);
};

/**
 * @description 处理重连逻辑
 */
const handleReconnect = () => {
  if (hasStopped.value) {
    return;
  }

  isShowingStatus.value = true;

  if (reconnectAttempts.value >= props.maxReconnectAttempts) {
    console.error(
      `${LOG_PREFIX} Max reconnect attempts reached. Stopping permanently.`
    );
    statusText.value = "连接失败，请检查网络后刷新重试。";
    hasStopped.value = true;
    if (reconnectTimer.value) clearTimeout(reconnectTimer.value);
    if (stallDetectorTimer.value) clearTimeout(stallDetectorTimer.value);
    return;
  }

  reconnectAttempts.value++;
  const delay =
    props.reconnectInterval * Math.pow(2, reconnectAttempts.value - 1);

  // <<< 变化点：现在这个状态文本可以正确地显示了 >>>
  statusText.value = `连接中断，${delay / 1000}s 后尝试第 ${
    reconnectAttempts.value
  } 次重连...`;

  cleanup().then(() => {
    if (hasStopped.value) return;
    // <<< 变化点：调用 _executePlay 而不是 startPlay，以避免重置计数器 >>>
    reconnectTimer.value = setTimeout(_executePlay, delay);
  });
};

/**
 * @description 内部函数：执行一次播放尝试（不重置状态）
 * // <<< 变化点：这是从原 startPlay 拆分出来的核心逻辑 >>>
 */
const _executePlay = async () => {
  if (!props.url) {
    statusText.value = "错误：未提供视频流地址";
    isShowingStatus.value = true;
    return;
  }

  // 清理上一次的连接，但不重置状态
  await cleanup();

  // 仅在首次尝试时显示“正在初始化”，重连时由 handleReconnect 控制状态文本
  if (reconnectAttempts.value === 0) {
    statusText.value = "正在初始化...";
  }
  isShowingStatus.value = true;

  try {
    const pc = new RTCPeerConnection();
    peerConnection.value = pc;

    const iceGatheringPromise = new Promise<void>((resolve) => {
      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === "complete") {
          resolve();
        }
      };
    });

    pc.ontrack = (event) => {
      if (videoRef.value) {
        if (!videoRef.value.srcObject) {
          videoRef.value.srcObject = new MediaStream();
        }
        (videoRef.value.srcObject as MediaStream).addTrack(event.track);

        videoRef.value.onplaying = () => {
          console.log(`${LOG_PREFIX} Video is playing.`);
          statusText.value = "正在播放";
          isShowingStatus.value = false;
          // <<< 变化点：播放成功后，才重置重连次数 >>>
          reconnectAttempts.value = 0;
          startStallDetector();
        };
      }
    };

    pc.onconnectionstatechange = () => {
      if (!pc || hasStopped.value) return;

      statusText.value = `连接状态: ${pc.connectionState}`;
      switch (pc.connectionState) {
        case "connected":
          statusText.value = "已连接，等待媒体数据...";
          break;
        case "disconnected":
        case "failed":
        case "closed":
          // 断开连接时，如果允许重连，则触发
          if (props.enableReconnect) {
            handleReconnect();
          }
          break;
      }
    };

    pc.addTransceiver("video", { direction: "recvonly" });
    pc.addTransceiver("audio", { direction: "recvonly" });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await iceGatheringPromise;
    statusText.value = "正在协商媒体流...";

    const response = await fetch(props.url, {
      method: "POST",
      headers: { "Content-Type": "application/sdp" },
      body: pc.localDescription?.sdp,
    });

    if (!response.ok || response.status !== 201) {
      throw new Error(`WHEP 请求失败，状态码: ${response.status}`);
    }

    const answerSdp = await response.text();
    const location = response.headers.get("Location");
    if (!location) {
      throw new Error("WHEP 响应中未找到 Location 头。");
    }
    whepSessionUrl.value = new URL(location, props.url).href;

    await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
  } catch (error) {
    if (hasStopped.value) return;
    console.error(`${LOG_PREFIX} 播放失败:`, error);
    statusText.value = `播放失败: ${
      error instanceof Error ? error.message : String(error)
    }`;
    // 如果允许重连，则触发
    if (props.enableReconnect) {
      handleReconnect();
    } else {
      isShowingStatus.value = true;
    }
  }
};

/**
 * @description 核心功能：开始一次全新的播放。
 * // <<< 变化点：这是新的公共入口函数，负责重置状态 >>>
 */
const startPlay = async () => {
  console.log(`${LOG_PREFIX} Starting a new playback session.`);
  hasStopped.value = false;
  reconnectAttempts.value = 0; // 只在这里重置重连次数
  await _executePlay();
};

const stopPlay = () => {
  hasStopped.value = true;
  cleanup().then(() => {
    // <<< 变化点：在这里设置最终的停止状态 >>>
    statusText.value = "已停止";
    isShowingStatus.value = true;
  });
};

watch(
  () => props.url,
  (newUrl, oldUrl) => {
    if (newUrl && newUrl !== oldUrl) {
      startPlay();
    }
  }
);

onMounted(() => {
  if (props.autoplay) {
    startPlay();
  }
});

onUnmounted(() => {
  stopPlay(); // 使用 stopPlay 来确保状态一致性
});

defineExpose({
  startPlay,
  stopPlay,
});
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
  object-fit: contain;
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
