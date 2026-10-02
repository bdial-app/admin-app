# List filters — framework and per-section contract

Every admin list page gets the same filter surface, driven by a schema:

```
[ quick segments with live counts ]
[ search | inline selects | More filters (n) | ……… sort ]
[ More filters panel, grouped ]            (when open)
[ 141 of 218 match · chip × chip × · Clear all ]
```

## Using it on a page

```tsx
const KEYS = ['status', 'city', 'createdFrom', 'createdTo'] as const;
const { values, page, search, sort, update, replace, setSearch, setSort, setPage, hasNarrowing } = useUrlFilters(KEYS);
const { data } = useThings({ ...(values as ThingFilters), sort, page, limit, search });

<FilterBar
  defs={DEFS}                 // FilterDef[] — see types.ts; `inline: true` puts a def in the toolbar
  values={values} onChange={update} onReplace={replace}
  search={{ value: search, onChange: setSearch, placeholder: '…' }}
  sort={{ options: SORTS, value: sort, onChange: setSort, defaultLabel: 'Sort: newest first' }}
  segments={segments(counts)} // Segment[] — { label, patch, count? }
  resultCount={hasNarrowing ? data?.meta.total : undefined} totalCount={counts?.total}
/>
<DataTable … onPageChange={setPage} />   // no onSearch: the FilterBar owns search
```

Rules:
- Filter state lives only in the URL (`useUrlFilters`). No `useState` for filters.
- `values` are strings. Booleans are `'true' | 'false'`; absent means "don't filter".
- A `daterange` def with `key: 'created'` reads/writes `createdFrom` / `createdTo` (YYYY-MM-DD, IST calendar days, inclusive). A `numberrange` with `key: 'amount'` uses `amountMin` / `amountMax`.
- Use `Select` from `components/ui/filters` for every `<select>` on the page (it owns its chevron and padding; native rendering overlaps text in some browsers).
- Keep the schema in `src/components/<section>/<section>-filters.ts` next to the page, like `components/users/user-filters.ts`.
- Segments are the 4–8 questions an admin asks most. Each is a `patch` the bar can recognise as "on" when the current values equal it.
- Counts for segments and options come from a `GET …/filter-options` endpoint per section (cities with counts, segment counts). Cache 5 min. Never compute counts client-side from the current page.

## Backend conventions (bdial-service)

- Each list endpoint takes a validated query DTO (`class-validator`, `@IsIn` for enums, `@IsISO8601` for dates, `@Type(() => Number)` for numbers). Unknown params are rejected by the global pipe, so the DTO is the contract.
- Date filters compare IST calendar days: `(col AT TIME ZONE 'Asia/Kolkata')::date >= :from::date`.
- `search` is `ILIKE %term%` across the fields listed per section.
- `sort` is an enum per section with a sensible default; never accept raw column names.
- Pagination returns `{ items, meta: { total, page, limit, totalPages } }`. Where a page's service already normalises another shape (payments/subscriptions/vouchers), keep the old top-level keys too, so nothing else breaks.
- Each section gets `GET …/filter-options` → `{ cities?: [{name,count}], …option lists…, counts: { <segment>: n } }`.

## Per-section contract

Common to every section with a provider/user join: `search`, `city` (exact, case-insensitive, via the provider's or user's city), a creation `daterange`, `sort`, `page`, `limit`.

### Products — `GET /admin/products`
Params: `search` (name, description, provider brand), `isActive`, `productType` (product|service), `priceMin`, `priceMax`, `hasImages`, `hasPrice`, `isHero`, `categoryId`, `city`, `providerStatus` (unverified|active|suspended|disabled), `providerId`, `sort` (name_asc|name_desc|price_asc|price_desc|display_order; default display_order). Drop the broken `createdAt` sort (no column).
Filter-options: `{ cities, categories: [{id,name,count}], counts: { total, active, disabled, services, noImages, noPrice, hero } }`.
Segments: All · Active · Without photos · Without price · Services · Hero items.
Toolbar: status, type, category. Panel — Listing: images, price, hero, price range; Business: city, business status.

### Verifications — `GET /admin/verifications`
Params: `search`, `status` (overall: pending|in_review|approved|rejected), `aadhaar` (pending|approved|rejected), `ijamat` (pending|approved|rejected|not_submitted), `submittedFrom/To` (created_at), `reviewedFrom/To`, `waitingDays` (int: created more than N days ago and not approved/rejected), `city` (user.city), `hasProvider`, `reviewer` (reviewed_by uuid), `sort` (oldest|newest|waiting_longest; default oldest). Accept both `limit` and legacy `rows`. Return `createdAt`, `user.city`, `waitingDays` on each row.
Filter-options: `{ cities, reviewers: [{id,name,count}], counts: { total, needsReview, waiting3d, approvedThisWeek, rejected, ijamatMissing } }`.
Segments: Needs review · Waiting 3+ days · Approved this week · Rejected · iJamat not submitted.
Toolbar: status, aadhaar, submitted date. Panel — Documents: ijamat; Review: reviewer, reviewed date, waiting days; Applicant: city, has business.

### Chat — `GET /admin/chat/conversations`
Params: `search`, `status` (active|archived|closed), `type` (direct|enquiry), `contextType` (product|provider), `createdFrom/To`, `lastMessageFrom/To`, `hasRedacted` (EXISTS messages.deleted_at IS NOT NULL — replaces the non-existent column), `unanswered` (last_message_sender_id is the customer participant), `reported` (EXISTS reports where entity_type='message' and entity_id in the conversation's messages), `blocked` (any participant blocked_at not null), `minMessages` (int), `inactiveDays` (last_message_at older than N days), `city` (the provider participant's providers.city), `sort` (recent|oldest|most_messages; default recent). Return `messageCount`, `providerCity` on rows.
Filter-options: `{ cities, counts: { total, active, enquiries, unanswered, reported, redacted, stale30d } }`.
Segments: All · Enquiries · Unanswered by business · Reported · Has redactions · Stale 30d+.
Toolbar: status, type, last message date. Panel — Safety: reported, redacted, blocked; Activity: unanswered, inactive days, min messages; Context: context type, city.

### Photos — `GET /admin/photos` (rewrite: one UNION ALL query, real pagination)
Params: `type` (provider|review|product), `search` (brand/product name), `city`, `providerStatus`, `uploadedFrom/To` (provider photos only; others have no date and are excluded when a date filter is set), `sort` (newest|oldest; rows without a date last). Return `{ items, meta }` with a stable `id` (`${type}:${rowId}:${index}`).
Filter-options: `{ cities, counts: { total, provider, review, product, uploadedThisWeek } }`.
Segments: All · Business galleries · Review photos · Product photos · Uploaded this week.
Toolbar: type, city, uploaded date. The page adds a pager under the grid.

### Sponsorships — `GET /admin/sponsorships`
Keep existing params; add `opStatus` (live|scheduled|expired|stopped|exhausted|pending|rejected — computed server-side the way the UI's getOperationalStatus does), `billingMode`, `createdFrom/To`, `endsFrom/To`, `budgetMin/Max`, `spentPctMin` (0–100), `city` (provider city or target_cities contains), `minImpressions`, `sort` (newest|ending_soon|spend_desc|impressions_desc|clicks_desc|ctr_desc).
Filter-options: `{ cities, counts: { total, live, pending, ending7d, budget80, adminGranted, rejected } }`.
Segments: Live · Pending approval · Ending in 7 days · Budget ≥ 80% used · Admin granted · Rejected.
Toolbar: operational status, type, approval. Panel — Money: billing, budget range, spend %; Timing: created, ends; Targeting: city, min impressions; Source: source.

### Offers — `GET /admin/offers`
Params: `search` (title, provider brand), `isActive`, `approvalStatus` (server-side; removes the client-side page-only filter), `opStatus` (live|scheduled|expired|exhausted|inactive), `discountType`, `discountMin/Max`, `endsFrom/To`, `createdFrom/To`, `usage` (never|used|exhausted), `city`, `categoryId`, `sort` (newest|ending_soon|most_used|discount_desc). Also fix route order so `/admin/offers/pending` is declared before `offers/:id`.
Filter-options: `{ cities, counts: { total, live, pending, ending7d, expired, neverUsed } }`.
Segments: Live now · Pending approval · Expiring in 7 days · Expired · Never used.
Toolbar: operational status, approval, discount type. Panel — Value: discount range, usage; Timing: ends, created; Business: city, category.

### Payments — `GET /admin/payments`
Keep params; add `amountMin/Max`, `hasVoucher` (voucher_id not null or discount_amount > 0), `city`, `providerId`, `sort` (newest|oldest|amount_desc|amount_asc). `dateFrom/To` must accept YYYY-MM-DD and compare IST days.
Filter-options: `{ cities, gateways: [{value,count}], counts: { total, succeeded, failed, refunded, today, thisMonth, withVoucher } }`.
Segments: All · Succeeded · Failed · Refunded · Today · This month · With voucher.
Toolbar: status, type, date. Panel — Payment: gateway, amount range, voucher; Business: city.

### Subscriptions — `GET /admin/subscriptions`
Keep params; add `gateway` (razorpay|apple), `renewingWithinDays`, `cancelAtPeriodEnd`, `periodEndFrom/To`, `city`, `sort` (newest|period_end_asc|period_end_desc).
Filter-options: `{ cities, plans: [{id,name,count}], counts: { total, active, trialing, pastDue, cancelling, renews7d, apple } }`.
Segments: Active · Trialing · Past due · Cancelling · Renews in 7 days · Apple.
Toolbar: status, plan, billing. Panel — Billing: gateway, cancelling; Timing: renews within, period end, created; Business: city.

### Vouchers — `GET /admin/vouchers`
Keep params; add `opStatus` (live|scheduled|expired|exhausted|inactive), `applicableTo` (one payment type contained in applicable_to), `usage` (never|used|exhausted), `expiringWithinDays`, `validFrom/To` (valid_until window), `createdBy`, `sort` (newest|expiring_soon|most_used).
Filter-options: `{ creators: [{id,name,count}], counts: { total, live, expiring7d, neverUsed, exhausted, expired } }`.
Segments: Live · Expiring in 7 days · Never used · Exhausted · Expired.
Toolbar: operational status, discount type, applicable to. Panel — Usage: usage, expiring within; Timing: valid until, created; Admin: created by.

### Revenue — new `GET /admin/payments/revenue`
Params: `from`, `to` (YYYY-MM-DD, default last 30 days), `granularity` (day|week|month; default by range length), `types` (comma list of payment types), `gateway`, `city`, `planId`, `compare` ('true' adds the previous period of equal length).
Returns `{ range: {from,to,granularity}, totals: { revenue, transactions, avgOrder, refunds, mrr, activeSubscriptions }, previous?: { revenue, transactions, refunds }, series: [{ bucket, revenue, transactions, byType: {type: revenue} }], byType: [{type,count,revenue}], byGateway, byCity: top 10, byPlan, topProviders: top 10 }`.
Page: a date-range (presets: 7d, 30d, 90d, this month, last month, custom) + type multi-chips + gateway + city + plan + "compare with previous" toggle; KPI tiles show deltas when comparing; the time series chart follows the chart conventions already used in `pages/Analytics.tsx`. Keep the existing `/analytics` sections below the new filtered block.
