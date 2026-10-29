# Xboard 功能与接口迁移清单

状态说明：**专用页面完成** = 页面调用已核实的 Xboard API 并有相应管理流程；**后端缺失** = AdminRoute 有声明但当前控制器没有对应实现；测试数据库上的实际兼容性仍需在目标 Xboard 实例登录后逐页操作确认。

## 迁移顺序与状态

| 顺序 | 功能 | 状态 | 专用页面/当前覆盖 |
|---:|---|---|---|
| 1 | 运营概览 | 专用页面完成 | 收入、注册、工单、流量和节点概览；分时柱形仍是示意图 |
| 2 | 订单 | 专用页面完成 | 分页/交易号筛选、详情、手工支付、取消、佣金状态、分配订阅 |
| 3 | 套餐 | 专用页面完成 | 列表、创建/编辑、价格/规则、销售状态、排序、删除 |
| 4 | 工单 | 专用页面完成 | 状态筛选、会话详情、回复、关闭 |
| 5 | 公告 | 专用页面完成 | 创建/编辑、显示状态、弹窗、标签、排序、删除 |
| 6 | 用户 | 专用页面完成 | 分页/邮箱搜索、详情、新建/编辑、权限/禁用、密钥重置、删除；用户邮件/邀请关系/CSV在接口工作台 |
| 7 | 知识库 | 专用页面完成 | 文章/正文、分类/语言、显示、排序、删除 |
| 8 | 优惠券 | 专用页面完成 | 筛选分页、创建/编辑、批量生成 CSV、启停、删除 |
| 9 | 礼品卡 | 专用页面完成 | 模板和规则 JSON、批量生成卡密、导出、启停、编辑、删除、使用记录/统计 |
| 10 | 支付方式 | 专用页面完成 | 支付方式/插件字段 schema、配置、费率、通知域名、启停、排序、删除 |
| 11 | 节点/分组/线路 | 专用页面完成 | 节点、分组、线路专用页；节点协议高级参数通过 JSON 编辑 |
| 12 | 机器 | 专用页面完成 | 机器、安装命令、令牌、关联节点、历史与删除 |
| 13 | 统计报表 | 专用页面完成 | 统计概览、日期订单、流量排行、节点排名、记录、用户明细；getRanking 后端未实现 |
| 14 | 流量重置 | 专用页面完成 | 重置记录筛选、周期统计、用户历史、人工重置 |
| 15 | 站点配置 | 专用页面完成 | 配置分组表单、保存、邮件测试、Telegram Webhook、模板目录；个别非映射字段仅接口工作台 |
| 16 | 邮件模板 | 专用页面完成 | 模板列表/编辑、变量提示、保存/恢复默认、测试发送 |
| 17 | 系统状态 | 专用页面完成 | 计划任务/Horizon/队列状态、负载、失败任务分页、审计日志筛选 |
| 18 | 主题 | 专用页面完成 | 主题配置、切换、ZIP 上传、删除（后端限制系统/当前主题） |
| 19 | 插件 | 专用页面完成 | 分类、安装/启停/升级/卸载/删除、配置 JSON、ZIP 上传、README |

## 接口覆盖（按当前 Xboard AdminRoute）

路径格式：`/api/v2/{管理员安全路径}/...`。鉴权使用管理员登录返回的 token。所有模块原始接口均保留在各模块“接口工作台”，专用页面是常用流程入口。

通用的登录、Authorization 头、分页响应、上传下载说明和完整接口索引另见 [Xboard Admin API 开发参考](./docs/ADMIN_API.md)。

### 订单（专用页面完成）
- `GET /api/v2/{管理员安全路径}/order/fetch` — 订单列表；已接入
- `POST /api/v2/{管理员安全路径}/order/detail` — 订单详情；已接入
- `POST /api/v2/{管理员安全路径}/order/update` — 更新订单；已接入
- `POST /api/v2/{管理员安全路径}/order/assign` — 分配订单；已接入；写操作前二次确认
- `POST /api/v2/{管理员安全路径}/order/paid` — 标记已支付；已接入；写操作前二次确认
- `POST /api/v2/{管理员安全路径}/order/cancel` — 取消订单；已接入；写操作前二次确认

### 套餐（专用页面完成）
- `GET /api/v2/{管理员安全路径}/plan/fetch` — 套餐列表；已接入
- `POST /api/v2/{管理员安全路径}/plan/save` — 保存套餐；已接入；写操作前二次确认
- `POST /api/v2/{管理员安全路径}/plan/update` — 更新套餐状态；已接入；写操作前二次确认
- `POST /api/v2/{管理员安全路径}/plan/sort` — 排序套餐；已接入；写操作前二次确认
- `POST /api/v2/{管理员安全路径}/plan/drop` — 删除套餐；已接入；写操作前二次确认

### 工单（专用页面完成）
- `GET /api/v2/{管理员安全路径}/ticket/fetch` — 工单列表；已接入
- `POST /api/v2/{管理员安全路径}/ticket/reply` — 回复工单；已接入；写操作前二次确认
- `POST /api/v2/{管理员安全路径}/ticket/close` — 关闭工单；已接入；写操作前二次确认

### 公告（专用页面完成）
- `GET /api/v2/{管理员安全路径}/notice/fetch` — 公告列表；已接入
- `POST /api/v2/{管理员安全路径}/notice/save` — 保存公告；已接入；写操作前二次确认
- `POST /api/v2/{管理员安全路径}/notice/update` — 更新公告（后端未实现）；**后端缺失**：AdminRoute 已声明路由，但当前控制器方法不存在。；写操作前二次确认
- `POST /api/v2/{管理员安全路径}/notice/show` — 显示 / 隐藏；已接入；写操作前二次确认
- `POST /api/v2/{管理员安全路径}/notice/sort` — 排序公告；已接入；写操作前二次确认
- `POST /api/v2/{管理员安全路径}/notice/drop` — 删除公告；已接入；写操作前二次确认

### 用户（专用页面完成）
- `GET /api/v2/{管理员安全路径}/user/fetch` — 用户列表；已接入
- `GET /api/v2/{管理员安全路径}/user/getUserInfoById` — 用户详情；已接入
- `POST /api/v2/{管理员安全路径}/user/update` — 更新用户；已接入；写操作前二次确认
- `POST /api/v2/{管理员安全路径}/user/generate` — 生成用户；已接入；写操作前二次确认
- `POST /api/v2/{管理员安全路径}/user/ban` — 封禁 / 解封；已接入；写操作前二次确认
- `POST /api/v2/{管理员安全路径}/user/resetSecret` — 重置订阅密钥；已接入；写操作前二次确认
- `POST /api/v2/{管理员安全路径}/user/setInviteUser` — 设置邀请关系（后端未实现）；**后端缺失**：AdminRoute 已声明路由，但当前控制器方法不存在。；写操作前二次确认
- `POST /api/v2/{管理员安全路径}/user/sendMail` — 发送邮件；已接入；写操作前二次确认
- `POST /api/v2/{管理员安全路径}/user/dumpCSV` — 导出 CSV；已接入
- `POST /api/v2/{管理员安全路径}/user/destroy` — 删除用户；已接入；写操作前二次确认

### 知识库（专用页面完成）
- `GET /api/v2/{管理员安全路径}/knowledge/fetch` — 文章列表；已接入
- `GET /api/v2/{管理员安全路径}/knowledge/getCategory` — 分类列表；已接入
- `POST /api/v2/{管理员安全路径}/knowledge/save` — 保存文章；已接入；写操作前二次确认
- `POST /api/v2/{管理员安全路径}/knowledge/show` — 显示 / 隐藏；已接入；写操作前二次确认
- `POST /api/v2/{管理员安全路径}/knowledge/sort` — 排序文章；已接入；写操作前二次确认
- `POST /api/v2/{管理员安全路径}/knowledge/drop` — 删除文章；已接入；写操作前二次确认

### 优惠券（专用页面完成）
- `GET /api/v2/{管理员安全路径}/coupon/fetch` — 优惠券列表；已接入
- `POST /api/v2/{管理员安全路径}/coupon/generate` — 生成优惠券；已接入；写操作前二次确认
- `POST /api/v2/{管理员安全路径}/coupon/show` — 显示 / 隐藏；已接入；写操作前二次确认
- `POST /api/v2/{管理员安全路径}/coupon/update` — 更新优惠券；已接入；写操作前二次确认
- `POST /api/v2/{管理员安全路径}/coupon/drop` — 删除优惠券；已接入；写操作前二次确认

### 礼品卡（专用页面完成）
- `GET /api/v2/{管理员安全路径}/gift-card/templates` — 卡片模板；已接入
- `POST /api/v2/{管理员安全路径}/gift-card/create-template` — 创建模板；已接入；写操作前二次确认
- `POST /api/v2/{管理员安全路径}/gift-card/update-template` — 更新模板；已接入；写操作前二次确认
- `POST /api/v2/{管理员安全路径}/gift-card/delete-template` — 删除模板；已接入；写操作前二次确认
- `GET /api/v2/{管理员安全路径}/gift-card/codes` — 卡密列表；已接入
- `POST /api/v2/{管理员安全路径}/gift-card/generate-codes` — 生成卡密；已接入；写操作前二次确认
- `POST /api/v2/{管理员安全路径}/gift-card/toggle-code` — 启用 / 停用卡密；已接入；写操作前二次确认
- `GET /api/v2/{管理员安全路径}/gift-card/export-codes` — 导出卡密；已接入
- `POST /api/v2/{管理员安全路径}/gift-card/update-code` — 更新卡密；已接入；写操作前二次确认
- `POST /api/v2/{管理员安全路径}/gift-card/delete-code` — 删除卡密；已接入；写操作前二次确认
- `GET /api/v2/{管理员安全路径}/gift-card/usages` — 使用记录；已接入
- `GET /api/v2/{管理员安全路径}/gift-card/statistics` — 统计；已接入
- `GET /api/v2/{管理员安全路径}/gift-card/types` — 卡类型；已接入

### 支付方式（专用页面完成）
- `GET /api/v2/{管理员安全路径}/payment/fetch` — 支付方式列表；已接入
- `GET /api/v2/{管理员安全路径}/payment/getPaymentMethods` — 支付插件列表；已接入
- `POST /api/v2/{管理员安全路径}/payment/getPaymentForm` — 获取支付表单；已接入
- `POST /api/v2/{管理员安全路径}/payment/save` — 保存支付方式；已接入；写操作前二次确认
- `POST /api/v2/{管理员安全路径}/payment/show` — 显示 / 隐藏；已接入；写操作前二次确认
- `POST /api/v2/{管理员安全路径}/payment/sort` — 排序支付方式；已接入；写操作前二次确认
- `POST /api/v2/{管理员安全路径}/payment/drop` — 删除支付方式；已接入；写操作前二次确认

### 节点/分组/线路（专用页面完成）
- `GET /api/v2/{管理员安全路径}/server/manage/getNodes` — 节点列表；已接入
- `POST /api/v2/{管理员安全路径}/server/manage/save` — 保存节点；已接入；写操作前二次确认
- `POST /api/v2/{管理员安全路径}/server/manage/update` — 更新节点；已接入；写操作前二次确认
- `POST /api/v2/{管理员安全路径}/server/manage/sort` — 排序节点；已接入；写操作前二次确认
- `POST /api/v2/{管理员安全路径}/server/manage/copy` — 复制节点；已接入；写操作前二次确认
- `POST /api/v2/{管理员安全路径}/server/manage/batchUpdate` — 批量更新节点；已接入；写操作前二次确认
- `POST /api/v2/{管理员安全路径}/server/manage/batchDelete` — 批量删除节点；已接入；写操作前二次确认
- `POST /api/v2/{管理员安全路径}/server/manage/resetTraffic` — 重置节点流量；已接入；写操作前二次确认
- `POST /api/v2/{管理员安全路径}/server/manage/batchResetTraffic` — 批量重置流量；已接入；写操作前二次确认
- `GET /api/v2/{管理员安全路径}/server/manage/generateEchKey` — 生成 ECH 密钥；已接入
- `POST /api/v2/{管理员安全路径}/server/manage/drop` — 删除节点；已接入；写操作前二次确认
- `GET /api/v2/{管理员安全路径}/server/group/fetch` — 节点分组；已接入
- `POST /api/v2/{管理员安全路径}/server/group/save` — 保存分组；已接入；写操作前二次确认
- `POST /api/v2/{管理员安全路径}/server/group/drop` — 删除分组；已接入；写操作前二次确认
- `GET /api/v2/{管理员安全路径}/server/route/fetch` — 线路列表；已接入
- `POST /api/v2/{管理员安全路径}/server/route/save` — 保存线路；已接入；写操作前二次确认
- `POST /api/v2/{管理员安全路径}/server/route/drop` — 删除线路；已接入；写操作前二次确认

### 机器（专用页面完成）
- `GET /api/v2/{管理员安全路径}/server/machine/fetch` — 机器列表；已接入
- `POST /api/v2/{管理员安全路径}/server/machine/save` — 保存机器；已接入；写操作前二次确认
- `GET /api/v2/{管理员安全路径}/server/machine/getToken` — 获取机器令牌；已接入
- `POST /api/v2/{管理员安全路径}/server/machine/resetToken` — 重置机器令牌；已接入；写操作前二次确认
- `GET /api/v2/{管理员安全路径}/server/machine/installCommand` — 安装命令；已接入
- `GET /api/v2/{管理员安全路径}/server/machine/nodes` — 关联节点；已接入
- `GET /api/v2/{管理员安全路径}/server/machine/history` — 历史记录；已接入
- `POST /api/v2/{管理员安全路径}/server/machine/drop` — 删除机器；已接入；写操作前二次确认

### 统计报表（专用页面完成）
- `GET /api/v2/{管理员安全路径}/stat/getOverride` — 运营概览；已接入
- `GET /api/v2/{管理员安全路径}/stat/getStats` — 流量统计；已接入
- `GET /api/v2/{管理员安全路径}/stat/getOrder` — 订单统计；已接入
- `GET /api/v2/{管理员安全路径}/stat/getStatUser` — 用户统计；已接入
- `GET /api/v2/{管理员安全路径}/stat/getRanking` — 排行榜（后端未实现）；**后端缺失**：AdminRoute 已声明路由，但当前控制器方法不存在。
- `GET /api/v2/{管理员安全路径}/stat/getTrafficRank` — 节点流量排名；已接入
- `GET /api/v2/{管理员安全路径}/stat/getServerLastRank` — 节点今日排名；已接入
- `GET /api/v2/{管理员安全路径}/stat/getServerYesterdayRank` — 节点昨日排名；已接入
- `GET /api/v2/{管理员安全路径}/stat/getStatRecord` — 统计记录；已接入

### 流量重置（专用页面完成）
- `GET /api/v2/{管理员安全路径}/traffic-reset/logs` — 重置记录；已接入
- `GET /api/v2/{管理员安全路径}/traffic-reset/stats` — 重置统计；已接入
- `GET /api/v2/{管理员安全路径}/traffic-reset/user/{userId}/history` — 用户重置历史；已接入
- `POST /api/v2/{管理员安全路径}/traffic-reset/reset-user` — 重置用户流量；已接入；写操作前二次确认

### 站点配置（专用页面完成）
- `GET /api/v2/{管理员安全路径}/config/fetch` — 读取站点配置；已接入
- `POST /api/v2/{管理员安全路径}/config/save` — 保存站点配置；已接入；写操作前二次确认
- `GET /api/v2/{管理员安全路径}/config/getEmailTemplate` — 邮件模板；已接入
- `GET /api/v2/{管理员安全路径}/config/getThemeTemplate` — 主题模板；已接入
- `POST /api/v2/{管理员安全路径}/config/setTelegramWebhook` — 设置 Telegram Webhook；已接入；写操作前二次确认
- `POST /api/v2/{管理员安全路径}/config/testSendMail` — 测试邮件；已接入；写操作前二次确认

### 邮件模板（专用页面完成）
- `GET /api/v2/{管理员安全路径}/mail/template/list` — 模板列表；已接入
- `GET /api/v2/{管理员安全路径}/mail/template/get` — 读取模板；已接入
- `POST /api/v2/{管理员安全路径}/mail/template/save` — 保存模板；已接入；写操作前二次确认
- `POST /api/v2/{管理员安全路径}/mail/template/reset` — 重置模板；已接入；写操作前二次确认
- `POST /api/v2/{管理员安全路径}/mail/template/test` — 测试发送；已接入；写操作前二次确认

### 系统状态（专用页面完成）
- `GET /api/v2/{管理员安全路径}/system/getSystemStatus` — 系统状态；已接入
- `GET /api/v2/{管理员安全路径}/system/getQueueStats` — 队列统计；已接入
- `GET /api/v2/{管理员安全路径}/system/getQueueWorkload` — 队列负载；已接入
- `GET /api/v2/{管理员安全路径}/system/getQueueMasters` — Horizon 主进程；已接入
- `GET /api/v2/{管理员安全路径}/system/getHorizonFailedJobs` — 失败任务；已接入
- `GET /api/v2/{管理员安全路径}/system/getAuditLog` — 审计日志；已接入

### 主题（专用页面完成）
- `GET /api/v2/{管理员安全路径}/theme/getThemes` — 主题列表；已接入
- `POST /api/v2/{管理员安全路径}/theme/getThemeConfig` — 读取主题配置；已接入
- `POST /api/v2/{管理员安全路径}/theme/saveThemeConfig` — 保存主题配置；已接入；写操作前二次确认
- `POST /api/v2/{管理员安全路径}/theme/upload` — 上传主题包；已接入；写操作前二次确认
- `POST /api/v2/{管理员安全路径}/theme/delete` — 删除主题；已接入；写操作前二次确认

### 插件（专用页面完成）
- `GET /api/v2/{管理员安全路径}/plugin/types` — 插件类型；已接入
- `GET /api/v2/{管理员安全路径}/plugin/getPlugins` — 插件列表；已接入
- `GET /api/v2/{管理员安全路径}/plugin/config` — 读取插件配置；已接入
- `POST /api/v2/{管理员安全路径}/plugin/config` — 更新插件配置；已接入；写操作前二次确认
- `POST /api/v2/{管理员安全路径}/plugin/upload` — 上传插件；已接入；写操作前二次确认
- `POST /api/v2/{管理员安全路径}/plugin/install` — 安装插件；已接入；写操作前二次确认
- `POST /api/v2/{管理员安全路径}/plugin/uninstall` — 卸载插件；已接入；写操作前二次确认
- `POST /api/v2/{管理员安全路径}/plugin/enable` — 启用插件；已接入；写操作前二次确认
- `POST /api/v2/{管理员安全路径}/plugin/disable` — 停用插件；已接入；写操作前二次确认
- `POST /api/v2/{管理员安全路径}/plugin/upgrade` — 升级插件；已接入；写操作前二次确认
- `POST /api/v2/{管理员安全路径}/plugin/delete` — 删除插件；已接入；写操作前二次确认

### 额外核对项
- AdminRoute 声明但控制器没有实现的 3 个方法：`user/setInviteUser`、`notice/update`、`stat/getRanking`；工作台会拦截并显示明确提示。
- 登录：`POST /api/v2/passport/auth/login`；校验 `auth_data` 与管理员身份。
- `theme/switch` 控制器方法存在，但没有注册在当前 AdminRoute；主题切换通过已注册的 `POST config/save` 保存 `frontend_theme`。
- 通用 API 工作台支持路由参数、JSON GET/POST、主题/插件 ZIP 上传、用户 CSV 与礼品卡导出。
- 构建通过不等于远程实例验收。所有页面需用配置的测试数据库逐页核验；以上 3 个缺失接口需由 Xboard 后端补齐，前端无法单独实现服务端统计。
