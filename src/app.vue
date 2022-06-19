<template>
  <div class="d-flex flex-column h-100vh p-30">
    <ElCard>
      <div class="flex-grow-1 p-relative w-100" style="height: 70vh; transform: scale(1, -1)" ref="$canvas">
        <canvas class="p-absolute left-0 top-0 w-100 h-100" ref="$wave" :width="width" :height="height"></canvas>
      </div>
    </ElCard>
    <div class="d-flex m-t-20">
      <ElCard class="flex-basis-0 flex-grow-1">
        <div class="d-flex align-items-center">
          <label class="cursor-pointer">
            <img style="width: 20px; height: 20px" src="@/images/upload.svg" />
            <input class="d-none" type="file" accept="audio/*" @change="handle_input_change" />
          </label>
          <div class="m-l-20 cursor-pointer opacity-5 pointer-events-none" :class="{ active: audio }" @click="handle_play_click">
            <img v-if="play" style="width: 20px; height: 20px" src="./images/pause.svg" />
            <img v-else style="width: 20px; height: 20px" src="./images/play.svg" />
          </div>
        </div>
        <ElFormItem class="m-t-10" label="FFT长度">
          <ElSelect v-model="fftSize" placeholder="FFT长度">
            <ElOption label="1024" :value="1024" />
            <ElOption label="512" :value="512" />
            <ElOption label="256" :value="256" />
            <ElOption label="128" :value="128" />
            <ElOption label="64" :value="64" />
          </ElSelect>
        </ElFormItem>
      </ElCard>
      <ElCard class="flex-basis-0 flex-grow-1 m-l-20"> </ElCard>
      <ElCard class="flex-basis-0 flex-grow-1 m-l-20"> </ElCard>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted, watch } from 'vue'
  import { useElementSize } from '@vueuse/core'
  import { ElCard, ElFormItem, ElSelect, ElOption } from 'element-plus'

  const gap = 2

  const $canvas = ref<HTMLCanvasElement | undefined>()
  const { width = ref(0), height = ref(0) } = useElementSize($canvas)
  const $wave = ref<HTMLCanvasElement | undefined>()
  const fftSize = ref(1024)
  const play = ref(false)
  const audio = ref<HTMLAudioElement | undefined>()
  const data = ref<number[]>([])
  let $waveContext: CanvasRenderingContext2D | undefined
  let analyzer: AnalyserNode | undefined
  let buffer = new Uint8Array(fftSize.value)

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

    let context = new AudioContext()
    audio.value = new Audio(base64)
    let source = context.createMediaElementSource(audio.value)
    analyzer = context.createAnalyser()
    analyzer.fftSize = fftSize.value
    source.connect(analyzer)
    analyzer.connect(context.destination)

    context.resume()
  }
  /**
   * 处理播放点击
   */
  function handle_play_click() {
    play.value = !play.value

    if (play.value) {
      audio.value?.play()
      animate()
    } else {
      audio.value?.pause()
    }
  }

  /**
   * 动画
   */
  function animate() {
    let callback = () => {
      if (play.value) {
        if (analyzer) {
          analyzer.getByteFrequencyData(buffer)
          data.value = Array.from(buffer).map(a => a / 255)
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
      let length = data.value.length
      let dw = Math.max(Math.floor(width.value / length), 1)

      $waveContext.clearRect(0, 0, width.value, height.value)
      $waveContext.fillStyle = '#409EFF'

      for (let i = 0; i < data.value.length; i++) {
        $waveContext.fillRect((dw + gap) * i, 0, dw, height.value * data.value[i])
      }
    }
  }
</script>

<style scoped>
  .active {
    opacity: 1;
    pointer-events: all;
  }
</style>
