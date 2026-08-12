/* =========================================================
   JTLA GATE QUOTER
   MASTER PRICE BOOK
   ========================================================= */

const PRICES = {

  /* =======================================================
     BUSINESS SETTINGS
     ======================================================= */

  business: {
    labourRate: 60,             // $ per hour
    materialMarkup: 0.20,       // 20%
    gst: 0.10,                  // 10%
    includedTravelKm: 20,
    travelRatePerKm: 1.50,
    roundTo: 10,                // final quote rounds UP to nearest $10
    steelStockLengthM: 8
  },


  /* =======================================================
     STEEL
     All steel purchased in 8 metre lengths unless changed.
     Prices are INC GST.
     ======================================================= */

  steel: {

    frame: {

      "50x25_rhs": {
        label: "50x25 RHS Duragalv",
        widthMm: 50,
        depthMm: 25,
        stockLengthM: 8,
        pricePerStockLength: 55.00,
        priceIncludesGST: true
      },

      "25x25_rhs": {
        label: "25x25 RHS Duragalv",
        widthMm: 25,
        depthMm: 25,
        stockLengthM: 8,
        pricePerStockLength: 0,
        priceIncludesGST: true
      },

      "40x40_rhs": {
        label: "40x40 RHS Duragalv",
        widthMm: 40,
        depthMm: 40,
        stockLengthM: 8,
        pricePerStockLength: 0,
        priceIncludesGST: true
      },

      "50x50_rhs": {
        label: "50x50 RHS Duragalv",
        widthMm: 50,
        depthMm: 50,
        stockLengthM: 8,
        pricePerStockLength: 0,
        priceIncludesGST: true
      }
    },


    posts: {

      "65x65_shs": {
        label: "65x65 SHS Duragalv",
        widthMm: 65,
        depthMm: 65,
        stockLengthM: 8,
        pricePerStockLength: 105.00,
        priceIncludesGST: true
      },

      "50x50_shs": {
        label: "50x50 SHS Duragalv",
        widthMm: 50,
        depthMm: 50,
        stockLengthM: 8,
        pricePerStockLength: 0,
        priceIncludesGST: true
      },

      "90x90_shs": {
        label: "90x90 SHS Duragalv",
        widthMm: 90,
        depthMm: 90,
        stockLengthM: 8,
        pricePerStockLength: 0,
        priceIncludesGST: true
      },

      "100x100_shs": {
        label: "100x100 SHS Duragalv",
        widthMm: 100,
        depthMm: 100,
        stockLengthM: 8,
        pricePerStockLength: 0,
        priceIncludesGST: true
      }
    }
  },


  /* =======================================================
     CLADDING
     ======================================================= */

  cladding: {

    /* ---------------- EKODECK ---------------- */

    ekodeck: {
      label: "Ekodeck Screening 67x15mm",
      boardWidthMm: 67,
      thicknessMm: 15,
      stockLengthM: 2.7,
      pricePerStockLength: 16.00,
      priceIncludesGST: true,

      colours: [
        "Greystone",
        "Alpine Ash",
        "Leatherwood",
        "Riverbank Red"
      ]
    },


    /* ---------------- CYPRESS ---------------- */

    cypressPickets: {
      label: "Cypress 67x15mm",
      boardWidthMm: 67,
      thicknessMm: 15,

      // Cost supplied as lineal metre rate
      pricePerLinealM: 4.20,
      priceIncludesGST: true,

      finishes: [
        "Raw",
        "Oil",
        "Paint"
      ]
    },


    /* ---------------- LOSP 92 ---------------- */

    losp90: {
      label: "LOSP 92x18mm Primed H3",
      boardWidthMm: 92,
      thicknessMm: 18,
      stockLengthM: 5.4,

      pricePerStockLength: 50.10,
      priceIncludesGST: true,

      finishes: [
        "Primed",
        "Paint"
      ]
    },


    /* ---------------- LOSP 138 ---------------- */

    losp140: {
      label: "LOSP 138x18mm Primed H3",
      boardWidthMm: 138,
      thicknessMm: 18,
      stockLengthM: 5.4,

      pricePerStockLength: 53.90,
      priceIncludesGST: true,

      finishes: [
        "Primed",
        "Paint"
      ]
    },


    /* ---------------- MERBAU 90 ---------------- */

    merbau90: {
      label: "Merbau Decking 90mm",
      boardWidthMm: 90,

      pricePerLinealM: 6.00,
      priceIncludesGST: true,

      finishes: [
        "Raw",
        "Oil"
      ]
    },


    /* ---------------- MERBAU 140 ---------------- */

    merbau140: {
      label: "Merbau Decking 140mm",
      boardWidthMm: 140,

      pricePerLinealM: 9.50,
      priceIncludesGST: true,

      finishes: [
        "Raw",
        "Oil"
      ]
    },


    /* ---------------- COLORBOND ---------------- */

    colorbond: {
      label: "Colorbond Steel Cladding",

      // Price still to be entered
      pricePerM2: 0,
      priceIncludesGST: true,

      profiles: [
        "Good Neighbour",
        "Corrugated",
        "Trimdek",
        "Other"
      ]
    },


    /* ---------------- CUSTOM ---------------- */

    custom: {
      label: "Custom / Other",
      price: 0
    }
  },


  /* =======================================================
     HARDWARE
     ======================================================= */

  hardware: {

    hinges: {
      lockout: {
        label: "Lock-out galvanised hinges",
        pricePerSet: 18.00,
        priceIncludesGST: true
      }
    },


    latches: {

      ddDualKey: {
        label: "D&D dual-way key lockable latch",

        // User supplied price is EX GST
        priceExGST: 82.00,
        priceIncludesGST: false
      },

      dLatch: {
        label: "Standard D latch",
        price: 11.00,
        priceIncludesGST: true
      },

      snapLatch: {
        label: "Standard Snap latch",
        price: 11.00,
        priceIncludesGST: true
      },

      other: {
        label: "Other",
        price: 0
      }
    }
  },


  /* =======================================================
     FIXINGS
     ======================================================= */

  fixings: {

    dynabolt: {
      label: "75x10mm Dynabolt",
      diameterMm: 10,
      lengthMm: 75,
      priceEach: 2.00,
      priceIncludesGST: true
    },


    baseplate: {
      label: "Fabricated steel baseplate",
      priceEach: 25.00,
      priceIncludesGST: true
    },


    screws: {
      label: "Cladding screws / fixings",

      // Allowance per gate.
      minimumPerGate: 5.00,
      maximumPerGate: 10.00,

      // Use $10 for quoting so we don't under-cost.
      defaultPerGate: 10.00,
      priceIncludesGST: true
    }
  },


  /* =======================================================
     CONCRETE / POST INSTALLATION
     ======================================================= */

  installation: {

    concreteEmbedmentMm: 650,

    concretedPostLabourHours: 0.5,

    baseplateLabourHours: 0.3333,

    drilledHoleLabourHours: 0.08333
    // approx 5 minutes per hole
  },


  /* =======================================================
     STEEL FINISHING
     Used when NOT powder coated.
     ======================================================= */

  finishing: {

    duragalvTouchUp: {
      label: "Etch primer and silver galvanising spray",
      ratePerM2: 5.00,
      priceIncludesGST: true
    }
  },


  /* =======================================================
     POWDER COATING
     Prices INC GST.
     These prices include required powder-coating travel.
     ======================================================= */

  powderCoating: {

    gate: {
      label: "Gate",
      priceEach: 180.00,
      priceIncludesGST: true
    },

    post: {
      label: "Post",
      priceEach: 40.00,
      priceIncludesGST: true
    },

    fixedPanelVertical: {
      label: "Vertical clad fixed panel",
      priceEach: 150.00,
      priceIncludesGST: true
    },

    /*
       Horizontal fixed panels are NOT charged as a
       $150 panel.

       Charge the two posts instead:
       2 x $40 = $80.
    */

    horizontalFixedPanelPostPrice: 40.00,

    processingTime: "Allow approximately 2 weeks for powder coating."
  },


  /* =======================================================
     COLORBOND / POWDER COATING COLOURS
     Same colour palette for both.
     Alphabetical.
     ======================================================= */

  colours: [
    "Basalt",
    "Bluegum",
    "Classic Cream",
    "Cottage Green",
    "Deep Ocean",
    "Dover White",
    "Dune",
    "Evening Haze",
    "Gully",
    "Ironstone",
    "Jasper",
    "Manor Red",
    "Monument",
    "Night Sky",
    "Pale Eucalypt",
    "Paperbark",
    "Shale Grey",
    "Southerly",
    "Surfmist",
    "Wallaby",
    "Windspray",
    "Woodland Grey"
  ],


  /* =======================================================
     FABRICATION LABOUR
     ======================================================= */

  labour: {

    /* Typical 1800 x 1200 single gate */
    gateBaseHours: 1.5,

    /* Each fabricated post */
    postHours: 0.3333,

    /* Additional work for a fixed panel */
    fixedPanelHours: 1.0,

    /* Drilling through post */
    holeHours: 0.08333,

    /* Installation of concreted post */
    concretePostHours: 0.5,

    /* Installation onto baseplate */
    baseplateHours: 0.3333,

    /* Hang gate and install latch */
    hangGateHours: 1.0
  },


  /* =======================================================
     DESIGN / FABRICATION DEFAULTS
     ======================================================= */

  defaults: {

    frameType: "50x25_rhs",

    postType: "65x65_shs",

    claddingType: "ekodeck",

    gateGroundGapMm: 40,

    componentGapMm: 12,

    doubleGateCentreGapMm: 12,

    concreteEmbedmentMm: 650,

    dynaboltLengthMm: 75,

    dynaboltDiameterMm: 10,

    maxMidRails: 3,

    fixedPanelVerticalRailSpacingApproxMm: 900,

    claddingGapMm: 5
  },


  /* =======================================================
     QUOTE RULES
     ======================================================= */

  quote: {

    depositPercent: 50,

    materialMarkup: 0.20,

    gst: 0.10,

    roundUpTo: 10,

    powderCoatingLeadTime:
      "Allow approximately 2 weeks for powder coating.",

    standardHinges:
      "Lock-out galvanised hinges",

    standardSteelFinish:
      "Duragalv steel with etch primer and silver galvanising finish where required.",

    concretePostDescription:
      "Posts concreted approximately 650mm into the ground."
  },


  /* =======================================================
     PROJECT NUMBERING
     ======================================================= */

  projects: {
    startingProjectNumber: 1246,
    displayDigits: 6
  }

};
