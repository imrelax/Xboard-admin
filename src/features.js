const ep = (title, path, method = 'GET', risk = false) => ({ title, path, method, risk })

export const featureGroups = [
  { id: 'orders', title: '订单', section: '运营管理', endpoints: [
    ep('订单列表', 'order/fetch', 'GET'), ep('订单详情', 'order/detail', 'POST'), ep('更新订单', 'order/update', 'POST'), ep('分配订单', 'order/assign', 'POST', true), ep('标记已支付', 'order/paid', 'POST', true), ep('取消订单', 'order/cancel', 'POST', true),
  ] },
  { id: 'plans', title: '套餐', section: '运营管理', endpoints: [
    ep('套餐列表', 'plan/fetch'), ep('保存套餐', 'plan/save', 'POST', true), ep('更新套餐状态', 'plan/update', 'POST', true), ep('排序套餐', 'plan/sort', 'POST', true), ep('删除套餐', 'plan/drop', 'POST', true),
  ] },
  { id: 'tickets', title: '工单', section: '运营管理', endpoints: [
    ep('工单列表', 'ticket/fetch'), ep('回复工单', 'ticket/reply', 'POST', true), ep('关闭工单', 'ticket/close', 'POST', true),
  ] },
  { id: 'notices', title: '公告', section: '运营管理', endpoints: [
    ep('公告列表', 'notice/fetch'), ep('保存公告', 'notice/save', 'POST', true), ep('更新公告（后端未实现）', 'notice/update', 'POST', true), ep('显示 / 隐藏', 'notice/show', 'POST', true), ep('排序公告', 'notice/sort', 'POST', true), ep('删除公告', 'notice/drop', 'POST', true),
  ] },
  { id: 'users', title: '用户', section: '账户与内容', endpoints: [
    ep('用户列表', 'user/fetch'), ep('用户详情', 'user/getUserInfoById'), ep('更新用户', 'user/update', 'POST', true), ep('生成用户', 'user/generate', 'POST', true), ep('封禁 / 解封', 'user/ban', 'POST', true), ep('重置订阅密钥', 'user/resetSecret', 'POST', true), ep('设置邀请关系（后端未实现）', 'user/setInviteUser', 'POST', true), ep('发送邮件', 'user/sendMail', 'POST', true), ep('导出 CSV', 'user/dumpCSV', 'POST'), ep('删除用户', 'user/destroy', 'POST', true),
  ] },
  { id: 'knowledge', title: '知识库', section: '账户与内容', endpoints: [
    ep('文章列表', 'knowledge/fetch'), ep('分类列表', 'knowledge/getCategory'), ep('保存文章', 'knowledge/save', 'POST', true), ep('显示 / 隐藏', 'knowledge/show', 'POST', true), ep('排序文章', 'knowledge/sort', 'POST', true), ep('删除文章', 'knowledge/drop', 'POST', true),
  ] },
  { id: 'coupons', title: '优惠券', section: '账户与内容', endpoints: [
    ep('优惠券列表', 'coupon/fetch'), ep('生成优惠券', 'coupon/generate', 'POST', true), ep('显示 / 隐藏', 'coupon/show', 'POST', true), ep('更新优惠券', 'coupon/update', 'POST', true), ep('删除优惠券', 'coupon/drop', 'POST', true),
  ] },
  { id: 'gift-cards', title: '礼品卡', section: '账户与内容', endpoints: [
    ep('卡片模板', 'gift-card/templates'), ep('创建模板', 'gift-card/create-template', 'POST', true), ep('更新模板', 'gift-card/update-template', 'POST', true), ep('删除模板', 'gift-card/delete-template', 'POST', true), ep('卡密列表', 'gift-card/codes'), ep('生成卡密', 'gift-card/generate-codes', 'POST', true), ep('启用 / 停用卡密', 'gift-card/toggle-code', 'POST', true), ep('导出卡密', 'gift-card/export-codes'), ep('更新卡密', 'gift-card/update-code', 'POST', true), ep('删除卡密', 'gift-card/delete-code', 'POST', true), ep('使用记录', 'gift-card/usages'), ep('统计', 'gift-card/statistics'), ep('卡类型', 'gift-card/types'),
  ] },
  { id: 'payments', title: '支付方式', section: '账户与内容', endpoints: [
    ep('支付方式列表', 'payment/fetch'), ep('支付插件列表', 'payment/getPaymentMethods'), ep('获取支付表单', 'payment/getPaymentForm', 'POST'), ep('保存支付方式', 'payment/save', 'POST', true), ep('显示 / 隐藏', 'payment/show', 'POST', true), ep('排序支付方式', 'payment/sort', 'POST', true), ep('删除支付方式', 'payment/drop', 'POST', true),
  ] },
  { id: 'servers', title: '节点', section: '基础设施', endpoints: [
    ep('节点列表', 'server/manage/getNodes'), ep('保存节点', 'server/manage/save', 'POST', true), ep('更新节点', 'server/manage/update', 'POST', true), ep('排序节点', 'server/manage/sort', 'POST', true), ep('复制节点', 'server/manage/copy', 'POST', true), ep('批量更新节点', 'server/manage/batchUpdate', 'POST', true), ep('批量删除节点', 'server/manage/batchDelete', 'POST', true), ep('重置节点流量', 'server/manage/resetTraffic', 'POST', true), ep('批量重置流量', 'server/manage/batchResetTraffic', 'POST', true), ep('生成 ECH 密钥', 'server/manage/generateEchKey'), ep('删除节点', 'server/manage/drop', 'POST', true), ep('节点分组', 'server/group/fetch'), ep('保存分组', 'server/group/save', 'POST', true), ep('删除分组', 'server/group/drop', 'POST', true), ep('线路列表', 'server/route/fetch'), ep('保存线路', 'server/route/save', 'POST', true), ep('删除线路', 'server/route/drop', 'POST', true),
  ] },
  { id: 'machines', title: '机器', section: '基础设施', endpoints: [
    ep('机器列表', 'server/machine/fetch'), ep('保存机器', 'server/machine/save', 'POST', true), ep('获取机器令牌', 'server/machine/getToken'), ep('重置机器令牌', 'server/machine/resetToken', 'POST', true), ep('安装命令', 'server/machine/installCommand'), ep('关联节点', 'server/machine/nodes'), ep('历史记录', 'server/machine/history'), ep('删除机器', 'server/machine/drop', 'POST', true),
  ] },
  { id: 'statistics', title: '统计报表', section: '基础设施', endpoints: [
    ep('运营概览', 'stat/getOverride'), ep('流量统计', 'stat/getStats'), ep('订单统计', 'stat/getOrder'), ep('用户统计', 'stat/getStatUser'), ep('排行榜（后端未实现）', 'stat/getRanking'), ep('节点流量排名', 'stat/getTrafficRank'), ep('节点今日排名', 'stat/getServerLastRank'), ep('节点昨日排名', 'stat/getServerYesterdayRank'), ep('统计记录', 'stat/getStatRecord'),
  ] },
  { id: 'traffic-reset', title: '流量重置', section: '基础设施', endpoints: [
    ep('重置记录', 'traffic-reset/logs'), ep('重置统计', 'traffic-reset/stats'), ep('用户重置历史', 'traffic-reset/user/{userId}/history'), ep('重置用户流量', 'traffic-reset/reset-user', 'POST', true),
  ] },
  { id: 'configuration', title: '站点配置', section: '系统', endpoints: [
    ep('读取站点配置', 'config/fetch'), ep('保存站点配置', 'config/save', 'POST', true), ep('邮件模板', 'config/getEmailTemplate'), ep('主题模板', 'config/getThemeTemplate'), ep('设置 Telegram Webhook', 'config/setTelegramWebhook', 'POST', true), ep('测试邮件', 'config/testSendMail', 'POST', true),
  ] },
  { id: 'mail', title: '邮件模板', section: '系统', endpoints: [
    ep('模板列表', 'mail/template/list'), ep('读取模板', 'mail/template/get'), ep('保存模板', 'mail/template/save', 'POST', true), ep('重置模板', 'mail/template/reset', 'POST', true), ep('测试发送', 'mail/template/test', 'POST', true),
  ] },
  { id: 'system', title: '系统状态', section: '系统', endpoints: [
    ep('系统状态', 'system/getSystemStatus'), ep('队列统计', 'system/getQueueStats'), ep('队列负载', 'system/getQueueWorkload'), ep('Horizon 主进程', 'system/getQueueMasters'), ep('失败任务', 'system/getHorizonFailedJobs'), ep('审计日志', 'system/getAuditLog'),
  ] },
  { id: 'themes', title: '主题', section: '扩展', endpoints: [
    ep('主题列表', 'theme/getThemes'), ep('读取主题配置', 'theme/getThemeConfig', 'POST'), ep('保存主题配置', 'theme/saveThemeConfig', 'POST', true), ep('上传主题包', 'theme/upload', 'POST', true), ep('删除主题', 'theme/delete', 'POST', true),
  ] },
  { id: 'plugins', title: '插件', section: '扩展', endpoints: [
    ep('插件类型', 'plugin/types'), ep('插件列表', 'plugin/getPlugins'), ep('读取插件配置', 'plugin/config'), ep('更新插件配置', 'plugin/config', 'POST', true), ep('上传插件', 'plugin/upload', 'POST', true), ep('安装插件', 'plugin/install', 'POST', true), ep('卸载插件', 'plugin/uninstall', 'POST', true), ep('启用插件', 'plugin/enable', 'POST', true), ep('停用插件', 'plugin/disable', 'POST', true), ep('升级插件', 'plugin/upgrade', 'POST', true), ep('删除插件', 'plugin/delete', 'POST', true),
  ] },
]
