const PRICES = {

  // ==========================================================
  // JTLA GATES
  // ==========================================================

  company: {
    name: "JTLA Gates",
    contactName: "Jody Tuuta",
    phone: "0439 517 783",
    recordEmail: "jtladesign@gmail.com"
  },


  // ==========================================================
  // PROJECT NUMBERING
  // ==========================================================

  projectNumbers: {
    startingNumber: 1246,
    digits: 6
  },


  // ==========================================================
  // BUSINESS SETTINGS
  // ==========================================================

  business: {

    gst: 0.10,

    labourRateExGST: 60,

    materialMarkup: 0.20,

    // Distance entered into app is ONE WAY.
    travelFreeOneWayKm: 20,

    travelRatePerKm: 1.50,

    // Final customer price always rounds UP.
    roundTo: 10,

    depositPercent: 0.50,

    depositText:
      "50% deposit required on acceptance. Balance payable on completion."
  },


  // ==========================================================
  // STANDARD SITE / FABRICATION RULES
  // ==========================================================

  rules: {

    // All layout gaps are automatic.
    componentGapMm: 12,

    // Standard clearance under swing gates.
    gateBottomGapMm: 40,

    // Automatically added to concreted post cut lengths.
    concreteEmbedMm: 650,

    // Standard cladding spacing used for quoting quantities.
    claddingGapMm: 5,

    // All post bolts are fixed at this size.
    dynaboltDiameterMm: 10,
    dynaboltLengthMm: 75,

    // Maximum mid rails selectable.
    maxMidRails: 3
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

        pricePerStockLength: 55,
        priceIncludesGST: true
      },


      "25x25_rhs": {
        label: "25x25 RHS Duragalv",

        faceMm: 25,
        depthMm: 25,

        stockLengthM: 8,

        pricePerStockLength: 0,
        priceIncludesGST: true
      },


      "40x40_rhs": {
        label: "40x40 RHS Duragalv",

        faceMm: 40,
        depthMm: 40,

        stockLengthM: 8,

        pricePerStockLength: 0,
        priceIncludesGST: true
      },


      "50x50_rhs": {
        label: "50x50 RHS Duragalv",

        faceMm: 50,
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

        stockLengthM: 8,

        pricePerStockLength: 105,
        priceIncludesGST: true
      },


      "50x50_shs": {
        label: "50x50 SHS Duragalv",

        widthMm: 50,

        stockLengthM: 8,

        // Fill this price in later.
        pricePerStockLength: 0,
        priceIncludesGST: true
      },


      "90x90_shs": {
        label: "90x90 SHS Duragalv",

        widthMm: 90,

        stockLengthM: 8,

        pricePerStockLength: 0,
        priceIncludesGST: true
      },


      "100x100_shs": {
        label: "100x100 SHS Duragalv",

        widthMm: 100,

        stockLengthM: 8,

        pricePerStockLength: 0,
        priceIncludesGST: true
      }

    }

  },


  // ==========================================================
  // CLADDING
  // ==========================================================

  cladding: {

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

      pricePerLinealM: 4.20,
      priceIncludesGST: true,

      finishes: [
        "Raw",
        "Oil",
        "Paint"
      ]
    },


    losp50: {

      label: "LOSP 50x18mm",

      boardWidthMm: 50,
      boardThicknessMm: 18,

      stockLengthM: 5.4,

      pricePerLinealM: 9,
      priceIncludesGST: true,

      finishes: [
        "Plain",
        "Prime",
        "Paint"
      ]
    },


    losp90: {

      label: "LOSP 90x18mm",

      boardWidthMm: 90,
      boardThicknessMm: 18,

      stockLengthM: 5.4,

      pricePerLinealM: 9,
      priceIncludesGST: true,

      finishes: [
        "Plain",
        "Prime",
        "Paint"
      ]
    },


    merbau90: {

      label: "Merbau decking 90mm",

      boardWidthMm: 90,

      stockLengthM: 0,

      pricePerLinealM: 0,
      priceIncludesGST: true,

      finishes: [
        "Raw",
        "Oil"
      ]
    },


    merbau140: {

      label: "Merbau decking 140mm",

      boardWidthMm: 140,

      stockLengthM: 0,

      pricePerLinealM: 0,
      priceIncludesGST: true,

      finishes: [
        "Raw",
        "Oil"
      ]
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
  // COLOUR PALETTE
  //
  // Shared by Colorbond and powder coating.
  // Alphabetical.
  // ==========================================================

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


  // ==========================================================
  // HARDWARE
  // ==========================================================

  hardware: {

    hinges: {

      label:
        "Lock-out galvanised hinges",

      pricePerSet: 18,

      priceIncludesGST: true
    },


    latches: {

      ddDualKey: {

        label:
          "D&D dual-way key-lockable latch",

        price: 82,

        priceIncludesGST: false
      },


      dLatch: {

        label:
          "Standard D latch",

        price: 11,

        priceIncludesGST: true
      },


      snapLatch: {

        label:
          "Standard Snap latch",

        price: 11,

        priceIncludesGST: true
      },


      other: {

        label:
          "Other",

        // User enters description and cost.
        price: 0,

        priceIncludesGST: true
      },


      none: {

        label:
          "No latch",

        price: 0,

        priceIncludesGST: true
      }

    },


    screws: {

      defaultPerGate: 7.50,

      priceIncludesGST: true
    }

  },


  // ==========================================================
  // POST FIXING
  // ==========================================================

  postFixing: {

    methods: {

      brick: {
        label:
          "Fixed to brick"
      },


      concreteHouse: {
        label:
          "Concreted next to house"
      },


      concreteFloating: {
        label:
          "Concreted floating"
      },


      fixedPanelLeft: {
        label:
          "Fixed panel - left post"
      },


      fixedPanelCentre: {
        label:
          "Fixed panel - centre post"
      },


      fixedPanelRight: {
        label:
          "Fixed panel - right post"
      },


      baseplate: {
        label:
          "Baseplated"
      },


      existing: {
        label:
          "Existing structure / no new post"
      }

    },


    concrete: {

      pricePerBag: 8,

      priceIncludesGST: true,

      defaultBagsPerPost: 2
    },


    dynabolts: {

      diameterMm: 10,

      lengthMm: 75,

      priceEach: 2,

      priceIncludesGST: true
    },


    baseplate: {

      // Includes:
      // steel
      // drilling
      // welding
      // 4 x Dynabolts

      allowanceEach: 25,

      priceIncludesGST: true,

      dynaboltCount: 4
    }

  },


  // ==========================================================
  // POWDER COATING
  // ==========================================================

  powderCoating: {

    // All values INC GST.
    // Travel to/from powder coater is already included.

    gateEach: 180,

    postEach: 40,

    verticalFixedPanelEach: 150,

    priceIncludesGST: true,

    quoteNote:
      "Allow approximately 2 weeks for powder-coat processing."
  },


  // ==========================================================
  // NON-POWDER-COATED STEEL
  // ==========================================================

  galvanisedFinish: {

    label:
      "Duragalv",

    touchUpLabel:
      "Etch primer and silver galvanising spray",

    pricePerM2: 5,

    priceIncludesGST: true,

    quoteText:
      "Duragalv steel with exposed fabrication areas treated with etch primer and silver galvanising spray."
  },


  // ==========================================================
  // LABOUR ESTIMATION
  // ==========================================================

  labour: {

    // Fabrication of each gate leaf.
    // Based on approx 1800 x 1200 gate.
    gateFabricationHoursEach: 1.5,


    // Fabricating each new post.
    postFabricationHoursEach:
      20 / 60,


    // Drilling each bolt hole through post.
    boltHoleFabricationHoursEach:
      5 / 60,


    // Additional fabrication allowance
    // for each fixed panel.
    fixedPanelFabricationHoursEach: 1,


    // Installation of each concreted post.
    concretePostInstallHoursEach: 0.5,


    // Installation of each baseplated post.
    baseplatePostInstallHoursEach:
      20 / 60,


    // Hang each gate and install latch.
    gateInstallHoursEach: 1
  },


  // ==========================================================
  // QUOTE
  // ==========================================================

  quote: {

    depositPercent: 0.50,

    depositText:
      "50% deposit required on acceptance. Balance payable on completion.",

    powderCoatLeadTime:
      "Allow approximately 2 weeks for powder-coat processing.",

    bccEmail:
      "jtladesign@gmail.com"
  },


  // ==========================================================
  // DEFAULTS
  // ==========================================================

  defaults: {

    // The layout itself defines the job.
    // No single/double gate selection.

    includeFrame: true,
    includePosts: true,
    includeCladding: true,

    frame: "50x25_rhs",

    postType: "65x65_shs",

    cladding: "ekodeck",

    claddingDirection: "vertical",

    latch: "ddDualKey",

    powderCoat: false,

    horizontalMidRails: 0,

    verticalMidRails: 0,

    componentGapMm: 12,

    gateBottomGapMm: 40,

    concreteEmbedMm: 650,

    claddingGapMm: 5,

    dynaboltLengthMm: 75,

    startingProjectNumber: 1246
  }

};
