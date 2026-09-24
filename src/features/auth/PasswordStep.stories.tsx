import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { PasswordStep } from '#/features/auth/PasswordStep'

const meta = {
  title: 'features/auth/PasswordStep',
  component: PasswordStep,
  args: {
    onSignedIn: () => {},
    onBack: () => {},
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 360 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PasswordStep>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
