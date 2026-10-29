<script setup>
import { onMounted, reactive, ref } from 'vue'

const props = defineProps({ api: { type: Function, required: true } })
const items = ref([])
const loading = ref(true)
const error = ref('')
const modal = ref(false)
const saving = ref(false)
const formError = ref('')
const form = reactive({ id: null, name: '', notes: '', is_active: true })
const detail = ref(null)
const detailTab = ref('overview')
const detailLoading = ref(false)
const nodes = ref([])
const history = ref([])
const nodesLoading = ref(false)
const historyLoading = ref(false)
const detailError = ref('')
const output = ref(null)
const outputTitle = ref('')
const outputKind = ref('token')

function parseLoad(value) {
  if (typeof value === 'string') {
    try { return JSON.parse(value) } catch { return null }
  }
  return value && typeof value === 'object' ? value : null
}
function asList(value, depth = 0) {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object' || depth >= 3) return null
  for (const key of ['data', 'items', 'list', 'rows', 'records']) {
    if (value[key] !== undefined) {
      const list = asList(value[key], depth + 1)
      if (list) return list
    }
  }
  return null
}
function bytes(value) {
  const n = Number(value || 0)
  if (n >= 1024 ** 4) return (n / 1024 ** 4).toFixed(1) + ' TB'
  if (n >= 1024 ** 3) return (n / 1024 ** 3).toFixed(1) + ' GB'
  if (n >= 1024 ** 2) return (n / 1024 ** 2).toFixed(0) + ' MB'
  if (n >= 1024) return (n / 1024).toFixed(0) + ' KB'
  return n + ' B'
}
function speed(value) {
  const n = Number(value || 0)
  if (n >= 1024 ** 2) return (n / 1024 ** 2).toFixed(1) + ' MB/s'
  if (n >= 1024) return (n / 1024).toFixed(0) + ' KB/s'
  return n.toFixed(0) + ' B/s'
}
function percent(used, total) {
  const size = Number(total || 0)
  return size > 0 ? Math.min(100, Math.max(0, Number(used || 0) / size * 100)) : null
}
function loadMetrics(machine) {
  const load = parseLoad(machine?.load_status)
  if (!load) return null
  const mem = load.mem || {}
  const disk = load.disk || {}
  const net = load.net || {}
  const cpu = load.cpu === null || load.cpu === undefined || load.cpu === '' ? null : Number(load.cpu)
  const usage = (used, total) => Number(total) > 0 ? bytes(used) + ' / ' + bytes(total) : '—'
  return [
    { key: 'cpu', label: 'CPU', value: Number.isFinite(cpu) ? cpu.toFixed(1) + '%' : '—', percent: Number.isFinite(cpu) ? Math.min(100, Math.max(0, cpu)) : null },
    { key: 'memory', label: '内存', value: usage(mem.used, mem.total), percent: percent(mem.used, mem.total) },
    { key: 'disk', label: '磁盘', value: usage(disk.used, disk.total), percent: percent(disk.used, disk.total) },
    { key: 'network', label: '网络', value: net.in_speed != null || net.out_speed != null ? '↑ ' + speed(net.in_speed) + '　↓ ' + speed(net.out_speed) : '—', percent: null },
  ]
}
function health(machine) {
  if (!machine?.is_active) return { label: '已停用', kind: 'muted' }
  const stamp = Number(machine.last_seen_at || 0)
  const age = stamp ? (Date.now() / 1000 - stamp) : Infinity
  if (age > 15 * 60) return { label: stamp ? '离线' : '未上报', kind: 'muted' }
  const metrics = loadMetrics(machine)
  if (!metrics) return { label: '等待上报', kind: 'muted' }
  const values = metrics.filter(metric => metric.percent !== null).map(metric => metric.percent)
  if (age > 5 * 60) return { label: '上报延迟', kind: 'warning' }
  if (values.some(value => value >= 90)) return { label: '负载过高', kind: 'danger' }
  if (values.some(value => value >= 80)) return { label: '负载偏高', kind: 'warning' }
  return { label: '运行正常', kind: 'healthy' }
}
function time(value) {
  const stamp = Number(value || 0)
  return stamp ? new Date(stamp * 1000).toLocaleString('zh-CN') : '—'
}
function memoryPercent(row) { return percent(row.mem_used, row.mem_total) }
function diskPercent(row) { return percent(row.disk_used, row.disk_total) }
function statusLabel(value) { return value ? '启用' : '停用' }
function historyToLoad(row) {
  return row ? {
    cpu: row.cpu,
    mem: { total: row.mem_total, used: row.mem_used },
    disk: { total: row.disk_total, used: row.disk_used },
    net: { in_speed: row.net_in_speed, out_speed: row.net_out_speed },
    updated_at: row.recorded_at,
  } : null
}

async function loadRecentHistory(list) {
  const recent = list.filter(machine => !parseLoad(machine.load_status) && machine.last_seen_at && Date.now() - Number(machine.last_seen_at) * 1000 < 86400000)
  if (!recent.length) return
  const histories = await Promise.allSettled(recent.map(async machine => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 8000)
    try {
      return await props.api('server/machine/history?machine_id=' + machine.id + '&range_hours=24&limit=10', { signal: controller.signal })
    } finally {
      window.clearTimeout(timer)
    }
  }))
  const fallback = new Map(recent.map((machine, index) => {
    const response = histories[index]
    const rows = response?.status === 'fulfilled' ? (asList(response.value) || []) : []
    return [machine.id, historyToLoad(rows.at(-1))]
  }))
  items.value = items.value.map(machine => parseLoad(machine.load_status) ? machine : { ...machine, load_status: fallback.get(machine.id) || null })
}
async function load() {
  loading.value = true
  error.value = ''
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 15000)
  try {
    const result = await props.api('server/machine/fetch', { signal: controller.signal })
    const list = asList(result)
    if (!list) throw new Error('机器列表接口返回的数据格式无法识别；请检查 Xboard 后端版本或接口响应。')
    items.value = list
    void loadRecentHistory(list).catch(() => {})
  } catch (cause) {
    error.value = cause.name === 'AbortError' ? '读取机器列表超时（15 秒）。请检查 Xboard API 地址、管理员路径和网络连接后重试。' : cause.message
    items.value = []
  } finally {
    window.clearTimeout(timer)
    loading.value = false
  }
}
function create() {
  Object.assign(form, { id: null, name: '', notes: '', is_active: true })
  formError.value = ''
  modal.value = true
}
function edit(machine) {
  Object.assign(form, { id: machine.id, name: machine.name, notes: machine.notes || '', is_active: Boolean(machine.is_active) })
  formError.value = ''
  modal.value = true
}
async function save() {
  saving.value = true
  formError.value = ''
  try {
    const result = await props.api('server/machine/save', { method: 'POST', body: { id: form.id || undefined, name: form.name, notes: form.notes, is_active: form.is_active } })
    modal.value = false
    await load()
    if (result?.token) showOutput('机器安装信息', result, 'provision')
  } catch (cause) {
    formError.value = cause.message
  } finally {
    saving.value = false
  }
}
async function openDetail(machine, tab = 'overview') {
  detail.value = machine
  detailTab.value = tab
  detailError.value = ''
  nodes.value = []
  history.value = []
  await loadDetailTab(tab)
}
async function loadDetailTab(tab) {
  if (!detail.value) return
  detailTab.value = tab
  detailError.value = ''
  const machine = detail.value
  if (tab === 'nodes') {
    nodesLoading.value = true
    try {
      const result = await props.api('server/machine/nodes?machine_id=' + machine.id)
      nodes.value = asList(result) || []
    } catch (cause) { detailError.value = cause.message } finally { nodesLoading.value = false }
  }
  if (tab === 'history') {
    historyLoading.value = true
    try {
      const result = await props.api('server/machine/history?machine_id=' + machine.id + '&range_hours=24&limit=60')
      history.value = asList(result) || []
    } catch (cause) { detailError.value = cause.message } finally { historyLoading.value = false }
  }
}
function showOutput(title, data, kind = 'token') {
  outputTitle.value = title
  output.value = data
  outputKind.value = kind
}
async function machineOutput(path, machine, title, kind) {
  try {
    const result = await props.api(path + '?id=' + encodeURIComponent(machine.id))
    showOutput(title, result, kind)
  } catch (cause) { error.value = cause.message }
}
async function resetToken(machine) {
  if (!window.confirm('重置机器“' + machine.name + '”的令牌？旧令牌会立即失效。')) return
  try {
    const result = await props.api('server/machine/resetToken', { method: 'POST', body: { id: machine.id } })
    showOutput('新机器令牌', result, 'token')
  } catch (cause) { error.value = cause.message }
}
async function remove(machine) {
  if (!window.confirm('删除机器“' + machine.name + '”？关联节点会自动解除绑定。')) return
  try {
    await props.api('server/machine/drop', { method: 'POST', body: { id: machine.id } })
    detail.value = null
    await load()
  } catch (cause) { error.value = cause.message }
}
async function copyText(value) {
  try { await navigator.clipboard.writeText(value) } catch { error.value = '复制失败，请手动选择文本复制。' }
}

onMounted(() => { void load() })
</script>

<template>
  <section class="content-view machine-view">
    <div class="page-title-row">
      <div><p class="eyebrow">INFRASTRUCTURE / MACHINES</p><h1>机器<span class="title-period">.</span></h1><p class="page-subtitle">查看机器详情、关联节点和近 24 小时系统负载</p></div>
      <button class="assign-order-button" @click="create">＋ 添加机器</button>
    </div>
    <div v-if="error" class="api-error"><span>!</span><div><b>机器操作失败</b><p>{{ error }}</p></div><button @click="load">重试</button></div>
    <div class="users-table-wrap">
      <div v-if="loading" class="table-state">正在读取机器…</div>
      <div v-else-if="!items.length" class="table-state">暂无机器。添加机器后可使用面板生成安装命令。</div>
      <table v-else class="users-table machine-table">
        <thead><tr><th>机器</th><th>运行状态</th><th>节点数</th><th>最近上报</th><th>系统负载</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="machine in items" :key="machine.id">
            <td><button class="machine-name-link" @click="openDetail(machine)">{{ machine.name }}</button><small class="order-id">ID {{ machine.id }}<span v-if="machine.notes"> · {{ machine.notes }}</span></small></td>
            <td><span class="machine-health" :class="health(machine).kind">{{ health(machine).label }}</span><small class="machine-active">{{ statusLabel(machine.is_active) }}</small></td>
            <td><button class="machine-node-count" @click="openDetail(machine,'nodes')">{{ machine.servers_count || 0 }} 个节点 <span>→</span></button></td>
            <td>{{ machine.last_seen_at ? time(machine.last_seen_at) : '尚未上报' }}</td>
            <td>
              <div v-if="loadMetrics(machine)" class="load-summary">
                <div v-for="metric in loadMetrics(machine)" :key="metric.key" class="load-metric" :class="'load-' + metric.key">
                  <div class="load-metric-head"><span>{{ metric.label }}</span><b>{{ metric.value }}</b></div>
                  <div v-if="metric.percent !== null" class="load-meter"><i :class="{ high: metric.percent >= 85 }" :style="{ width: metric.percent + '%' }"></i></div>
                </div>
              </div>
              <span v-else class="load-empty">暂无近期负载</span>
            </td>
            <td><div class="row-actions machine-actions"><button @click="openDetail(machine)">详情</button><button @click="edit(machine)">编辑</button><button @click="machineOutput('server/machine/installCommand',machine,'安装命令','command')">安装命令</button><button @click="machineOutput('server/machine/getToken',machine,'机器令牌','token')">令牌</button><button @click="resetToken(machine)">重置令牌</button><button class="danger-action" @click="remove(machine)">删除</button></div></td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="footer-note"><span>XB CONTROL ROOM</span><span>状态阈值：5 分钟未上报提示延迟 · 15 分钟判定离线 · 负载 80% 提醒 / 90% 告警</span></div>

    <div v-if="modal" class="modal-backdrop" @click.self="modal=false">
      <section class="user-modal"><header class="modal-header"><div><p class="eyebrow">INFRASTRUCTURE / MACHINE</p><h2>{{ form.id ? '编辑机器' : '添加机器' }}</h2></div><button class="modal-close" @click="modal=false">×</button></header>
        <form class="user-form" @submit.prevent="save"><label>机器名称<input v-model.trim="form.name" required maxlength="255"/></label><label>备注<textarea v-model="form.notes" rows="3"/></label><div class="toggle-row"><label><input v-model="form.is_active" type="checkbox"/> 启用</label></div><p v-if="formError" class="notice">{{ formError }}</p><footer class="modal-footer"><button type="button" class="cancel-button" @click="modal=false">取消</button><button class="save-button" :disabled="saving">{{ saving ? '保存中…' : '保存机器' }}</button></footer></form>
      </section>
    </div>

    <div v-if="detail" class="modal-backdrop" @click.self="detail=null">
      <section class="user-modal machine-detail">
        <header class="modal-header"><div><p class="eyebrow">INFRASTRUCTURE / MACHINE {{ detail.id }}</p><h2>{{ detail.name }}</h2><p class="machine-detail-subtitle">{{ detail.notes || '机器详情与实时状态' }}</p></div><button class="modal-close" @click="detail=null">×</button></header>
        <nav class="machine-detail-tabs"><button v-for="tab in [['overview','概览'],['nodes','关联节点'],['history','负载历史']]" :key="tab[0]" :class="{ selected: detailTab === tab[0] }" @click="loadDetailTab(tab[0])">{{ tab[1] }}</button></nav>
        <p v-if="detailError" class="notice machine-detail-error">{{ detailError }}</p>
        <section v-if="detailTab==='overview'" class="machine-overview">
          <div class="machine-overview-cards"><article><span>运行健康度</span><b :class="health(detail).kind">{{ health(detail).label }}</b></article><article><span>关联节点</span><b>{{ detail.servers_count || 0 }}</b></article><article><span>最近上报</span><b>{{ detail.last_seen_at ? time(detail.last_seen_at) : '尚未上报' }}</b></article><article><span>机器状态</span><b>{{ detail.is_active ? '已启用' : '已停用' }}</b></article></div>
          <div class="machine-detail-load"><div class="panel-heading"><div><p class="eyebrow">SYSTEM / LOAD</p><h3>系统负载</h3></div><button @click="loadDetailTab('history')">查看历史 →</button></div>
            <div v-if="loadMetrics(detail)" class="load-summary detail-load-summary"><div v-for="metric in loadMetrics(detail)" :key="metric.key" class="load-metric" :class="'load-' + metric.key"><div class="load-metric-head"><span>{{ metric.label }}</span><b>{{ metric.value }}</b></div><div v-if="metric.percent !== null" class="load-meter"><i :class="{ high: metric.percent >= 85 }" :style="{ width: metric.percent + '%' }"></i></div></div></div>
            <p v-else class="load-empty">当前没有近期负载上报。</p>
            <p class="machine-health-note">CPU、内存或磁盘 ≥80% 为偏高，≥90% 为过高；最近上报超过 5 分钟提示延迟，超过 15 分钟判定离线。</p>
          </div>
          <div class="machine-detail-actions"><button @click="loadDetailTab('nodes')">查看关联节点</button><button @click="edit(detail)">编辑机器</button><button @click="machineOutput('server/machine/installCommand',detail,'安装命令','command')">安装命令</button></div>
        </section>
        <section v-else-if="detailTab==='nodes'" class="machine-detail-table">
          <div v-if="nodesLoading" class="table-state">正在读取关联节点…</div><div v-else-if="!nodes.length" class="table-state">这台机器尚未关联节点。</div>
          <table v-else class="users-table"><thead><tr><th>节点</th><th>协议</th><th>地址</th><th>端口</th><th>可见性</th><th>状态</th></tr></thead><tbody><tr v-for="node in nodes" :key="node.id"><td><b>{{ node.name }}</b><small class="order-id">ID {{ node.id }}<span v-if="node.sort !== undefined"> · 排序 {{ node.sort }}</span></small></td><td><code>{{ node.type || '—' }}</code></td><td><code>{{ node.host || '—' }}</code></td><td>{{ node.port || '—' }}<span v-if="node.server_port"> / {{ node.server_port }}</span></td><td>{{ node.show ? '前台可见' : '隐藏' }}</td><td><span class="machine-health" :class="node.enabled ? 'healthy' : 'muted'">{{ node.enabled ? '已启用' : '已停用' }}</span></td></tr></tbody></table>
        </section>
        <section v-else class="machine-detail-table">
          <div v-if="historyLoading" class="table-state">正在读取近 24 小时负载…</div><div v-else-if="!history.length" class="table-state">近 24 小时没有负载历史。</div>
          <table v-else class="users-table machine-history-table"><thead><tr><th>上报时间</th><th>CPU</th><th>内存</th><th>磁盘</th><th>入站</th><th>出站</th></tr></thead><tbody><tr v-for="(row,index) in history" :key="row.recorded_at || index"><td>{{ time(row.recorded_at) }}</td><td><span class="history-value" :class="{ high: Number(row.cpu)>=85 }">{{ Number(row.cpu||0).toFixed(1) }}%</span></td><td>{{ bytes(row.mem_used) }} / {{ bytes(row.mem_total) }} <small>{{ memoryPercent(row)===null?'':memoryPercent(row).toFixed(0)+'%' }}</small></td><td>{{ bytes(row.disk_used) }} / {{ bytes(row.disk_total) }} <small>{{ diskPercent(row)===null?'':diskPercent(row).toFixed(0)+'%' }}</small></td><td>{{ row.net_in_speed==null?'—':speed(row.net_in_speed) }}</td><td>{{ row.net_out_speed==null?'—':speed(row.net_out_speed) }}</td></tr></tbody></table>
        </section>
      </section>
    </div>

    <div v-if="output" class="modal-backdrop" @click.self="output=null">
      <section class="user-modal machine-output-modal"><header class="modal-header"><div><p class="eyebrow">INFRASTRUCTURE / MACHINE OUTPUT</p><h2>{{ outputTitle }}</h2></div><button class="modal-close" @click="output=null">×</button></header>
        <div v-if="outputKind==='command'" class="machine-output-content"><p>在目标机器终端执行安装命令。</p><pre>{{ output.command || output }}</pre><button class="save-button" @click="copyText(output.command || output)">复制安装命令</button></div>
        <div v-else-if="outputKind==='provision'" class="machine-output-content"><label>机器令牌<code>{{ output.token }}</code><button @click="copyText(output.token)">复制令牌</button></label><label>安装命令<pre>{{ output.install_command }}</pre><button @click="copyText(output.install_command)">复制命令</button></label></div>
        <div v-else class="machine-output-content"><p>令牌属于机器凭据；重置后旧令牌立即失效。</p><code class="machine-token">{{ output.token || output }}</code><button class="save-button" @click="copyText(output.token || output)">复制令牌</button></div>
      </section>
    </div>
  </section>
</template>
