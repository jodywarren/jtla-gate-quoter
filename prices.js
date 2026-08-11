const PRICES = {

  // ==============================
  // JTLA
  // ==============================

  company: {
    name: "JTLA Gates",
    contactName: "Jody"
  },


  // ==============================
  // BUSINESS SETTINGS
  // ==============================

  business: {
    labourRate: 60,
    materialMarkup: 0.20,
    gst: 0.10,

    includedTravelKm: 20,
    travelRatePerKm: 1.50,

    roundTo: 10,

    // Steel is purchased in 8 metre lengths
    steelStockLengthM: 8
  },


  // ==============================
  // STEEL
  // ==============================

  steel: {

    frame: {

      "50x25_rhs": {
        label: "50x25 RHS",
        ratePerM: 0
      },

      "25x25_rhs": {
        label: "25x25 RHS",
        ratePerM: 0
      },

      "40x40_rhs": {
        label: "40x40 RHS",
        ratePerM: 0
      },

      "50x50_rhs": {
        label: "50x50 RHS",
        ratePerM: 0
      }

    },


    posts: {

      "65x65_shs": {
        label: "65x65 SHS",
        ratePerM: 0
      },

      "50x50_shs": {
        label: "50x50 SHS",
        ratePerM: 0
      },

      "90x90_shs": {
        label: "90x90 SHS",
        ratePerM: 0
      },

      "100x100_shs": {
        label: "100x100 SHS",
        ratePerM: 0
      },

      "none": {
        label: "No new posts",
        ratePerM: 0
      }

    }

  },


  // ==============================
  // CLADDING
  // ==============================

  cladding: {

    // DEFAULT
    ekodeck: {

      label: "Ekodeck screening 67x15mm",

      boardWidthMm: 67,
      boardThicknessMm: 15,

      ratePerM: 0,

      colours: [
        "Greystone",
        "Alpine Ash",
        "Leatherwood",
        "Riverbank Red"
      ]

    },


    cypressPickets: {

      label: "Cypress pickets 67x15mm",

      boardWidthMm: 67,
      boardThicknessMm: 15,

      ratePerM: 0,

      availableLengthsMm: [
        900,
        1200,
        1800
      ]

    },


    losp50: {

      label: "LOSP 50x22mm",

      boardWidthMm: 50,
      boardThicknessMm: 22,

      ratePerM: 0

    },


    losp90: {

      label: "LOSP 90x22mm",

      boardWidthMm: 90,
      boardThicknessMm: 22,

      ratePerM: 0

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

      profiles: [
        "Good Neighbour",
        "Corrugated",
        "Trimdek",
        "Other"
      ]

    },


    custom: {

      label: "Custom / Other"

    }

  },


  // ==============================
  // HARDWARE
  // ==============================

  hardware: {

    // Hinges are fixed, not selectable.
    hinges: {

      label: "Lock-out galvanised hinges",

      price: 0

    },


    latches: {

      ddDualKey: {

        label: "D&D dual-way key lockable latch",

        price: 0

      },


      dLatch: {

        label: "Standard D latch",

        price: 0

      },


      snapLatch: {

        label: "Standard Snap latch",

        price: 0

      },


      none: {

        label: "No latch",

        price: 0

      }

    }

  },


  // ==============================
  // FIXINGS
  // ==============================

  fixings: {

    concreteBag: 8,

    boltEach: 3

  },


  // ==============================
  // FINISHING
  // ==============================

  finishing: {

    powderCoatTypical: 250

  },


  // ==============================
  // DEFAULT SELECTIONS
  // ==============================

  defaults: {

    frame: "50x25_rhs",

    posts: "65x65_shs",

    cladding: "ekodeck",

    latch: "ddDualKey"

  }

};
