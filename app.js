// ============================================================
// JTLA GATE QUOTER
// app.js
// ============================================================

const $ = (id) => document.getElementById(id);

let quoteType = "single";
let selectedCladding = "ekodeck";
let lastCalculation = null;


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


function createProjectNumber() {

  const number =
    Math.floor(Math.random() * 900000) + 100000;

  return String(number);
}


function getQuoteTypeName() {

  const names = {
    single: "Single gate",
    double: "Drive / double gate",
    slider: "Sliding gate"
  };

  return names[quoteType];
}


// ============================================================
// BUILD DROP-DOWNS FROM prices.js
// ============================================================

function populateSelect(selectId, dataObject) {

  const select = $(selectId);

  select.innerHTML = "";

  Object.entries(dataObject).forEach(
    ([value, item]) => {

      const option =
        document.createElement("option");

      option.value = value;

      option.textContent =
        item.label;

      select.appendChild(option);

    }
  );

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


  // Explicit defaults

  $("frameSize").value =
    PRICES.defaults.frame;

  $("postSize").value =
    PRICES.defaults.posts;

  $("latch").value =
    PRICES.defaults.latch;

  selectedCladding =
    PRICES.defaults.cladding;


  $("powderCost").value =
    PRICES.finishing.powderCoatTypical;

}


// ============================================================
// GATE TYPE TABS
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


  // Suggested starting labour only.
  // You can overwrite these manually.

  if (type === "single") {

    $("fabricationHours").value = 4;
    $("installationHours").value = 2;

  }


  if (type === "double") {

    $("fabricationHours").value = 7;
    $("installationHours").value = 3;

  }


  if (type === "slider") {

    $("fabricationHours").value = 8;
    $("installationHours").value = 4;

  }


  calculateQuote();

}


// ============================================================
// CUSTOMER NAME STICKY HEADER
// ============================================================

function updateCustomerDisplay() {

  const name =
    $("customerName").value.trim();

  $("stickyCustomerName").textContent =
    name || "New Quote";


  $("quoteCustomerName").textContent =
    name || "";


  $("quoteCustomerAddress").textContent =
    $("siteAddress").value.trim();


  $("quoteProjectNumber").textContent =
    $("projectNumber").value.trim();

}


// ============================================================
// REQUIRED FIELD RED / GREEN STATUS
// ============================================================

function validateRequiredFields() {

  const fields =
    document.querySelectorAll(
      ".required-field input"
    );


  fields.forEach((input) => {

    let valid = false;


    if (input.id === "projectNumber") {

      valid =
        /^[0-9]{6}$/.test(
          input.value.trim()
        );

    } else {

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
// ORIGINAL CAVITY -> PROPOSED GATE SIZE
// ============================================================

function calculateProposedGateSize() {

  const cavityWidth =
    Number(
      $("cavityWidth").value || 0
    );


  const cavityHeight =
    Number(
      $("cavityHeight").value || 0
    );


  const leftGap =
    Number(
      $("leftGap").value || 0
    );


  const rightGap =
    Number(
      $("rightGap").value || 0
    );


  const bottomGap =
    Number(
      $("bottomGap").value || 0
    );


  const proposedWidth =
    Math.max(
      0,
      cavityWidth -
      leftGap -
      rightGap
    );


  const proposedHeight =
    Math.max(
      0,
      cavityHeight -
      bottomGap
    );


  if (cavityWidth > 0) {

    $("gateWidth").value =
      proposedWidth;

  }


  if (cavityHeight > 0) {

    $("gateHeight").value =
      proposedHeight;

  }


  calculateQuote();

}


// ============================================================
// CLADDING MENU
// ============================================================

function setupCladdingMenu() {

  const button =
    $("claddingButton");

  const menu =
    $("claddingMenu");


  button.addEventListener(
    "click",
    () => {

      menu.classList.toggle(
        "hidden"
      );

    }
  );


  document
    .querySelectorAll(
      "[data-cladding]"
    )
    .forEach((item) => {

      item.addEventListener(
        "click",
        () => {

          selectedCladding =
            item.dataset.cladding;


          updateCladdingDisplay();

          menu.classList.add(
            "hidden"
          );


          calculateQuote();

        }
      );

    });


  updateCladdingDisplay();

}


function getCladdingLabel() {

  const item =
    PRICES.cladding[
      selectedCladding
    ];


  if (!item) {

    return "Custom / Other";

  }


  return item.label;

}


function updateCladdingDisplay() {

  $("claddingButtonText").textContent =
    getCladdingLabel();


  $("ekodeckOptions")
    .classList.toggle(
      "hidden",
      selectedCladding !==
      "ekodeck"
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
// FIXING / POWDER COAT SECTIONS
// ============================================================

function updateConditionalSections() {

  const fixing =
    $("fixingType").value;


  const concreteRequired =
    fixing === "concreted" ||
    fixing === "concreteBrick";


  const boltsRequired =
    fixing === "brick" ||
    fixing === "concreteBrick";


  $("concreteOptions")
    .classList.toggle(
      "hidden",
      !concreteRequired
    );


  $("boltOptions")
    .classList.toggle(
      "hidden",
      !boltsRequired
    );


  $("powderOptions")
    .classList.toggle(
      "hidden",
      !$("powderCoat").checked
    );

}


// ============================================================
// STEEL CALCULATIONS
// ============================================================

function calculateFrameMaterial(
  widthM,
  heightM
) {

  let frameMetres = 0;


  if (quoteType === "single") {

    // Standard perimeter frame

    frameMetres =
      (widthM * 2) +
      (heightM * 2);

  }


  if (quoteType === "double") {

    // Two leaves:
    // top/bottom across total width
    // four vertical sides

    frameMetres =
      (widthM * 2) +
      (heightM * 4);

  }


  if (quoteType === "slider") {

    // Basic perimeter only at this stage

    frameMetres =
      (widthM * 2) +
      (heightM * 2);

  }


  const stockLength =
    PRICES.business
      .steelStockLengthM;


  const stockLengths =
    frameMetres > 0
      ? Math.ceil(
          frameMetres /
          stockLength
        )
      : 0;


  const purchasedMetres =
    stockLengths *
    stockLength;


  const waste =
    Math.max(
      0,
      purchasedMetres -
      frameMetres
    );


  const frameKey =
    $("frameSize").value;


  const rate =
    PRICES.steel.frame[
      frameKey
    ].ratePerM;


  // Price on full stock lengths purchased.
  // This means steel waste is actually costed.

  const cost =
    purchasedMetres *
    rate;


  return {
    metres: frameMetres,
    stockLengths,
    purchasedMetres,
    waste,
    cost
  };

}


function calculatePostMaterial(
  heightM
) {

  const postKey =
    $("postSize").value;


  if (postKey === "none") {

    return {
      metres: 0,
      stockLengths: 0,
      purchasedMetres: 0,
      waste: 0,
      cost: 0
    };

  }


  const count =
    Number(
      $("postCount").value || 0
    );


  const embedM =
    Number(
      $("postEmbed").value || 0
    ) / 1000;


  const onePostLength =
    heightM + embedM;


  const requiredMetres =
    onePostLength *
    count;


  const stockLength =
    PRICES.business
      .steelStockLengthM;


  const stockLengths =
    requiredMetres > 0
      ? Math.ceil(
          requiredMetres /
          stockLength
        )
      : 0;


  const purchasedMetres =
    stockLengths *
    stockLength;


  const waste =
    Math.max(
      0,
      purchasedMetres -
      requiredMetres
    );


  const rate =
    PRICES.steel.posts[
      postKey
    ].ratePerM;


  const cost =
    purchasedMetres *
    rate;


  return {
    metres: requiredMetres,
    stockLengths,
    purchasedMetres,
    waste,
    cost
  };

}


// ============================================================
// CLADDING CALCULATIONS
// ============================================================

function calculateCladding(
  widthM,
  heightM
) {

  const widthMm =
    widthM * 1000;


  const area =
    widthM * heightM;


  let boards = 0;

  let linealMetres = 0;

  let cost = 0;

  let description =
    getCladdingLabel();


  const data =
    PRICES.cladding[
      selectedCladding
    ];


  // ------------------------------------
  // EKODECK
  // ------------------------------------

  if (
    selectedCladding ===
    "ekodeck"
  ) {

    boards =
      Math.ceil(
        widthMm /
        data.boardWidthMm
      );


    linealMetres =
      boards *
      heightM;


    cost =
      linealMetres *
      data.ratePerM;


    description =
      `${data.label}, ` +
      `${$("ekodeckColour").value}`;

  }


  // ------------------------------------
  // CYPRESS PICKETS
  // ------------------------------------

  else if (
    selectedCladding ===
    "cypressPickets"
  ) {

    boards =
      Math.ceil(
        widthMm /
        data.boardWidthMm
      );


    const selectedLength =
      Number(
        $("picketLength").value
      ) / 1000;


    linealMetres =
      boards *
      selectedLength;


    cost =
      linealMetres *
      data.ratePerM;


    description =
      `${data.label}, ` +
      `${$("picketLength").value}mm, ` +
      `${$("cypressFinish").value}`;

  }


  // ------------------------------------
  // LOSP / MERBAU
  // ------------------------------------

  else if (
    selectedCladding ===
    "losp50" ||
    selectedCladding ===
    "losp90" ||
    selectedCladding ===
    "merbau90" ||
    selectedCladding ===
    "merbau140"
  ) {

    boards =
      Math.ceil(
        widthMm /
        data.boardWidthMm
      );


    linealMetres =
      boards *
      heightM;


    cost =
      linealMetres *
      data.ratePerM;


    description =
      data.label;

  }


  // ------------------------------------
  // COLORBOND
  // ------------------------------------

  else if (
    selectedCladding ===
    "colorbond"
  ) {

    boards = 0;

    linealMetres = 0;


    cost =
      area *
      data.ratePerM2;


    description =
      `Colorbond ` +
      `${$("colorbondProfile").value}`;


    if (
      $("colorbondNotes")
        .value.trim()
    ) {

      description +=
        `, ` +
        $("colorbondNotes")
          .value.trim();

    }

  }


  // ------------------------------------
  // CUSTOM
  // ------------------------------------

  else if (
    selectedCladding ===
    "custom"
  ) {

    boards = 0;

    linealMetres = 0;


    cost =
      Number(
        $("customCladdingCost")
          .value || 0
      );


    description =
      $("customCladdingName")
        .value.trim() ||
      "Custom cladding";

  }


  return {
    boards,
    linealMetres,
    cost,
    area,
    description
  };

}


// ============================================================
// INSTALLATION DESCRIPTION
// ============================================================

function getInstallationDescription() {

  const fixing =
    $("fixingType").value;


  if (fixing === "concreted") {

    return (
      "Posts concreted into ground."
    );

  }


  if (fixing === "brick") {

    return (
      `Fixed to brickwork using ` +
      `${$("boltCount").value} x ` +
      `${$("boltType")
        .selectedOptions[0]
        .text}.`
    );

  }


  if (
    fixing ===
    "concreteBrick"
  ) {

    return (
      "Posts concreted into ground " +
      "and additionally fixed to " +
      `brickwork using ` +
      `${$("boltCount").value} x ` +
      `${$("boltType")
        .selectedOptions[0]
        .text}.`
    );

  }


  if (
    fixing === "existing"
  ) {

    return (
      "Gate fitted to existing " +
      "posts / structure."
    );

  }


  return "Custom installation.";

}


// ============================================================
// MAIN QUOTE CALCULATION
// ============================================================

function calculateQuote() {

  validateRequiredFields();

  updateCustomerDisplay();

  updateConditionalSections();


  const widthMm =
    Number(
      $("gateWidth").value || 0
    );


  const heightMm =
    Number(
      $("gateHeight").value || 0
    );


  const widthM =
    widthMm / 1000;


  const heightM =
    heightMm / 1000;


  const area =
    widthM * heightM;


  $("gateArea").textContent =
    `${area.toFixed(2)} m²`;


  // ---------------------------------
  // STEEL
  // ---------------------------------

  const frame =
    calculateFrameMaterial(
      widthM,
      heightM
    );


  const posts =
    calculatePostMaterial(
      heightM
    );


  $("frameMetres").textContent =
    `${frame.metres.toFixed(2)} m`;


  $("frameLengths").textContent =
    frame.stockLengths;


  $("frameWaste").textContent =
    `${frame.waste.toFixed(2)} m`;


  $("postMetres").textContent =
    `${posts.metres.toFixed(2)} m`;


  $("postLengths").textContent =
    posts.stockLengths;


  $("postWaste").textContent =
    `${posts.waste.toFixed(2)} m`;


  // ---------------------------------
  // CLADDING
  // ---------------------------------

  const cladding =
    calculateCladding(
      widthM,
      heightM
    );


  $("claddingBoards")
    .textContent =
    cladding.boards;


  $("claddingMetres")
    .textContent =
    `${cladding.linealMetres
      .toFixed(2)} m`;


  // ---------------------------------
  // HARDWARE
  // ---------------------------------

  const hingeCost =
    Number(
      PRICES.hardware
        .hinges.price || 0
    );


  const latchKey =
    $("latch").value;


  const latchCost =
    Number(
      PRICES.hardware
        .latches[
          latchKey
        ].price || 0
    );


  const extraHardware =
    Number(
      $("extraHardware")
        .value || 0
    );


  // ---------------------------------
  // FIXINGS
  // ---------------------------------

  const fixing =
    $("fixingType").value;


  const usesConcrete =
    fixing === "concreted" ||
    fixing === "concreteBrick";


  const usesBolts =
    fixing === "brick" ||
    fixing === "concreteBrick";


  const concreteBags =
    usesConcrete
      ? Number(
          $("concreteBags")
            .value || 0
        )
      : 0;


  const concreteCost =
    concreteBags *
    PRICES.fixings
      .concreteBag;


  const boltCount =
    usesBolts
      ? Number(
          $("boltCount")
            .value || 0
        )
      : 0;


  const boltCost =
    boltCount *
    PRICES.fixings
      .boltEach;


  const disposalCost =
    usesConcrete
      ? Number(
          $("soilDisposalCost")
            .value || 0
        )
      : 0;


  // ---------------------------------
  // POWDER COATING
  // ---------------------------------

  const powderCost =
    $("powderCoat").checked
      ? Number(
          $("powderCost")
            .value || 0
        )
      : 0;


  // ---------------------------------
  // MATERIAL COST
  // ---------------------------------

  const materialCost =
    frame.cost +
    posts.cost +
    cladding.cost +
    hingeCost +
    latchCost +
    extraHardware +
    concreteCost +
    boltCost +
    disposalCost +
    powderCost;


  // ---------------------------------
  // LABOUR
  // ---------------------------------

  const fabricationHours =
    Number(
      $("fabricationHours")
        .value || 0
    );


  const installationHours =
    Number(
      $("installationHours")
        .value || 0
    );


  const holeDigHours =
    usesConcrete
      ? Number(
          $("holeDigHours")
            .value || 0
        )
      : 0;


  const soilRemovalHours =
    usesConcrete
      ? Number(
          $("soilRemovalHours")
            .value || 0
        )
      : 0;


  const totalHours =
    fabricationHours +
    installationHours +
    holeDigHours +
    soilRemovalHours;


  const labourCost =
    totalHours *
    PRICES.business
      .labourRate;


  // ---------------------------------
  // TRAVEL
  // ---------------------------------

  const travelKm =
    Number(
      $("travelKm")
        .value || 0
    );


  const chargeableKm =
    Math.max(
      0,
      travelKm -
      PRICES.business
        .includedTravelKm
    );


  const travelCost =
    chargeableKm *
    PRICES.business
      .travelRatePerKm;


  // ---------------------------------
  // OTHER COSTS
  // ---------------------------------

  const otherCosts =
    Number(
      $("otherCosts")
        .value || 0
    );


  // ---------------------------------
  // MARKUP
  // ---------------------------------

  const markup =
    materialCost *
    PRICES.business
      .materialMarkup;


  // ---------------------------------
  // TOTAL
  // ---------------------------------

  const exGst =
    materialCost +
    labourCost +
    travelCost +
    otherCosts +
    markup;


  const gst =
    exGst *
    PRICES.business.gst;


  const calculatedTotal =
    exGst + gst;


  const roundedTotal =
    roundUp(
      calculatedTotal,
      PRICES.business.roundTo
    );


  // ---------------------------------
  // DISPLAY
  // ---------------------------------

  $("materialsTotal")
    .textContent =
    money(materialCost);


  $("labourTotal")
    .textContent =
    money(labourCost);


  $("travelTotal")
    .textContent =
    money(travelCost);


  $("directOtherTotal")
    .textContent =
    money(otherCosts);


  $("markupTotal")
    .textContent =
    money(markup);


  $("exGstTotal")
    .textContent =
    money(exGst);


  $("gstTotal")
    .textContent =
    money(gst);


  $("incGstTotal")
    .textContent =
    money(calculatedTotal);


  $("finalPrice").value =
    roundedTotal;


  lastCalculation = {

    widthMm,
    heightMm,
    area,

    frame,
    posts,
    cladding,

    hingeCost,
    latchCost,
    extraHardware,

    concreteCost,
    boltCost,
    disposalCost,
    powderCost,

    materialCost,

    fabricationHours,
    installationHours,
    holeDigHours,
    soilRemovalHours,
    totalHours,

    labourCost,

    travelKm,
    chargeableKm,
    travelCost,

    otherCosts,

    markup,
    exGst,
    gst,
    calculatedTotal

  };


  updateProfit();

  updateDetailedCosting();

  createQuoteDescription();

  updateQuoteTotal();

}


// ============================================================
// PROFIT
// ============================================================

function updateProfit() {

  if (!lastCalculation) {

    return;

  }


  const finalIncGst =
    Number(
      $("finalPrice").value || 0
    );


  const finalExGst =
    finalIncGst /
    (1 + PRICES.business.gst);


  const actualCosts =
    lastCalculation
      .materialCost +
    lastCalculation
      .labourCost +
    lastCalculation
      .travelCost +
    lastCalculation
      .otherCosts;


  const profit =
    finalExGst -
    actualCosts;


  $("profitTotal")
    .textContent =
    money(profit);


  updateQuoteTotal();

}


// ============================================================
// DETAILED INTERNAL COSTING
// ============================================================

function updateDetailedCosting() {

  if (!lastCalculation) {

    return;

  }


  const c =
    lastCalculation;


  $("costBreakdown")
    .innerHTML = `

      <p>
        <span>Frame steel used</span>
        <strong>
          ${c.frame.metres.toFixed(2)} m
        </strong>
      </p>

      <p>
        <span>Frame steel purchased</span>
        <strong>
          ${c.frame.purchasedMetres.toFixed(2)} m
        </strong>
      </p>

      <p>
        <span>Frame cost</span>
        <strong>
          ${money(c.frame.cost)}
        </strong>
      </p>

      <p>
        <span>Post steel used</span>
        <strong>
          ${c.posts.metres.toFixed(2)} m
        </strong>
      </p>

      <p>
        <span>Post steel purchased</span>
        <strong>
          ${c.posts.purchasedMetres.toFixed(2)} m
        </strong>
      </p>

      <p>
        <span>Posts cost</span>
        <strong>
          ${money(c.posts.cost)}
        </strong>
      </p>

      <p>
        <span>Cladding</span>
        <strong>
          ${money(c.cladding.cost)}
        </strong>
      </p>

      <p>
        <span>Lock-out hinges</span>
        <strong>
          ${money(c.hingeCost)}
        </strong>
      </p>

      <p>
        <span>Latch</span>
        <strong>
          ${money(c.latchCost)}
        </strong>
      </p>

      <p>
        <span>Concrete</span>
        <strong>
          ${money(c.concreteCost)}
        </strong>
      </p>

      <p>
        <span>Bolts</span>
        <strong>
          ${money(c.boltCost)}
        </strong>
      </p>

      <p>
        <span>Powder coating</span>
        <strong>
          ${money(c.powderCost)}
        </strong>
      </p>

      <p>
        <span>Total labour hours</span>
        <strong>
          ${c.totalHours.toFixed(2)} hrs
        </strong>
      </p>

      <p>
        <span>
          Labour @ ${money(
            PRICES.business.labourRate
          )}/hr
        </span>

        <strong>
          ${money(c.labourCost)}
        </strong>
      </p>

      <p>
        <span>Chargeable travel</span>

        <strong>
          ${c.chargeableKm.toFixed(0)} km
        </strong>
      </p>

      <p>
        <span>Travel</span>

        <strong>
          ${money(c.travelCost)}
        </strong>
      </p>

      <p>
        <span>Other costs</span>

        <strong>
          ${money(c.otherCosts)}
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
// CUSTOMER QUOTE DESCRIPTION
// ============================================================

function createQuoteDescription() {

  if (!lastCalculation) {

    return;

  }


  const frame =
    PRICES.steel.frame[
      $("frameSize").value
    ].label;


  const post =
    PRICES.steel.posts[
      $("postSize").value
    ].label;


  const latch =
    PRICES.hardware.latches[
      $("latch").value
    ].label;


  let text =

`Supply and install custom ${getQuoteTypeName().toLowerCase()}.

GATE SIZE
${$("gateWidth").value}mm wide x ${$("gateHeight").value}mm high

STEEL
Frame: ${frame}`;


  if (
    $("postSize").value !==
    "none"
  ) {

    text +=
`

Posts: ${$("postCount").value} x ${post}`;

  }


  text +=
`

CLADDING
${lastCalculation.cladding.description}

HARDWARE
Lock-out galvanised hinges
${latch}

INSTALLATION
${getInstallationDescription()}`;


  if (
    $("powderCoat").checked
  ) {

    text +=
`

FINISH
Powder coated${
  $("powderColour")
    .value.trim()
    ? ` in ${$("powderColour")
        .value.trim()}`
    : ""
}.`;

  }


  if (
    selectedCladding ===
    "cypressPickets"
  ) {

    const finish =
      $("cypressFinish").value;


    text +=
`

TIMBER FINISH
${
  finish === "painted"
    ? "Painted."
    : "Raw / unpainted."
}`;

  }


  $("quoteDescription").value =
    text;

}


// ============================================================
// QUOTE PRICE DISPLAY
// ============================================================

function updateQuoteTotal() {

  const price =
    Number(
      $("finalPrice").value || 0
    );


  $("quoteTotalDisplay")
    .textContent =
    money(price);

}


// ============================================================
// SAVE QUOTES
// ============================================================

function collectQuoteData() {

  const form = {};


  document
    .querySelectorAll(
      "input, select, textarea"
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
      $("projectNumber")
        .value.trim() ||
      createProjectNumber(),

    quoteType,

    selectedCladding,

    savedAt:
      new Date().toISOString(),

    customerName:
      $("customerName")
        .value.trim(),

    siteAddress:
      $("siteAddress")
        .value.trim(),

    phone:
      $("customerPhone")
        .value.trim(),

    email:
      $("customerEmail")
        .value.trim(),

    finalPrice:
      Number(
        $("finalPrice")
          .value || 0
      ),

    form

  };

}


function saveQuote() {

  calculateQuote();


  const quote =
    collectQuoteData();


  let quotes =
    JSON.parse(
      localStorage.getItem(
        "jtlaGateQuotes"
      ) || "[]"
    );


  const index =
    quotes.findIndex(
      (item) =>
        item.id === quote.id
    );


  if (index >= 0) {

    quotes[index] =
      quote;

  } else {

    quotes.unshift(
      quote
    );

  }


  localStorage.setItem(
    "jtlaGateQuotes",
    JSON.stringify(quotes)
  );


  renderSavedQuotes();

}


// ============================================================
// SHOW SAVED QUOTES
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
    quotes.map(
      (quote) => `

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
              ${money(
                quote.finalPrice
              )}
            </strong>

            <button
              class="small"
              data-load="${quote.id}"
              type="button"
            >
              Open
            </button>

            <button
              class="small danger"
              data-delete="${quote.id}"
              type="button"
            >
              Delete
            </button>

          </div>

        </div>

      `
    ).join("");


  container
    .querySelectorAll(
      "[data-load]"
    )
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
    .querySelectorAll(
      "[data-delete]"
    )
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
// LOAD SAVED QUOTE
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
    quote.quoteType ||
    "single";


  selectedCladding =
    quote.selectedCladding ||
    "ekodeck";


  document
    .querySelectorAll(".tab")
    .forEach((tab) => {

      tab.classList.toggle(
        "active",
        tab.dataset.type ===
        quoteType
      );

    });


  Object.entries(
    quote.form || {}
  ).forEach(
    ([id, value]) => {

      const element = $(id);


      if (!element) {

        return;

      }


      if (
        element.type ===
        "checkbox"
      ) {

        element.checked =
          Boolean(value);

      } else {

        element.value =
          value;

      }

    }
  );


  updateCladdingDisplay();

  updateConditionalSections();

  calculateQuote();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


// ============================================================
// DELETE SAVED QUOTE
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

  $("customerPhone").value = "";

  $("customerEmail").value = "";

  $("projectNumber").value = "";

  $("cavityWidth").value = "";

  $("cavityHeight").value = "";

  $("leftGap").value = 10;

  $("rightGap").value = 10;

  $("bottomGap").value = 20;

  $("gateWidth").value = "";

  $("gateHeight").value = "";

  $("postCount").value = 2;

  $("postEmbed").value = 600;

  $("frameSize").value =
    PRICES.defaults.frame;

  $("postSize").value =
    PRICES.defaults.posts;

  $("latch").value =
    PRICES.defaults.latch;

  selectedCladding =
    PRICES.defaults.cladding;

  $("ekodeckColour").value =
    "Greystone";

  $("fixingType").value =
    "concreted";

  $("concreteBags").value =
    2;

  $("holeDigHours").value =
    1;

  $("soilRemovalHours").value =
    0.5;

  $("soilDisposalCost").value =
    0;

  $("powderCoat").checked =
    false;

  $("powderCost").value =
    PRICES.finishing
      .powderCoatTypical;

  $("travelKm").value =
    0;

  $("otherCosts").value =
    0;

  $("extraHardware").value =
    0;


  setQuoteType(
    "single"
  );


  updateCladdingDisplay();

  updateConditionalSections();

  updateCustomerDisplay();

  validateRequiredFields();

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


  const name =
    $("customerName")
      .value.trim() ||
    "there";


  const project =
    $("projectNumber")
      .value.trim();


  const price =
    money(
      Number(
        $("finalPrice")
          .value || 0
      )
    );


  const message =

`Hi ${name},

Thanks for the opportunity to quote your gate.

JTLA Gates
Project ${project}

Total: ${price} including GST.

Please contact me if you have any questions.

Regards,
Jody
JTLA Gates`;


  window.location.href =
    `sms:${phone}?body=` +
    encodeURIComponent(
      message
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


  const name =
    $("customerName")
      .value.trim() ||
    "there";


  const project =
    $("projectNumber")
      .value.trim();


  const price =
    money(
      Number(
        $("finalPrice")
          .value || 0
      )
    );


  const subject =
    `JTLA Gates Quote - ${project}`;


  const body =

`Hi ${name},

Thank you for the opportunity to provide a quote.

JTLA Gates
Project ${project}

${$("quoteDescription").value}

TOTAL
${price} including GST.

Regards,

Jody
JTLA Gates`;


  window.location.href =
    `mailto:${email}` +
    `?subject=${encodeURIComponent(
      subject
    )}` +
    `&body=${encodeURIComponent(
      body
    )}`;

}


// ============================================================
// PRINT / PDF
// ============================================================

function printQuote() {

  calculateQuote();

  window.print();

}


// ============================================================
// EVENT LISTENERS
// ============================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    setupPriceFields();

    setupCladdingMenu();


    // Gate type tabs

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


    // Cavity measurements automatically
    // create proposed gate size

    [
      "cavityWidth",
      "cavityHeight",
      "leftGap",
      "rightGap",
      "bottomGap"
    ].forEach((id) => {

      $(id).addEventListener(
        "input",
        calculateProposedGateSize
      );

    });


    // Customer details

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

        }
      );

    });


    // Fixings

    $("fixingType")
      .addEventListener(
        "change",
        () => {

          updateConditionalSections();

          calculateQuote();

        }
      );


    // Powder coating

    $("powderCoat")
      .addEventListener(
        "change",
        () => {

          updateConditionalSections();

          calculateQuote();

        }
      );


    // Final price override

    $("finalPrice")
      .addEventListener(
        "input",
        updateProfit
      );


    // Other inputs

    document
      .querySelectorAll(
        "input, select"
      )
      .forEach((element) => {

        if (
          [
            "cavityWidth",
            "cavityHeight",
            "leftGap",
            "rightGap",
            "bottomGap",
            "customerName",
            "siteAddress",
            "projectNumber",
            "customerPhone",
            "customerEmail",
            "finalPrice"
          ].includes(
            element.id
          )
        ) {

          return;

        }


        element.addEventListener(
          "change",
          calculateQuote
        );


        element.addEventListener(
          "input",
          calculateQuote
        );

      });


    // Buttons

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


    // Initial state

    setQuoteType(
      "single"
    );

    updateCladdingDisplay();

    updateConditionalSections();

    updateCustomerDisplay();

    validateRequiredFields();

    calculateQuote();

    renderSavedQuotes();

  }
);
