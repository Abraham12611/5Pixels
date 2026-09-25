/**
 * Cross-surface "open the search palette" signal. Search triggers that aren't
 * colocated with the palette (landing pill, explore sticky bar) dispatch this
 * event; the mounted `GlobalSearch` in the header listens and opens.
 */
export const OPEN_SEARCH_EVENT = "5px:open-search";

export function openGlobalSearch(): void {
  window.dispatchEvent(new CustomEvent(OPEN_SEARCH_EVENT));
}
