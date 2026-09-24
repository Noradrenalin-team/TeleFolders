import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { expect, fn, screen, userEvent } from 'storybook/test'
import { ChatList } from '#/features/matrix/ChatList'
import { FIXTURE_CHATS, FIXTURE_FOLDERS } from '#/features/matrix/fixtures'

const meta = {
  title: 'features/matrix/ChatList',
  component: ChatList,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div style={{ height: 560, width: 390, display: 'flex' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    chats: FIXTURE_CHATS,
    folders: FIXTURE_FOLDERS,
    onOpenChat: fn(),
    onChatAction: fn(),
    selection: {
      isSelected: (id) => id === FIXTURE_CHATS[1].id,
      onToggle: fn(),
    },
  },
} satisfies Meta<typeof ChatList>

export default meta

type Story = StoryObj<typeof meta>

export const Phone: Story = {
  play: async ({ args }) => {
    // Folder membership is visible without the grid: "Команда" is in "Работа".
    await expect((await screen.findAllByText('Работа')).length).toBeGreaterThan(
      0,
    )
    await userEvent.click(screen.getByText('Команда'))
    await expect(args.onOpenChat).toHaveBeenCalledWith(FIXTURE_CHATS[1])
  },
}
