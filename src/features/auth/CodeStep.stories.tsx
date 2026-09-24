import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { CodeStep } from '#/features/auth/CodeStep'

const meta = {
  title: 'features/auth/CodeStep',
  component: CodeStep,
  args: {
    phone: '+7 900 000-00-00',
    onPasswordNeeded: () => {},
    onSignedIn: () => {},
    onChangeNumber: () => {},
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 360 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CodeStep>

export default meta

type Story = StoryObj<typeof meta>

/** Resend still on cooldown (F1.3). */
export const ResendCoolingDown: Story = {
  args: {
    initialSentCode: { phoneCodeHash: 'hash', nextType: 'sms', timeoutSec: 42 },
  },
}

/** Cooldown elapsed — resend is available. */
export const ResendAvailable: Story = {
  args: {
    initialSentCode: { phoneCodeHash: 'hash', nextType: 'sms', timeoutSec: 0 },
  },
}
