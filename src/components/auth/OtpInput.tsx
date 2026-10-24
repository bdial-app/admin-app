import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  /** Red boxes and a shake; re-shakes whenever `errorKey` changes. */
  error?: boolean;
  errorKey?: number;
  success?: boolean;
  autoFocus?: boolean;
  /** For aria-describedby on the group. */
  describedBy?: string;
}

/**
 * One box per digit. Typing moves on, Backspace moves back, arrows move
 * around, and pasting (or the phone's SMS autofill) fills every box at once.
 */
export function OtpInput({
  value,
  onChange,
  length = 6,
  disabled,
  error,
  errorKey,
  success,
  autoFocus,
  describedBy,
}: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  const focus = (i: number) => {
    const el = refs.current[Math.max(0, Math.min(length - 1, i))];
    el?.focus();
    el?.select();
  };

  const setFrom = (start: number, text: string) => {
    const clean = text.replace(/\D/g, '');
    if (!clean) return;
    const next = (value.slice(0, start) + clean).slice(0, length);
    onChange(next);
    focus(Math.min(next.length, length - 1));
  };

  const onKeyDown = (i: number) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (digits[i]) {
        onChange(value.slice(0, i) + value.slice(i + 1));
      } else if (i > 0) {
        onChange(value.slice(0, i - 1) + value.slice(i));
        focus(i - 1);
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focus(i - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      focus(i + 1);
    }
  };

  const onPaste = (i: number) => (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    setFrom(i, e.clipboardData.getData('text'));
  };

  const border = (i: number) => {
    if (success) return 'var(--color-success)';
    if (error) return 'var(--color-danger)';
    if (digits[i]) return 'var(--tj-indigo)';
    return 'var(--border-default)';
  };

  return (
    <div
      key={errorKey}
      role="group"
      aria-label="6-digit code"
      aria-describedby={describedBy}
      className={`flex gap-2 sm:gap-2.5 ${error ? 'tj-shake' : ''}`}
    >
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          value={d}
          // Only the box to fill next takes focus from Tab; the rest follow.
          tabIndex={i === Math.min(value.length, length - 1) ? 0 : -1}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={`Digit ${i + 1}`}
          aria-invalid={error || undefined}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          maxLength={length}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '');
            if (!v) return;
            // A longer value is SMS autofill or a fast typist overrunning a box.
            if (v.length > 1) setFrom(i, v.length >= length ? v : v.slice(-1));
            else setFrom(i, v);
          }}
          onKeyDown={onKeyDown(i)}
          onPaste={onPaste(i)}
          onFocus={(e) => e.target.select()}
          onClick={(e) => e.currentTarget.select()}
          className={`tj-otp-box w-full min-w-0 h-14 text-center text-2xl font-semibold rounded-xl outline-none transition-all duration-150 ${success ? '' : 'disabled:opacity-60'}`}
          style={{
            background: success ? 'color-mix(in srgb, var(--color-success) 8%, var(--surface-0))' : 'var(--surface-0)',
            border: `1.5px solid ${border(i)}`,
            color: 'var(--text-primary)',
            caretColor: 'var(--tj-indigo)',
            fontVariantNumeric: 'tabular-nums',
          }}
        />
      ))}
    </div>
  );
}
