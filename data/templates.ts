export type TemplateField = {
  key: string;
  label: string;
  multiline?: boolean;
};

export type TemplateMode =
  | 'さっと記録'
  | '気持ちを整える'
  | '学びを振り返る'
  | '次につなげる'
  | '視点を広げる';

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
    name: '今日のタイトル',
    description: '今日あったことを短く残したい日に向いています。',
    mode: 'さっと記録',
    fields: [{ key: 'title', label: '出来事', multiline: true }],
  },
  {
    id: 'memo',
    name: 'ひとことメモ',
    description: '自由なひとことだけを残したいときのシンプルなテンプレートです。',
    mode: 'さっと記録',
    fields: [{ key: 'memo', label: 'ひとことメモ', multiline: true }],
  },
  {
    id: 'kpt',
    name: 'KPT',
    description: '続けたいこと、困ったこと、次に試したいことを整理できます。',
    mode: '次につなげる',
    fields: [
      { key: 'keep', label: 'Keep', multiline: true },
      { key: 'problem', label: 'Problem', multiline: true },
      { key: 'try', label: 'Try', multiline: true },
    ],
  },
  {
    id: 'ywt',
    name: 'YWT',
    description: 'やったこと、わかったこと、次にやることを短く整理できます。',
    mode: '学びを振り返る',
    fields: [
      { key: 'yatta', label: 'やったこと', multiline: true },
      { key: 'wakatta', label: 'わかったこと', multiline: true },
      { key: 'tsugi', label: '次にやること', multiline: true },
    ],
  },
  {
    id: 'good3',
    name: 'よかったこと3つ',
    description: 'よかったことを3つ並べて、前向きに振り返りたい日に向いています。',
    mode: '気持ちを整える',
    fields: [
      { key: 'good1', label: 'よかったこと 1', multiline: true },
      { key: 'good2', label: 'よかったこと 2', multiline: true },
      { key: 'good3', label: 'よかったこと 3', multiline: true },
    ],
  },
  {
    id: 'ssc',
    name: 'Start / Stop / Continue',
    description: '始めること、やめること、続けることを整理して次に活かせます。',
    mode: '次につなげる',
    fields: [
      { key: 'start', label: 'Start', multiline: true },
      { key: 'stop', label: 'Stop', multiline: true },
      { key: 'continue', label: 'Continue', multiline: true },
    ],
  },
  {
    id: '4ls',
    name: '4Ls',
    description: 'Liked / Learned / Lacked / Longed for の4視点で振り返れます。',
    mode: '視点を広げる',
    fields: [
      { key: 'liked', label: 'Liked', multiline: true },
      { key: 'learned', label: 'Learned', multiline: true },
      { key: 'lacked', label: 'Lacked', multiline: true },
      { key: 'longedFor', label: 'Longed for', multiline: true },
    ],
  },
  {
    id: 'rose-thorn-bud',
    name: 'Rose / Thorn / Bud',
    description: 'よかったこと、つらかったこと、芽が出そうなことを分けて見られます。',
    mode: '視点を広げる',
    fields: [
      { key: 'rose', label: 'Rose', multiline: true },
      { key: 'thorn', label: 'Thorn', multiline: true },
      { key: 'bud', label: 'Bud', multiline: true },
    ],
  },
  {
    id: 'sailboat',
    name: 'Sailboat',
    description: '進めたことと足を引っぱったことを整理したい日に向いています。',
    mode: '視点を広げる',
    fields: [
      { key: 'wind', label: '追い風', multiline: true },
      { key: 'anchor', label: '足かせ', multiline: true },
      { key: 'island', label: '目指したい場所', multiline: true },
      { key: 'risk', label: '気になるリスク', multiline: true },
    ],
  },
  {
    id: 'starfish',
    name: 'Starfish',
    description: 'もっとやる、減らす、続ける、やめる、始めるを整理できます。',
    mode: '次につなげる',
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
    description: '感情の動きを3つの切り口で振り返れます。',
    mode: '気持ちを整える',
    fields: [
      { key: 'glad', label: 'Glad', multiline: true },
      { key: 'sad', label: 'Sad', multiline: true },
      { key: 'mad', label: 'Mad', multiline: true },
    ],
  },
];
