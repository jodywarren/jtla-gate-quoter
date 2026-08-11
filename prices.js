const PRICES = {
  company: {
    name: "JT Landscape Architect",
    address: "21 Accord Street, Mount Duneed VIC 3217",
    phone: "0439 517 783",
    email: "jtladesign@gmail.com",
    website: "www.jtla.com.au",
    abn: "60 977 988 344"
  },

  business: {
    labourRate: 60,
    materialMarkup: 0.20,
    gst: 0.10,
    includedTravelKm: 20,
    travelRatePerKm: 1.50,
    roundTo: 10,
    steelStockLengthM: 8
  },

  steel: {
    frame: {
      "50x25_rhs": { label: "50x25 RHS", ratePerM: 0 },
      "40x40_rhs": { label: "40x40 RHS", ratePerM: 0 },
      "custom": { label: "Custom frame", ratePerM: 0 }
    },
    posts: {
      "65x65_shs": { label: "65x65 SHS", ratePerM: 0 },
      "50x50_shs": { label: "50x50 SHS", ratePerM: 0 },
      "none": { label: "No new posts", ratePerM: 0 },
      "custom": { label: "Custom posts", ratePerM: 0 }
    }
  },

  cladding: {
    ekodeck: {
      label: "Ekodeck screening 67x15mm",
      boardWidthMm: 67,
      ratePerM: 0,
      colours: ["Greystone", "Alpine Ash", "Leatherwood", "Riverbank Red"]
    },
    cypress: {
      label: "Cypress 67x15mm",
      boardWidthMm: 67,
      ratePerM: 0
    },
    cypressPickets: {
      label: "Cypress pickets",
      boardWidthMm: 70,
      ratePerM: 0,
      lengths: [900, 1200, 1800]
    },
    merbau90: {
      label: "Merbau decking 90mm",
      boardWidthMm: 90,
      ratePerM: 0
    },
    merbau140: {
      label: "Merbau decking 140mm",
      boardWidthMm: 140,
      ratePerM: 0
    },
    colorbond: {
      label: "Colorbond steel cladding",
      ratePerM2: 0,
      profiles: ["Good Neighbour", "Corrugated", "Trimdek", "Other"]
    },
    custom: {
      label: "Custom / Other"
    }
  },

  hardware: {
    hinges: {
      heavy: { label: "Heavy duty galvanised hinges", price: 0 },
      lockout: { label: "Heavy duty lock-out galvanised hinges", price: 0 },
      none: { label: "No hinges", price: 0 }
    },
    latches: {
      ddDualKey: { label: "D&D dual-way key lockable latch", price: 0 },
      standard: { label: "Standard latch", price: 0 },
      none: { label: "No latch", price: 0 }
    }
  },

  fixings: {
    concreteBag: 8,
    boltEach: 2
  },

  finishing: {
    powderCoatTypical: 250
  }
};
