/* =========================================================
   JTLA GATES
   MASTER PRICE BOOK / CONFIGURATION

   Clean rebuild configuration file.

   IMPORTANT:
   - Prices and configuration only.
   - No DOM access.
   - No rendering.
   - No job-specific calculations.
   - app.js is responsible for calculations using these values.
   ========================================================= */

const PRICES = {

  /* =======================================================
     VERSION
     ======================================================= */

  version: {
    schema: 1,
    name: "JTLA Gates Clean Rebuild"
  },


  /* =======================================================
     COMPANY
     ======================================================= */

  company: {
    name: "JTLA Gates",
    contactName: "Jody Tuuta",
    phone: "0439517783",
    email: "jtladesign@gmail.com"
  },


  /* =======================================================
     BUSINESS SETTINGS
     ======================================================= */

  business: {
    labourRate: 60,

    materialMarkup: 0.20,

    gst: 0.10,

    includedTravelKm: 20,

    travelRatePerKm: 1.50,

    /*
      Quote rounding is always UP.

      Example:
      $1271 -> $1280
    */
    roundTo: 10,
    roundDirection: "up",

    steelStockLengthM: 8
  },


  /* =======================================================
     BANK DETAILS

     Preserve exactly.
     ======================================================= */

  bank: {
    accountName: "JW and GF Tuuta",
    bsb: "306 089",
    accountNumber: "3406851"
  },


  /* =======================================================
     PROJECT NUMBERS
     ======================================================= */

  projects: {

    /*
      Starting fallback number.

      New jobs should normally use:
      highest saved LocalStorage project number + 1
    */
    startingProjectNumber: 1246,

    prefix: "00",

    numberDigits: 4,

    /*
      Example:
      1246 -> 001246
    */
    totalDisplayDigits: 6,

    numberingMethod: "highest_saved_plus_one"
  },


  /* =======================================================
     STEEL
     ======================================================= */

  steel: {

    /* -----------------------------------------------------
       GATE / PANEL FRAME STEEL
       ----------------------------------------------------- */

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

        /*
          Supplier price is EX GST.
        */
        pricePerStockLength: 72.00,
        priceIncludesGST: false
      }

    },


    /* -----------------------------------------------------
       POSTS
       ----------------------------------------------------- */

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
     COMPONENT / FABRICATION RULES
     ======================================================= */

  fabrication: {

    /*
      STANDARD GATE CLEARANCES

      Example:
      Post | 12mm | Gate | 12mm | Post

      Steel gap around a normal single gate:
      12mm each side.
    */
    gateSideGapMm: 12,

    /*
      Double gates use ONE 15mm centre steel-frame gap.

      This is NOT:
      15mm per gate.
    */
    doubleGateCentreGapMm: 15,

    /*
      Gate cladding projects beyond the steel frame.

      The same 6mm overhang is used on:
      - single gates
      - double gate outer sides
      - double gate centre sides

      Final adjustment can be made onsite.
    */
    gateCladdingOverhangMm: 6,

    /*
      Approximate desired finished visual gap.
    */
    finishedCladdingGapMm: 6,

    /*
      Gate ground clearance.
    */
    gateGroundGapMm: 40,

    /*
      Standard concrete embedment below finished surface.
    */
    concreteEmbedmentMm: 650,

    /*
      Baseplated posts finish 10mm below nominated
      finished height to allow for the base plate.
    */
    baseplateHeightAllowanceMm: 10,

    /*
      Ordinary cut cladding gets approximately
      30mm additional cutting length for processing.

      Fixed stock presets do NOT get this allowance.
    */
    claddingProcessingAllowanceMm: 30,

    /*
      Normal cladding spacing where applicable.
    */
    claddingGapMm: 5,

    /*
      User may select/edit internal rail quantity.
    */
    maxGateMidRails: 4
  },


  /* =======================================================
     COMPONENT BEHAVIOUR
     ======================================================= */

  componentRules: {

    post: {

      label: "Post",

      /*
        Standalone posts occupy their actual steel width
        in the cavity calculation.
      */
      occupiesPhysicalWidth: true,

      allowManualFinishedHeight: true,

      fixingOptions: [
        "fixed_brick",
        "concrete_house",
        "concrete_floating",
        "baseplate",
        "existing_structure"
      ]

    },


    gate: {

      label: "Gate",

      defaultHingeSide: "left",

      defaultOpenDirection: "in",

      allowManualWidth: true,

      /*
        If manually overridden, Reset to Auto
        must remain available.
      */
      widthModes: [
        "auto",
        "manual"
      ],

      /*
        Two gates are NOT automatically assumed
        to be a double gate.
      */
      relationshipOptions: [
        "single",
        "double"
      ],

      /*
        One job may contain multiple unrelated gates.
      */
      allowMultipleIndependentGates: true,

      /*
        All gates use the job-wide cladding selection.
      */
      usesJobCladding: true
    },


    fixedPanel: {

      label: "Fixed Panel",

      /*
        A Fixed Panel is a COMPLETE component.

        It contains:
        - left post
        - infill/cladding
        - right post

        Separate Post components are NOT added for
        these two built-in posts.
      */
      includesLeftPost: true,
      includesRightPost: true,

      /*
        Fixed-panel entered/calculated width represents
        the whole physical panel including its two posts.
      */
      widthIncludesPosts: true,

      /*
        No automatic fabrication clearance is deducted
        around a fixed panel.
      */
      externalGapMm: 0,

      /*
        Cladding sits across the FRONT of the posts
        and covers both posts plus the opening.
      */
      claddingCoversPosts: true,

      /*
        A neighbouring gate may hang from one of the
        fixed panel's built-in posts.
      */
      canSupportAdjacentGate: true,

      /*
        Each built-in post has its own fixing method.
      */
      postFixingOptions: [
        "fixed_brick",
        "concrete_house",
        "concrete_floating",
        "baseplate",
        "existing_structure"
      ],

      /*
        VERTICAL CLADDING

        Default:
        - top rail
        - middle rail
        - bottom rail

        User can increase rail count when required.
      */
      verticalCladdingDefaultRailCount: 3,
      verticalCladdingMinimumRailCount: 2,
      verticalCladdingMaximumRailCount: 6,

      /*
        HORIZONTAL CLADDING

        No internal rails.
        The horizontal cladding itself spans between
        the built-in posts.
      */
      horizontalCladdingRailCount: 0,

      usesJobCladding: true
    }

  },


  /* =======================================================
     POST FIXING TYPES
     ======================================================= */

  postFixings: {

    fixed_brick: {
      label: "Fixed to brick",
      requiresHolePositions: true,
      usesConcrete: false,
      usesBaseplate: false,
      newPostRequired: true
    },

    concrete_house: {
      label: "Concreted next to house",
      requiresHolePositions: false,
      usesConcrete: true,
      usesBaseplate: false,
      newPostRequired: true
    },

    concrete_floating: {
      label: "Concreted floating",
      requiresHolePositions: false,
      usesConcrete: true,
      usesBaseplate: false,
      newPostRequired: true
    },

    baseplate: {
      label: "Baseplated",
      requiresHolePositions: true,
      usesConcrete: false,
      usesBaseplate: true,
      newPostRequired: true
    },

    existing_structure: {
      label: "Existing structure / no new post",
      requiresHolePositions: false,
      usesConcrete: false,
      usesBaseplate: false,
      newPostRequired: false,

      /*
        No new steel, fabrication or powder-coating cost.
      */
      excludeFromSteelCost: true,
      excludeFromPostFabricationLabour: true,
      excludeFromPowderCoating: true
    }

  },


  /* =======================================================
     CLADDING

     CLADDING IS JOB-WIDE.

     A job has ONE cladding specification.
     If a different cladding is required, create another job.
     ======================================================= */

  cladding: {

    jobWide: true,


    /* -----------------------------------------------------
       EKODECK
       ----------------------------------------------------- */

    ekodeck: {

      label: "Ekodeck Screening 67x15mm",
      shortLabel: "Eko",

      boardWidthMm: 67,
      thicknessMm: 15,

      stockLengthM: 2.7,

      pricePerStockLength: 16.00,
      priceIncludesGST: true,

      /*
        Additional cladding installation/fabrication labour.
      */
      labourRatePerM2: 50.00,

      processingAllowanceMode: "add_standard",

      allowDirection: true,

      colours: [
        "Greystone",
        "Alpine Ash",
        "Leatherwood",
        "Riverbank Red"
      ]

    },


    /* -----------------------------------------------------
       CYPRESS
       ----------------------------------------------------- */

    cypressPickets: {

      label: "Cypress 67x15mm",
      shortLabel: "Cypress",

      boardWidthMm: 67,
      thicknessMm: 15,

      pricePerLinealM: 4.20,
      priceIncludesGST: true,

      /*
        Timber cladding labour allowance.
      */
      labourRatePerM2: 50.00,

      processingAllowanceMode: "add_standard",

      /*
        If a nominated fixed stock length is later selected
        in the UI, that stock preset must not receive the
        additional 30mm processing allowance.
      */
      fixedStockPresetUsesExactLength: true,

      allowDirection: true,

      finishes: [
        "Raw",
        "Oil",
        "Paint"
      ]

    },


    /* -----------------------------------------------------
       LOSP 92
       ----------------------------------------------------- */

    losp90: {

      label: "LOSP 92x18mm Primed H3",
      shortLabel: "LOSP 92",

      boardWidthMm: 92,
      thicknessMm: 18,

      stockLengthM: 5.4,

      pricePerStockLength: 50.10,
      priceIncludesGST: true,

      /*
        Includes cladding work / painting allowance.
      */
      labourRatePerM2: 60.00,

      processingAllowanceMode: "add_standard",

      allowDirection: true,

      finishes: [
        "Primed",
        "Paint"
      ]

    },


    /* -----------------------------------------------------
       LOSP 138
       ----------------------------------------------------- */

    losp140: {

      label: "LOSP 138x18mm Primed H3",
      shortLabel: "LOSP 138",

      boardWidthMm: 138,
      thicknessMm: 18,

      stockLengthM: 5.4,

      pricePerStockLength: 53.90,
      priceIncludesGST: true,

      labourRatePerM2: 60.00,

      processingAllowanceMode: "add_standard",

      allowDirection: true,

      finishes: [
        "Primed",
        "Paint"
      ]

    },


    /* -----------------------------------------------------
       MERBAU 90
       ----------------------------------------------------- */

    merbau90: {

      label: "Merbau Decking 90mm",
      shortLabel: "Merbau 90",

      boardWidthMm: 90,

      pricePerLinealM: 6.00,
      priceIncludesGST: true,

      labourRatePerM2: 50.00,

      processingAllowanceMode: "add_standard",

      allowDirection: true,

      finishes: [
        "Raw",
        "Oil"
      ]

    },


    /* -----------------------------------------------------
       MERBAU 140
       ----------------------------------------------------- */

    merbau140: {

      label: "Merbau Decking 140mm",
      shortLabel: "Merbau 140",

      boardWidthMm: 140,

      pricePerLinealM: 9.50,
      priceIncludesGST: true,

      labourRatePerM2: 50.00,

      processingAllowanceMode: "add_standard",

      allowDirection: true,

      finishes: [
        "Raw",
        "Oil"
      ]

    },


    /* -----------------------------------------------------
       TREATED PINE PALINGS
       ----------------------------------------------------- */

    treatedPinePalings: {

      label: "Treated Pine Palings",
      shortLabel: "Pine",

      priceEach: 2.50,
      priceIncludesGST: true,

      /*
        Additional cladding labour.
      */
      labourRatePerM2: 30.00,

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

      allowDirection: true,

      /*
        Normally used vertically.
      */
      defaultDirection: "vertical",

      /*
        Quantity rules.

        100mm:
        normal board-width quantity +
        3 extra palings per metre of clad width.

        125mm:
        same additional rule.

        150mm:
        use exact-order logic in app.js.
        Required benchmark:
        1000mm clad width = 10 x 150mm palings.
      */
      quantityRules: {

        100: {
          mode: "board_width_plus_extra_per_metre",
          extraPerMetre: 3
        },

        125: {
          mode: "board_width_plus_extra_per_metre",
          extraPerMetre: 3
        },

        150: {
          mode: "exact_order",
          benchmarkWidthMm: 1000,
          benchmarkQuantity: 10
        }

      },

      /*
        Capping and Plinth share ONE calculated/editable
        length value in the UI but remain separate materials.
      */
      accessoryLengthShared: true,

      capping: {
        defaultIncluded: true,
        pricePerM: 5.00,
        priceIncludesGST: true
      },

      plinth: {
        defaultIncluded: true,
        pricePerM: 5.00,
        priceIncludesGST: true
      },

      processingAllowanceMode: "fixed_stock"

    },


    /* -----------------------------------------------------
       50x50 GALVANISED MESH
       ----------------------------------------------------- */

    galvMesh50: {

      label: "50x50mm Galvanised Mesh - 4.0mm Wire",
      shortLabel: "Mesh",

      cellSizeMm: 50,
      wireDiameterMm: 4,

      /*
        Quoting/internal costing rate EX GST.
      */
      pricePerM2: 18.00,
      priceIncludesGST: false,

      /*
        Additional mesh fitting/fabrication labour.
      */
      labourRatePerM2: 60.00,

      /*
        Mesh sits INSIDE the steel frame.

        Cut dimensions are based on the clear
        INTERNAL frame opening.
      */
      position: "inside_frame",

      allowDirection: false,
      allowColour: false,

      sheets: [

        {
          key: "3000x2400",
          label: "3000x2400mm Sheet",
          lengthMm: 3000,
          widthMm: 2400,
          canSupplyMultiplePieces: true
        },

        {
          key: "2400x1200",
          label: "2400x1200mm Sheet",
          lengthMm: 2400,
          widthMm: 1200,
          canSupplyMultiplePieces: true
        },

        {
          key: "2000x1200",
          label: "2000x1200mm Sheet",
          lengthMm: 2000,
          widthMm: 1200,
          canSupplyMultiplePieces: true
        }

      ],

      /*
        App should attempt sensible approximate
        sheet optimisation only.
      */
      optimiseSheets: true

    },


    /* -----------------------------------------------------
       COLORBOND
       ----------------------------------------------------- */

    colorbond: {

      label: "Colorbond Steel Cladding",
      shortLabel: "Colorbond",

      pricePerM2: 0,
      priceIncludesGST: true,

      /*
        No new automatic labour rate has been nominated.
        The app may allow an editable cladding allowance.
      */
      labourRatePerM2: 0,
      labourRateEditable: true,

      allowDirection: true,

      profiles: [
        "Good Neighbour",
        "Corrugated",
        "Trimdek",
        "Other"
      ]

    },


    /* -----------------------------------------------------
       CUSTOM / OTHER
       ----------------------------------------------------- */

    custom: {

      label: "Custom / Other",
      shortLabel: "Custom",

      /*
        User can cost custom cladding in either way:
        1. Total material cost
        2. Quantity x unit cost
      */
      costingModes: [
        "total",
        "quantity_unit"
      ],

      priceIncludesGST: true,

      allowGSTSelection: true,

      labourRatePerM2: 0,
      labourRateEditable: true,

      allowDirection: true

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

      label: "Baseplated post fabrication allowance",

      /*
        $40 EX GST total allowance.

        Includes:
        - baseplate steel
        - welding baseplate
        - normal cap fabrication/welding

        Post stock steel is still calculated separately.

        Do NOT also add the normal 30-minute post
        fabrication labour to a baseplated post.

        Any entered drilled/bolt hole adds
        10 minutes labour immediately.
      */
      fabricationAllowanceExGST: 40.00,
      priceIncludesGST: false,

      replacesStandardPostFabricationLabour: true

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
     CONCRETE / GROUND WORK
     ======================================================= */

  concrete: {

    label: "Concrete",

    pricePerBag: 8.00,
    priceIncludesGST: true,

    defaultBagsPerPost: 2,

    /*
      Concreted posts automatically create a
      spoil-removal requirement.

      No separate spoil-removal dollar amount exists in
      the current price book, so do not invent one.
    */
    addSpoilRemovalRequirement: true,

    spoilRemoval: {
      label: "Spoil removal",
      automaticForConcretedPost: true,
      costingAllowance: 0,
      priceIncludesGST: true
    }

  },


  /* =======================================================
     LABOUR
     ======================================================= */

  labour: {

    /*
      -------------------------------------------------------
      GATES
      -------------------------------------------------------

      EACH gate leaf:
      2.0 hours fabrication
      1.5 hours hang/install/latch

      Therefore a double gate:
      4.0 fabrication
      3.0 installation
      = 7.0 hours before other labour.
    */

    gateFabricationHoursEach: 2.0,

    hangGateHoursEach: 1.5,


    /*
      -------------------------------------------------------
      FIXED PANELS
      -------------------------------------------------------

      EACH complete fixed panel:
      2.0 hours fabrication
      1.5 hours installation

      Post fixing work is additional where applicable.
    */

    fixedPanelFabricationHoursEach: 2.0,

    fixedPanelInstallHoursEach: 1.5,


    /*
      -------------------------------------------------------
      NORMAL POSTS
      -------------------------------------------------------

      Standard post fabrication:
      30 minutes.

      Covers:
      - cut to length
      - cap
      - weld
      - finish basic fabrication
    */

    postFabricationHoursEach: 0.5,


    /*
      -------------------------------------------------------
      BRICK-FIXED POST HOLES
      -------------------------------------------------------

      Minimum total post fabrication/drilling allowance:
      30 minutes.

      Every hole represents 10 minutes,
      but the first holes remain within the 30-minute
      minimum.

      Examples:
      0 holes = 30 min
      1 hole  = 30 min
      2 holes = 30 min
      3 holes = 30 min
      4 holes = 40 min
      5 holes = 50 min

      app.js should therefore use:

      max(
        postFabricationHoursEach,
        holeCount * drilledHoleHoursEach
      )
    */

    drilledHoleHoursEach: 10 / 60,

    brickFixedMinimumHours: 0.5,


    /*
      -------------------------------------------------------
      BASEPLATED POST HOLES
      -------------------------------------------------------

      Baseplate basic fabrication is already contained
      in the $40 EX GST baseplate allowance.

      Therefore EACH entered additional hole adds
      10 minutes immediately.
    */

    baseplateHoleHoursEach: 10 / 60,


    /*
      -------------------------------------------------------
      CONCRETED POSTS
      -------------------------------------------------------
    */

    concretePostInstallHoursEach: 0.5,


    /*
      -------------------------------------------------------
      BASEPLATED POST INSTALLATION
      -------------------------------------------------------

      Existing allowance retained.
    */

    baseplatePostInstallHoursEach: 20 / 60

  },


  /* =======================================================
     INTERNAL RAIL RULES
     ======================================================= */

  rails: {

    gate: {

      /*
        Rail quantity is user-editable.
        The app should not try to decide every gate design.

        Horizontal cladding generally requires
        vertical internal rail(s).

        Vertical cladding generally requires
        horizontal internal rail(s).
      */
      editable: true,

      defaultInternalRailCount: 1,

      minimumInternalRailCount: 0,

      maximumInternalRailCount: 4,

      /*
        Rail cut length is clear internal frame dimension.

        Example:
        1000 wide x 1700 high gate,
        50x25 RHS,
        horizontally clad.

        Vertical internal rail:
        1700 - 50 - 50
        = 1600mm.
      */
      cutLengthMode: "clear_inside_frame"

    },


    fixedPanel: {

      /*
        Vertical cladding:
        top + middle + bottom by default.
      */
      verticalDefaultRailCount: 3,

      verticalRailCountEditable: true,

      verticalMinimumRailCount: 2,

      verticalMaximumRailCount: 6,

      /*
        Horizontal fixed-panel cladding:
        NO internal rails.
        Cladding spans directly between posts.
      */
      horizontalRailCount: 0,

      cutLengthMode: "between_posts"

    }

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

     WHOLE JOB ONLY.
     No individual component powder-coating switches.

     ALL RATES EX GST.
     ======================================================= */

  powderCoating: {

    jobWide: true,

    priceIncludesGST: false,

    postRatePerLm: {

      "65x65_shs": 9.50,

      "75x75_shs": 11.50,

      "85x85_shs": 13.50,

      "100x100_shs": 15.00

    },

    /*
      Duragalv open frame:
      length x width square metres.
    */
    openFrameRatePerM2: 65.00,

    /*
      Added once per powder-coated job.
    */
    jobTravelAllowanceExGST: 20.00,

    processingTime:
      "Allow approximately 2 weeks for powder coating.",

    /*
      Existing structure/no-new-post items are excluded.
    */
    excludeExistingStructures: true

  },


  /* =======================================================
     COLORBOND POWDER-COAT COLOURS
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
      "Other / custom description"

  },


  /* =======================================================
     CLIENT FIELD RULES
     ======================================================= */

  clientFields: {

    mobile: {

      /*
        Input visibly starts with actual "04".

        Maximum:
        10 digits total.
      */
      defaultValue: "04",

      requiredPrefix: "04",

      maxDigits: 10

    },

    projectNumber: {

      prefix: "00",

      digitsAfterPrefix: 4

    },

    smartCapitalisation: true

  },


  /* =======================================================
     DEFAULTS
     ======================================================= */

  defaults: {

    finishedHeightMm: 1800,

    frameType: "50x25_rhs",

    postType: "65x65_shs",

    claddingType: "ekodeck",

    claddingDirection: "horizontal",

    hingeSide: "left",

    openDirection: "in",

    referenceDirection: "streetToProperty",

    gateGroundGapMm: 40,

    gateSideGapMm: 12,

    doubleGateCentreGapMm: 15,

    gateCladdingOverhangMm: 6,

    claddingProcessingAllowanceMm: 30,

    concreteEmbedmentMm: 650,

    baseplateHeightAllowanceMm: 10,

    dynaboltLengthMm: 75,

    dynaboltDiameterMm: 10,

    claddingGapMm: 5,

    powderCoating: false,

    powderColour: "",

    gateInternalRailCount: 1,

    fixedPanelVerticalRailCount: 3,

    fixedPanelLeftPostFixing: "concrete_floating",

    fixedPanelRightPostFixing: "concrete_floating"

  },


  /* =======================================================
     QUOTE CONTROL
     ======================================================= */

  quote: {

    /*
      Automatic quote rounds UP to configured $10.
    */
    roundAutomaticQuoteUp: true,

    /*
      Manual quote input is the FINAL INC-GST amount.
    */
    manualEntryIncludesGST: true,

    /*
      Any price-affecting change returns a manual
      quote to Auto.

      Non-price-affecting client details do not.
    */
    invalidateManualOnPricingChange: true,

    /*
      Profit displayed internally as:

      Quote EX GST
      minus
      all actual job costs EX GST

      Job costs include labour valued at $60/hr.
    */
    profitMethod: "quote_ex_gst_minus_all_ex_gst_costs",

    effectiveRateAreaMethod: "entire_cavity",

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

  },


  /* =======================================================
     EMAIL / SMS
     ======================================================= */

  communications: {

    email: {

      includeProjectReferenceInSubject: true,

      repeatSubjectInBody: false,

      includeBankDetails: true,

      includeDepositTerms: true,

      includeSignature: false

    },

    sms: {

      includeShortWorkDescription: true,

      includeFinalAmount: true,

      includeBankDetails: false,

      /*
        Avoid long deposit wording in SMS.
      */
      includeLongDepositTerms: false

    }

  },


  /* =======================================================
     SAVING / LOCAL STORAGE
     ======================================================= */

  storage: {

    activeJobKey: "jtlaGatesActiveJob",

    savedJobsKey: "jtlaGatesSavedJobs",

    autosaveActiveJob: true,

    restoreActiveJobOnLoad: true,

    savedJobsPersistUntilDeleted: true,

    requireConfirmationBeforeOpeningSavedJob: true,

    /*
      Keep enough history for accidental move/delete actions
      without building a complicated undo system.
    */
    undoHistoryLimit: 20

  }

};


/* =========================================================
   EXPOSE CONFIGURATION

   index.html will load prices.js before app.js.
   ========================================================= */

window.PRICES = PRICES;
