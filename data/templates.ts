export type TemplateField = {
  key: string;
  label: string;
  multiline?: boolean;
};

export type TemplateMode =
  | 'さっと記録'
  | '気づきを残す'
  | '学びを振り返る'
  | '次につなげる'
  | '視点を変えて見る';

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
    description: 'その日の出来事を短く書きたいとき向け。',
    mode: 'さっと記録',
    fields: [
      { key: 'title', label: '今日のひとこと' },
      { key: 'memo', label: 'メモ', multiline: true },
    ],
  },
  {
    id: 'kpt',
    name: 'KPT',
    description: '続けたいこと、困ったこと、次に試すことを整理する。',
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
    description: 'やったこと、わかったこと、次にやることをまとめる。',
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
    description: '小さな前向きさを3つだけ残したい日に。',
    mode: '気づきを残す',
    fields: [
      { key: 'good1', label: 'よかったこと 1', multiline: true },
      { key: 'good2', label: 'よかったこと 2', multiline: true },
      { key: 'good3', label: 'よかったこと 3', multiline: true },
    ],
  },
  {
    id: 'ssc',
    name: 'Start / Stop / Continue',
    description: '始める、やめる、続けるをシンプルに見直す。',
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
    description: 'Liked / Learned / Lacked / Longed for で整理する。',
    mode: '学びを振り返る',
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
    description: 'よかったこと、つらかったこと、芽が出そうなことを見る。',
    mode: '視点を変えて見る',
    fields: [
      { key: 'rose', label: 'Rose', multiline: true },
      { key: 'thorn', label: 'Thorn', multiline: true },
      { key: 'bud', label: 'Bud', multiline: true },
    ],
  },
  {
    id: 'sailboat',
    name: 'Sailboat',
    description: '進みを助けたことと妨げたことを俯瞰する。',
    mode: '視点を変えて見る',
    fields: [
      { key: 'wind', label: '追い風', multiline: true },
      { key: 'anchor', label: '足かせ', multiline: true },
      { key: 'island', label: '目指したい場所', multiline: true },
      { key: 'risk', label: '気になったこと', multiline: true },
    ],
  },
  {
    id: 'starfish',
    name: 'Starfish',
    description: '増やす、減らす、続ける、やめる、始めるを並べる。',
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
    description: '感情の切り口で1日を短く振り返る。',
    mode: '気づきを残す',
    fields: [
      { key: 'glad', label: 'Glad', multiline: true },
      { key: 'sad', label: 'Sad', multiline: true },
      { key: 'mad', label: 'Mad', multiline: true },
    ],
  },
];
