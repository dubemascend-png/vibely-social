-- Allow explicitly authorized staff to read platform-wide content/communities for console lists.
drop policy if exists posts_admin_console_read on public.posts;
create policy posts_admin_console_read on public.posts for select to authenticated
using (public.admin_has_permission('content.review') or public.admin_has_permission('content.remove') or public.admin_has_permission('content.restore'));
drop policy if exists communities_admin_console_read on public.communities;
create policy communities_admin_console_read on public.communities for select to authenticated
using (public.admin_has_permission('communities.view') or public.admin_has_permission('communities.manage'));
drop policy if exists comments_admin_console_read on public.comments;
create policy comments_admin_console_read on public.comments for select to authenticated
using (public.admin_has_permission('content.review') or public.admin_has_permission('comments.moderate'));
drop policy if exists stories_admin_console_read on public.stories;
create policy stories_admin_console_read on public.stories for select to authenticated
using (public.admin_has_permission('content.review'));
