import { act, renderHook } from '@testing-library/react'
import { useConversationStore } from '@/stores/conversationStore'
import type { Conversation, Message } from '@/types'

const makeConversation = (id: string): Conversation => ({
  id,
  userId: 'user-1',
  title: `Conv ${id}`,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  lastMessageAt: null,
  messageCount: 0,
})

const makeMessage = (id: string): Message => ({
  id,
  conversationId: 'conv-1',
  role: 'user',
  content: `Message ${id}`,
  createdAt: '2024-01-01T00:00:00Z',
  hasAudio: false,
})

beforeEach(() => {
  useConversationStore.setState({
    currentConversationId: null,
    conversations: [],
    messages: [],
    isLoadingConversations: false,
    isLoadingMessages: false,
    isSendingMessage: false,
    streamingContent: '',
    isStreaming: false,
    _hasHydrated: false,
  })
})

describe('useConversationStore', () => {
  it('has correct initial state', () => {
    const { result } = renderHook(() => useConversationStore())
    expect(result.current.conversations).toEqual([])
    expect(result.current.messages).toEqual([])
    expect(result.current.streamingContent).toBe('')
    expect(result.current.isStreaming).toBe(false)
  })

  it('setCurrentConversation updates currentConversationId', () => {
    const { result } = renderHook(() => useConversationStore())
    act(() => { result.current.setCurrentConversation('conv-1') })
    expect(result.current.currentConversationId).toBe('conv-1')
  })

  it('setConversations replaces conversations list', () => {
    const { result } = renderHook(() => useConversationStore())
    const convs = [makeConversation('1'), makeConversation('2')]
    act(() => { result.current.setConversations(convs) })
    expect(result.current.conversations).toHaveLength(2)
  })

  it('addConversation prepends to list', () => {
    const { result } = renderHook(() => useConversationStore())
    act(() => { result.current.setConversations([makeConversation('1')]) })
    act(() => { result.current.addConversation(makeConversation('2')) })
    expect(result.current.conversations[0].id).toBe('2')
    expect(result.current.conversations).toHaveLength(2)
  })

  it('removeConversation removes by id', () => {
    const { result } = renderHook(() => useConversationStore())
    act(() => {
      result.current.setConversations([makeConversation('1'), makeConversation('2')])
    })
    act(() => { result.current.removeConversation('1') })
    expect(result.current.conversations).toHaveLength(1)
    expect(result.current.conversations[0].id).toBe('2')
  })

  it('addMessage appends to messages list', () => {
    const { result } = renderHook(() => useConversationStore())
    act(() => { result.current.addMessage(makeMessage('m1')) })
    act(() => { result.current.addMessage(makeMessage('m2')) })
    expect(result.current.messages).toHaveLength(2)
    expect(result.current.messages[1].id).toBe('m2')
  })

  it('updateStreamingContent accumulates content', () => {
    const { result } = renderHook(() => useConversationStore())
    act(() => { result.current.updateStreamingContent('hello ') })
    act(() => { result.current.updateStreamingContent('world') })
    expect(result.current.streamingContent).toBe('hello world')
  })

  it('clearStreamingContent resets to empty string', () => {
    const { result } = renderHook(() => useConversationStore())
    act(() => { result.current.updateStreamingContent('some content') })
    act(() => { result.current.clearStreamingContent() })
    expect(result.current.streamingContent).toBe('')
  })

  it('setIsStreaming toggles streaming flag', () => {
    const { result } = renderHook(() => useConversationStore())
    act(() => { result.current.setIsStreaming(true) })
    expect(result.current.isStreaming).toBe(true)
    act(() => { result.current.setIsStreaming(false) })
    expect(result.current.isStreaming).toBe(false)
  })

  it('setIsSendingMessage updates flag', () => {
    const { result } = renderHook(() => useConversationStore())
    act(() => { result.current.setIsSendingMessage(true) })
    expect(result.current.isSendingMessage).toBe(true)
  })
})
