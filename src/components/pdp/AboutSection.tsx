import { useState } from 'react'
import { highlightsStrip, aboutThisItem } from '@/data/product'
import { Panel } from '@/components/ui/Panel'

export function AboutSection() {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? aboutThisItem : aboutThisItem.slice(0, 5)

  return (
    <div id="about" className="scroll-mt-28 space-y-4">
      {/* Quick-facts strip */}
      <Panel title="Product details at a glance">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
          {highlightsStrip.map((item) => (
            <div key={item.label}>
              <dt className="text-2xs leading-tight text-ink-3">{item.label}</dt>
              <dd className="mt-0.5 text-sm font-medium text-ink">{item.value}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      {/* About this item */}
      <Panel title="About this item">
        <ul className="space-y-3.5">
          {visible.map((item) => (
            <li key={item.heading}>
              <h3 className="text-sm font-semibold tracking-[0.01em] text-ink">{item.heading}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-2">{item.body}</p>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-link hover:underline"
        >
          {expanded ? 'Show less' : 'Show more'}
          <span aria-hidden>{expanded ? '⌃' : '›'}</span>
          <span className="ml-1 font-normal text-ink-3">See more product details</span>
        </button>
      </Panel>
    </div>
  )
}