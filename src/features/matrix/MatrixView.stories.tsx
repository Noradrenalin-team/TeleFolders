import { useRef, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/tanstack-react'
import {
  expect,
  fireEvent,
  fn,
  screen,
  userEvent,
  within,
} from 'storybook/test'
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

export const LongFolderNames: Story = {
  args: {
    folders: [
      { ...FIXTURE_FOLDERS[0], title: 'lapochka', emoticon: '🐱' },
      { ...FIXTURE_FOLDERS[1], title: 'Работа и все рабочие чаты команды' },
      ...FIXTURE_FOLDERS.slice(2),
    ],
    chats: FIXTURE_CHATS,
    isLoading: false,
    loadedCount: FIXTURE_CHATS.length,
  },
}

const NO_SELECTION = {
  isSelected: () => false,
  onToggle: fn(),
  onClear: fn(),
  selected: new Set<number>(),
  onReplace: fn(),
  selectAll: { checked: false, onToggle: fn() },
}

/** Folders not loaded yet: stand-in folder columns, no flag rows. */
export const Loading: Story = {
  args: {
    folders: [],
    chats: [],
    isLoading: true,
    loadedCount: 128,
    selection: NO_SELECTION,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Progress sits in the top bar, where the loaded count stays afterwards.
    await expect(canvas.getByRole('status')).toHaveTextContent(
      'Загружено 128 чатов',
    )
    await expect(canvas.queryByRole('grid')).toBeNull()
  },
}

/** Folders usually arrive before dialogs: their real titles and widths are
 * already in the header, with the flag rows under it. */
export const LoadingFoldersReady: Story = {
  args: { ...Loading.args, folders: FIXTURE_FOLDERS },
}

/**
 * Skeleton and loaded matrix side by side: every row of the header and flag
 * rows, the first chat row and the folder titles sit at the same offsets and
 * on the same column tracks in both, so nothing jumps when loading ends.
 */
export const SkeletonMatchesLoaded: Story = {
  args: { ...LoadingFoldersReady.args, loadedCount: FIXTURE_CHATS.length },
  render: (args) => (
    <div className="grid h-full grid-cols-2 divide-x divide-border">
      <div data-testid="loading" className="min-w-0 overflow-hidden">
        <MatrixView {...args} />
      </div>
      <div data-testid="loaded" className="min-w-0 overflow-hidden">
        <MatrixView {...args} chats={FIXTURE_CHATS} isLoading={false} />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const loading = canvas.getByTestId('loading')
    const loaded = canvas.getByTestId('loaded')
    await within(loaded).findByRole('button', { name: 'Избранное' })

    const layout = (pane: HTMLElement) => {
      const origin = pane.getBoundingClientRect()
      const offset = (element: Element | null) => {
        const rect = element?.getBoundingClientRect()
        return rect && [rect.left - origin.left, rect.top - origin.top]
      }
      return {
        rows: [...pane.querySelectorAll<HTMLElement>('.grid')]
          .slice(0, 1 + FOLDER_ROWS + 1)
          .map((row) => ({
            top: row.getBoundingClientRect().top - origin.top,
            height: row.getBoundingClientRect().height,
            columns: row.style.gridTemplateColumns,
          })),
        titles: FIXTURE_FOLDERS.map((folder) =>
          offset(within(pane).getByText(folder.title)),
        ),
        avatar: offset(pane.querySelector('.size-7')),
      }
    }

    await expect(layout(loading)).toEqual(layout(loaded))
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
        selected,
        onReplace: (next, from) => {
          anchor.current = from
          setSelected(next)
        },
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

export const DragToSelect: Story = {
  args: Interactive.args,
  render: () => <SelectableMatrix />,
  play: async () => {
    const drag = async (from: number, to: number) => {
      const boxes = await screen.findAllByRole('checkbox', {
        name: /выбрать «/i,
      })
      fireEvent.pointerDown(boxes[from], { pointerType: 'mouse', button: 0 })
      // Measure after the press: the bulk bar appears and moves rows up.
      const rect = boxes[to].getBoundingClientRect()
      fireEvent.pointerMove(document, {
        pointerType: 'mouse',
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
      })
      fireEvent.pointerUp(document, { pointerType: 'mouse' })
      fireEvent.click(boxes[from])
    }

    await drag(0, 2)
    await expect(await screen.findByText('Выбрано 3 чата')).toBeInTheDocument()

    // Starting on a checked row clears the range instead.
    await drag(2, 1)
    await expect(await screen.findByText('Выбран 1 чат')).toBeInTheDocument()
  },
}
