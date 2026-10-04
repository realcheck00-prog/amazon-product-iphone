import { RotateCcw, ShieldCheck } from 'lucide-react'
import { replacementPolicy, warrantyCards } from '@/data/product'
import { Panel } from '@/components/ui/Panel'
import { Disclosure } from '@/components/ui/Disclosure'

export function ReturnsPanel() {
  const [first, ...rest] = warrantyCards

  return (
    <Panel title="Warranty, returns & policies">
      <div className="space-y-4">
        <section className="rounded-md bg-surface-sunken p-3.5 ring-1 ring-line">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <RotateCcw className="size-4 text-ink-3" aria-hidden />
            {first.title}
          </h3>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[30rem] border-collapse text-xs">
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="py-1.5 pr-3 text-left font-semibold text-ink">
                    Replacement Reason
                  </th>
                  <th scope="col" className="py-1.5 pr-3 text-left font-semibold text-ink">
                    Replacement Period
                  </th>
                  <th scope="col" className="py-1.5 text-left font-semibold text-ink">
                    Replacement Policy
                  </th>
                </tr>
              </thead>
              <tbody>
                {replacementPolicy.rows.map((row) => (
                  <tr key={row.reason} className="border-b border-line-soft last:border-b-0">
                    <td className="py-2 pr-3 align-top text-ink-2">{row.reason}</td>
                    <td className="py-2 pr-3 align-top text-ink-2">{row.period}</td>
                    <td className="py-2 align-top text-ink-2">{row.policy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 space-y-2 text-xs leading-relaxed text-ink-2">
            <p>{replacementPolicy.defectiveNote}</p>
            <p>{replacementPolicy.physicalDamageNote}</p>
          </div>
        </section>

        <div>
          {rest.map((card) => (
            <Disclosure key={card.title} summary={card.title}>
              <p>{card.body}</p>
            </Disclosure>
          ))}
        </div>

        <section className="grid gap-4 border-t border-line-soft pt-4 sm:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold text-ink">Replacement verification</h3>
            <p className="mt-1 text-xs leading-relaxed text-ink-2">
              {replacementPolicy.verification}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink">Replacement Instructions</h3>
            <p className="mt-1 text-xs leading-relaxed text-ink-2">
              {replacementPolicy.instructions}
            </p>
          </div>
        </section>

        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line-soft pt-3 text-xs">
          <a href="#returns" className="link link-underline">
            Read full returns policy
          </a>
          <a href="#warranty" className="link link-underline">
            Warranty details
          </a>
          <span className="inline-flex items-center gap-1.5 text-ink-3">
            <ShieldCheck className="size-3.5" aria-hidden />
            Secure transaction
          </span>
        </p>
      </div>
    </Panel>
  )
}