import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { FolderDialog } from '#/features/matrix/FolderDialog'
import { FIXTURE_FOLDERS } from '#/features/matrix/fixtures'

const meta = {
  title: 'features/matrix/FolderDialog',
  component: FolderDialog,
  args: {
    open: true,
    onOpenChange: () => {},
  },
  parameters: { layout: 'centered' },
} satisfies Meta<typeof FolderDialog>

export default meta

type Story = StoryObj<typeof meta>

/** No `folder` prop — the "create" flow, chat picker included (F4.1). */
export const Create: Story = {}

export const Edit: Story = {
  args: { folder: FIXTURE_FOLDERS[0] },
}

export const EditReadOnlyChatlist: Story = {
  args: { folder: FIXTURE_FOLDERS[2] },
}
