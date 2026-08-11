const PRICES = {

  // ==========================================================
  // JTLA GATES
  // ==========================================================

  company: {
    name: "JTLA Gates",
    contactName: "Jody Tuuta",
    phone: "0439 517 783"
  },


  // ==========================================================
  // BUSINESS SETTINGS
  // ==========================================================

  business: {
    labourRateExGST: 60,

    materialMarkup: 0.20,

    gst: 0.10,

    includedTravelKm: 20,

    travelRatePerKm: 1.50,

    roundTo: 10,

    defaultPostEmbedMm: 600,

    defaultBottomGapMm: 40,

    defaultSideGapMm: 10
  },


  // ==========================================================
  // STEEL
  // ==========================================================

  steel: {

    frame: {

      "50x25_rhs": {
        label: "50x25 RHS Duragalv",
        faceMm: 50,
        depthMm: 25,
        stockLengthM: 8,
        price: 55,
        priceIncludesGST: true
      },

      "25x25_rhs": {
        label: "25x25 RHS Duragalv",
        faceMm: 25,
        depthMm: 25,
        stockLengthM: 8,
        price: 0,
        priceIncludesGST: true
      },

      "40x40_rhs": {
        label: "40x40 RHS Duragalv",
        faceMm: 40,
        depthMm: 40,
        stockLengthM: 8,
        price: 0,
        priceIncludesGST: true
      },

      "50x50_rhs": {
        label: "50x50 RHS Duragalv",
        faceMm: 50,
        depthMm: 50,
        stockLengthM: 8,
        price: 0,
        priceIncludesGST: true
      }

    },


    posts: {

      "65x65_shs": {
        label: "65x65 SHS Duragalv",
        widthMm: 65,
        stockLengthM: 8,
        price: 105,
        priceIncludesGST: true
      },

      "50x50_shs": {
        label: "50x50 SHS Duragalv",
        widthMm: 50,
        stockLengthM: 8,
        price: 0,
        priceIncludesGST: true
      },

      "90x90_shs": {
        label: "90x90 SHS Duragalv",
        widthMm: 90,
        stockLengthM: 8,
        price: 0,
        priceIncludesGST: true
      },

      "100x100_shs": {
        label: "100x100 SHS Duragalv",
        widthMm: 100,
        stockLengthM: 8,
        price: 0,
        priceIncludesGST: true
      },

      "none": {
        label: "No new post",
        widthMm: 0,
        stockLengthM: 8,
        price: 0,
        priceIncludesGST: true
      }

    }

  },


  // ==========================================================
  // CLADDING
  // ==========================================================

  cladding: {

    // DEFAULT CLADDING

    ekodeck: {
      label: "Ekodeck screening 67x15mm",

      boardWidthMm: 67,
      boardThicknessMm: 15,

      stockLengthM: 2.7,

      pricePerStockLength: 16,
      priceIncludesGST: true,

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

      availableLengthsMm: [
        900,
        1200,
        1800
      ],

      pricePerStockLength: 0,
      priceIncludesGST: true
    },


    losp50: {
      label: "LOSP 50x18mm",

      boardWidthMm: 50,
      boardThicknessMm: 18,

      stockLengthM: 5.4,

      pricePerLinealM: 9,
      priceIncludesGST: true
    },


    losp90: {
      label: "LOSP 90x18mm",

      boardWidthMm: 90,
      boardThicknessMm: 18,

      stockLengthM: 5.4,

      pricePerLinealM: 9,
      priceIncludesGST: true
    },


    merbau90: {
      label: "Merbau decking 90mm",

      boardWidthMm: 90,

      stockLengthM: 0,

      pricePerLinealM: 0,
      priceIncludesGST: true
    },


    merbau140: {
      label: "Merbau decking 140mm",

      boardWidthMm: 140,

      stockLengthM: 0,

      pricePerLinealM: 0,
      priceIncludesGST: true
    },


    colorbond: {
      label: "Colorbond steel cladding",

      pricePerM2: 0,
      priceIncludesGST: true,

      profiles: [
        "Good Neighbour",
        "Corrugated",
        "Trimdek",
        "Other"
      ]
    },


    custom: {
      label: "Custom / Other",

      priceIncludesGST: true
    }

  },


  // ==========================================================
  // HARDWARE
  // ==========================================================

  hardware: {

    // Hinges are fixed.
    // No hinge selector is required in the app.

    hinges: {
      label: "Lock-out galvanised hinges",

      pricePerSet: 18,
      priceIncludesGST: true
    },


    latches: {

      ddDualKey: {
        label: "D&D dual-way key-lockable latch",

        price: 82,
        priceIncludesGST: false
      },


      dLatch: {
        label: "Standard D latch",

        price: 11,
        priceIncludesGST: true
      },


      snapLatch: {
        label: "Standard Snap latch",

        price: 11,
        priceIncludesGST: true
      },


      none: {
        label: "No latch",

        price: 0,
        priceIncludesGST: true
      }

    },


    // Allowance for screws / cladding fixings.
    // Default is midway between your normal $5-$10 per gate.

    screws: {
      defaultPerGate: 7.50,

      minimumPerGate: 5,

      maximumPerGate: 10,

      priceIncludesGST: true
    }

  },


  // ==========================================================
  // FIXINGS
  // ==========================================================

  fixings: {

    concrete: {
      pricePerBag: 8,

      priceIncludesGST: true,

      defaultBagsPerPost: 2
    },


    dynabolts: {

      diameterMm: 10,

      priceEach: 2,

      priceIncludesGST: true,

      lengthsMm: [
        50,
        75,
        90
      ],

      defaultLengthMm: 75
    }

  },


  // ==========================================================
  // FINISHING
  // ==========================================================

  finishing: {

    powderCoat: {

      typicalCost: 250,

      priceIncludesGST: true,

      quoteNote:
        "Allow approximately 2 weeks for powder-coat processing."
    },


    // If the gate is NOT powder coated,
    // allow for etch primer and silver galv spray.

    galvanisedTouchUp: {

      label: "Etch primer and silver galv spray",

      pricePerM2: 5,

      priceIncludesGST: true
    }

  },


  // ==========================================================
  // DEFAULT GATE SETTINGS
  // ==========================================================

  defaults: {

    gateType: "single",

    frame: "50x25_rhs",

    posts: "65x65_shs",

    cladding: "ekodeck",

    latch: "ddDualKey",

    leftGapMm: 10,

    rightGapMm: 10,

    bottomGapMm: 40,

    postEmbedMm: 600,

    dynaboltLengthMm: 75,

    postCount: 2

  }

};
