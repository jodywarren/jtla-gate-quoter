// ============================================================
// JTLA GATE QUOTER
// V1.3
// app.js
// ============================================================

const $ = (id) => document.getElementById(id);

let quoteType = "single";
let selectedCladding = "ekodeck";
let lastCalculation = null;
let currentQuoteText = "";


// ============================================================
// GENERAL HELPERS
// ============================================================

function money(value) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD"
  }).format(Number(value || 0));
}


function roundUp(value, increment) {
  if (!increment || increment <= 0) {
    return value;
  }

  return Math.ceil(value / increment) * increment;
}


function toExGST(price, includesGST) {
  const amount = Number(price || 0);

  if (includesGST) {
    return amount / (1 + PRICES.business.gst);
  }

  return amount;
}


function gateLeafCount() {
  return quoteType === "double" ? 2 : 1;
}


function getQuoteTypeLabel() {
  if (quoteType === "double") {
    return "Double gate";
  }

  if (quoteType === "slider") {
    return "Sliding gate";
  }

  return "Single gate";
}


// ============================================================
// POPULATE DROP-DOWNS
// ============================================================

function populateSelect(selectId, dataObject) {
  const select = $(selectId);

  select.innerHTML = "";

  Object.entries(dataObject).forEach(([key, item]) => {
    const option = document.createElement("option");

    option.value = key;
    option.textContent = item.label;

    select.appendChild(option);
  });
}


function setupPriceFields() {
  populateSelect(
    "frameSize",
    PRICES.steel.frame
  );

  populateSelect(
    "postSize",
    PRICES.steel.posts
  );

  populateSelect(
    "latch",
    PRICES.hardware.latches
  );

  $("frameSize").value =
    PRICES.defaults.frame;

  $("postSize").value =
    PRICES.defaults.posts;

  $("latch").value =
    PRICES.defaults.latch;

  $("postCount").value =
    PRICES.defaults.postCount;

  $("leftGap").value =
    PRICES.defaults.leftGapMm;

  $("rightGap").value =
    PRICES.defaults.rightGapMm;

  $("bottomGap").value =
    PRICES.defaults.bottomGapMm;

  $("dynaboltLength").value =
    PRICES.defaults.dynaboltLengthMm;

  $("powderCost").value =
    PRICES.finishing.powderCoat.typicalCost;

  selectedCladding =
    PRICES.defaults.cladding;
}


// ============================================================
// CUSTOMER DISPLAY
// ============================================================

function updateCustomerDisplay() {
  const customer =
    $("customerName").value.trim();

  $("stickyCustomerName").textContent =
    customer || "New Quote";

  $("quoteCustomerName").textContent =
    customer;

  $("quoteCustomerAddress").textContent =
    $("siteAddress").value.trim();

  $("quoteProjectNumber").textContent =
    $("projectNumber").value.trim();
}


// ============================================================
// REQUIRED FIELD RED / GREEN
// ============================================================

function validateRequiredFields() {
  const inputs =
    document.querySelectorAll(
      ".required-field input"
    );

  inputs.forEach((input) => {
    let valid = false;

    if (input.id === "projectNumber") {
      valid =
        /^[0-9]{6}$/.test(
          input.value.trim()
        );
    }

    else if (input.id === "customerEmail") {
      valid =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          input.value.trim()
        );
    }

    else if (input.id === "customerPhone") {
      valid =
        input.value
          .replace(/\D/g, "")
          .length >= 8;
    }

    else {
      valid =
        input.value.trim() !== "";
    }

    input.classList.toggle(
      "field-complete",
      valid
    );

    input.classList.toggle(
      "field-incomplete",
      !valid
    );
  });
}


// ============================================================
// GATE TYPE
// ============================================================

function setQuoteType(type) {
  quoteType = type;

  document
    .querySelectorAll(".tab")
    .forEach((tab) => {
      tab.classList.toggle(
        "active",
        tab.dataset.type === type
      );
    });

  // Starting labour only.
  // These remain editable.

  if (type === "single") {
    $("fabricationHours").value = 4;
    $("installationHours").value = 2;
  }

  else if (type === "double") {
    $("fabricationHours").value = 7;
    $("installationHours").value = 3;
  }

  else if (type === "slider") {
    $("fabricationHours").value = 8;
    $("installationHours").value = 4;
  }

  calculateProposedGateSize();
}


// ============================================================
// POST / FIXING HELPERS
// ============================================================

function selectedPostData() {
  return PRICES.steel.posts[
    $("postSize").value
  ];
}


function selectedFrameData() {
  return PRICES.steel.frame[
    $("frameSize").value
  ];
}


function postWidthForSide(side) {
  const fixing =
    side === "left"
      ? $("leftPostFixing").value
      : $("rightPostFixing").value;

  if (
    fixing === "none" ||
    fixing === "existing"
  ) {
    return 0;
  }

  return Number(
    selectedPostData().widthMm || 0
  );
}


function countKnownConcretedPosts() {
  let count = 0;

  if (
    $("leftPostFixing").value ===
    "concreted"
  ) {
    count++;
  }

  if (
    $("rightPostFixing").value ===
    "concreted"
  ) {
    count++;
  }

  const totalPosts =
    Number($("postCount").value || 0);

  // Any additional posts beyond the left/right
  // gate posts are assumed concreted.
  // This suits fixed panels and larger jobs.

  const extraPosts =
    Math.max(
      0,
      totalPosts - 2
    );

  count += extraPosts;

  return count;
}


function updateConcreteBagSuggestion() {
  const concretedPosts =
    countKnownConcretedPosts();

  $("concreteBags").value =
    concretedPosts *
    PRICES.fixings.concrete
      .defaultBagsPerPost;
}


// ============================================================
// PROPOSED GATE SIZE
// ============================================================

function calculateProposedGateSize() {
  const cavityWidth =
    Number($("cavityWidth").value || 0);

  const cavityHeight =
    Number($("cavityHeight").value || 0);

  const leftGap =
    Number($("leftGap").value || 0);

  const rightGap =
    Number($("rightGap").value || 0);

  const bottomGap =
    Number($("bottomGap").value || 0);

  const leftPostWidth =
    postWidthForSide("left");

  const rightPostWidth =
    postWidthForSide("right");

  let fixedPanelWidth = 0;

  if (
    $("fixedPanelOption").value !==
    "none"
  ) {
    fixedPanelWidth =
      Number(
        $("fixedPanelWidth").value || 0
      );
  }

  const proposedWidth =
    Math.max(
      0,
      cavityWidth -
      leftPostWidth -
      rightPostWidth -
      leftGap -
      rightGap -
      fixedPanelWidth
    );

  const proposedHeight =
    Math.max(
      0,
      cavityHeight -
      bottomGap
    );

  if (cavityWidth > 0) {
    $("gateWidth").value =
      Math.round(proposedWidth);
  }

  if (cavityHeight > 0) {
    $("gateHeight").value =
      Math.round(proposedHeight);
  }

  calculateQuote();
}


// ============================================================
// CLADDING MENU
// ============================================================

function setupCladdingMenu() {
  $("claddingButton")
    .addEventListener(
      "click",
      () => {
        $("claddingMenu")
          .classList.toggle("hidden");
      }
    );

  document
    .querySelectorAll(
      "[data-cladding]"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          selectedCladding =
            button.dataset.cladding;

          updateCladdingDisplay();

          $("claddingMenu")
            .classList.add("hidden");

          calculateQuote();
        }
      );
    });

  updateCladdingDisplay();
}


function updateCladdingDisplay() {
  const data =
    PRICES.cladding[
      selectedCladding
    ];

  $("claddingButtonText")
    .textContent =
    data
      ? data.label
      : "Custom / Other";

  $("ekodeckOptions")
    .classList.toggle(
      "hidden",
      selectedCladding !== "ekodeck"
    );

  $("cypressOptions")
    .classList.toggle(
      "hidden",
      selectedCladding !==
      "cypressPickets"
    );

  $("colorbondOptions")
    .classList.toggle(
      "hidden",
      selectedCladding !==
      "colorbond"
    );

  $("customCladdingOptions")
    .classList.toggle(
      "hidden",
      selectedCladding !==
      "custom"
    );
}


// ============================================================
// CONDITIONAL SECTIONS
// ============================================================

function updateConditionalSections() {
  const leftFix =
    $("leftPostFixing").value;

  const rightFix =
    $("rightPostFixing").value;

  const needsDynabolts =
    leftFix === "brick" ||
    rightFix === "brick";

  $("dynaboltOptions")
    .classList.toggle(
      "hidden",
      !needsDynabolts
    );

  $("fixedPanelOptions")
    .classList.toggle(
      "hidden",
      $("fixedPanelOption").value ===
      "none"
    );

  $("fixedPanelMaterialSummary")
    .classList.toggle(
      "hidden",
      $("fixedPanelOption").value ===
      "none"
    );

  $("powderOptions")
    .classList.toggle(
      "hidden",
      !$("powderCoat").checked
    );

  $("midRailResult")
    .classList.toggle(
      "hidden",
      $("midRailOption").value ===
      "none"
    );
}


// ============================================================
// STOCK CUTTING / WASTE
// Simple best-fit decreasing calculation.
// More accurate than simply total metres / stock length.
// ============================================================

function calculateStockFromPieces(
  piecesMetres,
  stockLengthM
) {
  const pieces =
    piecesMetres
      .filter((piece) => piece > 0)
      .sort((a, b) => b - a);

  if (!pieces.length) {
    return {
      stockLengths: 0,
      purchasedMetres: 0,
      usedMetres: 0,
      wasteMetres: 0
    };
  }

  const bins = [];

  pieces.forEach((piece) => {
    let placed = false;

    for (
      let i = 0;
      i < bins.length;
      i++
    ) {
      if (
        bins[i] + piece <=
        stockLengthM + 0.000001
      ) {
        bins[i] += piece;
        placed = true;
        break;
      }
    }

    if (!placed) {
      bins.push(piece);
    }
  });

  const usedMetres =
    pieces.reduce(
      (sum, piece) =>
        sum + piece,
      0
    );

  const purchasedMetres =
    bins.length * stockLengthM;

  return {
    stockLengths: bins.length,
    purchasedMetres,
    usedMetres,
    wasteMetres:
      purchasedMetres -
      usedMetres
  };
}


// ============================================================
// MID RAIL
// ============================================================

function calculateMidRail(
  gateWidthMm,
  gateHeightMm
) {
  const option =
    $("midRailOption").value;

  const frame =
    selectedFrameData();

  const frameFace =
    Number(frame.faceMm || 0);

  const leaves =
    gateLeafCount();

  if (option === "none") {
    $("midRailLength").textContent =
      "0 mm";

    return {
      piecesMm: [],
      totalM: 0
    };
  }

  let railLength = 0;

  if (option === "vertical") {
    railLength =
      Math.max(
        0,
        gateHeightMm -
        (frameFace * 2)
      );
  }

  else if (option === "horizontal") {
    const leafWidth =
      gateWidthMm / leaves;

    railLength =
      Math.max(
        0,
        leafWidth -
        (frameFace * 2)
      );
  }

  const piecesMm =
    Array(leaves)
      .fill(railLength);

  const totalM =
    piecesMm.reduce(
      (sum, value) =>
        sum + value,
      0
    ) / 1000;

  if (leaves > 1) {
    $("midRailLength").textContent =
      `${Math.round(railLength)} mm × ${leaves}`;
  }

  else {
    $("midRailLength").textContent =
      `${Math.round(railLength)} mm`;
  }

  return {
    piecesMm,
    totalM
  };
}


// ============================================================
// FRAME STEEL
// ============================================================

function calculateGateFrame(
  gateWidthMm,
  gateHeightMm,
  midRail
) {
  const leaves =
    gateLeafCount();

  const framePiecesMm = [];

  if (quoteType === "double") {
    const leafWidth =
      gateWidthMm / 2;

    for (
      let i = 0;
      i < 2;
      i++
    ) {
      framePiecesMm.push(
        leafWidth,
        leafWidth,
        gateHeightMm,
        gateHeightMm
      );
    }
  }

  else {
    framePiecesMm.push(
      gateWidthMm,
      gateWidthMm,
      gateHeightMm,
      gateHeightMm
    );
  }

  const perimeterM =
    framePiecesMm.reduce(
      (sum, piece) =>
        sum + piece,
      0
    ) / 1000;

  const allPiecesM = [
    ...framePiecesMm,
    ...midRail.piecesMm
  ].map(
    (value) =>
      value / 1000
  );

  const frameData =
    selectedFrameData();

  const stock =
    calculateStockFromPieces(
      allPiecesM,
      frameData.stockLengthM
    );

  const rawStockCost =
    stock.stockLengths *
    Number(frameData.price || 0);

  const costExGST =
    toExGST(
      rawStockCost,
      frameData.priceIncludesGST
    );

  return {
    perimeterM,
    midRailM: midRail.totalM,
    totalUsedM: stock.usedMetres,
    stockLengths: stock.stockLengths,
    purchasedMetres:
      stock.purchasedMetres,
    wasteM:
      stock.wasteMetres,
    costExGST
  };
}


// ============================================================
// FIXED PANEL FRAME
// ============================================================

function calculateFixedPanelFrame() {
  if (
    $("fixedPanelOption").value ===
    "none"
  ) {
    return {
      widthMm: 0,
      heightMm: 0,
      areaM2: 0,
      frameM: 0,
      piecesM: []
    };
  }

  const widthMm =
    Number(
      $("fixedPanelWidth").value || 0
    );

  const heightMm =
    Number(
      $("fixedPanelHeight").value || 0
    );

  const piecesM = [
    widthMm / 1000,
    widthMm / 1000,
    heightMm / 1000,
    heightMm / 1000
  ];

  const frameM =
    piecesM.reduce(
      (sum, item) =>
        sum + item,
      0
    );

  return {
    widthMm,
    heightMm,
    areaM2:
      (widthMm / 1000) *
      (heightMm / 1000),
    frameM,
    piecesM
  };
}


// ============================================================
// COMBINED FRAME INCLUDING FIXED PANEL
// ============================================================

function calculateCombinedFrame(
  gateWidthMm,
  gateHeightMm,
  midRail,
  fixedPanel
) {
  const gatePiecesMm = [];

  if (quoteType === "double") {
    const leafWidth =
      gateWidthMm / 2;

    for (
      let i = 0;
      i < 2;
      i++
    ) {
      gatePiecesMm.push(
        leafWidth,
        leafWidth,
        gateHeightMm,
        gateHeightMm
      );
    }
  }

  else {
    gatePiecesMm.push(
      gateWidthMm,
      gateWidthMm,
      gateHeightMm,
      gateHeightMm
    );
  }

  const piecesM = [
    ...gatePiecesMm.map(
      (item) => item / 1000
    ),
    ...midRail.piecesMm.map(
      (item) => item / 1000
    ),
    ...fixedPanel.piecesM
  ];

  const frame =
    selectedFrameData();

  const stock =
    calculateStockFromPieces(
      piecesM,
      frame.stockLengthM
    );

  const rawCost =
    stock.stockLengths *
    Number(frame.price || 0);

  return {
    stockLengths:
      stock.stockLengths,
    purchasedMetres:
      stock.purchasedMetres,
    usedMetres:
      stock.usedMetres,
    wasteM:
      stock.wasteMetres,
    costExGST:
      toExGST(
        rawCost,
        frame.priceIncludesGST
      )
  };
}


// ============================================================
// POSTS
// ============================================================

function calculatePostMaterial(
  gateHeightMm
) {
  const post =
    selectedPostData();

  if (
    $("postSize").value === "none"
  ) {
    return {
      piecesM: [],
      requiredM: 0,
      stockLengths: 0,
      purchasedM: 0,
      wasteM: 0,
      costExGST: 0
    };
  }

  const totalCount =
    Number(
      $("postCount").value || 0
    );

  if (totalCount <= 0) {
    return {
      piecesM: [],
      requiredM: 0,
      stockLengths: 0,
      purchasedM: 0,
      wasteM: 0,
      costExGST: 0
    };
  }

  const piecesM = [];

  const embedM =
    PRICES.defaults.postEmbedMm /
    1000;

  const aboveGroundM =
    gateHeightMm / 1000;

  // Left post

  if (
    totalCount >= 1 &&
    $("leftPostFixing").value !==
    "none" &&
    $("leftPostFixing").value !==
    "existing"
  ) {
    piecesM.push(
      aboveGroundM +
      (
        $("leftPostFixing").value ===
        "concreted"
          ? embedM
          : 0
      )
    );
  }

  // Right post

  if (
    totalCount >= 2 &&
    $("rightPostFixing").value !==
    "none" &&
    $("rightPostFixing").value !==
    "existing"
  ) {
    piecesM.push(
      aboveGroundM +
      (
        $("rightPostFixing").value ===
        "concreted"
          ? embedM
          : 0
      )
    );
  }

  // Any additional posts are treated as concreted.

  const alreadyProcessed =
    Math.min(totalCount, 2);

  for (
    let i = alreadyProcessed;
    i < totalCount;
    i++
  ) {
    piecesM.push(
      aboveGroundM + embedM
    );
  }

  const stock =
    calculateStockFromPieces(
      piecesM,
      post.stockLengthM
    );

  const rawCost =
    stock.stockLengths *
    Number(post.price || 0);

  return {
    piecesM,
    requiredM:
      stock.usedMetres,
    stockLengths:
      stock.stockLengths,
    purchasedM:
      stock.purchasedMetres,
    wasteM:
      stock.wasteMetres,
    costExGST:
      toExGST(
        rawCost,
        post.priceIncludesGST
      )
  };
}


// ============================================================
// BOARD CLADDING CALCULATOR
// ============================================================

function calculateBoardCladding({
  widthMm,
  heightMm,
  direction,
  data,
  stockLengthM,
  priceMode,
  priceValue
}) {
  const boardWidth =
    Number(data.boardWidthMm || 0);

  if (
    widthMm <= 0 ||
    heightMm <= 0 ||
    boardWidth <= 0
  ) {
    return {
      boards: 0,
      requiredM: 0,
      stockLengths: 0,
      purchasedM: 0,
      wasteM: 0,
      costExGST: 0
    };
  }

  let pieceLengthM;
  let piecesRequired;

  if (direction === "horizontal") {
    pieceLengthM =
      widthMm / 1000;

    piecesRequired =
      Math.ceil(
        heightMm /
        boardWidth
      );
  }

  else {
    pieceLengthM =
      heightMm / 1000;

    piecesRequired =
      Math.ceil(
        widthMm /
        boardWidth
      );
  }

  const pieces =
    Array(piecesRequired)
      .fill(pieceLengthM);

  let stock = {
    stockLengths: 0,
    purchasedMetres: 0,
    usedMetres:
      piecesRequired *
      pieceLengthM,
    wasteMetres: 0
  };

  if (stockLengthM > 0) {
    stock =
      calculateStockFromPieces(
        pieces,
        stockLengthM
      );
  }

  let rawCost = 0;

  if (
    priceMode ===
    "stockLength"
  ) {
    rawCost =
      stock.stockLengths *
      priceValue;
  }

  else if (
    priceMode ===
    "linealMetre"
  ) {
    const metresCharged =
      stockLengthM > 0
        ? stock.purchasedMetres
        : stock.usedMetres;

    rawCost =
      metresCharged *
      priceValue;
  }

  return {
    boards: piecesRequired,
    requiredM:
      stock.usedMetres,
    stockLengths:
      stock.stockLengths,
    purchasedM:
      stock.purchasedMetres,
    wasteM:
      stock.wasteMetres,
    rawCost
  };
}


// ============================================================
// GATE CLADDING
// ============================================================

function calculateGateCladding(
  widthMm,
  heightMm
) {
  const data =
    PRICES.cladding[
      selectedCladding
    ];

  const areaM2 =
    (widthMm / 1000) *
    (heightMm / 1000);

  let result = {
    boards: 0,
    requiredM: 0,
    stockLengths: 0,
    purchasedM: 0,
    wasteM: 0,
    costExGST: 0,
    description:
      data ? data.label : "",
    areaM2
  };

  // EKODECK

  if (
    selectedCladding ===
    "ekodeck"
  ) {
    const calc =
      calculateBoardCladding({
        widthMm,
        heightMm,
        direction: "vertical",
        data,
        stockLengthM:
          data.stockLengthM,
        priceMode:
          "stockLength",
        priceValue:
          data.pricePerStockLength
      });

    result = {
      ...result,
      ...calc,
      costExGST:
        toExGST(
          calc.rawCost,
          data.priceIncludesGST
        ),
      description:
        `${data.label}, ` +
        `${$("ekodeckColour").value}`
    };
  }

  // CYPRESS

  else if (
    selectedCladding ===
    "cypressPickets"
  ) {
    const stockM =
      Number(
        $("picketLength").value
      ) / 1000;

    const calc =
      calculateBoardCladding({
        widthMm,
        heightMm,
        direction: "vertical",
        data,
        stockLengthM: stockM,
        priceMode:
          "stockLength",
        priceValue:
          data.pricePerStockLength
      });

    result = {
      ...result,
      ...calc,
      costExGST:
        toExGST(
          calc.rawCost,
          data.priceIncludesGST
        ),
      description:
        `${data.label}, ` +
        `${$("cypressFinish").value}`
    };
  }

  // LOSP

  else if (
    selectedCladding === "losp50" ||
    selectedCladding === "losp90"
  ) {
    const calc =
      calculateBoardCladding({
        widthMm,
        heightMm,
        direction: "vertical",
        data,
        stockLengthM:
          data.stockLengthM,
        priceMode:
          "linealMetre",
        priceValue:
          data.pricePerLinealM
      });

    result = {
      ...result,
      ...calc,
      costExGST:
        toExGST(
          calc.rawCost,
          data.priceIncludesGST
        )
    };
  }

  // MERBAU

  else if (
    selectedCladding === "merbau90" ||
    selectedCladding === "merbau140"
  ) {
    const calc =
      calculateBoardCladding({
        widthMm,
        heightMm,
        direction: "vertical",
        data,
        stockLengthM:
          data.stockLengthM || 0,
        priceMode:
          "linealMetre",
        priceValue:
          data.pricePerLinealM || 0
      });

    result = {
      ...result,
      ...calc,
      costExGST:
        toExGST(
          calc.rawCost,
          data.priceIncludesGST
        )
    };
  }

  // COLORBOND

  else if (
    selectedCladding ===
    "colorbond"
  ) {
    const rawCost =
      areaM2 *
      Number(
        data.pricePerM2 || 0
      );

    result.costExGST =
      toExGST(
        rawCost,
        data.priceIncludesGST
      );

    result.description =
      `Colorbond ` +
      `${$("colorbondProfile").value}`;

    if (
      $("colorbondNotes")
        .value.trim()
    ) {
      result.description +=
        `, ${$("colorbondNotes")
          .value.trim()}`;
    }
  }

  // CUSTOM

  else if (
    selectedCladding === "custom"
  ) {
    result.costExGST =
      toExGST(
        Number(
          $("customCladdingCost")
            .value || 0
        ),
        true
      );

    result.description =
      $("customCladdingName")
        .value.trim() ||
      "Custom cladding";
  }

  return result;
}


// ============================================================
// FIXED PANEL CLADDING
// ============================================================

function calculateFixedPanelCladding(
  fixedPanel
) {
  if (
    $("fixedPanelOption").value ===
    "none"
  ) {
    return {
      boards: 0,
      requiredM: 0,
      stockLengths: 0,
      purchasedM: 0,
      wasteM: 0,
      costExGST: 0,
      description: ""
    };
  }

  let type =
    $("fixedPanelCladding").value;

  if (type === "same") {
    type = selectedCladding;
  }

  const data =
    PRICES.cladding[type];

  const direction =
    $("fixedPanelDirection").value;

  if (!data) {
    return {
      boards: 0,
      requiredM: 0,
      stockLengths: 0,
      purchasedM: 0,
      wasteM: 0,
      costExGST: 0,
      description: ""
    };
  }

  let calc = {
    boards: 0,
    requiredM: 0,
    stockLengths: 0,
    purchasedM: 0,
    wasteM: 0,
    rawCost: 0
  };

  if (type === "ekodeck") {
    calc =
      calculateBoardCladding({
        widthMm:
          fixedPanel.widthMm,
        heightMm:
          fixedPanel.heightMm,
        direction,
        data,
        stockLengthM:
          data.stockLengthM,
        priceMode:
          "stockLength",
        priceValue:
          data.pricePerStockLength
      });
  }

  else if (
    type === "cypressPickets"
  ) {
    calc =
      calculateBoardCladding({
        widthMm:
          fixedPanel.widthMm,
        heightMm:
          fixedPanel.heightMm,
        direction,
        data,
        stockLengthM:
          Number(
            $("picketLength").value
          ) / 1000,
        priceMode:
          "stockLength",
        priceValue:
          data.pricePerStockLength
      });
  }

  else if (
    type === "losp50" ||
    type === "losp90" ||
    type === "merbau90" ||
    type === "merbau140"
  ) {
    calc =
      calculateBoardCladding({
        widthMm:
          fixedPanel.widthMm,
        heightMm:
          fixedPanel.heightMm,
        direction,
        data,
        stockLengthM:
          data.stockLengthM || 0,
        priceMode:
          "linealMetre",
        priceValue:
          data.pricePerLinealM || 0
      });
  }

  else if (type === "colorbond") {
    const rawCost =
      fixedPanel.areaM2 *
      Number(
        data.pricePerM2 || 0
      );

    return {
      boards: 0,
      requiredM: 0,
      stockLengths: 0,
      purchasedM: 0,
      wasteM: 0,
      costExGST:
        toExGST(
          rawCost,
          data.priceIncludesGST
        ),
      description:
        "Colorbond steel cladding"
    };
  }

  return {
    ...calc,

    costExGST:
      toExGST(
        calc.rawCost,
        data.priceIncludesGST
      ),

    description:
      data.label
  };
}


// ============================================================
// HARDWARE
// ============================================================

function calculateHardware() {
  const leaves =
    gateLeafCount();

  const hingeSets =
    leaves;

  const hingeRaw =
    hingeSets *
    PRICES.hardware.hinges
      .pricePerSet;

  const hingeCostExGST =
    toExGST(
      hingeRaw,
      PRICES.hardware.hinges
        .priceIncludesGST
    );

  const latch =
    PRICES.hardware.latches[
      $("latch").value
    ];

  const latchCostExGST =
    toExGST(
      latch.price,
      latch.priceIncludesGST
    );

  // One screw allowance per gate leaf,
  // plus one for a fixed panel.

  const screwUnits =
    leaves +
    (
      $("fixedPanelOption").value !==
      "none"
        ? 1
        : 0
    );

  const screwsRaw =
    screwUnits *
    PRICES.hardware.screws
      .defaultPerGate;

  const screwsCostExGST =
    toExGST(
      screwsRaw,
      PRICES.hardware.screws
        .priceIncludesGST
    );

  return {
    hingeSets,
    hingeCostExGST,
    latchCostExGST,
    screwsCostExGST,
    latchLabel:
      latch.label
  };
}


// ============================================================
// FIXING COSTS
// ============================================================

function calculateFixings() {
  const concretedPosts =
    countKnownConcretedPosts();

  const concreteBags =
    Number(
      $("concreteBags").value || 0
    );

  const concreteRaw =
    concreteBags *
    PRICES.fixings.concrete
      .pricePerBag;

  const concreteCostExGST =
    toExGST(
      concreteRaw,
      PRICES.fixings.concrete
        .priceIncludesGST
    );

  const leftBrick =
    $("leftPostFixing").value ===
    "brick";

  const rightBrick =
    $("rightPostFixing").value ===
    "brick";

  const needsBolts =
    leftBrick || rightBrick;

  const boltCount =
    needsBolts
      ? Number(
          $("dynaboltCount").value || 0
        )
      : 0;

  const boltRaw =
    boltCount *
    PRICES.fixings.dynabolts
      .priceEach;

  const boltCostExGST =
    toExGST(
      boltRaw,
      PRICES.fixings.dynabolts
        .priceIncludesGST
    );

  return {
    concretedPosts,
    concreteBags,
    concreteCostExGST,
    boltCount,
    boltCostExGST
  };
}


// ============================================================
// FINISHING
// ============================================================

function calculateFinishing(
  gateAreaM2,
  fixedPanelAreaM2
) {
  const totalArea =
    gateAreaM2 +
    fixedPanelAreaM2;

  if ($("powderCoat").checked) {
    const raw =
      Number(
        $("powderCost").value || 0
      );

    return {
      powderCostExGST:
        toExGST(
          raw,
          PRICES.finishing
            .powderCoat
            .priceIncludesGST
        ),
      touchUpCostExGST: 0
    };
  }

  const rawTouchUp =
    totalArea *
    PRICES.finishing
      .galvanisedTouchUp
      .pricePerM2;

  return {
    powderCostExGST: 0,

    touchUpCostExGST:
      toExGST(
        rawTouchUp,
        PRICES.finishing
          .galvanisedTouchUp
          .priceIncludesGST
      )
  };
}


// ============================================================
// LABOUR
// ============================================================

function calculateLabour(
  concretedPosts
) {
  const fabrication =
    Number(
      $("fabricationHours")
        .value || 0
    );

  const installation =
    Number(
      $("installationHours")
        .value || 0
    );

  let holeDig =
    Number(
      $("holeDigHours")
        .value || 0
    );

  let soilRemoval =
    Number(
      $("soilRemovalHours")
        .value || 0
    );

  if (concretedPosts === 0) {
    holeDig = 0;
    soilRemoval = 0;
  }

  const totalHours =
    fabrication +
    installation +
    holeDig +
    soilRemoval;

  return {
    fabrication,
    installation,
    holeDig,
    soilRemoval,
    totalHours,

    costExGST:
      totalHours *
      PRICES.business
        .labourRateExGST
  };
}


// ============================================================
// TRAVEL
// ============================================================

function calculateTravel() {
  const totalKm =
    Number(
      $("travelKm").value || 0
    );

  const chargeableKm =
    Math.max(
      0,
      totalKm -
      PRICES.business
        .includedTravelKm
    );

  return {
    totalKm,
    chargeableKm,

    costExGST:
      chargeableKm *
      PRICES.business
        .travelRatePerKm
  };
}


// ============================================================
// MAIN CALCULATION
// ============================================================

function calculateQuote() {
  validateRequiredFields();

  updateCustomerDisplay();

  updateConditionalSections();

  const gateWidthMm =
    Number(
      $("gateWidth").value || 0
    );

  const gateHeightMm =
    Number(
      $("gateHeight").value || 0
    );

  const gateAreaM2 =
    (gateWidthMm / 1000) *
    (gateHeightMm / 1000);

  $("gateArea").textContent =
    `${gateAreaM2.toFixed(2)} m²`;

  // ----------------------------
  // MID RAIL
  // ----------------------------

  const midRail =
    calculateMidRail(
      gateWidthMm,
      gateHeightMm
    );

  // ----------------------------
  // FIXED PANEL
  // ----------------------------

  const fixedPanel =
    calculateFixedPanelFrame();

  // ----------------------------
  // FRAME
  // Includes fixed panel steel
  // so stock waste is shared.
  // ----------------------------

  const combinedFrame =
    calculateCombinedFrame(
      gateWidthMm,
      gateHeightMm,
      midRail,
      fixedPanel
    );

  const gateFrameOnly =
    calculateGateFrame(
      gateWidthMm,
      gateHeightMm,
      midRail
    );

  // ----------------------------
  // POSTS
  // ----------------------------

  const posts =
    calculatePostMaterial(
      gateHeightMm
    );

  // ----------------------------
  // CLADDING
  // ----------------------------

  const gateCladding =
    calculateGateCladding(
      gateWidthMm,
      gateHeightMm
    );

  const panelCladding =
    calculateFixedPanelCladding(
      fixedPanel
    );

  // ----------------------------
  // HARDWARE
  // ----------------------------

  const hardware =
    calculateHardware();

  // ----------------------------
  // FIXINGS
  // ----------------------------

  const fixings =
    calculateFixings();

  // ----------------------------
  // FINISHING
  // ----------------------------

  const finishing =
    calculateFinishing(
      gateAreaM2,
      fixedPanel.areaM2
    );

  // ----------------------------
  // EXTRA MATERIAL
  // User enters this as inc GST.
  // ----------------------------

  const extraHardwareRaw =
    Number(
      $("extraHardware")
        .value || 0
    );

  const extraHardwareExGST =
    toExGST(
      extraHardwareRaw,
      true
    );

  // ----------------------------
  // MATERIAL COST EX GST
  // ----------------------------

  const materialsExGST =
    combinedFrame.costExGST +
    posts.costExGST +
    gateCladding.costExGST +
    panelCladding.costExGST +
    hardware.hingeCostExGST +
    hardware.latchCostExGST +
    hardware.screwsCostExGST +
    fixings.concreteCostExGST +
    fixings.boltCostExGST +
    finishing.powderCostExGST +
    finishing.touchUpCostExGST +
    extraHardwareExGST;

  // ----------------------------
  // LABOUR
  // ----------------------------

  const labour =
    calculateLabour(
      fixings.concretedPosts
    );

  // ----------------------------
  // TRAVEL
  // ----------------------------

  const travel =
    calculateTravel();

  // ----------------------------
  // OTHER COSTS
  // User-entered as inc GST.
  // ----------------------------

  const otherCostsExGST =
    toExGST(
      Number(
        $("otherCosts")
          .value || 0
      ),
      true
    );

  // ----------------------------
  // MARKUP
  // Markup applies to materials.
  // ----------------------------

  const markup =
    materialsExGST *
    PRICES.business
      .materialMarkup;

  // ----------------------------
  // TOTALS
  // ----------------------------

  const calculatedExGST =
    materialsExGST +
    labour.costExGST +
    travel.costExGST +
    otherCostsExGST +
    markup;

  const calculatedGST =
    calculatedExGST *
    PRICES.business.gst;

  const calculatedIncGST =
    calculatedExGST +
    calculatedGST;

  const roundedFinal =
    roundUp(
      calculatedIncGST,
      PRICES.business.roundTo
    );

  // ----------------------------
  // DISPLAY MATERIALS
  // ----------------------------

  $("frameMetres").textContent =
    `${gateFrameOnly.perimeterM.toFixed(2)} m`;

  $("midRailMetres").textContent =
    `${midRail.totalM.toFixed(2)} m`;

  $("totalFrameMetres").textContent =
    `${combinedFrame.usedMetres.toFixed(2)} m`;

  $("frameLengths").textContent =
    combinedFrame.stockLengths;

  $("frameWaste").textContent =
    `${combinedFrame.wasteM.toFixed(2)} m`;

  $("postMetres").textContent =
    `${posts.requiredM.toFixed(2)} m`;

  $("postLengths").textContent =
    posts.stockLengths;

  $("postWaste").textContent =
    `${posts.wasteM.toFixed(2)} m`;

  $("claddingBoards").textContent =
    gateCladding.boards;

  $("claddingMetres").textContent =
    `${gateCladding.requiredM.toFixed(2)} m`;

  $("claddingStockLengths").textContent =
    gateCladding.stockLengths;

  $("claddingWaste").textContent =
    `${gateCladding.wasteM.toFixed(2)} m`;

  $("fixedPanelArea").textContent =
    `${fixedPanel.areaM2.toFixed(2)} m²`;

  $("fixedPanelFrameMetres").textContent =
    `${fixedPanel.frameM.toFixed(2)} m`;

  $("fixedPanelCladdingMetres").textContent =
    `${panelCladding.requiredM.toFixed(2)} m`;

  // ----------------------------
  // INTERNAL COST DISPLAY
  // ----------------------------

  $("materialsTotal").textContent =
    money(materialsExGST);

  $("labourTotal").textContent =
    money(labour.costExGST);

  $("travelTotal").textContent =
    money(travel.costExGST);

  $("directOtherTotal").textContent =
    money(otherCostsExGST);

  $("markupTotal").textContent =
    money(markup);

  $("exGstTotal").textContent =
    money(calculatedExGST);

  $("gstTotal").textContent =
    money(calculatedGST);

  $("incGstTotal").textContent =
    money(calculatedIncGST);

  // Don't overwrite a manually changed
  // final price unless the previous price
  // matched the previous calculation.

  const currentFinal =
    Number(
      $("finalPrice").value || 0
    );

  if (
    !lastCalculation ||
    currentFinal === 0 ||
    Math.abs(
      currentFinal -
      lastCalculation.roundedFinal
    ) < 0.01
  ) {
    $("finalPrice").value =
      roundedFinal;
  }

  lastCalculation = {
    gateWidthMm,
    gateHeightMm,
    gateAreaM2,

    midRail,
    fixedPanel,

    combinedFrame,
    gateFrameOnly,
    posts,

    gateCladding,
    panelCladding,

    hardware,
    fixings,
    finishing,

    extraHardwareExGST,

    materialsExGST,
    labour,
    travel,
    otherCostsExGST,

    markup,
    calculatedExGST,
    calculatedGST,
    calculatedIncGST,
    roundedFinal
  };

  updateProfitAndFinalQuote();

  updateDetailedCosting();
}


// ============================================================
// FINAL PRICE / PROFIT / GST
// ============================================================

function updateProfitAndFinalQuote() {
  if (!lastCalculation) {
    return;
  }

  const finalIncGST =
    Number(
      $("finalPrice").value || 0
    );

  const finalExGST =
    finalIncGST /
    (1 + PRICES.business.gst);

  const finalGST =
    finalIncGST -
    finalExGST;

  const actualCosts =
    lastCalculation.materialsExGST +
    lastCalculation.labour.costExGST +
    lastCalculation.travel.costExGST +
    lastCalculation.otherCostsExGST;

  const profit =
    finalExGST -
    actualCosts;

  $("profitTotal").textContent =
    money(profit);

  $("quoteExGstDisplay").textContent =
    money(finalExGST);

  $("quoteGstDisplay").textContent =
    money(finalGST);

  $("quoteTotalDisplay").textContent =
    money(finalIncGST);

  buildFinishedQuote(
    finalExGST,
    finalGST,
    finalIncGST
  );
}


// ============================================================
// DETAILED COSTING
// ============================================================

function updateDetailedCosting() {
  if (!lastCalculation) {
    return;
  }

  const c =
    lastCalculation;

  $("costBreakdown").innerHTML = `

    <p>
      <span>Frame steel stock</span>
      <strong>
        ${c.combinedFrame.stockLengths}
        x 8m
      </strong>
    </p>

    <p>
      <span>Frame steel cost ex GST</span>
      <strong>
        ${money(c.combinedFrame.costExGST)}
      </strong>
    </p>

    <p>
      <span>Post stock</span>
      <strong>
        ${c.posts.stockLengths}
        x 8m
      </strong>
    </p>

    <p>
      <span>Post cost ex GST</span>
      <strong>
        ${money(c.posts.costExGST)}
      </strong>
    </p>

    <p>
      <span>Gate cladding</span>
      <strong>
        ${money(c.gateCladding.costExGST)}
      </strong>
    </p>

    <p>
      <span>Fixed panel cladding</span>
      <strong>
        ${money(c.panelCladding.costExGST)}
      </strong>
    </p>

    <p>
      <span>
        Lock-out hinges
        (${c.hardware.hingeSets} set)
      </span>
      <strong>
        ${money(c.hardware.hingeCostExGST)}
      </strong>
    </p>

    <p>
      <span>Latch</span>
      <strong>
        ${money(c.hardware.latchCostExGST)}
      </strong>
    </p>

    <p>
      <span>Screws / fixings allowance</span>
      <strong>
        ${money(c.hardware.screwsCostExGST)}
      </strong>
    </p>

    <p>
      <span>Concrete</span>
      <strong>
        ${money(c.fixings.concreteCostExGST)}
      </strong>
    </p>

    <p>
      <span>Dynabolts</span>
      <strong>
        ${money(c.fixings.boltCostExGST)}
      </strong>
    </p>

    <p>
      <span>Powder coating</span>
      <strong>
        ${money(c.finishing.powderCostExGST)}
      </strong>
    </p>

    <p>
      <span>
        Etch primer / galv spray
      </span>
      <strong>
        ${money(c.finishing.touchUpCostExGST)}
      </strong>
    </p>

    <p>
      <span>Total labour</span>
      <strong>
        ${c.labour.totalHours.toFixed(2)} hrs
      </strong>
    </p>

    <p>
      <span>
        Labour @
        ${money(PRICES.business.labourRateExGST)}/hr
      </span>
      <strong>
        ${money(c.labour.costExGST)}
      </strong>
    </p>

    <p>
      <span>Chargeable travel</span>
      <strong>
        ${c.travel.chargeableKm.toFixed(0)} km
      </strong>
    </p>

    <p>
      <span>Travel</span>
      <strong>
        ${money(c.travel.costExGST)}
      </strong>
    </p>

    <p>
      <span>20% material markup</span>
      <strong>
        ${money(c.markup)}
      </strong>
    </p>

  `;
}


// ============================================================
// POST INSTALLATION TEXT
// ============================================================

function postFixingText(side) {
  const fixing =
    side === "left"
      ? $("leftPostFixing").value
      : $("rightPostFixing").value;

  const label =
    side === "left"
      ? "Left post"
      : "Right post";

  if (fixing === "concreted") {
    return (
      `${label} concreted approximately ` +
      `${PRICES.defaults.postEmbedMm}mm ` +
      `into ground`
    );
  }

  if (fixing === "brick") {
    return (
      `${label} fixed to existing ` +
      `brickwork with ` +
      `${$("dynaboltLength").value}x10mm ` +
      `galvanised Dynabolts`
    );
  }

  if (fixing === "existing") {
    return (
      `${label} uses existing ` +
      `post / structure`
    );
  }

  return `${label}: no new post`;
}


// ============================================================
// FINISHED QUOTE
// Same underlying wording is used for
// screen, SMS and email.
// ============================================================

function buildFinishedQuote(
  finalExGST,
  finalGST,
  finalIncGST
) {
  if (!lastCalculation) {
    return;
  }

  const customer =
    $("customerName").value.trim();

  const address =
    $("siteAddress").value.trim();

  const project =
    $("projectNumber").value.trim();

  const frameLabel =
    selectedFrameData().label;

  const postLabel =
    selectedPostData().label;

  const latchLabel =
    lastCalculation
      .hardware.latchLabel;

  const lines = [];

  lines.push(
    "JTLA GATES"
  );

  lines.push(
    "Jody Tuuta | 0439 517 783"
  );

  lines.push("");

  lines.push(
    `QUOTE ${project}`
  );

  lines.push(
    `Customer: ${customer}`
  );

  lines.push(
    `Site: ${address}`
  );

  lines.push("");

  lines.push(
    `Supply and install custom ` +
    `${getQuoteTypeLabel().toLowerCase()}.`
  );

  lines.push("");

  lines.push(
    `Gate: ` +
    `${lastCalculation.gateWidthMm}mm wide x ` +
    `${lastCalculation.gateHeightMm}mm high`
  );

  lines.push(
    `Frame: ${frameLabel}`
  );

  if (
    $("postSize").value !== "none" &&
    Number($("postCount").value) > 0
  ) {
    lines.push(
      `Posts: ${$("postCount").value} x ${postLabel}`
    );
  }

  lines.push(
    `Cladding: ` +
    `${lastCalculation.gateCladding.description}`
  );

  if (
    $("midRailOption").value !==
    "none"
  ) {
    const direction =
      $("midRailOption").value;

    lines.push(
      `Mid rail: ${direction}, ` +
      `${$("midRailLength").textContent}`
    );
  }

  if (
    $("fixedPanelOption").value !==
    "none"
  ) {
    lines.push(
      `Fixed panel: ` +
      `${lastCalculation.fixedPanel.widthMm}mm x ` +
      `${lastCalculation.fixedPanel.heightMm}mm, ` +
      `${$("fixedPanelDirection").value} cladding`
    );
  }

  lines.push(
    `Hinges: Lock-out galvanised hinges`
  );

  lines.push(
    `Latch: ${latchLabel}`
  );

  lines.push("");

  lines.push(
    "Installation:"
  );

  lines.push(
    postFixingText("left")
  );

  lines.push(
    postFixingText("right")
  );

  if ($("powderCoat").checked) {
    const colour =
      $("powderColour")
        .value.trim();

    lines.push("");

    lines.push(
      `Finish: Powder coated` +
      (
        colour
          ? ` ${colour}`
          : ""
      )
    );

    lines.push(
      PRICES.finishing
        .powderCoat.quoteNote
    );
  }

  else {
    lines.push("");

    lines.push(
      "Steel finish: Duragalv with exposed fabrication areas treated with etch primer and silver galvanising spray."
    );
  }

  lines.push("");

  lines.push(
    `Price ex GST: ${money(finalExGST)}`
  );

  lines.push(
    `GST: ${money(finalGST)}`
  );

  lines.push(
    `TOTAL INC GST: ${money(finalIncGST)}`
  );

  currentQuoteText =
    lines.join("\n");

  // ----------------------------
  // PROFESSIONAL SCREEN VERSION
  // ----------------------------

  const quoteHTML = [];

  quoteHTML.push(
    `<p>
      Supply and install custom
      <strong>
        ${getQuoteTypeLabel().toLowerCase()}
      </strong>.
    </p>`
  );

  quoteHTML.push(
    `<p>
      <strong>Gate:</strong>
      ${lastCalculation.gateWidthMm}mm wide
      ×
      ${lastCalculation.gateHeightMm}mm high
    </p>`
  );

  quoteHTML.push(
    `<p>
      <strong>Frame:</strong>
      ${frameLabel}
    </p>`
  );

  if (
    $("postSize").value !== "none" &&
    Number($("postCount").value) > 0
  ) {
    quoteHTML.push(
      `<p>
        <strong>Posts:</strong>
        ${$("postCount").value}
        ×
        ${postLabel}
      </p>`
    );
  }

  quoteHTML.push(
    `<p>
      <strong>Cladding:</strong>
      ${lastCalculation.gateCladding.description}
    </p>`
  );

  if (
    $("midRailOption").value !==
    "none"
  ) {
    quoteHTML.push(
      `<p>
        <strong>Mid rail:</strong>
        ${$("midRailOption").value},
        ${$("midRailLength").textContent}
      </p>`
    );
  }

  if (
    $("fixedPanelOption").value !==
    "none"
  ) {
    quoteHTML.push(
      `<p>
        <strong>Fixed panel:</strong>
        ${lastCalculation.fixedPanel.widthMm}mm
        ×
        ${lastCalculation.fixedPanel.heightMm}mm,
        ${$("fixedPanelDirection").value}
        cladding
      </p>`
    );
  }

  quoteHTML.push(
    `<p>
      <strong>Hardware:</strong>
      Lock-out galvanised hinges;
      ${latchLabel}
    </p>`
  );

  quoteHTML.push(
    `<p>
      <strong>Installation:</strong><br>
      ${postFixingText("left")}.<br>
      ${postFixingText("right")}.
    </p>`
  );

  if ($("powderCoat").checked) {
    quoteHTML.push(
      `<p>
        <strong>Finish:</strong>
        Powder coated
        ${
          $("powderColour")
            .value.trim()
            ? $("powderColour")
                .value.trim()
            : ""
        }.
        <br>
        <em>
          ${
            PRICES.finishing
              .powderCoat.quoteNote
          }
        </em>
      </p>`
    );
  }

  else {
    quoteHTML.push(
      `<p>
        <strong>Steel finish:</strong>
        Duragalv with exposed fabrication
        areas treated with etch primer and
        silver galvanising spray.
      </p>`
    );
  }

  $("quoteDescription").innerHTML =
    quoteHTML.join("");

  updateCustomerDisplay();
}


// ============================================================
// SAVE QUOTES
// ============================================================

function collectQuoteData() {
  const form = {};

  document
    .querySelectorAll(
      "input, select"
    )
    .forEach((element) => {
      if (!element.id) {
        return;
      }

      form[element.id] =
        element.type === "checkbox"
          ? element.checked
          : element.value;
    });

  return {
    id:
      $("projectNumber").value.trim(),

    savedAt:
      new Date().toISOString(),

    quoteType,
    selectedCladding,

    customerName:
      $("customerName").value.trim(),

    siteAddress:
      $("siteAddress").value.trim(),

    finalPrice:
      Number(
        $("finalPrice").value || 0
      ),

    form
  };
}


function saveQuote() {
  calculateQuote();

  const project =
    $("projectNumber").value.trim();

  if (!/^[0-9]{6}$/.test(project)) {
    alert(
      "Enter a 6-digit project number before saving."
    );

    return;
  }

  const quote =
    collectQuoteData();

  let quotes =
    JSON.parse(
      localStorage.getItem(
        "jtlaGateQuotes"
      ) || "[]"
    );

  const existing =
    quotes.findIndex(
      (item) =>
        item.id === quote.id
    );

  if (existing >= 0) {
    quotes[existing] = quote;
  }

  else {
    quotes.unshift(quote);
  }

  localStorage.setItem(
    "jtlaGateQuotes",
    JSON.stringify(quotes)
  );

  renderSavedQuotes();
}


// ============================================================
// SAVED QUOTES DISPLAY
// ============================================================

function renderSavedQuotes() {
  const quotes =
    JSON.parse(
      localStorage.getItem(
        "jtlaGateQuotes"
      ) || "[]"
    );

  const container =
    $("savedQuotes");

  if (!quotes.length) {
    container.innerHTML =
      `<p class="muted">
        No saved quotes yet.
      </p>`;

    return;
  }

  container.innerHTML =
    quotes
      .map((quote) => `
        <div class="saved-row">

          <div>
            <strong>
              ${quote.id}
            </strong>

            <span>
              ${
                quote.customerName ||
                "Unnamed customer"
              }
            </span>

            <small>
              ${
                quote.siteAddress ||
                ""
              }
            </small>
          </div>

          <div class="saved-actions">

            <strong>
              ${money(quote.finalPrice)}
            </strong>

            <button
              type="button"
              class="small"
              data-load="${quote.id}"
            >
              Open
            </button>

            <button
              type="button"
              class="small danger"
              data-delete="${quote.id}"
            >
              Delete
            </button>

          </div>

        </div>
      `)
      .join("");

  container
    .querySelectorAll("[data-load]")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () =>
          loadQuote(
            button.dataset.load
          )
      );
    });

  container
    .querySelectorAll("[data-delete]")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () =>
          deleteQuote(
            button.dataset.delete
          )
      );
    });
}


// ============================================================
// LOAD QUOTE
// ============================================================

function loadQuote(id) {
  const quotes =
    JSON.parse(
      localStorage.getItem(
        "jtlaGateQuotes"
      ) || "[]"
    );

  const quote =
    quotes.find(
      (item) =>
        item.id === id
    );

  if (!quote) {
    return;
  }

  quoteType =
    quote.quoteType || "single";

  selectedCladding =
    quote.selectedCladding ||
    "ekodeck";

  document
    .querySelectorAll(".tab")
    .forEach((tab) => {
      tab.classList.toggle(
        "active",
        tab.dataset.type === quoteType
      );
    });

  Object.entries(
    quote.form || {}
  ).forEach(([id, value]) => {
    const element = $(id);

    if (!element) {
      return;
    }

    if (
      element.type === "checkbox"
    ) {
      element.checked =
        Boolean(value);
    }

    else {
      element.value = value;
    }
  });

  updateCladdingDisplay();

  updateConditionalSections();

  calculateQuote();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


// ============================================================
// DELETE QUOTE
// ============================================================

function deleteQuote(id) {
  let quotes =
    JSON.parse(
      localStorage.getItem(
        "jtlaGateQuotes"
      ) || "[]"
    );

  quotes =
    quotes.filter(
      (quote) =>
        quote.id !== id
    );

  localStorage.setItem(
    "jtlaGateQuotes",
    JSON.stringify(quotes)
  );

  renderSavedQuotes();
}


// ============================================================
// NEW QUOTE
// ============================================================

function newQuote() {
  $("customerName").value = "";
  $("siteAddress").value = "";
  $("projectNumber").value = "";
  $("customerPhone").value = "";
  $("customerEmail").value = "";

  $("cavityWidth").value = "";
  $("cavityHeight").value = "";

  $("leftGap").value =
    PRICES.defaults.leftGapMm;

  $("rightGap").value =
    PRICES.defaults.rightGapMm;

  $("bottomGap").value =
    PRICES.defaults.bottomGapMm;

  $("gateWidth").value = "";
  $("gateHeight").value = "";

  $("frameSize").value =
    PRICES.defaults.frame;

  $("postSize").value =
    PRICES.defaults.posts;

  $("postCount").value =
    PRICES.defaults.postCount;

  $("leftPostFixing").value =
    "concreted";

  $("rightPostFixing").value =
    "concreted";

  $("dynaboltLength").value =
    PRICES.defaults
      .dynaboltLengthMm;

  $("dynaboltCount").value = 2;

  $("fixedPanelOption").value =
    "none";

  $("fixedPanelWidth").value = 0;
  $("fixedPanelHeight").value = 0;

  $("midRailOption").value =
    "none";

  selectedCladding =
    PRICES.defaults.cladding;

  $("ekodeckColour").value =
    "Greystone";

  $("latch").value =
    PRICES.defaults.latch;

  $("powderCoat").checked =
    false;

  $("powderColour").value = "";

  $("powderCost").value =
    PRICES.finishing
      .powderCoat.typicalCost;

  $("fabricationHours").value = 4;
  $("installationHours").value = 2;
  $("holeDigHours").value = 1;
  $("soilRemovalHours").value = 0.5;

  $("travelKm").value = 0;
  $("extraHardware").value = 0;
  $("otherCosts").value = 0;

  setQuoteType("single");

  updateConcreteBagSuggestion();

  updateCladdingDisplay();

  updateConditionalSections();

  validateRequiredFields();

  updateCustomerDisplay();

  calculateQuote();
}


// ============================================================
// SMS
// ============================================================

function sendSMS() {
  calculateQuote();

  const phone =
    $("customerPhone")
      .value.trim();

  if (!phone) {
    alert(
      "Enter the customer's phone number first."
    );

    return;
  }

  // Same quote wording as email.

  window.location.href =
    `sms:${phone}?body=` +
    encodeURIComponent(
      currentQuoteText
    );
}


// ============================================================
// EMAIL
// ============================================================

function sendEmail() {
  calculateQuote();

  const email =
    $("customerEmail")
      .value.trim();

  if (!email) {
    alert(
      "Enter the customer's email address first."
    );

    return;
  }

  const subject =
    `JTLA Gates Quote ` +
    `${$("projectNumber").value.trim()}`;

  // Same quote wording as SMS.

  window.location.href =
    `mailto:${email}` +
    `?subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(currentQuoteText)}`;
}


// ============================================================
// PDF / PRINT
// ============================================================

function printQuote() {
  calculateQuote();

  window.print();
}


// ============================================================
// EVENTS
// ============================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    setupPriceFields();

    setupCladdingMenu();


    // ----------------------------
    // GATE TYPE
    // ----------------------------

    document
      .querySelectorAll(".tab")
      .forEach((tab) => {

        tab.addEventListener(
          "click",
          () =>
            setQuoteType(
              tab.dataset.type
            )
        );

      });


    // ----------------------------
    // CUSTOMER DETAILS
    // ----------------------------

    [
      "customerName",
      "siteAddress",
      "projectNumber",
      "customerPhone",
      "customerEmail"
    ].forEach((id) => {

      $(id).addEventListener(
        "input",
        () => {

          updateCustomerDisplay();

          validateRequiredFields();

          calculateQuote();

        }
      );

    });


    // ----------------------------
    // CAVITY / GATE SIZE
    // ----------------------------

    [
      "cavityWidth",
      "cavityHeight",
      "leftGap",
      "rightGap",
      "bottomGap",
      "fixedPanelWidth"
    ].forEach((id) => {

      $(id).addEventListener(
        "input",
        calculateProposedGateSize
      );

    });


    // ----------------------------
    // POST SETTINGS
    // ----------------------------

    [
      "postSize",
      "postCount",
      "leftPostFixing",
      "rightPostFixing"
    ].forEach((id) => {

      $(id).addEventListener(
        "change",
        () => {

          updateConditionalSections();

          updateConcreteBagSuggestion();

          calculateProposedGateSize();

        }
      );

    });


    // ----------------------------
    // FIXED PANEL
    // ----------------------------

    $("fixedPanelOption")
      .addEventListener(
        "change",
        () => {

          updateConditionalSections();

          calculateProposedGateSize();

        }
      );


    // ----------------------------
    // POWDER COATING
    // ----------------------------

    $("powderCoat")
      .addEventListener(
        "change",
        () => {

          updateConditionalSections();

          calculateQuote();

        }
      );


    // ----------------------------
    // MID RAIL
    // ----------------------------

    $("midRailOption")
      .addEventListener(
        "change",
        () => {

          updateConditionalSections();

          calculateQuote();

        }
      );


    // ----------------------------
    // ALL OTHER INPUTS
    // ----------------------------

    document
      .querySelectorAll(
        "input, select"
      )
      .forEach((element) => {

        const handled = [
          "customerName",
          "siteAddress",
          "projectNumber",
          "customerPhone",
          "customerEmail",

          "cavityWidth",
          "cavityHeight",
          "leftGap",
          "rightGap",
          "bottomGap",
          "fixedPanelWidth",

          "postSize",
          "postCount",
          "leftPostFixing",
          "rightPostFixing",

          "fixedPanelOption",
          "powderCoat",
          "midRailOption",

          "finalPrice"
        ];

        if (
          handled.includes(
            element.id
          )
        ) {
          return;
        }

        element.addEventListener(
          "input",
          calculateQuote
        );

        element.addEventListener(
          "change",
          calculateQuote
        );

      });


    // ----------------------------
    // FINAL PRICE OVERRIDE
    // ----------------------------

    $("finalPrice")
      .addEventListener(
        "input",
        updateProfitAndFinalQuote
      );


    // ----------------------------
    // BUTTONS
    // ----------------------------

    $("calculateBtn")
      .addEventListener(
        "click",
        calculateQuote
      );

    $("saveBtn")
      .addEventListener(
        "click",
        saveQuote
      );

    $("smsBtn")
      .addEventListener(
        "click",
        sendSMS
      );

    $("emailBtn")
      .addEventListener(
        "click",
        sendEmail
      );

    $("printBtn")
      .addEventListener(
        "click",
        printQuote
      );

    $("newQuoteBtn")
      .addEventListener(
        "click",
        newQuote
      );


    // ----------------------------
    // INITIAL STATE
    // ----------------------------

    quoteType =
      PRICES.defaults.gateType;

    updateConcreteBagSuggestion();

    updateCladdingDisplay();

    updateConditionalSections();

    updateCustomerDisplay();

    validateRequiredFields();

    calculateQuote();

    renderSavedQuotes();

  }
);
