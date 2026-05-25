import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Send } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { ChatMessage, useCourtChat } from '../../src/features/court/useCourtChat';
import { formatRelativeTime } from '../../src/lib/format/time';
import { colors, fonts, radius, spacing, typography } from '../../src/theme/tokens';

const MAX_CHARS = 500;
const CHAR_WARN_THRESHOLD = 60;

export default function CourtChatScreen() {
  const router = useRouter();
  const { dareId } = useLocalSearchParams<{ dareId?: string }>();
  const chat = useCourtChat(dareId);
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList>(null);
  const charsLeft = MAX_CHARS - draft.length;
  const canSend = draft.trim().length > 0 && charsLeft >= 0 && !chat.sending;

  useEffect(() => {
    if (chat.messages.length > 0) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, [chat.messages.length]);

  async function handleSend() {
    if (!canSend) return;
    const text = draft.trim();
    setDraft('');
    await chat.send(text);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ChevronLeft color={colors.textMuted} size={22} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>Court chat</Text>
            <Text style={styles.title}>Match messages.</Text>
          </View>
        </View>

        {chat.source === 'mock' || chat.error || chat.sendError ? (
          <View style={styles.alerts}>
            {chat.source === 'mock' ? (
              <InlineAlert
                tone="info"
                title="Sign in to chat"
                message="Court chat is available to match participants after sign-in."
              />
            ) : null}
            {chat.error ? (
              <InlineAlert tone="danger" title="Chat unavailable" message={chat.error} />
            ) : null}
            {chat.sendError ? (
              <InlineAlert tone="danger" title="Message failed" message={chat.sendError} />
            ) : null}
          </View>
        ) : null}

        <FlatList
          ref={listRef}
          contentContainerStyle={styles.messageList}
          data={chat.messages}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            !chat.loading && chat.source === 'server' ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No messages yet.</Text>
              </View>
            ) : null
          }
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => <MessageBubble message={item} />}
          style={styles.flex}
        />

        {chat.source === 'server' ? (
          <View style={styles.inputBar}>
            <TextInput
              maxLength={MAX_CHARS}
              onChangeText={setDraft}
              onSubmitEditing={() => { void handleSend(); }}
              placeholder="Message..."
              placeholderTextColor={colors.textGhost}
              returnKeyType="send"
              style={styles.textInput}
              value={draft}
            />
            {charsLeft < CHAR_WARN_THRESHOLD ? (
              <Text style={[styles.charCount, charsLeft < 0 && styles.charCountOver]}>
                {charsLeft}
              </Text>
            ) : null}
            <Pressable
              accessibilityLabel="Send message"
              accessibilityRole="button"
              disabled={!canSend}
              onPress={() => { void handleSend(); }}
              style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
            >
              <Send color={canSend ? colors.primary : colors.textGhost} size={18} />
            </Pressable>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  return (
    <View style={[styles.bubble, message.isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
      {!message.isOwn && message.usernameSnapshot ? (
        <Text style={styles.bubbleUsername}>{message.usernameSnapshot}</Text>
      ) : null}
      <Text style={[styles.bubbleText, message.isOwn ? styles.bubbleTextOwn : styles.bubbleTextOther]}>
        {message.message}
      </Text>
      <Text style={styles.bubbleTime}>{formatRelativeTime(message.createdAt)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    alignItems: 'flex-start',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing[12],
    padding: spacing[20],
  },
  backButton: {
    alignItems: 'center',
    borderColor: colors.borderStrong,
    borderRadius: radius.control,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerCopy: {
    flex: 1,
    gap: spacing[6],
    minWidth: 0,
  },
  eyebrow: {
    color: colors.primary,
    fontFamily: fonts.mono,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '900',
    lineHeight: typography.sectionTitle.lineHeight,
  },
  alerts: {
    gap: spacing[8],
    padding: spacing[16],
    paddingBottom: spacing[8],
  },
  messageList: {
    flexGrow: 1,
    gap: spacing[8],
    padding: spacing[16],
  },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingTop: spacing[32],
  },
  emptyText: {
    color: colors.textGhost,
    fontFamily: fonts.bodyRegular,
    fontSize: typography.body.fontSize,
  },
  inputBar: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing[8],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
  },
  textInput: {
    color: colors.textSoft,
    flex: 1,
    fontFamily: fonts.bodyRegular,
    fontSize: typography.body.fontSize,
    minHeight: 40,
  },
  charCount: {
    color: colors.warning,
    fontFamily: fonts.mono,
    fontSize: 11,
  },
  charCountOver: {
    color: colors.danger,
  },
  sendButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  bubble: {
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[4],
    maxWidth: '75%',
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
  },
  bubbleOwn: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primaryDim,
    borderColor: colors.primary,
  },
  bubbleOther: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
  },
  bubbleUsername: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  bubbleText: {
    fontFamily: fonts.bodyRegular,
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleTextOwn: {
    color: colors.text,
  },
  bubbleTextOther: {
    color: colors.textSoft,
  },
  bubbleTime: {
    color: colors.textGhost,
    fontFamily: fonts.mono,
    fontSize: 10,
  },
});
