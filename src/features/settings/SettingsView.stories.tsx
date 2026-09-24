import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { expect, fn, screen, userEvent } from 'storybook/test'
import { SettingsView } from '#/features/settings/SettingsView'

const meta = {
  title: 'features/settings/SettingsView',
  component: SettingsView,
  args: {
    profile: {
      id: 1,
      firstName: 'Vasiliy',
      lastName: 'P.',
      username: 'vasiliy',
    },
    showArchived: false,
    onShowArchivedChange: fn(),
    onLogOut: fn(),
  },
} satisfies Meta<typeof SettingsView>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ args }) => {
    await userEvent.click(
      await screen.findByRole('switch', { name: /архивные/i }),
    )
    await expect(args.onShowArchivedChange).toHaveBeenCalledWith(true)
    await expect(
      screen.getByRole('link', { name: /исходный код/i }),
    ).toHaveAttribute('target', '_blank')
  },
}

export const LoggingOut: Story = { args: { logOutPending: true } }
