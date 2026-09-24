import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { PhoneStep } from '#/features/auth/PhoneStep'

const meta = {
  title: 'features/auth/PhoneStep',
  component: PhoneStep,
  args: {
    onCodeSent: () => {},
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 360 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PhoneStep>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
