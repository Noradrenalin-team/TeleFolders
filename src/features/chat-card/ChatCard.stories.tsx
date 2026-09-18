import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { ChatCard } from '#/features/chat-card/ChatCard'
import { FIXTURE_CHATS, FIXTURE_FOLDERS } from '#/features/matrix/fixtures'

const meta = {
  title: 'features/chat-card/ChatCard',
  component: ChatCard,
  args: {
    folders: FIXTURE_FOLDERS,
    open: true,
    onOpenChange: () => {},
  },
} satisfies Meta<typeof ChatCard>

export default meta

type Story = StoryObj<typeof meta>

export const WithFolders: Story = {
  args: {
    chat: FIXTURE_CHATS[3], // in two folders, has unread and a username
  },
}

export const NoFolders: Story = {
  args: {
    chat: FIXTURE_CHATS[0], // "Избранное", not in any folder
    folders: [],
  },
}

export const Navigation: Story = {
  args: { chat: FIXTURE_CHATS[1] },
  render: () => {
    function Interactive() {
      const [index, setIndex] = useState(1)
      return (
        <ChatCard
          chat={FIXTURE_CHATS[index]}
          folders={FIXTURE_FOLDERS}
          open
          onOpenChange={() => {}}
          canGoPrev={index > 0}
          canGoNext={index < FIXTURE_CHATS.length - 1}
          onPrev={() => setIndex((i) => Math.max(0, i - 1))}
          onNext={() =>
            setIndex((i) => Math.min(FIXTURE_CHATS.length - 1, i + 1))
          }
        />
      )
    }
    return <Interactive />
  },
}
