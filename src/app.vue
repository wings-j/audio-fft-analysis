<template>
  <div class="d-flex flex-column h-100vh p-30">
    <ElCard class="flex-grow-1">
      <div class="p-relative w-100 h-100 p-20">
        <div class="p-relative w-100 h-100" style="transform: scale(1, -1)" ref="$canvas">
          <svg class="p-absolute" style="top: -2px; width: 100%; height: 2px" viewBox="0 0 100 2" preserveAspectRatio="none">
            <line x1="0" y1="0" x2="100" y2="0" stroke="#aaaaaa" stroke-width="4"></line>
          </svg>
          <svg class="p-absolute" style="left: -2px; width: 2px; height: 100%" viewBox="0 0 2 100" preserveAspectRatio="none">
            <line x1="0" y1="0" x2="0" y2="100" stroke="#aaaaaa" stroke-width="4"></line>
          </svg>
          <canvas class="p-absolute left-0 top-0 w-100 h-100" ref="$wave" :width="width" :height="height"></canvas>
        </div>
        <div class="overflow-hidden p-absolute w-100 f-12" style="left: 18px; bottom: -2px; height: 20px; line-height: 20px" :style="{ width: `${width}px` }">
          <div v-for="a of scales" :key="a" class="scale-x p-absolute p-l-5" :style="{ left: `${(columnWidth + columnGap) * (a / unitFrequency)}px` }">{{
            a
          }}</div>
        </div>
        <div class="p-absolute h-100 f-12" style="left: -2px; bottom: 18px; width: 20px; line-height: 20px">
          <div class="scale-y p-absolute w-100 p-l-5" style="bottom: -20px">0</div>
          <div class="scale-y p-absolute w-100 p-l-5" style="top: 38px">1</div>
        </div>
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
      <ElCard class="flex-basis-0 flex-grow-1 m-l-20">
        <div class="d-grid grid-template-columns-3 w-100">
          <div>平均：{{ statistics.mean.toFixed(2) }}</div>
          <div>最大：{{ statistics.max.toFixed(2) }}</div>
          <div>范围：{{ statistics.range[0].toFixed(0) }}-{{ statistics.range[1].toFixed(0) }}Hz</div>
        </div>
      </ElCard>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted, watch, reactive, computed } from 'vue'
  import { useElementSize, useMouseInElement } from '@vueuse/core'
  import { ElCard, ElSelect, ElOption } from 'element-plus'
  import { mean } from 'lodash-es'

  const columnGap = 1
  const slideLength = 300
  const maxFrequency = 22050 // TODO 舍弃频率，用索引取代
  const scales = Array(23)
    .fill(0)
    .map((a, i) => 1000 * i)
  const $canvas = ref<HTMLCanvasElement | undefined>()
  const { width = ref(0), height = ref(0) } = useElementSize($canvas)
  const $wave = ref<HTMLCanvasElement | undefined>()
  const $slide = ref<SVGSVGElement | undefined>()
  const { elementX: slideX } = useMouseInElement($slide)
  const fftSize = ref<64 | 128 | 256 | 512 | 1024>(1024)
  const ready = ref(false)
  const play = ref(false)
  const progress = ref(0)
  const statistics = reactive({
    mean: 0,
    max: 0,
    range: [0, 0] as [number, number]
  })
  const halfFftSize = computed(() => fftSize.value / 2)
  const unitFrequency = computed(() => maxFrequency / halfFftSize.value)
  const columnWidth = computed(() => Math.max(Math.floor(width.value / halfFftSize.value), 1))

  let $waveContext: CanvasRenderingContext2D | undefined
  let audio = new Audio()
  let context = new AudioContext()
  let analyzer = context.createAnalyser()
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
  analyzer.fftSize = fftSize.value
  context.createMediaElementSource(audio).connect(analyzer)
  analyzer.connect(context.destination)

  watch(fftSize, value => {
    analyzer.fftSize = fftSize.value
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
        calculate()
        drawWave()

        requestAnimationFrame(callback)
      }
    }

    window.requestAnimationFrame(callback)
  }
  /**
   * 计算
   */
  function calculate() {
    analyzer.getByteFrequencyData(buffer)
    data = Array.from(buffer.slice(0, halfFftSize.value)).map(a => a / 255)

    statistics.mean = mean(data)
    statistics.max = Math.max(...data)

    let i = 0
    let j = halfFftSize.value - 1
    while (i < j) {
      if (data[i] === 0) {
        i++
      }
      if (data[j] === 0) {
        j--
      }

      if (data[i] && data[j]) {
        break
      }
    }
    if (i >= j) {
      statistics.range = [0, 0]
    } else {
      statistics.range = [(i / halfFftSize.value) * maxFrequency, (j / halfFftSize.value) * maxFrequency]
    }
  }
  /**
   * 画波形
   */
  function drawWave() {
    if ($waveContext) {
      $waveContext.clearRect(0, 0, width.value, height.value)
      $waveContext.fillStyle = '#409EFF'

      for (let i = 0; i < data.length; i++) {
        $waveContext.fillRect((columnWidth.value + columnGap) * i, 0, columnWidth.value, height.value * data[i])
      }
    }
  }
</script>

<style scoped lang="scss">
  .active {
    opacity: 1;
    pointer-events: all;
  }
  .scale-x {
    border-left: 2px solid #aaa;
  }
  .scale-y {
    border-top: 2px solid #aaa;
  }

  :deep(.el-card__body) {
    height: 100%;
    display: flex;
    align-items: center;
  }
</style>
