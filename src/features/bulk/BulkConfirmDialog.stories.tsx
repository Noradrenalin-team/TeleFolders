import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { expect, fn, screen, userEvent } from 'storybook/test'
import { BulkConfirmDialog } from '#/features/bulk/BulkConfirmDialog'
import { FIXTURE_CHATS } from '#/features/matrix/fixtures'
import type { Chat } from '#/telegram/types'

const manyChats: Chat[] = Array.from({ length: 14 }, (_, index) => ({
  ...FIXTURE_CHATS[1],
  id: 1000 + index,
  title: `Чат ${index + 1}`,
}))

const meta = {
  title: 'features/bulk/BulkConfirmDialog',
  component: BulkConfirmDialog,
  args: { onConfirm: fn(), onOpenChange: fn() },
} satisfies Meta<typeof BulkConfirmDialog>

export default meta

type Story = StoryObj<typeof meta>

export const DeleteManyListsFirstTen: Story = {
  args: {
    request: { action: { type: 'delete' }, chats: manyChats, skipped: 2 },
  },
  play: async ({ args }) => {
    await screen.findByRole('dialog')
    await expect(screen.getAllByRole('listitem')).toHaveLength(11)
    await expect(screen.getByText(/и ещё 4/)).toBeInTheDocument()
    await expect(
      screen.getByText(/2 выбранных чата пропущено/),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^удалить$/i }))
    await expect(args.onConfirm).toHaveBeenCalled()
  },
}

export const LeaveFew: Story = {
  args: {
    request: {
      action: { type: 'leave' },
      chats: FIXTURE_CHATS.filter((chat) => chat.canLeave),
      skipped: 0,
    },
  },
}

export const Block: Story = {
  args: {
    request: {
      action: { type: 'block' },
      chats: FIXTURE_CHATS.filter((chat) => chat.canBlock),
      skipped: 0,
    },
  },
}

export const CancelDoesNotRun: Story = {
  args: DeleteManyListsFirstTen.args,
  play: async ({ args }) => {
    await userEvent.click(
      await screen.findByRole('button', { name: /отмена/i }),
    )
    await expect(args.onOpenChange).toHaveBeenCalledWith(false)
    await expect(args.onConfirm).not.toHaveBeenCalled()
  },
}
