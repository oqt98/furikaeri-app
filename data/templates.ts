export type TemplateField = {
  key: string;
  label: string;
  multiline?: boolean;
};

export type TemplateMode =
  | 'さくっと記録'
  | '感情を整理'
  | '学びを残す'
  | '問題を整理'
  | '未来を考える';

export type ReviewTemplate = {
  id: string;
  name: string;
  description: string;
  mode: TemplateMode;
  fields: TemplateField[];
};

export const templates: ReviewTemplate[] = [
  {
    id: 'diary',
    name: '一言日記',
    description: '軽く1日を残したいとき',
    mode: 'さくっと記録',
    fields: [
      { key: 'title', label: '今日の一言タイトル' },
      { key: 'memo', label: '本文', multiline: true },
    ],
  },
  {
    id: 'kpt',
    name: 'KPT',
    description: '継続・課題・次アクションを整理する',
    mode: '問題を整理',
    fields: [
      { key: 'keep', label: 'Keep', multiline: true },
      { key: 'problem', label: 'Problem', multiline: true },
      { key: 'try', label: 'Try', multiline: true },
    ],
  },
  {
    id: 'ywt',
    name: 'YWT',
    description: 'やったこと・わかったこと・次にやること',
    mode: '学びを残す',
    fields: [
      { key: 'yatta', label: 'やったこと', multiline: true },
      { key: 'wakatta', label: 'わかったこと', multiline: true },
      { key: 'tsugi', label: '次にやること', multiline: true },
    ],
  },
  {
    id: 'good3',
    name: 'よかったこと3つ',
    description: '前向きに1日を終えたいとき',
    mode: '感情を整理',
    fields: [
      { key: 'good1', label: 'よかったこと1', multiline: true },
      { key: 'good2', label: 'よかったこと2', multiline: true },
      { key: 'good3', label: 'よかったこと3', multiline: true },
    ],
  },
  {
    id: 'ssc',
    name: 'Start / Stop / Continue',
    description: '始める・やめる・続けるを整理したいとき',
    mode: '未来を考える',
    fields: [
      { key: 'start', label: 'Start（これから始めたいこと）', multiline: true },
      { key: 'stop', label: 'Stop（やめたいこと）', multiline: true },
      { key: 'continue', label: 'Continue（続けたいこと）', multiline: true },
    ],
  },
  {
    id: '4ls',
    name: '4Ls',
    description: '良かったことと学びをバランスよく振り返る',
    mode: '学びを残す',
    fields: [
      { key: 'liked', label: 'Liked（よかったこと）', multiline: true },
      { key: 'learned', label: 'Learned（学んだこと）', multiline: true },
      { key: 'lacked', label: 'Lacked（足りなかったこと）', multiline: true },
      { key: 'longedFor', label: 'Longed for（欲しかったこと）', multiline: true },
    ],
  },
  {
    id: 'rose-thorn-bud',
    name: 'Rose / Thorn / Bud',
    description: '良いこと・つらいこと・これからの芽を見つける',
    mode: '感情を整理',
    fields: [
      { key: 'rose', label: 'Rose（よかったこと）', multiline: true },
      { key: 'thorn', label: 'Thorn（つらかったこと）', multiline: true },
      { key: 'bud', label: 'Bud（これから育てたいこと）', multiline: true },
    ],
  },
  {
    id: 'sailboat',
    name: 'Sailboat',
    description: '追い風・足かせ・目標・リスクを整理する',
    mode: '未来を考える',
    fields: [
      { key: 'wind', label: '追い風だったこと', multiline: true },
      { key: 'anchor', label: '足を引っ張ったこと', multiline: true },
      { key: 'island', label: '向かいたい先・目標', multiline: true },
      { key: 'risk', label: '不安・リスク', multiline: true },
    ],
  },
  {
    id: 'starfish',
    name: 'Starfish',
    description: 'やる量や行動を細かく見直したいとき',
    mode: '問題を整理',
    fields: [
      { key: 'more', label: 'もっとやること', multiline: true },
      { key: 'less', label: '減らしたいこと', multiline: true },
      { key: 'keep', label: '続けたいこと', multiline: true },
      { key: 'stop', label: 'やめたいこと', multiline: true },
      { key: 'start', label: '始めたいこと', multiline: true },
    ],
  },
  {
    id: 'glad-sad-mad',
    name: 'Glad / Sad / Mad',
    description: '感情ベースで素直に振り返りたいとき',
    mode: '感情を整理',
    fields: [
      { key: 'glad', label: 'Glad（うれしかったこと）', multiline: true },
      { key: 'sad', label: 'Sad（悲しかったこと）', multiline: true },
      { key: 'mad', label: 'Mad（イラッとしたこと）', multiline: true },
    ],
  },
];