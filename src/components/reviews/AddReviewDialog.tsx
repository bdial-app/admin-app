import { useState, useEffect, useCallback } from 'react';
import { X, Star, Loader2, Search, UserRound, Info } from 'lucide-react';
import { toast } from 'react-toastify';
import { ProviderPicker, type PickedProvider } from '../ui/ProviderPicker';
import { useCreateReview } from '../../hooks/useReviews';
import { useUsers } from '../../hooks/useUsers';

type ApiError = {
  response?: { data?: { message?: string; field?: string } };
};
const errBody = (err: unknown) => (err as ApiError)?.response?.data;

interface AddReviewDialogProps {
  open: boolean;
  onClose: () => void;
  /** Pre-selected business, when opened from a provider's own page. */
  provider?: PickedProvider | null;
}

const RATING_WORDS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];
const today = () => new Date().toISOString().slice(0, 10);

export function AddReviewDialog({ open, onClose, provider = null }: AddReviewDialogProps) {
  if (!open) return null;
  return <AddReviewForm onClose={onClose} provider={provider} />;
}

function AddReviewForm({
  onClose,
  provider,
}: {
  onClose: () => void;
  provider: PickedProvider | null;
}) {
  const [picked, setPicked] = useState<PickedProvider | null>(provider);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState('');
  const [postedAt, setPostedAt] = useState(today());
  const [reviewer, setReviewer] = useState<{ id: string; name: string } | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [debouncedUser, setDebouncedUser] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createReview = useCreateReview();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedUser(userSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [userSearch]);

  const { data: userData, isFetching: usersLoading } = useUsers({
    page: 1,
    limit: 6,
    search: debouncedUser || undefined,
  });

  const close = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [close]);

  const submit = async () => {
    const next: Record<string, string> = {};
    if (!picked) next.providerId = 'Choose the business this review is for';
    if (rating < 1) next.starRating = 'Pick a rating from 1 to 5';
    setErrors(next);
    if (Object.keys(next).length) return;

    try {
      await createReview.mutateAsync({
        providerId: picked!.id,
        reviewerId: reviewer?.id,
        starRating: rating,
        reviewText: text.trim() || undefined,
        postedAt: postedAt || undefined,
      });
      toast.success(`${rating}-star review recorded for ${picked!.name}`);
      onClose();
    } catch (err) {
      const data = errBody(err);
      if (data?.field && data.message) setErrors({ [data.field]: data.message });
      toast.error(data?.message || 'Could not record the review');
    }
  };

  const shown = hover || rating;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4"
      onClick={close}
    >
      <div
        className="w-[min(540px,100%)] max-h-[88vh] flex flex-col overflow-hidden rounded-xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Add a review"
        style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b shrink-0" style={{ borderColor: 'var(--border-default)' }}>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Add a review</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              For feedback collected offline or carried over from an older system
            </p>
          </div>
          <button onClick={close} aria-label="Close" className="p-1.5 rounded-lg hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
          {/* Business */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Business *
            </label>
            <ProviderPicker
              value={picked}
              locked={!!provider}
              invalid={!!errors.providerId}
              onChange={(p) => { setPicked(p); setErrors((e) => ({ ...e, providerId: '' })); }}
            />
            {errors.providerId && (
              <p className="text-[11px] mt-1" style={{ color: 'var(--color-danger)' }}>{errors.providerId}</p>
            )}
          </div>

          {/* Rating */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Rating *
            </label>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-label={`${n} star${n > 1 ? 's' : ''}`}
                    onMouseEnter={() => setHover(n)}
                    onClick={() => { setRating(n); setErrors((e) => ({ ...e, starRating: '' })); }}
                    className="p-0.5 transition-transform active:scale-90"
                  >
                    <Star
                      className="w-6 h-6"
                      style={{
                        fill: n <= shown ? '#F59E0B' : 'transparent',
                        color: n <= shown ? '#F59E0B' : 'var(--border-default)',
                      }}
                    />
                  </button>
                ))}
              </div>
              <span className="text-sm font-semibold" style={{ color: shown ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {shown ? RATING_WORDS[shown] : 'No rating yet'}
              </span>
            </div>
            {errors.starRating && (
              <p className="text-[11px] mt-1" style={{ color: 'var(--color-danger)' }}>{errors.starRating}</p>
            )}
          </div>

          {/* Reviewer — optional on purpose */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Reviewer
            </label>
            {reviewer ? (
              <div className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg" style={{ background: 'var(--surface-1)', border: '1px solid var(--color-primary)' }}>
                <span className="flex items-center gap-2 min-w-0">
                  <UserRound className="w-4 h-4 shrink-0" style={{ color: 'var(--color-primary)' }} />
                  <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{reviewer.name}</span>
                </span>
                <button type="button" onClick={() => setReviewer(null)} className="text-xs font-semibold shrink-0" style={{ color: 'var(--color-primary)' }}>
                  Clear
                </button>
              </div>
            ) : (
              <div>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                  <input
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search a user by name or number…"
                    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg focus-ring"
                    style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                  />
                </div>
                {debouncedUser && (
                  <div className="mt-1.5 max-h-40 overflow-y-auto rounded-lg" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
                    {(userData?.items ?? []).length === 0 ? (
                      <p className="text-xs px-3 py-3" style={{ color: 'var(--text-muted)' }}>
                        {usersLoading ? 'Searching…' : 'No user by that name or number'}
                      </p>
                    ) : (
                      (userData?.items ?? []).map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => { setReviewer({ id: u.id, name: u.name }); setUserSearch(''); setDebouncedUser(''); }}
                          className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:opacity-80"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          <span className="truncate font-medium">{u.name}</span>
                          {u.mobileNumber && (
                            <span className="text-xs ml-auto shrink-0 tabular-nums" style={{ color: 'var(--text-muted)' }}>{u.mobileNumber}</span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
            <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
              Optional. Naming the person keeps the review attributable; leave it blank to record it unattributed.
            </p>
          </div>

          {/* Text */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Review text
            </label>
            <textarea
              value={text}
              maxLength={2000}
              rows={4}
              onChange={(e) => { setText(e.target.value); setErrors((er) => ({ ...er, reviewText: '' })); }}
              placeholder="What did they say about this business?"
              className="w-full px-3 py-2.5 text-sm rounded-lg focus-ring"
              style={{
                background: 'var(--surface-1)',
                border: `1px solid ${errors.reviewText ? 'var(--color-danger)' : 'var(--border-default)'}`,
                color: 'var(--text-primary)',
                resize: 'none',
              }}
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-[11px]" style={{ color: errors.reviewText ? 'var(--color-danger)' : 'var(--text-muted)' }}>
                {errors.reviewText || 'Optional — a rating on its own is fine.'}
              </p>
              <span className="text-[10px] tabular-nums" style={{ color: 'var(--text-muted)' }}>{text.length}/2000</span>
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Date given
            </label>
            <input
              type="date"
              value={postedAt}
              max={today()}
              onChange={(e) => { setPostedAt(e.target.value); setErrors((er) => ({ ...er, postedAt: '' })); }}
              className="px-3 py-2.5 text-sm rounded-lg focus-ring"
              style={{
                background: 'var(--surface-1)',
                border: `1px solid ${errors.postedAt ? 'var(--color-danger)' : 'var(--border-default)'}`,
                color: 'var(--text-primary)',
              }}
            />
            <p className="text-[11px] mt-1" style={{ color: errors.postedAt ? 'var(--color-danger)' : 'var(--text-muted)' }}>
              {errors.postedAt || 'Use the original date when carrying over older feedback.'}
            </p>
          </div>

          <div className="flex gap-2 p-3 rounded-lg" style={{ background: 'var(--surface-1)' }}>
            <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }} />
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              This is recorded against your admin account in the audit log, and it changes the
              business&apos;s average rating straight away.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 px-5 py-3 border-t shrink-0" style={{ borderColor: 'var(--border-default)' }}>
          <button onClick={close} className="ml-auto px-4 py-2 text-sm font-medium rounded-lg" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}>
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={createReview.isPending}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg text-white disabled:opacity-50"
            style={{ background: 'var(--color-primary)' }}
          >
            {createReview.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Add review'}
          </button>
        </div>
      </div>
    </div>
  );
}
