# Napkin

## Corrections
| Date | Source | What Went Wrong | What To Do Instead |
|------|--------|----------------|-------------------|
| 2026-07-08 | self | Reversed payment signs in balance calc: subtracted from sender and added to receiver | Payments reduce the receiver's credit and reduce the payer's debt: add to sender, subtract from receiver |


## User Preferences
- Single shared group, no multi-trip support.
- Equal split by default, but adjustable per expense.
- Simple file import/export as the "backend".
- Wipe the Vite starter UI; fresh minimal UI is fine.
- Currency: display as `$X.XX`.

## Patterns That Work
- Use absolute amounts in the `split` map, even when created from equal split.
- Keep calculations pure and separate from UI components.
- Use a small epsilon for floating-point money comparisons.
- When editing expense participants, immediately remove deselected people from the split state so validation totals stay correct.
- For mobile reflow of wide tables, dedicated card components + a small `useMediaQuery` hook are cleaner than CSS-only `data-label` reflow when the card layout should differ significantly from the table (e.g., title + amount prominent).

## Patterns That Don't Work

## Domain Notes
- Balance formula: `paid − owed + sent − received`.
  - `paid`: money the person paid on behalf of the group (positive).
  - `owed`: the person's share of expenses (negative).
  - `sent`: payments the person made to others (reduces their debt, positive).
  - `received`: payments the person received from others (reduces their credit, negative).
- Settlement uses greedy matching of largest debtor to largest creditor.
