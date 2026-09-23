import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { fn } from 'storybook/test'
import { BlockedList } from '#/features/blocked/BlockedList'

const meta = {
  title: 'features/blocked/BlockedList',
  component: BlockedList,
  args: {
    peers: [
      { id: 101, kind: 'user', title: 'Иван Петров', username: 'ivan' },
      { id: 102, kind: 'bot', title: 'Spam Bot', username: 'spam_bot' },
      { id: 103, kind: 'user', title: '', username: 'nameless' },
    ],
    isLoading: false,
    onUnblock: fn(),
    onRetry: fn(),
  },
} satisfies Meta<typeof BlockedList>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Unblocking: Story = {
  args: { isPending: (id) => id === 101 },
}

export const Empty: Story = { args: { peers: [] } }

export const Loading: Story = { args: { peers: [], isLoading: true } }

export const LoadError: Story = { args: { peers: [], isError: true } }
