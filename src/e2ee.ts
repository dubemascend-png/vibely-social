const DB_NAME = 'vibely-e2ee';
const STORE = 'identity';
const VERSION = 1;

type Identity = { publicKey: string; privateKey: CryptoKey };
export type EncryptedEnvelope = { __vibely_e2ee: 1; alg: 'RSA-OAEP-256+A256GCM'; iv: string; ciphertext: string; keys: Record<string, string> };

const toBase64 = (bytes: ArrayBuffer | Uint8Array) => {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  for (let i = 0; i < view.length; i++) binary += String.fromCharCode(view[i]);
  return btoa(binary);
};
const fromBase64 = (value: string) => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

function openIdentityDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'userId' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open secure device key storage.'));
  });
}
async function readIdentity(userId: string): Promise<Identity | null> {
  const db = await openIdentityDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(userId);
    request.onsuccess = () => { db.close(); resolve(request.result ? { publicKey: request.result.publicKey, privateKey: request.result.privateKey } : null); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}
async function writeIdentity(userId: string, identity: Identity): Promise<void> {
  const db = await openIdentityDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ userId, ...identity });
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error || new Error('Could not save the private key on this device.')); };
  });
}
export async function getDeviceIdentity(userId: string): Promise<Identity> {
  if (!globalThis.crypto?.subtle || !globalThis.indexedDB) throw new Error('This browser does not support secure message encryption. Please use an up-to-date browser over HTTPS.');
  const saved = await readIdentity(userId);
  if (saved) return saved;
  const pair = await crypto.subtle.generateKey({ name: 'RSA-OAEP', modulusLength: 3072, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, false, ['encrypt', 'decrypt']);
  const publicBytes = await crypto.subtle.exportKey('spki', pair.publicKey);
  const identity = { publicKey: toBase64(publicBytes), privateKey: pair.privateKey };
  await writeIdentity(userId, identity);
  return identity;
}
export async function encryptMessage(plaintext: string, senderId: string, publicKeys: Record<string, string>): Promise<string> {
  const recipients = [...new Set([senderId, ...Object.keys(publicKeys)])];
  if (recipients.some(id => !publicKeys[id])) throw new Error('A participant has not set up encrypted messaging on this device yet. Ask them to open Messages again and retry.');
  const aesKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, new TextEncoder().encode(plaintext));
  const rawAesKey = await crypto.subtle.exportKey('raw', aesKey);
  const keys: Record<string, string> = {};
  for (const userId of recipients) {
    const publicKey = await crypto.subtle.importKey('spki', fromBase64(publicKeys[userId]), { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
    keys[userId] = toBase64(await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, rawAesKey));
  }
  const envelope: EncryptedEnvelope = { __vibely_e2ee: 1, alg: 'RSA-OAEP-256+A256GCM', iv: toBase64(iv), ciphertext: toBase64(ciphertext), keys };
  return JSON.stringify(envelope);
}
export async function decryptMessage(body: string, userId: string, identity: Identity): Promise<string> {
  let envelope: EncryptedEnvelope;
  try { envelope = JSON.parse(body) as EncryptedEnvelope; } catch { return body; }
  if (envelope?.__vibely_e2ee !== 1) return body;
  const wrapped = envelope.keys?.[userId];
  if (!wrapped) return '🔒 This encrypted message was not addressed to this device.';
  try {
    const rawKey = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, identity.privateKey, fromBase64(wrapped));
    const key = await crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, ['decrypt']);
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(envelope.iv) }, key, fromBase64(envelope.ciphertext));
    return new TextDecoder().decode(plaintext);
  } catch {
    return '🔒 Unable to decrypt this message on this device.';
  }
}
export function isEncryptedMessage(body: string): boolean {
  try { return (JSON.parse(body) as EncryptedEnvelope)?.__vibely_e2ee === 1; } catch { return false; }
}
