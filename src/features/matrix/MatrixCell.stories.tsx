import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { expect, fireEvent, fn } from 'storybook/test'
import { MatrixCell } from '#/features/matrix/MatrixCell'

const meta = {
  title: 'features/matrix/MatrixCell',
  component: MatrixCell,
  argTypes: {
    state: {
      control: 'select',
      options: ['none', 'include', 'pinned', 'exclude'],
    },
  },
} satisfies Meta<typeof MatrixCell>

export default meta

type Story = StoryObj<typeof meta>

export const None: Story = { args: { state: 'none' } }
export const Include: Story = { args: { state: 'include' } }
export const Pinned: Story = { args: { state: 'pinned' } }
export const Exclude: Story = { args: { state: 'exclude' } }

export const Pending: Story = {
  args: { state: 'include', pending: true },
}

export const DisabledEmptyFolder: Story = {
  args: {
    state: 'pinned',
    disabled: true,
    disabledReason: 'Папка не может быть пустой.',
  },
}

export const ShiftClickExcludes: Story = {
  args: { state: 'include', onClick: fn(), onSelectState: fn() },
  play: async ({ args, canvas }) => {
    fireEvent.click(canvas.getByRole('button'), { shiftKey: true })
    await expect(args.onSelectState).toHaveBeenCalledWith('exclude')
    await expect(args.onClick).not.toHaveBeenCalled()
  },
}
