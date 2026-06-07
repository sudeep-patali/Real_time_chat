/**
 * keyManager.js — Client-side E2E encryption helpers (Web Crypto API).
 *
 * Design:
 *  - Each user has an RSA-OAEP key pair. The private key stays in IndexedDB; the public key is
 *    sent to the server and stored on the User model.
 *  - Each room has an AES-GCM-256 symmetric key. It is generated client-side when the room is
 *    created, then encrypted with every participant's RSA public key and POSTed to the server.
 *    The server never sees the plaintext room key.
 *  - Messages are encrypted with the room AES key and sent as { content (Base64 ciphertext),
 *    iv (Base64), authTag (Base64), encrypted: true }.
 */

import { savePrivateKey, loadPrivateKey } from './storage';

// ── RSA-OAEP key pair ─────────────────────────────────────────────────────────

/**
 * Generate a 4096-bit RSA-OAEP key pair.
 * Call once at signup. Saves private key to IndexedDB; returns { publicKeyPem, privateKey }.
 *
 * @param {string} userId
 * @returns {Promise<{ publicKeyPem: string, privateKey: CryptoKey }>}
 */
export async function generateUserKeyPair(userId) {
  const keyPair = await crypto.subtle.generateKey(
    {
      name:           'RSA-OAEP',
      modulusLength:  4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash:           'SHA-256',
    },
    true,  // extractable: public key must be exportable to PEM
    ['encrypt', 'decrypt'],
  );

  await savePrivateKey(userId, keyPair.privateKey);

  const publicKeyPem = await exportPublicKeyPem(keyPair.publicKey);
  return { publicKeyPem, privateKey: keyPair.privateKey };
}

// ── AES-256-GCM room key ──────────────────────────────────────────────────────

/**
 * Generate a fresh AES-GCM-256 symmetric key for a new room.
 * @returns {Promise<CryptoKey>}
 */
export async function generateRoomKey() {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,           // extractable so we can wrap it with RSA for each participant
    ['encrypt', 'decrypt'],
  );
}

/**
 * Encrypt the room AES key with a participant's RSA public key (PEM).
 * Returns a Base64 blob to store in RoomKey.encryptedKey on the server.
 *
 * @param {CryptoKey} roomKey
 * @param {string}    recipientPublicKeyPem
 * @returns {Promise<string>}  Base64 ciphertext
 */
export async function encryptRoomKeyForUser(roomKey, recipientPublicKeyPem) {
  const rawKey       = await crypto.subtle.exportKey('raw', roomKey);
  const recipientKey = await importPublicKeyPem(recipientPublicKeyPem);
  const encrypted    = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, recipientKey, rawKey);
  return arrayBufferToBase64(encrypted);
}

/**
 * Decrypt a room key blob using the current user's private key from IndexedDB.
 *
 * @param {string} encryptedKeyBase64  Base64 blob from the server
 * @param {string} userId
 * @returns {Promise<CryptoKey>}  AES-GCM CryptoKey
 */
export async function decryptRoomKey(encryptedKeyBase64, userId) {
  const privateKey   = await loadPrivateKey(userId);
  if (!privateKey) throw new Error('Private key not found in IndexedDB');

  const ciphertext   = base64ToArrayBuffer(encryptedKeyBase64);
  const rawKey       = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, ciphertext);
  return crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

// ── Message encrypt / decrypt ─────────────────────────────────────────────────

/**
 * Encrypt a plaintext string with the room's AES-GCM key.
 *
 * @param {string}    plaintext
 * @param {CryptoKey} roomKey
 * @returns {Promise<{ ciphertext: string, iv: string, authTag: string }>}  all Base64
 */
export async function encryptMessage(plaintext, roomKey) {
  const iv         = crypto.getRandomValues(new Uint8Array(12));  // 96-bit nonce
  const encoded    = new TextEncoder().encode(plaintext);

  // AES-GCM output = ciphertext + 16-byte auth tag concatenated
  const encrypted  = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    roomKey,
    encoded,
  );

  // Split: last 16 bytes are the auth tag
  const encBytes   = new Uint8Array(encrypted);
  const cipherBytes = encBytes.slice(0, encBytes.length - 16);
  const tagBytes    = encBytes.slice(encBytes.length - 16);

  return {
    ciphertext: arrayBufferToBase64(cipherBytes.buffer),
    iv:         arrayBufferToBase64(iv.buffer),
    authTag:    arrayBufferToBase64(tagBytes.buffer),
  };
}

/**
 * Decrypt an encrypted message.
 *
 * @param {{ content: string, iv: string, authTag: string }} msg  all Base64
 * @param {CryptoKey} roomKey
 * @returns {Promise<string>}  plaintext
 */
export async function decryptMessage({ content, iv, authTag }, roomKey) {
  const cipherBytes = new Uint8Array(base64ToArrayBuffer(content));
  const tagBytes    = new Uint8Array(base64ToArrayBuffer(authTag));
  const ivBytes     = new Uint8Array(base64ToArrayBuffer(iv));

  // Reconstruct AES-GCM expected layout: ciphertext || authTag
  const combined    = new Uint8Array(cipherBytes.length + tagBytes.length);
  combined.set(cipherBytes);
  combined.set(tagBytes, cipherBytes.length);

  const decrypted   = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes, tagLength: 128 },
    roomKey,
    combined,
  );

  return new TextDecoder().decode(decrypted);
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function exportPublicKeyPem(key) {
  const spki   = await crypto.subtle.exportKey('spki', key);
  const b64    = arrayBufferToBase64(spki);
  return `-----BEGIN PUBLIC KEY-----\n${b64.match(/.{1,64}/g).join('\n')}\n-----END PUBLIC KEY-----`;
}

async function importPublicKeyPem(pem) {
  const b64    = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const spki   = base64ToArrayBuffer(b64);
  return crypto.subtle.importKey(
    'spki',
    spki,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt'],
  );
}

function arrayBufferToBase64(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64ToArrayBuffer(b64) {
  const binary = atob(b64);
  const bytes  = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}