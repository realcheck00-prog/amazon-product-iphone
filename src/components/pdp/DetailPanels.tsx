import { technicalDetails, productInformation } from '@/data/product'
import { Panel } from '@/components/ui/Panel'

export function TechnicalDetailsPanel() {
  return (
    <Panel id="details" title="Technical Details">
      <div className="grid gap-x-10 gap-y-6 md:grid-cols-2">
        {technicalDetails.map((group) => (
          <section key={group.heading}>
            <h3 className="mb-1.5 text-sm font-semibold text-ink">{group.heading}</h3>
            <ul className="space-y-1">
              {group.rows.map((row, i) => (
                <li
                  key={`${group.heading}-${i}`}
                  className="flex flex-wrap gap-x-2 text-sm leading-relaxed text-ink-2"
                >
                  {row.label ? (
                    <>
                      <span className="font-medium text-ink">{row.label}</span>
                      <span className="text-ink-4">|</span>
                    </>
                  ) : null}
                  <span>{row.value}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Panel>
  )
}

export function ProductInformationPanel() {
  return (
    <Panel title="Product information">
      <h3 className="text-sm font-semibold text-ink">
        {productInformation.heading}
      </h3>

      <table className="mt-3 w-full table-fixed border-collapse text-sm">
        <caption className="sr-only">Manufacturer, origin and dimensions</caption>
        <tbody>
          {productInformation.technicalDetails.map((row, i) => (
            <tr key={row.label} className={i % 2 === 0 ? 'bg-surface-sunken' : undefined}>
              <th scope="row" className="w-2/5 px-3 py-2 text-left align-top font-medium text-ink">
                {row.label}
              </th>
              <td className="px-3 py-2 align-top text-ink-2">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="mt-6 text-base font-semibold text-ink">Additional Information</h3>
      <table className="mt-3 w-full table-fixed border-collapse text-sm">
        <caption className="sr-only">Additional manufacturer and packing information</caption>
        <tbody>
          {productInformation.additionalInformation.map((row, i) => (
            <tr key={row.label} className={i % 2 === 0 ? 'bg-surface-sunken' : undefined}>
              <th scope="row" className="w-2/5 px-3 py-2 text-left align-top font-medium text-ink">
                {row.label}
              </th>
              <td className="px-3 py-2 align-top text-ink-2">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  )
}