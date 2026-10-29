<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({ group: { type: Object, required: true }, api: { type: Function, required: true }, download: { type: Function, required: true } })
const selected = ref(0)
const parameters = ref('{\n  "current": 1,\n  "pageSize": 25\n}')
const pathValue = ref('')
const uploadFile = ref(null)
const busy = ref(false)
const error = ref('')
const result = ref(null)
const resultTime = ref('')
const endpoint = computed(() => props.group.endpoints[selected.value] || props.group.endpoints[0])
const rows = computed(() => Array.isArray(result.value) ? result.value : (Array.isArray(result.value?.data) ? result.value.data : null))
const columns = computed(() => {
  if (!rows.value?.length) return []
  return Object.keys(rows.value[0] || {}).slice(0, 9)
})
function selectEndpoint(index) {
  selected.value = index
  result.value = null
  error.value = ''
  uploadFile.value = null
  parameters.value = ['user/fetch', 'order/fetch', 'ticket/fetch', 'coupon/fetch'].includes(props.group.endpoints[index].path)
    ? '{\n  \"current\": 1,\n  \"pageSize\": 25\n}'
    : '{}'
}
function queryString(values) {
  const query = new URLSearchParams()
  const append = (key, value) => {
    if (Array.isArray(value)) value.forEach((item, index) => append(`${key}[${index}]`, item))
    else if (value && typeof value === 'object') Object.entries(value).forEach(([child, item]) => append(`${key}[${child}]`, item))
    else if (value !== undefined && value !== null) query.append(key, String(value))
  }
  Object.entries(values).forEach(([key, value]) => append(key, value))
  return query.toString()
}
function compact(value) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
watch(() => props.group.id, () => {
  selected.value = 0
  result.value = null
  error.value = ''
  parameters.value = '{}'
  pathValue.value = ''
})
async function execute() {
  if (endpoint.value.path === 'user/setInviteUser' || endpoint.value.path === 'notice/update' || endpoint.value.path === 'stat/getRanking') {
    error.value = `当前 Xboard 后端声明了此路由，但控制器方法不存在：${endpoint.value.path}`
    result.value = null
    return
  }
  busy.value = true
  error.value = ''
  try {
    const params = parameters.value.trim() ? JSON.parse(parameters.value) : {}
    if (endpoint.value.path.includes('{userId}') && !pathValue.value.trim()) throw new Error('请填写路径参数中的用户 ID。')
    const path = endpoint.value.path.replace('{userId}', encodeURIComponent(pathValue.value.trim()))
    let payload
    if (['theme/upload', 'plugin/upload'].includes(path)) {
      if (!uploadFile.value) throw new Error('请选择 ZIP 文件（最大 10 MB）。')
      const form = new FormData()
      form.append('file', uploadFile.value)
      payload = await props.api(path, { method: 'POST', body: form })
    } else if (['user/dumpCSV', 'gift-card/export-codes'].includes(path)) {
      if (endpoint.value.method === 'GET') {
        const query = queryString(params)
        await props.download(`${path}${query ? `?${query}` : ''}`)
      } else await props.download(path, { method: 'POST', body: params })
      payload = { message: '文件已开始下载。' }
    } else if (endpoint.value.method === 'GET') {
      const query = queryString(params)
      payload = await props.api(`${path}${query ? `?${query}` : ''}`)
    } else {
      payload = await props.api(path, { method: 'POST', body: params })
    }
    result.value = payload
    resultTime.value = new Date().toLocaleTimeString('zh-CN')
  } catch (cause) {
    error.value = cause instanceof SyntaxError ? `参数不是有效 JSON：${cause.message}` : cause.message
    result.value = null
  } finally { busy.value = false }
}
function submit() {
  if (endpoint.value.risk && !window.confirm(`即将调用“${endpoint.value.title}”接口。请确认参数无误，此操作可能修改 Xboard 数据。`)) return
  execute()
}
</script>

<template>
  <section class="workbench-view">
    <div class="page-title-row"><div><p class="eyebrow">{{ group.section.toUpperCase() }} / API WORKSPACE</p><h1>{{ group.title }}<span class="title-period">.</span></h1><p class="page-subtitle">接口依据当前 Xboard 管理路由；读写请求直接发送至已配置实例。</p></div><span class="endpoint-count">{{ group.endpoints.length }} 个接口</span></div>
    <div class="workbench-grid">
      <aside class="endpoint-panel"><div class="endpoint-heading"><span>接口目录</span><span>V2</span></div><button v-for="(item,index) in group.endpoints" :key="`${item.path}-${index}`" class="endpoint-item" :class="{ chosen: index === selected }" @click="selectEndpoint(index)"><span class="method-badge" :class="item.method.toLowerCase()">{{ item.method }}</span><span>{{ item.title }}</span><span v-if="item.risk" class="risk-dot" title="写操作"></span></button></aside>
      <div class="request-result">
        <section class="request-card"><div class="request-title"><div><p class="eyebrow">REQUEST / {{ endpoint.method }}</p><h2>{{ endpoint.title }}</h2></div><button class="run-button" :disabled="busy" @click="submit">{{ busy ? '请求中…' : '发送请求' }} <span>→</span></button></div><div class="endpoint-url"><span class="method-badge" :class="endpoint.method.toLowerCase()">{{ endpoint.method }}</span><code>/api/v2/{管理员路径}/{{ endpoint.path }}</code></div><label v-if="endpoint.path.includes('{userId}')" class="path-input">路径参数 <input v-model="pathValue" placeholder="输入用户 ID" /></label><label v-if="endpoint.path === 'theme/upload' || endpoint.path === 'plugin/upload'" class="path-input file-input">ZIP 文件 <input type="file" accept=".zip,application/zip" @change="uploadFile = $event.target.files?.[0] || null" /></label><label class="json-label">{{ endpoint.method === 'GET' ? '查询参数' : '请求体' }} <span>JSON</span></label><textarea v-model="parameters" spellcheck="false" aria-label="JSON 参数"></textarea><p class="request-hint">{{ endpoint.risk ? '写操作会弹出二次确认。请按 Xboard 接口格式填写 JSON 参数。' : 'GET 接口只读取数据；分页或筛选参数可在此编辑。' }}</p><div v-if="error" class="request-error">{{ error }}</div></section>
        <section class="response-card"><div class="response-heading"><div><p class="eyebrow">RESPONSE</p><h2>响应数据</h2></div><span v-if="resultTime" class="response-time">{{ resultTime }}</span></div><div v-if="result === null && !error" class="response-empty"><span>↳</span><p>选择接口并发送请求，响应内容会显示在这里。</p></div><div v-else-if="rows" class="result-table-wrap"><table class="result-table"><thead><tr><th v-for="column in columns" :key="column">{{ column }}</th></tr></thead><tbody><tr v-for="(row,index) in rows.slice(0,100)" :key="row.id ?? index"><td v-for="column in columns" :key="column" :title="compact(row[column])">{{ compact(row[column]) }}</td></tr></tbody></table><p v-if="rows.length > 100" class="response-more">显示前 100 条，共 {{ rows.length }} 条</p><p v-else-if="!rows.length" class="response-empty">返回空列表。</p></div><pre v-else class="response-json">{{ JSON.stringify(result, null, 2) }}</pre></section>
      </div>
    </div>
  </section>
</template>
