import type { TagDefinition, TagType } from '../data/tags';
import {
  createTag,
  deleteTag,
  getTagCatalog,
  replaceTagCatalog,
  reorderTags,
  setTagArchived,
} from './storage';
import { ensureAnonymousSession } from './supabase/auth';
import { getSupabaseClient } from './supabase/client';
import { isSupabaseEnabled } from './supabase/env';
import { toLocalTagId, toRemoteTagId } from './supabase/tagIds';

export type TagCatalog = Record<TagType, TagDefinition[]>;

export type TagRepository = {
  getCatalog: () => Promise<TagCatalog>;
  create: (type: TagType, label: string) => Promise<TagDefinition | null>;
  remove: (tagId: string) => Promise<void>;
  reorder: (type: TagType, orderedIds: string[]) => Promise<void>;
  setArchived: (tagId: string, isArchived: boolean) => Promise<void>;
};

async function getRemoteContext() {
  if (!isSupabaseEnabled()) {
    return null;
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return null;
  }

  const session = await ensureAnonymousSession();
  if (session.status !== 'ready' || !session.userId) {
    return null;
  }

  return {
    supabase: supabase as any,
    userId: session.userId,
  };
}

async function listRemoteTags(): Promise<TagCatalog | null> {
  const context = await getRemoteContext();
  if (!context) {
    return null;
  }

  const { supabase, userId } = context;
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as Array<{
    id: string;
    label: string;
    type: TagType;
    is_archived: boolean;
    created_at: string;
  }>;

  return {
    action: rows
      .filter((item) => item.type === 'action')
      .map((item) => ({
        id: toLocalTagId(userId, item.id),
        label: item.label,
        type: 'action',
        isArchived: item.is_archived,
        createdAt: item.created_at,
      })),
    state: rows
      .filter((item) => item.type === 'state')
      .map((item) => ({
        id: toLocalTagId(userId, item.id),
        label: item.label,
        type: 'state',
        isArchived: item.is_archived,
        createdAt: item.created_at,
      })),
  };
}

async function upsertRemoteTag(tag: TagDefinition) {
  const context = await getRemoteContext();
  if (!context) {
    return;
  }

  const { supabase, userId } = context;
  const { error } = await supabase.from('tags').upsert(
    {
      id: toRemoteTagId(userId, tag.id),
      user_id: userId,
      label: tag.label,
      type: tag.type,
      is_archived: Boolean(tag.isArchived),
      created_at: tag.createdAt ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  if (error) {
    throw error;
  }
}

async function deleteRemoteTag(tagId: string) {
  const context = await getRemoteContext();
  if (!context) {
    return;
  }

  const { supabase, userId } = context;
  const { error } = await supabase
    .from('tags')
    .delete()
    .eq('id', toRemoteTagId(userId, tagId));
  if (error) {
    throw error;
  }
}

export const localTagRepository: TagRepository = {
  getCatalog: () => getTagCatalog(),
  create: (type, label) => createTag(type, label),
  remove: (tagId) => deleteTag(tagId),
  reorder: (type, orderedIds) => reorderTags(type, orderedIds),
  setArchived: (tagId, isArchived) => setTagArchived(tagId, isArchived),
};

export const tagRepository: TagRepository = {
  async getCatalog() {
    const local = await localTagRepository.getCatalog();

    try {
      const remote = await listRemoteTags();
      if (!remote) {
        return local;
      }

      const mergeById = (base: TagDefinition[], extra: TagDefinition[]) => {
        const next = new Map<string, TagDefinition>();
        base.forEach((item) => next.set(item.id, item));
        extra.forEach((item) => {
          if (!next.has(item.id)) {
            next.set(item.id, item);
          }
        });
        return [...next.values()];
      };

      return {
        action: mergeById(local.action, remote.action),
        state: mergeById(local.state, remote.state),
      };
    } catch (error) {
      console.error('tagRepository.getCatalog remote error:', error);
      return local;
    }
  },
  async create(type, label) {
    const created = await localTagRepository.create(type, label);
    if (!created) {
      return null;
    }

    try {
      await upsertRemoteTag(created);
    } catch (error) {
      console.error('tagRepository.create remote error:', error);
    }

    return created;
  },
  async remove(tagId) {
    await localTagRepository.remove(tagId);

    try {
      await deleteRemoteTag(tagId);
    } catch (error) {
      console.error('tagRepository.remove remote error:', error);
    }
  },
  async reorder(type, orderedIds) {
    await localTagRepository.reorder(type, orderedIds);
  },
  async setArchived(tagId, isArchived) {
    await localTagRepository.setArchived(tagId, isArchived);

    const catalog = await localTagRepository.getCatalog();
    const tag = [...catalog.action, ...catalog.state].find((item) => item.id === tagId);
    if (!tag) {
      return;
    }

    try {
      await upsertRemoteTag({ ...tag, isArchived });
    } catch (error) {
      console.error('tagRepository.setArchived remote error:', error);
    }
  },
};

export async function hydrateTagCatalogFromRemoteToLocal() {
  try {
    const [local, remote] = await Promise.all([
      localTagRepository.getCatalog(),
      listRemoteTags(),
    ]);

    if (!remote) {
      return;
    }

    const mergeById = (base: TagDefinition[], extra: TagDefinition[]) => {
      const next = new Map<string, TagDefinition>();
      base.forEach((item) => next.set(item.id, item));
      extra.forEach((item) => next.set(item.id, item));
      return [...next.values()];
    };

    await replaceTagCatalog({
      action: mergeById(local.action, remote.action),
      state: mergeById(local.state, remote.state),
    });
  } catch (error) {
    console.error('hydrateTagCatalogFromRemoteToLocal error:', error);
  }
}
