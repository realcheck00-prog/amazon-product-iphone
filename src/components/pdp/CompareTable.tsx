import { Check } from 'lucide-react'
import { compareProducts } from '@/data/product'
import { Panel } from '@/components/ui/Panel'
import { Chip } from '@/components/ui/Chip'
import { StarRating } from '@/components/ui/StarRating'

export function CompareTable() {
  const { columns, rows } = compareProducts

  return (
    <Panel id="compare" title="Compare with similar items" bodyClassName="!px-0 md:!px-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] border-collapse text-left text-xs">
          <caption className="sr-only">
            Specification comparison across iPhone 17 Pro Max, iPhone 17 Pro, iPhone Air and iPhone
            16 Pro Max
          </caption>
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-10 w-44 bg-surface px-5 py-3">
                <span className="text-2xs tracking-wide text-ink-4">DEVICE</span>
              </th>
              {columns.map((name, i) => (
                <th
                  key={name}
                  scope="col"
                  className={`px-4 py-3 align-top ${i === 0 ? 'bg-surface-sunken' : ''}`}
                >
                  <span
                    className={`block text-sm font-semibold ${i === 0 ? 'text-ink' : 'text-ink-2'}`}
                  >
                    {name}
                  </span>
                  {i === 0 && (
                    <span className="mt-1 inline-flex">
                      <Chip tone="success">This product</Chip>
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-line-soft">
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-surface px-5 py-2.5 align-top text-2xs font-semibold tracking-wide text-ink-3"
                >
                  {row.label}
                </th>
                {row.values.map((value, ci) => (
                  <td
                    key={ci}
                    className={`px-4 py-2.5 align-top leading-relaxed ${
                      ci === 0 ? 'bg-surface-sunken font-medium text-ink' : 'text-ink-2'
                    }`}
                  >
                    {typeof value === 'boolean' ? (
                      value ? (
                        <Check
                          className="size-4 text-success"
                          aria-label="Supported"
                          role="img"
                        />
                      ) : (
                        <span className="text-ink-4" aria-label="Not supported">
                          —
                        </span>
                      )
                    ) : row.label === 'RATINGS' && ci === 0 ? (
                      <span className="inline-flex items-center gap-1.5">
                        <StarRating value={4.7} size="sm" />
                        {value}
                      </span>
                    ) : (
                      value
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}