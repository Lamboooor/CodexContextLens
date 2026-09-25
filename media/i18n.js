'use strict';
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.LensI18n=api;})(globalThis,()=>{
  const strings={
  "contextHeading": ["上下文", "CONTEXT"],
  "sessionHeading": ["会话 TOKEN", "SESSION TOKENS"],
  "s0": [
    "Codex Lens · 用量透镜",
    "Codex Lens · Usage dashboard"
  ],
  "s1": [
    "看清每一次对话的用量",
    "Understand each conversation's usage"
  ],
  "s2": [
    "本地 · 只读",
    "LOCAL · READ ONLY"
  ],
  "s3": [
    "观察会话",
    "Session"
  ],
  "s4": [
    "选择",
    "Select"
  ],
  "s5": [
    "刷新",
    "Refresh"
  ],
  "s6": [
    "设置",
    "Settings"
  ],
  "s7": [
    "原生口径",
    "Native formula"
  ],
  "s8": [
    "上下文占用",
    "Context used"
  ],
  "s9": [
    "等待模型信息",
    "Waiting for model information"
  ],
  "s10": [
    "等待最近请求",
    "Waiting for the latest request"
  ],
  "s11": [
    "最近请求总量 ÷ 日志上限",
    "Latest request total / logged limit"
  ],
  "s12": [
    "不是累计消耗，也不等于压缩阈值",
    "Not cumulative usage or a compaction threshold"
  ],
  "s13": [
    "日志实测",
    "From logs"
  ],
  "s14": [
    "会话累计处理 token",
    "Cumulative session tokens"
  ],
  "s15": [
    "输入",
    "Input"
  ],
  "s16": [
    "输出",
    "Output"
  ],
  "s17": [
    "输入缓存命中",
    "Input cache hit rate"
  ],
  "s18": [
    "多次请求会重复计入历史输入；缓存属于输入的一部分，推理属于输出的一部分。",
    "History can be counted again across requests. Cached input is part of input; reasoning is part of output."
  ],
  "s19": [
    "可见记录构成",
    "Visible content breakdown"
  ],
  "s20": [
    "文本量占比 · 非 token 分账",
    "Character shares · not token attribution"
  ],
  "s21": [
    "统计本地记录中可见文本的长度；压缩后从新片段重新统计。隐藏提示、图片及加密推理无法归因，这张图不代表模型当前完整上下文。",
    "Visible text length in local records, counted again from the new segment after compaction. Hidden prompts, images and encrypted reasoning cannot be attributed. This is not the model's complete current context."
  ],
  "s22": [
    "为什么不是精确的“文件占了多少 token”？",
    "Why isn't this an exact file-token breakdown?"
  ],
  "s23": [
    "Codex 提供请求级 token 总数，但没有完整公开每类内容的精确 token 归属。本图按文本长度（UTF-16 单元）计算百分比，不把比例乘上总 token 来伪造分账。历史对话只含之前轮次的用户和助手文本；工具内容按来源单列。混合命令、编排工具里的读文件结果保留在“其他工具”中。这里不代表每份记录仍在模型上下文内，也不含不可见系统提示。",
    "Codex records request-level token totals, not complete per-source attribution. Percentages use visible text length (UTF-16 units); they are not multiplied by token totals to invent a breakdown. History contains earlier user and assistant text; tool content is categorized separately. Mixed commands and nested file reads remain in other tools. Records may no longer be in the model context, and hidden system instructions are excluded."
  ],
  "s24": [
    "最近一次请求",
    "Latest request"
  ],
  "s25": [
    "账号额度快照",
    "Account quota snapshot"
  ],
  "s26": [
    "非实时查询",
    "Not a live query"
  ],
  "s27": [
    "用量记录",
    "Usage history"
  ],
  "s28": [
    "时间",
    "Time"
  ],
  "s29": [
    "缓存输入",
    "Cached input"
  ],
  "s30": [
    "其中推理",
    "Reasoning subset"
  ],
  "s31": [
    "合计",
    "Total"
  ],
  "s32": [
    "数据来源与诊断",
    "Data source and diagnostics"
  ],
  "s33": [
    "所有分析留在本机。不读取 auth.json，不联网，不修改 Codex 配置，不注入 hooks，不发送模型请求。远程窗口在远程扩展宿主读取日志。",
    "Analysis stays local. No auth.json access, network requests, Codex configuration changes, hook injection or model calls. Remote windows read logs on the remote extension host."
  ],
  "s34": [
    "预览版 0.7.0 · 本地日志观测，不是账单",
    "Preview 0.7.0 · Local log insights, not billing"
  ],
  "s35": [
    "搜索所有发现的会话",
    "Search discovered sessions"
  ],
  "s36": [
    "数据源设置",
    "Data source settings"
  ],
  "s37": [
    "最近请求 token 消耗柱状图",
    "Token usage for recent requests"
  ]
};
  const categories={"history": ["历史对话 / 压缩摘要", "History / compaction summary"], "prompt": ["本轮用户消息", "Current user message"], "files": ["明确的文件读取结果", "Explicit file reads"], "tools": ["其他工具结果 / 混合输出", "Other tool / mixed output"], "instructions": ["可见系统与开发者指令", "Visible system / developer instructions"], "assistant": ["本轮助手文本", "Current assistant text"], "reasoning": ["可见推理摘要", "Visible reasoning summary"], "calls": ["工具调用参数", "Tool call arguments"]};
  function language(setting='auto',display='en'){const value=setting==='auto'?display:setting;return /^zh(?:-|$)/i.test(value||'')?'zh-CN':'en';}
  function translator(locale){return (zh,en)=>language(locale)==='zh-CN'?zh:en;}
  function message(key,locale){const entry=strings[key];if(!entry)throw new Error('Unknown translation: '+key);return translator(locale)(...entry);}
  function category(key,fallback,locale){return categories[key]?translator(locale)(...categories[key]):fallback;}
  function html(template,locale){return template.replaceAll('{{LANG}}',language(locale)).replace(/\{\{i18n:(\w+)\}\}/g,(_,key)=>message(key,locale).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])));}
  function localize(root,locale){
    for(const node of root.querySelectorAll?.('[data-i18n]')||[])node.textContent=message(node.getAttribute('data-i18n'),locale);
    for(const attr of ['title','aria-label'])for(const node of root.querySelectorAll?.('[data-i18n-'+attr+']')||[])node.setAttribute(attr,message(node.getAttribute('data-i18n-'+attr),locale));
  }
  return {language,translator,message,category,html,localize};
});
