"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { io } from "socket.io-client"
import { supabase } from "../../lib/supabaseClient"
import {
  conversationKeyFor,
  decryptFromSender,
  encryptForRecipient,
  getIdentityKeys,
  getOrCreateIdentityKeys,
  encryptFileForUpload,
  decryptFileFromBytes,
} from "../../lib/crypto"
import { StarsBackground } from "@/components/ui/stars-background"
import { ShootingStars } from "@/components/ui/shooting-stars"

export default function ChatPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [keys, setKeys] = useState(null)

  const [recipientUsername, setRecipientUsername] = useState("")
  const [recipientProfile, setRecipientProfile] = useState(null)
  const [convKey, setConvKey] = useState(null)
  // Keep latest conversation key in a ref so socket reconnect handlers always see it
  const convKeyRef = useRef(null)

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [loadingChat, setLoadingChat] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [fileToSend, setFileToSend] = useState(null)

  // Sidebar contacts list
  const [contacts, setContacts] = useState([]) // [{peer_id, username, public_key, last_message_at}]
  const [contactsLoading, setContactsLoading] = useState(true)

  const socketRef = useRef(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Ensure logged in and profile present
  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      const u = data.user ?? null
      if (!mounted) return
      if (!u) {
        router.replace("/login")
        return
      }
      setUser(u)

      const ik = getIdentityKeys() ?? getOrCreateIdentityKeys()
      setKeys(ik)

      const { data: prof } = await supabase
        .from("profiles")
        .select("id, email, username, public_key")
        .eq("id", u.id)
        .maybeSingle()
      if (!prof || !prof.username) {
        router.replace("/username")
        return
      }
      setProfile(prof)

      // Load contacts
      await refreshContacts(u.id)

      // Initialize socket server (warm-up the route) and connect
      await fetch("/api/socket").catch(() => {})
      const s = io({ path: "/api/socket" })
      socketRef.current = s

      s.on("connect", () => {
        // Always (re)join the latest active room on connect
        const k = convKeyRef.current
        if (k) s.emit("join", k)
      })

      s.on("message:new", async (row) => {
        // Ignore messages for other conversations (in case we're joined to multiple rooms)
        if (row.conversation_key && convKeyRef.current && row.conversation_key !== convKeyRef.current) return
        setMessages((prev) => {
          if (prev.some((m) => m.id === row.id)) return prev // dedupe
          return [...prev, decorate(row, u.id, ik)]
        })

        // Update contacts list when new message arrives
        const otherId = row.sender_id === u.id ? row.recipient_id : row.sender_id
        await upsertContact(u.id, otherId, row.created_at)
        await refreshContacts(u.id)
      })

      s.on("file:new", async (row) => {
        if (row.conversation_key && convKeyRef.current && row.conversation_key !== convKeyRef.current) return
        setMessages((prev) => {
          if (prev.some((m) => m.id === row.id)) return prev
          return [...prev, decorateFile(row, u.id, ik)]
        })
        const otherId = row.sender_id === u.id ? row.recipient_id : row.sender_id
        await upsertContact(u.id, otherId, row.created_at)
        await refreshContacts(u.id)
      })
    })()
    return () => {
      mounted = false
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [router])

  // Keep convKeyRef in sync with state
  useEffect(() => {
    convKeyRef.current = convKey
    // If socket is connected and we have a key, (re)join the room
    const s = socketRef.current
    if (s && s.connected && convKey) {
      s.emit("join", convKey)
    }
  }, [convKey])

  function decorate(row, myId, ik) {
    return {
      ...row,
      type: "text",
      plaintext:
        row.recipient_id === myId
          ? decryptFromSender(row.ciphertext_to_recipient, row.nonce_to_recipient, row.sender_public_key, ik.secretKey)
          : decryptFromSender(row.ciphertext_to_sender, row.nonce_to_sender, row.sender_public_key, ik.secretKey),
    }
  }

  function decorateFile(row, myId, _ik) {
    return {
      ...row,
      type: "file",
    }
  }

  async function refreshContacts(ownerId) {
    setContactsLoading(true)
    try {
      const { data: rows } = await supabase
        .from("contacts")
        .select("peer_id, last_message_at")
        .eq("owner_id", ownerId)
        .order("last_message_at", { ascending: false })
      const peerIds = (rows || []).map((r) => r.peer_id)
      if (peerIds.length === 0) {
        setContacts([])
        setContactsLoading(false)
        return
      }
      const { data: profs } = await supabase.from("profiles").select("id, username, public_key").in("id", peerIds)
      const map = new Map(profs.map((p) => [p.id, p]))
      const merged = rows
        .map((r) => ({
          peer_id: r.peer_id,
          last_message_at: r.last_message_at,
          username: map.get(r.peer_id)?.username || "unknown",
          public_key: map.get(r.peer_id)?.public_key || "",
        }))
        .sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at))
      setContacts(merged)
    } finally {
      setContactsLoading(false)
    }
  }

  async function upsertContact(ownerId, peerId, lastAt) {
    await supabase
      .from("contacts")
      .upsert({ owner_id: ownerId, peer_id: peerId, last_message_at: lastAt || new Date().toISOString() })
  }

  async function loadChat() {
    if (!user || !profile || !keys || !recipientUsername.trim()) return
    setError(null)
    setLoadingChat(true)
    try {
      const { data: rec } = await supabase
        .from("profiles")
        .select("id, username, public_key")
        .eq("username", recipientUsername.trim())
        .maybeSingle()
      if (!rec) throw new Error("Recipient not found")
      if (rec.id === user.id) throw new Error("You cannot chat with yourself")
      setRecipientProfile(rec)

      const ck = await conversationKeyFor(user.id, rec.id)
      setConvKey(ck)

      // Join room
      if (socketRef.current) socketRef.current.emit("join", ck)

      // Upsert contact for me
      await upsertContact(user.id, rec.id)
      await refreshContacts(user.id)

      // Load history
      const { data: rows, error: mErr } = await supabase
        .from("messages")
        .select(
          "id, conversation_key, sender_id, recipient_id, sender_public_key, ciphertext_to_recipient, nonce_to_recipient, ciphertext_to_sender, nonce_to_sender, created_at",
        )
        .eq("conversation_key", ck)
        .order("created_at", { ascending: true })
      if (mErr) throw mErr
      const decoratedText = (rows || []).map((r) => decorate(r, user.id, keys))

      const { data: frows, error: fErr } = await supabase
        .from("file_messages")
        .select(
          "id, conversation_key, sender_id, recipient_id, sender_public_key, storage_path, file_name, mime_type, size_bytes, iv_b64, key_to_recipient, key_nonce_to_recipient, key_to_sender, key_nonce_to_sender, created_at",
        )
        .eq("conversation_key", ck)
        .order("created_at", { ascending: true })
      if (fErr) throw fErr
      const decoratedFiles = (frows || []).map((r) => decorateFile(r, user.id, keys))

      const merged = [...decoratedText, ...decoratedFiles].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at),
      )
      setMessages(merged)
    } catch (e) {
      setError(e.message || String(e))
    } finally {
      setLoadingChat(false)
    }
  }

  async function sendMessage() {
    if (!input.trim() || !user || !profile || !recipientProfile || !keys || !convKey) return
    setSending(true)
    try {
      const forRecipient = encryptForRecipient(input, recipientProfile.public_key, keys.secretKey)
      const forSelf = encryptForRecipient(input, profile.public_key, keys.secretKey)
      const insert = {
        conversation_key: convKey,
        sender_id: user.id,
        recipient_id: recipientProfile.id,
        sender_public_key: keys.publicKey,
        ciphertext_to_recipient: forRecipient.ciphertextB64,
        nonce_to_recipient: forRecipient.nonceB64,
        ciphertext_to_sender: forSelf.ciphertextB64,
        nonce_to_sender: forSelf.nonceB64,
      }
      const { data: row, error: insErr } = await supabase.from("messages").insert(insert).select().single()
      if (insErr) throw insErr
      setInput("")

      // Emit realtime update via socket
      if (socketRef.current) socketRef.current.emit("message:send", convKey, row)

      // Optimistic append
      setMessages((prev) => [...prev, decorate(row, user.id, keys)])

      // Update last message time in contacts for me
      await upsertContact(user.id, recipientProfile.id, row.created_at)
      await refreshContacts(user.id)
    } catch (e) {
      setError(e.message || String(e))
    } finally {
      setSending(false)
    }
  }

  async function sendFile() {
    if (!fileToSend || !user || !profile || !recipientProfile || !keys || !convKey) return
    setSending(true)
    try {
      const enc = await encryptFileForUpload(fileToSend)
      // Encrypt symmetric key for recipient and for sender using NaCl box
      const keyToRecipient = encryptForRecipient(enc.keyB64, recipientProfile.public_key, keys.secretKey)
      const keyToSelf = encryptForRecipient(enc.keyB64, profile.public_key, keys.secretKey)

      // Upload encrypted blob to Storage
      const safeName = fileToSend.name.replace(/[^a-zA-Z0-9_.-]/g, "_")
      const rand = crypto.getRandomValues(new Uint32Array(1))[0].toString(36)
      const path = `${convKey}/${Date.now()}_${rand}_${safeName}`
      const { error: upErr } = await supabase.storage.from("files").upload(path, enc.cipherBlob, {
        contentType: "application/octet-stream",
        upsert: false,
      })
      if (upErr) throw upErr

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
      }
      const { data: row, error: insErr } = await supabase.from("file_messages").insert(insert).select().single()
      if (insErr) throw insErr
      setFileToSend(null)

      if (socketRef.current) socketRef.current.emit("file:send", convKey, row)
      setMessages((prev) => [...prev, decorateFile(row, user.id, keys)])
      await upsertContact(user.id, recipientProfile.id, row.created_at)
      await refreshContacts(user.id)
    } catch (e) {
      setError(e.message || String(e))
    } finally {
      setSending(false)
    }
  }

  async function downloadFile(row) {
    try {
      const isRecipient = row.recipient_id === (user && user.id)
      const encKeyB64 = isRecipient ? row.key_to_recipient : row.key_to_sender
      const nonceB64 = isRecipient ? row.key_nonce_to_recipient : row.key_nonce_to_sender
      const symKeyB64 = decryptFromSender(encKeyB64, nonceB64, row.sender_public_key, keys.secretKey)
      if (!symKeyB64) throw new Error("Unable to decrypt file key")
      const { data, error: dErr } = await supabase.storage.from("files").download(row.storage_path)
      if (dErr) throw dErr
      const buf = await data.arrayBuffer()
      const blob = await decryptFileFromBytes(buf, row.iv_b64, symKeyB64, row.mime_type)
      const url = URL.createObjectURL(blob)
      // Trigger download
      const a = document.createElement("a")
      a.href = url
      a.download = row.file_name || "download"
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    } catch (e) {
      setError(e.message || String(e))
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.replace("/")
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black">
      <StarsBackground className="absolute inset-0 z-0" />
      <ShootingStars className="absolute inset-0 z-0" />

      <div className="relative z-10 min-h-screen w-full flex">
        <aside className="w-80 backdrop-blur-xl bg-white/5 border-r border-white/10 flex flex-col">
          {/* Sidebar Header */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-white">Messages</h1>
              <button
                onClick={signOut}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-all duration-200 border border-white/10"
              >
                Sign out
              </button>
            </div>

            {profile && (
              <div className="mb-4 p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="text-xs text-gray-400 mb-1">Logged in as</div>
                <div className="text-sm font-medium text-white">{profile.username}</div>
              </div>
            )}

            {/* New Chat Input */}
            <div className="flex items-center gap-2">
              <input
                className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                placeholder="Start new chat..."
                value={recipientUsername}
                onChange={(e) => setRecipientUsername(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && recipientUsername.trim()) {
                    loadChat()
                  }
                }}
              />
              <button
                onClick={loadChat}
                disabled={!recipientUsername || loadingChat}
                className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-all"
              >
                {loadingChat ? "..." : "Go"}
              </button>
            </div>
          </div>

          {/* Contacts List */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="text-xs uppercase text-gray-400 mb-3 px-2">Recent Chats</div>
            {contactsLoading && <div className="text-sm text-gray-400 px-2">Loading contacts...</div>}
            {!contactsLoading && contacts.length === 0 && (
              <div className="text-sm text-gray-400 px-2">No chats yet. Start a new conversation above.</div>
            )}
            <ul className="flex flex-col gap-1">
              {contacts.map((c) => {
                const active = recipientProfile && c.peer_id === recipientProfile.id
                return (
                  <li key={c.peer_id}>
                    <button
                      onClick={async () => {
                        const rec = { id: c.peer_id, username: c.username, public_key: c.public_key }
                        setRecipientProfile(rec)
                        setRecipientUsername(c.username)
                        const ck = await conversationKeyFor(user.id, c.peer_id)
                        setConvKey(ck)
                        if (socketRef.current) socketRef.current.emit("join", ck)
                        // load history
                        const { data: rows } = await supabase
                          .from("messages")
                          .select(
                            "id, conversation_key, sender_id, recipient_id, sender_public_key, ciphertext_to_recipient, nonce_to_recipient, ciphertext_to_sender, nonce_to_sender, created_at",
                          )
                          .eq("conversation_key", ck)
                          .order("created_at", { ascending: true })
                        const { data: frows } = await supabase
                          .from("file_messages")
                          .select(
                            "id, conversation_key, sender_id, recipient_id, sender_public_key, storage_path, file_name, mime_type, size_bytes, iv_b64, key_to_recipient, key_nonce_to_recipient, key_to_sender, key_nonce_to_sender, created_at",
                          )
                          .eq("conversation_key", ck)
                          .order("created_at", { ascending: true })
                        const decoratedText = (rows || []).map((r) => decorate(r, user.id, keys))
                        const decoratedFiles = (frows || []).map((r) => decorateFile(r, user.id, keys))
                        const merged = [...decoratedText, ...decoratedFiles].sort(
                          (a, b) => new Date(a.created_at) - new Date(b.created_at),
                        )
                        setMessages(merged)
                      }}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${
                        active
                          ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30"
                          : "hover:bg-white/5 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                          {c.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white truncate">{c.username}</div>
                          <div className="text-xs text-gray-400">
                            {new Date(c.last_message_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </aside>

        <main className="flex-1 flex flex-col">
          {recipientProfile && convKey ? (
            <>
              {/* Chat Header */}
              <header className="backdrop-blur-xl bg-white/5 border-b border-white/10 px-8 py-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold text-lg">
                    {recipientProfile.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">{recipientProfile.username}</h2>
                    <p className="text-xs text-gray-400">End-to-end encrypted</p>
                  </div>
                </div>
              </header>

              {/* Error Display */}
              {error && (
                <div className="mx-8 mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto px-8 py-6">
                <div className="flex flex-col gap-4 max-w-4xl mx-auto">
                  {messages.map((m) => {
                    const mine = m.sender_id === (user && user.id)
                    if (m.type === "file") {
                      return (
                        <div key={`f_${m.id}`} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[70%] ${mine ? "items-end" : "items-start"} flex flex-col gap-1`}>
                            <div
                              className={`px-4 py-3 rounded-2xl backdrop-blur-xl ${
                                mine
                                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-br-sm"
                                  : "bg-white/10 border border-white/20 text-white rounded-bl-sm"
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                  />
                                </svg>
                                <div className="text-sm font-medium">{m.file_name}</div>
                              </div>
                              <div className="text-xs opacity-80 mb-3">
                                Encrypted • {(m.size_bytes / 1024).toFixed(1)} KB
                              </div>
                              <button
                                onClick={() => downloadFile(m)}
                                className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                  mine
                                    ? "bg-white/20 hover:bg-white/30 text-white"
                                    : "bg-purple-500 hover:bg-purple-600 text-white"
                                }`}
                              >
                                Download & Decrypt
                              </button>
                            </div>
                            <div className={`text-[10px] text-gray-400 px-2 ${mine ? "text-right" : "text-left"}`}>
                              {new Date(m.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                        </div>
                      )
                    }
                    return (
                      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[70%] ${mine ? "items-end" : "items-start"} flex flex-col gap-1`}>
                          <div
                            className={`px-4 py-3 rounded-2xl backdrop-blur-xl ${
                              mine
                                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-br-sm"
                                : "bg-white/10 border border-white/20 text-white rounded-bl-sm"
                            }`}
                          >
                            <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                              {m.plaintext ?? "[unable to decrypt]"}
                            </div>
                          </div>
                          <div className={`text-[10px] text-gray-400 px-2 ${mine ? "text-right" : "text-left"}`}>
                            {new Date(m.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Input Area */}
              <div className="backdrop-blur-xl bg-white/5 border-t border-white/10 px-8 py-4">
                <div className="max-w-4xl mx-auto">
                  <div className="flex items-end gap-3">
                    {/* File Upload */}
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        onChange={(e) => setFileToSend(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      <div className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition-all">
                        <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                          />
                        </svg>
                      </div>
                    </label>

                    {/* Message Input */}
                    <div className="flex-1 relative">
                      <textarea
                        className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all resize-none"
                        placeholder="Type a message..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            sendMessage()
                          }
                        }}
                        rows={1}
                        style={{
                          minHeight: "44px",
                          maxHeight: "120px",
                        }}
                      />
                      {fileToSend && (
                        <div className="absolute -top-12 left-0 right-0 bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg px-3 py-2 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-white">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                              />
                            </svg>
                            <span className="truncate">{fileToSend.name}</span>
                          </div>
                          <button onClick={() => setFileToSend(null)} className="text-gray-400 hover:text-white">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Send Buttons */}
                    {fileToSend ? (
                      <button
                        onClick={sendFile}
                        disabled={sending}
                        className="px-6 py-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-all"
                      >
                        {sending ? "Sending..." : "Send File"}
                      </button>
                    ) : (
                      <button
                        onClick={sendMessage}
                        disabled={!input.trim() || sending}
                        className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-all flex items-center justify-center"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md px-6">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-white/10 flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No conversation selected</h3>
                <p className="text-gray-400 text-sm">
                  Choose a chat from the sidebar or start a new conversation to begin messaging
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
