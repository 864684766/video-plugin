<script setup lang="ts">
// import zyFlvVideoView from "../../core/src/components/flv_video/index.vue";
// import zyWebRtcVideoView from "../../core/src/components/webrtc_video/index.vue";
import { ref } from "vue";
import { zyFlvVideoView, zyWebRtcVideoView } from "zy-video-view";
const flvVidevUrl = ref([
  "http://XXXXXXXXX/live/0927022847.flv",
  "http://XXXXXXXXX/live/0695427082.flv",
]);
const webRtcVideoUrlList = ref([
  "http://XXXXXXXXXXXXX/rtc/v1/whep/?app=live&stream=0927022847",
  "http://XXXXXXXXXXXX/rtc/v1/whep/?app=live&stream=0695427082",
  // "http://36.138.75.71:1985/rtc/v1/whep/?app=live&stream=0094621816",
]);
</script>

<template>
  我是测试项目，我要测试video-view插件
  <div style="display: flex; flex-wrap: wrap">
    <div
      v-for="video_item in flvVidevUrl"
      style="width: 600px; height: 300px; margin-left: 10px; margin-top: 10px"
    >
      <zyFlvVideoView
        :cors="true"
        :videoUrl="video_item"
        :actionButton="true"
        :videoType="'flv'"
      />
    </div>
  </div>

  <br />
  我还想测试一下webRtcVideo组件
  <div style="display: flex; flex-wrap: wrap">
    <!-- <div
      v-for="video_item in webRtcVideoUrlList"
      style="width: 600px; height: 300px; margin-left: 10px; margin-top: 10px"
    >
      <zyWebRtcVideoView
        :url="video_item"
        :reconnectInterval="5000"
        :controls="true"
        :stallTimeout="30000"
      />
    </div> -->
    <!-- <div style="width: 600px; height: 600px; margin-top: 20px">
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
    </div> -->

    <!-- <zyVideoView
      :isLive="false"
      :videoUrl="'https://media.w3.org/2010/05/sintel/trailer.mp4'"
      :videoType="'mp4'"
    /> -->
  </div>
</template>

<style scoped></style>
