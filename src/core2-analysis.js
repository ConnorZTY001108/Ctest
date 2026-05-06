import { getCore2Explanation } from './core2-explanations.js';

const DEFAULT_LEAD_SUMMARY = '题干前半段已经给出了当前场景和限制条件';
const DEFAULT_OPTION_ROLE = '表示另一类不同的技术、工具或控制方向';

const OPTION_METADATA = [
  { patterns: ['totp', 'one-time password'], name: '时间型一次性口令', role: '向用户提供可立即输入的动态认证码', category: '认证凭据' },
  { patterns: ['dlp'], name: '数据防泄漏', role: '限制敏感数据外泄', category: '数据保护' },
  { patterns: ['frt'], name: '误拒率', role: '衡量生物识别系统把合法用户误拒的概率', category: '生物识别指标' },
  { patterns: ['mdm', 'management profile'], name: '移动设备管理', role: '集中管理移动设备的配置、应用和合规策略', category: '设备管理' },
  { patterns: ['mfa', 'multifactor authentication'], name: '多因素认证', role: '通过多个独立因子提升登录安全性', category: '身份认证' },
  { patterns: ['sso', 'single sign-on'], name: '单点登录', role: '让用户一次认证后访问多个系统', category: '身份认证' },
  { patterns: ['saml'], name: 'SAML 联合认证', role: '在身份提供方和业务系统之间传递认证断言', category: '身份认证' },
  { patterns: ['iam'], name: '身份与访问管理', role: '统一管理账号、权限和认证流程', category: '身份管理' },
  { patterns: ['uac', 'user account control'], name: '用户账户控制', role: '在需要提权时弹出确认并限制默认高权限执行', category: '权限控制' },
  { patterns: ['acl'], name: '访问控制列表', role: '按对象粒度定义谁能访问什么资源', category: '权限控制' },
  { patterns: ['nda', 'mnda'], name: '保密协议', role: '约束各方对敏感信息的披露和使用', category: '合规文档' },
  { patterns: ['aup'], name: '可接受使用政策', role: '规定用户如何正确使用公司设备和网络', category: '政策文档' },
  { patterns: ['eula'], name: '最终用户许可协议', role: '规定软件许可的使用条款', category: '许可文档' },
  { patterns: ['drm'], name: '数字版权管理', role: '限制受版权保护内容的复制和传播', category: '内容保护' },
  { patterns: ['sop', 'standard operating procedures'], name: '标准操作流程', role: '把重复性处理步骤标准化', category: '流程文档' },
  { patterns: ['sla', 'service-level agreements'], name: '服务级别协议', role: '定义服务响应和可用性承诺', category: '服务管理' },
  { patterns: ['cmdb'], name: '配置管理数据库', role: '记录资产、负责人和依赖关系', category: '资产管理' },
  { patterns: ['eol'], name: '生命周期结束', role: '表示产品不再获得官方更新和支持', category: '生命周期管理' },
  { patterns: ['edr'], name: '终端检测与响应', role: '在终端上持续检测可疑行为并支持响应', category: '安全检测' },
  { patterns: ['mdr'], name: '托管检测与响应', role: '由外部团队持续监测并协助处置安全事件', category: '安全运营' },
  { patterns: ['xdr'], name: '扩展检测与响应', role: '跨终端、邮件和网络统一关联安全告警', category: '安全检测' },
  { patterns: ['radius'], name: 'RADIUS', role: '为网络接入提供集中认证、授权和审计', category: '网络认证' },
  { patterns: ['ldap'], name: 'LDAP', role: '查询和访问目录服务中的账号与组织信息', category: '目录服务' },
  { patterns: ['tacacs+'], name: 'TACACS+', role: '为网络设备管理访问提供集中认证和授权', category: '网络认证' },
  { patterns: ['tkip'], name: 'TKIP', role: '提供较旧的无线链路加密机制', category: '无线安全' },
  { patterns: ['wpa3'], name: 'WPA3', role: '提供更新的无线接入安全标准', category: '无线安全' },
  { patterns: ['vpn', 'vpn connection', 'virtual private network'], name: 'VPN', role: '把外部设备安全接入公司内网', category: '远程接入' },
  { patterns: ['ssh'], name: 'SSH', role: '进行加密的命令行远程管理', category: '远程接入' },
  { patterns: ['rdp', 'remote desktop protocol'], name: '远程桌面协议', role: '远程呈现并操作 Windows 图形桌面', category: '远程接入' },
  { patterns: ['vnc'], name: 'VNC', role: '远程查看并接管图形桌面会话', category: '远程接入' },
  { patterns: ['spice'], name: 'SPICE', role: '为虚拟桌面环境提供图形远程访问', category: '远程接入' },
  { patterns: ['rmm'], name: '远程监控与管理', role: '集中监控和托管远端设备', category: '运维管理' },
  { patterns: ['winrm'], name: 'Windows 远程管理', role: '通过脚本或命令远程管理 Windows 主机', category: '远程接入' },
  { patterns: ['sftp'], name: 'SFTP', role: '通过加密通道传输文件', category: '文件传输' },
  { patterns: ['bitlocker'], name: 'BitLocker', role: '对 Windows 磁盘做整盘加密', category: '数据保护' },
  { patterns: ['filevault'], name: 'FileVault', role: '对 macOS 磁盘做整盘加密', category: '数据保护' },
  { patterns: ['device encryption'], name: '设备加密', role: '保护设备静态数据不被直接读取', category: '数据保护' },
  { patterns: ['remote wipe'], name: '远程擦除', role: '在设备丢失后远程清空其中的数据', category: '设备管理' },
  { patterns: ['facial recognition'], name: '人脸识别', role: '用生物特征完成本地身份验证', category: '身份认证' },
  { patterns: ['pin'], name: 'PIN 码', role: '作为本地解锁或登录时使用的短码因子', category: '身份认证' },
  { patterns: ['byod'], name: '自带设备办公', role: '允许员工用个人设备接入企业资源', category: '设备策略' },
  { patterns: ['apfs'], name: 'APFS', role: '作为 Apple 设备上的现代文件系统', category: '文件系统' },
  { patterns: ['ntfs', 'new technology file system'], name: 'NTFS', role: '提供 Windows 常用的权限、日志和大文件支持', category: '文件系统' },
  { patterns: ['exfat'], name: 'exFAT', role: '兼顾大文件和跨平台可移动介质兼容性', category: '文件系统' },
  { patterns: ['ext4'], name: 'ext4', role: '作为 Linux 上常见的本地文件系统', category: '文件系统' },
  { patterns: ['xfs'], name: 'XFS', role: '作为 Linux 上面向大容量和高吞吐场景的文件系统', category: '文件系统' },
  { patterns: ['refs'], name: 'ReFS', role: '作为 Windows 面向可靠性场景的文件系统', category: '文件系统' },
  { patterns: ['fat32'], name: 'FAT32', role: '提供高兼容性但有单文件大小限制', category: '文件系统' },
  { patterns: ['fat16'], name: 'FAT16', role: '提供较旧设备上的基础兼容文件系统', category: '文件系统' },
  { patterns: ['gpt'], name: 'GPT', role: '支持大容量磁盘和更多主分区', category: '磁盘分区' },
  { patterns: ['mbr'], name: 'MBR', role: '提供传统磁盘分区方式但容量和分区数较受限', category: '磁盘分区' },
  { patterns: ['pxe'], name: 'PXE', role: '让设备通过网络启动并接收部署镜像', category: '部署方式' },
  { patterns: ['zero-touch deployment'], name: '零接触部署', role: '在尽量少人工参与的情况下自动完成设备部署', category: '部署方式' },
  { patterns: ['image deployment'], name: '镜像部署', role: '批量下发标准化系统镜像', category: '部署方式' },
  { patterns: ['clean install'], name: '全新安装', role: '抹掉原环境后重新安装系统', category: '部署方式' },
  { patterns: ['in-place upgrade'], name: '原地升级', role: '保留现有应用和数据升级到新系统版本', category: '部署方式' },
  { patterns: ['trojan'], name: '木马', role: '伪装成正常程序诱导用户执行恶意代码', category: '恶意软件' },
  { patterns: ['ransomware'], name: '勒索软件', role: '加密文件并勒索用户付款', category: '恶意软件' },
  { patterns: ['cryptominer'], name: '挖矿木马', role: '偷偷占用设备算力挖矿', category: '恶意软件' },
  { patterns: ['spyware'], name: '间谍软件', role: '秘密收集用户活动和敏感信息', category: '恶意软件' },
  { patterns: ['virus'], name: '病毒', role: '依附其他文件传播并破坏系统', category: '恶意软件' },
  { patterns: ['evil twin'], name: '双胞胎热点攻击', role: '伪造与合法 Wi-Fi 相同名称诱骗用户连接', category: '网络攻击' },
  { patterns: ['spear phishing'], name: '鱼叉式钓鱼', role: '针对特定对象伪造信息实施社工攻击', category: '社会工程' },
  { patterns: ['vishing'], name: '语音钓鱼', role: '通过电话或语音渠道骗取信息', category: '社会工程' },
  { patterns: ['smishing'], name: '短信钓鱼', role: '通过短信链接或消息实施社工攻击', category: '社会工程' },
  { patterns: ['spoofing'], name: '欺骗攻击', role: '伪装身份、地址或来源骗过用户或系统', category: '攻击手法' },
  { patterns: ['brute-force attack', 'brute-force'], name: '暴力破解', role: '通过大量尝试猜测口令或密钥', category: '攻击手法' },
  { patterns: ['on-path attack'], name: '中间人攻击', role: '夹在通信双方之间窃听或篡改数据', category: '攻击手法' },
  { patterns: ['structured query language injection'], name: 'SQL 注入', role: '把恶意语句注入应用输入并操作数据库', category: '攻击手法' },
  { patterns: ['hallucinations'], name: '模型幻觉', role: '让 AI 给出看似合理但实际捏造的内容', category: 'AI 风险' },
  { patterns: ['bias'], name: '偏差', role: '让 AI 因训练数据问题得出失真结论', category: 'AI 风险' },
  { patterns: ['data privacy'], name: '数据隐私', role: '限制敏感数据在 AI 或系统中的外泄与滥用', category: 'AI 风险' },
];

function toSearchText(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function includesAny(source, needles = []) {
  return needles.some((needle) => source.includes(String(needle).toLowerCase()));
}

function lookupOptionMetadata(optionText = '') {
  const text = toSearchText(optionText);
  return OPTION_METADATA.find((item) => item.patterns.some((pattern) => text === pattern || text.includes(pattern)));
}

function containsChinese(value = '') {
  return /[\u4e00-\u9fff]/.test(String(value));
}

function getOption(question, key) {
  return question.options.find((option) => option.key === key);
}

function getAnswerLabels(question) {
  return question.answer.map((key) => {
    const option = getOption(question, key);
    return option ? `${key}. ${option.text}` : key;
  });
}

function getOptionChineseName(optionText = '') {
  const metadata = lookupOptionMetadata(optionText);
  if (metadata?.name) return metadata.name;

  const text = toSearchText(optionText);

  if (includesAny(text, ['hostname'])) return '查看主机名';
  if (includesAny(text, ['netstat'])) return '查看网络连接和端口状态';
  if (includesAny(text, ['whoami'])) return '查看当前登录用户';
  if (includesAny(text, ['winver'])) return '查看 Windows 版本信息';
  if (includesAny(text, ['ipconfig'])) return '查看 IP 配置';
  if (includesAny(text, ['ip addr'])) return '查看 IP 地址配置';
  if (includesAny(text, ['dig'])) return '查询 DNS 记录';
  if (includesAny(text, ['nslookup'])) return '查询 DNS 解析结果';
  if (includesAny(text, ['net user'])) return '查看或管理用户账户';
  if (includesAny(text, ['net use'])) return '查看或映射共享连接';
  if (includesAny(text, ['tracert', 'traceroute'])) return '跟踪网络路径';
  if (includesAny(text, ['pathping'])) return '分析链路路径和丢包';
  if (includesAny(text, ['ping'])) return '测试主机连通性';
  if (includesAny(text, ['curl'])) return '测试服务接口响应';
  if (includesAny(text, ['systeminfo'])) return '查看系统详细信息';
  if (text === 'cat') return '查看文件内容';
  if (text === 'ls') return '列出目录内容';
  if (text === 'chmod') return '修改文件权限';
  if (text === 'sudo') return '以管理员权限执行命令';
  if (text === 'mkdir') return '创建目录';
  if (text === 'cp') return '复制文件';
  if (includesAny(text, ['xcopy'])) return '复制文件和目录';
  if (includesAny(text, ['robocopy'])) return '高级复制文件和目录';
  if (includesAny(text, ['chkdsk'])) return '检查磁盘错误';
  if (includesAny(text, ['task manager'])) return '任务管理器';
  if (includesAny(text, ['event viewer'])) return '事件查看器';
  if (includesAny(text, ['services'])) return '服务管理器';
  if (includesAny(text, ['gpedit'])) return '本地组策略编辑器';
  if (includesAny(text, ['lusrmgr'])) return '本地用户和组';
  if (includesAny(text, ['risk analysis'])) return '风险分析';
  if (includesAny(text, ['backup plan'])) return '回退方案';
  if (includesAny(text, ['document findings'])) return '记录结果';
  if (includesAny(text, ['sandbox testing'])) return '沙箱测试';
  if (includesAny(text, ['change the dns settings'])) return '调整 DNS 设置';
  if (includesAny(text, ['assign a static ip address'])) return '配置静态 IP';
  if (includesAny(text, ['configure a subnet mask'])) return '配置子网掩码';
  if (includesAny(text, ['update the default gateway'])) return '更新默认网关';
  if (includesAny(text, ['timeout policies by gpo user objects'])) return 'GPO 超时策略';
  if (includesAny(text, ['alerts on authentication attempts outside of sla requirements'])) return '非授权时段登录告警';
  if (includesAny(text, ['expirations on the contractors'])) return '承包商账号到期控制';
  if (includesAny(text, ['account login restrictions set to the specified hours'])) return '指定时段登录限制';
  return '';
}

function getOptionCategory(optionText = '') {
  const metadata = lookupOptionMetadata(optionText);
  return metadata?.category ?? '其他技术概念';
}

function formatAnswerReference(question, key) {
  const option = getOption(question, key);
  if (!option) return `${key} 项`;

  const chineseName = getOptionChineseName(option.text);
  return chineseName ? `${key} 项（${chineseName}）` : `${key} 项`;
}

function localizeOptionText(optionText = '') {
  const chineseName = getOptionChineseName(optionText);
  if (!chineseName) return optionText;

  if (containsChinese(optionText)) {
    return optionText;
  }

  if (chineseName.toLowerCase() === String(optionText).toLowerCase()) {
    return optionText;
  }

  if (String(optionText).trim().length > 28 || String(optionText).trim().split(/\s+/).length > 4) {
    return optionText;
  }

  return `${chineseName}（${optionText}）`;
}

function buildContext(question) {
  const stemRaw = String(question.stem ?? '').replace(/\s+/g, ' ').trim();
  const stem = toSearchText(stemRaw);
  return {
    stem,
    stemRaw,
    answerLabels: getAnswerLabels(question),
  };
}

function pickExistingReasons(question, reasons) {
  const optionKeys = new Set(question.options.map((option) => option.key));
  return reasons.filter((item) => optionKeys.has(item.key) && !question.answer.includes(item.key));
}

function getNeedType(stem) {
  if (includesAny(stem, ['legacy linux', 'remote support', 'rdp', 'vnc', 'ssh', 'vpn', '远程', '桌面', 'vpn', 'ssh'])) return '远程访问';
  if (includesAny(stem, ['domain', 'dns', 'gateway', 'subnet', 'internal website', '域', 'dns', '网关', '子网'])) return '网络与解析';
  if (includesAny(stem, ['phishing', 'malware', 'virus', 'ransom', 'mfa', 'certificate', '钓鱼', '恶意软件', '病毒', '证书'])) return '安全与处置';
  if (includesAny(stem, ['print', 'printer', 'spooler', '打印', '打印机'])) return '打印服务';
  if (includesAny(stem, ['install', 'upgrade', 'deploy', 'image', 'driver', 'clean install', 'in place upgrade', '安装', '升级', '部署', '驱动'])) return '安装部署';
  if (includesAny(stem, ['contract', 'policy', 'offboard', 'vendor', 'administrator', '合同', '策略', '供应商', '管理员'])) return '账号或管理控制';
  return '题干给出的直接业务场景';
}

function getOptionRole(optionText) {
  const metadata = lookupOptionMetadata(optionText);
  if (metadata?.role) return metadata.role;

  const text = toSearchText(optionText);

  if (includesAny(text, ['propose the change'])) return '正式提出变更请求';
  if (includesAny(text, ['approve the change'])) return '审批变更请求';
  if (includesAny(text, ['implement the change'])) return '把变更真正实施到生产环境';
  if (includesAny(text, ['schedule the change'])) return '安排变更实施时间';
  if (includesAny(text, ['verify the date and time settings'])) return '检查设备时间和时区是否正确';
  if (includesAny(text, ['apply mobile os patches'])) return '给移动操作系统安装补丁';
  if (includesAny(text, ['uninstall and reinstall the application'])) return '卸载并重装应用程序';
  if (includesAny(text, ['escalate to the website developer'])) return '把问题升级给网站开发方处理';
  if (includesAny(text, ['installation instructions'])) return '说明设备或软件应如何安装';
  if (includesAny(text, ['emergency procedures'])) return '说明出现危险时应如何应急处理';
  if (includesAny(text, ['configuration steps'])) return '说明设备或系统应如何配置';
  if (includesAny(text, ['voltage specifications'])) return '给出设备电压等硬件参数';
  if (includesAny(text, ['check boot options'])) return '检查启动顺序和当前启动设备';
  if (includesAny(text, ['switch from uefi to bios'])) return '改用传统 BIOS 启动模式';
  if (includesAny(text, ['run data recovery tools on the disk'])) return '对磁盘执行数据恢复操作';
  if (includesAny(text, ['support from the computer'])) return '表示硬件厂商支持即将到期';
  if (includesAny(text, ['the os will be considered end of life'])) return '表示操作系统将进入停止更新和支持阶段';
  if (includesAny(text, ['built-in security software'])) return '表示下一版系统会移除内置安全软件';
  if (includesAny(text, ['new version of the os'])) return '表示厂商将很快发布新的系统版本';
  if (includesAny(text, ['to ensure that all removable media is password protected'])) return '在移动介质丢失时继续保护其中数据';
  if (includesAny(text, ['secure boot and a bios-level password'])) return '防止未授权人员改动启动配置';
  if (includesAny(text, ['vpn connectivity to be encrypted by hardware modules'])) return '通过硬件模块保护 VPN 加密过程';
  if (includesAny(text, ['tpm as an encryption factor for hard drives'])) return '让硬盘加密依赖 TPM 参与解锁';
  if (includesAny(text, ['bollards'])) return '通过防撞柱阻止车辆或设备直接进入区域';
  if (includesAny(text, ['video surveillance'])) return '通过摄像头持续记录现场画面';
  if (includesAny(text, ['badge readers'])) return '通过刷卡门禁识别并记录进出人员';
  if (includesAny(text, ['fence'])) return '通过围栏做物理隔离';
  if (includesAny(text, ['shell script', 'shell'])) return '用 shell 脚本自动化执行命令';
  if (includesAny(text, ['batch file', 'batch'])) return '用批处理脚本自动化执行命令';
  if (includesAny(text, ['.sh'])) return '作为 shell 脚本执行命令';
  if (includesAny(text, ['.js', 'javascript file'])) return '作为 JavaScript 脚本运行';
  if (includesAny(text, ['.vbs', 'visual basic'])) return '作为 Visual Basic 脚本运行';
  if (text === 'vb') return '作为 Visual Basic 脚本运行';
  if (text === 'man') return '查看 Linux 命令的帮助文档';
  if (includesAny(text, ['route print'])) return '查看本机路由表';
  if (includesAny(text, ['find'])) return '查找文本或文件内容';
  if (includesAny(text, ['sfc'])) return '检查并修复系统文件';
  if (text === 'runas') return '以其他 Windows 用户身份运行程序';
  if (text === 'su') return '切换到其他 Linux 用户身份';
  if (text === 'ip') return '查看或配置 Linux 网络参数';

  if (includesAny(text, ['hostname'])) return '查看计算机当前主机名';
  if (includesAny(text, ['netstat'])) return '查看当前网络连接、会话和端口占用';
  if (includesAny(text, ['whoami'])) return '查看当前登录的用户身份';
  if (includesAny(text, ['winver'])) return '查看当前 Windows 版本名称和版本号';
  if (includesAny(text, ['ipconfig'])) return '查看或验证本机 IP 配置';
  if (includesAny(text, ['ip addr'])) return '查看 Linux 主机的 IP 地址配置';
  if (includesAny(text, ['dig'])) return '查询远程主机的 DNS 记录';
  if (includesAny(text, ['nslookup'])) return '查询域名解析是否正常';
  if (includesAny(text, ['net user'])) return '查看或管理用户账户信息';
  if (includesAny(text, ['net use'])) return '查看或映射 SMB 共享连接';
  if (includesAny(text, ['tracert', 'traceroute'])) return '查看数据包经过的网络路径';
  if (includesAny(text, ['pathping'])) return '统计链路每一跳的延迟和丢包情况';
  if (includesAny(text, ['ping'])) return '测试目标是否可达';
  if (includesAny(text, ['curl'])) return '直接访问接口并查看返回结果';
  if (includesAny(text, ['systeminfo'])) return '查看系统的详细配置';
  if (text === 'cat') return '直接读取单个文件的内容';
  if (text === 'ls') return '查看目录里有哪些文件';
  if (text === 'chmod') return '修改文件或目录的权限';
  if (text === 'sudo') return '临时以更高权限执行命令';
  if (text === 'mkdir') return '新建目录';
  if (text === 'cp') return '复制文件或目录';
  if (includesAny(text, ['xcopy'])) return '递归复制文件和目录';
  if (includesAny(text, ['robocopy'])) return '批量复制并保留更多复制控制选项';
  if (includesAny(text, ['chkdsk'])) return '检查磁盘和文件系统错误';
  if (includesAny(text, ['vpn', '虚拟专用网'])) return '建立到公司内网的加密通道';
  if (includesAny(text, ['vnc'])) return '连接并控制图形桌面';
  if (includesAny(text, ['ssh'])) return '进行命令行远程管理';
  if (includesAny(text, ['rdp', '远程桌面'])) return '连接 Windows 图形远程桌面';
  if (includesAny(text, ['dns', '名称解析', '域名解析'])) return '修复名称解析';
  if (includesAny(text, ['static ip', '静态 ip', '静态地址'])) return '手动固定主机地址';
  if (includesAny(text, ['subnet', '子网掩码'])) return '定义本地网段范围';
  if (includesAny(text, ['gateway', '默认网关'])) return '指定访问外部网络的下一跳';
  if (includesAny(text, ['timeout', '超时'])) return '控制空闲会话多久被锁定或断开';
  if (includesAny(text, ['alert', '告警', '警报'])) return '在异常行为发生后发出告警';
  if (includesAny(text, ['expiration', '过期', '到期'])) return '控制账号在某个日期后失效';
  if (includesAny(text, ['login restrictions', '登录限制', '指定时段登录'])) return '限制账号只能在指定时段登录';
  if (includesAny(text, ['automatic', '自动'])) return '让服务随系统自动启动';
  if (includesAny(text, ['print spooler', '打印后台处理', '打印队列'])) return '恢复打印队列服务本身';
  if (includesAny(text, ['factory defaults', 'factory reset', '恢复出厂设置', '出厂默认'])) return '彻底清空设备并重建系统环境';
  if (includesAny(text, ['delete', '删除'])) return '删除表面触发源，但不一定清除后续影响';
  if (includesAny(text, ['restart', 'shut down', '重启', '关机'])) return '做一次临时重启';
  if (includesAny(text, ['reinstall', '重新安装'])) return '重装单个应用';
  if (includesAny(text, ['radius'])) return '提供网络 AAA 认证、授权和审计';
  if (includesAny(text, ['kerberos'])) return '做域环境身份认证';
  return DEFAULT_OPTION_ROLE;
}

function extractLeadClause(stemRaw) {
  if (!stemRaw) return '';

  const splitPatterns = [
    /\bwhich of the following\b/i,
    /\bwhat should\b/i,
    /\bwhat is the best\b/i,
    /\bwhat is the most likely\b/i,
    /\bhow should\b/i,
    /下列哪项/,
    /以下哪项/,
    /以下哪些/,
    /首先应该/,
    /最适合/,
    /应采取以下哪项/,
  ];

  for (const pattern of splitPatterns) {
    const match = pattern.exec(stemRaw);
    if (match && match.index > 0) {
      return stemRaw.slice(0, match.index).replace(/[，,;；:：\s]+$/, '').trim();
    }
  }

  return stemRaw;
}

function summarizeLeadClause(ctx) {
  const leadClause = extractLeadClause(ctx.stemRaw);
  if (!leadClause) return '';
  if (containsChinese(leadClause)) return leadClause;

  if (includesAny(ctx.stem, ['mfa']) && includesAny(ctx.stem, ['vacation', 'another country'])) {
    return '用户出国后，手机上的 MFA 无法正常使用';
  }

  if (includesAny(ctx.stem, ['msds', 'battery backup'])) {
    return '题目在问电池备份设备的 MSDS 里会写什么内容';
  }

  if (includesAny(ctx.stem, ['os not found'])) {
    return '电脑开机反复报 “OS Not Found”，而且当前还插着 USB 设备';
  }

  if (includesAny(ctx.stem, ['bitlocker to go'])) {
    return '管理员在培训员工使用 BitLocker To Go，题目要找的是这么做的真正目的';
  }

  if (includesAny(ctx.stem, ['detect and record access to restricted areas'])) {
    return '题目在问哪种物理控制既能限制进入受限区域，又能留下访问记录';
  }

  if (includesAny(ctx.stem, ['security updates and patches', 'end of life'])) {
    return '管理员收到通知：当前维护的系统将不再获得安全补丁和更新';
  }

  if (includesAny(ctx.stem, ['output the os name', 'os name to a file'])) {
    return '管理员要在脚本里输出当前操作系统名称';
  }

  if (includesAny(ctx.stem, ['confirm the username that the machine is currently logged in to', 'confirm the username'])) {
    return '技术员要确认这台机器当前登录的是哪个用户';
  }

  if (includesAny(ctx.stem, ['verify which smb shares are currently mapped', 'mapped smb shares'])) {
    return '技术员要查看当前命令行环境里映射了哪些 SMB 共享';
  }

  if (includesAny(ctx.stem, ['accesses a database from a local server', 'does not populate any information'])) {
    return '应用需要访问本地服务器数据库，但现在取不到数据';
  }

  if (includesAny(ctx.stem, ['investigate connections on the laptop', 'background services may be using extra bandwidth'])) {
    return '技术员怀疑后台连接占用了带宽，想看当前网络连接状态';
  }

  if (includesAny(ctx.stem, ['determine the point of failure', 'restore a customer s access to a website'])) {
    return '技术员要找出访问网站时故障具体卡在哪一段链路';
  }

  if (includesAny(ctx.stem, ['validate the ip settings'])) {
    return '技术员要验证当前主机的 IP 配置是否正确';
  }

  if (includesAny(ctx.stem, ['chief information officer', 'cio'])
    && includesAny(ctx.stem, ['enterprise resource planning', 'erp'])) {
    return 'CIO 正在推进把现有业务流程整合到 ERP 系统的项目，并且已经明确了变更范围';
  }

  if (includesAny(ctx.stem, ['work from home', 'from home'])) {
    return '用户在家办公，需要远程访问公司内部资源或办公电脑';
  }

  if (includesAny(ctx.stem, ['domain cannot be found', 'join a workstation to a domain'])) {
    return '工作站加域时报“找不到域”，但基础网络连接表面正常';
  }

  if (includesAny(ctx.stem, ['unable to connect to database'])) {
    return '用户在外部访问业务系统时，连不上公司内部数据库';
  }

  if (includesAny(ctx.stem, ['same issue happens again the next day', 'print'])) {
    return '打印问题每天都会重复出现，说明当前修复没有持久化';
  }

  if (includesAny(ctx.stem, ['unexpected overdue invoice', '逾期发票', '可疑发票'])) {
    return '手机点击可疑内容后，多项功能持续异常';
  }

  return DEFAULT_LEAD_SUMMARY;
}

function hasConcreteLeadSummary(summary = '') {
  return Boolean(summary) && summary !== DEFAULT_LEAD_SUMMARY;
}

function isDefaultOptionRole(role = '') {
  return role === DEFAULT_OPTION_ROLE;
}

function summarizeOptionSet(question) {
  const labels = question.options.map((option) => option.text);
  if (labels.length <= 4 && labels.every((label) => label.length <= 18)) {
    return labels.join('、');
  }

  return '';
}

function inferQuestionFocus(question, ctx) {
  if (includesAny(ctx.stem, ['during mfa', 'during multifactor authentication'])) {
    return 'MFA 过程中会交到用户手里的认证内容';
  }
  if (includesAny(ctx.stem, ['provided to a user'])) {
    return '题干所问场景里会直接给到用户的内容';
  }
  if (includesAny(ctx.stem, ['best describes', 'most likely'])) {
    return '最符合题干描述的术语、攻击类型或处理动作';
  }
  if (includesAny(ctx.stem, ['used to', 'used for', 'would be used to', 'purpose of'])) {
    return '真正负责该功能的技术、工具或控制';
  }
  if (includesAny(ctx.stem, ['file system', 'format', 'partition'])) {
    return '最符合平台、容量或兼容性要求的文件系统或分区方式';
  }
  if (includesAny(ctx.stem, ['attack', 'malware', 'phishing', 'ransom', 'cryptominer'])) {
    return '最符合症状的攻击或恶意软件类型';
  }
  if (includesAny(ctx.stem, ['policy', 'agreement', 'document'])) {
    return '真正适用于该管理目标的政策、协议或文档';
  }
  if (includesAny(ctx.stem, ['ai', 'hallucination', 'bias', 'privacy'])) {
    return '最符合题干所述 AI 风险或概念的那个选项';
  }

  const answerRole = getOptionRole(getOption(question, question.answer[0])?.text ?? question.answer[0]);
  if (!isDefaultOptionRole(answerRole)) {
    return answerRole;
  }

  return '';
}

function inferKnowledgePoint(question, ctx) {
  if (includesAny(ctx.stem, ['choose two', 'choose three', '选择两项', '选择三项', '多选'])) {
    return '知识点：多选题必须让每个正确项都独立满足题干条件，不能只挑“看起来也有关”的项。';
  }
  if (includesAny(ctx.stem, ['first', 'next step', 'do next', 'do first', '首先', '下一步', '先做', '第一步'])) {
    return '知识点：顺序题优先找“现在最该做的那一步”，通常是风险最低、信息增量最高的动作。';
  }
  if (includesAny(ctx.stem, ['mfa', 'totp', 'sso', 'saml', 'iam'])) {
    return '知识点：这类题考身份与访问控制，要分清认证凭据、管理平台、协议和安全策略各自负责什么。';
  }
  if (includesAny(ctx.stem, ['file system', 'format', 'partition', 'gpt', 'mbr', 'ntfs', 'apfs', 'xfs', 'ext4'])) {
    return '知识点：文件系统和分区题要同时看平台支持、容量限制、权限能力和兼容性。';
  }
  if (includesAny(ctx.stem, ['attack', 'malware', 'phishing', 'ransom', 'cryptominer', 'spyware'])) {
    return '知识点：安全题要把症状和攻击类型对上号，不要把社工、恶意代码、管理策略混成一类。';
  }
  if (includesAny(ctx.stem, ['policy', 'agreement', 'nda', 'aup', 'eula', 'sop', 'sla'])) {
    return '知识点：管理类题考的是文档和流程职责，要分清许可条款、保密协议、使用政策和操作流程。';
  }
  if (includesAny(ctx.stem, ['deploy', 'upgrade', 'install', 'image', 'pxe', 'zero-touch'])) {
    return '知识点：部署题看的是哪种方法最符合题干的人力、保留数据、自动化或规模化要求。';
  }
  return '知识点：这题更像概念辨析，关键是分清各个选项各自属于哪一类技术或控制，再看谁最贴题。';
}

function buildFallbackScenario(question, ctx) {
  const focus = inferQuestionFocus(question, ctx);
  const optionSet = summarizeOptionSet(question);

  if (focus && optionSet) {
    return `题干情境：这题没有复杂现场，核心是区分 ${optionSet} 这些选项各自代表什么，再找出真正对应“${focus}”的那个。`;
  }

  if (focus) {
    return `题干情境：这题本质上是在做概念辨析，题目要找的是“${focus}”对应的那个选项。`;
  }

  return '题干情境：这题没有长场景，核心是看每个选项真正负责什么，再判断谁和题干所问最一致。';
}

function buildGenericScenario(question, ctx) {
  const leadSummary = summarizeLeadClause(ctx);

  if (hasConcreteLeadSummary(leadSummary)) {
    return `题干情境：${leadSummary}，后面的判断都要围绕这组限制条件展开。`;
  }

  if (includesAny(ctx.stem, ['work from home', 'from home'])) {
    return '题干情境：用户在家办公，需要访问公司内部资源或远程使用公司设备。';
  }
  if (includesAny(ctx.stem, ['smartphone', 'mobile phone', 'mobile browser'])) {
    return '题干情境：移动设备在点击、安装或访问某内容后出现性能或安全异常。';
  }
  if (includesAny(ctx.stem, ['printer', 'print'])) {
    return '题干情境：用户每天都会遇到同一个打印问题，说明要找持续生效的修复方式。';
  }
  if (includesAny(ctx.stem, ['domain', 'internal website'])) {
    return '题干情境：主机网络表面可用，但访问域或内部资源时失败，需要区分是解析问题还是基础连通问题。';
  }
  if (includesAny(ctx.stem, ['vendor contract', 'certain times', 'contractors'])) {
    return '题干情境：管理员要根据合同条款，对供应商账号施加精确的访问限制。';
  }

  return buildFallbackScenario(question, ctx);
}

function buildGenericKnowledge(question, ctx) {
  return inferKnowledgePoint(question, ctx);
}

function buildGenericDecision(question, ctx) {
  const leadSummary = summarizeLeadClause(ctx);
  const answerAction = getOptionRole(getOption(question, question.answer[0])?.text ?? question.answer[0]);
  const focus = inferQuestionFocus(question, ctx);

  if (hasConcreteLeadSummary(leadSummary)) {
    return `判断关键：题干真正卡住的是“${leadSummary}”里的核心限制，所以正确项必须直接做到“${answerAction}”，而不是只部分相关。`;
  }

  if (focus && !isDefaultOptionRole(answerAction)) {
    return `判断关键：题目真正问的是“${focus}”，所以正确项必须直接体现“${answerAction}”，而不是只在旁边提供别的能力。`;
  }

  return `判断关键：题干真正要解决的是“${getNeedType(ctx.stem)}”，所以优先看正确答案是否直接提供了${answerAction}。`;
}

function buildGenericWhyChoose(question, ctx) {
  const answerLabels = question.answer.map((key) => formatAnswerReference(question, key)).join('、');
  const leadSummary = summarizeLeadClause(ctx);
  const answerRoles = question.answer
    .map((key) => getOptionRole(getOption(question, key)?.text ?? key))
    .join('，');
  const focus = inferQuestionFocus(question, ctx);

  if (hasConcreteLeadSummary(leadSummary)) {
    return `选 ${answerLabels}。题干真正要完成的是“${leadSummary}”，而这个选项的直接作用就是${answerRoles}。它不是间接辅助，而是一步打到题干要的结果。`;
  }

  if (focus && !isDefaultOptionRole(answerRoles)) {
    return `选 ${answerLabels}。题目问的是“${focus}”，而正确项本身就是用来${answerRoles}的，所以它和题干在同一条线上。`;
  }

  return `选 ${answerLabels}。原因不是“看起来相关”，而是题干卡住的核心矛盾正好需要它来${answerRoles}。这一步和题干的限制条件是直接对应的。`;
}

function localizeTextByOptions(question, text = '') {
  let result = String(text ?? '');
  const replacements = question.options
    .map((option) => ({
      from: option.text,
      to: localizeOptionText(option.text),
    }))
    .filter((item) => item.from && item.to && item.from !== item.to)
    .sort((left, right) => right.from.length - left.from.length);

  for (const item of replacements) {
    result = result.replaceAll(item.from, item.to);
  }

  return result;
}

function buildLegacyDrivenAnalysis(question, ctx) {
  const legacyExplanation = getCore2Explanation(question);
  return {
    outline: [
      buildGenericScenario(question, ctx),
      buildGenericKnowledge(question, ctx),
      buildGenericDecision(question, ctx),
    ],
    whyChoose: isGenericLegacyExplanation(legacyExplanation)
      ? buildGenericWhyChoose(question, ctx)
      : legacyExplanation,
    whyNotChoose: buildGenericWhyNotChoose(question, ctx),
  };
}

function localizeAnalysis(question, analysis) {
  return {
    ...analysis,
    outline: analysis.outline.map((item) => localizeTextByOptions(question, item)),
    whyChoose: localizeTextByOptions(question, analysis.whyChoose),
    whyNotChoose: analysis.whyNotChoose.map((item) => ({
      ...item,
      text: localizeOptionText(item.text),
      reason: localizeTextByOptions(question, item.reason),
    })),
  };
}

function buildGenericWhyNotChoose(question, ctx) {
  if (isCommandQuestion(question, ctx)) {
    return buildCommandWhyNotChoose(question, ctx);
  }

  const leadSummary = summarizeLeadClause(ctx);
  const focus = inferQuestionFocus(question, ctx);
  const answerRole = getOptionRole(getOption(question, question.answer[0])?.text ?? question.answer[0]);

  return question.options
    .filter((option) => !question.answer.includes(option.key))
    .map((option) => ({
      key: option.key,
      text: option.text,
      reason: buildWhyNotChooseReason(option, leadSummary, focus, answerRole, ctx),
    }));
}

function buildWhyNotChooseReason(option, leadSummary, focus, answerRole, ctx) {
  const role = getOptionRole(option.text);
  const localized = localizeOptionText(option.text);
  const category = getOptionCategory(option.text);

  if (hasConcreteLeadSummary(leadSummary)) {
    return isDefaultOptionRole(role)
      ? `${localized} 不直接处理题干里“${leadSummary}”这条限制，它和正确项不是同一层面的动作。`
      : `${localized} 更偏向${role}，处理方向和题干里“${leadSummary}”不一致，所以不能作为最佳答案。`;
  }

  if (focus) {
    if (isDefaultOptionRole(role)) {
      return `${localized} 属于另一类${category}概念，但题目要找的是“${focus}”，两者不是同一个知识点。`;
    }

    if (!isDefaultOptionRole(answerRole)) {
      return `${localized} 解决的是${role}；题目真正要找的是“${focus}”，也就是正确项那种“${answerRole}”方向，因此它不对。`;
    }

    return `${localized} 解决的是${role}，和题目要找的“${focus}”不是一回事。`;
  }

  return isDefaultOptionRole(role)
    ? `${localized} 和正确项不是同一类技术或控制点，题干要找的不是它。`
    : `${localized} 更偏向${role}，和题干要解决的“${getNeedType(ctx.stem)}”不完全对位，所以不是最佳答案。`;
}

function isGenericLegacyExplanation(explanation = '') {
  const text = String(explanation ?? '');
  return text.includes('最符合当前场景')
    || text.includes('直接对应题干的症状或需求')
    || text.includes('最直接对应题干给出的目标、风险或症状');
}

function looksLikeCommandText(optionText = '') {
  const text = String(optionText ?? '').trim();
  return /^[a-z][a-z0-9]*(?:\s+[-\\/\w:.]+)*$/i.test(text)
    && /[a-z]/.test(text)
    && text !== text.toUpperCase();
}

function isKnownCommandText(optionText = '') {
  const text = toSearchText(optionText);
  return [
    'hostname',
    'netstat',
    'whoami',
    'winver',
    'ipconfig',
    'ip addr',
    'dig',
    'nslookup',
    'net use',
    'net user',
    'tracert',
    'traceroute',
    'pathping',
    'ping',
    'curl',
    'systeminfo',
    'cat',
    'ls',
    'chmod',
    'sudo',
    'mkdir',
    'cp',
    'xcopy',
    'robocopy',
    'chkdsk',
    'gpupdate',
    'find',
    'cd',
  ].some((command) => text === command || text.startsWith(`${command} `));
}

function isCommandQuestion(question, ctx) {
  return includesAny(ctx.stem, ['command', 'command-line', 'linux terminal', '命令', '命令行'])
    || question.options.every((option) => looksLikeCommandText(option.text) && isKnownCommandText(option.text));
}

function getCommandGoal(ctx) {
  if (includesAny(ctx.stem, ['confirm the username', 'currently logged in'])) {
    return '确认当前登录会话对应的用户名';
  }
  if (includesAny(ctx.stem, ['output the os name', 'os name to a file'])) {
    return '输出当前操作系统名称';
  }
  if (includesAny(ctx.stem, ['verify which smb shares are currently mapped', 'mapped smb shares'])) {
    return '列出当前已经映射的 SMB 共享';
  }
  if (includesAny(ctx.stem, ['map a shared drive', 'mapping an smb share', 'mapping a remote windows share'])) {
    return '把网络共享映射成本地盘符';
  }
  if (includesAny(ctx.stem, ['view the contents of a single file', 'contents of a single file'])) {
    return '直接查看单个文件的内容';
  }
  if (includesAny(ctx.stem, ['look up dns records', 'dns records for a remote host'])) {
    return '查询远程主机的 DNS 记录';
  }
  if (includesAny(ctx.stem, ['determine how a packet reaches a server', 'determine the point of failure', 'where the issue is potentially occurring'])) {
    return '沿着网络路径定位故障卡在哪一跳';
  }
  if (includesAny(ctx.stem, ['validate the ip settings'])) {
    return '查看本机当前的 IP 配置是否正确';
  }
  if (includesAny(ctx.stem, ['accesses a database from a local server', 'does not populate any information'])) {
    return '确认应用当前有没有连到本地数据库服务';
  }
  if (includesAny(ctx.stem, ['allocate a shared folder'])) {
    return '先创建要共享出去的目录';
  }
  if (includesAny(ctx.stem, ['manage files in a linux os'])) {
    return '执行最基础的 Linux 文件管理动作';
  }
  return '';
}

function buildCommandKnowledge(ctx) {
  const goal = getCommandGoal(ctx);
  if (goal) {
    return `知识点：命令题不能只看“像不像排障工具”，而要看哪个命令本身就负责“${goal}”。`;
  }

  return '知识点：命令题要按工具职责来选，谁能直接产出题干要的结果，谁才是答案。';
}

function buildCommandDecision(question, ctx) {
  const goal = getCommandGoal(ctx);
  const answerOption = getOption(question, question.answer[0]);
  const answerRole = getOptionRole(answerOption?.text ?? question.answer[0]);

  if (goal && !isDefaultOptionRole(answerRole)) {
    return `判断关键：题干要的是“${goal}”，所以正确项必须直接做到“${answerRole}”，而不是只提供别的系统信息。`;
  }

  if (goal) {
    return `判断关键：题干要的是“${goal}”，所以正确项必须是那个直接产出该结果的命令，而不是顺手给出别的信息。`;
  }

  return !isDefaultOptionRole(answerRole)
    ? `判断关键：看正确项是不是直接负责“${answerRole}”，而不是只在旁边提供辅助排查信息。`
    : '判断关键：命令题要找的是那个直接产出题干目标结果的命令，而不是功能相邻但不直达结果的工具。';
}

function buildCommandChooseReason(answerText, ctx) {
  const text = toSearchText(answerText);

  if (includesAny(text, ['whoami'])) {
    return '它会直接输出当前会话对应的用户名，正好回答“这台机器现在是谁登录着”的问题。';
  }
  if (includesAny(text, ['winver'])) {
    return '它直接展示 Windows 的版本名称和版本号，四个选项里只有它和“操作系统名称”是同一个信息维度。';
  }
  if (includesAny(text, ['net use'])) {
    if (includesAny(ctx.stem, ['mapped', 'map', 'share'])) {
      return '它本来就是用来查看和建立网络共享映射的命令，题干问共享映射状态或映射动作时就是正解。';
    }
  }
  if (includesAny(text, ['netstat'])) {
    return '它能看到当前连接、会话和端口占用。应用取不到数据库数据时，先确认客户端是否真的建立了到数据库服务的连接，是最直接的排查入口。';
  }
  if (includesAny(text, ['ipconfig', 'ip addr'])) {
    return '它直接列出本机地址、掩码、网关等网络配置，验证 IP settings 时不需要绕弯。';
  }
  if (includesAny(text, ['tracert', 'traceroute', 'pathping'])) {
    return '它按跳数展示数据包经过的链路，能帮助判断故障到底卡在本机、出口、运营商还是目标侧。';
  }
  if (includesAny(text, ['dig', 'nslookup'])) {
    return '它的职责就是查 DNS 记录或解析结果，题干如果问名称解析，直接看它。';
  }
  if (text === 'cat') {
    return '它会把文件内容直接输出到终端，是“看单个文件内容”最直接的 Linux 命令。';
  }
  if (text === 'mkdir') {
    return '它负责新建目录；要先分配或创建共享文件夹，第一步就是把目录建出来。';
  }
  if (text === 'cp') {
    return '它是 Linux 里最基础的复制命令，本题要找的是文件管理命令，而不是网络排障工具。';
  }

  const goal = getCommandGoal(ctx);
  const role = getOptionRole(answerText);
  if (goal) {
    return !isDefaultOptionRole(role)
      ? `它的直接作用就是${role}，和题干要完成的“${goal}”是一一对应的。`
      : `它本身就是用来完成“${goal}”这类操作的命令，因此比其他工具更贴题。`;
  }

  return !isDefaultOptionRole(role)
    ? `它的职责就是${role}，比其他命令更直接贴合题干要的结果。`
    : '它直接命中题干要的结果，不需要先绕到别的命令或管理工具上。';
}

function buildCommandQuestionAnalysis(question, ctx) {
  const leadSummary = summarizeLeadClause(ctx);
  const answerKey = question.answer[0];
  const answerOption = getOption(question, answerKey);
  const answerLabel = formatAnswerReference(question, answerKey);
  const goal = getCommandGoal(ctx);

  return {
    outline: [
      hasConcreteLeadSummary(leadSummary)
        ? `题干情境：${leadSummary}。`
        : `题干情境：这题是在几条命令里找出最能直接完成题目要求的那个，不是在比谁“也许能辅助排查”。`,
      buildCommandKnowledge(ctx),
      buildCommandDecision(question, ctx),
    ],
    whyChoose: `选 ${answerLabel}。${buildCommandChooseReason(answerOption?.text ?? answerKey, ctx)}`,
    whyNotChoose: buildCommandWhyNotChoose(question, ctx, goal),
  };
}

function buildCommandWhyNotChoose(question, ctx, explicitGoal) {
  const goal = explicitGoal || getCommandGoal(ctx);

  return question.options
    .filter((option) => !question.answer.includes(option.key))
    .map((option) => {
      const text = toSearchText(option.text);

      if (goal && includesAny(text, ['hostname'])) {
        return {
          key: option.key,
          text: option.text,
          reason: `它只能显示计算机名，不能直接完成“${goal}”。`,
        };
      }

      if (goal && includesAny(text, ['whoami'])) {
        return {
          key: option.key,
          text: option.text,
          reason: `它只负责显示当前登录身份，和“${goal}”不是同一个问题。`,
        };
      }

      if (goal && includesAny(text, ['net user'])) {
        return {
          key: option.key,
          text: option.text,
          reason: `它偏向查看或管理账户资料，不会直接告诉你当前会话是谁登录，和“${goal}”不完全一致。`,
        };
      }

      if (goal && includesAny(text, ['net use'])) {
        return {
          key: option.key,
          text: option.text,
          reason: `它处理的是共享映射，不负责直接完成“${goal}”。`,
        };
      }

      if (goal && includesAny(text, ['netstat'])) {
        return {
          key: option.key,
          text: option.text,
          reason: `它看的是连接和端口状态，本身不直接完成“${goal}”。`,
        };
      }

      if (goal && includesAny(text, ['tracert', 'traceroute', 'pathping'])) {
        return {
          key: option.key,
          text: option.text,
          reason: `它的价值在于跟踪网络路径，而题干要的是“${goal}”，不是链路追踪。`,
        };
      }

      if (goal && includesAny(text, ['ipconfig', 'ip addr'])) {
        return {
          key: option.key,
          text: option.text,
          reason: `它只展示本机 IP 配置，除非题干就在问网络配置，否则不能直接完成“${goal}”。`,
        };
      }

      if (goal && includesAny(text, ['nslookup', 'dig'])) {
        return {
          key: option.key,
          text: option.text,
          reason: `它聚焦的是 DNS 查询；如果题干要的不是名称解析，这条命令就偏题了。`,
        };
      }

      if (goal && includesAny(text, ['curl'])) {
        return {
          key: option.key,
          text: option.text,
          reason: `它更适合测试 HTTP/HTTPS 接口，而题干要的是“${goal}”，不一定是 Web 请求层的问题。`,
        };
      }

      return {
        key: option.key,
        text: option.text,
        reason: goal
          ? `它主要用于${getOptionRole(option.text)}，和题干要完成的“${goal}”不是一回事。`
          : `它主要用于${getOptionRole(option.text)}，但题干要的不是这一类结果。`,
      };
    });
}

function buildRemoteGuiLinux(question) {
  return {
    outline: [
      '题干情境：技术员要从 Windows 笔记本远程支持一台旧版 Linux，而且必须“看到用户正在做什么”并且能直接操作对方会话。',
      '知识点：区分 VPN、SSH、RDP、VNC 的能力边界，尤其是“是否能做图形界面远控”。',
      '判断关键：题干明确要求图形界面 + 交互控制，所以只提供网络通道或命令行的方案都不够。',
    ],
    whyChoose: '选 B. VNC。VNC 的核心就是把远端图形桌面传过来，并允许本地接管鼠标键盘，这正好符合“看见用户界面并且直接操作”的要求。Linux 老系统上也比 RDP 更常见、更贴题。',
    whyNotChoose: [
      { key: 'A', text: 'VPN', reason: 'VPN 只是先把两端网络打通，解决的是“能不能进网”，不负责把对方桌面画面传过来。单靠 VPN 不能完成图形远控。' },
      { key: 'C', text: 'SSH', reason: 'SSH 适合命令行远程管理。题干要的是“看用户正在做什么”，这说明必须进入图形会话，SSH 做不到这一点。' },
      { key: 'D', text: 'RDP', reason: 'RDP 更典型地对应 Windows 远程桌面。题干特意强调 legacy Linux，最稳妥的匹配是 Linux 图形远控常见方案 VNC。' },
    ],
  };
}

function buildDomainDns(question) {
  return {
    outline: [
      '题干情境：工作站加域时报“找不到域”，但又能 ping 服务器、也能上网，说明基础 IP 连通性大概率不是问题。',
      '知识点：域加入依赖 DNS 找到域控制器；能 ping IP 或能上网，不代表能正确解析域服务记录。',
      '判断关键：题干的报错是“domain cannot be found”，这是典型的域发现/名称解析问题。',
    ],
    whyChoose: '选 A. Change the DNS settings。加域时客户端需要通过 DNS 定位域控制器和相关 SRV 记录。现在机器虽然能通网，但找不到域，最先该修的是 DNS 指向，而不是随便改其他三层参数。',
    whyNotChoose: [
      { key: 'B', text: 'Assign a static IP address.', reason: '静态 IP 解决的是地址分配方式，不会让客户端突然知道域控制器在哪里。题干没有出现 DHCP 地址混乱的线索。' },
      { key: 'C', text: 'Configure a subnet mask.', reason: '子网掩码影响本地网段划分。题干已经能 ping 服务器并访问互联网，说明掩码大概率没把网络打断。' },
      { key: 'D', text: 'Update the default gateway.', reason: '默认网关主要影响跨网段访问。现在互联网都能访问，说明网关并不是导致“找不到域”的第一嫌疑。' },
    ],
  };
}

function buildRemoteWindowsFromHome(question) {
  return {
    outline: [
      '题干情境：用户想在家里直接使用办公室的 Windows 电脑，而且不想来回带公司设备。',
      '知识点：要远程用办公室 PC，通常同时需要“安全进内网”和“看到那台 Windows 桌面”。',
      '判断关键：这是多选题，必须同时满足网络接入和图形远程控制两个条件。',
    ],
    whyChoose: '选 C. RDP 和 D. VPN。RDP 负责把办公室那台 Windows 电脑的图形桌面远程呈现出来；VPN 负责先让家里的设备安全接入公司内网。少了 VPN，很多场景连不到内部主机；少了 RDP，就只是进了网但没有办法真正操作那台办公室电脑。',
    whyNotChoose: pickExistingReasons(question, [
      { key: 'A', text: 'SPICE', reason: 'SPICE 更常见于虚拟化桌面场景，不是题干里“远程用办公室现成 Windows PC”的常规答案。' },
      { key: 'B', text: 'SSH', reason: 'SSH 偏命令行管理，不适合直接远程使用 Windows 图形桌面。' },
      { key: 'E', text: 'RMM', reason: 'RMM 更偏运维托管和远程支持工具，不是员工日常远程办公直接登录自己办公室 PC 的标准答案。' },
      { key: 'F', text: 'WinRM', reason: 'WinRM 主要用于远程管理和自动化，不是给普通用户做图形化远程办公用的。' },
    ]),
  };
}

function buildRadiusAAA(question) {
  return {
    outline: [
      '题干情境：题目直接问“哪个协议给网络服务提供 AAA”。',
      '知识点：AAA 是 Authentication、Authorization、Accounting，常见网络接入协议里最典型的是 RADIUS。',
      '判断关键：看的是“网络服务 AAA 协议”这个知识点，而不是一般意义上的认证技术。 ',
    ],
    whyChoose: '选 A. RADIUS。RADIUS 就是网络接入场景里最经典的 AAA 协议，广泛用于无线网络、VPN、交换机/路由器接入认证。',
    whyNotChoose: [
      { key: 'B', text: 'Kerberos', reason: 'Kerberos 更偏域环境里的身份认证协议，本题问的是给网络服务提供 AAA 的协议，不是单一认证票据机制。' },
      { key: 'C', text: 'TKIP', reason: 'TKIP 是无线加密相关技术，不提供认证、授权和审计三件套。' },
      { key: 'D', text: 'WPA3', reason: 'WPA3 是无线安全标准，不等同于 AAA 协议本身。' },
    ],
  };
}

function buildPrintSpoolerPersistent(question) {
  return {
    outline: [
      '题干情境：用户每天早上第一件事就是打印报表，每天都得找帮助台临时改一次设置，说明修复没有持久化。',
      '知识点：这种“当天修好、第二天又坏”的打印问题，往往要同时处理服务当前状态和启动方式。',
      '判断关键：多选题里，一项负责让服务现在能用，另一项负责让它以后每次开机都能自动起来。',
    ],
    whyChoose: '选 D. Start the print spooler service 和 E. Set the print spooler to Automatic。D 解决“现在打印不了怎么办”，先把 Print Spooler 服务拉起来；E 解决“为什么明天还会再坏”，把它改成自动启动后，用户以后登录时不需要再手工处理。',
    whyNotChoose: [
      { key: 'A', text: 'Set the print spooler to have no dependencies.', reason: '随便取消依赖关系可能反而导致服务异常，题干也没有证据说明依赖链本身配置错了。' },
      { key: 'B', text: 'Set the print spooler recovery to take no action.', reason: '这反而降低了服务失败后的自恢复能力，和“以后不要再报修”完全反着来。' },
      { key: 'C', text: 'Start the printer extensions and notifications service.', reason: '题干核心是 Print Spooler 每天没有保持可用，不是扩展通知服务本身。' },
      { key: 'F', text: 'Set the print spooler log-on to the user’s account.', reason: 'Print Spooler 应该作为系统服务运行，绑到某个用户账户既不必要也容易引入新的权限问题。' },
    ],
  };
}

function buildMobileFactoryReset(question) {
  return {
    outline: [
      '题干情境：用户点了可疑“逾期发票”附件后，手机浏览器和其他应用都开始异常，重启也无效。',
      '知识点：这已经不是单个邮件或单个浏览器的问题，而是整机层面的移动恶意软件/系统污染迹象。',
      '判断关键：既然重启无效且影响面扩大到多个应用，最可能有效的是彻底清除环境，而不是做局部修补。',
    ],
    whyChoose: '选 C. Wiping the device and resetting it to factory defaults。题干已经给出“点了可疑附件后多应用异常、重启仍不恢复”，这说明风险可能已经落到系统层。工厂重置是最彻底、最符合移动端恶意软件处置思路的方案。',
    whyNotChoose: [
      { key: 'A', text: 'Forcing the smartphone to shut down and restarting it', reason: '题干已经明确说普通重启后问题依旧，强制关机本质上仍是重复同一类临时动作。' },
      { key: 'B', text: 'Deleting the email containing the attachment', reason: '删邮件只能去掉表面的触发源，已经发生的感染或系统污染并不会因此自动消失。' },
      { key: 'D', text: 'Uninstalling and reinstalling the mobile browser', reason: '题干说的不只是浏览器异常，其他应用也受影响，所以问题范围明显大于浏览器本身。' },
    ],
  };
}

function buildVpnDatabase(question) {
  return {
    outline: [
      '题干情境：CFO 在家打开财务软件时提示“Unable to connect to database”。',
      '知识点：公司内部数据库大多不直接暴露到公网，居家访问前先要确认是否已通过 VPN 进入内网。',
      '判断关键：这是 first step 题，先检查能否连到内部网络，再谈软件版本或重启。 ',
    ],
    whyChoose: '选 D. Verify the VPN status。会计软件报数据库连不上，最先要怀疑的是“人在外部、数据库在公司内网、VPN 没连上”。这一步最贴近题干场景，也最省排障成本。',
    whyNotChoose: [
      { key: 'A', text: 'Confirm the application is up to date', reason: '软件是否最新不会优先解释“在家办公时数据库连接不上”这个典型内网可达性问题。' },
      { key: 'B', text: 'Return to the office', reason: '这不是排障动作，只是回避问题；题干问的是应该先做什么检查。' },
      { key: 'C', text: 'Restart the PC', reason: '重启可能偶尔缓解，但没有直接命中“数据库在内网、人在家”的核心矛盾。' },
    ],
  };
}

function buildLoginHours(question) {
  return {
    outline: [
      '题干情境：管理员在为新供应商创建账号，合同明确规定这些人只能在特定时间段工作。',
      '知识点：这种要求考的是“按时间窗口限制登录权限”，而不是会话超时、违规告警或合同到期失效。',
      '判断关键：题干强调的是“每天/每周什么时间能登录”，所以要找能直接限制 logon hours 的控制。 ',
    ],
    whyChoose: '选 D. Account login restrictions set to the specified hours。这个设置直接控制账号只能在批准的时间窗口内登录，和合同里的“只能在特定时间工作”是一一对应的。',
    whyNotChoose: [
      { key: 'A', text: 'Timeout policies by GPO user objects', reason: '超时策略管的是“登录后空闲多久断开/锁定”，不是“这个人什么时候允许开始登录”。' },
      { key: 'B', text: 'Alerts on authentication attempts outside of SLA requirements', reason: '告警只能在违规尝试发生后通知管理员，不能真正阻止对方在不允许的时间登录。' },
      { key: 'C', text: 'Expirations on the contractors’ accounts', reason: '账号过期控制的是合同结束日期，不是每天哪些小时段可工作。它粒度太粗，解决不了题干的时间窗口要求。' },
    ],
  };
}

function buildChangeManagementRiskAnalysis(question) {
  return {
    outline: [
      '题干情境：CIO 正在推进把现有业务流程整合到 ERP 系统的项目，而且已经先确定了变更范围，再把需求交给 IT 部门。',
      '知识点：标准变更流程里，范围明确后下一步通常先做风险分析，再决定测试、回退和实施细节。',
      '判断关键：题干问的是“范围已经明确之后，下一步该做什么”，不是问最终实施前要准备哪些材料。',
    ],
    whyChoose: `选 ${formatAnswerReference(question, 'B')}。既然题干已经把“变更范围”这一步做完了，下一步最合理的就是评估这次 ERP 变更会带来哪些业务、技术和实施风险，后面的测试方案、回退方案和记录动作都要建立在这个判断之上。`,
    whyNotChoose: [
      {
        key: 'A',
        text: getOption(question, 'A')?.text ?? 'Backup plan',
        reason: '回退方案通常是在知道风险点和实施影响后再细化的准备动作；如果连风险还没分析，就还不知道需要为哪些失败场景做回退准备。',
      },
      {
        key: 'C',
        text: getOption(question, 'C')?.text ?? 'Document findings',
        reason: '记录结果是分析、测试或实施之后的收尾动作，本身不是“范围确认后立刻要做的下一步”。',
      },
      {
        key: 'D',
        text: getOption(question, 'D')?.text ?? 'Sandbox testing',
        reason: '沙箱测试属于验证阶段，前提是已经知道要重点验证哪些风险和影响面；在此之前先做风险分析更符合顺序。',
      },
    ],
  };
}

const SPECIFIC_BUILDERS = [
  {
    match(ctx, question) {
      return isCommandQuestion(question, ctx);
    },
    build: buildCommandQuestionAnalysis,
  },
  {
    match(ctx) {
      return includesAny(ctx.stem, ['legacy linux', '旧版 linux', '遗留 linux'])
        && includesAny(ctx.stem, ['see what the user is doing', 'interact with', '看到用户', '与用户会话交互', '交互用户会话']);
    },
    build: buildRemoteGuiLinux,
  },
  {
    match(ctx) {
      return includesAny(ctx.stem, ['join a workstation to a domain', '将工作站加入域', '加入域'])
        && includesAny(ctx.stem, ['domain cannot be found', '找不到域', '无法找到域']);
    },
    build: buildDomainDns,
  },
  {
    match(ctx) {
      return includesAny(ctx.stem, ['work from home', '在家办公'])
        && includesAny(ctx.stem, ['use a windows pc at the main office', '远程访问办公室的 windows pc', '使用办公室的 windows pc', '访问办公室的 windows 电脑']);
    },
    build: buildRemoteWindowsFromHome,
  },
  {
    match(ctx, question) {
      return includesAny(ctx.stem, ['provides aaa for network services', '为网络服务提供 aaa', '网络服务 aaa'])
        || (question.answer.length === 1
          && getOption(question, question.answer[0])?.text === 'RADIUS'
          && includesAny(ctx.stem, ['protocol', '协议']));
    },
    build: buildRadiusAAA,
  },
  {
    match(ctx) {
      return includesAny(ctx.stem, ['same issue happens again the next day', '第二天还会发生同样的问题', '每天都要重复处理'])
        && includesAny(ctx.stem, ['print', '打印']);
    },
    build: buildPrintSpoolerPersistent,
  },
  {
    match(ctx) {
      return includesAny(ctx.stem, ['unexpected overdue invoice', '逾期发票', '可疑发票'])
        && includesAny(ctx.stem, ['smartphone', '手机', '智能手机']);
    },
    build: buildMobileFactoryReset,
  },
  {
    match(ctx) {
      return includesAny(ctx.stem, ['working from home', '在家办公'])
        && includesAny(ctx.stem, ['unable to connect to database', '无法连接数据库', '连接不到数据库']);
    },
    build: buildVpnDatabase,
  },
  {
    match(ctx) {
      return includesAny(ctx.stem, [
        'only during certain times',
        'specified hours',
        '特定时间',
        '指定时段',
        '登录时间',
        '工作时间',
      ]);
    },
    build: buildLoginHours,
  },
  {
    match(ctx) {
      return includesAny(ctx.stem, ['chief information officer', 'cio'])
        && includesAny(ctx.stem, ['enterprise resource planning', 'erp'])
        && includesAny(ctx.stem, ['scope of the change', 'do first', 'do next', 'next']);
    },
    build: buildChangeManagementRiskAnalysis,
  },
];

export function buildCore2Analysis(question) {
  const ctx = buildContext(question);
  const specific = SPECIFIC_BUILDERS.find((builder) => builder.match(ctx, question));

  if (specific) {
    return localizeAnalysis(question, specific.build(question, ctx));
  }

  return localizeAnalysis(question, buildLegacyDrivenAnalysis(question, ctx));
}

export function applyStoredCore2Analyses(questions = [], records = []) {
  const analysisMap = new Map(records.map((record) => [record.id, record]));

  return questions.map((question) => {
    const record = analysisMap.get(question.id);
    if (record?.analysis && record?.explanation) {
      return {
        ...question,
        explanation: record.explanation,
        analysis: record.analysis,
      };
    }

    const analysis = buildCore2Analysis(question);
    return {
      ...question,
      explanation: analysis.whyChoose,
      analysis,
    };
  });
}

export function decorateCore2Questions(questions = []) {
  return applyStoredCore2Analyses(questions, []);
}
