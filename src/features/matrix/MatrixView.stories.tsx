import { useRef, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { expect, fireEvent, fn, screen, userEvent } from 'storybook/test'
import { BulkBar } from '#/features/bulk/BulkBar'
import { toggleSelection } from '#/features/bulk/selection'
import { FOLDER_FLAGS } from '#/features/matrix/flags'
import { MatrixView } from '#/features/matrix/MatrixView'
import { FIXTURE_CHATS, FIXTURE_FOLDERS } from '#/features/matrix/fixtures'
import {
  nextRelation,
  wouldEmptyFolder,
} from '#/features/matrix/relation-cycle'

const FOLDER_ROWS = FOLDER_FLAGS.length

const meta = {
  title: 'features/matrix/MatrixView',
  component: MatrixView,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div style={{ height: '600px' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MatrixView>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    folders: FIXTURE_FOLDERS,
    chats: FIXTURE_CHATS,
    isLoading: false,
    loadedCount: FIXTURE_CHATS.length,
  },
}

export const Loading: Story = {
  args: {
    folders: [],
    chats: [],
    isLoading: true,
    loadedCount: 128,
  },
}

export const NoFolders: Story = {
  args: {
    folders: [],
    chats: FIXTURE_CHATS,
    isLoading: false,
    loadedCount: FIXTURE_CHATS.length,
  },
}

export const NoResultsForFilter: Story = {
  args: {
    folders: FIXTURE_FOLDERS,
    chats: [],
    isLoading: false,
    loadedCount: 0,
    hasActiveFilters: true,
  },
}

export const LoadError: Story = {
  args: {
    folders: [],
    chats: [],
    isLoading: false,
    isError: true,
    loadedCount: 0,
  },
}

export const NoChats: Story = {
  args: {
    folders: FIXTURE_FOLDERS,
    chats: [],
    isLoading: false,
    loadedCount: 0,
  },
}

/**
 * Local-state clone of the real cycling/empty-folder-guard logic in
 * src/routes/matrix.tsx, so cell clicks are actually verifiable here without
 * a live Telegram connection.
 */
function InteractiveMatrix() {
  const [chats, setChats] = useState(FIXTURE_CHATS)
  const [folders, setFolders] = useState(FIXTURE_FOLDERS)

  return (
    <MatrixView
      folders={folders}
      chats={chats}
      isLoading={false}
      loadedCount={chats.length}
      onCycleRelation={(chat, folder, current) => {
        if (wouldEmptyFolder(folder, current)) return
        const next = nextRelation(current)
        const wasIncluded = current === 'include' || current === 'pinned'
        const willBeIncluded = next === 'include' || next === 'pinned'
        const delta = Number(willBeIncluded) - Number(wasIncluded)

        setChats((prev) =>
          prev.map((c) => {
            if (c.id !== chat.id) return c
            const nextFolders = { ...c.folders }
            if (next) nextFolders[folder.id] = next
            else delete nextFolders[folder.id]
            return { ...c, folders: nextFolders }
          }),
        )
        if (delta !== 0) {
          setFolders((prev) =>
            prev.map((f) =>
              f.id === folder.id
                ? { ...f, includeCount: f.includeCount + delta }
                : f,
            ),
          )
        }
      }}
      onToggleFlag={(folder, flag, next) => {
        setFolders((prev) =>
          prev.map((f) =>
            f.id === folder.id
              ? { ...f, flags: { ...f.flags, [flag]: next } }
              : f,
          ),
        )
      }}
      onSetArchived={(chat, archived) => {
        setChats((prev) =>
          prev.map((c) =>
            c.id === chat.id ? { ...c, isArchived: archived } : c,
          ),
        )
      }}
    />
  )
}

export const Interactive: Story = {
  args: {
    folders: FIXTURE_FOLDERS,
    chats: FIXTURE_CHATS,
    isLoading: false,
    loadedCount: FIXTURE_CHATS.length,
  },
  render: () => <InteractiveMatrix />,
}

function SelectableMatrix() {
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set())
  const anchor = useRef<number | undefined>(undefined)
  const ids = FIXTURE_CHATS.map((chat) => chat.id)

  return (
    <MatrixView
      folders={FIXTURE_FOLDERS}
      chats={FIXTURE_CHATS}
      isLoading={false}
      loadedCount={FIXTURE_CHATS.length}
      onOpenChat={fn()}
      selection={{
        isSelected: (id) => selected.has(id),
        onClear: () => setSelected(new Set()),
        onToggle: (chat, shift) => {
          const next = toggleSelection(
            selected,
            ids,
            chat.id,
            anchor.current,
            shift,
          )
          anchor.current = next.anchor
          setSelected(next.selected)
        },
        selectAll: {
          checked:
            selected.size === 0
              ? false
              : selected.size === ids.length
                ? true
                : 'indeterminate',
          onToggle: () =>
            setSelected(
              selected.size === ids.length ? new Set() : new Set(ids),
            ),
        },
      }}
      footer={
        selected.size > 0 ? (
          <BulkBar
            selectedCount={selected.size}
            matchingCount={ids.length}
            folders={FIXTURE_FOLDERS}
            applicableCount={() => selected.size}
            onRun={fn()}
            onSelectAllMatching={() => setSelected(new Set(ids))}
            onClear={() => setSelected(new Set())}
          />
        ) : undefined
      }
    />
  )
}

export const WithSelection: Story = {
  args: Interactive.args,
  render: () => <SelectableMatrix />,
  play: async () => {
    const boxes = await screen.findAllByRole('checkbox', { name: /выбрать «/i })
    await userEvent.click(boxes[0])
    fireEvent.click(boxes[2], { shiftKey: true })
    await expect(await screen.findByText('Выбрано 3 чата')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('checkbox', { name: 'Выбрать все' }))
    await expect(
      await screen.findByText(`Выбрано ${FIXTURE_CHATS.length} чатов`),
    ).toBeInTheDocument()

    await userEvent.click(
      screen.getByRole('button', { name: /снять выделение/i }),
    )
    await expect(
      screen.queryByRole('region', { name: /массовые действия/i }),
    ).toBeNull()
  },
}

export const KeyboardNavigation: Story = {
  args: Interactive.args,
  render: () => <SelectableMatrix />,
  play: async ({ canvasElement }) => {
    const grid = canvasElement.querySelector<HTMLElement>('[role="grid"]')
    await expect(grid).not.toBeNull()
    // One Tab stop for the whole grid (roving tabindex).
    await expect(grid?.querySelectorAll('[tabindex="0"]')).toHaveLength(1)

    const first = await screen.findByRole('button', { name: 'Избранное' })
    first.focus()
    await userEvent.keyboard('{ArrowDown}')
    await expect(document.activeElement).toHaveTextContent('Команда')

    await userEvent.keyboard('{ArrowRight}')
    await expect(document.activeElement).toHaveAccessibleName('Не в архиве')

    await userEvent.keyboard('{ArrowLeft}')
    await userEvent.keyboard(' ')
    await expect(await screen.findByText('Выбран 1 чат')).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')
    await expect(screen.queryByText('Выбран 1 чат')).toBeNull()

    await userEvent.keyboard('{Control>}{End}{/Control}')
    await expect(document.activeElement?.getAttribute('data-cell-row')).toBe(
      String(FOLDER_ROWS + FIXTURE_CHATS.length - 1),
    )
  },
}
