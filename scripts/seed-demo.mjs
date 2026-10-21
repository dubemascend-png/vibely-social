import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your local shell.');
if (process.env.ALLOW_DEMO_SEED !== 'true') throw new Error('Safety stop: set ALLOW_DEMO_SEED=true only when you intentionally want demo records in this Supabase project.');
const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function must(result, label) {
  if (result.error) throw new Error(label + ': ' + result.error.message);
  return result.data;
}
async function userFor(username, displayName, bio) {
  const existing = await must(await supabase.from('profiles').select('id').eq('username', username).maybeSingle(), 'Find demo profile');
  if (existing?.id) return existing.id;
  const email = username + '@example.invalid';
  const created = await supabase.auth.admin.createUser({
    email,
    password: randomUUID() + 'Aa9!',
    email_confirm: true,
    user_metadata: { display_name: displayName, demo_seed: true },
  });
  if (created.error) throw new Error('Create demo user: ' + created.error.message);
  const id = created.data.user.id;
  await must(await supabase.from('profiles').upsert({ id, username, display_name: displayName, bio, is_private: false }, { onConflict: 'id' }), 'Create demo profile');
  return id;
}
async function ensurePost(authorId, caption) {
  const existing = await must(await supabase.from('posts').select('id').eq('author_id', authorId).eq('caption', caption).maybeSingle(), 'Check demo post');
  if (existing?.id) return existing.id;
  const post = await must(await supabase.from('posts').insert({ author_id: authorId, caption, media_type: 'text', visibility: 'public' }).select('id').single(), 'Create demo post');
  return post.id;
}
async function run() {
  const creator = await userFor('vibely_demo_creator', 'Amara Okafor', 'Creator, storyteller, and lover of small everyday wins. ✦');
  const learner = await userFor('vibely_demo_learner', 'Tobi Adebayo', 'Learning out loud. Sharing tech, music, and good energy.');
  const captions = [
    [creator, 'A reminder for today: progress counts, even when it is quiet. #GoodEnergy #Growth'],
    [creator, 'What is one small thing that made you smile this week? I want to hear it. #Community'],
    [learner, 'Building something new, learning something hard, and showing up anyway. #Tech #Learning'],
    [learner, 'Playlist mood: soft music, focused mind, and a fresh cup of tea. #Music'],
  ];
  const postIds = [];
  for (const [authorId, caption] of captions) postIds.push(await ensurePost(authorId, caption));
  await must(await supabase.from('follows').upsert([{ follower_id: learner, following_id: creator }, { follower_id: creator, following_id: learner }], { onConflict: 'follower_id,following_id', ignoreDuplicates: true }), 'Create demo follows');

  const communitySlug = 'vibely-demo-corner';
  let community = await must(await supabase.from('communities').select('id').eq('slug', communitySlug).maybeSingle(), 'Find demo community');
  if (!community?.id) community = await must(await supabase.from('communities').insert({
    name: 'The Good Vibe Corner', slug: communitySlug,
    description: 'A friendly place for small wins, creative experiments, and thoughtful conversations.',
    privacy: 'public', created_by: creator,
    rules: ['Be kind and respectful.', 'Protect members’ privacy.', 'No spam or harassment.'],
    topics: ['Creativity', 'Wellbeing', 'Learning'],
  }).select('id').single(), 'Create demo community');
  await must(await supabase.from('community_members').upsert([
    { community_id: community.id, user_id: creator, role: 'owner' },
    { community_id: community.id, user_id: learner, role: 'member' },
  ], { onConflict: 'community_id,user_id', ignoreDuplicates: true }), 'Add demo community members');

  const communityCaption = 'Welcome in! Share one thing you are excited to learn or create this month.';
  const existingCommunityPost = await must(await supabase.from('community_posts').select('id').eq('community_id', community.id).eq('author_id', creator).eq('body', communityCaption).maybeSingle(), 'Check demo community post');
  if (!existingCommunityPost?.id) await must(await supabase.from('community_posts').insert({ community_id: community.id, author_id: creator, body: communityCaption }), 'Create demo community post');

  const commentBody = 'Needed this reminder today. Thanks for sharing. ✦';
  const existingComment = await must(await supabase.from('comments').select('id').eq('post_id', postIds[0]).eq('author_id', learner).eq('body', commentBody).maybeSingle(), 'Check demo comment');
  if (!existingComment?.id) await must(await supabase.from('comments').insert({ post_id: postIds[0], author_id: learner, body: commentBody }), 'Create demo comment');
  await must(await supabase.from('likes').upsert({ post_id: postIds[0], user_id: learner }, { onConflict: 'post_id,user_id', ignoreDuplicates: true }), 'Create demo like');

  const activeNote = await must(await supabase.from('user_notes').select('id').eq('user_id', creator).gt('expires_at', new Date().toISOString()).limit(1).maybeSingle(), 'Check demo note');
  if (!activeNote?.id) await must(await supabase.from('user_notes').insert({ user_id: creator, body: 'Small wins still count ✦' }), 'Create demo note');

  console.log('Demo seed complete.');
  console.log('Created/reused 2 demo profiles, 4 public text posts, mutual follows, 1 community, a community post, a comment, a like, and a 24-hour note.');
  console.log('Demo emails: vibely_demo_creator@example.invalid and vibely_demo_learner@example.invalid');
  console.log('Users were created with random passwords. Do not seed production data unless you explicitly intend to.');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
