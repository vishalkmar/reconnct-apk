import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Image,
  Platform, ActivityIndicator, Linking, Alert, Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, font } from '../theme';
import { api, resolveImage } from '../api/client';
import { useAuth } from '../store/AuthContext';
import { useNav } from '../navigation/NavContext';
import { ICONS } from '../icons';
import { pickAsset } from '../utils/imagePicker';
import { connectSupport, disconnectSupport } from '../services/supportSocket';

// Shown once, on a brand-new conversation, to nudge a first message — taps
// send that exact text and the whole row disappears for the rest of this
// chat (never shown again once there's at least one message from this side).
const QUICK_REPLIES = ["What's the price?", 'Tell me more', 'How do I book?'];

const fmtTime = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
const dayKey = (d) => new Date(d).toDateString();
const dayLabel = (d) => {
  const date = new Date(d); const now = new Date();
  if (dayKey(date) === dayKey(now)) return 'Today';
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (dayKey(date) === dayKey(y)) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

/**
 * Support chat — `queue` is 'user' (opened from Profile) or 'supplier' (from
 * Host Profile). Real-time via the /support socket; REST loads history + is the
 * fallback. The party's own messages are 'user'/'supplier'; admin replies come
 * in on the left.
 */
export default function SupportScreen({ queue = 'user', embedded = false }) {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const { pop, navigateTab } = useNav();
  // Embedded (a real bottom-nav tab, e.g. host Inbox) has nowhere to "pop"
  // back to — land on a sensible default tab instead.
  const goBack = () => (embedded ? navigateTab(queue === 'supplier' ? 'dashboard' : 'home') : pop());
  const [conv, setConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState([]); // uploaded, not yet sent
  const [uploading, setUploading] = useState(false);
  const [typingPeer, setTypingPeer] = useState(false);
  const [kbHeight, setKbHeight] = useState(0);
  const [quickRepliesGone, setQuickRepliesGone] = useState(false);

  const socketRef = useRef(null);
  const convIdRef = useRef(null);
  const listRef = useRef(null);
  const typingSentRef = useRef(false);
  const typingTimerRef = useRef(null);

  const scrollEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  // Load history, then open the socket + join the room.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await api.supportConversation(token, queue);
        if (!alive) return;
        setConv(data.conversation);
        convIdRef.current = data.conversation.id;
        setMessages(data.messages || []);
      } catch (e) {
        Alert.alert('Support', e.message || 'Could not open support chat.');
      } finally {
        if (alive) setLoading(false);
      }

      const s = connectSupport(token, queue);
      socketRef.current = s;
      if (!s) return;

      // On reconnect, re-join the room AND refetch to fill any gap missed while
      // offline (keep local pending/failed bubbles).
      const refetch = async () => {
        try {
          const d = await api.supportConversation(token, queue);
          setMessages((prev) => {
            const keep = prev.filter((m) => m._pending || m._failed);
            const server = d.messages || [];
            const ids = new Set(server.map((m) => m.id));
            return [...server, ...keep.filter((m) => !ids.has(m.id))];
          });
        } catch { /* ignore */ }
      };
      let hadConnected = false;
      const onConnect = () => {
        if (convIdRef.current) s.emit('support:join', { conversationId: convIdRef.current });
        if (hadConnected) refetch();
        hadConnected = true;
      };
      s.on('connect', onConnect);
      if (s.connected) onConnect();

      s.on('support:message', (m) => {
        if (m.conversationId !== convIdRef.current) return;
        setMessages((prev) => {
          if (m.tempId && prev.some((x) => x.id === m.tempId)) return prev.map((x) => (x.id === m.tempId ? m : x));
          if (prev.some((x) => x.id === m.id)) return prev;
          return [...prev, m];
        });
        if (m.senderRole === 'admin') s.emit('support:read', { conversationId: m.conversationId });
      });
      s.on('support:read', ({ conversationId, by }) => {
        if (conversationId === convIdRef.current && by === 'admin') {
          setMessages((prev) => prev.map((x) => (x.senderRole !== 'admin' ? { ...x, readByAdmin: true } : x)));
        }
      });
      s.on('support:typing', ({ conversationId, role, typing }) => {
        if (conversationId === convIdRef.current && role === 'admin') setTypingPeer(!!typing);
      });
    })();

    return () => { alive = false; disconnectSupport(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue]);

  useEffect(() => { if (messages.length) scrollEnd(); }, [messages.length, typingPeer, scrollEnd]);

  // Track the keyboard height so the composer lifts cleanly above it (reliable
  // on ROMs where the window doesn't auto-resize, e.g. MIUI).
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => { setKbHeight(e.endCoordinates?.height || 0); scrollEnd(); });
    const hide = Keyboard.addListener('keyboardDidHide', () => setKbHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, [scrollEnd]);

  const emitTyping = (typing) => {
    const s = socketRef.current;
    if (s && convIdRef.current) s.emit('support:typing', { conversationId: convIdRef.current, typing });
  };
  const onInput = (v) => {
    setText(v);
    if (!typingSentRef.current) { typingSentRef.current = true; emitTyping(true); }
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => { typingSentRef.current = false; emitTyping(false); }, 1200);
  };

  const send = (overrideBody) => {
    const body = (overrideBody ?? text).trim();
    const attachments = pending;
    if (!body && attachments.length === 0) return;
    setQuickRepliesGone(true);
    const s = socketRef.current;
    const tempId = `tmp-${Date.now()}`;
    const optimistic = {
      id: tempId, tempId, conversationId: convIdRef.current, senderRole: queue,
      body, attachments, readByAdmin: false, readByParty: true,
      createdAt: new Date().toISOString(), _pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setText(''); setPending([]);
    clearTimeout(typingTimerRef.current); typingSentRef.current = false; emitTyping(false);

    const settle = (real) => setMessages((prev) => prev.map((m) => (m.id === tempId ? real : m)));
    const failMark = () => setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, _pending: false, _failed: true } : m)));

    if (s && s.connected) {
      s.emit('support:message', { queue, conversationId: convIdRef.current, body, attachments, tempId }, (res) => {
        if (res?.error) failMark();
        else if (res?.message) settle(res.message);
      });
    } else {
      api.supportSend(token, { queue, body, attachments })
        .then((data) => settle(data.message))
        .catch(() => failMark());
    }
  };

  const attach = async () => {
    try {
      const asset = await pickAsset('photo');
      if (!asset) return;
      setUploading(true);
      const att = await api.supportUpload(token, asset);
      if (att?.url) setPending((prev) => [...prev, att]);
    } catch (e) {
      Alert.alert('Upload', e.message || 'Could not upload the photo.');
    } finally {
      setUploading(false);
    }
  };

  const renderItem = ({ item, index }) => {
    const prev = messages[index - 1];
    const showDay = !prev || dayLabel(prev.createdAt) !== dayLabel(item.createdAt);
    const mine = item.senderRole !== 'admin';
    return (
      <View>
        {showDay && (
          <View style={styles.dayWrap}><Text style={styles.dayText}>{dayLabel(item.createdAt)}</Text></View>
        )}
        <View style={[styles.row, mine ? styles.rowMine : styles.rowTheir]}>
          <View style={styles.bubbleCol}>
            <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheir, item._failed && styles.bubbleFailed]}>
              {(item.attachments || []).map((a, i) => <Attachment key={i} att={a} />)}
              {!!item.body && <Text style={[styles.msgText, mine && styles.msgTextMine]}>{item.body}</Text>}
            </View>
            {/* Time + read ticks sit BELOW the bubble, outside it. */}
            <View style={[styles.metaRow, mine ? styles.metaRowMine : styles.metaRowTheir]}>
              <Text style={styles.metaTime}>{fmtTime(item.createdAt)}</Text>
              {mine && !item._failed && (
                item._pending
                  ? <Text style={styles.tick}>·</Text>
                  : <Text style={[styles.tick, item.readByAdmin && styles.tickRead]}>{item.readByAdmin ? '✓✓' : '✓'}</Text>
              )}
              {item._failed && <Text style={styles.failText}>failed</Text>}
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Composer clearance: above the keyboard (+ a small buffer) when open, else
  // above the floating bottom nav (when this screen is a tab).
  const bottomPad = kbHeight > 0 ? kbHeight + 14 : (embedded ? insets.bottom + 90 : insets.bottom);

  const brandHeader = (
    <View style={styles.brandBlock}>
      <View style={styles.headerAvatar}><Image source={ICONS.globe} style={styles.headerAvatarIcon} /></View>
      <Text style={styles.headerTitle}>reconnct Support</Text>
      <Text style={styles.headerSub}>{typingPeer ? 'typing…' : (queue === 'supplier' ? 'Host support team' : 'Chat with our team')}</Text>
      <View style={styles.headerBadge}>
        <Text style={styles.headerBadgeText}>Official reconnct support channel</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      {/* Fixed widget-style top bar — stays put while the brand block below
          scrolls away with the rest of the conversation. */}
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <View style={styles.topBarAvatar}><Image source={ICONS.globe} style={styles.topBarAvatarIcon} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.topBarTitle}>Help &amp; Support</Text>
          <View style={styles.topBarStatusRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.topBarSub}>Usually replies in minutes</Text>
          </View>
        </View>
        <TouchableOpacity onPress={goBack} style={styles.topBarClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.topBarCloseIcon}>✕</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brand} /></View>
      ) : (
        <View style={{ flex: 1, paddingBottom: bottomPad }}>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => String(m.id)}
            renderItem={renderItem}
            contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 4 }}
            onContentSizeChange={scrollEnd}
            ListHeaderComponent={brandHeader}
            ListEmptyComponent={<Text style={styles.empty}>Send a message — our support team will reply here.</Text>}
          />
          {typingPeer && <Text style={styles.typing}>Support is typing…</Text>}

          {!quickRepliesGone && messages.length === 0 && !loading && (
            <View style={styles.quickRow}>
              {QUICK_REPLIES.map((label) => (
                <TouchableOpacity key={label} style={styles.quickChip} activeOpacity={0.8} onPress={() => send(label)}>
                  <Text style={styles.quickChipText}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {pending.length > 0 && (
            <View style={styles.pendingRow}>
              {pending.map((a, i) => (
                <View key={i} style={styles.pendThumbWrap}>
                  <Image source={{ uri: resolveImage(a.url) }} style={styles.pendThumb} />
                  <TouchableOpacity style={styles.pendX} onPress={() => setPending((p) => p.filter((_, idx) => idx !== i))}>
                    <Text style={styles.pendXText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <View style={styles.composer}>
            <TouchableOpacity style={styles.attachBtn} onPress={attach} disabled={uploading}>
              {uploading ? <ActivityIndicator size="small" color={colors.inkMuted} /> : <Image source={ICONS.upload} style={styles.attachIcon} />}
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={onInput}
              placeholder="Type a message…"
              placeholderTextColor={colors.inkFaint}
              multiline
            />
            <TouchableOpacity style={[styles.sendBtn, !text.trim() && pending.length === 0 && styles.sendOff]} onPress={() => send()} disabled={!text.trim() && pending.length === 0}>
              <Image source={ICONS.send} style={styles.sendIcon} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

function Attachment({ att }) {
  const url = resolveImage(att.url);
  if (att.type === 'image') {
    return (
      <TouchableOpacity onPress={() => Linking.openURL(url)} activeOpacity={0.9}>
        <Image source={{ uri: url }} style={styles.attImg} resizeMode="cover" />
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity style={styles.pdfChip} onPress={() => Linking.openURL(url)} activeOpacity={0.85}>
      <Text style={styles.pdfIcon}>📄</Text>
      <Text style={styles.pdfName} numberOfLines={1}>{att.name || 'Document.pdf'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F7F5' },

  // Fixed widget bar — always visible, never scrolls.
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingBottom: 10, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  topBarAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  topBarAvatarIcon: { width: 17, height: 17, tintColor: '#fff' },
  topBarTitle: { fontSize: font.body, fontWeight: '800', color: colors.ink },
  topBarStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#16A34A' },
  topBarSub: { fontSize: font.tiny, color: '#16A34A', fontWeight: '600' },
  topBarClose: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.chipBg, alignItems: 'center', justifyContent: 'center' },
  topBarCloseIcon: { fontSize: 13, fontWeight: '800', color: colors.ink },

  // Brand block — first row of the scrollable message list, so it scrolls
  // away with the conversation instead of staying pinned.
  brandBlock: { alignItems: 'center', paddingTop: 20, paddingBottom: 14 },
  headerAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  headerAvatarIcon: { width: 24, height: 24, tintColor: '#fff' },
  headerTitle: { fontSize: font.h3, fontWeight: '900', color: colors.ink },
  headerSub: { fontSize: font.small, color: colors.inkMuted, marginTop: 2 },
  headerBadge: { backgroundColor: colors.chipBg, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, marginTop: 10 },
  headerBadgeText: { fontSize: 11, fontWeight: '700', color: colors.inkMuted },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { textAlign: 'center', color: colors.inkMuted, marginTop: 40, paddingHorizontal: 30, fontSize: font.small },
  dayWrap: { alignItems: 'center', marginVertical: 10 },
  dayText: { fontSize: font.tiny, color: '#7A7E8C', backgroundColor: 'rgba(0,0,0,0.05)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, overflow: 'hidden' },
  row: { flexDirection: 'row', marginBottom: 6 },
  rowMine: { justifyContent: 'flex-end' },
  rowTheir: { justifyContent: 'flex-start' },
  bubbleCol: { maxWidth: '80%' },
  // Sent (mine) bubbles get their "tail" on the bottom-right corner; received
  // (theirs) mirror it on the bottom-left — matches the reference exactly.
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, ...(Platform.OS === 'android' ? { elevation: 1 } : {}) },
  bubbleMine: { backgroundColor: colors.brand, borderBottomRightRadius: 5 },
  bubbleTheir: { backgroundColor: '#FFFFFF', borderBottomLeftRadius: 5 },
  bubbleFailed: { opacity: 0.7 },
  msgText: { color: '#1C1712', fontSize: 14, lineHeight: 21 },
  msgTextMine: { color: '#fff' },
  // Outside the bubble, on the page background — same muted tone regardless
  // of sender.
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3, paddingHorizontal: 2 },
  metaRowMine: { justifyContent: 'flex-end' },
  metaRowTheir: { justifyContent: 'flex-start' },
  metaTime: { fontSize: 10, color: '#8B8F9C' },
  tick: { fontSize: 11, color: '#8B8F9C', fontWeight: '700' },
  tickRead: { color: '#34B7F1' },
  failText: { fontSize: 10, color: '#D4183D', fontWeight: '700' },

  attImg: { width: 200, height: 150, borderRadius: 10, marginBottom: 4, backgroundColor: '#DCE0E6' },
  pdfChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 8, padding: 8, marginBottom: 4 },
  pdfIcon: { fontSize: 18 },
  pdfName: { fontSize: font.small, color: '#1A1A2E', flexShrink: 1 },

  typing: { fontSize: font.tiny, color: '#5A5E6C', paddingHorizontal: 16, paddingBottom: 4 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12, paddingBottom: 8 },
  quickChip: { borderWidth: 1, borderColor: '#D1A76B', backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  quickChipText: { color: colors.brandText, fontWeight: '700', fontSize: font.small },
  pendingRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#F1EDE6' },
  pendThumbWrap: { position: 'relative' },
  pendThumb: { width: 54, height: 54, borderRadius: 8, backgroundColor: '#DCE0E6' },
  pendX: { position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: '#1A1A2E', alignItems: 'center', justifyContent: 'center' },
  pendXText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  composer: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingTop: 8, paddingBottom: 10, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: 'rgba(136,136,153,0.3)' },
  attachBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  attachIcon: { width: 22, height: 22, tintColor: '#888899' },
  input: { flex: 1, maxHeight: 110, backgroundColor: 'rgba(136,136,153,0.1)', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: colors.ink },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  sendOff: { opacity: 0.4 },
  sendIcon: { width: 19, height: 19, tintColor: '#fff' },
});
