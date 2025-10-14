"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import { supabase } from "../../lib/supabaseClient";
import {
  conversationKeyFor,
  decryptFromSender,
  encryptForRecipient,
  getIdentityKeys,
  getOrCreateIdentityKeys,
  encryptFileForUpload,
  decryptFileFromBytes,
} from "../../lib/crypto";

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [keys, setKeys] = useState(null);

  const [recipientUsername, setRecipientUsername] = useState("");
  const [recipientProfile, setRecipientProfile] = useState(null);
  const [convKey, setConvKey] = useState(null);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loadingChat, setLoadingChat] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [fileToSend, setFileToSend] = useState(null);

  // Sidebar contacts list
  const [contacts, setContacts] = useState([]); // [{peer_id, username, public_key, last_message_at}]
  const [contactsLoading, setContactsLoading] = useState(true);

  const socketRef = useRef(null);

  // Ensure logged in and profile present
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user ?? null;
      if (!mounted) return;
      if (!u) {
        router.replace("/login");
        return;
      }
      setUser(u);

      const ik = getIdentityKeys() ?? getOrCreateIdentityKeys();
      setKeys(ik);

      const { data: prof } = await supabase
        .from("profiles")
        .select("id, email, username, public_key")
        .eq("id", u.id)
        .maybeSingle();
      if (!prof || !prof.username) {
        router.replace("/username");
        return;
      }
      setProfile(prof);

      // Load contacts
      await refreshContacts(u.id);

      // Initialize socket server (warm-up the route) and connect
      await fetch("/api/socket").catch(() => {});
      const s = io({ path: "/api/socket" });
      socketRef.current = s;

      s.on("connect", () => {
        // Join current room if already selected
        if (convKey) s.emit("join", convKey);
      });

      s.on("message:new", async (row) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === row.id)) return prev; // dedupe
          return [...prev, decorate(row, u.id, ik)];
        });

        // Update contacts list when new message arrives
        const otherId = row.sender_id === u.id ? row.recipient_id : row.sender_id;
        await upsertContact(u.id, otherId, row.created_at);
        await refreshContacts(u.id);
      });

      s.on("file:new", async (row) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === row.id)) return prev;
          return [...prev, decorateFile(row, u.id, ik)];
        });
        const otherId = row.sender_id === u.id ? row.recipient_id : row.sender_id;
        await upsertContact(u.id, otherId, row.created_at);
        await refreshContacts(u.id);
      });
    })();
    return () => {
      mounted = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [router]);

  function decorate(row, myId, ik) {
    return {
      ...row,
      type: "text",
      plaintext:
        row.recipient_id === myId
          ? decryptFromSender(row.ciphertext_to_recipient, row.nonce_to_recipient, row.sender_public_key, ik.secretKey)
          : decryptFromSender(row.ciphertext_to_sender, row.nonce_to_sender, row.sender_public_key, ik.secretKey),
    };
  }

  function decorateFile(row, myId, _ik) {
    return {
      ...row,
      type: "file",
    };
  }

  async function refreshContacts(ownerId) {
    setContactsLoading(true);
    try {
      const { data: rows } = await supabase
        .from("contacts")
        .select("peer_id, last_message_at")
        .eq("owner_id", ownerId)
        .order("last_message_at", { ascending: false });
      const peerIds = (rows || []).map((r) => r.peer_id);
      if (peerIds.length === 0) {
        setContacts([]);
        setContactsLoading(false);
        return;
      }
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, username, public_key")
        .in("id", peerIds);
      const map = new Map(profs.map((p) => [p.id, p]));
      const merged = rows
        .map((r) => ({
          peer_id: r.peer_id,
          last_message_at: r.last_message_at,
          username: map.get(r.peer_id)?.username || "unknown",
          public_key: map.get(r.peer_id)?.public_key || "",
        }))
        .sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));
      setContacts(merged);
    } finally {
      setContactsLoading(false);
    }
  }

  async function upsertContact(ownerId, peerId, lastAt) {
    await supabase
      .from("contacts")
      .upsert({ owner_id: ownerId, peer_id: peerId, last_message_at: lastAt || new Date().toISOString() });
  }

  async function loadChat() {
    if (!user || !profile || !keys || !recipientUsername.trim()) return;
    setError(null);
    setLoadingChat(true);
    try {
      const { data: rec } = await supabase
        .from("profiles")
        .select("id, username, public_key")
        .eq("username", recipientUsername.trim())
        .maybeSingle();
      if (!rec) throw new Error("Recipient not found");
      if (rec.id === user.id) throw new Error("You cannot chat with yourself");
      setRecipientProfile(rec);

      const ck = await conversationKeyFor(user.id, rec.id);
      setConvKey(ck);

      // Join room
      if (socketRef.current) socketRef.current.emit("join", ck);

      // Upsert contact for me
      await upsertContact(user.id, rec.id);
      await refreshContacts(user.id);

      // Load history
      const { data: rows, error: mErr } = await supabase
        .from("messages")
        .select(
          "id, conversation_key, sender_id, recipient_id, sender_public_key, ciphertext_to_recipient, nonce_to_recipient, ciphertext_to_sender, nonce_to_sender, created_at"
        )
        .eq("conversation_key", ck)
        .order("created_at", { ascending: true });
      if (mErr) throw mErr;
      const decoratedText = (rows || []).map((r) => decorate(r, user.id, keys));

      const { data: frows, error: fErr } = await supabase
        .from("file_messages")
        .select(
          "id, conversation_key, sender_id, recipient_id, sender_public_key, storage_path, file_name, mime_type, size_bytes, iv_b64, key_to_recipient, key_nonce_to_recipient, key_to_sender, key_nonce_to_sender, created_at"
        )
        .eq("conversation_key", ck)
        .order("created_at", { ascending: true });
      if (fErr) throw fErr;
      const decoratedFiles = (frows || []).map((r) => decorateFile(r, user.id, keys));

      const merged = [...decoratedText, ...decoratedFiles].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      );
      setMessages(merged);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoadingChat(false);
    }
  }

  async function sendMessage() {
    if (!input.trim() || !user || !profile || !recipientProfile || !keys || !convKey) return;
    setSending(true);
    try {
      const forRecipient = encryptForRecipient(input, recipientProfile.public_key, keys.secretKey);
      const forSelf = encryptForRecipient(input, profile.public_key, keys.secretKey);
      const insert = {
        conversation_key: convKey,
        sender_id: user.id,
        recipient_id: recipientProfile.id,
        sender_public_key: keys.publicKey,
        ciphertext_to_recipient: forRecipient.ciphertextB64,
        nonce_to_recipient: forRecipient.nonceB64,
        ciphertext_to_sender: forSelf.ciphertextB64,
        nonce_to_sender: forSelf.nonceB64,
      };
      const { data: row, error: insErr } = await supabase.from("messages").insert(insert).select().single();
      if (insErr) throw insErr;
      setInput("");

      // Emit realtime update via socket
      if (socketRef.current) socketRef.current.emit("message:send", convKey, row);

      // Optimistic append
      setMessages((prev) => [...prev, decorate(row, user.id, keys)]);

      // Update last message time in contacts for me
      await upsertContact(user.id, recipientProfile.id, row.created_at);
      await refreshContacts(user.id);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setSending(false);
    }
  }

  async function sendFile() {
    if (!fileToSend || !user || !profile || !recipientProfile || !keys || !convKey) return;
    setSending(true);
    try {
      const enc = await encryptFileForUpload(fileToSend);
      // Encrypt symmetric key for recipient and for sender using NaCl box
      const keyToRecipient = encryptForRecipient(enc.keyB64, recipientProfile.public_key, keys.secretKey);
      const keyToSelf = encryptForRecipient(enc.keyB64, profile.public_key, keys.secretKey);

      // Upload encrypted blob to Storage
      const safeName = fileToSend.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
      const rand = crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
      const path = `${convKey}/${Date.now()}_${rand}_${safeName}`;
      const { error: upErr } = await supabase.storage.from("files").upload(path, enc.cipherBlob, {
        contentType: "application/octet-stream",
        upsert: false,
      });
      if (upErr) throw upErr;

      const insert = {
        conversation_key: convKey,
        sender_id: user.id,
        recipient_id: recipientProfile.id,
        sender_public_key: keys.publicKey,
        storage_path: path,
        file_name: fileToSend.name,
        mime_type: fileToSend.type || "application/octet-stream",
        size_bytes: fileToSend.size,
        iv_b64: enc.ivB64,
        key_to_recipient: keyToRecipient.ciphertextB64,
        key_nonce_to_recipient: keyToRecipient.nonceB64,
        key_to_sender: keyToSelf.ciphertextB64,
        key_nonce_to_sender: keyToSelf.nonceB64,
      };
      const { data: row, error: insErr } = await supabase
        .from("file_messages")
        .insert(insert)
        .select()
        .single();
      if (insErr) throw insErr;
      setFileToSend(null);

      if (socketRef.current) socketRef.current.emit("file:send", convKey, row);
      setMessages((prev) => [...prev, decorateFile(row, user.id, keys)]);
      await upsertContact(user.id, recipientProfile.id, row.created_at);
      await refreshContacts(user.id);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setSending(false);
    }
  }

  async function downloadFile(row) {
    try {
      const isRecipient = row.recipient_id === (user && user.id);
      const encKeyB64 = isRecipient ? row.key_to_recipient : row.key_to_sender;
      const nonceB64 = isRecipient ? row.key_nonce_to_recipient : row.key_nonce_to_sender;
      const symKeyB64 = decryptFromSender(encKeyB64, nonceB64, row.sender_public_key, keys.secretKey);
      if (!symKeyB64) throw new Error("Unable to decrypt file key");
      const { data, error: dErr } = await supabase.storage.from("files").download(row.storage_path);
      if (dErr) throw dErr;
      const buf = await data.arrayBuffer();
      const blob = await decryptFileFromBytes(buf, row.iv_b64, symKeyB64, row.mime_type);
      const url = URL.createObjectURL(blob);
      // Trigger download
      const a = document.createElement("a");
      a.href = url;
      a.download = row.file_name || "download";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      setError(e.message || String(e));
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  return (
    <div className="min-h-screen w-full flex">
      {/* Sidebar */}
      <aside className="w-72 border-r px-4 py-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">Chats</div>
          <button
            onClick={signOut}
            className="px-2 py-1 rounded bg-gray-800 text-white text-xs hover:opacity-90"
          >
            Sign out
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            className="flex-1 border rounded px-3 py-2 text-sm"
            placeholder="Start chat by username…"
            value={recipientUsername}
            onChange={(e) => setRecipientUsername(e.target.value)}
          />
          <button
            onClick={loadChat}
            disabled={!recipientUsername || loadingChat}
            className="px-3 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-50"
          >
            Go
          </button>
        </div>

        <div className="text-xs uppercase text-gray-500">Recent</div>
        <div className="flex-1 overflow-y-auto">
          {contactsLoading && <div className="text-sm text-gray-500">Loading…</div>}
          {!contactsLoading && contacts.length === 0 && (
            <div className="text-sm text-gray-500">No chats yet</div>
          )}
          <ul className="flex flex-col">
            {contacts.map((c) => {
              const active = recipientProfile && c.peer_id === recipientProfile.id;
              return (
                <li key={c.peer_id}>
                  <button
                    onClick={async () => {
                      const rec = { id: c.peer_id, username: c.username, public_key: c.public_key };
                      setRecipientProfile(rec);
                      setRecipientUsername(c.username);
                      const ck = await conversationKeyFor(user.id, c.peer_id);
                      setConvKey(ck);
                      if (socketRef.current) socketRef.current.emit("join", ck);
                      // load history
                      const { data: rows } = await supabase
                        .from("messages")
                        .select(
                          "id, conversation_key, sender_id, recipient_id, sender_public_key, ciphertext_to_recipient, nonce_to_recipient, ciphertext_to_sender, nonce_to_sender, created_at"
                        )
                        .eq("conversation_key", ck)
                        .order("created_at", { ascending: true });
                      const decorated = (rows || []).map((r) => decorate(r, user.id, keys));
                      setMessages(decorated);
                    }}
                    className={`w-full text-left px-2 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 ${
                      active ? "bg-gray-100 dark:bg-gray-800" : ""
                    }`}
                  >
                    <div className="text-sm font-medium">{c.username}</div>
                    <div className="text-[10px] text-gray-500">
                      {new Date(c.last_message_at).toLocaleString()}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>

      {/* Main chat area */}
      <main className="flex-1 p-6 flex flex-col gap-4">
        <header className="flex items-center justify-between">
          <div className="text-xl font-semibold">Chat</div>
          {profile && <div className="text-sm text-gray-600">{profile.username}</div>}
        </header>

        {error && <div className="p-3 rounded bg-red-50 text-red-700 text-sm">{error}</div>}

        {recipientProfile && convKey ? (
          <div className="border rounded-md p-3 flex flex-col gap-3 h-[75vh]">
            <div className="text-sm text-gray-600">
              Chat with <span className="font-medium">{recipientProfile.username}</span>
            </div>
            <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
              {messages.map((m) => {
                const mine = m.sender_id === (user && user.id);
                if (m.type === "file") {
                  return (
                    <div key={`f_${m.id}`} className={`max-w-[75%] ${mine ? "self-end" : "self-start"}`}>
                      <div
                        className={`px-3 py-2 rounded shadow-sm ${
                          mine
                            ? "bg-blue-600 text-white"
                            : "bg-white text-gray-900 border border-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
                        }`}
                      >
                        <div className="text-sm font-medium mb-1">{m.file_name}</div>
                        <div className="text-xs opacity-80 mb-2">Encrypted file • {(m.size_bytes / 1024).toFixed(1)} KB</div>
                        <button
                          onClick={() => downloadFile(m)}
                          className={`px-2 py-1 rounded text-sm ${mine ? "bg-white text-blue-700" : "bg-blue-600 text-white"}`}
                        >
                          Download & Decrypt
                        </button>
                        <div className="mt-1 text-[10px] opacity-70">{new Date(m.created_at).toLocaleTimeString()}</div>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={m.id} className={`max-w-[75%] ${mine ? "self-end" : "self-start"}`}>
                    <div
                      className={`px-3 py-2 rounded shadow-sm ${
                        mine
                          ? "bg-blue-600 text-white"
                          : "bg-white text-gray-900 border border-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words text-sm">{m.plaintext ?? "[unable to decrypt]"}</div>
                      <div className="mt-1 text-[10px] opacity-70">{new Date(m.created_at).toLocaleTimeString()}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <input
                className="flex-1 border rounded px-3 py-2"
                placeholder="Type a message…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <input
                type="file"
                onChange={(e) => setFileToSend(e.target.files?.[0] || null)}
                className="text-sm"
              />
              <button
                onClick={sendFile}
                disabled={!fileToSend || sending}
                className="px-3 py-2 rounded bg-purple-600 text-white disabled:opacity-50"
              >
                Send file
              </button>
              <button
                onClick={sendMessage}
                disabled={!input.trim() || sending}
                className="px-3 py-2 rounded bg-green-600 text-white disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        ) : (
          <div className="text-gray-500">Pick a chat or start a new one from the left.</div>
        )}
      </main>
    </div>
  );
}
