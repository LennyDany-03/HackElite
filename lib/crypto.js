"use client";

// Simple crypto helpers using TweetNaCl for public-key encryption (X25519 + XSalsa20-Poly1305)
// npm install tweetnacl
import nacl from "tweetnacl";

// Base64 utilities for Uint8Array <-> string
export function u8ToBase64(u8) {
  if (typeof window === "undefined") return Buffer.from(u8).toString("base64");
  let binary = "";
  const len = u8.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(u8[i]);
  return btoa(binary);
}

export function base64ToU8(b64) {
  if (typeof window === "undefined") return new Uint8Array(Buffer.from(b64, "base64"));
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

const LOCAL_KEY_STORAGE = "e2ee_identity_keys_v1";

export function getOrCreateIdentityKeys() {
  if (typeof window === "undefined") throw new Error("getOrCreateIdentityKeys must run client-side");
  const existing = window.localStorage.getItem(LOCAL_KEY_STORAGE);
  if (existing) return JSON.parse(existing);

  const kp = nacl.box.keyPair();
  const keys = {
    publicKey: u8ToBase64(kp.publicKey),
    secretKey: u8ToBase64(kp.secretKey),
  };
  window.localStorage.setItem(LOCAL_KEY_STORAGE, JSON.stringify(keys));
  return keys;
}

export function getIdentityKeys() {
  if (typeof window === "undefined") return null;
  const existing = window.localStorage.getItem(LOCAL_KEY_STORAGE);
  return existing ? JSON.parse(existing) : null;
}

export function clearIdentityKeys() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LOCAL_KEY_STORAGE);
}

export function encryptForRecipient(message, recipientPublicB64, senderSecretB64) {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const cipher = nacl.box(
    new TextEncoder().encode(message),
    nonce,
    base64ToU8(recipientPublicB64),
    base64ToU8(senderSecretB64)
  );
  return { ciphertextB64: u8ToBase64(cipher), nonceB64: u8ToBase64(nonce) };
}

export function decryptFromSender(ciphertextB64, nonceB64, senderPublicB64, mySecretB64) {
  const plain = nacl.box.open(
    base64ToU8(ciphertextB64),
    base64ToU8(nonceB64),
    base64ToU8(senderPublicB64),
    base64ToU8(mySecretB64)
  );
  if (!plain) return null;
  return new TextDecoder().decode(plain);
}

// Deterministic conversation key for 1:1 chats: sha256 of sorted user ids
export async function conversationKeyFor(userIdA, userIdB) {
  const [a, b] = [userIdA, userIdB].sort();
  const data = new TextEncoder().encode(`${a}:${b}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ---------------- File encryption (AES-GCM) ----------------
// We encrypt file bytes with AES-GCM using a random 256-bit key and 96-bit IV, then
// we encrypt that symmetric key to both recipient and sender using NaCl box.

async function importAesKey(raw) {
  // Ensure we pass an ArrayBuffer slice matching the view
  const rawBuf = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
  return crypto.subtle.importKey("raw", rawBuf, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export function randomBytes(len) {
  const u = new Uint8Array(len);
  crypto.getRandomValues(u);
  return u;
}

export async function aesGcmEncrypt(plain, keyRaw, iv) {
  const key = await importAesKey(keyRaw);
  const ivUse = iv || randomBytes(12);
  // Web Crypto expects BufferSource; provide a precise ArrayBuffer slice
  const ivBuf = ivUse.buffer.slice(ivUse.byteOffset, ivUse.byteOffset + ivUse.byteLength);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv: ivBuf }, key, plain);
  return { cipher, iv: ivUse };
}

export async function aesGcmDecrypt(cipher, keyRaw, iv) {
  const key = await importAesKey(keyRaw);
  const ivBuf = iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength);
  return crypto.subtle.decrypt({ name: "AES-GCM", iv: ivBuf }, key, cipher);
}

export async function encryptFileForUpload(file) {
  const bytes = await file.arrayBuffer();
  const keyRaw = randomBytes(32); // 256-bit key
  const { cipher, iv } = await aesGcmEncrypt(bytes, keyRaw);
  const cipherBlob = new Blob([new Uint8Array(cipher)], { type: "application/octet-stream" });
  return { cipherBlob, ivB64: u8ToBase64(iv), keyB64: u8ToBase64(keyRaw) };
}

export async function decryptFileFromBytes(cipherBytes, ivB64, keyB64, mimeType) {
  const plain = await aesGcmDecrypt(cipherBytes, base64ToU8(keyB64), base64ToU8(ivB64));
  return new Blob([new Uint8Array(plain)], { type: mimeType || "application/octet-stream" });
}
