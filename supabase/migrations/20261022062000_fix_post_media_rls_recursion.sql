-- Break the post_media <-> media_assets RLS recursion during media registration.
-- The helper reads only ownership/status fields and bypasses table RLS safely.
create or replace function public.can_attach_own_media(p_post_id uuid, p_media_asset_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.posts p
    where p.id = p_post_id
      and p.author_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.media_assets a
    where a.id = p_media_asset_id
      and a.owner_id = (select auth.uid())
      and a.status = any (array['uploaded'::text, 'ready'::text])
      and a.bucket_id = 'vibely-posts'
      and a.object_path like ((select auth.uid())::text || '/%')
  );
$function$;

revoke all on function public.can_attach_own_media(uuid, uuid) from public, anon;
grant execute on function public.can_attach_own_media(uuid, uuid) to authenticated;

drop policy if exists "Authors attach own media" on public.post_media;
drop policy if exists "Owners can link their uploaded media to their posts" on public.post_media;

create policy "Users attach their own uploaded media without recursive RLS"
on public.post_media
for insert
to authenticated
with check (public.can_attach_own_media(post_id, media_asset_id));
