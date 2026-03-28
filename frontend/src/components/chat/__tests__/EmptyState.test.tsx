import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { EmptyState } from '../EmptyState'

describe('EmptyState', () => {
  it('renders heading and subtitle', () => {
    render(<EmptyState />)
    expect(screen.getByText('开始对话')).toBeInTheDocument()
    expect(screen.getByText('点击麦克风开始语音对话，或输入文字')).toBeInTheDocument()
  })

  it('does not render action buttons when no callbacks provided', () => {
    render(<EmptyState />)
    expect(screen.queryByText('语音对话')).not.toBeInTheDocument()
    expect(screen.queryByText('视频理解')).not.toBeInTheDocument()
  })

  it('renders mic button and calls onMicClick', () => {
    const onMicClick = jest.fn()
    render(<EmptyState onMicClick={onMicClick} />)
    fireEvent.click(screen.getByText('语音对话'))
    expect(onMicClick).toHaveBeenCalledTimes(1)
  })

  it('renders video button and calls onVideoClick', () => {
    const onVideoClick = jest.fn()
    render(<EmptyState onVideoClick={onVideoClick} />)
    fireEvent.click(screen.getByText('视频理解'))
    expect(onVideoClick).toHaveBeenCalledTimes(1)
  })

  it('renders both buttons when both callbacks provided', () => {
    render(<EmptyState onMicClick={jest.fn()} onVideoClick={jest.fn()} />)
    expect(screen.getByText('语音对话')).toBeInTheDocument()
    expect(screen.getByText('视频理解')).toBeInTheDocument()
  })
})
