import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  applyStoredCore2Analyses,
  buildCore2Analysis,
  decorateCore2Questions,
} from '../../src/core2-analysis.js';

test('buildCore2Analysis returns outline, whyChoose, and whyNotChoose from self-authored reasoning', () => {
  const analysis = buildCore2Analysis({
    id: 2,
    stem: 'A technician needs to provide remote support for a legacy Linux-based operating system from their Windows laptop. The solution needs to allow the technician to see what the user is doing and provide the ability to interact with the user session. Which of the following remote access technologies would support the use case?',
    options: [
      { key: 'A', text: 'VPN' },
      { key: 'B', text: 'VNC' },
      { key: 'C', text: 'SSH' },
      { key: 'D', text: 'RDP' },
    ],
    answer: ['B'],
    type: 'single',
  });

  assert.equal(Array.isArray(analysis.outline), true);
  assert.equal(analysis.outline.length, 3);
  assert.match(analysis.outline[0], /题干情境/);
  assert.match(analysis.outline[1], /知识点/);
  assert.match(analysis.whyChoose, /VNC/);
  assert.equal(Array.isArray(analysis.whyNotChoose), true);
  assert.equal(analysis.whyNotChoose.length, 3);
  assert.match(analysis.whyNotChoose[0].reason, /图形|命令行|通道/);
});

test('decorateCore2Questions attaches structured analysis while preserving explanation text', () => {
  const decorated = decorateCore2Questions([
    {
      id: 64,
      stem: 'A customer wants to work from home without carrying company hardware back and forth. Which of the following would allow the user to remotely access and use a Windows PC at the main office? (Choose two.)',
      options: [
        { key: 'A', text: 'SSH' },
        { key: 'B', text: 'VNC' },
        { key: 'C', text: 'RDP' },
        { key: 'D', text: 'VPN' },
      ],
      answer: ['C', 'D'],
      type: 'multiple',
    },
  ]);

  assert.match(decorated[0].explanation, /RDP/);
  assert.match(decorated[0].analysis.whyChoose, /VPN/);
  assert.match(decorated[0].analysis.outline[0], /题干情境/);
  assert.equal(decorated[0].analysis.whyNotChoose.length, 2);
});

test('applyStoredCore2Analyses prefers the last stored record for the same question id', () => {
  const decorated = applyStoredCore2Analyses(
    [
      {
        id: 2,
        stem: 'A technician needs to provide remote support for a legacy Linux-based operating system from their Windows laptop.',
        options: [
          { key: 'A', text: 'VPN' },
          { key: 'B', text: 'VNC' },
        ],
        answer: ['B'],
        type: 'single',
      },
    ],
    [
      {
        id: 2,
        explanation: '基础解析',
        analysis: {
          outline: ['基础提纲 1', '基础提纲 2', '基础提纲 3'],
          whyChoose: '基础为什么选',
          whyNotChoose: [{ key: 'A', text: 'VPN', reason: '基础为什么不选 A' }],
        },
      },
      {
        id: 2,
        explanation: '人工复核解析',
        analysis: {
          outline: ['复核提纲 1', '复核提纲 2', '复核提纲 3'],
          whyChoose: '复核为什么选',
          whyNotChoose: [{ key: 'A', text: 'VPN', reason: '复核为什么不选 A' }],
        },
      },
    ],
  );

  assert.equal(decorated[0].explanation, '人工复核解析');
  assert.equal(decorated[0].analysis.whyChoose, '复核为什么选');
  assert.equal(decorated[0].analysis.outline[0], '复核提纲 1');
});

test('buildCore2Analysis matches Chinese stems and explains the exact restriction in Chinese', () => {
  const analysis = buildCore2Analysis({
    id: 88,
    stem: '管理员正在为新的供应商创建账户。供应商合同规定，这些用户只能在特定时间工作。以下哪项最适合实施该要求？',
    options: [
      { key: 'A', text: 'Timeout policies by GPO user objects' },
      { key: 'B', text: 'Alerts on authentication attempts outside of SLA requirements' },
      { key: 'C', text: 'Expirations on the contractors’ accounts' },
      { key: 'D', text: 'Account login restrictions set to the specified hours' },
    ],
    answer: ['D'],
    type: 'single',
  });

  assert.match(analysis.outline[0], /供应商|特定时间/);
  assert.match(analysis.outline[1], /时间窗口|登录权限/);
  assert.match(analysis.whyChoose, /指定的时间窗口|特定时间/);
  assert.match(analysis.whyNotChoose[0].reason, /空闲多久|开始登录/);
  assert.match(analysis.whyNotChoose[1].reason, /告警|阻止/);
  assert.match(analysis.whyNotChoose[2].reason, /合同结束日期|粒度太粗/);
});

test('buildCore2Analysis keeps generic change-management analysis Chinese-first for CIO ERP questions', () => {
  const analysis = buildCore2Analysis({
    id: 144,
    stem: 'The Chief Information Officer (CIO) is overseeing a project to integrate existing business processes to an enterprise resource planning system. The CIO identifies the scope of the change and provides it to the IT department. Which of the following should the technician do next?',
    options: [
      { key: 'A', text: 'Backup plan' },
      { key: 'B', text: 'Risk analysis' },
      { key: 'C', text: 'Document findings' },
      { key: 'D', text: 'Sandbox testing' },
    ],
    answer: ['B'],
    type: 'single',
  });

  assert.match(analysis.outline[0], /CIO|ERP|变更范围/);
  assert.doesNotMatch(analysis.outline[0], /The Chief Information Officer/);
  assert.match(analysis.whyChoose, /风险分析/);
  assert.doesNotMatch(analysis.whyChoose, /Risk analysis。题干已经把限制条件写在/);
  assert.match(analysis.whyNotChoose[0].reason, /回退方案|风险/);
  assert.match(analysis.whyNotChoose[1].reason, /记录结果|收尾动作/);
  assert.match(analysis.whyNotChoose[2].reason, /沙箱测试|验证阶段/);
});

test('buildCore2Analysis uses a concrete command-specific rationale for whoami questions', () => {
  const analysis = buildCore2Analysis({
    id: 118,
    stem: 'A Windows user is having trouble accessing a fileshare. The technician would like to confirm the username that the machine is currently logged in to. Which of the following should the technician use?',
    options: [
      { key: 'A', text: 'net user' },
      { key: 'B', text: 'tracert' },
      { key: 'C', text: 'whoami' },
      { key: 'D', text: 'hostname' },
    ],
    answer: ['C'],
    type: 'single',
  });

  assert.match(analysis.outline[1], /命令题/);
  assert.match(analysis.whyChoose, /当前会话对应的用户名|当前登录/);
  assert.doesNotMatch(analysis.whyChoose, /最符合当前场景/);
  assert.match(analysis.whyNotChoose[0].reason, /当前会话是谁登录|账户资料/);
  assert.match(analysis.whyNotChoose[1].reason, /网络路径/);
  assert.match(analysis.whyNotChoose[2].reason, /计算机名/);
});

test('buildCore2Analysis keeps command localization flat and concrete for netstat and winver questions', () => {
  const netstatAnalysis = buildCore2Analysis({
    id: 16,
    stem: 'A user recently installed an application that accesses a database from a local server. When launching the application, it does not populate any information. Which of the following command-line tools is the best to troubleshoot the issue?',
    options: [
      { key: 'A', text: 'ipconfig' },
      { key: 'B', text: 'nslookup' },
      { key: 'C', text: 'netstat' },
      { key: 'D', text: 'curl' },
    ],
    answer: ['C'],
    type: 'single',
  });

  assert.match(netstatAnalysis.whyChoose, /数据库服务的连接|连接和端口/);
  assert.doesNotMatch(netstatAnalysis.whyChoose, /查看网络连接和端口状态（查看网络连接和端口状态/);

  const winverAnalysis = buildCore2Analysis({
    id: 320,
    stem: 'An administrator must write a script that will output the OS name to a file. Which of the following commands is the best way to accomplish this task?',
    options: [
      { key: 'A', text: 'hostname' },
      { key: 'B', text: 'netstat' },
      { key: 'C', text: 'whoami' },
      { key: 'D', text: 'winver' },
    ],
    answer: ['D'],
    type: 'single',
  });

  assert.match(winverAnalysis.whyChoose, /操作系统名称|版本名称和版本号/);
  assert.match(winverAnalysis.whyNotChoose[0].reason, /计算机名/);
  assert.match(winverAnalysis.whyNotChoose[1].reason, /连接和端口状态/);
  assert.match(winverAnalysis.whyNotChoose[2].reason, /当前登录身份/);
});

test('core2 corpus analysis does not fall back to placeholder lead summaries or placeholder option roles', () => {
  const corpus = JSON.parse(fs.readFileSync(new URL('../../data/questions.core2.json', import.meta.url), 'utf8'));

  for (const question of corpus) {
    const analysis = buildCore2Analysis(question);
    const combined = [
      analysis.outline.join('\n'),
      analysis.whyChoose,
      analysis.whyNotChoose.map((item) => item.reason).join('\n'),
    ].join('\n');

    assert.doesNotMatch(combined, /题干前半段已经给出了当前场景和限制条件/);
    assert.doesNotMatch(combined, /解决题干中的某一部分问题/);
    assert.doesNotMatch(combined, /最符合当前场景/);
  }
});
