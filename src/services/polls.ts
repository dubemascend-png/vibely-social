import { supabase } from '../supabase';
import { throwIfError, withRetry } from './request';

export async function listPolls(limit = 12) {
  return withRetry(async () => {
    const { data, error } = await supabase.from('content_polls').select('id,question,created_at,closes_at').order('created_at', { ascending: false }).limit(Math.min(50, Math.max(1, limit)));
    throwIfError(error);
    const items = await Promise.all((data ?? []).map(async poll => {
      const { data: options, error: optionsError } = await supabase.rpc('get_poll_results', { p_poll_id: poll.id });
      throwIfError(optionsError);
      return { ...poll, options: options ?? [] };
    }));
    return items;
  });
}
export async function createPoll(authorId: string, question: string, optionLabels: string[]) {
  const cleanQuestion = question.trim();
  const options = [...new Set(optionLabels.map(label => label.trim()).filter(Boolean))].slice(0, 10);
  if (!cleanQuestion || cleanQuestion.length > 500 || options.length < 2) throw new Error('Add a question and at least two different options.');
  const { data, error } = await supabase.from('content_polls').insert({ author_id: authorId, question: cleanQuestion }).select('id,question,created_at,closes_at').single();
  throwIfError(error);
  if (!data) throw new Error('Poll was not created. Please try again.');
  const inserted = await supabase.from('poll_options').insert(options.map((option_text, position) => ({ poll_id: data.id, option_text, position })));
  if (inserted.error) {
    await supabase.from('content_polls').delete().eq('id', data.id).eq('author_id', authorId);
    throwIfError(inserted.error);
  }
  return data;
}
export async function votePoll(pollId: string, optionId: string, userId: string) {
  const { error } = await supabase.from('poll_votes').upsert({ poll_id: pollId, option_id: optionId, user_id: userId, updated_at: new Date().toISOString() }, { onConflict: 'poll_id,user_id' });
  throwIfError(error);
}
