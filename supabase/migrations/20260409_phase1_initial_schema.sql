create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  onboarding_completed boolean not null default false,
  account_linked boolean not null default false
);

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create table if not exists public.reviews (
  id text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  review_date date not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  category text not null,
  mood integer,
  template_id text,
  template_name text,
  answers_json jsonb not null default '{}'::jsonb,
  is_favorite boolean not null default false,
  import_source text,
  import_fingerprint text,
  constraint reviews_mood_range check (mood is null or mood between 1 and 5),
  constraint reviews_answers_json_object
    check (jsonb_typeof(answers_json) = 'object')
);

create index if not exists reviews_user_id_review_date_idx
  on public.reviews (user_id, review_date desc);

create index if not exists reviews_user_id_updated_at_idx
  on public.reviews (user_id, updated_at desc);

create index if not exists reviews_import_fingerprint_idx
  on public.reviews (user_id, import_fingerprint)
  where import_fingerprint is not null;

create unique index if not exists reviews_user_id_import_source_fingerprint_key
  on public.reviews (user_id, import_source, import_fingerprint)
  where import_source is not null and import_fingerprint is not null;

comment on column public.reviews.review_date is
  'Daily grouping key. Not unique in phase 1 because the app currently allows multiple reviews per day.';

create trigger set_reviews_updated_at
before update on public.reviews
for each row
execute function public.set_updated_at();

create table if not exists public.review_photos (
  id text primary key,
  review_id text not null references public.reviews (id) on delete cascade,
  storage_path text not null,
  comment text,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  constraint review_photos_sort_order_non_negative check (sort_order >= 0)
);

create index if not exists review_photos_review_id_sort_order_idx
  on public.review_photos (review_id, sort_order);

create unique index if not exists review_photos_review_id_sort_order_key
  on public.review_photos (review_id, sort_order);

create table if not exists public.tags (
  id text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  label text not null,
  type text not null,
  is_archived boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tags_type_check check (type in ('action', 'state'))
);

create unique index if not exists tags_user_id_type_label_key
  on public.tags (user_id, type, lower(label));

create trigger set_tags_updated_at
before update on public.tags
for each row
execute function public.set_updated_at();

create table if not exists public.review_tags (
  review_id text not null references public.reviews (id) on delete cascade,
  tag_id text not null references public.tags (id) on delete cascade,
  primary key (review_id, tag_id)
);

create table if not exists public.app_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  theme text,
  locale text,
  reminder_enabled boolean not null default false,
  reminder_hour integer,
  reminder_minute integer,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint app_preferences_reminder_hour_check
    check (reminder_hour is null or reminder_hour between 0 and 23),
  constraint app_preferences_reminder_minute_check
    check (reminder_minute is null or reminder_minute between 0 and 59)
);

create trigger set_app_preferences_updated_at
before update on public.app_preferences
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  insert into public.app_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.reviews enable row level security;
alter table public.review_photos enable row level security;
alter table public.tags enable row level security;
alter table public.review_tags enable row level security;
alter table public.app_preferences enable row level security;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "reviews_select_own"
on public.reviews
for select
to authenticated
using (auth.uid() = user_id);

create policy "reviews_insert_own"
on public.reviews
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "reviews_update_own"
on public.reviews
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "reviews_delete_own"
on public.reviews
for delete
to authenticated
using (auth.uid() = user_id);

create policy "review_photos_select_own"
on public.review_photos
for select
to authenticated
using (
  exists (
    select 1
    from public.reviews
    where reviews.id = review_photos.review_id
      and reviews.user_id = auth.uid()
  )
);

create policy "review_photos_insert_own"
on public.review_photos
for insert
to authenticated
with check (
  exists (
    select 1
    from public.reviews
    where reviews.id = review_photos.review_id
      and reviews.user_id = auth.uid()
  )
);

create policy "review_photos_update_own"
on public.review_photos
for update
to authenticated
using (
  exists (
    select 1
    from public.reviews
    where reviews.id = review_photos.review_id
      and reviews.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.reviews
    where reviews.id = review_photos.review_id
      and reviews.user_id = auth.uid()
  )
);

create policy "review_photos_delete_own"
on public.review_photos
for delete
to authenticated
using (
  exists (
    select 1
    from public.reviews
    where reviews.id = review_photos.review_id
      and reviews.user_id = auth.uid()
  )
);

create policy "tags_select_own"
on public.tags
for select
to authenticated
using (auth.uid() = user_id);

create policy "tags_insert_own"
on public.tags
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "tags_update_own"
on public.tags
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "tags_delete_own"
on public.tags
for delete
to authenticated
using (auth.uid() = user_id);

create policy "review_tags_select_own"
on public.review_tags
for select
to authenticated
using (
  exists (
    select 1
    from public.reviews
    where reviews.id = review_tags.review_id
      and reviews.user_id = auth.uid()
  )
);

create policy "review_tags_insert_own"
on public.review_tags
for insert
to authenticated
with check (
  exists (
    select 1
    from public.reviews
    join public.tags on tags.id = review_tags.tag_id
    where reviews.id = review_tags.review_id
      and reviews.user_id = auth.uid()
      and tags.user_id = auth.uid()
  )
);

create policy "review_tags_delete_own"
on public.review_tags
for delete
to authenticated
using (
  exists (
    select 1
    from public.reviews
    where reviews.id = review_tags.review_id
      and reviews.user_id = auth.uid()
  )
);

create policy "app_preferences_select_own"
on public.app_preferences
for select
to authenticated
using (auth.uid() = user_id);

create policy "app_preferences_insert_own"
on public.app_preferences
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "app_preferences_update_own"
on public.app_preferences
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('review-photos', 'review-photos', false)
on conflict (id) do nothing;

create policy "review_photos_storage_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'review-photos'
  and auth.uid()::text = split_part(name, '/', 1)
);

create policy "review_photos_storage_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'review-photos'
  and auth.uid()::text = split_part(name, '/', 1)
);

create policy "review_photos_storage_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'review-photos'
  and auth.uid()::text = split_part(name, '/', 1)
)
with check (
  bucket_id = 'review-photos'
  and auth.uid()::text = split_part(name, '/', 1)
);

create policy "review_photos_storage_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'review-photos'
  and auth.uid()::text = split_part(name, '/', 1)
);
