import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { expect, fn, screen, userEvent } from 'storybook/test'
import { BulkBar } from '#/features/bulk/BulkBar'
import { FIXTURE_FOLDERS } from '#/features/matrix/fixtures'
import type { BulkAction } from '#/features/bulk/bulk-actions'

const meta = {
  title: 'features/bulk/BulkBar',
  component: BulkBar,
  args: {
    selectedCount: 3,
    matchingCount: 6,
    folders: FIXTURE_FOLDERS,
    applicableCount: (action: BulkAction) => (action.type === 'mute' ? 0 : 3),
    onRun: fn(),
    onSelectAllMatching: fn(),
    onClear: fn(),
  },
} satisfies Meta<typeof BulkBar>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const RunsAnAction: Story = {
  play: async ({ args }) => {
    await userEvent.click(
      await screen.findByRole('button', { name: /действия/i }),
    )
    await userEvent.click(
      await screen.findByRole('menuitem', { name: /в архив/i }),
    )
    await expect(args.onRun).toHaveBeenCalledWith({ type: 'archive' })
  },
}

export const DisablesInapplicableActions: Story = {
  play: async () => {
    await userEvent.click(
      await screen.findByRole('button', { name: /действия/i }),
    )
    const mute = await screen.findByRole('menuitem', {
      name: /выключить уведомления/i,
    })
    await expect(mute).toHaveAttribute('data-disabled')
  },
}

export const AddsToFolder: Story = {
  play: async ({ args }) => {
    await userEvent.click(await screen.findByRole('button', { name: /папки/i }))
    const [first] = await screen.findAllByRole('menuitem')
    await userEvent.click(first)
    await expect(args.onRun).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'folder', relation: 'include' }),
    )
  },
}

export const AllSelected: Story = {
  args: { selectedCount: 6 },
  play: async () => {
    await expect(
      screen.queryByRole('button', { name: /выбрать все по фильтру/i }),
    ).toBeNull()
  },
}

export const Running: Story = { args: { disabled: true } }
