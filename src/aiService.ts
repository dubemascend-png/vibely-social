/**
 * Vibe.ly AI adapter.
 * All functions are deliberately local mock implementations until a real provider is configured.
 * // TODO: connect backend — route these calls through a protected server-side AI endpoint.
 */
export type AIAction = 'quick-replies' | 'translate' | 'transcribe' | 'catch-up';
const delay = (ms = 220) => new Promise(resolve => window.setTimeout(resolve, ms));

export async function getQuickReplies(lastMessage: string): Promise<string[]> {
  await delay();
  const text = lastMessage.toLowerCase();
  if (text.includes('?')) return ['Yes, sounds good!', 'Let me check and get back to you.', 'Could you tell me a little more?'];
  if (text.includes('thank')) return ['You’re welcome 💜', 'Anytime!', 'Happy to help.'];
  return ['That sounds great!', 'Tell me more 👀', 'Thanks for sharing 💜'];
}

export async function translateMessage(message: string, language = 'French'): Promise<string> {
  await delay(300);
  // TODO: connect backend — this is a clearly labeled demo, not a real translation model.
  return '[Demo translation to ' + language + '] ' + message;
}

export async function transcribeVoiceNote(): Promise<string> {
  await delay(450);
  // TODO: connect backend — no audio is sent or processed in this mock.
  return 'Demo transcription: voice-note transcription will appear here when speech recognition is connected.';
}

export async function catchMeUp(messages: string[]): Promise<string> {
  await delay(350);
  // TODO: connect backend — summarize the actual decrypted conversation using a privacy-reviewed AI service.
  if (!messages.length) return 'There are no recent messages to summarize yet.';
  return 'Demo catch-up: ' + messages.slice(-3).join(' · ').slice(0, 360) + (messages.length > 3 ? ' …' : '') + '\n\nThis is a local preview, not an AI-generated summary.';
}

export const aiService = { getQuickReplies, translateMessage, transcribeVoiceNote, catchMeUp };
