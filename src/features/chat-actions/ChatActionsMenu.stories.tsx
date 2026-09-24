import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { expect, fn, screen, userEvent } from 'storybook/test'
import { ChatActionsDropdown } from '#/features/chat-actions/ChatActionsMenu'
import { FIXTURE_CHATS } from '#/features/matrix/fixtures'
import type { Chat } from '#/telegram/types'

const byKind = (kind: Chat['kind']) =>
  FIXTURE_CHATS.find((chat) => chat.kind === kind) as Chat

const meta = {
  title: 'features/chat-actions/ChatActionsMenu',
  component: ChatActionsDropdown,
  args: { onAction: fn() },
} satisfies Meta<typeof ChatActionsDropdown>

export default meta

type Story = StoryObj<typeof meta>

async function openMenu() {
  await userEvent.click(await screen.findByRole('button'))
  await screen.findByRole('menu')
}

export const DirectMessage: Story = {
  args: { chat: byKind('user') },
  play: async ({ args }) => {
    await openMenu()
    await userEvent.click(
      screen.getByRole('menuitem', { name: /удалить чат/i }),
    )
    await expect(args.onAction).toHaveBeenCalledWith(args.chat, 'delete')
  },
}

export const Group: Story = {
  args: { chat: byKind('group') },
  play: async () => {
    await openMenu()
    await expect(
      screen.getByRole('menuitem', { name: /выйти из группы/i }),
    ).toBeInTheDocument()
    await expect(
      screen.queryByRole('menuitem', { name: /удалить/i }),
    ).toBeNull()
  },
}

export const Channel: Story = {
  args: { chat: byKind('channel') },
  play: openMenu,
}

export const Bot: Story = {
  args: { chat: byKind('bot') },
  play: openMenu,
}

export const SavedMessages: Story = {
  args: { chat: byKind('saved') },
  play: openMenu,
}
