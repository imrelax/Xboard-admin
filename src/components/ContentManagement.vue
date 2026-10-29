<script setup>
import { nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import 'vditor/dist/index.css'

const props = defineProps({ kind: { type: String, required: true }, api: { type: Function, required: true } })
const notice = props.kind === 'notices'
const title = notice ? '公告' : '知识库'
const endpoint = notice ? 'notice' : 'knowledge'
const items = ref([])
const categories = ref([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const modal = ref(false)
const formError = ref('')
const form = reactive({ id: null, title: '', content: '', img_url: '', tags: '', show: true, popup: false, category: '', language: 'zh-CN', body: '' })
const editorHost = ref(null)
let markdownEditor = null
const languages = ['zh-CN', 'en-US', 'zh-TW', 'ja-JP', 'ko-KR']

async function load() {
  loading.value = true; error.value = ''
  try {
    items.value = await props.api(`${endpoint}/fetch`)
    if (!Array.isArray(items.value)) items.value = []
    if (!notice) categories.value = await props.api('knowledge/getCategory')
  } catch (cause) { error.value = cause.message }
  finally { loading.value = false }
}
function clearForm() { Object.assign(form, { id: null, title: '', content: '', img_url: '', tags: '', show: true, popup: false, category: categories.value[0] || '', language: 'zh-CN', body: '' }); formError.value = '' }
function create() { clearForm(); modal.value = true }
async function edit(item) {
  clearForm(); modal.value = true
  try {
    const data = notice ? item : await props.api(`${endpoint}/fetch?id=${encodeURIComponent(item.id)}`)
    Object.assign(form, { id: data.id, title: data.title || '', content: data.content || '', img_url: data.img_url || '', tags: Array.isArray(data.tags) ? data.tags.join(', ') : '', show: Boolean(data.show), popup: Boolean(data.popup), category: data.category || '', language: data.language || 'zh-CN', body: data.body || '' })
  } catch (cause) { formError.value = cause.message }
}
async function save() {
  saving.value = true; formError.value = ''
  try {
    if (!notice && !form.body.trim()) throw new Error('文章正文不能为空。')
    const body = notice
      ? { id: form.id || undefined, title: form.title, content: form.content, img_url: form.img_url || null, tags: form.tags.split(',').map(v => v.trim()).filter(Boolean), show: form.show, popup: form.popup }
      : { id: form.id || undefined, title: form.title, category: form.category, language: form.language, body: form.body, show: form.show }
    await props.api(`${endpoint}/save`, { method: 'POST', body })
    modal.value = false; await load()
  } catch (cause) { formError.value = cause.message }
  finally { saving.value = false }
}
async function toggle(item) {
  try { await props.api(`${endpoint}/show`, { method: 'POST', body: { id: item.id } }); await load() }
  catch (cause) { error.value = cause.message }
}
async function remove(item) {
  if (!window.confirm(`确定删除“${item.title}”？此操作不可撤销。`)) return
  try { await props.api(`${endpoint}/drop`, { method: 'POST', body: { id: item.id } }); await load() }
  catch (cause) { error.value = cause.message }
}
async function move(index, delta) {
  const target = index + delta
  if (target < 0 || target >= items.value.length) return
  const reordered = [...items.value]
  ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
  try { await props.api(`${endpoint}/sort`, { method: 'POST', body: { ids: reordered.map(item => item.id) } }); items.value = reordered }
  catch (cause) { error.value = cause.message }
}
watch(() => props.kind, load)
watch(() => form.body, value => {
  if (!markdownEditor) return
  const body = value || ''
  if (markdownEditor.getValue() !== body) markdownEditor.setValue(body)
})
watch([modal, () => props.kind], async ([isOpen, kind]) => {
  if (markdownEditor) { markdownEditor.destroy(); markdownEditor = null }
  if (!isOpen || kind === 'notices') return
  await nextTick()
  if (!editorHost.value) return
  const { default: Vditor } = await import('vditor')
  markdownEditor = new Vditor(editorHost.value, {
    height: 460,
    minHeight: 280,
    mode: 'wysiwyg',
    lang: 'zh_CN',
    cdn: 'https://unpkg.com/vditor@4.0.1',
    placeholder: '使用 Markdown 编写帮助文章…',
    cache: { enable: false },
    value: form.body,
    after() {
      const body = form.body || ''
      if (markdownEditor?.getValue() !== body) markdownEditor?.setValue(body)
    },
    input(value) { form.body = value },
  })
})
onBeforeUnmount(() => markdownEditor?.destroy())
onMounted(load)
</script>

<template>
  <section class="content-view">
    <div class="page-title-row"><div><p class="eyebrow">CUSTOMERS / {{ endpoint.toUpperCase() }}</p><h1>{{ title }}<span class="title-period">.</span></h1><p class="page-subtitle">{{ notice ? '站点公告管理 · 排序越靠前越优先展示' : '多语言帮助文章 · 按分类和排序组织' }}</p></div><button class="assign-order-button" @click="create">＋ 新建{{ notice ? '公告' : '文章' }}</button></div>
    <div v-if="error" class="api-error"><span>!</span><div><b>{{ title }}操作未完成</b><p>{{ error }}</p></div><button @click="load">重试</button></div>
    <div class="users-table-wrap"><div v-if="loading" class="table-state">正在读取{{ title }}…</div><div v-else-if="!items.length" class="table-state">暂无{{ title }}，可以创建第一条内容。</div><table v-else class="users-table content-table"><thead><tr><th>标题</th><th v-if="!notice">分类 / 语言</th><th v-if="notice">标签 / 弹窗</th><th>更新时间</th><th>状态</th><th>排序</th><th>操作</th></tr></thead><tbody><tr v-for="(item,index) in items" :key="item.id"><td><div class="user-cell"><span class="user-initial">{{ item.title?.slice(0,1) || '文' }}</span><span><b>{{ item.title }}</b><small>ID {{ item.id }}<template v-if="notice && item.tags?.length"> · {{ item.tags.join(' / ') }}</template></small></span></div></td><td v-if="!notice">{{ item.category }} <small>· {{ item.language }}</small></td><td v-if="notice">{{ (item.tags || []).join('、') || '—' }} <small>· {{ item.popup ? '弹窗公告' : '普通公告' }}</small></td><td>{{ item.updated_at ? new Date(Number(item.updated_at) * 1000).toLocaleString('zh-CN') : '—' }}</td><td><button class="user-status status-button" :class="{ disabled: !item.show }" @click="toggle(item)">{{ item.show ? '已显示' : '已隐藏' }}</button></td><td><div class="sort-actions"><button :disabled="index===0" @click="move(index,-1)">↑</button><button :disabled="index===items.length-1" @click="move(index,1)">↓</button></div></td><td><div class="row-actions"><button @click="edit(item)">编辑</button><button class="danger-action" @click="remove(item)">删除</button></div></td></tr></tbody></table></div>
    <div class="footer-note"><span>XB CONTROL ROOM</span><span>内容与排序直接保存到 Xboard <i>·</i> 删除前会确认</span></div>
    <div v-if="modal" class="modal-backdrop" @click.self="modal = false"><section class="user-modal content-modal" role="dialog" aria-modal="true"><header class="modal-header"><div><p class="eyebrow">{{ endpoint.toUpperCase() }} / {{ form.id ? 'EDIT' : 'CREATE' }}</p><h2>{{ form.id ? '编辑' : '新建' }}{{ notice ? '公告' : '知识文章' }}</h2></div><button class="modal-close" @click="modal = false">×</button></header><form class="user-form" @submit.prevent="save"><label>标题<input v-model.trim="form.title" required maxlength="255" /></label><template v-if="notice"><label>正文<textarea v-model="form.content" rows="8" required placeholder="支持 Xboard 公告内容格式"></textarea></label><label>图片 URL（可选）<input v-model.trim="form.img_url" type="url" placeholder="https://…" /></label><label>标签（逗号分隔）<input v-model="form.tags" placeholder="维护, 更新" /></label><div class="toggle-row"><label><input v-model="form.show" type="checkbox" /> 前台显示</label><label><input v-model="form.popup" type="checkbox" /> 作为弹窗</label></div></template><template v-else><div class="form-pair"><label>分类<input v-model.trim="form.category" list="knowledge-categories" required /><datalist id="knowledge-categories"><option v-for="category in categories" :key="category" :value="category" /></datalist></label><label>语言<select v-model="form.language"><option v-for="language in languages" :key="language" :value="language">{{ language }}</option></select></label></div><label class="markdown-label">文章正文 <small>Vditor · Markdown 所见即所得</small><div ref="editorHost" class="markdown-editor"></div></label><div class="toggle-row"><label><input v-model="form.show" type="checkbox" /> 前台显示</label></div></template><p v-if="formError" class="notice">{{ formError }}</p><footer class="modal-footer"><button type="button" class="cancel-button" @click="modal = false">取消</button><button type="submit" class="save-button" :disabled="saving">{{ saving ? '保存中…' : '保存' }}</button></footer></form></section></div>
  </section>
</template>
