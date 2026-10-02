import { useRef, useEffect, type KeyboardEvent, type ClipboardEvent } from 'react';

interface OtpCodeInputProps {
  value: string;
  onChange: (next: string) => void;
  /** Fired when the last box is filled, so the form can submit without a second click. */
  onComplete?: (code: string) => void;
  length?: number;
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
}

/**
 * Six separate boxes rather than one text field: it makes the expected length
 * obvious at a glance, and a code pasted from an SMS lands correctly in all of
 * them instead of only the first.
 */
export function OtpCodeInput({
  value,
  onChange,
  onComplete,
  length = 6,
  disabled = false,
  invalid = false,
  autoFocus = false,
}: OtpCodeInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const commit = (next: string) => {
    onChange(next);
    if (next.length === length) onComplete?.(next);
  };

  const handleChange = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return;

    // Typing over a filled box replaces that one digit; a longer run (autofill
    // from the SMS suggestion bar) fills forward from here.
    const chars = value.padEnd(length, ' ').split('');
    for (let i = 0; i < digits.length && index + i < length; i++) {
      chars[index + i] = digits[i];
    }
    const next = chars.join('').replace(/\s+$/, '').slice(0, length);
    commit(next);

    const landed = Math.min(index + digits.length, length - 1);
    refs.current[landed]?.focus();
    refs.current[landed]?.select();
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      // Clearing a filled box keeps the caret; clearing an empty one steps back.
      if (value[index]) {
        commit(value.substring(0, index) + value.substring(index + 1));
        return;
      }
      if (index > 0) {
        commit(value.substring(0, index - 1));
        refs.current[index - 1]?.focus();
      }
      return;
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      refs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      refs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!digits) return;
    commit(digits);
    refs.current[Math.min(digits.length, length - 1)]?.focus();
  };

  return (
    <div className="flex gap-2" role="group" aria-label={`${length}-digit verification code`}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={`Digit ${i + 1}`}
          maxLength={length}
          disabled={disabled}
          value={value[i] ?? ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className="w-11 h-12 text-center text-lg font-bold rounded-lg focus-ring transition-colors disabled:opacity-50"
          style={{
            background: 'var(--surface-2)',
            border: `1.5px solid ${invalid ? 'var(--color-danger)' : value[i] ? 'var(--color-primary)' : 'var(--border-default)'}`,
            color: 'var(--text-primary)',
          }}
        />
      ))}
    </div>
  );
}
