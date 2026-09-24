import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { expect, fn, screen, userEvent } from 'storybook/test'
import { ConfirmChatActionDialog } from '#/features/chat-actions/ConfirmChatActionDialog'
import { FIXTURE_CHATS } from '#/features/matrix/fixtures'
import type { Chat } from '#/telegram/types'

const byKind = (kind: Chat['kind']) =>
  FIXTURE_CHATS.find((chat) => chat.kind === kind) as Chat

const meta = {
  title: 'features/chat-actions/ConfirmChatActionDialog',
  component: ConfirmChatActionDialog,
  args: {
    onConfirm: fn(),
    onOpenChange: fn(),
  },
} satisfies Meta<typeof ConfirmChatActionDialog>

export default meta

type Story = StoryObj<typeof meta>

export const DeleteDirectMessage: Story = {
  args: { request: { chat: byKind('user'), action: 'delete' } },
  play: async ({ args }) => {
    await userEvent.click(await screen.findByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: /удалить чат/i }))
    await expect(args.onConfirm).toHaveBeenCalledWith({
      revoke: true,
      block: false,
    })
  },
}

export const DeleteBot: Story = {
  args: { request: { chat: byKind('bot'), action: 'delete' } },
  play: async ({ args }) => {
    await userEvent.click(await screen.findByRole('checkbox'))
    await userEvent.click(
      screen.getByRole('button', { name: /остановить и удалить/i }),
    )
    await expect(args.onConfirm).toHaveBeenCalledWith({
      revoke: false,
      block: true,
    })
  },
}

export const ClearSavedMessages: Story = {
  args: { request: { chat: byKind('saved'), action: 'clearHistory' } },
  play: async () => {
    await screen.findByRole('dialog')
    await expect(screen.queryByRole('checkbox')).toBeNull()
  },
}

export const LeaveGroupAsOwner: Story = {
  args: { request: { chat: byKind('group'), action: 'leave' } },
  play: async () => {
    await expect(await screen.findByRole('alert')).toBeInTheDocument()
  },
}

export const UnsubscribeFromChannel: Story = {
  args: { request: { chat: byKind('channel'), action: 'leave' } },
  play: async () => {
    await screen.findByRole('dialog')
    await expect(screen.queryByRole('alert')).toBeNull()
  },
}

export const BlockUser: Story = {
  args: { request: { chat: byKind('user'), action: 'block' } },
}

export const CancelDoesNotConfirm: Story = {
  args: { request: { chat: byKind('user'), action: 'delete' } },
  play: async ({ args }) => {
    await userEvent.click(
      await screen.findByRole('button', { name: /отмена/i }),
    )
    await expect(args.onOpenChange).toHaveBeenCalledWith(false)
    await expect(args.onConfirm).not.toHaveBeenCalled()
  },
}

export const Pending: Story = {
  args: {
    request: { chat: byKind('user'), action: 'delete' },
    pending: true,
  },
}
