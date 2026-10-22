alter table public.profiles
  add column if not exists is_hibernating boolean not null default false,
  add column if not exists hibernated_at timestamptz;

drop policy if exists "profiles are readable by signed-in users" on public.profiles;
create policy "profiles readable unless hibernated"
on public.profiles for select to authenticated
using (id = (select auth.uid()) or is_hibernating = false);

drop policy if exists "signed-in users can read eligible posts" on public.posts;
create policy "signed-in users can read eligible posts"
on public.posts for select to authenticated
using (
  (author_id = (select auth.uid()) or visibility = 'public'
    or (visibility = 'followers' and exists (
      select 1 from public.follows f
      where f.follower_id = (select auth.uid()) and f.following_id = posts.author_id
    )))
  and not exists (
    select 1 from public.blocks b
    where (b.blocker_id = (select auth.uid()) and b.blocked_id = posts.author_id)
       or (b.blocker_id = posts.author_id and b.blocked_id = (select auth.uid()))
  )
  and not exists (
    select 1 from public.user_account_restrictions r
    where r.user_id = posts.author_id
      and (r.status = any (array['banned','deleted']::text[])
        or (r.status = 'restricted' and (r.expires_at is null or r.expires_at > now())))
  )
  and (author_id = (select auth.uid()) or not exists (
    select 1 from public.profiles pr where pr.id = posts.author_id and pr.is_hibernating = true
  ))
);