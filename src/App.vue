<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import ApiWorkbench from './components/ApiWorkbench.vue'
import ContentManagement from './components/ContentManagement.vue'
import CouponManagement from './components/CouponManagement.vue'
import PaymentManagement from './components/PaymentManagement.vue'
import GiftCardManagement from './components/GiftCardManagement.vue'
import MachineManagement from './components/MachineManagement.vue'
import ServerManagement from './components/ServerManagement.vue'
import StatisticsDashboard from './components/StatisticsDashboard.vue'
import TrafficResetManagement from './components/TrafficResetManagement.vue'
import SystemConfigManagement from './components/SystemConfigManagement.vue'
import MailTemplateManagement from './components/MailTemplateManagement.vue'
import SystemDashboard from './components/SystemDashboard.vue'
import ThemeManagement from './components/ThemeManagement.vue'
import PluginManagement from './components/PluginManagement.vue'
import { featureGroups } from './features.js'

const defaults = __XB_DEFAULTS__
const saved = (() => {
  try { return JSON.parse(localStorage.getItem('xb-admin-config') || '{}') } catch { return {} }
})()
const apiOrigin = ref(saved.apiOrigin || defaults.apiOrigin)
const adminPath = ref(saved.adminPath || defaults.adminPath)
const email = ref('')
const password = ref('')
const token = ref(sessionStorage.getItem('xb-admin-token') || '')
const viewIds = new Set(['overview', ...featureGroups.map(group => group.id)])
function viewFromHash() {
  const candidate = decodeURIComponent(location.hash.replace(/^#\/?/, '').split('?')[0])
  return viewIds.has(candidate) ? candidate : 'overview'
}
const activeView = ref(viewFromHash())
const busy = ref(false)
const message = ref('')
const messageKind = ref('error')
const stats = ref(null)
const users = ref([])
const usersLoading = ref(false)
const usersError = ref('')
const userQuery = ref('')
const userPage = ref(1)
const userPane = ref('directory')
const plans = ref([])
const planGroups = ref([])
const plansLoading = ref(false)
const planError = ref('')
const planModal = ref(false)
const planSaving = ref(false)
const planFormError = ref('')
const planForceUpdate = ref(false)
const planForm = reactive({ id: null, name: '', content: '', transfer_gb: 100, group_id: '', speed_limit: '', device_limit: '', capacity_limit: '', reset_traffic_method: '', show: true, renew: true, sell: true, tags: '', prices: { monthly: '', quarterly: '', half_yearly: '', yearly: '', two_yearly: '', three_yearly: '', onetime: '', reset_traffic: '' } })
const orders = ref([])
const orderLoading = ref(false)
const tickets = ref([])
const ticketLoading = ref(false)
const ticketError = ref('')
const ticketStatusFilter = ref('')
const ticketPage = ref(1)
const ticketTotal = ref(0)
const ticketDetail = ref(null)
const ticketDetailLoading = ref(false)
const ticketReplyText = ref('')
const ticketReplying = ref(false)
const orderError = ref('')
const orderQuery = ref('')
const orderPage = ref(1)
const orderDetail = ref(null)
const orderDetailLoading = ref(false)
const assignModal = ref(false)
const assignSaving = ref(false)
const assignError = ref('')
const assignForm = reactive({ email: '', plan_id: '', period: 'month_price', total_amount: 0 })
const userModal = ref(false)
const userMode = ref('edit')
const userSaving = ref(false)
const userFormError = ref('')
const editingUserId = ref(null)
const originalUserFlags = ref({ banned: false, is_admin: false, is_staff: false })
const userForm = reactive({ email: '', password: '', plan_id: '', balance: 0, transfer_gb: 0, expired_at: '', banned: false, is_admin: false, is_staff: false, commission_rate: 0, discount: 0, speed_limit: '', device_limit: '', remarks: '' })
const statsError = ref('')
const apiOriginClean = computed(() => apiOrigin.value.trim().replace(/\/+$/, ''))
const apiBase = computed(() => `${apiOriginClean.value}/api/v2`)
const glyphs = { users: '◎', orders: '↗', plans: '▤', tickets: '✳', notices: '▧', knowledge: '⌑', coupons: '%', 'gift-cards': '◇', payments: '￥', servers: '⌁', machines: '▦', statistics: '◫', 'traffic-reset': '↻', configuration: '⚙', mail: '✉', system: '◉', themes: '◈', plugins: '⊞' }
const views = [
  { id: 'overview', name: '运营概览', en: 'OVERVIEW', glyph: '◫', section: '工作区' },
  ...featureGroups.map(group => ({ id: group.id, name: group.title, en: group.id.toUpperCase(), glyph: glyphs[group.id] || '◦', section: group.section })),
]
const navigationSections = computed(() => {
  const sections = []
  for (const view of views) {
    let section = sections.find(item => item.name === view.section)
    if (!section) { section = { name: view.section, items: [] }; sections.push(section) }
    section.items.push(view)
  }
  return sections
})
const currentGroup = computed(() => featureGroups.find(group => group.id === activeView.value))
const currentView = computed(() => views.find(v => v.id === activeView.value) || views[0])
const hasAdminPath = computed(() => /^[a-zA-Z0-9_-]+$/.test(adminPath.value.trim()))
const displayNumber = value => Number(value || 0).toLocaleString('zh-CN')
const currency = value => `¥${(Number(value || 0) / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function apiUrl(path) {
  let normalized = path.replace(/^\/+/, '')
  const prefix = adminPath.value.trim().replace(/^\/+|\/+$/g, '')
  if (!normalized.startsWith('passport/') && prefix && normalized !== prefix && !normalized.startsWith(`${prefix}/`)) normalized = `${prefix}/${normalized}`
  return `${apiBase.value}/${normalized}`
}
function updateSecurePath(value) {
  const normalized = String(value || '').trim().replace(/^\/+|\/+$/g, '')
  if (!/^[a-zA-Z0-9_-]{8,}$/.test(normalized)) throw new Error('管理员安全路径格式无效。')
  adminPath.value = normalized
  saveConnection()
}
async function api(path, options = {}, unwrap = true) {
  const formData = typeof FormData !== 'undefined' && options.body instanceof FormData
  const headers = { Accept: 'application/json', ...(options.body && !formData ? { 'Content-Type': 'application/json' } : {}), ...(token.value ? { Authorization: token.value } : {}), ...options.headers }
  const body = formData ? options.body : options.body ? JSON.stringify(options.body) : undefined
  const response = await fetch(apiUrl(path), { ...options, headers, body })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.message || `请求失败（HTTP ${response.status}）`)
    error.status = response.status
    throw error
  }
  return unwrap ? (data.data ?? data) : data
}
async function download(path, options = {}, filenameOverride = '') {
  const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(token.value ? { Authorization: token.value } : {}) }
  const response = await fetch(apiUrl(path), { ...options, headers, body: options.body ? JSON.stringify(options.body) : undefined })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.message || `下载失败（HTTP ${response.status}）`)
  }
  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filenameOverride || path.split('/').pop().split('?')[0] || 'xboard-export'
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
}
function restoreDefaults() {
  localStorage.removeItem('xb-admin-config')
  apiOrigin.value = defaults.apiOrigin
  adminPath.value = defaults.adminPath
  message.value = '已恢复 Vite 构建默认值。'
  messageKind.value = 'success'
}
function saveConnection() {
  apiOrigin.value = apiOriginClean.value
  adminPath.value = adminPath.value.trim().replace(/^\/+|\/+$/g, '')
  localStorage.setItem('xb-admin-config', JSON.stringify({ apiOrigin: apiOrigin.value, adminPath: adminPath.value }))
  message.value = '连接配置已保存在此浏览器。'
  messageKind.value = 'success'
  setTimeout(() => { message.value = '' }, 2600)
}
async function login() {
  message.value = ''
  if (!apiOriginClean.value || !hasAdminPath.value) {
    message.value = '请填写服务地址和有效的管理员安全路径。'
    messageKind.value = 'error'
    return
  }
  busy.value = true
  try {
    saveConnection()
    const data = await api('passport/auth/login', { method: 'POST', body: { email: email.value.trim(), password: password.value } })
    if (!data.auth_data) throw new Error('登录响应缺少 auth_data。请确认 Xboard API 版本。')
    if (!data.is_admin) throw new Error('此账号不是管理员，无法进入管理端。')
    token.value = data.auth_data
    sessionStorage.setItem('xb-admin-token', token.value)
    password.value = ''
    message.value = ''
    activeView.value = viewFromHash()
    await loadStats()
    await setView(activeView.value)
  } catch (error) {
    token.value = ''
    sessionStorage.removeItem('xb-admin-token')
    message.value = error.message.includes('Failed to fetch') || error instanceof TypeError
      ? '无法连接 API。请检查服务地址、网络及 Xboard 的 CORS 跨域设置。'
      : error.message
    messageKind.value = 'error'
  } finally { busy.value = false }
}
async function loadStats() {
  statsError.value = ''
  try { stats.value = await api(`${adminPath.value}/stat/getOverride`) }
  catch (error) { statsError.value = error.message; stats.value = null }
}
async function setView(id) {
  if (!viewIds.has(id)) return
  activeView.value = id
  if (location.hash !== `#/${id}`) location.hash = `/${id}`
  if (id === 'users') { userPane.value = 'directory'; await Promise.all([loadUsers(), loadPlans()]) }
  if (id === 'orders') { await Promise.all([loadOrders(), loadPlans()]) }
  if (id === 'plans') { await Promise.all([loadPlans(), loadPlanGroups()]) }
  if (id === 'tickets') await loadTickets()
}
async function loadUsers(page = 1) {
  usersLoading.value = true
  usersError.value = ''
  userPage.value = page
  try {
    const query = new URLSearchParams({ current: String(page), pageSize: '25' })
    if (userQuery.value.trim()) {
      query.set('filter[0][id]', 'email')
      query.set('filter[0][value]', userQuery.value.trim())
    }
    users.value = await api(`${adminPath.value}/user/fetch?${query.toString()}`)
  } catch (error) { usersError.value = error.message; users.value = [] }
  finally { usersLoading.value = false }
}
async function loadTickets(page = 1) {
  ticketLoading.value = true; ticketError.value = ''; ticketPage.value = page
  try {
    const query = new URLSearchParams({ current: String(page), pageSize: '25' })
    if (ticketStatusFilter.value !== '') query.set('status', ticketStatusFilter.value)
    const response = await api(`${adminPath.value}/ticket/fetch?${query}`, {}, false)
    tickets.value = Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : (response?.items || []))
    ticketTotal.value = response?.total ?? response?.pagination?.total ?? tickets.value.length
  } catch (error) {
    ticketError.value = error.status === 500
      ? `${error.message}（Xboard 工单列表接口发生服务器错误；请检查工单关联用户是否已删除，以及 Xboard 日志。）`
      : error.message
    tickets.value = []
  }
  finally { ticketLoading.value = false }
}
async function openTicket(ticket) {
  ticketDetailLoading.value = true; ticketDetail.value = null; ticketReplyText.value = ''
  try { ticketDetail.value = await api(`${adminPath.value}/ticket/fetch?id=${encodeURIComponent(ticket.id)}`) }
  catch (error) { ticketError.value = error.message }
  finally { ticketDetailLoading.value = false }
}
async function replyTicket() {
  if (!ticketReplyText.value.trim() || !ticketDetail.value) return
  ticketReplying.value = true
  try { await api(`${adminPath.value}/ticket/reply`, { method: 'POST', body: { id: ticketDetail.value.id, message: ticketReplyText.value.trim() } }); ticketReplyText.value = ''; await openTicket(ticketDetail.value); await loadTickets(ticketPage.value) }
  catch (error) { ticketError.value = error.message }
  finally { ticketReplying.value = false }
}
async function closeTicket(ticket) {
  if (!window.confirm(`关闭工单“${ticket.subject || `#${ticket.id}`}”？`)) return
  try { await api(`${adminPath.value}/ticket/close`, { method: 'POST', body: { id: ticket.id } }); await loadTickets(ticketPage.value); if (ticketDetail.value?.id === ticket.id) await openTicket(ticket) }
  catch (error) { ticketError.value = error.message }
}
function ticketStatus(status) { return Number(status) === 0 ? '待处理' : '已关闭' }
function ticketDate(value) { return createdAt(value) }
async function loadOrders(page = 1) {
  orderLoading.value = true; orderError.value = ''; orderPage.value = page
  try {
    const query = new URLSearchParams({ current: String(page), pageSize: '25' })
    if (orderQuery.value.trim()) { query.set('filter[0][id]', 'trade_no'); query.set('filter[0][value]', orderQuery.value.trim()) }
    orders.value = await api(`${adminPath.value}/order/fetch?${query}`)
  } catch (error) { orderError.value = error.message; orders.value = [] }
  finally { orderLoading.value = false }
}
async function openOrder(order) {
  orderDetailLoading.value = true; orderDetail.value = null
  try { orderDetail.value = await api(`${adminPath.value}/order/detail`, { method: 'POST', body: { id: order.id } }) }
  catch (error) { orderError.value = error.message }
  finally { orderDetailLoading.value = false }
}
async function setOrderAction(action, order) {
  const label = action === 'paid' ? '标记订单为已支付并履约' : '取消这笔待支付订单'
  if (!window.confirm(`确认${label}？订单号：${order.trade_no}`)) return
  try { await api(`${adminPath.value}/order/${action}`, { method: 'POST', body: { trade_no: order.trade_no } }); await loadOrders(orderPage.value) }
  catch (error) { orderError.value = error.message }
}
function openAssignOrder() { assignError.value = ''; Object.assign(assignForm, { email: '', plan_id: '', period: 'month_price', total_amount: 0 }); assignModal.value = true }
async function assignOrder() {
  assignSaving.value = true; assignError.value = ''
  try { await api(`${adminPath.value}/order/assign`, { method: 'POST', body: { email: assignForm.email, plan_id: Number(assignForm.plan_id), period: assignForm.period, total_amount: Math.round(Number(assignForm.total_amount) * 100) } }); assignModal.value = false; await loadOrders(1) }
  catch (error) { assignError.value = error.message }
  finally { assignSaving.value = false }
}
function orderStatus(status) { return ({ 0: '待支付', 1: '开通中', 2: '已取消', 3: '已完成', 4: '已折抵' })[Number(status)] || `状态 ${status}` }
function commissionStatus(status) { return ({ 0: '待系统审核', 1: '已审核，待系统发放', 2: '系统已发放', 3: '已取消' })[Number(status)] || '无佣金记录' }
function orderType(type) { return ({ 1: '新购', 2: '续费', 3: '升级', 4: '流量重置' })[Number(type)] || '—' }
function createdAt(value) { const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value); return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('zh-CN') }
const orderDetailLabels = { id:'订单 ID',trade_no:'交易单号',user_id:'用户 ID',plan_id:'套餐 ID',period:'订阅周期',total_amount:'订单金额',discount_amount:'优惠金额',surplus_amount:'抵扣金额',handling_amount:'手续费',status:'订单状态',type:'订单类型',commission_status:'佣金状态',commission_balance:'佣金金额',actual_commission_balance:'实际佣金金额',order_amount:'佣金订单金额',get_amount:'佣金金额',created_at:'创建时间',updated_at:'更新时间',paid_at:'支付时间',payment_id:'支付方式 ID',invite_user_id:'邀请人 ID',balance_amount:'余额支付',surplus_order_ids:'折抵订单 ID',name:'套餐名称',email:'邮箱',commission_rate:'佣金比例',remark:'备注' }
function maskedEmail(value) { const [name,domain] = String(value).split('@'); return domain ? `${name.slice(0,1)}***@${domain}` : String(value) }
function orderDetailValue(key,value) {
  if (value === null || value === undefined || value === '') return '—'
  if (key === 'email') return maskedEmail(value)
  if (key === 'total_amount' || key === 'discount_amount' || key === 'surplus_amount' || key === 'handling_amount' || key === 'commission_balance' || key === 'balance_amount') return money(value)
  if (key === 'status') return orderStatus(value)
  if (key === 'type') return orderType(value)
  if (key === 'commission_status') return commissionStatus(value)
  if (key.endsWith('_at')) return createdAt(value)
  if (typeof value === 'boolean') return value ? '是' : '否'
  if (Array.isArray(value)) return value.join('、') || '—'
  return String(value)
}
function orderDetailFields(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return []
  return Object.entries(value).filter(([key,v]) => !/(password|secret|token|uuid|salt|last_login_ip|telegram_id|callback_no)/i.test(key) && (v === null || ['string','number','boolean'].includes(typeof v))).map(([key,val]) => ({ key, label: orderDetailLabels[key] || key.replaceAll('_',' '), value: orderDetailValue(key,val) }))
}
async function loadPlans() {
  plansLoading.value = true; planError.value = ''
  try { plans.value = await api(`${adminPath.value}/plan/fetch`); if (!Array.isArray(plans.value)) plans.value = [] } catch (error) { plans.value = []; planError.value = error.message }
  finally { plansLoading.value = false }
}
async function loadPlanGroups() {
  try { planGroups.value = await api(`${adminPath.value}/server/group/fetch`) } catch { planGroups.value = [] }
}
const pricePeriods = [{key:'monthly',name:'月付'},{key:'quarterly',name:'季付'},{key:'half_yearly',name:'半年付'},{key:'yearly',name:'年付'},{key:'two_yearly',name:'两年付'},{key:'three_yearly',name:'三年付'},{key:'onetime',name:'一次性'},{key:'reset_traffic',name:'流量重置'}]
function emptyPlanForm() { return { id: null, name: '', content: '', transfer_gb: 100, group_id: '', speed_limit: '', device_limit: '', capacity_limit: '', reset_traffic_method: '', show: true, renew: true, sell: true, tags: '', prices: { monthly: '', quarterly: '', half_yearly: '', yearly: '', two_yearly: '', three_yearly: '', onetime: '', reset_traffic: '' } } }
function openCreatePlan() { Object.assign(planForm, emptyPlanForm()); planForceUpdate.value = false; planFormError.value = ''; planModal.value = true }
function openEditPlan(plan) {
  Object.assign(planForm, { ...emptyPlanForm(), id: plan.id, name: plan.name || '', content: plan.content || '', transfer_gb: Number(plan.transfer_enable || 0), group_id: plan.group_id ?? '', speed_limit: plan.speed_limit ?? '', device_limit: plan.device_limit ?? '', capacity_limit: plan.capacity_limit ?? '', reset_traffic_method: plan.reset_traffic_method ?? '', show: Boolean(plan.show), renew: Boolean(plan.renew), sell: Boolean(plan.sell), tags: Array.isArray(plan.tags) ? plan.tags.join(', ') : '', prices: Object.fromEntries(pricePeriods.map(period => [period.key, plan.prices?.[period.key] ?? ''])) }); planForceUpdate.value = false; planFormError.value = ''; planModal.value = true
}
async function savePlan() {
  planSaving.value = true; planFormError.value = ''
  try {
    if (planForm.id && planForceUpdate.value && !window.confirm('将把新的权限组、流量、限速和设备限制同步覆盖给所有此套餐用户，确认继续？')) return
    const beforeIds = new Set(plans.value.map(plan => Number(plan.id)))
    const prices = Object.fromEntries(Object.entries(planForm.prices).filter(([,value]) => value !== '' && value !== null).map(([key,value]) => [key, Number(value)]))
    const payload = { id: planForm.id || undefined, name: planForm.name, content: planForm.content || null, transfer_enable: Math.round(Number(planForm.transfer_gb)), group_id: planForm.group_id ? Number(planForm.group_id) : null, speed_limit: planForm.speed_limit === '' ? null : Number(planForm.speed_limit), device_limit: planForm.device_limit === '' ? null : Number(planForm.device_limit), capacity_limit: planForm.capacity_limit === '' ? null : Number(planForm.capacity_limit), reset_traffic_method: planForm.reset_traffic_method === '' ? null : Number(planForm.reset_traffic_method), tags: planForm.tags.split(',').map(tag => tag.trim()).filter(Boolean), prices, force_update: planForceUpdate.value }
    await api(`${adminPath.value}/plan/save`, { method: 'POST', body: payload })
    if (planForm.id) await api(`${adminPath.value}/plan/update`, { method: 'POST', body: { id: planForm.id, show: planForm.show, renew: planForm.renew, sell: planForm.sell } })
    else { const created = await api(`${adminPath.value}/plan/fetch`); const match = Array.isArray(created) ? created.find(item => !beforeIds.has(Number(item.id))) : null; if (match) await api(`${adminPath.value}/plan/update`, { method: 'POST', body: { id: match.id, show: planForm.show, renew: planForm.renew, sell: planForm.sell } }) }
    planModal.value = false; await loadPlans()
  } catch (error) { planFormError.value = error.message }
  finally { planSaving.value = false }
}
async function deletePlan(plan) {
  if (!window.confirm(`删除套餐“${plan.name}”？若套餐关联用户或订单，Xboard 会拒绝删除。`)) return
  try { await api(`${adminPath.value}/plan/drop`, { method: 'POST', body: { id: plan.id } }); await loadPlans() } catch (error) { planError.value = error.message }
}
async function movePlan(index, delta) {
  const next = index + delta; if (next < 0 || next >= plans.value.length) return
  const reordered = [...plans.value]; [reordered[index], reordered[next]] = [reordered[next], reordered[index]]
  try { await api(`${adminPath.value}/plan/sort`, { method: 'POST', body: { ids: reordered.map(plan => plan.id) } }); plans.value = reordered } catch (error) { planError.value = error.message }
}
function yuan(value) { return `¥${Number(value || 0).toFixed(2)}` }
function localDateTime(timestamp) {
  if (!timestamp) return ''
  const date = new Date(Number(timestamp) * 1000)
  const pad = value => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
function timestampFromLocal(value) { return value ? Math.floor(new Date(value).getTime() / 1000) : null }
function resetUserForm() {
  Object.assign(userForm, { email: '', password: '', plan_id: '', balance: 0, transfer_gb: 0, expired_at: '', banned: false, is_admin: false, is_staff: false, commission_rate: 0, discount: 0, speed_limit: '', device_limit: '', remarks: '' })
}
function openCreateUser() {
  userMode.value = 'create'; editingUserId.value = null; userFormError.value = ''; resetUserForm(); userModal.value = true
}
async function openEditUser(user) {
  userMode.value = 'edit'; editingUserId.value = user.id; userFormError.value = ''; userSaving.value = true; userModal.value = true; resetUserForm()
  try {
    const detail = await api(`${adminPath.value}/user/getUserInfoById?id=${encodeURIComponent(user.id)}`)
    Object.assign(userForm, { email: detail.email || '', password: '', plan_id: detail.plan_id ?? '', balance: Number(detail.balance || 0), transfer_gb: Number(detail.transfer_enable || 0) / 1024 ** 3, expired_at: localDateTime(detail.expired_at), banned: Boolean(Number(detail.banned)), is_admin: Boolean(Number(detail.is_admin)), is_staff: Boolean(Number(detail.is_staff)), commission_rate: detail.commission_rate ?? 0, discount: detail.discount ?? 0, speed_limit: detail.speed_limit ?? '', device_limit: detail.device_limit ?? '', remarks: detail.remarks || '' })
    originalUserFlags.value = { banned: userForm.banned, is_admin: userForm.is_admin, is_staff: userForm.is_staff }
  } catch (error) { userFormError.value = error.message }
  finally { userSaving.value = false }
}
async function saveUser() {
  userFormError.value = ''
  if (userMode.value === 'edit' && ['banned', 'is_admin', 'is_staff'].some(key => userForm[key] !== originalUserFlags.value[key])) {
    const warning = userForm.banned && !originalUserFlags.value.banned ? '禁用后该用户的登录会话会被撤销。' : '这会调整用户的访问权限。'
    if (!window.confirm(`${warning}仍要保存吗？`)) return
  }
  userSaving.value = true
  try {
    if (userMode.value === 'create') {
      const at = userForm.email.lastIndexOf('@')
      if (at < 1 || at === userForm.email.length - 1) throw new Error('请输入完整邮箱地址。')
      const payload = { email_prefix: userForm.email.slice(0, at), email_suffix: userForm.email.slice(at + 1), generate_count: 1, password: userForm.password || undefined, plan_id: userForm.plan_id ? Number(userForm.plan_id) : null, expired_at: timestampFromLocal(userForm.expired_at) }
      await api(`${adminPath.value}/user/generate`, { method: 'POST', body: payload })
    } else {
      const payload = { id: editingUserId.value, email: userForm.email, plan_id: userForm.plan_id ? Number(userForm.plan_id) : null, balance: Number(userForm.balance || 0), transfer_enable: Math.round(Number(userForm.transfer_gb || 0) * 1024 ** 3), expired_at: timestampFromLocal(userForm.expired_at), banned: userForm.banned ? 1 : 0, is_admin: userForm.is_admin, is_staff: userForm.is_staff, commission_rate: Number(userForm.commission_rate || 0), discount: Number(userForm.discount || 0), speed_limit: userForm.speed_limit === '' ? null : Number(userForm.speed_limit), device_limit: userForm.device_limit === '' ? null : Number(userForm.device_limit), remarks: userForm.remarks }
      if (userForm.password) payload.password = userForm.password
      await api(`${adminPath.value}/user/update`, { method: 'POST', body: payload })
    }
    userModal.value = false
    await loadUsers(userPage.value)
  } catch (error) { userFormError.value = error.message }
  finally { userSaving.value = false }
}
async function deleteUser(user) {
  if (!window.confirm(`确定删除用户 ${user.email}（ID ${user.id}）及其关联数据？此操作不可撤销。`)) return
  try { await api(`${adminPath.value}/user/destroy`, { method: 'POST', body: { id: user.id } }); await loadUsers(userPage.value) }
  catch (error) { usersError.value = error.message }
}
async function resetUserSecret(user) {
  if (!window.confirm(`重置 ${user.email} 的订阅密钥？现有订阅链接将立即失效。`)) return
  try { await api(`${adminPath.value}/user/resetSecret`, { method: 'POST', body: { id: user.id } }); await loadUsers(userPage.value) }
  catch (error) { usersError.value = error.message }
}
function logout() {
  token.value = ''
  stats.value = null
  sessionStorage.removeItem('xb-admin-token')
  activeView.value = 'overview'
  if (location.hash !== '#/overview') location.hash = '/overview'
}
function money(v) { return currency(v) }
function copyText(value) { navigator.clipboard.writeText(value) }
function traffic(v) {
  const n = Number(v || 0)
  if (n >= 1024 ** 4) return `${(n / 1024 ** 4).toFixed(2)} TB`
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(2)} MB`
  return `${displayNumber(n)} B`
}
onMounted(() => {
  window.addEventListener('hashchange', () => {
    const targetView = viewFromHash()
    if (targetView !== activeView.value) void setView(targetView)
  })
  if (token.value && apiOrigin.value && hasAdminPath.value) {
    loadStats()
    void setView(activeView.value)
  }
})
</script>

<template>
  <main v-if="!token" class="connect-screen">
    <section class="connect-copy">
      <div class="brand-lockup"><span class="brand-mark"><i></i><i></i><i></i></span><span>XB <b>CONTROL</b></span></div>
      <div class="connect-intro">
        <p class="eyebrow">INDEPENDENT ADMIN CONSOLE <span>·</span> 01</p>
        <h1>你的面板，<br /><em>由你掌控。</em></h1>
        <p class="intro-text">连接现有 Xboard 服务。管理端只在本浏览器保存连接地址，登录令牌仅保留在当前会话。</p>
      </div>
      <div class="connect-foot"><span class="pulse-dot"></span> 连接前请确认服务端已启用 HTTPS</div>
      <div class="backdrop-lines" aria-hidden="true"></div>
    </section>
    <section class="connect-form-wrap">
      <div class="connect-form">
        <div class="form-heading"><p class="eyebrow">REMOTE CONNECTION</p><h2>连接你的 Xboard</h2><p>输入服务地址和管理员凭据以继续。</p></div>
        <form @submit.prevent="login">
          <label>服务地址 <span>API ORIGIN</span></label>
          <div class="input-shell"><span class="input-glyph">↗</span><input v-model="apiOrigin" type="url" placeholder="https://panel.example.com" autocomplete="url" required /></div>
          <p class="field-hint">填写网站根地址，不包含 <code>/api/v2</code>。本机示例：http://127.0.0.1:7001</p>
          <label>管理员安全路径 <span>ADMIN PATH</span></label>
          <div class="input-shell"><span class="input-glyph">⌘</span><input v-model="adminPath" type="text" placeholder="例如：your-admin-path" autocomplete="off" required /></div>
          <p class="field-hint">Xboard 后台 API 使用的隐藏路径，不是登录密码。<button class="restore-defaults" type="button" @click="restoreDefaults">恢复 Vite 默认值</button></p>
          <div class="form-rule"></div>
          <label>管理员邮箱 <span>EMAIL</span></label>
          <div class="input-shell"><span class="input-glyph">＠</span><input v-model="email" type="email" placeholder="admin@example.com" autocomplete="username" required /></div>
          <label>密码 <span>PASSWORD</span></label>
          <div class="input-shell"><span class="input-glyph">⌑</span><input v-model="password" type="password" placeholder="输入 Xboard 管理员密码" autocomplete="current-password" required /></div>
          <p v-if="message" class="notice" :class="messageKind">{{ message }}</p>
          <button class="connect-button" type="submit" :disabled="busy">{{ busy ? '正在验证…' : '安全连接' }} <span>→</span></button>
        </form>
        <div class="local-note"><span>◇</span><p>密码不会保存。连接配置保存在当前浏览器；令牌退出或关闭会话后失效。</p></div>
      </div>
    </section>
  </main>

  <main v-else class="admin-shell">
    <aside class="sidebar">
      <div class="brand-lockup sidebar-brand"><span class="brand-mark"><i></i><i></i><i></i></span><span>XB <b>CONTROL</b></span></div>
      <div class="workspace-chip"><span class="workspace-avatar">X</span><div><strong>Xboard 管理端</strong><small>REMOTE INSTANCE</small></div><span class="chevron">⌄</span></div>
      <div v-for="section in navigationSections" :key="section.name" class="nav-section">
        <p class="nav-label">{{ section.name }} / {{ section.name === '工作区' ? 'WORKSPACE' : section.name === '运营管理' ? 'OPERATIONS' : section.name === '基础设施' ? 'INFRASTRUCTURE' : section.name === '账户与内容' ? 'CUSTOMERS' : section.name === '扩展' ? 'EXTENSIONS' : 'SYSTEM' }}</p>
        <nav><button v-for="view in section.items" :key="view.id" class="nav-item" :class="{ active: activeView === view.id }" @click="setView(view.id)"><span class="nav-glyph">{{ view.glyph }}</span><span>{{ view.name }}</span><span v-if="view.id === 'overview'" class="nav-current"></span></button></nav>
      </div>
      <div class="mobile-nav"><button v-for="view in views" :key="view.id" :class="{ active: activeView === view.id }" @click="setView(view.id)"><span>{{ view.glyph }}</span>{{ view.name }}</button></div>
      <div class="sidebar-bottom"><div class="connection-state"><span class="pulse-dot"></span><div><b>已连接</b><small>{{ apiOriginClean }}</small></div></div><button class="logout-button" @click="logout">退出登录 <span>↗</span></button></div>
    </aside>
    <section class="main-panel">
      <header class="topbar"><div class="crumb">工作区 <span>/</span> {{ currentView.name }}</div><div class="top-actions"><span class="live-pill"><i></i> LIVE API</span><span class="top-date">{{ new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }) }}</span><button class="avatar-button">{{ email.slice(0, 1).toUpperCase() }}</button></div></header>
      <div class="page-content">
        <section v-if="activeView === 'overview'" class="overview-view">
          <div class="page-title-row"><div><p class="eyebrow">OPERATIONS / {{ currentView.en }}</p><h1>运营概览<span class="title-period">.</span></h1><p class="page-subtitle">连接到 <b>{{ apiOriginClean }}</b> 的实时数据</p></div><button class="refresh-button" @click="loadStats">↻ <span>刷新数据</span></button></div>
          <div v-if="statsError" class="api-error"><span>!</span><div><b>统计接口暂不可用</b><p>{{ statsError }}。请确认管理员路径与账号权限。</p></div><button @click="loadStats">重试</button></div>
          <div class="metric-grid">
            <article class="metric-card"><div class="metric-top"><span>今日收入</span><span class="metric-icon teal">￥</span></div><div class="metric-value">{{ stats ? money(stats.day_income) : '—' }}</div><div class="metric-foot"><span class="metric-caption">已支付订单总额</span><span class="trend-mark">↗</span></div><div class="metric-line teal-line"></div></article>
            <article class="metric-card"><div class="metric-top"><span>本月收入</span><span class="metric-icon amber">◷</span></div><div class="metric-value">{{ stats ? money(stats.month_income) : '—' }}</div><div class="metric-foot"><span class="metric-caption">本月累计</span><span class="trend-mark amber-text">↗</span></div><div class="metric-line amber-line"></div></article>
            <article class="metric-card"><div class="metric-top"><span>本月新用户</span><span class="metric-icon blue">◎</span></div><div class="metric-value">{{ stats ? displayNumber(stats.month_register_total) : '—' }}</div><div class="metric-foot"><span class="metric-caption">新增注册用户</span><span class="trend-mark blue-text">＋</span></div><div class="metric-line blue-line"></div></article>
            <article class="metric-card"><div class="metric-top"><span>待处理工单</span><span class="metric-icon rose">✳</span></div><div class="metric-value">{{ stats ? displayNumber(stats.ticket_pending_total) : '—' }}</div><div class="metric-foot"><span class="metric-caption">需要关注</span><span class="trend-mark rose-text">→</span></div><div class="metric-line rose-line"></div></article>
          </div>
          <div class="data-grid">
            <article class="data-panel traffic-panel"><div class="panel-heading"><div><p class="eyebrow">NETWORK / 24H</p><h2>流量使用</h2></div><span class="panel-menu">···</span></div><div class="traffic-total">{{ stats ? traffic(stats.today_traffic?.total) : '—' }}<small>今日总流量</small></div><div class="traffic-bars"><span style="height: 29%"></span><span style="height: 44%"></span><span style="height: 37%"></span><span style="height: 61%"></span><span style="height: 53%"></span><span style="height: 72%"></span><span style="height: 48%"></span><span style="height: 84%"></span><span style="height: 66%"></span><span style="height: 91%"></span><span style="height: 76%"></span><span style="height: 100%"></span><span style="height: 69%"></span><span style="height: 82%"></span><span style="height: 56%"></span><span style="height: 73%"></span><span style="height: 49%"></span><span style="height: 63%"></span><span style="height: 44%"></span><span style="height: 58%"></span><span style="height: 38%"></span><span style="height: 52%"></span><span style="height: 31%"></span><span style="height: 45%"></span></div><div class="chart-labels"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span></div><div class="traffic-legend"><span><i class="upload-dot"></i> 上行 {{ stats ? traffic(stats.today_traffic?.upload) : '—' }}</span><span><i class="download-dot"></i> 下行 {{ stats ? traffic(stats.today_traffic?.download) : '—' }}</span></div><p class="chart-disclaimer">柱形为界面占位示意；真实分时曲线需接入历史统计接口。</p></article>
            <article class="data-panel health-panel"><div class="panel-heading"><div><p class="eyebrow">SYSTEM / STATUS</p><h2>服务状态</h2></div><span class="status-label"><i></i> 正常运行</span></div><div class="health-row"><div class="health-icon">⌁</div><div><b>在线节点</b><small>当前可用节点</small></div><strong>{{ stats ? displayNumber(stats.online_nodes) : '—' }}</strong></div><div class="health-row"><div class="health-icon users-icon">◎</div><div><b>在线用户</b><small>近 10 分钟活跃</small></div><strong>{{ stats ? displayNumber(stats.online_users) : '—' }}</strong></div><div class="health-row"><div class="health-icon device-icon">▦</div><div><b>在线设备</b><small>当前在线设备数</small></div><strong>{{ stats ? displayNumber(stats.online_devices) : '—' }}</strong></div><div class="health-bottom"><span>接口状态</span><b><i></i> {{ statsError ? '需要检查' : stats ? '已同步' : '正在加载' }}</b></div></article>
          </div>
          <div class="footer-note"><span>XB CONTROL ROOM</span><span>数据由 Xboard API 提供 <i>·</i> 不在面板本地存储</span></div>
        </section>
        <ContentManagement v-else-if="['notices', 'knowledge'].includes(activeView)" :kind="activeView" :api="api" />
        <CouponManagement v-else-if="activeView === 'coupons'" :api="api" :download="download" />
        <PaymentManagement v-else-if="activeView === 'payments'" :api="api" />
        <GiftCardManagement v-else-if="activeView === 'gift-cards'" :api="api" :download="download" />
        <MachineManagement v-else-if="activeView === 'machines'" :api="api" />
        <ServerManagement v-else-if="activeView === 'servers'" :api="api" />
        <StatisticsDashboard v-else-if="activeView === 'statistics'" :api="api" />
        <TrafficResetManagement v-else-if="activeView === 'traffic-reset'" :api="api" />
        <SystemConfigManagement v-else-if="activeView === 'configuration'" :api="api" :current-path="adminPath" :on-secure-path="updateSecurePath" />
        <MailTemplateManagement v-else-if="activeView === 'mail'" :api="api" />
        <SystemDashboard v-else-if="activeView === 'system'" :api="api" />
        <ThemeManagement v-else-if="activeView === 'themes'" :api="api" />
        <PluginManagement v-else-if="activeView === 'plugins'" :api="api" />
        <section v-else-if="activeView === 'tickets'" class="tickets-view">
          <div class="page-title-row"><div><p class="eyebrow">OPERATIONS / SUPPORT</p><h1>工单<span class="title-period">.</span></h1><p class="page-subtitle">查看用户问题、回复并关闭已处理工单</p></div><div class="ticket-filter"><label>状态<select v-model="ticketStatusFilter" @change="loadTickets(1)"><option value="">全部工单</option><option value="0">待处理</option><option value="1">已关闭</option></select></label></div></div>
          <div v-if="ticketError" class="api-error"><span>!</span><div><b>工单操作未完成</b><p>{{ ticketError }}</p></div><button @click="loadTickets(ticketPage)">重试</button></div>
          <div class="users-table-wrap"><div v-if="ticketLoading" class="table-state">正在读取工单…</div><div v-else-if="!tickets.length" class="table-state">没有匹配的工单。</div><table v-else class="users-table ticket-table"><thead><tr><th>主题</th><th>用户</th><th>优先级</th><th>回复状态</th><th>更新时间</th><th>状态 / 操作</th></tr></thead><tbody><tr v-for="ticket in tickets" :key="ticket.id"><td><b class="ticket-subject">{{ ticket.subject || `工单 #${ticket.id}` }}</b><small class="order-id">ID {{ ticket.id }}</small></td><td>{{ ticket.user?.email || ticket.user_id || '—' }}</td><td>{{ ticket.level ?? '—' }}</td><td>{{ ticket.reply_status === 1 ? '管理员已回复' : '待管理员回复' }}</td><td>{{ ticketDate(ticket.updated_at) }}</td><td><div class="order-actions"><span class="user-status" :class="{ disabled: Number(ticket.status) !== 0 }">{{ ticketStatus(ticket.status) }}</span><button @click="openTicket(ticket)">查看 / 回复</button><button v-if="Number(ticket.status) === 0" class="danger-action" @click="closeTicket(ticket)">关闭</button></div></td></tr></tbody></table></div>
          <div class="table-pagination"><span>第 {{ ticketPage }} 页 · 共 {{ ticketTotal }} 张工单</span><div><button :disabled="ticketPage <= 1 || ticketLoading" @click="loadTickets(ticketPage - 1)">← 上一页</button><button :disabled="ticketPage * 25 >= ticketTotal || ticketLoading" @click="loadTickets(ticketPage + 1)">下一页 →</button></div></div>
          <div class="footer-note"><span>XB CONTROL ROOM</span><span>工单消息直接写入 Xboard <i>·</i> 回复后会刷新会话</span></div>
          <div v-if="ticketDetail || ticketDetailLoading" class="modal-backdrop" @click.self="ticketDetail = null"><section class="user-modal ticket-modal" role="dialog" aria-modal="true"><header class="modal-header"><div><p class="eyebrow">SUPPORT / TICKET {{ ticketDetail?.id || '' }}</p><h2>{{ ticketDetail?.subject || '工单会话' }}</h2><span v-if="ticketDetail" class="label-hint">{{ ticketDetail.user?.email }} · {{ ticketStatus(ticketDetail.status) }}</span></div><button class="modal-close" @click="ticketDetail = null">×</button></header><div v-if="ticketDetailLoading" class="modal-loading">正在读取会话…</div><template v-else-if="ticketDetail"><div class="ticket-messages"><article v-for="msg in ticketDetail.messages || []" :key="msg.id" class="ticket-message" :class="{ staff: msg.is_admin || msg.user_id !== ticketDetail.user_id }"><div><b>{{ msg.user?.email || (msg.user_id === ticketDetail.user_id ? ticketDetail.user?.email : '管理员') }}</b><time>{{ ticketDate(msg.created_at) }}</time></div><p>{{ msg.message }}</p></article></div><form v-if="Number(ticketDetail.status) === 0" class="ticket-reply" @submit.prevent="replyTicket"><label>回复用户<textarea v-model="ticketReplyText" required rows="4" placeholder="输入回复内容…"></textarea></label><div><button type="button" class="cancel-button" @click="closeTicket(ticketDetail)">关闭工单</button><button type="submit" class="save-button" :disabled="ticketReplying || !ticketReplyText.trim()">{{ ticketReplying ? '发送中…' : '发送回复' }}</button></div></form></template></section></div>
        </section>
        <section v-else-if="activeView === 'plans'" class="plans-view">
          <div class="page-title-row"><div><p class="eyebrow">OPERATIONS / CATALOG</p><h1>套餐<span class="title-period">.</span></h1><p class="page-subtitle">订阅方案、价格和销售状态</p></div><button class="assign-order-button" @click="openCreatePlan">＋ 新建套餐</button></div>
          <div v-if="planError" class="api-error"><span>!</span><div><b>套餐操作未完成</b><p>{{ planError }}</p></div><button @click="loadPlans">重试</button></div>
          <div class="users-table-wrap"><div v-if="plansLoading" class="table-state">正在读取套餐…</div><div v-else-if="!plans.length" class="table-state">还没有套餐，创建第一个订阅方案。</div><table v-else class="users-table plan-table"><thead><tr><th>套餐</th><th>价格</th><th>流量 / 限制</th><th>用户</th><th>销售状态</th><th>排序</th><th>操作</th></tr></thead><tbody><tr v-for="(plan,index) in plans" :key="plan.id"><td><div class="user-cell"><span class="user-initial">{{ plan.name.slice(0,1) }}</span><span><b>{{ plan.name }}</b><small>ID {{ plan.id }} · {{ plan.group?.name || `组 ${plan.group_id || '未分配'}` }}</small></span></div></td><td><div class="plan-prices"><span v-for="period in pricePeriods.filter(item => plan.prices?.[item.key] != null).slice(0,3)" :key="period.key">{{ period.name }} {{ yuan(plan.prices[period.key]) }}</span><span v-if="!Object.keys(plan.prices || {}).length">未设价格</span></div></td><td>{{ plan.transfer_enable }} GB <small>· {{ plan.speed_limit || '不限' }} Mbps · {{ plan.device_limit || '不限设备' }}</small></td><td>{{ plan.users_count || 0 }} <small>（有效 {{ plan.active_users_count || 0 }}）</small></td><td><span class="user-status" :class="{ disabled: !plan.sell || !plan.show }">{{ !plan.show ? '已隐藏' : !plan.sell ? '停售' : '销售中' }}</span></td><td><div class="sort-actions"><button :disabled="index===0" @click="movePlan(index,-1)">↑</button><button :disabled="index===plans.length-1" @click="movePlan(index,1)">↓</button></div></td><td><div class="row-actions"><button @click="openEditPlan(plan)">编辑</button><button class="danger-action" @click="deletePlan(plan)">删除</button></div></td></tr></tbody></table></div>
          <div class="footer-note"><span>XB CONTROL ROOM</span><span>编辑套餐默认影响后续购买 <i>·</i> 同步已有用户需显式确认</span></div>
          <div v-if="planModal" class="modal-backdrop" @click.self="planModal = false"><section class="user-modal plan-modal" role="dialog" aria-modal="true"><header class="modal-header"><div><p class="eyebrow">CATALOG / {{ planForm.id ? 'EDIT' : 'CREATE' }}</p><h2>{{ planForm.id ? `编辑套餐 · ${planForm.id}` : '新建套餐' }}</h2></div><button class="modal-close" @click="planModal = false">×</button></header><form class="user-form plan-form" @submit.prevent="savePlan"><label>套餐名称<input v-model.trim="planForm.name" required maxlength="255" /></label><div class="form-pair"><label>权限组<select v-model="planForm.group_id"><option value="">未分配</option><option v-for="group in planGroups" :key="group.id" :value="group.id">{{ group.name }} · ID {{ group.id }}</option></select></label><label>流量额度（GB）<input v-model.number="planForm.transfer_gb" type="number" min="1" step="1" required /></label></div><div class="form-pair"><label>限速（Mbps）<input v-model.number="planForm.speed_limit" type="number" min="0" placeholder="不限" /></label><label>设备限制<input v-model.number="planForm.device_limit" type="number" min="0" placeholder="不限" /></label></div><div class="form-pair"><label>人数上限<input v-model.number="planForm.capacity_limit" type="number" min="0" placeholder="不限" /></label><label>流量重置方式<select v-model="planForm.reset_traffic_method"><option value="">跟随系统</option><option value="0">每月 1 日</option><option value="1">按月</option><option value="2">不重置</option><option value="3">每年 1 月 1 日</option><option value="4">按年</option></select></label></div><div class="price-grid"><label v-for="period in pricePeriods" :key="period.key">{{ period.name }}（元）<input v-model="planForm.prices[period.key]" type="number" min="0" step="0.01" placeholder="不开放" /></label></div><label>标签（逗号分隔）<input v-model="planForm.tags" placeholder="热门, 推荐" /></label><label>套餐说明<textarea v-model="planForm.content" rows="3"></textarea></label><div class="toggle-row"><label><input v-model="planForm.show" type="checkbox" /> 前台显示</label><label><input v-model="planForm.sell" type="checkbox" /> 允许新购</label><label><input v-model="planForm.renew" type="checkbox" /> 允许续费</label></div><label class="force-update"><input v-model="planForceUpdate" type="checkbox" /> 同步修改已有套餐用户的流量、权限组、限速和设备限制</label><p v-if="planFormError" class="notice">{{ planFormError }}</p><footer class="modal-footer"><button type="button" class="cancel-button" @click="planModal = false">取消</button><button type="submit" class="save-button" :disabled="planSaving">{{ planSaving ? '保存中…' : '保存套餐' }}</button></footer></form></section></div>
        </section>
        <section v-else-if="activeView === 'orders'" class="orders-view">
          <div class="page-title-row"><div><p class="eyebrow">OPERATIONS / BILLING</p><h1>订单<span class="title-period">.</span></h1><p class="page-subtitle">真实订单数据 · 待支付订单支持人工处理</p></div><div class="order-tools"><form class="user-search" @submit.prevent="loadOrders(1)"><input v-model="orderQuery" placeholder="按交易单号搜索" aria-label="按交易单号搜索订单" /><button type="submit">搜索</button></form><button class="assign-order-button" @click="openAssignOrder">＋ 分配订阅</button></div></div>
          <div v-if="orderError" class="api-error"><span>!</span><div><b>订单操作未完成</b><p>{{ orderError }}</p></div><button @click="loadOrders(orderPage)">重试</button></div>
          <div class="users-table-wrap"><div v-if="orderLoading" class="table-state">正在读取订单…</div><div v-else-if="!orders.length" class="table-state">没有匹配的订单。</div><table v-else class="users-table order-table"><thead><tr><th>交易单号</th><th>用户</th><th>套餐</th><th>类型</th><th>金额</th><th>佣金状态（系统）</th><th>创建时间</th><th>状态 / 操作</th></tr></thead><tbody><tr v-for="order in orders" :key="order.id"><td><code class="trade-code">{{ order.trade_no }}</code><small class="order-id">ID {{ order.id }}</small></td><td>{{ order.user_id }}</td><td>{{ order.plan?.name || order.plan_id || '—' }}</td><td>{{ orderType(order.type) }}</td><td>{{ money(order.total_amount) }}</td><td><span class="user-status" :class="{ disabled: Number(order.commission_status) !== 2 }">{{ commissionStatus(order.commission_status) }}</span></td><td>{{ createdAt(order.created_at) }}</td><td><div class="order-actions"><span class="user-status" :class="{ disabled: [0, 2].includes(Number(order.status)) }">{{ orderStatus(order.status) }}</span><button @click="openOrder(order)">详情</button><button v-if="Number(order.status) === 0" @click="setOrderAction('paid', order)">标记支付</button><button v-if="Number(order.status) === 0" class="danger-action" @click="setOrderAction('cancel', order)">取消</button></div></td></tr></tbody></table></div>
          <div class="table-pagination"><span>第 {{ orderPage }} 页 · 当前页 {{ orders.length }} 笔订单</span><div><button :disabled="orderPage <= 1 || orderLoading" @click="loadOrders(orderPage - 1)">← 上一页</button><button :disabled="orders.length < 25 || orderLoading" @click="loadOrders(orderPage + 1)">下一页 →</button></div></div>
          <div class="footer-note"><span>XB CONTROL ROOM</span><span>付款与取消将直接影响测试库订单 <i>·</i> 执行前需确认</span></div>
          <div v-if="orderDetail || orderDetailLoading" class="modal-backdrop" @click.self="orderDetail = null"><section class="user-modal detail-modal" role="dialog" aria-modal="true"><header class="modal-header"><div><p class="eyebrow">BILLING / ORDER DETAIL</p><h2>订单详情</h2></div><button class="modal-close" @click="orderDetail = null">×</button></header><div v-if="orderDetailLoading" class="modal-loading">正在读取订单…</div><div v-else class="order-detail-body"><section class="order-detail-section"><h3>订单信息</h3><dl class="order-detail-grid"><template v-for="field in orderDetailFields(orderDetail)" :key="field.key"><dt>{{field.label}}</dt><dd>{{field.value}}</dd></template></dl></section><template v-for="key in ['user','plan','invite_user']" :key="key"><section v-if="orderDetail?.[key]" class="order-detail-section"><h3>{{({user:'用户信息',plan:'套餐信息',invite_user:'邀请人信息'})[key]}}</h3><dl class="order-detail-grid"><template v-for="field in orderDetailFields(orderDetail[key])" :key="field.key"><dt>{{field.label}}</dt><dd>{{field.value}}</dd></template></dl></section></template><section v-if="orderDetail?.commission_log?.length" class="order-detail-section"><h3>佣金记录 · {{orderDetail.commission_log.length}}</h3><div v-for="(log,index) in orderDetail.commission_log" :key="log.id||index" class="order-detail-log"><span>记录 {{log.id||index+1}}</span><span>邀请人 ID {{log.invite_user_id||'—'}}</span><span>佣金对象 ID {{log.user_id||'—'}}</span><span>订单金额 {{money(log.order_amount||0)}}</span><span>佣金金额 {{money(log.get_amount||0)}}</span><span>{{createdAt(log.created_at)}}</span></div></section><section v-if="orderDetail?.surplus_orders?.length" class="order-detail-section"><h3>折抵来源订单 · {{orderDetail.surplus_orders.length}}</h3><div v-for="row in orderDetail.surplus_orders" :key="row.id" class="order-detail-log"><span>订单 {{row.trade_no||row.id}}</span><span>金额 {{money(row.total_amount)}}</span><span>{{orderStatus(row.status)}}</span></div></section></div></section></div>
          <div v-if="assignModal" class="modal-backdrop" @click.self="assignModal = false"><section class="user-modal" role="dialog" aria-modal="true"><header class="modal-header"><div><p class="eyebrow">BILLING / ASSIGN</p><h2>为用户分配订阅</h2></div><button class="modal-close" @click="assignModal = false">×</button></header><form class="user-form" @submit.prevent="assignOrder"><label>用户邮箱<input v-model.trim="assignForm.email" type="email" required /></label><label>套餐<select v-model="assignForm.plan_id" required><option disabled value="">选择套餐</option><option v-for="plan in plans" :key="plan.id" :value="plan.id">{{ plan.name }} · ID {{ plan.id }}</option></select></label><label>订阅周期<select v-model="assignForm.period"><option value="month_price">月付</option><option value="quarter_price">季付</option><option value="half_year_price">半年付</option><option value="year_price">年付</option><option value="two_year_price">两年付</option><option value="three_year_price">三年付</option><option value="onetime_price">一次性</option><option value="reset_price">流量重置</option></select></label><label>订单金额（元）<input v-model.number="assignForm.total_amount" type="number" min="0" step="0.01" required /></label><p v-if="assignError" class="notice">{{ assignError }}</p><footer class="modal-footer"><button type="button" class="cancel-button" @click="assignModal = false">取消</button><button type="submit" class="save-button" :disabled="assignSaving">{{ assignSaving ? '正在分配…' : '创建并分配' }}</button></footer></form></section></div>
        </section>
        <section v-else-if="activeView === 'users'" class="users-view">
          <div class="page-title-row"><div><p class="eyebrow">PEOPLE / DIRECTORY</p><h1>用户<span class="title-period">.</span></h1><p class="page-subtitle">Xboard 用户目录与管理接口</p></div><div class="user-tools"><div class="pane-switch"><button :class="{ selected: userPane === 'directory' }" @click="userPane = 'directory'">用户目录</button><button :class="{ selected: userPane === 'api' }" @click="userPane = 'api'">全部用户操作</button></div><form v-if="userPane === 'directory'" class="user-search" @submit.prevent="loadUsers(1)"><input v-model="userQuery" placeholder="按邮箱搜索" aria-label="按邮箱搜索用户" /><button type="submit">搜索</button></form></div></div>
          <template v-if="userPane === 'directory'">
          <div v-if="usersError" class="api-error"><span>!</span><div><b>用户列表暂不可用</b><p>{{ usersError }}</p></div><button @click="loadUsers(userPage)">重试</button></div>
          <div class="users-table-wrap"><div v-if="usersLoading" class="table-state">正在读取用户目录…</div><div v-else-if="!users.length" class="table-state">{{ userQuery ? '没有匹配的用户。' : '当前页没有用户数据。' }}</div><table v-else class="users-table"><thead><tr><th>用户</th><th>套餐</th><th>余额</th><th>流量使用</th><th>到期时间</th><th>状态</th><th>操作</th></tr></thead><tbody><tr v-for="user in users" :key="user.id"><td><div class="user-cell"><span class="user-initial">{{ (user.email || '?').slice(0, 1).toUpperCase() }}</span><span><b>{{ user.email || '—' }}</b><small>ID {{ user.id }}</small></span></div></td><td>{{ user.plan?.name || '未订阅' }}</td><td>{{ money(user.balance * 100) }}</td><td>{{ traffic(user.total_used) }} / {{ traffic(user.transfer_enable) }}</td><td>{{ user.expired_at ? new Date(user.expired_at * 1000).toLocaleDateString('zh-CN') : '—' }}</td><td><span class="user-status" :class="{ disabled: user.banned }">{{ user.banned ? '已禁用' : '正常' }}</span></td><td><div class="row-actions"><button @click="openEditUser(user)">编辑</button><button @click="resetUserSecret(user)">重置密钥</button><button class="danger-action" @click="deleteUser(user)">删除</button></div></td></tr></tbody></table></div>
          <div class="table-pagination"><span>第 {{ userPage }} 页 · 当前页 {{ users.length }} 位用户</span><div><button :disabled="userPage <= 1 || usersLoading" @click="loadUsers(userPage - 1)">← 上一页</button><button :disabled="users.length < 25 || usersLoading" @click="loadUsers(userPage + 1)">下一页 →</button><button class="create-user-button" @click="openCreateUser">＋ 新建用户</button></div></div>
          <div class="footer-note"><span>XB CONTROL ROOM</span><span>用户目录只读 <i>·</i> 需要管理操作时切换至“全部用户操作”</span></div>
          </template>
          <ApiWorkbench v-else-if="currentGroup" :group="currentGroup" :api="api" :download="download" />
        </section>
        <ApiWorkbench v-else-if="currentGroup" :group="currentGroup" :api="api" :download="download" />
      </div>
    </section>
    <div v-if="userModal" class="modal-backdrop" @click.self="userModal = false">
      <section class="user-modal" role="dialog" aria-modal="true" :aria-label="userMode === 'create' ? '新建用户' : '编辑用户'">
        <header class="modal-header"><div><p class="eyebrow">PEOPLE / {{ userMode === 'create' ? 'CREATE' : 'EDIT' }}</p><h2>{{ userMode === 'create' ? '新建用户' : `编辑用户 · ${editingUserId}` }}</h2></div><button class="modal-close" @click="userModal = false">×</button></header>
        <div v-if="userSaving && userMode === 'edit'" class="modal-loading">正在读取用户详情…</div>
        <form v-else class="user-form" @submit.prevent="saveUser">
          <label>邮箱地址<input v-model.trim="userForm.email" type="email" required placeholder="name@example.com" /></label>
          <label>{{ userMode === 'create' ? '初始密码（留空则按 Xboard 默认规则生成）' : '新密码（留空保持不变）' }}<input v-model="userForm.password" type="password" :minlength="userMode === 'create' || userForm.password ? 8 : undefined" placeholder="可选" /></label>
          <label>套餐<select v-model="userForm.plan_id"><option value="">无套餐</option><option v-for="plan in plans" :key="plan.id" :value="plan.id">{{ plan.name }} · ID {{ plan.id }}</option></select></label>
          <label>到期时间 <span class="label-hint">留空表示长期有效</span><input v-model="userForm.expired_at" type="datetime-local" /></label>
          <template v-if="userMode === 'edit'">
            <div class="form-pair"><label>账户余额（元）<input v-model.number="userForm.balance" type="number" step="0.01" /></label><label>流量额度（GB）<input v-model.number="userForm.transfer_gb" type="number" min="0" step="0.1" /></label></div>
            <div class="form-pair"><label>返利比例（%）<input v-model.number="userForm.commission_rate" type="number" min="0" max="100" /></label><label>专属折扣（%）<input v-model.number="userForm.discount" type="number" min="0" max="100" /></label></div>
            <div class="form-pair"><label>速度限制（Mbps）<input v-model.number="userForm.speed_limit" type="number" min="0" placeholder="不限" /></label><label>设备限制<input v-model.number="userForm.device_limit" type="number" min="0" placeholder="不限" /></label></div>
            <div class="toggle-row"><label><input v-model="userForm.banned" type="checkbox" /> 禁用账户</label><label><input v-model="userForm.is_admin" type="checkbox" /> 管理员</label><label><input v-model="userForm.is_staff" type="checkbox" /> 员工</label></div>
            <label>备注<textarea v-model="userForm.remarks" rows="3" placeholder="内部备注"></textarea></label>
          </template>
          <p v-if="userFormError" class="notice">{{ userFormError }}</p>
          <footer class="modal-footer"><button type="button" class="cancel-button" @click="userModal = false">取消</button><button type="submit" class="save-button" :disabled="userSaving">{{ userSaving ? '保存中…' : userMode === 'create' ? '创建用户' : '保存修改' }}</button></footer>
        </form>
      </section>
    </div>
  </main>
</template>
