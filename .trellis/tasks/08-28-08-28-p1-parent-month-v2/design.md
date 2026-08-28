# P1 parent month schedule V2 — design

## View-model design

Keep `selectedDate` as the canonical selected day and derive `selectedMonth` from it. `monthDays` contains a fixed calendar grid with one view model per cell:

```ts
type MonthDayView = {
  key: string;
  dayNumber: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  hasTraining: boolean;
  hasMatch: boolean;
  hasMultiple: boolean;
};
```

The page loads only the month range needed for the current calendar. A small chunk helper handles the existing 31-day BFF limit. Child filtering occurs before building markers and the selected-day activity list.

## Interaction

- Tap `‹` or `›` to move one month and select the first day of that month.
- Tap a day cell to update `selectedDate`, hero digest, summary chips, and activity cards without another request when the month is already loaded.
- Tap the month title/right arrow to move to the next month using the same month navigation handler.
- Tap an activity card to open the existing parent event detail route.

## Visual mapping

- Page background: `#f5f6f8`.
- Month card: white, rounded, 343px wide, 252px high at the 375px design width.
- Selected date: brand red circle with white date text.
- Today marker: small green dot; training marker uses green and match marker uses orange.
- Activity content and hero retain existing real-data-driven typography and status rules.

## Data and error behavior

- No bound child: retain the existing empty page state.
- Missing events: render the calendar with no dots and the existing fixed-height empty activity card.
- Request failure: retain retryable error state.
- No API or database changes are required.
