const PRICES = {
  business: {
    labourRate: 60,
    materialMarkup: 0.20,
    gst: 0.10,
    includedTravelKm: 20,
    travelRatePerKm: 1.50,
    roundTo: 10
  },

  steel: {
    frame: {
      "50x25_rhs": { label: "50x25 RHS", ratePerM: 0 },
      "40x40_rhs": { label: "40x40 RHS", ratePerM: 0 },
      "custom": { label: "Custom", ratePerM: 0 }
    },
    posts: {
      "65x65_shs": { label: "65x65 SHS", ratePerM: 0 },
      "50x50_shs": { label: "50x50 SHS", ratePerM: 0 },
      "none": { label: "No new posts", ratePerM: 0 },
      "custom": { label: "Custom", ratePerM: 0 }
    }
  },

  cladding: {
    ekodeck: {
      label: "Ekodeck screening 67x15",
      ratePerM2: 0,
      colours: [
        "Colour 1",
        "Colour 2",
        "Colour 3",
        "Colour 4"
      ]
    },

    cypress: {
      label: "Cypress boards",
      rawRatePerM2: 0
    },

    cypressPickets: {
      label: "Cypress pickets",
      ratePerM2: 0
    },

    merbau90: {
      label: "Merbau 90mm decking",
      ratePerM2: 0
    },

    merbau140: {
      label: "Merbau 140mm decking",
      ratePerM2: 0
    },

    colorbond: {
      label: "Colorbond steel",
      profiles: {
        goodNeighbour: { label: "Good Neighbour", ratePerM2: 0 },
        corrugated: { label: "Corrugated", ratePerM2: 0 },
        trimdek: { label: "Trimdek", ratePerM2: 0 },
        custom: { label: "Custom / Other", ratePerM2: 0 }
      }
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
  },

  defaults: {
    fabricationHours: {
      single: 4,
      double: 7,
      slider: 8,
      automation: 0
    },
    installationHours: {
      single: 2,
      double: 3,
      slider: 4,
      automation: 0
    }
  }
};
