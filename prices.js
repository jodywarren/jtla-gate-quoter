/* =========================================================
   JTLA GATES
   MASTER PRICE BOOK
   ========================================================= */

const PRICES = {

  company: {
    name: "JTLA Gates",
    contactName: "Jody Tuuta",
    phone: "0439517783",
    email: "jtladesign@gmail.com"
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

  bank: {
    accountName: "JW and GF Tuuta",
    bsb: "306 089",
    accountNumber: "3406851"
  },

  projects: {
    startingProjectNumber: 1246,
    displayDigits: 6,
    prefix: "00"
  },


  /* =======================================================
     STEEL
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
        label: "50x50x2 SHS Duragalv",
        widthMm: 50,
        depthMm: 50,
        stockLengthM: 8,

        /* Supplier price EX GST */

        pricePerStockLength: 72.00,
        priceIncludesGST: false
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

      "75x75_shs": {
        label: "75x75 SHS Duragalv",
        widthMm: 75,
        depthMm: 75,
        stockLengthM: 8,
        pricePerStockLength: 115.00,
        priceIncludesGST: true
      },

      "85x85_shs": {
        label: "85x85 SHS Duragalv",
        widthMm: 85,
        depthMm: 85,
        stockLengthM: 8,
        pricePerStockLength: 125.00,
        priceIncludesGST: true
      },

      "100x100_shs": {
        label: "100x100 SHS Duragalv",
        widthMm: 100,
        depthMm: 100,
        stockLengthM: 8,
        pricePerStockLength: 160.00,
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


    /* -------------------------------------------------------
       TREATED PINE PALINGS
       ------------------------------------------------------- */

    treatedPinePalings: {

      label: "Treated Pine Palings",

      priceEach: 2.50,
      priceIncludesGST: true,

      lengthsMm: [
        1650,
        1800,
        2100
      ],

      widthsMm: [
        100,
        125,
        150
      ],

      extraPerMetre: {
        100: 3,
        125: 3,
        150: 0
      },

      labourRatePerM2: 50.00,

      capping: {
        defaultIncluded: true,
        pricePerM: 5.00,
        priceIncludesGST: true
      },

      plinth: {
        defaultIncluded: true,
        pricePerM: 5.00,
        priceIncludesGST: true
      }
    },


    /* -------------------------------------------------------
       50x50 GALVANISED MESH
       ------------------------------------------------------- */

    galvMesh50: {

      label: "50x50mm Galvanised Mesh - 4.0mm Wire",

      cellSizeMm: 50,
      wireDiameterMm: 4,

      /*
        Internal costing rate.
        Includes transport allowance.
        EX GST.
      */

      pricePerM2: 18.00,
      priceIncludesGST: false,

      /*
        Available supplier sheet sizes.
      */

      sheets: [

        {
          key: "3000x2400",
          label: "3000x2400mm Sheet",
          lengthMm: 3000,
          widthMm: 2400
        },

        {
          key: "2400x1200",
          label: "2400x1200mm Sheet",
          lengthMm: 2400,
          widthMm: 1200
        },

        {
          key: "2000x1200",
          label: "2000x1200mm Sheet",
          lengthMm: 2000,
          widthMm: 1200
        }

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

      allowanceEach: 25.00,
      priceIncludesGST: true
    },


    screws: {
      label: "Cladding screws / fixings",

      minimumPerItem: 5.00,
      maximumPerItem: 10.00,

      defaultPerItem: 10.00,

      priceIncludesGST: true
    }
  },


  /* =======================================================
     CONCRETE
     ======================================================= */

  concrete: {

    pricePerBag: 8.00,
    priceIncludesGST: true,

    defaultBagsPerPost: 2
  },


  /* =======================================================
     LABOUR
     ======================================================= */

  labour: {

    gateFabricationHoursEach: 2.0,

    postFabricationHoursEach: 0.5,

    fixedPanelHoursEach: 2.0,

    drilledHoleHoursEach: 10 / 60,

    concretePostInstallHoursEach: 0.5,

    baseplatePostInstallHoursEach: 20 / 60,

    hangGateHoursEach: 1.5
  },


  /* =======================================================
     FABRICATION RULES
     ======================================================= */

  fabrication: {

    concreteEmbedmentMm: 650,

    gateGroundGapMm: 40,

    /*
      STEEL FRAME GAP

      Post | 12mm | Gate | 12mm | Post

      Total clearance around one gate
      between two posts = 24mm.
    */

    componentGapMm: 12,

    /*
      Cladding extends 6mm past
      each side of the steel gate frame.

      12mm steel gap - 6mm overhang
      = approx 6mm finished visual gap.
    */

    gateCladdingOverhangMm: 6,

    finishedCladdingGapMm: 6,

    /*
      Add approximately 30mm to calculated
      cladding cut lengths for trimming /
      fabrication processing.

      Fixed-length purchased products can
      ignore this allowance.
    */

    claddingProcessingAllowanceMm: 30,

    baseplateHeightAllowanceMm: 10,

    claddingGapMm: 5,

    maxGateMidRails: 3
  },


  /* =======================================================
     DEFAULTS
     ======================================================= */

  defaults: {

    frameType: "50x25_rhs",

    postType: "65x65_shs",

    claddingType: "ekodeck",

    hingeSide: "left",

    openDirection: "in",

    referenceDirection:
      "streetToProperty",

    finishedHeightMm: 1800,

    gateGroundGapMm: 40,

    componentGapMm: 12,

    gateCladdingOverhangMm: 6,

    claddingProcessingAllowanceMm: 30,

    concreteEmbedmentMm: 650,

    baseplateHeightAllowanceMm: 10,

    dynaboltLengthMm: 75,

    dynaboltDiameterMm: 10,

    claddingGapMm: 5
  },


  /* =======================================================
     VIEW / REFERENCE DIRECTION
     ======================================================= */

  referenceDirections: {

    streetToProperty:
      "Looking from street toward property",

    propertyToStreet:
      "Looking from property toward street",

    north:
      "Looking North",

    south:
      "Looking South",

    east:
      "Looking East",

    west:
      "Looking West",

    other:
      "Other"
  },


  /* =======================================================
     NON-POWDER-COATED FINISH
     ======================================================= */

  finishing: {

    duragalvTouchUp: {

      label:
        "Etch primer and silver galvanising spray",

      ratePerM2: 5.00,
      priceIncludesGST: true
    }
  },


  /* =======================================================
     POWDER COATING
     ALL RATES EX GST
     ======================================================= */

  powderCoating: {

    priceIncludesGST: false,

    postRatePerLm: {

      "65x65_shs": 9.50,

      "75x75_shs": 11.50,

      "85x85_shs": 13.50,

      "100x100_shs": 15.00
    },

    openFrameRatePerM2: 65.00,

    jobTravelAllowanceExGST: 20.00,

    processingTime:
      "Allow approximately 2 weeks for powder coating."
  },


  /* =======================================================
     COLOURS
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
     FORMAL QUOTE
     ======================================================= */

  quote: {

    depositPercent: 50,

    standardHinges:
      "Lock-out galvanised hinges",

    standardSteelFinish:
      "Duragalv steel with exposed fabrication areas treated with etch primer and silver galvanising spray.",

    powderCoatingLeadTime:
      "Allow approximately 2 weeks for powder-coating processing.",

    depositText:
      "50% deposit required on acceptance. Balance payable on completion.",

    acceptanceText:
      "To proceed, please reply to this email confirming acceptance of the quote.",

    bccEmail:
      "jtladesign@gmail.com"
  }

};
