/**
 * Product data for the demo storefront.
 *
 * EVERY value in this file is taken verbatim from the reference product page
 * (ASIN B0FQFNQ5LX, Amazon.in). Nothing here is invented. Where the reference
 * does not expose a value (per-variant pricing, alternate colour swatch names)
 * the entry is deliberately left `null` / omitted and the UI degrades to the
 * "See available options" affordance the reference itself uses.
 *
 * This is an unaffiliated demo interface — see `storefront.identity`.
 */

export const storefront = {
  /** Neutral demo identity. Not affiliated with or endorsed by Amazon. */
  name: 'Shopfront',
  tagline: 'Demo storefront — unaffiliated product page demo',
  market: 'amazon.in',
  deliverToPostalCode: '226003',
  deliverToCity: 'Lucknow',
} as const

export const product = {
  asin: 'B0FQFNQ5LX',
  brand: 'Apple',
  title:
    'Apple iPhone 17 Pro Max 256 GB: 17.42 cm (6.9″) Display with Promotion, A19 Pro Chip, Best Battery Life in Any iPhone Ever, Pro Fusion Camera System, Center Stage Front Camera; Cosmic Orange',
  /** Only the colour the reference renders as selected. */
  color: 'Cosmic Orange',
  storage: '256 GB',
  /** Reference renders a single selected configuration. */
  configuration: 'Without Protect+',
  visitStoreLabel: 'Visit the Apple Store',
  ratingValue: 4.7,
  ratingCount: 654,
  inStock: true,
} as const

export const price = {
  /** `₹1,42,490.00 with 5 percent savings` */
  dealBadge: '5%',
  amount: 142490,
  mrp: 149900,
  inclusiveOfTaxes: true,
  emi: {
    monthly: 5010,
    noCostEmiAvailable: true,
  },
} as const

export const fulfilment = {
  /** Verbatim from the reference buy box. */
  freeDeliveryLine: 'FREE delivery Tuesday, 6 October. Details',
  fastestDeliveryLine: 'Or fastest delivery Tomorrow, 5 October. Details',
  shipsFrom: 'Amazon',
  soldBy: 'Clicktech Retail Private Ltd',
  secureTransaction: true,
  giftOptions: {
    availableAtCheckout: true,
    detail:
      'At checkout, you can add a custom message, a gift receipt for easy returns and have the item gift-wrapped',
    cta: 'Add gift options at checkout',
  },
} as const

/** Quick-facts strip directly above the "About this item" bullets. */
export const highlightsStrip = [
  { label: 'Brand', value: 'Apple' },
  { label: 'Operating System', value: 'iOS' },
  { label: 'RAM Memory Installed Size', value: '0.1 GB' },
  { label: 'CPU Speed', value: '0.1 GHz' },
  { label: 'Memory Storage Capacity', value: '256 GB' },
] as const

export const aboutThisItem = [
  {
    heading: 'UNIBODY DESIGN. FOR EXCEPTIONAL POWER',
    body: 'Heat-forged aluminium unibody enclosure for the most powerful iPhone ever made.',
  },
  {
    heading: 'DURABLE CERAMIC SHIELD. FRONT AND BACK',
    body: 'Ceramic Shield protects the back of iPhone 17 Pro Max, making it 4x more resistant to cracks. And the new Ceramic Shield 2 on the front has 3x better scratch resistance.',
  },
  {
    heading: 'THE ULTIMATE PRO CAMERA SYSTEM',
    body: "With all 48MP rear cameras and 8x optical-quality zoom — the longest zoom ever on an iPhone. It's the equivalent of 8 pro lenses in your pocket.",
  },
  {
    heading: '18MP CENTER STAGE FRONT CAMERA',
    body: 'Flexible ways to frame your shot. Smarter group selfies, Dual Capture video for simultaneous front and rear recording, and more.',
  },
  {
    heading: 'A19 PRO CHIP. VAPOUR COOLED. LIGHTNING FAST',
    body: 'A19 Pro is the most powerful iPhone chip yet, delivering up to 40% better sustained performance.',
  },
  {
    heading: 'BEST BATTERY LIFE IN ANY IPHONE',
    body: 'The unibody design creates massive additional battery capacity, for up to 37 hours of video playback. Charge up to 50% in 20 minutes.',
  },
  {
    heading: 'iOS',
    body: 'A fresh design with Liquid Glass. Beautiful, delightful and instantly familiar. With a more vibrant Lock Screen, customisable backgrounds and polls in Messages, Call Screening and more.',
  },
  {
    heading: 'BUILT FOR APPLE INTELLIGENCE',
    body: 'Personal, private, powerful. Write, express yourself and get things done effortlessly.',
  },
  {
    heading: 'VITAL SAFETY FEATURES',
    body: "With Crash Detection, iPhone can detect a severe car crash and call for help if you can't.",
  },
  {
    heading: 'STRONGER CONNECTIVITY. SUPERFAST SPEEDS',
    body: 'Stay connected at faster speeds with secure connections to Wi-Fi 7, 5G networks and Bluetooth 6, plus eSIM.',
  },
] as const

/** Apple technical-spec block from the reference "Technical Details" section. */
export const technicalDetails: ReadonlyArray<{
  heading: string
  rows: ReadonlyArray<{ label: string; value: string }>
}> = [
  {
    heading: 'Display',
    rows: [
      { label: '', value: 'Super Retina XDR display' },
      { label: '', value: '17.42 cm / 6.9in (diagonal) all‑screen OLED display' },
      { label: '', value: '2868x1320-pixel resolution at 460 ppi' },
    ],
  },
  {
    heading: 'Capacity',
    rows: [{ label: '', value: '256 GB, 512 GB, 1 TB, 2 TB' }],
  },
  {
    heading: 'Splash, Water, and Dust Resistant',
    rows: [
      {
        label: '',
        value:
          'Rated IP68 (maximum depth of 6 metres up to 30 minutes) under IEC standard 60529',
      },
    ],
  },
  {
    heading: 'Camera & Video',
    rows: [
      { label: '', value: '48MP Pro Fusion camera system' },
      {
        label: '',
        value:
          '48MP Fusion Main: 24 mm, ƒ/1.78 aperture, second‑generation sensor‑shift optical image stabilisation, 100% Focus Pixels, support for super‑high‑resolution photos (24MP and 48MP)',
      },
      {
        label: '',
        value:
          'Also enables 12MP optical-quality 2x Telephoto: 48 mm, ƒ/1.78 aperture, second‑generation sensor‑shift optical image stabilisation, 100% Focus Pixels',
      },
      {
        label: '',
        value:
          '48MP Fusion Ultra Wide: 13 mm, ƒ/2.2 aperture and 120° field of view, Hybrid Focus Pixels, super‑high‑resolution photos (48MP)',
      },
      {
        label: '',
        value:
          '48MP Fusion Telephoto: 100 mm (4x), ƒ/2.8 aperture, Hybrid Focus Pixels, 3D sensor‑shift optical image stabilisation and autofocus, tetraprism design',
      },
      {
        label: '',
        value:
          'Also enables 12MP optical-quality 8x Telephoto: 200 mm, ƒ/2.8 aperture, Hybrid Focus Pixels, 3D sensor‑shift optical image stabilisation and autofocus, tetraprism design',
      },
      { label: '', value: '8x optical‑quality zoom in, 2x optical zoom out; 16x optical‑quality zoom range' },
      { label: '', value: 'Digital zoom up to 40x' },
    ],
  },
  {
    heading: 'Front Camera',
    rows: [
      { label: '', value: '18MP Center Stage camera' },
      { label: '', value: 'ƒ/1.9 aperture' },
      { label: '', value: 'Autofocus with Focus Pixels' },
      { label: '', value: 'Retina Flash' },
      { label: '', value: 'Tap to zoom and rotate' },
      { label: '', value: 'Centre Stage for photos' },
      { label: '', value: 'Ultra-stabilised video' },
      { label: '', value: 'Dual Capture' },
    ],
  },
  {
    heading: 'Power and Battery',
    rows: [
      { label: '', value: 'Video playback: Up to 37 hours' },
      { label: '', value: 'Video playback (streamed): Up to 33 hours' },
      { label: '', value: 'Built‑in rechargeable lithium‑ion battery' },
      { label: '', value: 'Fast-charge capable:' },
      {
        label: '',
        value:
          'Up to 50% charge in 20 minutes8 with 40W adapter or higher (available separately) paired with USB-C charging cable',
      },
      {
        label: '',
        value:
          'Up to 50% charge in 30 minutes8 with 30W adapter or higher paired with MagSafe Charger (both available separately)',
      },
    ],
  },
  {
    heading: 'In the box',
    rows: [
      { label: '', value: 'iPhone with iOS 26' },
      { label: '', value: 'USB‑C Charge Cable (1 m)' },
      { label: '', value: 'Documentation' },
    ],
  },
  {
    heading: 'Dimensions & Weight',
    rows: [
      { label: 'Height', value: '163.4 mm' },
      { label: 'Width', value: '78 mm' },
      { label: 'Depth', value: '8.75 mm' },
      { label: 'Weight', value: '231 g' },
    ],
  },
]

export const productInformation = {
  heading: `Apple iPhone 17 Pro Max 256 GB: 17.42 cm Mobile Phone Information`,
  technicalDetails: [
    { label: 'Manufacturer', value: 'Apple' },
    { label: 'Country of Origin', value: 'India' },
    { label: 'Item model number', value: 'MFYN4HN/A' },
    { label: 'Product Dimensions', value: '0.87 x 7.8 x 16.34 cm; 233 g' },
    { label: 'ASIN', value: 'B0FQFNQ5LX' },
  ],
  additionalInformation: [
    {
      label: 'Manufacturer',
      value:
        'Apple, Apple Inc, One Apple Park Way, Cupertino, CA 95014, USA. or Apple India Private Limited 13th Floor, Prestige Minsk Square, Municipal No. 6, Cubbon Road, Bengaluru, Karnataka - 560001, India',
    },
    { label: 'Packer', value: 'Not Applicable for Apple (Always)' },
    {
      label: 'Importer',
      value:
        '(If applicable) Apple India Private Limited 13th Floor, Prestige Minsk Square, Municipal No. 6, Cubbon Road, Bengaluru, Karnataka - 560001, India',
    },
    { label: 'Item Weight', value: '233 g' },
    { label: 'Item Dimensions LxWxH', value: '9 x 78 x 163 Millimeters' },
    { label: 'Net Quantity', value: '1 Count' },
    { label: 'Included Components', value: 'USB-C Charge Cable, iPhone 17 Pro Max' },
    { label: 'Generic Name', value: 'iPhone 17 Pro' },
  ],
} as const

export const offers = [
  {
    kind: 'Cashback',
    title: 'Upto ₹4,274.00 cashback as Amazon Pay Balance',
    detail: 'when you pay with Amazon Pay ICICI Bank Credit Cards',
    count: '1 offer',
  },
  {
    kind: 'No Cost EMI',
    title: 'Upto ₹6,416.16 EMI interest savings',
    detail: 'on Amazon Pay ICICI Bank Credit Cards',
    count: '1 offer',
  },
  {
    kind: 'Bank Offer',
    title: 'Upto ₹600.00 discount on HDFC Bank Credit Cards',
    detail: '',
    count: '5 offers',
  },
  {
    kind: 'Partner Offers',
    title: 'Get GST invoice and save up to 18% on business purchases.',
    detail: 'Sign up for free',
    count: '1 offer',
  },
] as const

export const warrantyCards = [
  {
    title: '10 days Service Centre Replacement',
    body: 'Replacement for defective items, and for physical damage, wrong or missing items, within 10 days from delivery.',
  },
  { title: 'Free Delivery', body: 'The product is eligible for Free delivery.' },
  { title: 'Warranty Policy', body: 'Apple One (1) Year Limited Warranty' },
  {
    title: 'Pay on Delivery',
    body: 'Pay on Delivery (Cash/Card) payment method includes Cash on Delivery (COD) as well as Debit card / Credit card / Net banking payments at your doorstep.',
  },
  {
    title: 'Top Brand',
    body: 'Top Brand indicates high quality, trusted brands on Amazon aggregated basis verified ratings, returns/refunds and recent order history at brand level.',
  },
  {
    title: 'Amazon Delivered',
    body: 'Order processed by Amazon; delivered through our courier partners',
  },
  {
    title: 'Secure transaction',
    body: "Your transaction is secure. We work hard to protect your security and privacy. Our payment security system encrypts your information during transmission. We don't share your credit card details with third-party sellers, and we don't sell your information to others.",
  },
] as const

export const replacementPolicy = {
  rows: [
    {
      reason: 'Defective Item',
      period: '10 days from delivery',
      policy: 'Apple warranty policy (at Service Centre)',
    },
    {
      reason: 'Physical Damage, Wrong and Missing Item',
      period: '10 days from delivery',
      policy: 'Replacement',
    },
  ],
  defectiveNote:
    "Defective item: Amazon may provide support via self-help guides or on call or at doorstep, as applicable. If this issue is not resolved, please contact Apple or visit the Service Centre. Apple will repair the product or provide a replacement or Defective certificate, as applicable. The time taken for resolution will be as per Apple warranty policies.",
  physicalDamageNote:
    'Physical Damage, Wrong, Missing Items: Returns will not be accepted if it is an Open Box Delivery order. Remote verification by image/video will be done by Amazon.',
  verification:
    'During on-call support, you may be prompted to upload an image for verification. Please visit the nearest Apple Service Centre for product-related issues. Further support will be provided by the brand at their service centre as per their warranty policies.',
  instructions:
    'Keep the item in its original condition and packaging along with MRP tag and accessories for a successful pick-up.',
} as const

export const protectionPlan = {
  title: 'Protect+ with AppleCare Services for iPhone 17 Pro Max (1 Year) (Email Delivery, No Physical Kit)',
  shortTitle: '1 Year Protect+ with AppleCare Service by Apple',
  price: 16999,
  seller: 'Service Lee Technologies Pvt. Ltd',
  note: 'Protect+ with AppleCare Services must be purchased with an applicable Apple product in the same Amazon order. This is a digital delivery only product, and no physical kit will be delivered.',
  benefits: [
    'Protect+ with AppleCare Services for iPhone includes unlimited incidents of accidental damage protection',
    'iCloud+ with 50GB of storage for data sharing and secure backups',
    'Pickup and delivery service across',
    'Same-day screen repair in most major metropolitan areas world wide',
    'Apple-certified repairs with genuine Apple parts at Apple Stores and Apple Authorized Service Providers around the world',
    'Battery and hardware coverage',
    'Priority access to Apple Support via phone or chat. Get service and support direct from Apple.',
  ],
} as const

export const variants = {
  /**
   * The reference only renders the *selected* colour name, so only the
   * selected colour is exposed here. `availableColors` is intentionally empty
   * rather than guessed — the UI shows "See available options".
   */
  colors: [{ name: 'Cosmic Orange', hex: '#c2622a', selected: true }],
  /** Sizes rendered as swatches by the reference. Prices are not published per variant. */
  storages: [
    { name: '256 GB', price: price.amount },
    { name: '512 GB', price: null },
    { name: '1 TB', price: null },
    { name: '2 TB', price: null },
  ],
  configurations: [
    { name: 'Without Protect+', selected: true },
    { name: 'With Apple Care', price: protectionPlan.price },
  ],
} as const

export const ratingBreakdown = [
  { stars: 5, percent: 86 },
  { stars: 4, percent: 7 },
  { stars: 3, percent: 2 },
  { stars: 2, percent: 1 },
  { stars: 1, percent: 4 },
] as const

export const customerSay = {
  aiGenerated: true,
  body:
    'Customers find this iPhone to be a true flagship device with stellar battery life, top-notch camera quality, and a premium feel in hand. They consider it worth the price and appreciate its authenticity. The performance receives mixed feedback, with some saying it works like a charm while others report it doesn’t work properly.',
} as const

export type ReviewAspect = {
  aspect: string
  mentions: number
  positive: number
  negative: number
  summary: string
  quotes: ReadonlyArray<string>
}

export const reviewAspects: ReadonlyArray<ReviewAspect> = [
  {
    aspect: 'Quality',
    mentions: 107,
    positive: 98,
    negative: 9,
    summary:
      "Customers praise the iPhone's quality, describing it as super and highly recommended, with one customer noting it's the best choice in the Pro series.",
    quotes: [
      'It was amazing ✨️ and good product .. quality and amazon delivery service was so good',
      '1. great phone, got it for 1.13 Lacs after exchange and card offer in Prime sale. 2. Loved every bit of this phone.',
      'Nice',
      'Awesome 👌 and genuine seller',
    ],
  },
  {
    aspect: 'Value for money',
    mentions: 24,
    positive: 20,
    negative: 4,
    summary: 'Customers find the phone worth its price and consider it an awesome purchase.',
    quotes: [
      '...Battery back up is also good. Worth it. No heating issues till now.',
      'Good buy',
      '...The 1TB storage is huge, so I never worry about space. Worth the price and very happy with my purchase. 👍📱✨',
      'Must buy',
    ],
  },
  {
    aspect: 'Battery life',
    mentions: 18,
    positive: 18,
    negative: 0,
    summary: 'Customers are satisfied with the phone’s battery life.',
    quotes: [
      '...I really love the phone. Battery life is very good as mentioned. Appearance and sound quality is nice.',
      '...Camera is top notch, Battery is superb, display is awesome, design feels good, Overall UI is excellent....',
      'Premium phone best camera and display. Good battery backup also',
      'Great Phone Good Camera Quality, Also Great Battery Backup, Looks Good Display is Slick to use',
    ],
  },
  {
    aspect: 'Camera quality',
    mentions: 18,
    positive: 18,
    negative: 0,
    summary:
      'Customers praise the phone’s camera quality, with one customer noting its ability to capture stunning photos.',
    quotes: [
      '...Enjoying the specs related to screen resolution, camera, AI interactions and call quality etc.',
      '...if you’re looking for a high-end smartphone with excellent performance, camera quality, and a premium user experience, this is definitely worth...',
      'Battery back is very good and camera is awesome specially videos',
    ],
  },
  {
    aspect: 'Performance',
    mentions: 19,
    positive: 11,
    negative: 8,
    summary:
      'Customers have mixed experiences with the phone’s performance, with some finding it excellent and working well, while others report it not working properly.',
    quotes: [
      'My first iPhone and I couldn’t ask for a better battery life, performance, camera and UI.',
      '...this iphone17pro max 256gb start to Lag/Sluggish/Glitch during operation even after reloading 3 to 4 times to factory...',
      '...The 1TB storage is huge, so I never worry about space.',
    ],
  },
  {
    aspect: 'User experience',
    mentions: 15,
    positive: 11,
    negative: 4,
    summary:
      'Customers are satisfied with their iPhone 17 Pro Max, describing it as a premium device that meets their expectations, with one customer noting its smooth user interface.',
    quotes: [
      'Great user experience.',
      '...and I couldn’t ask for a better battery life, performance, camera and UI.',
      'Smooth interface',
    ],
  },
  {
    aspect: 'Design',
    mentions: 14,
    positive: 14,
    negative: 0,
    summary:
      'Customers appreciate the phone’s design, noting that it feels premium in hand and looks good.',
    quotes: [
      'Elegant and elegant',
      '...The build quality feels premium, the display is beautiful, and the overall performance is exceptionally smooth.',
      '...Camera is top notch, Battery is superb, display is awesome, design feels good, Overall UI is excellent....',
      'Top quality ofc, good battery life. Looks good. The smoothness of iOS and the details to attention makes it worth it.',
    ],
  },
  {
    aspect: 'Authenticity',
    mentions: 6,
    positive: 5,
    negative: 1,
    summary: 'Customers confirm that the phone is 100% authentic.',
    quotes: [
      'Authentic',
      'Genuine and Fast',
      'Trusted and enjoying. Powerful one its speed and AI',
      '...I was a bit skeptic at first buying it online but it was 100% authentic.',
    ],
  },
]

export type TopReview = {
  author: string
  stars: number
  title: string
  body: string
  date: string
  colour?: string
  size?: string
  verified: boolean
  helpful: string
}

export const topReviews: ReadonlyArray<TopReview> = [
  {
    author: 'Premsowkar',
    stars: 5,
    title: 'Excellent iPhone – Premium Experience!',
    body:
      "I recently purchased the iPhone 17 Pro Max and I'm extremely happy with it. The build quality feels premium, the display is beautiful, and the overall performance is exceptionally smooth.\nThe camera quality is impressive, especially for photos and videos. Everything feels fast and responsive, whether it's multitasking, gaming, or everyday use. Battery life is also very good for my daily usage.\nThe design feels premium in hand, and the overall experience is exactly what I expected from a Pro Max model. If you're looking for a high-end smartphone with excellent performance, camera quality, and a premium user experience, this is definitely worth considering.\nVery satisfied with my purchase. Highly recommended! 👍📱",
    date: '17 September 2026',
    colour: 'Cosmic Orange',
    size: '256 GB',
    verified: true,
    helpful: 'One person found this helpful',
  },
  {
    author: 'Priyanshu Tripathi',
    stars: 5,
    title: 'Absolute Beast',
    body:
      'Got this phone in prime day sale. Great phone for the price. Its a little large and a bit heavy for my liking. So if your hands are small go for the pro or base 17. Silver is the best colour for the pro models in my opinion. All the back covers looks very nice. I upgraded from iPhone 13 and the Aluminium back does not look bad, it is quite premium. Camera is absolutely amazing. For videos, this is the best phone period.',
    date: '21 July 2026',
    verified: true,
    helpful: '25 people found this helpful',
  },
  {
    author: 'Rajesh kumar Goswami',
    stars: 5,
    title: 'Incredible performance and battery life – a true flagship experience!',
    body:
      "I've been using this iPhone for a few weeks now, and it completely lives up to the hype. The display is incredibly bright and smooth, making streaming and gaming feel absolutely premium.\nPerformance-wise, the A-series chip handles heavy multitasking and intensive games without a single stutter.\nThe camera system is a major highlight, consistently capturing stunning photos and videos even in low light.\nBattery life is stellar; I can comfortably get through a full day of heavy usage with plenty of juice to spare. If you're on the fence, this is absolutely worth the upgrade. Highly recommended!",
    date: '9 July 2026',
    verified: true,
    helpful: '24 people found this helpful',
  },
  {
    author: 'taviyad dhara n',
    stars: 5,
    title: 'Good iphone 17pro max',
    body: 'It was amazing ✨️ and good product .. quality and amazon delivery service was so good',
    date: '12 September 2026',
    colour: 'Silver',
    size: '1 TB',
    verified: true,
    helpful: '5 people found this helpful',
  },
  {
    author: 'tanveer',
    stars: 5,
    title: 'Awesome',
    body: 'Elegant and elegant',
    date: '16 September 2026',
    colour: 'Cosmic Orange',
    size: '256 GB',
    verified: true,
    helpful: '',
  },
  {
    author: 'Kuwar Sahab singh',
    stars: 5,
    title: 'Nice',
    body: 'Good',
    date: '15 September 2026',
    colour: 'Silver',
    size: '512 GB',
    verified: true,
    helpful: '',
  },
  {
    author: 'Milind Thatte',
    stars: 5,
    title: 'Great phone for personal and professional use',
    body: 'Great phone!! Very well designed. Cam quality is awesome 👍. Battery life is very good....',
    date: '18 September 2026',
    colour: 'Cosmic Orange',
    size: '256 GB',
    verified: true,
    helpful: '',
  },
  {
    author: 'Bommisetty Sai Pranav',
    stars: 4,
    title: 'Ui',
    body:
      'Phone is good. There will be few pain points if you are coming from android. Ui in general feels bit laggy compared with android flagship.',
    date: '22 July 2026',
    verified: true,
    helpful: '9 people found this helpful',
  },
]

export const compareProducts = {
  columns: ['iPhone 17 Pro Max', 'iPhone 17 Pro', 'iPhone Air', 'iPhone 16 Pro Max'],
  rows: [
    { label: 'PRICE', values: ['₹1,89,900.00', '₹1,54,900.00', '-20% ₹1,19,900.00 M.R.P.: ₹1,49,900.00', '₹99,900.00'] },
    { label: 'RATINGS', values: ['4.7 (654)', '4.5 (641)', '4.5 (395)', '4.7 (752)'] },
    { label: 'DISPLAY', values: ['6.9 in', '6.3 in', '6.5 in', '6.3 in'] },
    { label: 'CHIP', values: ['A19 Pro', 'A19 Pro', 'A19 Pro', 'A19'] },
    { label: 'FINISH', values: ['Aluminium', 'Aluminium', 'Titanium', 'Aluminium'] },
    { label: 'DYNAMIC ISLAND', values: [true, true, true, true] },
    {
      label: 'CAMERA',
      values: [
        '48MP Pro Fusion camera system: 48MP Fusion Main, 48MP Fusion Ultra Wide, 48MP Fusion Telephoto',
        '48MP Pro Fusion camera system: 48MP Fusion Main, 48MP Fusion Ultra Wide, 48MP Fusion Telephoto',
        '48MP Fusion camera system, 48MP Fusion Main',
        '48MP Dual Fusion camera system: 48MP Fusion Main | 48MP Fusion Ultra Wide',
      ],
    },
    {
      label: 'FRONT-FACING CAMERA',
      values: [
        '18MP Center Stage front camera',
        '18MP Center Stage front camera',
        '18MP Center Stage front camera',
        '18MP Center Stage front camera',
      ],
    },
    {
      label: 'OPTICAL ZOOM OPTIONS',
      values: ['0.5x, 1x, 2x, 4x, 8x', '0.5x, 1x, 2x, 4x, 8x', '1x, 2x', '0.5x, 1x, 2x'],
    },
    { label: 'SECURE AUTHENTICATION', values: ['Face ID', 'Face ID', 'Face ID', 'Face ID'] },
    {
      label: 'BATTERY',
      values: [
        'Up to 37 hours video playback',
        'Up to 31 hours video playback',
        'Up to 27 hours video playback',
        'Up to 30 hours video playback',
      ],
    },
    { label: 'CONNECTOR', values: ['USB-C', 'USB-C', 'USB-C', 'USB-C'] },
    {
      label: 'CAPACITY',
      values: [
        '128GB, 256GB, 512GB, 1TB, 2TB',
        '128GB, 256GB, 512GB, 1TB',
        '256GB, 512GB, 1TB',
        '256GB, 512GB',
      ],
    },
    {
      label: 'COMPATIBLE WITH MAGSAFE ACCESSORIES',
      values: [true, true, true, true],
    },
  ],
} as const

/** Sticky in-page navigation targets, matching the reference anchors. */
export const pageSections = [
  { id: 'about', label: 'About this item' },
  { id: 'details', label: 'About this item' },
  { id: 'buying-options', label: 'Buying options' },
  { id: 'compare', label: 'Compare with similar items' },
  { id: 'videos', label: 'Videos' },
  { id: 'reviews', label: 'Reviews' },
] as const