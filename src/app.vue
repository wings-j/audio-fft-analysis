<template>
  <div class="d-flex flex-column h-100vh">
    <div class="flex-grow-1 bg-black"></div>
    <div>
      <input type="file" accept="audio/*" @change="handle_input_change" />
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'

  const fftSize = 2048
  const play = ref(false)
  const data = ref<number[]>([])
  let analyzer: AnalyserNode | null = null
  let buffer = new Uint8Array()

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

    let audio = new Audio(base64)
    let context = new AudioContext()
    let source = context.createMediaElementSource(audio)
    analyzer = context.createAnalyser()
    analyzer.fftSize = fftSize
    source.connect(analyzer)
    analyzer.connect(context.destination)

    context.resume()
    audio.play()
  }
  /**
   * 处理播放点击
   */
  function handle_play_click() {
    play.value = !play.value
  }

  /**
   * 动画
   */
  function animate() {
    let callback = () => {
      if (play.value && analyzer) {
        analyzer.getByteFrequencyData(buffer)
        data.value = Array.from(buffer).map(a => a / 255)

        requestAnimationFrame(callback)
      }
    }

    window.requestAnimationFrame(callback)
  }
</script>
