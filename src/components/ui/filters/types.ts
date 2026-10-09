/**
 * Filter values are plain strings keyed by their URL/query name, so the same
 * object drives the address bar, the API call and the chips. Pages narrow
 * them to typed filters at the service layer.
 */
export type FilterValues = Record<string, string | undefined>;

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface DatePreset {
  value: string;
  label: string;
  /** Days back from today (IST) for `from`; `to` stays open. */
  days?: number;
  /** Explicit range, for "this month" style presets. */
  range?: () => { from: string; to?: string };
}

export type FilterKind = 'select' | 'toggle' | 'daterange' | 'numberrange';

export interface FilterDef {
  /**
   * Query key. A daterange uses `${key}From` / `${key}To`; a numberrange
   * uses `${key}Min` / `${key}Max`; a toggle writes 'true' when on.
   */
  key: string;
  label: string;
  kind: FilterKind;
  /** Section heading inside the "More filters" panel. */
  group?: string;
  /** One line under the control, for filters whose meaning isn't obvious. */
  hint?: string;
  /** Show in the toolbar row rather than the panel. */
  inline?: boolean;
  options?: FilterOption[];
  /** First option text for a select, e.g. "All cities". */
  placeholder?: string;
  /** Toolbar-only: width class for the select. */
  className?: string;
  /** numberrange prefix, e.g. '₹'. */
  unit?: string;
  presets?: DatePreset[];
  /** daterange: custom ranges pick a date and time (India time) instead of whole days. */
  withTime?: boolean;
  /** Returns a reason when the filter can't apply given the other values. */
  disabledWhen?: (values: FilterValues) => string | false;
}

/** A one-click preset above the toolbar, with its live count when known. */
export interface Segment {
  label: string;
  patch: FilterValues;
  count?: number;
}

export interface SortOption {
  value: string;
  label: string;
}
