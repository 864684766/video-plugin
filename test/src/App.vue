<script setup lang="ts">
// import zyFlvVideoView from "../../core/src/components/flv_video/index.vue";
// import zyWebRtcVideoView from "../../core/src/components/webrtc_video/index.vue";
import { ref } from "vue";
import { zyFlvVideoView, zyWebRtcVideoView } from "zy-video-view";
const flvVidevUrl = ref("http://localhost:7634/live/0501769230.flv");
const webRtcVideoUrl = ref(
  "http://localhost:1985/rtc/v1/whep/?app=live&stream=0499961776"
);
</script>

<template>
  <div>
    我是测试项目，我要测试video-view插件
    <div style="width: 600px; height: 600px">
      <zyFlvVideoView
        :cors="true"
        :videoUrl="flvVidevUrl"
        :actionButton="true"
        :videoType="'flv'"
      />
    </div>

    我还想测试一下webRtcVideo组件
    <div style="width: 600px; height: 600px">
      <zyWebRtcVideoView
        :url="webRtcVideoUrl"
        :reconnectInterval="5000"
        :controls="true"
      />
    </div>
    <div style="width: 600px; height: 600px; margin-top: 20px">
      <zyFlvVideoView
        :cors="true"
        :isLive="false"
        :videoUrl="'https://media.w3.org/2010/05/sintel/trailer.mp4'"
        :actionButton="true"
        :videoRecord="true"
        :autoplay="false"
        :loop="false"
        :hasAudio="true"
        :videoType="'mp4'"
      />
    </div>

    <!-- <zyVideoView
      :isLive="false"
      :videoUrl="'https://media.w3.org/2010/05/sintel/trailer.mp4'"
      :videoType="'mp4'"
    /> -->
  </div>
</template>

<style scoped></style>
