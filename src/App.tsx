import { ProductHeader } from '@/components/pdp/ProductHeader'
import { PriceBlock } from '@/components/pdp/PriceBlock'
import { EmiBlock } from '@/components/pdp/EmiBlock'
import { ImageGallery } from '@/components/pdp/ImageGallery'
import { OffersStrip } from '@/components/pdp/OffersStrip'
import { WarrantyHighlights } from '@/components/pdp/WarrantyHighlights'
import { VariantSelector } from '@/components/pdp/VariantSelector'
import { ProtectionPlan } from '@/components/pdp/ProtectionPlan'
import { BuyBox } from '@/components/pdp/BuyBox'
import { AboutSection } from '@/components/pdp/AboutSection'
import { TechnicalDetailsPanel, ProductInformationPanel } from '@/components/pdp/DetailPanels'
import { ReviewsSection } from '@/components/pdp/ReviewsSection'
import { CompareTable } from '@/components/pdp/CompareTable'
import { ReturnsPanel } from '@/components/pdp/ReturnsPanel'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SectionNav } from '@/components/layout/SectionNav'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { PdpProvider } from '@/state/PdpProvider'

export default function App() {
  return (
    <PdpProvider>
      <div id="top" className="min-h-dvh bg-page">
        <a
          href="#about"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-ink focus:px-3 focus:py-2 focus:text-sm focus:text-white"
        >
          Skip to product details
        </a>

        <SiteHeader />
        <SectionNav />

        <main className="page-gutter mx-auto max-w-page py-4">
          <Breadcrumbs
            className="mb-3"
            items={[
              { label: 'All', href: '#top' },
              { label: 'Electronics', href: '#top' },
              { label: 'Mobiles', href: '#top' },
              { label: 'Apple', href: '#top' },
              { label: 'iPhone 17 Pro Max' },
            ]}
          />

          {/*
            Desktop mirrors the reference's three-column PDP:
            gallery | product information | buy box.
            Below `lg` it collapses to a single column in reading order.
          */}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.06fr)_20rem] xl:gap-8">
            {/* Column 1 — gallery */}
            <div className="min-w-0">
              <div className="lg:sticky lg:top-[calc(2rem+3.5rem+2.75rem)]">
                <ImageGallery />
              </div>
            </div>

            {/* Column 2 — product information */}
            <div className="min-w-0 space-y-4">
              <ProductHeader />
              <div className="panel p-4">
                <PriceBlock />
                <div className="mt-2.5">
                  <EmiBlock />
                </div>
              </div>
              <OffersStrip />
              <WarrantyHighlights />
              <div className="panel p-4">
                <VariantSelector />
              </div>
              <ProtectionPlan />
              <AboutSection />
              <TechnicalDetailsPanel />
              <ProductInformationPanel />
              <ReturnsPanel />
              <ReviewsSection />
              <CompareTable />
            </div>

            {/* Column 3 — buy box */}
            <div className="min-w-0">
              <BuyBox />
            </div>
          </div>
        </main>

        <SiteFooter />
      </div>
    </PdpProvider>
  )
}