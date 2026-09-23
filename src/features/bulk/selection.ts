/**
 * One click on a row checkbox (F6.1). Without Shift it toggles that row and
 * makes it the anchor; with Shift it applies the clicked row's new state to
 * every row between the anchor and it, in the current (filtered, sorted)
 * order — the same as file managers and Gmail.
 */
export function toggleSelection(
  selected: ReadonlySet<number>,
  orderedIds: readonly number[],
  id: number,
  anchor: number | undefined,
  shift: boolean,
): { selected: Set<number>; anchor: number } {
  const next = new Set(selected)
  const select = !selected.has(id)
  const from = anchor === undefined ? -1 : orderedIds.indexOf(anchor)
  const to = orderedIds.indexOf(id)

  if (shift && from !== -1 && to !== -1) {
    const [start, end] = from < to ? [from, to] : [to, from]
    for (const rangeId of orderedIds.slice(start, end + 1)) {
      if (select) next.add(rangeId)
      else next.delete(rangeId)
    }
  } else if (select) {
    next.add(id)
  } else {
    next.delete(id)
  }

  return { selected: next, anchor: id }
}
