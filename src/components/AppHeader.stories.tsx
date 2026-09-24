import { useQueryClient } from '@tanstack/react-query'
import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { expect, screen, userEvent } from 'storybook/test'
import { AppHeader } from '#/components/AppHeader'
import { authStateQueryOptions } from '#/queries/auth'
import type { AuthState } from '#/telegram/auth'

function SignedIn({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const state: AuthState = {
    status: 'authorized',
    profile: { id: 1, firstName: 'Vasiliy', username: 'vasiliy' },
  }
  queryClient.setQueryData(authStateQueryOptions.queryKey, state)
  return children
}

const meta = {
  title: 'components/AppHeader',
  component: AppHeader,
  decorators: [
    (Story) => (
      <SignedIn>
        <Story />
      </SignedIn>
    ),
  ],
} satisfies Meta<typeof AppHeader>

export default meta

type Story = StoryObj<typeof meta>

export const OnMatrix: Story = {
  parameters: { tanstack: { router: { route: { path: '/matrix' } } } },
  play: async () => {
    await expect(
      await screen.findByRole('link', { name: 'Матрица' }),
    ).toHaveAttribute('aria-current', 'page')
    await expect(
      screen.getByRole('link', { name: 'Заблокированные' }),
    ).not.toHaveAttribute('aria-current')
  },
}

export const ProfileMenuOpen: Story = {
  parameters: { tanstack: { router: { route: { path: '/matrix' } } } },
  play: async () => {
    await userEvent.click(
      await screen.findByRole('button', { name: 'Меню профиля' }),
    )
    await expect(await screen.findByText('@vasiliy')).toBeInTheDocument()
    await expect(
      screen.getByRole('menuitem', { name: 'Выйти' }),
    ).toBeInTheDocument()
  },
}

export const OnBlocked: Story = {
  parameters: { tanstack: { router: { route: { path: '/blocked' } } } },
  play: async () => {
    await expect(
      await screen.findByRole('link', { name: 'Заблокированные' }),
    ).toHaveAttribute('aria-current', 'page')
  },
}
