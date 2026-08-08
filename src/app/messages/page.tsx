'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatRelativeTime, formatDate } from '@/lib/utils'
import { Send, ArrowLeft, Flag } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { Suspense } from 'react'

interface Message {
  id: string
  content: string
  sender_id: string
  created_at: string
  sender?: { full_name: string | null }
}

interface Conversation {
  id: string
  listing_id: string | null
  shop_id: string
  buyer_id: string
  last_message: string | null
  last_message_at: string | null
  buyer_unread: number
  seller_unread: number
  shop?: { name: string; slug: string }
  listing?: { title: string }
  buyer?: { full_name: string | null; created_at?: string; id?: string }
}

function MessagesContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState<User | null>(null)
  const [shopId, setShopId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConv, setActiveConv] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMsg, setNewMsg] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login?redirectTo=/messages'); return }
      setUser(data.user)

      // Get shop if seller
      const { data: shop } = await supabase
        .from('shops')
        .select('id')
        .eq('owner_id', data.user.id)
        .maybeSingle()
      if (shop) setShopId(shop.id)

      loadConversations(data.user.id, shop?.id)
    })
  }, [])

  async function loadConversations(uid: string, sid?: string) {
    let q = supabase
      .from('conversations')
      .select('*, shop:shops(name, slug), listing:listings(title), buyer:profiles(id, full_name, created_at)')
      .order('last_message_at', { ascending: false })

    if (sid) {
      q = q.or(`buyer_id.eq.${uid},shop_id.eq.${sid}`)
    } else {
      q = q.eq('buyer_id', uid)
    }

    const { data } = await q
    setConversations(data ?? [])

    // Auto-open from URL params
    const paramShopId = searchParams.get('shop')
    const paramListingId = searchParams.get('listing')
    if (paramShopId && paramListingId && data) {
      const existing = data.find(c => c.shop_id === paramShopId && c.listing_id === paramListingId)
      if (existing) {
        setActiveConv(existing)
      } else if (uid) {
        // Create new conversation
        const { data: newConv } = await supabase
          .from('conversations')
          .insert({ shop_id: paramShopId, listing_id: paramListingId, buyer_id: uid })
          .select('*, shop:shops(name, slug), listing:listings(title), buyer:profiles(id, full_name, created_at)')
          .single()
        if (newConv) {
          setConversations(prev => [newConv, ...prev])
          setActiveConv(newConv)
        }
      }
    }
  }

  useEffect(() => {
    if (!activeConv) return
    loadMessages(activeConv.id)

    // Subscribe to realtime
    const channel = supabase
      .channel(`messages:${activeConv.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${activeConv.id}`,
      }, payload => {
        setMessages(prev => [...prev, payload.new as Message])
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [activeConv?.id])

  async function loadMessages(convId: string) {
    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles(full_name)')
      .eq('conversation_id', convId)
      .order('created_at')
    setMessages(data ?? [])
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!newMsg.trim() || !activeConv || !user) return
    setSending(true)

    await supabase.from('messages').insert({
      conversation_id: activeConv.id,
      sender_id: user.id,
      content: newMsg.trim(),
    })

    await supabase.from('conversations').update({
      last_message: newMsg.trim(),
      last_message_at: new Date().toISOString(),
    }).eq('id', activeConv.id)

    setNewMsg('')
    setSending(false)
  }

  const isSeller = (conv: Conversation) => shopId === conv.shop_id

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 h-[calc(100vh-80px)] flex flex-col">
      <h1 className="text-xl font-black mb-4">💬 Съобщения</h1>

      <div className="flex-1 flex gap-4 overflow-hidden rounded-2xl border"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>

        {/* Conversations List */}
        <div
          className={`${activeConv ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-72 flex-shrink-0 border-r overflow-y-auto`}
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="p-4 border-b font-semibold text-sm" style={{ borderColor: 'var(--border)' }}>
            Разговори ({conversations.length})
          </div>

          {conversations.length === 0 && (
            <div className="p-8 text-center" style={{ color: 'var(--muted)' }}>
              <p className="text-3xl mb-2">💬</p>
              <p className="text-sm">Нямаш съобщения</p>
            </div>
          )}

          {conversations.map(conv => {
            const isActive = activeConv?.id === conv.id
            const unread = isSeller(conv) ? conv.seller_unread : conv.buyer_unread
            const otherName = isSeller(conv) ? conv.buyer?.full_name : conv.shop?.name

            return (
              <button
                key={conv.id}
                onClick={() => setActiveConv(conv)}
                className="flex items-start gap-3 p-4 text-left border-b transition-colors w-full"
                style={{
                  borderColor: 'var(--border)',
                  background: isActive ? 'rgba(249,115,22,0.05)' : 'transparent',
                  borderLeftColor: isActive ? 'var(--accent)' : 'transparent',
                  borderLeftWidth: '3px',
                }}
              >
                <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-base"
                  style={{ background: 'var(--bg3)' }}>
                  {isSeller(conv) ? '👤' : '🏪'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold truncate">{otherName ?? 'Неизвестен'}</p>
                    {unread > 0 && (
                      <span className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0"
                        style={{ background: 'var(--accent)', color: '#fff' }}>
                        {unread}
                      </span>
                    )}
                  </div>
                  {conv.listing?.title && (
                    <p className="text-xs truncate" style={{ color: 'var(--accent)' }}>
                      Re: {conv.listing.title}
                    </p>
                  )}
                  {conv.last_message && (
                    <p className="text-xs truncate mt-0.5" style={{ color: 'var(--muted)' }}>
                      {conv.last_message}
                    </p>
                  )}
                  {conv.last_message_at && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                      {formatRelativeTime(conv.last_message_at)}
                    </p>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Chat Window */}
        {activeConv ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <button className="md:hidden p-1.5 rounded-lg" style={{ background: 'var(--bg3)' }}
                onClick={() => setActiveConv(null)}>
                <ArrowLeft size={16} />
              </button>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, var(--accent), #f59e0b)' }}>
                {isSeller(activeConv) ? '👤' : '🏪'}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm truncate">
                  {isSeller(activeConv) ? (activeConv.buyer?.full_name ?? 'Купувач') : activeConv.shop?.name}
                </p>
                {isSeller(activeConv) && activeConv.buyer?.created_at ? (
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>
                    Член от {formatDate(activeConv.buyer.created_at)}
                  </p>
                ) : activeConv.listing?.title && (
                  <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>
                    Re: {activeConv.listing.title}
                  </p>
                )}
              </div>
              <div className="ml-auto flex items-center gap-3 flex-shrink-0">
                <a
                  href={`mailto:wellecfx@gmail.com?subject=${encodeURIComponent(
                    isSeller(activeConv)
                      ? `Сигнал за купувач: ${activeConv.buyer?.full_name ?? activeConv.buyer_id}`
                      : `Сигнал за магазин: ${activeConv.shop?.name ?? ''}`
                  )}&body=${encodeURIComponent(`Разговор ID: ${activeConv.id}\n\nОпиши проблема тук:\n`)}`}
                  className="p-1.5 rounded-lg transition-colors hover:opacity-80"
                  style={{ background: 'var(--bg3)', color: 'var(--muted)' }}
                  title="Докладвай"
                >
                  <Flag size={14} />
                </a>
                <div className="hidden sm:flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: 'var(--green)' }} />
                  <span className="text-xs" style={{ color: 'var(--green)' }}>Онлайн</span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(msg => {
                const isMe = msg.sender_id === user?.id
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                      <div
                        className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                        style={{
                          background: isMe ? 'var(--accent)' : 'var(--bg3)',
                          color: isMe ? '#fff' : 'var(--text)',
                          borderBottomRightRadius: isMe ? '4px' : '16px',
                          borderBottomLeftRadius: isMe ? '16px' : '4px',
                        }}
                      >
                        {msg.content}
                      </div>
                      <span className="text-xs px-1" style={{ color: 'var(--muted)' }}>
                        {formatRelativeTime(msg.created_at)}
                      </span>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={sendMessage}
              className="flex gap-3 p-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <input
                value={newMsg}
                onChange={e => setNewMsg(e.target.value)}
                placeholder="Напиши съобщение..."
                className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none"
                style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
              <button
                type="submit"
                disabled={sending || !newMsg.trim()}
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-opacity"
                style={{ background: 'var(--accent)', border: 'none', opacity: sending ? 0.6 : 1 }}
              >
                <Send size={18} color="#fff" />
              </button>
            </form>
          </div>
        ) : (
          <div className="flex-1 hidden md:flex items-center justify-center"
            style={{ color: 'var(--muted)' }}>
            <div className="text-center">
              <p className="text-5xl mb-3">💬</p>
              <p className="font-semibold">Избери разговор</p>
              <p className="text-sm mt-1">или изпрати съобщение от обява</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function MessagesPage() {
  return <Suspense><MessagesContent /></Suspense>
}
