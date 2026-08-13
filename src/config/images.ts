/**
 * Central image registry for the FSN Cargo public site.
 * Every URL below was fetched and visually verified to show real,
 * on-topic freight/logistics photography before being added here.
 * Swap any entry by changing only this file.
 */

function unsplash(id: string, width: number, quality = 80) {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=${quality}`
}

/** Builds a width-descriptor srcSet so the browser downloads the smallest usable file. */
function srcSet(id: string, widths: number[], quality = 80) {
  return widths.map((w) => `${unsplash(id, w, quality)} ${w}w`).join(', ')
}

const HERO_ID = '1605745341112-85968b19335b'

export const images = {
  hero: {
    main: {
      src: unsplash(HERO_ID, 1600),
      srcSet: srcSet(HERO_ID, [640, 960, 1280, 1600, 2000]),
      alt: 'Loaded container ship underway at sea, representing FSN Cargo sea freight between China and Somalia',
    },
  },
  services: {
    air: {
      src: unsplash('1569154941061-e231b4725ef1', 1200),
      alt: 'Commercial cargo aircraft parked at an airport terminal apron',
    },
    airDetail: {
      src: unsplash('1436491865332-7a61a109cc05', 1200),
      alt: 'View of an aircraft wing above clouds during flight, representing air freight transit',
    },
    sea: {
      src: unsplash('1578575437130-527eed3abbec', 1200),
      alt: 'Container ship docked at a port terminal beneath gantry cranes',
    },
    road: {
      src: unsplash('1601584115197-04ecc0da31d7', 1200),
      alt: 'Freight truck hauling a trailer along an open highway',
    },
    warehousing: {
      src: unsplash('1553413077-190dd305871c', 1200),
      alt: 'Tall warehouse racking aisle stocked with organized packaged goods',
    },
    customs: {
      src: unsplash('1450101499163-c8848c66ca85', 1200),
      alt: 'Close-up of a hand signing shipping documentation at a desk',
    },
  },
  about: {
    main: {
      src: unsplash('1494412574643-ff11b0a5c1c3', 1600),
      alt: 'Aerial view of a busy container terminal with rows of cranes and cargo containers',
    },
    secondary: {
      src: unsplash('1494412651409-8963ce7935a7', 1600),
      alt: 'Wide aerial view of a large-scale container port with gantry cranes and stacked containers',
    },
  },
  whyChooseUs: {
    fastDelivery: {
      src: unsplash('1601584115197-04ecc0da31d7', 1000),
      alt: 'Freight truck in transit on a highway, representing timely delivery',
    },
    safeShipping: {
      src: unsplash('1578575437130-527eed3abbec', 1000),
      alt: 'Container ship secured at port, representing safe and secure cargo handling',
    },
    realTimeTracking: {
      src: unsplash('1580795479225-c50ab8c3348d', 1000),
      alt: 'Logistics operations staff monitoring shipment activity on multiple screens',
    },
    doorToDoor: {
      src: unsplash('1586528116493-a029325540fa', 1000),
      alt: 'Warehouse storage aisle with organized bins and a staff member walking through',
    },
  },
  warehouseDetail: {
    src: unsplash('1587293852726-70cdb56c2866', 1200),
    alt: 'Close angle of warehouse shelving stocked with packaged inventory',
  },
  operationsFloor: {
    src: unsplash('1616401784845-180882ba9ba8', 1200),
    alt: 'Warehouse forklift operating between rows of stored shipment cartons',
  },
} as const
