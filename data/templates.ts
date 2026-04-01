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
];