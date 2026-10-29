# Xboard Admin API 开发参考

> 本文按本项目当前调用的 Xboard V2 管理 API 整理。接口属于 Xboard 后端；不同分支或版本可能有差异。请求字段以目标实例对应的 Controller / FormRequest 校验为准。本表中的方法表示本管理端实际使用的方法；个别 Xboard 路由声明为 `any`，所以也可能接受其他 HTTP 方法。

## 1. 地址与认证

- Xboard 服务根地址：`https://your-xboard.example`，不含结尾路径斜杠。
- API 前缀：`/api/v2`。
- 管理 API 前缀：`/api/v2/{admin_path}`。其中 `admin_path` 是 Xboard 设置的安全后台路径，按普通路径段传入。
- 登录接口不带管理员安全路径：`POST /api/v2/passport/auth/login`。
- 登录成功后使用响应中的 `data.auth_data` 作为 `Authorization` 请求头的完整值。当前 Xboard 返回值自身已带 `Bearer ` 前缀，不要再重复拼接。
- 登录响应中的 `data.is_admin` 必须为 `true`。令牌有有效期；过期、撤销或非管理员通常会得到 HTTP 403。

### 登录并读取用户列表（JavaScript）

```js
const origin = 'https://your-xboard.example'
const adminPath = 'your-admin-path'

const loginResponse = await fetch(`${origin}/api/v2/passport/auth/login`, {
  method: 'POST',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ email: 'admin@example.invalid', password: 'replace-me' }),
})
const login = await loginResponse.json()
if (!loginResponse.ok || login.data?.is_admin !== true) {
  throw new Error(login.message || '管理员登录失败')
}

const usersResponse = await fetch(
  `${origin}/api/v2/${encodeURIComponent(adminPath)}/user/fetch?current=1&pageSize=25`,
  {
    headers: {
      Accept: 'application/json',
      Authorization: login.data.auth_data,
    },
  },
)
if (!usersResponse.ok) throw new Error(`用户列表请求失败：HTTP ${usersResponse.status}`)
const usersPage = await usersResponse.json()
console.log(usersPage.data) // 当前 Xboard 分页响应中的当前页记录
```

示例凭据不可用。开发时应从环境变量或本地秘密管理器读取凭据；不要提交密码、令牌或真实管理员路径。生产连接应使用 HTTPS。

## 2. 请求与响应约定

### 请求

- JSON 写请求使用 `Content-Type: application/json`，并将参数放在 JSON body。
- GET 查询参数放在 URL query。分页常见参数为 `current` 和 `pageSize`；过滤参数采用 Xboard 的 `filter[index][id]` / `filter[index][value]` 形式。不同接口支持的过滤字段不完全相同。
- 用户邮箱过滤示例：`/user/fetch?current=1&pageSize=25&filter[0][id]=email&filter[0][value]=demo%40example.invalid`。订单号过滤示例把字段名换成 `trade_no`。
- ZIP 上传接口使用 `multipart/form-data`，文件字段名为 `file`；让 HTTP 客户端自动生成 multipart boundary。
- 下载接口返回文件流，不应按 JSON 解析：`user/dumpCSV`、`gift-card/export-codes`；`coupon/generate` 批量生成和 `gift-card/generate-codes` 启用 CSV 参数时也可能返回文件。主题/插件包上传使用 `theme/upload`、`plugin/upload`。
- 破坏性或会改变站点状态的接口使用 POST；调用前确认目标实例和参数。

### JSON 响应

大多数成功接口使用如下信封：

```json
{
  "status": "success",
  "message": "Success",
  "data": {},
  "error": null
}
```

失败时通常为 `status: "fail"`，详细信息见 `message` / `error`，并可能使用非 2xx HTTP 状态。管理员鉴权中间件返回的 403 可能是简化结构（例如 `{"message":"Unauthorized"}`）。

分页接口使用 Laravel 风格的分页结构，当前 Xboard 的 `paginate()` 直接返回该结构，而非统一信封：

```json
{
  "total": 125,
  "current_page": 1,
  "per_page": 25,
  "last_page": 5,
  "data": []
}
```

列表接口也可能直接在标准信封的 `data` 中返回数组。请按接口实际响应判断，不要假定所有列表都带分页字段。

### 跨域

浏览器直接请求时，Xboard 的 CORS 配置需允许管理端来源、`Authorization`、`Content-Type` 和 OPTIONS 预检请求。跨域失败通常表现为浏览器的网络错误，而不是可读取的 JSON 错误响应。

## 3. 登录接口

| 方法 | 路径 | 参数 | 说明 |
|---|---|---|---|
| POST | `/api/v2/passport/auth/login` | JSON：`email`、`password` | 返回 `data.auth_data`、`data.is_admin`；该路径不包含管理员安全路径 |

## 4. 管理接口目录

除登录接口外，以下路径均以 `/api/v2/{admin_path}/` 为前缀。`工作台确认` 表示本项目 API 工作台发送前是否弹出二次确认；它不代表接口只读或无风险。POST 接口仍须先核实参数与目标实例。具体字段请查看对应 Xboard Controller / FormRequest；页面覆盖和兼容差异见 [MIGRATION.md](../MIGRATION.md)。

### 订单

| 方法 | 路径 | 用途 | 工作台确认 | 后端状态 |
|---|---|---|---|
| GET | <code>/api/v2/{admin_path}/order/fetch</code> | 订单列表 | 否 | — |
| POST | <code>/api/v2/{admin_path}/order/detail</code> | 订单详情 | 否 | — |
| POST | <code>/api/v2/{admin_path}/order/update</code> | 更新订单 | 否 | — |
| POST | <code>/api/v2/{admin_path}/order/assign</code> | 分配订单 | 是 | — |
| POST | <code>/api/v2/{admin_path}/order/paid</code> | 标记已支付 | 是 | — |
| POST | <code>/api/v2/{admin_path}/order/cancel</code> | 取消订单 | 是 | — |


### 套餐

| 方法 | 路径 | 用途 | 工作台确认 | 后端状态 |
|---|---|---|---|
| GET | <code>/api/v2/{admin_path}/plan/fetch</code> | 套餐列表 | 否 | — |
| POST | <code>/api/v2/{admin_path}/plan/save</code> | 保存套餐 | 是 | — |
| POST | <code>/api/v2/{admin_path}/plan/update</code> | 更新套餐状态 | 是 | — |
| POST | <code>/api/v2/{admin_path}/plan/sort</code> | 排序套餐 | 是 | — |
| POST | <code>/api/v2/{admin_path}/plan/drop</code> | 删除套餐 | 是 | — |


### 工单

| 方法 | 路径 | 用途 | 工作台确认 | 后端状态 |
|---|---|---|---|
| GET | <code>/api/v2/{admin_path}/ticket/fetch</code> | 工单列表 | 否 | — |
| POST | <code>/api/v2/{admin_path}/ticket/reply</code> | 回复工单 | 是 | — |
| POST | <code>/api/v2/{admin_path}/ticket/close</code> | 关闭工单 | 是 | — |


### 公告

| 方法 | 路径 | 用途 | 工作台确认 | 后端状态 |
|---|---|---|---|
| GET | <code>/api/v2/{admin_path}/notice/fetch</code> | 公告列表 | 否 | — |
| POST | <code>/api/v2/{admin_path}/notice/save</code> | 保存公告 | 是 | — |
| POST | <code>/api/v2/{admin_path}/notice/update</code> | 更新公告（后端未实现）；当前路由对应的控制器方法缺失 | 否 | 后端缺失 |
| POST | <code>/api/v2/{admin_path}/notice/show</code> | 显示 / 隐藏 | 是 | — |
| POST | <code>/api/v2/{admin_path}/notice/sort</code> | 排序公告 | 是 | — |
| POST | <code>/api/v2/{admin_path}/notice/drop</code> | 删除公告 | 是 | — |


### 用户

| 方法 | 路径 | 用途 | 工作台确认 | 后端状态 |
|---|---|---|---|
| GET | <code>/api/v2/{admin_path}/user/fetch</code> | 用户列表 | 否 | — |
| GET | <code>/api/v2/{admin_path}/user/getUserInfoById</code> | 用户详情 | 否 | — |
| POST | <code>/api/v2/{admin_path}/user/update</code> | 更新用户 | 是 | — |
| POST | <code>/api/v2/{admin_path}/user/generate</code> | 生成用户 | 是 | — |
| POST | <code>/api/v2/{admin_path}/user/ban</code> | 封禁 / 解封 | 是 | — |
| POST | <code>/api/v2/{admin_path}/user/resetSecret</code> | 重置订阅密钥 | 是 | — |
| POST | <code>/api/v2/{admin_path}/user/setInviteUser</code> | 设置邀请关系（后端未实现）；当前路由对应的控制器方法缺失 | 否 | 后端缺失 |
| POST | <code>/api/v2/{admin_path}/user/sendMail</code> | 发送邮件 | 是 | — |
| POST | <code>/api/v2/{admin_path}/user/dumpCSV</code> | 导出 CSV | 否 | — |
| POST | <code>/api/v2/{admin_path}/user/destroy</code> | 删除用户 | 是 | — |


### 知识库

| 方法 | 路径 | 用途 | 工作台确认 | 后端状态 |
|---|---|---|---|
| GET | <code>/api/v2/{admin_path}/knowledge/fetch</code> | 文章列表 | 否 | — |
| GET | <code>/api/v2/{admin_path}/knowledge/getCategory</code> | 分类列表 | 否 | — |
| POST | <code>/api/v2/{admin_path}/knowledge/save</code> | 保存文章 | 是 | — |
| POST | <code>/api/v2/{admin_path}/knowledge/show</code> | 显示 / 隐藏 | 是 | — |
| POST | <code>/api/v2/{admin_path}/knowledge/sort</code> | 排序文章 | 是 | — |
| POST | <code>/api/v2/{admin_path}/knowledge/drop</code> | 删除文章 | 是 | — |


### 优惠券

| 方法 | 路径 | 用途 | 工作台确认 | 后端状态 |
|---|---|---|---|
| GET | <code>/api/v2/{admin_path}/coupon/fetch</code> | 优惠券列表 | 否 | — |
| POST | <code>/api/v2/{admin_path}/coupon/generate</code> | 生成优惠券 | 是 | — |
| POST | <code>/api/v2/{admin_path}/coupon/show</code> | 显示 / 隐藏 | 是 | — |
| POST | <code>/api/v2/{admin_path}/coupon/update</code> | 更新优惠券 | 是 | — |
| POST | <code>/api/v2/{admin_path}/coupon/drop</code> | 删除优惠券 | 是 | — |


### 礼品卡

| 方法 | 路径 | 用途 | 工作台确认 | 后端状态 |
|---|---|---|---|
| GET | <code>/api/v2/{admin_path}/gift-card/templates</code> | 卡片模板 | 否 | — |
| POST | <code>/api/v2/{admin_path}/gift-card/create-template</code> | 创建模板 | 是 | — |
| POST | <code>/api/v2/{admin_path}/gift-card/update-template</code> | 更新模板 | 是 | — |
| POST | <code>/api/v2/{admin_path}/gift-card/delete-template</code> | 删除模板 | 是 | — |
| GET | <code>/api/v2/{admin_path}/gift-card/codes</code> | 卡密列表 | 否 | — |
| POST | <code>/api/v2/{admin_path}/gift-card/generate-codes</code> | 生成卡密 | 是 | — |
| POST | <code>/api/v2/{admin_path}/gift-card/toggle-code</code> | 启用 / 停用卡密 | 是 | — |
| GET | <code>/api/v2/{admin_path}/gift-card/export-codes</code> | 导出卡密 | 否 | — |
| POST | <code>/api/v2/{admin_path}/gift-card/update-code</code> | 更新卡密 | 是 | — |
| POST | <code>/api/v2/{admin_path}/gift-card/delete-code</code> | 删除卡密 | 是 | — |
| GET | <code>/api/v2/{admin_path}/gift-card/usages</code> | 使用记录 | 否 | — |
| GET | <code>/api/v2/{admin_path}/gift-card/statistics</code> | 统计 | 否 | — |
| GET | <code>/api/v2/{admin_path}/gift-card/types</code> | 卡类型 | 否 | — |


### 支付方式

| 方法 | 路径 | 用途 | 工作台确认 | 后端状态 |
|---|---|---|---|
| GET | <code>/api/v2/{admin_path}/payment/fetch</code> | 支付方式列表 | 否 | — |
| GET | <code>/api/v2/{admin_path}/payment/getPaymentMethods</code> | 支付插件列表 | 否 | — |
| POST | <code>/api/v2/{admin_path}/payment/getPaymentForm</code> | 获取支付表单 | 否 | — |
| POST | <code>/api/v2/{admin_path}/payment/save</code> | 保存支付方式 | 是 | — |
| POST | <code>/api/v2/{admin_path}/payment/show</code> | 显示 / 隐藏 | 是 | — |
| POST | <code>/api/v2/{admin_path}/payment/sort</code> | 排序支付方式 | 是 | — |
| POST | <code>/api/v2/{admin_path}/payment/drop</code> | 删除支付方式 | 是 | — |


### 节点

| 方法 | 路径 | 用途 | 工作台确认 | 后端状态 |
|---|---|---|---|
| GET | <code>/api/v2/{admin_path}/server/manage/getNodes</code> | 节点列表 | 否 | — |
| POST | <code>/api/v2/{admin_path}/server/manage/save</code> | 保存节点 | 是 | — |
| POST | <code>/api/v2/{admin_path}/server/manage/update</code> | 更新节点 | 是 | — |
| POST | <code>/api/v2/{admin_path}/server/manage/sort</code> | 排序节点 | 是 | — |
| POST | <code>/api/v2/{admin_path}/server/manage/copy</code> | 复制节点 | 是 | — |
| POST | <code>/api/v2/{admin_path}/server/manage/batchUpdate</code> | 批量更新节点 | 是 | — |
| POST | <code>/api/v2/{admin_path}/server/manage/batchDelete</code> | 批量删除节点 | 是 | — |
| POST | <code>/api/v2/{admin_path}/server/manage/resetTraffic</code> | 重置节点流量 | 是 | — |
| POST | <code>/api/v2/{admin_path}/server/manage/batchResetTraffic</code> | 批量重置流量 | 是 | — |
| GET | <code>/api/v2/{admin_path}/server/manage/generateEchKey</code> | 生成 ECH 密钥 | 否 | — |
| POST | <code>/api/v2/{admin_path}/server/manage/drop</code> | 删除节点 | 是 | — |
| GET | <code>/api/v2/{admin_path}/server/group/fetch</code> | 节点分组 | 否 | — |
| POST | <code>/api/v2/{admin_path}/server/group/save</code> | 保存分组 | 是 | — |
| POST | <code>/api/v2/{admin_path}/server/group/drop</code> | 删除分组 | 是 | — |
| GET | <code>/api/v2/{admin_path}/server/route/fetch</code> | 线路列表 | 否 | — |
| POST | <code>/api/v2/{admin_path}/server/route/save</code> | 保存线路 | 是 | — |
| POST | <code>/api/v2/{admin_path}/server/route/drop</code> | 删除线路 | 是 | — |


### 机器

| 方法 | 路径 | 用途 | 工作台确认 | 后端状态 |
|---|---|---|---|
| GET | <code>/api/v2/{admin_path}/server/machine/fetch</code> | 机器列表 | 否 | — |
| POST | <code>/api/v2/{admin_path}/server/machine/save</code> | 保存机器 | 是 | — |
| GET | <code>/api/v2/{admin_path}/server/machine/getToken</code> | 获取机器令牌 | 否 | — |
| POST | <code>/api/v2/{admin_path}/server/machine/resetToken</code> | 重置机器令牌 | 是 | — |
| GET | <code>/api/v2/{admin_path}/server/machine/installCommand</code> | 安装命令 | 否 | — |
| GET | <code>/api/v2/{admin_path}/server/machine/nodes</code> | 关联节点 | 否 | — |
| GET | <code>/api/v2/{admin_path}/server/machine/history</code> | 历史记录 | 否 | — |
| POST | <code>/api/v2/{admin_path}/server/machine/drop</code> | 删除机器 | 是 | — |


### 统计报表

| 方法 | 路径 | 用途 | 工作台确认 | 后端状态 |
|---|---|---|---|
| GET | <code>/api/v2/{admin_path}/stat/getOverride</code> | 运营概览 | 否 | — |
| GET | <code>/api/v2/{admin_path}/stat/getStats</code> | 流量统计 | 否 | — |
| GET | <code>/api/v2/{admin_path}/stat/getOrder</code> | 订单统计 | 否 | — |
| GET | <code>/api/v2/{admin_path}/stat/getStatUser</code> | 用户统计 | 否 | — |
| GET | <code>/api/v2/{admin_path}/stat/getRanking</code> | 排行榜（后端未实现）；当前路由对应的控制器方法缺失 | 否 | 后端缺失 |
| GET | <code>/api/v2/{admin_path}/stat/getTrafficRank</code> | 节点流量排名 | 否 | — |
| GET | <code>/api/v2/{admin_path}/stat/getServerLastRank</code> | 节点今日排名 | 否 | — |
| GET | <code>/api/v2/{admin_path}/stat/getServerYesterdayRank</code> | 节点昨日排名 | 否 | — |
| GET | <code>/api/v2/{admin_path}/stat/getStatRecord</code> | 统计记录 | 否 | — |


### 流量重置

| 方法 | 路径 | 用途 | 工作台确认 | 后端状态 |
|---|---|---|---|
| GET | <code>/api/v2/{admin_path}/traffic-reset/logs</code> | 重置记录 | 否 | — |
| GET | <code>/api/v2/{admin_path}/traffic-reset/stats</code> | 重置统计 | 否 | — |
| GET | <code>/api/v2/{admin_path}/traffic-reset/user/{userId}/history</code> | 用户重置历史 | 否 | — |
| POST | <code>/api/v2/{admin_path}/traffic-reset/reset-user</code> | 重置用户流量 | 是 | — |


### 站点配置

| 方法 | 路径 | 用途 | 工作台确认 | 后端状态 |
|---|---|---|---|
| GET | <code>/api/v2/{admin_path}/config/fetch</code> | 读取站点配置 | 否 | — |
| POST | <code>/api/v2/{admin_path}/config/save</code> | 保存站点配置 | 是 | — |
| GET | <code>/api/v2/{admin_path}/config/getEmailTemplate</code> | 邮件模板 | 否 | — |
| GET | <code>/api/v2/{admin_path}/config/getThemeTemplate</code> | 主题模板 | 否 | — |
| POST | <code>/api/v2/{admin_path}/config/setTelegramWebhook</code> | 设置 Telegram Webhook | 是 | — |
| POST | <code>/api/v2/{admin_path}/config/testSendMail</code> | 测试邮件 | 是 | — |


### 邮件模板

| 方法 | 路径 | 用途 | 工作台确认 | 后端状态 |
|---|---|---|---|
| GET | <code>/api/v2/{admin_path}/mail/template/list</code> | 模板列表 | 否 | — |
| GET | <code>/api/v2/{admin_path}/mail/template/get</code> | 读取模板 | 否 | — |
| POST | <code>/api/v2/{admin_path}/mail/template/save</code> | 保存模板 | 是 | — |
| POST | <code>/api/v2/{admin_path}/mail/template/reset</code> | 重置模板 | 是 | — |
| POST | <code>/api/v2/{admin_path}/mail/template/test</code> | 测试发送 | 是 | — |


### 系统状态

| 方法 | 路径 | 用途 | 工作台确认 | 后端状态 |
|---|---|---|---|
| GET | <code>/api/v2/{admin_path}/system/getSystemStatus</code> | 系统状态 | 否 | — |
| GET | <code>/api/v2/{admin_path}/system/getQueueStats</code> | 队列统计 | 否 | — |
| GET | <code>/api/v2/{admin_path}/system/getQueueWorkload</code> | 队列负载 | 否 | — |
| GET | <code>/api/v2/{admin_path}/system/getQueueMasters</code> | Horizon 主进程 | 否 | — |
| GET | <code>/api/v2/{admin_path}/system/getHorizonFailedJobs</code> | 失败任务 | 否 | — |
| GET | <code>/api/v2/{admin_path}/system/getAuditLog</code> | 审计日志 | 否 | — |


### 主题

| 方法 | 路径 | 用途 | 工作台确认 | 后端状态 |
|---|---|---|---|
| GET | <code>/api/v2/{admin_path}/theme/getThemes</code> | 主题列表 | 否 | — |
| POST | <code>/api/v2/{admin_path}/theme/getThemeConfig</code> | 读取主题配置 | 否 | — |
| POST | <code>/api/v2/{admin_path}/theme/saveThemeConfig</code> | 保存主题配置 | 是 | — |
| POST | <code>/api/v2/{admin_path}/theme/upload</code> | 上传主题包 | 是 | — |
| POST | <code>/api/v2/{admin_path}/theme/delete</code> | 删除主题 | 是 | — |


### 插件

| 方法 | 路径 | 用途 | 工作台确认 | 后端状态 |
|---|---|---|---|
| GET | <code>/api/v2/{admin_path}/plugin/types</code> | 插件类型 | 否 | — |
| GET | <code>/api/v2/{admin_path}/plugin/getPlugins</code> | 插件列表 | 否 | — |
| GET | <code>/api/v2/{admin_path}/plugin/config</code> | 读取插件配置 | 否 | — |
| POST | <code>/api/v2/{admin_path}/plugin/config</code> | 更新插件配置 | 是 | — |
| POST | <code>/api/v2/{admin_path}/plugin/upload</code> | 上传插件 | 是 | — |
| POST | <code>/api/v2/{admin_path}/plugin/install</code> | 安装插件 | 是 | — |
| POST | <code>/api/v2/{admin_path}/plugin/uninstall</code> | 卸载插件 | 是 | — |
| POST | <code>/api/v2/{admin_path}/plugin/enable</code> | 启用插件 | 是 | — |
| POST | <code>/api/v2/{admin_path}/plugin/disable</code> | 停用插件 | 是 | — |
| POST | <code>/api/v2/{admin_path}/plugin/upgrade</code> | 升级插件 | 是 | — |
| POST | <code>/api/v2/{admin_path}/plugin/delete</code> | 删除插件 | 是 | — |

## 5. 已知兼容情况

- `notice/update`、`user/setInviteUser`、`stat/getRanking`：当前 Xboard AdminRoute 声明了路由，但对应控制器没有实现方法；调用会失败，需要先修复后端。
- `system/getQueueMasters`：当前路由直接指向 Laravel Horizon 控制器，可能受 Horizon 自己的授权检查影响并返回 403。不要通过公开 Horizon 面板绕过授权。
- 支付方式、插件配置、节点协议参数等接口的请求字段取决于安装的插件、协议和 Xboard 版本，需从目标后端返回的 schema / 表单定义读取。
- 所有管理 API 使用管理员权限。对用户删除、支付确认、流量重置、节点/插件变更等操作应采用最小权限、二次确认，并优先在隔离测试实例验证。

## 6. 本项目中的调用实现

- API 请求、错误解析、会话令牌处理：`src/App.vue`
- 模块接口目录与 HTTP 方法：`src/features.js`
- 接口工作台：`src/components/ApiWorkbench.vue`
- 功能页面、迁移顺序与已知差异：`../MIGRATION.md`
