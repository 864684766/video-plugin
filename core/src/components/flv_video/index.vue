<script setup lang="ts">
import { IFlvVideoProps } from "./type";
import Mpegts from "mpegts.js";
import { ref, onUnmounted, nextTick, watch, onMounted } from "vue";
defineOptions({
  name: "zy-video-view",
});

// const emits = defineEmits<{
//   (event: "summitMouseEnter", id: number,name:string): void;
// }>();

// 添加 props 的默认值
const props = withDefaults(
  defineProps<IFlvVideoProps & { objectFit?: string }>(),
  {
    actionButton: true,
    cors: false,
    hasAudio: false,
    isLive: true,
    videoType: "flv",
    videoUrl: "",
    videoClass: "",
    videoRecord: false,
    autoplay: true,
    loop: true,
    max_count: 30,
    muted: true,
    objectFit: "fill",
  }
);

let MPEGTSPlayer: Mpegts.Player | null = null;
const startVisible = ref(false);
const count = ref(0);
const intervalId = ref<NodeJS.Timeout | null>(null);
const videoRef = ref<HTMLVideoElement | null>(null);

const option = {
  lastDecodeFrame: 0, // 上一次解码帧
  count: 0, // 重连次数
};

const handleMouseEnter = (e: MouseEvent) => {
  // emits("summitMouseEnter", 1,'123');
};
const handleMouseLeave = () => {};

/**
 * @description 关闭监听、停止播放、断流、销毁
 * */
const destroyVideo = () => {
  if (MPEGTSPlayer) {
    // 日志添加
    console.log(`[zy-video-view] 已销毁播放器实例，流地址：${props.videoUrl}`);
    MPEGTSPlayer.destroy();
    MPEGTSPlayer = null;
  }
};

/**
 * @description 实时监听播放异常
 * @param type 错误类型
 * @param details 错误详情
 * */
const listenerError = (type: string, details: any) => {
  // 日志添加 - 记录所有发生的错误
  let errMsg = "";
  let solution = "";
  switch (type) {
    case Mpegts.ErrorTypes.NETWORK_ERROR:
      errMsg = `网络错误，无法连接到视频流（${props.videoUrl}）。`;
      solution =
        "常见原因：\n1. 视频流服务未启动或地址错误。\n2. 网络不通或被防火墙拦截。\n3. 服务器不支持 FLV 协议。\n排查建议：\n- 检查视频流地址和网络连通性。\n- 联系服务端管理员确认接口可用。";
      console.error(
        `[zy-video-view] 网络异常，尝试重连。流地址：${props.videoUrl}`
      );
      reconnect();
      break;
    case Mpegts.ErrorTypes.MEDIA_ERROR:
      errMsg = `媒体错误，视频流可能损坏或格式不受支持（${props.videoUrl}）。`;
      solution =
        "常见原因：\n1. 视频流本身异常或损坏。\n2. 编码格式不兼容。\n排查建议：\n- 检查推流端是否正常。\n- 尝试更换浏览器或升级 mpegts.js 版本。";
      console.error(
        `[zy-video-view] 媒体错误，视频流可能损坏，尝试重连。流地址：${props.videoUrl}`
      );
      reconnect();
      break;
    case Mpegts.ErrorTypes.OTHER_ERROR:
      errMsg = `未知错误，流地址：${props.videoUrl}`;
      solution =
        "常见原因：\n1. 服务器异常。\n2. 浏览器兼容性问题。\n排查建议：\n- 检查服务端日志。\n- 尝试更换浏览器。";
      console.error(`[zy-video-view] 发生其他错误。流地址：${props.videoUrl}`);
      break;
    default:
      errMsg = `未知错误类型：${type}，流地址：${props.videoUrl}`;
      solution = "请联系开发者进一步排查。";
      break;
  }
  // 控制台输出详细错误
  if (errMsg) {
    console.error(`[zy-video-view] 播放失败：${errMsg}\n详细信息：`, details);
    throw new Error(`播放失败：${errMsg}\n${solution}`);
  }
};

/**
 * @description 监听加载事件,此方法暂时没生效
 * */
const listenerLoading = () => {
  // 日志添加
  console.log(`[zy-video-view] 视频加载完成，流地址：${props.videoUrl}`);
};

/**
 * 添加重连函数
 */
const reconnect = () => {
  // 日志添加
  console.warn(`[zy-video-view] 执行重连，流地址：${props.videoUrl}`);
  destroyVideo(); // 销毁当前播放器
  option.lastDecodeFrame = 0; // 重置解码帧数
  if (videoRef.value) {
    createPlayer(videoRef.value); // 重新创建播放器
  } else {
    // 日志添加
    console.error(`[zy-video-view] 重连失败：videoRef 不可用。`);
  }
};

/**
 *  视频流统计信息，用于检测断流
 *
 * @param e
 */
const statisticsHandle = (e: { decodedFrames: number }) => {
  // 不是循环播放就不再判断是否断开连接，然后重连
  if (!props.loop) {
    return;
  }
  // 如果是第一次接收到解码帧，初始化 lastDecodeFrame
  if (option.lastDecodeFrame === 0) {
    option.lastDecodeFrame = e.decodedFrames;
    return;
  }

  // 检查当前解码帧数是否与上一次相同
  if (option.lastDecodeFrame === e.decodedFrames) {
    // 如果相同，增加计数器
    option.count++;
    // 日志添加 - 警告信息，表明视频可能卡顿
    if (option.count === 1) {
      // 只在第一次检测到时打印，避免刷屏
      console.warn(
        `[zy-video-view] 检测到视频流卡顿，解码帧未更新，流地址：${props.videoUrl}`
      );
    }

    // 检查是否超过最大重试次数
    if (option.count > props.max_count) {
      // 日志添加 - 错误信息，表明即将强制重连
      console.error(
        `[zy-video-view] 达到最大卡顿重试次数(${props.max_count})，强制重连，流地址：${props.videoUrl}`
      );
      reconnect(); // 尝试重连
      option.count = 0; // 重置计数器
    }
  } else {
    // 如果解码帧数不同，说明视频流正常，重置计数器
    if (option.count > 0) {
      // 日志添加 - 恢复信息
      console.log(`[zy-video-view] 视频流恢复正常，流地址：${props.videoUrl}`);
    }
    option.lastDecodeFrame = e.decodedFrames; // 更新解码帧数
    option.count = 0; // 重置计数器
  }
};

/**
 * @description 加载视频并且播放
 * @param video 需要加载的视频
 * */
const loadPlay = (video: typeof MPEGTSPlayer) => {
  if (video) {
    // 日志添加
    console.log(`[zy-video-view] 加载并播放视频，流地址：${props.videoUrl}`);
    // 加载视频
    video.load();
    if (props.autoplay) {
      // 播放视频
      video.play();
    }
    // 添加媒体监听 1.监听视频错误 2.监听视频加载 3.监听统计信息
    video.on(Mpegts.Events.ERROR, (type, details) =>
      listenerError(type, details)
    ); // 传递所有参数
    video.on(Mpegts.Events.LOADING_COMPLETE, listenerLoading);
    video.on(Mpegts.Events.STATISTICS_INFO, statisticsHandle);
  }
};

/**
 * @description 创建播放器
 * @param videoElement 播放器媒体标签
 * */
const createPlayer = (videoElement: HTMLVideoElement) => {
  const mediaDataSource = {
    cors: props.cors,
    hasAudio: props.hasAudio,
    isLive: props.isLive,
    type: props.videoType,
    url: props.videoUrl,
  };
  // 日志添加
  console.log(`[zy-video-view] 创建 mpegts.js 播放器，配置如下:`, {
    mediaDataSource,
  });

  MPEGTSPlayer = Mpegts.createPlayer(mediaDataSource, {
    liveBufferLatencyMinRemain: 0.2,
    autoCleanupMaxBackwardDuration: 60,
    autoCleanupMinBackwardDuration: 30,
    autoCleanupSourceBuffer: true,
    deferLoadAfterSourceOpen: false,
    enableStashBuffer: false,
    enableWorker: true,
    lazyLoad: false,
    lazyLoadMaxDuration: 0.2,
    liveBufferLatencyChasing: true,
    liveBufferLatencyMaxLatency: 0.9,
    reuseRedirectedURL: true,
    stashInitialSize: 128,
  });
  MPEGTSPlayer.attachMediaElement(videoElement);
  loadPlay(MPEGTSPlayer);
};

/**
 * 初始化播放器
 */
const initPlayer = () => {
  // 日志添加
  console.log(`[zy-video-view] 初始化播放器，流地址：${props.videoUrl}`);
  destroyVideo();
  nextTick(() => {
    if (props.videoUrl && videoRef.value) {
      createPlayer(videoRef.value);
    } else {
      // 日志添加
      console.warn(
        `[zy-video-view] 取消播放器初始化，原因：videoUrl 为空或 videoRef 未就绪。`
      );
    }
  });
};

/**
 *录制倒计时
 */
const startCountdown = () => {
  if (intervalId.value) return;
  intervalId.value = setInterval(() => {
    count.value += 1;
    if (count.value >= 60) {
      closeRecord();
    }
  }, 1000);
};

/**
 * 开始录制
 * */
const openRecord = () => {
  count.value = 0;
  startVisible.value = true;
  startCountdown();
};
/**
 * 结束录制
 * */
const closeRecord = () => {
  startVisible.value = false;
  intervalId.value && clearInterval(intervalId.value);
  intervalId.value = null;
};

watch(
  () => props.videoUrl,
  () => {
    if (!props.videoUrl) {
      // 日志添加
      console.warn(`[zy-video-view] videoUrl 属性变为空，销毁播放器。`);
      destroyVideo();
      return;
    }
    // 日志添加
    console.log(
      `[zy-video-view] videoUrl 属性变更，新地址：${props.videoUrl}，重新初始化播放器。`
    );
    initPlayer();
  },
  {
    deep: true,
  }
);

onMounted(() => {
  if (props.videoUrl) {
    initPlayer();
  }
});

onUnmounted(() => {
  // 日志添加
  console.log(`[zy-video-view] 组件卸载，清理资源。`);
  destroyVideo(); // 确保组件卸载时销毁播放器
  if (intervalId.value) {
    clearInterval(intervalId.value);
  }
});
</script>

<template>
  <div class="zy-video-view">
    <video
      :style="`object-fit: ${props.objectFit}`"
      :autoplay="props.autoplay"
      :loop="props.loop"
      :controls="props.actionButton"
      :class="props.videoClass"
      :muted="props.muted"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
      ref="videoRef"
      class="video-element"
    ></video>

    <div class="video-record-panel" v-if="props.videoRecord">
      <div class="video-record-toolbar">
        <span v-if="!startVisible" class="open-record" @click="openRecord">
          开启
        </span>
        <span v-else class="close-record" @click="closeRecord"> 停止 </span>
      </div>
      <span v-if="startVisible" class="recoding">
        正在录制{{ count }}s...
      </span>
    </div>
  </div>
</template>

<style lang="css" scoped>
.zy-video-view {
  width: 100%;
  height: 100%;
}
.video-element {
  width: 100%;
  height: 100%;
}
</style>
