import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { ConnectionBanner } from '#/components/ConnectionBanner'

const meta = {
  title: 'components/ConnectionBanner',
  component: ConnectionBanner,
} satisfies Meta<typeof ConnectionBanner>

export default meta

export const Default: StoryObj<typeof meta> = {}
