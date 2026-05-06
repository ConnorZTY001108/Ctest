function normalizeText(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function includesAny(source, needles = []) {
  return needles.some((needle) => source.includes(needle));
}

function getOptionLabel(question, key) {
  const option = question.options.find((item) => item.key === key);
  return option ? `${key}. ${option.text}` : key;
}

function getCorrectOptionTexts(question) {
  return question.answer.map((key) => {
    const option = question.options.find((item) => item.key === key);
    return option?.text ?? key;
  });
}

function buildContext(question) {
  const answerTexts = getCorrectOptionTexts(question);
  const answerLabel = question.answer.map((key) => getOptionLabel(question, key)).join('、');
  const answerText = answerTexts.join(' | ');

  return {
    question,
    answerTexts,
    answerLabel,
    answerText,
    normalizedStem: normalizeText(question.stem),
    normalizedAnswer: normalizeText(answerText),
  };
}

const MULTI_EXPLANATIONS = {
  57: '离职要同时收回物理门禁和逻辑访问权限。停用门禁卡先切断现场进入能力，停用邮箱则避免继续访问公司通信与重置链接。',
  64: 'RDP 负责把办公室 Windows 电脑的桌面远程呈现出来，VPN 负责先安全接入公司网络。两者配合，用户在家也能像坐在办公室电脑前一样工作。',
  106: '屏保锁能在用户离开座位时自动要求重新认证，BIOS 密码能阻止未授权人员改启动项或进入固件设置。两层一起能同时覆盖系统内和开机前的访问。',
  117: '浏览器主页被篡改且搜索结果被劫持，优先先把恶意扩展移除，再把启动页恢复到可信设置。这样能同时处理感染入口和被篡改后的浏览器行为。',
  137: '问题每天重复出现，说明不只是临时启动一次服务，而是要把 Print Spooler 真正恢复并设为开机自动启动。这样第二天登录时服务才会自己起来。',
  144: '新装工作站要先消除明显的默认风险：禁用 Guest 账户，避免匿名或弱控制访问；同时修改默认管理员密码，防止被用已知默认口令登录。',
  157: '.pkg 和 .dmg 是 macOS 常见安装分发格式，.app 是应用程序包本体。它们都是 Mac 上安装或运行软件时最常见的文件形式。',
  179: '要保证备份“能恢复”，不仅要做完整备份形成基线，还要定期做备份测试验证文件确实可还原。只做计划不验证，恢复时很容易发现备份不可用。',
  182: '受监管环境传输敏感信息，至少要补三层控制：MFA 提升账户安全，Private Channels 缩小可见范围，Data Retention 满足合规留存要求。',
  191: 'Applications 和 Library 都是 macOS 的标准系统目录。前者存放应用，后者存放系统与应用共享资源、配置和支持文件。',
  203: '要看到 AppData 这类默认隐藏目录，先得进入 File Explorer，再勾选显示隐藏文件。两步缺一不可，否则目录仍然不会显示出来。',
  216: 'PIN 能提高设备被拿到手后的解锁门槛，屏幕超时则减少设备无人看管时长时间处于已解锁状态。两者组合才是最直接的物理访问防护。',
  268: '面对不断打断的客户，先用主动倾听让对方感到被重视，再持续保持冷静和同理心，才能把情绪降下来并重新把对话拉回问题本身。',
  271: '4TB 磁盘并且要求至少五个主分区，必须选 GPT；安装 Windows 11 作为本地系统盘，文件系统则应选 NTFS。',
};

const QUESTION_OVERRIDES = {
  10: '题干说明厂商不再提供补丁和安全更新，这就是软件进入 EOL 的典型信号。继续使用不会立刻坏掉，但新的漏洞将不再得到官方修补。',
  23: '手机丢失时，用户未必能第一时间发现，所以要用设备级加密保护“静态数据”。即使设备落入他人手中，没有密钥也无法直接读取敏感内容。',
  36: '从家里访问公司文件，先要让笔记本安全进入公司内网。VPN 建立的是受保护的远程隧道，本题核心不是共享权限而是先把网络通路打通。',
  55: '能否装 64 位系统首先取决于 CPU 是否支持 64 位指令集。这里用 CPU 型号来判断架构能力，比看内存或磁盘容量更直接。',
  61: '安全网段常常不会开放自动分配地址，所以网络工程师提前给出静态 IP 信息。根因不是客户端坏了，而是该子网本来就没有 DHCP 服务。',
  73: 'BSOD 的关键证据通常在系统日志里。Event Viewer 能看到崩溃时间点对应的驱动、服务或内核错误，比盲目更换硬件更有效。',
  90: 'AAA 指认证、授权、审计。RADIUS 就是典型的网络 AAA 协议，常用于无线接入、VPN 和网络设备集中认证。',
  95: '手机收到登录批准推送，说明第二因子不是短信，而是认证器应用在做推送确认。它把“是否本人登录”的批准动作绑定到受信设备上。',
  102: 'CMDB 记录资产、负责人、依赖关系和业务重要性。要找服务器归属人及其承载的关键业务，最应该查的就是 CMDB。',
  104: 'Cryptominer 会偷偷占用 CPU/GPU 挖矿，所以最典型的表现就是资源占用异常高、机器发热和卡顿。它和窃密型恶意软件的表现不同。',
  109: '3-2-1 的核心之一就是“至少两种不同介质”。这样即使某一种介质整体故障，也不会把所有备份一起拖垮。',
  121: '和公司外部人员讨论保密项目时，首要是先受 NDA 约束，明确哪些信息可以说、哪些不能说，以及泄露后的责任。',
  124: 'CEO 需要远程员工一起开会、演示和培训，重点是实时音视频和共享协作，因此应选 Videoconferencing，而不是单向邮件或聊天工具。',
  135: '旧平板装不了最新版应用，最常见原因不是许可证，而是底层 OS 太老、厂商不再支持新版应用。应用开发者通常只面向受支持的平台版本。',
  146: '本题考的是特权访问管理思路：管理员不应默认长期持有高权限，而是只在需要访问特定服务时按需获得提升权限。',
  163: '服务端和定义文件都正常，但客户端却不断弹旧告警，最像本地程序文件损坏或缺失。也就是防护界面还能弹窗，实际组件状态却不一致。',
  183: '漫游配置文件加载很慢，首先看是否把大量文件塞进了随用户同步的主目录。大文件应该放到 Home Folder 或重定向位置，而不是放进漫游配置文件里。',
  202: '题干表现已经从误点可疑附件扩大到整机浏览器和应用性能异常，说明问题可能深入到移动系统环境。简单重启无效时，最彻底的处置是清空设备并恢复出厂。',
  229: '本题的关键词是“AI 因训练数据有限而做出错误假设”。这更符合 Bias：模型因数据覆盖或偏差不足而得出失真的结论。',
  234: 'Kerberos 票据高度依赖双方时间同步。时间偏差过大时，票据会被认为无效或过期，所以它特别依赖准确的系统时钟。',
  245: '服务器操作系统和桌面版 Windows 不同。题干问最可能装在服务器上的 Microsoft Windows 版本，自然是 Windows Server 2022。',
  253: '按题库给定答案，本题把 low-level formatting 视作能把原有数据结构进一步清除的处理方式。考点是“删除文件名不等于真正清除底层数据”。',
  295: 'SDS/MSDS 关注的是危险品成分、风险、泄漏处理和应急措施。对于 UPS 或电池类设备，最关键的信息之一就是发生危险时该怎么应急处置。',
  296: 'macOS 很多应用本体就是 `.app` 包，拖到废纸篓即可完成最基本的卸载。因此这类文件类型和 Mac 的“直接拖拽删除”模型高度相关。',
  300: '大量用户把数据留在本机时，升级系统又不想丢文件和应用，最快的做法就是 in-place upgrade。它保留现有环境，不像 wipe-and-load 那样需要大规模迁移。',
  313: '题干要求远程连到 Windows Web 服务器做检查，Windows 默认最常见的图形化远程管理技术就是 RDP。SSH 更常见于命令行或类 Unix 设备。',
  318: 'MFA 给用户提供的“一次性时间码”就是 TOTP。它基于时间和共享密钥生成，过一小段时间就失效，比静态口令安全得多。',
};

function createRule(match, explanation) {
  return { match, explanation };
}

const RULES = [
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('vnc'),
    'VNC 提供图形化远程控制，适合从 Windows 端查看并操作 Linux 桌面会话。VPN 只提供安全通道，SSH 主要是命令行，不满足题干的可视化交互要求。',
  ),
  createRule(
    (ctx) => ctx.normalizedStem.includes('join a workstation to a domain') || (ctx.normalizedStem.includes('domain') && ctx.normalizedAnswer.includes('dns')),
    '域加入和访问内部域资源都依赖正确的 DNS 解析到域控制器。能上网或能 ping IP 并不代表域发现正常，所以优先检查 DNS 指向。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('propose the change'),
    '变更管理的起点是先正式提出变更请求，再做审批、排期、测试和实施。发现设备 EOL 只是触发条件，不代表可以直接进入执行阶段。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('date and time settings') || (ctx.normalizedStem.includes('mfa') && ctx.normalizedStem.includes('vacation')),
    '基于时间的一次性口令和很多 MFA 机制都依赖准确时钟。跨时区旅行后，手机时间不同步是最常见也最值得先排查的原因。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('emergency procedures'),
    'SDS/MSDS 的重点是危险物料的风险、处置和应急流程。涉及电池备份设备时，真正关键的是发生泄漏、起火或接触危险物时该怎么处理。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('check boot options') || ctx.normalizedAnswer.includes('boot order'),
    '出现 “OS Not Found” 时，先确认系统是否正尝试从正确磁盘启动。特别是接着 USB 安装介质或外设时，错误的启动顺序是常见根因。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('bitlocker to go'),
    'BitLocker To Go 用于给可移动存储介质加密。培训员工使用它的目的，就是在 U 盘或移动硬盘遗失时，别人无法直接读取其中的数据。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('badge reader'),
    'Badge reader 直接把“谁在什么时候进入了哪片受限区域”记录下来，是最典型的物理门禁审计手段。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('network based remote installation tool'),
    '大规模给不同硬件型号分发定制镜像时，网络部署工具最省人力。它能统一下发镜像和驱动，不需要一台一台手工安装。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('private browsing'),
    '私密/无痕窗口能隔离现有 cookie、会话和缓存。遇到单点登录冲突或账号黏连时，用它验证最直接也最安全。',
  ),
  createRule(
    (ctx) => includesAny(ctx.normalizedAnswer, ['quarantine the infected systems', 'quarantine the machine', 'quarantine the system', 'isolate the system']),
    '发现疑似感染时，第一目标是先遏制扩散。把设备隔离或隔离到检疫网络后，再做查杀、取证和恢复，能避免继续横向传播。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer === 'su',
    '`su` 用于切换到另一个用户，常见场景就是切到 root 执行管理任务，因此它属于 Linux 中的管理类命令。',
  ),
  createRule(
    (ctx) => includesAny(ctx.normalizedAnswer, ['security hygiene', 'educate the end user', 'user education', 'threat education']),
    '很多恶意软件事件的根因是用户点击、安装或泄露凭据。技术处置完成后补做用户教育，才能减少同类事件再次发生。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('zero day'),
    'Zero-day 指漏洞已经被利用，但厂商还没有正式补丁或缓解措施。风险点就在于防守方几乎没有准备时间。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('ease of access'),
    'Windows 的语音识别和多种辅助功能都集中在 Ease of Access/辅助功能设置里，本题考的是功能所在位置而不是驱动或服务。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('turn windows features on or off'),
    '.NET Framework 3.5 属于 Windows 可选组件。缺依赖时最稳妥的做法就是在“Turn Windows features on or off”里启用它，而不是乱装第三方包。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('license assignment') || ctx.normalizedStem.includes('features are disabled and require a log in'),
    '功能被锁定且要求登录，通常不是程序损坏，而是该用户没有被分配对应许可证。先查授权分配最符合题干症状。',
  ),
  createRule(
    (ctx) => includesAny(ctx.normalizedAnswer, ['encryption', 'device encryption', 'bitlocker', 'full disk encryption']),
    '这类技术保护的是静态数据。设备遗失或被偷后，即使硬盘被拆走或手机落入他人手中，没有密钥也难以直接读取内容。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('in place upgrade'),
    'In-place upgrade 的价值是保留原有应用、数据和大部分配置，同时把系统升级到新版本。题干强调“快”和“不要丢数据”时，它通常是最佳答案。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('standard operating procedures') || ctx.normalizedAnswer === 'sop',
    'SOP 把每次都要一致执行的信息采集、记录和处理步骤标准化。像工单里漏写联系人、资产号、问题描述，这类场景就该用 SOP 纠正。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('resource monitor'),
    'Resource Monitor 更适合看进程级别的 CPU、内存、磁盘和网络资源变化。应用随着时间越来越慢但不直接崩溃时，它能帮助定位哪类资源被拖垮。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('ext4'),
    '`ext4` 是 Linux 上最常见的本地文件系统之一，因此题目问 Linux 常用文件系统时它最符合。',
  ),
  createRule(
    (ctx) => includesAny(ctx.normalizedAnswer, ['performing a low level format', 'low level formatting', 'drilling', 'degaussing followed by physical shredding', 'certified third party destruction']),
    '这类答案都指向“让数据无法恢复”的介质处理方式。考点不是普通删除，而是选择足够彻底、符合场景或合规要求的销毁方法。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('update the failed software'),
    '手机系统升级后只有某个企业应用打不开，说明更像是应用兼容性问题，而不是整机故障。先更新或修复这个出问题的应用最符合排障顺序。',
  ),
  createRule(
    (ctx) => includesAny(ctx.normalizedAnswer, ['rogue wireless access point', 'evil twin']),
    '题干里出现“同名无线”“能上网但进不了公司资源”这类线索，说明用户很可能连到了伪造或未授权 AP。它模仿合法 SSID 来诱导连接。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('content filtering'),
    '按网站分类限制访问，本质就是内容过滤。它根据站点类别和策略进行拦截，比单纯端口开放或 DNS 解析更贴合题干要求。',
  ),
  createRule(
    (ctx) => includesAny(ctx.normalizedAnswer, ['facial recognition', 'fingerprint', 'windows hello']),
    '题干要的是更强的本地身份验证。生物识别把“你是谁”作为认证因子，比共享 PIN/口令更难被随手告诉别人。',
  ),
  createRule(
    (ctx) => includesAny(ctx.normalizedAnswer, ['escalate the ticket to the next level', 'escalate the issue to a senior team member', 'escalate the request']),
    '当问题反复出现、超出当前权限，或者涉及政策/合规审批时，继续硬扛只会拖延。升级并带上已做排查和下一步建议，才是专业做法。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer === 'aup',
    'AUP（可接受使用政策）规定员工使用公司资源时哪些行为被允许、哪些被禁止，是“员工可以怎么用公司设备/网络”的直接依据。',
  ),
  createRule(
    (ctx) => includesAny(ctx.normalizedAnswer, ['image deployment', 'pxe', 'zero touch deployment']),
    '这类方案都服务于大批量、少人工的系统部署。题干强调“很多设备”“直接从网络或厂家发货”，就该想到自动化镜像部署。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('virtual private network') || ctx.normalizedAnswer === 'vpn',
    'VPN 的作用是把远端设备安全接入内部网络。只要题干目标是“人在外部，资源在公司内网”，VPN 通常就是先决条件。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('event viewer'),
    '系统或服务短暂启动后又停止、反复蓝屏、异常告警等问题，最有价值的证据通常在事件日志里。Event Viewer 能看到失败原因和时间点。',
  ),
  createRule(
    (ctx) => includesAny(ctx.normalizedAnswer, ['potentially unwanted program', 'spyware', 'cryptominer', 'ransomware']),
    '这类选项都在考恶意软件特征：PUP 常随安装包夹带，Spyware 偷数据，Cryptominer 偷算力，Ransomware 加密文件勒索。要根据症状对应到正确类型。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer === 'net use' || ctx.normalizedAnswer.includes('net use '),
    '`net use` 用来映射、查看或管理 SMB 网络共享。只要题干提到“共享盘映射”“查看当前映射”“命令行挂载共享”，答案基本都是它。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('deploy mdm') || ctx.normalizedAnswer === 'mdm' || ctx.normalizedAnswer.includes('management profile'),
    '企业要统一约束手机/平板的应用、补丁和安全基线，就要靠 MDM 或管理配置文件。它能集中下发限制、合规和擦除策略。',
  ),
  createRule(
    (ctx) => includesAny(ctx.normalizedAnswer, ['sending a code to the user s phone', 'authenticator', 'multifactor authentication', 'totp']),
    '这类答案都属于在密码之外再加一个独立因子。核心知识点是：即使密码泄露，攻击者仍需要手机、令牌或用户批准动作才能登录。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('use appropriate lifting techniques'),
    'UPS 电池模块很重，拆装时最大的即时风险是人身伤害。确认断电和放电后，下一步就该按正确搬运姿势和安全规范操作。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('port mapping'),
    'Port mapping/forwarding 只暴露需要的端口并控制入口方向。题干要在局域网通过 IP 访问，又不想被互联网直接打到，本质是在做端口范围控制。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('bios password'),
    'BIOS/UEFI 密码能阻止普通用户进入固件界面改启动项或打开硬件虚拟化等底层功能。它保护的是“开机前配置入口”。',
  ),
  createRule(
    (ctx) => includesAny(ctx.normalizedAnswer, [' bat', '.bat', 'batch']),
    'BAT/Batch 是 Windows 上最直接的脚本自动化方式，适合在登录、启动或老旧环境里调用一串简单命令。',
  ),
  createRule(
    (ctx) => includesAny(ctx.normalizedAnswer, ['hallucinations', 'bias', 'data privacy']),
    'AI 相关题通常考三类风险：Hallucination 是捏造事实，Bias 是因训练数据偏差得出偏颇结果，Data privacy 则强调数据不离开本地或受控环境。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('file size and related memory utilization'),
    '大型表格卡死更像内存与文件规模问题，而不是网络或磁盘带宽不足。看文件大小和内存占用能快速判断是否超出了本机处理能力。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('background applications'),
    '手机续航突然变差时，首先看后台哪些应用在持续运行、定位、联网或推送。它们比电池老化更常见，也更适合作为第一步排查。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('remove users from the local admin group') || ctx.normalizedAnswer.includes('remove account administrative rights'),
    '限制本地管理员权限能显著降低未授权安装软件和高风险更改。用户没有管理员权限，就更难随意装程序或绕过安全控制。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('increase the amount of ram'),
    '文件越做越大而打不开，最常见瓶颈是内存而不是 CPU。增加 RAM 能提高大型表格打开和处理时的可用工作集。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('delete hidden network adapters'),
    'VPN 客户端残留的虚拟网卡对象会阻止重新安装。把隐藏适配器删掉，等于先清理旧驱动和绑定记录，再重新安装新版客户端。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('secure master password'),
    '密码管理器本身保存大量高价值凭据，所以主密码必须足够强。主密码失守，整个密码库都会一起暴露。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('rdp') && ctx.normalizedAnswer.includes('vpn'),
    'RDP 负责远程图形桌面，VPN 负责先连入办公室网络。要在家安全使用公司里的 Windows PC，通常就是这两个一起上。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('bandwidth is not fast enough') || ctx.normalizedAnswer.includes('too many devices in the same area'),
    '题干给出 3G、弱信号或超高密度场景，说明瓶颈在移动网络承载能力，而不是应用本身。此时最可能的是带宽不足或小区拥塞。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('synthetic full'),
    '每天增量、每周合成完全备份能减少传统全备的窗口时间，同时又保留一份完整恢复点。考点是缩短备份时长而不是减少保护级别。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('antistatic bags'),
    '拆下来的内存条最怕静电损伤。用防静电袋存放和运输，能防止在转移过程中被静电击穿。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('event viewe r'),
    '虽然题库文本有编码瑕疵，但考点仍是 Event Viewer：蓝屏的 Stop code、驱动或系统错误最常在事件日志和转储记录里体现。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer === 'firewall' || ctx.normalizedAnswer.includes('windows defender firewall'),
    '远程访问相关功能要先有放行规则才能通信。无论是允许 RDP 还是阻止回 ping，真正生效的位置都在防火墙规则里。',
  ),
  createRule(
    (ctx) => includesAny(ctx.normalizedAnswer, ['hash', 'compare the hash value from the vendor', 'hashing']),
    '哈希校验的作用是验证文件完整性和来源一致性。把下载文件的哈希与厂商公布值比对，就能判断它是否被篡改或替换。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('xdr') || ctx.normalizedAnswer.includes('mdr'),
    'XDR/MDR 这类服务强调跨主机、网络和多个安全控制点的统一可见性与响应。它们不是单点防护，而是把多个检测与处置能力串起来。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('uefi devices in the bios'),
    '系统能从 U 盘装好却在拔盘后找不到 OS，常见原因是固件启动模式不匹配。启用正确的 UEFI 启动项，才能从新装系统所在磁盘正常引导。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('read the pop up carefully'),
    '机场、酒店等公共 Wi-Fi 常有门户认证页。用户把弹窗直接关掉后，网络看似连上但实际上还没完成登录，因此要重新连接并完成门户页面操作。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('default device in sound settings'),
    '蓝牙耳机被系统识别不代表它会自动变成默认输出设备。声音还走扬声器时，通常只要在声音设置里把输出切到耳机即可。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('virtualization'),
    '旧应用只能跑在老系统上，而公司又必须把主机迁到新系统时，最省成本的做法就是虚拟化。把旧系统封装到虚拟机里，既保留兼容性又不拖住主系统升级。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('group policy'),
    'Group Policy 用于在域环境里集中下发安全和桌面配置。要批量关闭来宾登录、限制浏览器或强化工作站设置时，它比逐台手改更合适。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('remote wipe'),
    '设备丢失后，远程擦除能把本地数据直接清空，是“手机已不在手上”场景下最有效的后续处置手段之一。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('incident report'),
    '管理层要的是“发生了什么、影响多大、做了什么”，这正是 incident report 的作用：对事件进行总结、记录和复盘。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer === 'services' || ctx.normalizedAnswer.includes('print spooler'),
    '当问题涉及后台服务是否启动、依赖是否正常、启动类型是否自动时，就要看 Services。它比控制面板更直接地反映服务状态。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('close unnecessary programs'),
    '题干给出的关键数据是内存 97%。这说明当前瓶颈是内存压力过高，所以最先该做的是关掉不必要程序，先把可用内存释放出来。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('distributed denial of service') || ctx.normalizedAnswer === 'ddos',
    '攻击来自大量受控主机同时打向一个目标，这就是 DDoS。它利用规模压垮服务，不是单机发起的普通 DoS。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('exfat'),
    'exFAT 是跨平台移动存储的常见选择，支持大文件，也能被 Windows 和 macOS 原生读写。题干强调跨平台或超过 4GB 时，优先想到它。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('cmdb'),
    '要查资产归属、服务重要性、依赖关系这类信息，就去看 CMDB。它是变更、运维和故障影响分析的底账。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('lusrmgr'),
    '本地用户和组相关操作，例如重命名管理员账户，最直接的工具就是 Local Users and Groups，也就是 `lusrmgr.msc`。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('screen saver') || ctx.normalizedAnswer.includes('screen timeout'),
    '自动锁屏/超时是防止用户离开工位后设备长时间处于已登录状态的基础控制，特别适合处理“人走机不锁”的问题。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('videoconferencing'),
    '要同时满足远程沟通、演示和培训，视频会议软件比邮件、IM 或单向直播更完整，因为它天然支持实时音视频和共享协作。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('nda'),
    'NDA 的核心是把保密义务写清楚并具备约束力。只要题干涉及对外沟通机密项目或知识产权保护，优先想到它。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('keychain'),
    'Keychain 是 macOS 原生的密码和证书保管库。问“Mac 上密码存哪里”时，标准答案就是它。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('proxy settings') || ctx.normalizedAnswer.includes('lan settings'),
    '企业网能访问内网但打不开外网网页时，常见根因是浏览器代理配置缺失或错误。题干点到“浏览器访问外网”时，应先看代理设置。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('radius'),
    'RADIUS 可以对接目录服务做集中认证，广泛用于无线网络和远程接入。题干要把目录身份用于 Wi‑Fi 认证时，就该用它。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('guest account') || ctx.normalizedAnswer.includes('default administrator password'),
    '硬化新机器时，先移除默认弱点最划算：Guest 账户和默认管理员密码都属于“别人一试就可能进”的入口。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('running out of free space') || ctx.normalizedStem.includes('used space'),
    '移动设备接近满盘时，系统会变慢、应用切换卡顿、缓存写入困难。题干里空间几乎打满，这比电池健康更能解释性能问题。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('refs'),
    'ReFS 是微软面向更高可靠性场景推出的文件系统，可视为 NTFS 的后续方向之一，因此题干问“NTFS 的后继/新一代”时会选它。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('gpedit'),
    '本地安全策略、密码复杂度、锁定阈值这类设置属于本地组策略编辑器的典型管理范围，因此要用 `gpedit`/`gpedit.msc`。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('remove the usb drive'),
    '从 U 盘做干净安装后，重启仍回到安装界面，说明机器还在从安装介质启动。拔掉 U 盘让它改从系统盘启动即可完成后续阶段。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer === 'netstat',
    '`netstat` 用于查看当前网络连接和端口占用。题干想确认谁在占带宽、应用是否连上服务器，或查看异常外连时，它都很合适。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('expired certificate'),
    '802.1X + EAP-TLS 靠证书做身份验证。用户长期未登录导致机器证书过期后，系统就无法通过有线网络的证书校验。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('tacacs'),
    'TACACS+ 常用于网络设备管理访问控制，并支持基于令牌/集中授权的管理场景。题干问 token-based 认证方法时，它比 RADIUS 更贴近设备管理语境。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('passphrase'),
    '比起简单 PIN 或图案，长而复杂的 passphrase 抗暴力猜解能力更强，尤其适合手机这类高价值移动终端。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('installer x86'),
    '系统是 32 位 Windows，就必须运行 32 位安装程序。x64 程序通常无法在 32 位系统上正常安装。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('system update utility'),
    '厂商提供的系统更新工具最适合做原厂驱动、固件和系统升级，兼容性与依赖处理通常比手工拼装安装介质更稳。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('sandbox testing'),
    '先在小范围或隔离环境里验证变更，能在不影响生产的情况下发现兼容性与回退问题。这是正式实施前的标准动作。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('dns servers') || ctx.normalizedAnswer.includes('internet options'),
    '网页跳错站、缓存不更新、受信站点设置、代理和临时文件问题，很多都落在浏览器/名称解析配置上。题干提到浏览器行为异常时，先看这两类设置。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('shell script') || ctx.normalizedAnswer === 'sh' || ctx.normalizedAnswer.includes('ps1') || ctx.normalizedAnswer.includes('powercfg'),
    '题干明确要自动化命令执行时，就应该选对应平台的脚本/命令工具：Linux 用 shell，Windows 原生自动化偏向 BAT/PowerShell/指定命令。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('task manager'),
    '需要看当前登录会话、进程占用或远程桌面用户数时，Task Manager 往往能直接给出现场状态，是一线排障的高频工具。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('least privilege') || ctx.normalizedAnswer.includes('just in time'),
    '最小权限和 JIT 的共同点，是不给用户长期多余权限。需要时临时授予、完成后收回，既满足工作也减少被滥用面。',
  ),
  createRule(
    (ctx) => includesAny(ctx.normalizedAnswer, ['windows 11 pro', 'windows 2022', 'home edition']),
    '这类题考的是 Windows 版本差异：能否加域、是否为服务器版、是否支持企业特性，都取决于具体 edition。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer === 'linux',
    '题干强调低成本、无额外许可费、做实验室或统一服务器/工作站平台时，Linux 通常是最合理的选择。',
  ),
  createRule(
    (ctx) => includesAny(ctx.normalizedAnswer, ['home folder', 'folder redirection', 'roaming profiles', 'synchronize the remote folder']),
    '题干都在考“用户数据放哪儿、怎么随人走”。Folder Redirection/漫游配置文件/同步文件夹的核心都是把用户数据从单机抽离出来，便于漫游、备份和集中管理。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('gpu requirements') || ctx.normalizedAnswer.includes('vram') || ctx.normalizedAnswer.includes('dedicated graphics') || ctx.normalizedAnswer.includes('bios options'),
    '3D 渲染、现代游戏和视频渲染软件首先看显卡与显存能力。题干提到 VRAM、GPU 或“gaming ready”但表现差时，就要从图形子系统下手。',
  ),
  createRule(
    (ctx) => includesAny(ctx.normalizedAnswer, ['file explorer options', 'hidden files', 'hide extensions', 'hidden items']),
    '题干都围绕 Windows 资源管理器显示策略：是否显示隐藏项、是否隐藏已知扩展名、是否方便进入 AppData。要看到真正文件类型或系统目录，就改这些显示选项。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('traceroute') || ctx.normalizedAnswer.includes('tracert'),
    '题干是访问站点失败、要找网络断在哪一跳，`traceroute/tracert` 比 ping 更合适，因为它能把路径上的每一跳都列出来。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('privacy') && ctx.normalizedStem.includes('unsigned'),
    'macOS 阻止未签名应用安装时，本质是在做来源校验。要放行这类第三方程序，需要到隐私/安全相关设置里调整允许策略。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('ups') || ctx.normalizedAnswer.includes('uninterruptible power supply'),
    'UPS 的作用是在线路异常时提供短时供电和关机缓冲，避免像题干那样一断电就直接掉电关机。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('master boot record') || ctx.normalizedAnswer.includes('repair the mbr'),
    'BIOS 能看到盘但系统提示找不到 OS，说明硬件通路还在，更像是引导记录损坏。MBR/GPT 引导结构出问题时，需要修复引导而不是换硬盘。',
  ),
  createRule(
    (ctx) => includesAny(ctx.normalizedAnswer, ['ground electrostatic charge', 'static discharge', 'wrist strap']),
    '防静电腕带和接地操作的目的，都是把人体或环境中的静电安全导走，避免在接触内存、主板等部件时把器件击坏。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('rdp'),
    'RDP 是 Windows 默认的图形远程桌面协议。题干只要是在远程使用 Windows 桌面或远程登录 Windows 服务器，首选通常就是它。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('smartscreen'),
    'SmartScreen 是 Edge/Windows 对下载和站点信誉的防护层。确认文件安全后，调整它的阻止策略就能允许下载继续进行。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('dlp'),
    'DLP 关注的是敏感信息外发和数据外泄。题干谈的是 exfiltration，而不是登录或恶意代码执行，所以应选 DLP。',
  ),
  createRule(
    (ctx) => includesAny(ctx.normalizedAnswer, ['https only mode', 'secure sockets layer certificate']),
    '这类答案都在保护浏览器和站点之间的传输链路。一个是强制只走 HTTPS，一个是给站点补上受信任证书，避免明文或不可信连接。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('ssh'),
    'SSH 适合在远程设备上执行命令并把输出带回来。题干要求在网络交换机上跑命令并收集结果时，它比图形远程更合适。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('rejoin the device to the domain'),
    'Trust relationship error 说明本机与域之间的机器账户信任已损坏。重置用户密码没用，必须让设备重新加入域来重建信任。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('restarting the print spooler'),
    '只有这个用户打印失败且队列里任务报错时，先重启本机 Print Spooler 是最直接的排障动作。它比去查网络或服务器更贴近症状。',
  ),
  createRule(
    (ctx) => ctx.normalizedAnswer.includes('man'),
    '`man` 就是 Linux 上查看命令手册页的标准方式。题干问“怎么看另一个命令的说明文档”，答案就是它。',
  ),
];

function genericExplanation(ctx) {
  let focus = '直接对应题干的症状或需求';

  if (includesAny(ctx.normalizedStem, ['first', 'next step', 'do next'])) {
    focus = '优先采取风险最低、最直接的排查或处置动作';
  } else if (includesAny(ctx.normalizedStem, ['prevent', 'protect', 'unauthorized access', 'lost', 'stolen'])) {
    focus = '降低未授权访问和数据泄露风险';
  } else if (includesAny(ctx.normalizedStem, ['malware', 'infected', 'virus', 'adware', 'ransom'])) {
    focus = '先控制感染范围，再处理根因和恢复';
  } else if (includesAny(ctx.normalizedStem, ['browser', 'website', 'internet', 'trusted site', 'proxy'])) {
    focus = '恢复正确的浏览器配置、站点信任或网络访问路径';
  } else if (includesAny(ctx.normalizedStem, ['phone', 'smartphone', 'mobile'])) {
    focus = '从移动端基础配置、恶意应用或资源占用切入排查';
  } else if (includesAny(ctx.normalizedStem, ['domain', 'directory', 'internal website'])) {
    focus = '保证身份、名称解析和域资源访问链路正确';
  } else if (includesAny(ctx.normalizedStem, ['backup', 'restore', 'recovery'])) {
    focus = '满足备份可恢复性和介质/流程要求';
  }

  return `选 ${ctx.answerLabel}，因为它最符合当前场景，核心是在于${focus}。和其他选项相比，这一项最直接对应题干给出的目标、风险或症状。`;
}

export function getCore2Explanation(question) {
  if (question.explanation) return question.explanation;
  if (MULTI_EXPLANATIONS[question.id]) return MULTI_EXPLANATIONS[question.id];
  if (QUESTION_OVERRIDES[question.id]) return QUESTION_OVERRIDES[question.id];

  const context = buildContext(question);
  for (const rule of RULES) {
    if (rule.match(context)) {
      return rule.explanation;
    }
  }

  return genericExplanation(context);
}

export function decorateCore2Questions(questions = []) {
  return questions.map((question) => (
    question?.explanation
      ? question
      : { ...question, explanation: getCore2Explanation(question) }
  ));
}
