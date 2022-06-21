<template>
  <div class="d-flex flex-column h-100vh p-30">
    <ElCard class="flex-grow-1">
      <div class="p-relative w-100 h-100" style="transform: scale(1, -1)" ref="$canvas">
        <svg class="p-absolute" style="top: -2px; width: 100%; height: 2px" viewBox="0 0 100 2" preserveAspectRatio="none">
          <line x1="0" y1="0" x2="100" y2="0" stroke="#aaaaaa" stroke-width="4"></line>
        </svg>
        <svg class="p-absolute" style="left: -2px; width: 2px; height: 100%" viewBox="0 0 2 100" preserveAspectRatio="none">
          <line x1="0" y1="0" x2="0" y2="100" stroke="#aaaaaa" stroke-width="4"></line>
        </svg>

        <canvas class="p-absolute left-0 top-0 w-100 h-100" ref="$wave" :width="width" :height="height"></canvas>
      </div>
    </ElCard>
    <div class="d-flex m-t-20">
      <ElCard class="flex-basis-0 flex-grow-1">
        <label class="cursor-pointer">
          <img style="width: 20px; height: 20px" src="@/images/upload.svg" />
          <input class="d-none" type="file" accept="audio/*" @change="handle_input_change" />
        </label>
        <ElSelect class="m-l-15" v-model="fftSize">
          <ElOption label="1024" :value="1024" />
          <ElOption label="512" :value="512" />
          <ElOption label="256" :value="256" />
          <ElOption label="128" :value="128" />
          <ElOption label="64" :value="64" />
        </ElSelect>
      </ElCard>
      <ElCard class="flex-basis-0 flex-grow-1 m-l-20">
        <div class="cursor-pointer opacity-5 pointer-events-none" :class="{ active: ready }" @click="handle_play_click">
          <img v-if="play" style="width: 20px; height: 20px" src="./images/pause.svg" />
          <img v-else style="width: 20px; height: 20px" src="./images/play.svg" />
        </div>
        <img
          class="m-l-15 cursor-pointer opacity-5 pointer-events-none"
          :class="{ active: ready }"
          style="width: 20px; height: 20px"
          src="@/images/previous.svg"
          @click="handle_rollback_click"
        />
        <svg
          class="m-l-15 cursor-pointer opacity-5 pointer-events-none"
          :class="{ active: ready }"
          style="height: 20px"
          :style="{ width: `${slideLength + 10}px` }"
          ref="$slide"
          :viewBox="`0 -10 ${slideLength + 10} 20`"
          @click="handle_slide_click"
        >
          <line x1="0" y1="0" :x2="slideLength" y2="0" stroke="black"></line>
          <rect :x="progress * slideLength" y="-6" width="4" height="12"></rect>
        </svg>
      </ElCard>
      <ElCard class="flex-basis-0 flex-grow-1 m-l-20"> </ElCard>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted, watch } from 'vue'
  import { useElementSize, useMouseInElement } from '@vueuse/core'
  import { ElCard, ElSelect, ElOption } from 'element-plus'

  const columnGap = 2
  const slideLength = 300

  const $canvas = ref<HTMLCanvasElement | undefined>()
  const { width = ref(0), height = ref(0) } = useElementSize($canvas)
  const $wave = ref<HTMLCanvasElement | undefined>()
  const $slide = ref<SVGSVGElement | undefined>()
  const { elementX: slideX } = useMouseInElement($slide)
  const fftSize = ref(1024)
  const ready = ref(false)
  const play = ref(false)
  const progress = ref(0)
  let $waveContext: CanvasRenderingContext2D | undefined
  let audio = new Audio()
  let context = new AudioContext()
  let analyzer: AnalyserNode | undefined
  let buffer = new Uint8Array(fftSize.value)
  let data: number[] = []

  audio.loop = true
  audio.addEventListener('canplay', () => {
    ready.value = true
    context.resume()
  })
  audio.addEventListener('timeupdate', () => {
    progress.value = audio.currentTime / audio.duration
  })
  analyzer = context.createAnalyser()
  analyzer.fftSize = fftSize.value
  context.createMediaElementSource(audio).connect(analyzer)
  analyzer.connect(context.destination)

  watch(fftSize, value => {
    buffer = new Uint8Array(value)
  })
  onMounted(() => {
    $waveContext = $wave.value?.getContext('2d')!
  })

  /**
   * 处理输入变更
   * @param ev 事件
   */
  async function handle_input_change(ev: Event) {
    let file = (ev.target as HTMLInputElement).files?.[0]
    let fileReader = new FileReader()
    let base64 = await new Promise<string>(resolve => {
      fileReader.onload = () => resolve(fileReader.result as string)
      if (file) {
        fileReader.readAsDataURL(file)
      }
    })

    audio.src = base64
  }
  /**
   * 处理播放点击
   */
  function handle_play_click() {
    play.value = !play.value

    if (play.value) {
      audio.play()
      animate()
    } else {
      audio.pause()
    }
  }
  /**
   * 处理回退点击
   */
  function handle_rollback_click() {
    audio.currentTime = 0
  }
  /**
   * 处理滑块点击
   */
  function handle_slide_click() {
    let rate = Math.min(Math.max(slideX.value / slideLength, 0), 1)
    audio.currentTime = audio.duration * rate
  }

  /**
   * 动画
   */
  function animate() {
    let callback = () => {
      if (play.value) {
        if (analyzer) {
          analyzer.getByteFrequencyData(buffer)
          data = Array.from(buffer).map(a => a / 255)
        }

        drawWave()

        requestAnimationFrame(callback)
      }
    }

    window.requestAnimationFrame(callback)
  }
  /**
   * 画波形
   */
  function drawWave() {
    if ($waveContext) {
      let length = data.length
      let dw = Math.max(Math.floor(width.value / length), 1)

      $waveContext.clearRect(0, 0, width.value, height.value)
      $waveContext.fillStyle = '#409EFF'

      for (let i = 0; i < data.length; i++) {
        $waveContext.fillRect((dw + columnGap) * i, 0, dw, height.value * data[i])
      }
    }
  }
</script>

<style scoped lang="scss">
  .active {
    opacity: 1;
    pointer-events: all;
  }

  :deep(.el-card__body) {
    height: 100%;
    display: flex;
    align-items: center;
  }
</style>
