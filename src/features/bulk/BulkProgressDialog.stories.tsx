import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { expect, fn, screen, userEvent } from 'storybook/test'
import { BulkProgressDialog } from '#/features/bulk/BulkProgressDialog'
import { FIXTURE_CHATS } from '#/features/matrix/fixtures'

const meta = {
  title: 'features/bulk/BulkProgressDialog',
  component: BulkProgressDialog,
  args: { onCancel: fn(), onClose: fn() },
} satisfies Meta<typeof BulkProgressDialog>

export default meta

type Story = StoryObj<typeof meta>

export const Running: Story = {
  args: {
    state: {
      status: 'running',
      action: { type: 'mute' },
      done: 12,
      total: 40,
      cancelling: false,
    },
  },
  play: async ({ args }) => {
    await expect(await screen.findByText('12 из 40')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /отменить/i }))
    await expect(args.onCancel).toHaveBeenCalled()
  },
}

export const FloodWaitPause: Story = {
  args: {
    state: {
      status: 'running',
      action: { type: 'markRead' },
      done: 7,
      total: 40,
      waitingSec: 23,
      cancelling: false,
    },
  },
  play: async () => {
    await expect(await screen.findByText(/через 23 с/)).toBeInTheDocument()
  },
}

export const Cancelling: Story = {
  args: {
    state: {
      status: 'running',
      action: { type: 'leave' },
      done: 3,
      total: 10,
      cancelling: true,
    },
  },
}

export const DoneWithFailures: Story = {
  args: {
    state: {
      status: 'done',
      action: { type: 'leave' },
      report: {
        succeeded: 5,
        cancelled: 2,
        skipped: 1,
        failures: [
          {
            reason: 'Недостаточно прав для этого действия.',
            chats: FIXTURE_CHATS.slice(2, 4),
          },
        ],
      },
    },
  },
  play: async ({ args }) => {
    await expect(await screen.findByRole('alert')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /закрыть/i }))
    await expect(args.onClose).toHaveBeenCalled()
  },
}

export const DoneClean: Story = {
  args: {
    state: {
      status: 'done',
      action: { type: 'archive' },
      report: { succeeded: 12, cancelled: 0, skipped: 0, failures: [] },
    },
  },
}
