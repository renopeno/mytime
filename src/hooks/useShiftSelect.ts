import { useRef, useCallback } from 'react'

/**
 * Enables shift+click range selection in lists with checkboxes.
 * Handles both normal toggle and shift+range selection in a single onClick.
 *
 * Usage:
 *   const { getClickHandler } = useShiftSelect(items, selected, setSelected)
 *   <Checkbox checked={selected.has(item.id)} onClick={getClickHandler(item.id)} />
 *   // Do NOT use onCheckedChange — getClickHandler handles both normal and shift clicks.
 */
export function useShiftSelect<T extends { id: string }>(
  items: T[],
  selected: Set<string>,
  setSelected: React.Dispatch<React.SetStateAction<Set<string>>>
) {
  const lastClickedIndex = useRef<number | null>(null)
  // Did the last normal click select (true) or deselect (false)?
  const lastClickWasSelect = useRef(true)

  const getClickHandler = useCallback(
    (id: string) => (e: React.MouseEvent) => {
      const currentIndex = items.findIndex((item) => item.id === id)
      if (currentIndex === -1) return

      if (e.shiftKey && lastClickedIndex.current !== null) {
        e.preventDefault()
        // Clear accidental text selection caused by shift+click
        window.getSelection()?.removeAllRanges()
        const start = Math.min(lastClickedIndex.current, currentIndex)
        const end = Math.max(lastClickedIndex.current, currentIndex)
        const rangeIds = items.slice(start, end + 1).map((item) => item.id)

        setSelected((prev) => {
          const next = new Set(prev)
          for (const rid of rangeIds) {
            if (lastClickWasSelect.current) {
              next.add(rid)
            } else {
              next.delete(rid)
            }
          }
          return next
        })
      } else {
        // Normal toggle — track whether we selected or deselected
        const wasSelected = selected.has(id)
        lastClickWasSelect.current = !wasSelected
        setSelected((prev) => {
          const next = new Set(prev)
          if (next.has(id)) next.delete(id)
          else next.add(id)
          return next
        })
      }

      lastClickedIndex.current = currentIndex
    },
    [items, selected, setSelected]
  )

  return { getClickHandler }
}
