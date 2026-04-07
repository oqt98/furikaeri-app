export type TemplateField = {
  key: string;
  label: string;
  multiline?: boolean;
};

export type TemplateMode =
  | 'さっと記録'
  | '前向きに見る'
  | '学びを整理する'
  | '次につなげる'
  | '視点を切り替える';

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
    name: 'ひとことメモ',
    description: '今日の出来事を、短く気軽に残したいときに向いています。',
    mode: 'さっと記録',
    fields: [
      { key: 'title', label: '今日のひとこと', multiline: true },
      { key: 'memo', label: '本文', multiline: true },
    ],
  },
  {
    id: 'kpt',
    name: 'KPT',
    description: '続けたいこと、困ったこと、次に試すことを整理します。',
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
    description: 'やったこと、わかったこと、次にやることを見直せます。',
    mode: '学びを整理する',
    fields: [
      { key: 'yatta', label: 'やったこと', multiline: true },
      { key: 'wakatta', label: 'わかったこと', multiline: true },
      { key: 'tsugi', label: '次にやること', multiline: true },
    ],
  },
  {
    id: 'good3',
    name: 'よかったこと3つ',
    description: '前向きに1日を締めたいときの、やさしいテンプレートです。',
    mode: '前向きに見る',
    fields: [
      { key: 'good1', label: 'よかったこと 1', multiline: true },
      { key: 'good2', label: 'よかったこと 2', multiline: true },
      { key: 'good3', label: 'よかったこと 3', multiline: true },
    ],
  },
  {
    id: 'ssc',
    name: 'Start / Stop / Continue',
    description: '始める、やめる、続けるの3つで次の行動に落とし込みます。',
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
    description: 'Liked / Learned / Lacked / Longed for で広く振り返ります。',
    mode: '学びを整理する',
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
    description: 'よかったこと、つらかったこと、芽が出そうなことを見ます。',
    mode: '視点を切り替える',
    fields: [
      { key: 'rose', label: 'Rose', multiline: true },
      { key: 'thorn', label: 'Thorn', multiline: true },
      { key: 'bud', label: 'Bud', multiline: true },
    ],
  },
  {
    id: 'sailboat',
    name: 'Sailboat',
    description: '進みを助けたことと、止めていたことを整理します。',
    mode: '視点を切り替える',
    fields: [
      { key: 'wind', label: '追い風', multiline: true },
      { key: 'anchor', label: '足を止めたもの', multiline: true },
      { key: 'island', label: '目指したい場所', multiline: true },
      { key: 'risk', label: '気になっていること', multiline: true },
    ],
  },
  {
    id: 'starfish',
    name: 'Starfish',
    description: 'もっとやる、減らす、続ける、やめる、始めるで整えます。',
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
    description: '感情の動きを3つの切り口で見つめたい日に向いています。',
    mode: '前向きに見る',
    fields: [
      { key: 'glad', label: 'Glad', multiline: true },
      { key: 'sad', label: 'Sad', multiline: true },
      { key: 'mad', label: 'Mad', multiline: true },
    ],
  },
];
