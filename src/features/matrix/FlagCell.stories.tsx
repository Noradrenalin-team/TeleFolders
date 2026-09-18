import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { FlagCell } from '#/features/matrix/FlagCell'

const meta = {
  title: 'features/matrix/FlagCell',
  component: FlagCell,
} satisfies Meta<typeof FlagCell>

export default meta

type Story = StoryObj<typeof meta>

export const Active: Story = { args: { active: true, label: 'В архиве' } }
export const Inactive: Story = {
  args: { active: false, label: 'Не в архиве' },
}
export const Pending: Story = {
  args: { active: false, label: 'В архиве', pending: true },
}
export const DisabledEmptyFolder: Story = {
  args: {
    active: true,
    label: 'Контакты',
    disabled: true,
    disabledReason: 'Папка не может быть пустой.',
  },
}
