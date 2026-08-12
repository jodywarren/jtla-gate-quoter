/* =========================================================
   JTLA GATE QUOTER
   MASTER PRICE BOOK
   Updated prices
   ========================================================= */

const PRICES = {

  /* =======================================================
     BUSINESS SETTINGS
     ======================================================= */

  business: {
    labourRate: 60,               // $ per hour, ex GST
    materialMarkup: 0.20,         // 20%
    gst: 0.10,                    // 10%
    includedTravelKm: 20,         // one-way included distance
    travelRatePerKm: 1.50,        // charged beyond included distance
    roundTo: 10,                  // final quote rounds UP
    steelStockLengthM: 8
  },


  /* =======================================================
     STEEL
     Prices INC GST unless noted.
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


    cypressPickets: {
      label: "Cypress 67x15mm",
      boardWidthMm: 67,
      thicknessMm: 15,
      pricePerLinealM: 4.20,
      priceIncludesGST: true,

      finishes: [
        "Raw",
        "Oil",
        "Paint"
      ]
    },


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


    colorbond: {
      label: "Colorbond Steel Cladding",
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
      price: 0,
      priceIncludesGST: true
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
        price: 0,
        priceIncludesGST: true
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
      priceEach: 2.50,
      priceIncludesGST: true
    },


    baseplate: {
      label: "Fabricated steel baseplate",
      priceEach: 25.00,
      priceIncludesGST: true
    },


    screws: {
      label: "Cladding screws / fixings",
      minimumPerGate: 5.00,
      maximumPerGate: 10.00,
      defaultPerGate: 10.00,
      priceIncludesGST: true
    }
  },


  /* =======================================================
     CONCRETE / POST INSTALLATION
     ======================================================= */

  installation: {

    concreteEmbedmentMm: 650,

    concreteBagPrice: 8.00,
    concreteBagPriceIncludesGST: true,

    defaultConcreteBagsPerPost: 2,

    concretedPostLabourHours: 0.5,

    baseplateLabourHours: 0.3333,

    drilledHoleLabourHours: 0.08333
  },


  /* =======================================================
     NON-POWDER-COATED STEEL FINISH
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
     Travel to powder coater included.
     ======================================================= */

  powderCoating: {

    gate: {
      label: "Gate",
      priceEach: 160.00,
      priceIncludesGST: true
    },

    post: {
      label: "Post",
      priceEach: 50.00,
      priceIncludesGST: true
    },

    fixedPanelVertical: {
      label: "Vertical clad fixed panel",
      priceEach: 150.00,
      priceIncludesGST: true
    },

    /*
      Horizontal fixed panels do not attract
      a separate fixed-panel charge.

      Their new posts are charged individually
      at $50 each.
    */

    horizontalFixedPanelPostPrice: 50.00,

    processingTime:
      "Allow approximately 2 weeks for powder coating."
  },


  /* =======================================================
     COLORBOND / POWDER COATING COLOURS
     Shared palette, alphabetically sorted.
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
     LABOUR
     ======================================================= */

  labour: {

    /*
      Typical gate leaf around 1800 x 1200mm.
      Includes cutting, welding, grinding and painting.
    */

    gateBaseHours: 1.5,

    /*
      Fabricate each new post.
    */

    postHours: 20 / 60,

    /*
      Additional fabrication allowance
      for each fixed panel.
    */

    fixedPanelHours: 1.0,

    /*
      Drilling each bolt hole through both sides
      and enlarging one side.
    */

    holeHours: 5 / 60,

    /*
      Install each concreted post.
    */

    concretePostHours: 0.5,

    /*
      Install each baseplated post.
    */

    baseplateHours: 20 / 60,

    /*
      Hang each gate and fit latch.
    */

    hangGateHours: 1.0
  },


  /* =======================================================
     DESIGN / FABRICATION DEFAULTS
     ======================================================= */

  defaults: {

    frameType: "50x25_rhs",

    postType: "65x65_shs",

    claddingType: "ekodeck",

    /*
      Clearance underneath gate.
    */

    gateGroundGapMm: 40,

    /*
      Fixed spacing between layout components.
    */

    componentGapMm: 12,

    /*
      Included for reference.
      Current component builder uses the same 12mm rule.
    */

    doubleGateCentreGapMm: 12,

    /*
      Added automatically to concreted posts.
    */

    concreteEmbedmentMm: 650,

    dynaboltLengthMm: 75,

    dynaboltDiameterMm: 10,

    maxMidRails: 3,

    /*
      Vertical cladding on a fixed panel
      gets horizontal rails at approx 900mm centres.
    */

    fixedPanelVerticalRailSpacingApproxMm: 900,

    /*
      Standard cladding board gap used
      for quantity calculations.
    */

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
      "Duragalv steel with exposed fabrication areas treated with etch primer and silver galvanising spray.",

    concretePostDescription:
      "Posts concreted approximately 650mm into the ground.",

    depositText:
      "50% deposit required on acceptance. Balance payable on completion.",

    bccEmail:
      "jtladesign@gmail.com"
  },


  /* =======================================================
     PROJECT NUMBERING
     ======================================================= */

  projects: {

    startingProjectNumber: 1246,

    displayDigits: 6
  }

};
