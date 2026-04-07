export type TagType = 'action' | 'state';

export type TagDefinition = {
  id: string;
  label: string;
  type: TagType;
  isArchived?: boolean;
  createdAt?: string;
};

export const DEFAULT_TAGS: Record<TagType, TagDefinition[]> = {
  action: [
    { id: 'action-reading', label: '読書', type: 'action' },
    { id: 'action-exercise', label: '運動', type: 'action' },
    { id: 'action-study', label: '勉強', type: 'action' },
    { id: 'action-work', label: '仕事', type: 'action' },
    { id: 'action-housework', label: '家事', type: 'action' },
    { id: 'action-outing', label: '外出', type: 'action' },
    { id: 'action-rest', label: '休息', type: 'action' },
    { id: 'action-cafe', label: 'カフェ', type: 'action' },
    { id: 'action-friends', label: '人と会う', type: 'action' },
    { id: 'action-hobby', label: '趣味', type: 'action' },
  ],
  state: [
    { id: 'state-busy', label: '忙しい', type: 'state' },
    { id: 'state-tired', label: '疲れた', type: 'state' },
    { id: 'state-sleepy', label: '眠い', type: 'state' },
    { id: 'state-good-sleep', label: 'よく眠れた', type: 'state' },
    { id: 'state-healthy', label: '体調がよい', type: 'state' },
    { id: 'state-headache', label: '体調がいまいち', type: 'state' },
    { id: 'state-rainy', label: '雨で重たい', type: 'state' },
    { id: 'state-relaxed', label: '落ち着いていた', type: 'state' },
    { id: 'state-stress', label: 'ストレス多め', type: 'state' },
    { id: 'state-motivated', label: 'やる気あり', type: 'state' },
  ],
};
