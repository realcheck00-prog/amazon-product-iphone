import { useState } from 'react'
import { BadgeCheck, Sparkles } from 'lucide-react'
import { customerSay, ratingBreakdown, reviewAspects, topReviews } from '@/data/product'
import { Panel } from '@/components/ui/Panel'
import { StarRating } from '@/components/ui/StarRating'
import { Chip } from '@/components/ui/Chip'

const shownReviews = 4

export function ReviewsSection() {
  const [limit, setLimit] = useState(shownReviews)
  const reviews = topReviews.slice(0, limit)

  return (
    <div id="reviews" className="scroll-mt-28 space-y-4">
      {/* Rating summary */}
      <Panel>
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-10">
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-3xl font-semibold text-ink">4.7</span>
            <div>
              <StarRating value={4.7} size="lg" />
              <p className="mt-1 text-sm text-ink-3">654 global ratings</p>
            </div>
          </div>

          <ul className="flex-1 space-y-1.5">
            {ratingBreakdown.map((row) => (
              <li key={row.stars} className="flex items-center gap-2.5 text-xs">
                <span className="tnum w-14 shrink-0 text-ink-2">
                  {row.stars} star
                  {row.stars > 1 ? 's' : ''}
                </span>
                <span className="h-2 flex-1 overflow-hidden rounded-pill bg-surface-muted">
                  <span
                    className="block h-full rounded-pill bg-star"
                    style={{ width: `${row.percent}%` }}
                  />
                </span>
                <span className="tnum w-9 shrink-0 text-right text-ink-3">{row.percent}%</span>
              </li>
            ))}
          </ul>

          <div className="min-w-0 md:max-w-xs">
            <p className="text-xs leading-relaxed text-ink-3">
              To calculate the overall star rating and percentage breakdown by star, we don’t use a
              simple average. Instead, our system considers things like how recent a review is and
              if the reviewer bought the item.
            </p>
          </div>
        </div>
      </Panel>

      {/* Customers say */}
      <Panel title="Customers say">
        <div className="flex flex-wrap items-start gap-3">
          <Chip tone="info">
            <Sparkles className="size-3" aria-hidden />
            AI Generated from the text of customer reviews
          </Chip>
        </div>
        <p className="mt-2.5 text-sm leading-relaxed text-ink-2">{customerSay.body}</p>

        <ul className="mt-4 flex flex-wrap gap-2">
          {reviewAspects.map((a) => (
            <li key={a.aspect}>
              <Chip tone="neutral">
                {a.aspect}
                <span className="tnum text-ink-4">({a.mentions})</span>
              </Chip>
            </li>
          ))}
        </ul>
      </Panel>

      {/* Aspect breakdown */}
      <Panel title="What customers mention">
        <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
          {reviewAspects.map((aspect) => {
            const total = aspect.positive + aspect.negative || 1
            return (
              <article key={aspect.aspect} className="min-w-0">
                <header className="flex items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold text-ink">
                    {aspect.aspect}{' '}
                    <span className="tnum font-normal text-ink-4">({aspect.mentions})</span>
                  </h3>
                  <span className="tnum shrink-0 text-xs text-success">
                    {Math.round((aspect.positive / total) * 100)}% positive
                  </span>
                </header>
                <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-pill bg-surface-muted">
                  <span
                    className="block bg-success"
                    style={{ width: `${(aspect.positive / total) * 100}%` }}
                  />
                  <span
                    className="block bg-deal"
                    style={{ width: `${(aspect.negative / total) * 100}%` }}
                  />
                </div>
                <p className="mt-2 text-sm leading-relaxed text-ink-2">{aspect.summary}</p>
                <ul className="mt-2 space-y-1.5">
                  {aspect.quotes.slice(0, 2).map((quote) => (
                    <li key={quote} className="text-xs leading-relaxed text-ink-3">
                      “{quote}”
                    </li>
                  ))}
                </ul>
              </article>
            )
          })}
        </div>
      </Panel>

      {/* Top reviews */}
      <Panel
        title="Top reviews from India"
        action={
          <button
            type="button"
            onClick={() => setLimit((l) => (l === topReviews.length ? shownReviews : l + 4))}
            className="shrink-0 text-sm link link-underline"
          >
            {limit === topReviews.length ? 'Show fewer' : 'See more reviews'}
          </button>
        }
      >
        <ul className="divide-y divide-line-soft">
          {reviews.map((review) => (
            <li key={review.author + review.date} className="py-4 first:pt-0 last:pb-0">
              <article>
                <header className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-sm font-medium text-ink">{review.author}</span>
                  <StarRating value={review.stars} size="sm" />
                  <span className="text-xs text-ink-3">{review.stars} out of 5 stars</span>
                </header>
                <h3 className="mt-1 text-sm font-semibold text-ink">{review.title}</h3>
                <p className="mt-0.5 text-xs text-ink-3">
                  Reviewed in India on {review.date}
                  {review.colour && review.size && (
                    <>
                      {' '}
                      · Colour: {review.colour} · Size: {review.size}
                    </>
                  )}
                  {review.verified && (
                    <span className="ml-1.5 inline-flex items-center gap-1 text-success">
                      <BadgeCheck className="size-3.5" aria-hidden />
                      Verified Purchase
                    </span>
                  )}
                </p>
                {review.body.split('\n').map((para, i) => (
                  <p key={i} className="mt-2 text-sm leading-relaxed text-ink-2">
                    {para}
                  </p>
                ))}
                {review.helpful && (
                  <p className="mt-2 text-xs text-ink-3">{review.helpful}</p>
                )}
              </article>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}