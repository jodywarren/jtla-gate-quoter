// ============================================================
// JTLA GATE QUOTER
// V1.4
// app.js
// ============================================================

const $ = (id) => document.getElementById(id);

let quoteType = "single";
let lastCalculation = null;
let currentQuoteText = "";
let postCounter = 0;


// ============================================================
// BASIC HELPERS
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
  const value = Number(price || 0);

  if (!includesGST) {
    return value;
  }

  return value / (1 + PRICES.business.gst);
}


function gateLeafCount() {
  if (quoteType === "double") {
    return 2;
  }

  return 1;
}


function gateTypeLabel() {
  if (quoteType === "double") {
    return "Double gate";
  }

  if (quoteType === "slider") {
    return "Sliding gate";
  }

  return "Single gate";
}


function includeFrame() {
  return $("includeFrame").checked;
}


function includePosts() {
  return $("includePosts").checked;
}


function includeCladding() {
  return $("includeCladding").checked;
}


// ============================================================
// BUILD STANDARD SELECTS
// ============================================================

function populateSelect(selectId, data) {
  const select = $(selectId);

  select.innerHTML = "";

  Object.entries(data).forEach(([key, item]) => {
    const option = document.createElement("option");

    option.value = key;
    option.textContent = item.label;

    select.appendChild(option);
  });
}


function populatePostSizeSelect(select) {
  select.innerHTML = "";

  Object.entries(PRICES.steel.posts)
    .forEach(([key, post]) => {
      const option =
        document.createElement("option");

      option.value = key;
      option.textContent = post.label;

      select.appendChild(option);
    });

  select.value =
    PRICES.defaults.postType;
}


function setupPriceFields() {
  populateSelect(
    "frameSize",
    PRICES.steel.frame
  );

  populateSelect(
    "latch",
    PRICES.hardware.latches
  );

  $("frameSize").value =
    PRICES.defaults.frame;

  $("latch").value =
    PRICES.defaults.latch;

  $("claddingType").value =
    PRICES.defaults.cladding;

  $("claddingDirection").value =
    PRICES.defaults.claddingDirection;

  $("leftGap").value =
    PRICES.defaults.leftGapMm;

  $("rightGap").value =
    PRICES.defaults.rightGapMm;

  $("bottomGap").value =
    PRICES.defaults.bottomGapMm;

  $("horizontalMidRails").value =
    PRICES.defaults.horizontalMidRails;

  $("verticalMidRails").value =
    PRICES.defaults.verticalMidRails;

  $("powderCost").value =
    PRICES.finishing.powderCoat.typicalCost;
}


// ============================================================
// CUSTOMER DISPLAY / VALIDATION
// ============================================================

function updateCustomerDisplay() {
  const name =
    $("customerName").value.trim();

  $("stickyCustomerName").textContent =
    name || "New Quote";

  $("quoteCustomerName").textContent =
    name;

  $("quoteCustomerAddress").textContent =
    $("siteAddress").value.trim();

  $("quoteProjectNumber").textContent =
    $("projectNumber").value.trim();
}


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
// INCLUDE FRAME / POSTS / CLADDING
// ============================================================

function updateIncludeSections() {
  $("frameSection")
    .classList.toggle(
      "hidden",
      !includeFrame()
    );

  $("postsSection")
    .classList.toggle(
      "hidden",
      !includePosts()
    );

  $("claddingSection")
    .classList.toggle(
      "hidden",
      !includeCladding()
    );

  $("frameMaterialBlock")
    .classList.toggle(
      "hidden",
      !includeFrame()
    );

  $("postMaterialBlock")
    .classList.toggle(
      "hidden",
      !includePosts()
    );

  $("claddingMaterialBlock")
    .classList.toggle(
      "hidden",
      !includeCladding()
    );
}


// ============================================================
// DYNAMIC POSTS
// ============================================================

function createPost(options = {}) {
  postCounter++;

  const template =
    $("postTemplate");

  const fragment =
    template.content.cloneNode(true);

  const card =
    fragment.querySelector(".post-card");

  card.dataset.postId =
    String(postCounter);

  const title =
    fragment.querySelector(".post-title");

  title.textContent =
    `Post ${postCounter}`;


  // --------------------------------------------------------
  // POST SIZE
  // --------------------------------------------------------

  const postSize =
    fragment.querySelector(".post-size");

  populatePostSizeSelect(postSize);

  if (options.postSize) {
    postSize.value =
      options.postSize;
  }


  // --------------------------------------------------------
  // POSITION
  // --------------------------------------------------------

  const position =
    fragment.querySelector(".post-position");

  position.value =
    options.position || "";


  // --------------------------------------------------------
  // HEIGHT
  // --------------------------------------------------------

  const height =
    fragment.querySelector(".post-height");

  height.value =
    options.height || 1800;


  // --------------------------------------------------------
  // FIXING
  // --------------------------------------------------------

  const fixing =
    fragment.querySelector(".post-fixing");

  fixing.value =
    options.fixing || "concreted";


  // --------------------------------------------------------
  // EMBEDMENT
  // --------------------------------------------------------

  const embed =
    fragment.querySelector(".post-embed");

  embed.value =
    options.embed ??
    PRICES.defaults.postEmbedMm;


  // --------------------------------------------------------
  // CONCRETE
  // --------------------------------------------------------

  const concreteBags =
    fragment.querySelector(
      ".post-concrete-bags"
    );

  concreteBags.value =
    options.concreteBags ??
    PRICES.postFixing.concrete
      .defaultBagsPerPost;


  // --------------------------------------------------------
  // DYNABOLT
  // --------------------------------------------------------

  const dynabolt =
    fragment.querySelector(
      ".post-dynabolt-length"
    );

  dynabolt.value =
    options.dynaboltLength ??
    PRICES.defaults.dynaboltLengthMm;


  // --------------------------------------------------------
  // EXISTING SURFACE HEIGHT
  // --------------------------------------------------------

  const surfaceHeight =
    fragment.querySelector(
      ".post-surface-height"
    );

  surfaceHeight.value =
    options.surfaceHeight ||
    options.height ||
    1800;


  $("postsContainer")
    .appendChild(fragment);

  const insertedCard =
    $("postsContainer")
      .lastElementChild;


  // --------------------------------------------------------
  // RESTORE / DEFAULT HOLES
  // --------------------------------------------------------

  const holes =
    Array.isArray(options.holes)
      ? options.holes
      : [];

  if (holes.length) {
    holes.forEach((hole) => {
      addHole(insertedCard, hole);
    });
  }

  else if (
    fixing.value === "brick"
  ) {
    addHole(insertedCard, 150);
    addHole(insertedCard, 700);
    addHole(insertedCard, 1700);
  }


  setupPostCardEvents(
    insertedCard
  );

  updatePostCardVisibility(
    insertedCard
  );

  renumberPosts();

  calculateProposedGateSize();
}


function renumberPosts() {
  const cards =
    getPostCards();

  cards.forEach((card, index) => {
    card.querySelector(
      ".post-title"
    ).textContent =
      `Post ${index + 1}`;
  });
}


function getPostCards() {
  return [
    ...document.querySelectorAll(
      "#postsContainer .post-card"
    )
  ];
}


// ============================================================
// POST HOLES
// ============================================================

function addHole(card, value = 150) {
  const template =
    $("holeTemplate");

  const fragment =
    template.content.cloneNode(true);

  const input =
    fragment.querySelector(
      ".hole-position"
    );

  input.value = value;

  const list =
    card.querySelector(
      ".hole-list"
    );

  list.appendChild(fragment);

  const row =
    list.lastElementChild;

  row.querySelector(
    ".remove-hole-btn"
  ).addEventListener(
    "click",
    () => {
      row.remove();
      calculateQuote();
    }
  );

  input.addEventListener(
    "input",
    calculateQuote
  );
}


// ============================================================
// POST CARD EVENTS
// ============================================================

function setupPostCardEvents(card) {
  const fixing =
    card.querySelector(
      ".post-fixing"
    );

  fixing.addEventListener(
    "change",
    () => {
      updatePostCardVisibility(card);

      const holeList =
        card.querySelector(
          ".hole-list"
        );

      if (
        fixing.value === "brick" &&
        holeList.children.length === 0
      ) {
        addHole(card, 150);
        addHole(card, 700);
        addHole(card, 1700);
      }

      calculateProposedGateSize();
    }
  );


  card.querySelector(
    ".add-hole-btn"
  ).addEventListener(
    "click",
    () => {
      addHole(card, 150);
    }
  );


  card.querySelector(
    ".remove-post-btn"
  ).addEventListener(
    "click",
    () => {
      card.remove();

      renumberPosts();

      calculateProposedGateSize();
    }
  );


  card.querySelectorAll(
    "input, select"
  ).forEach((element) => {
    element.addEventListener(
      "input",
      calculateQuote
    );

    element.addEventListener(
      "change",
      () => {
        calculateProposedGateSize();
      }
    );
  });
}


function updatePostCardVisibility(card) {
  const fixing =
    card.querySelector(
      ".post-fixing"
    ).value;

  const concrete =
    card.querySelector(
      ".post-concrete-options"
    );

  const brick =
    card.querySelector(
      ".post-brick-options"
    );

  const needsConcrete =
    fixing === "concreted" ||
    fixing === "fixedPanel";

  concrete.classList.toggle(
    "hidden",
    !needsConcrete
  );

  brick.classList.toggle(
    "hidden",
    fixing !== "brick"
  );
}


// ============================================================
// READ POSTS INTO DATA
// ============================================================

function collectPosts() {
  if (!includePosts()) {
    return [];
  }

  return getPostCards()
    .map((card, index) => {
      const fixing =
        card.querySelector(
          ".post-fixing"
        ).value;

      const postKey =
        card.querySelector(
          ".post-size"
        ).value;

      const postData =
        PRICES.steel.posts[
          postKey
        ];

      const height =
        Number(
          card.querySelector(
            ".post-height"
          ).value || 0
        );

      const embed =
        Number(
          card.querySelector(
            ".post-embed"
          ).value || 0
        );

      const concreteBags =
        Number(
          card.querySelector(
            ".post-concrete-bags"
          ).value || 0
        );

      const dynaboltLength =
        Number(
          card.querySelector(
            ".post-dynabolt-length"
          ).value || 0
        );

      const holes = [
        ...card.querySelectorAll(
          ".hole-position"
        )
      ].map((input) =>
        Number(input.value || 0)
      );

      const isExisting =
        fixing === "existing";

      const totalLengthMm =
        isExisting
          ? 0
          : height +
            (
              fixing === "concreted" ||
              fixing === "fixedPanel"
                ? embed
                : 0
            );

      return {
        number: index + 1,

        position:
          card.querySelector(
            ".post-position"
          ).value.trim(),

        postKey,

        postLabel:
          postData.label,

        postWidthMm:
          Number(
            postData.widthMm || 0
          ),

        heightMm:
          height,

        fixing,

        embedMm:
          embed,

        concreteBags,

        dynaboltLengthMm:
          dynaboltLength,

        holes,

        totalLengthMm,

        isExisting
      };
    });
}


// ============================================================
// POSTS THAT OCCUPY THE CAVITY
// ============================================================

function calculatePostCavityDeduction(posts) {
  return posts.reduce(
    (total, post) => {
      if (post.isExisting) {
        return total;
      }

      return total +
        post.postWidthMm;
    },
    0
  );
}


// ============================================================
// PROPOSED GATE SIZE
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

  const posts =
    collectPosts();

  const postDeduction =
    includePosts()
      ? calculatePostCavityDeduction(
          posts
        )
      : 0;

  const fixedPanelWidth =
    $("fixedPanelOption").value !==
    "none"
      ? Number(
          $("fixedPanelWidth")
            .value || 0
        )
      : 0;

  const proposedWidth =
    Math.max(
      0,
      cavityWidth -
      postDeduction -
      fixedPanelWidth -
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
      Math.round(proposedWidth);
  }

  if (cavityHeight > 0) {
    $("gateHeight").value =
      Math.round(proposedHeight);
  }

  updateMeasurementBreakdown(
    cavityWidth,
    postDeduction,
    fixedPanelWidth,
    leftGap,
    rightGap,
    proposedWidth
  );

  calculateQuote();
}


// ============================================================
// MEASUREMENT BREAKDOWN
// ============================================================

function updateMeasurementBreakdown(
  cavityWidth,
  postDeduction,
  fixedPanelWidth,
  leftGap,
  rightGap,
  proposedWidth
) {
  const rows = [];

  rows.push(`
    <div>
      <span>Original cavity</span>
      <strong>${cavityWidth} mm</strong>
    </div>
  `);

  if (
    includePosts() &&
    postDeduction > 0
  ) {
    rows.push(`
      <div>
        <span>Posts</span>
        <strong>− ${postDeduction} mm</strong>
      </div>
    `);
  }

  if (fixedPanelWidth > 0) {
    rows.push(`
      <div>
        <span>Fixed panel</span>
        <strong>− ${fixedPanelWidth} mm</strong>
      </div>
    `);
  }

  rows.push(`
    <div>
      <span>Left clearance</span>
      <strong>− ${leftGap} mm</strong>
    </div>
  `);

  rows.push(`
    <div>
      <span>Right clearance</span>
      <strong>− ${rightGap} mm</strong>
    </div>
  `);

  rows.push(`
    <div class="measurement-total">
      <span>Proposed gate width</span>
      <strong>${Math.round(proposedWidth)} mm</strong>
    </div>
  `);

  $("measurementBreakdown")
    .innerHTML =
    rows.join("");
}


// ============================================================
// CLADDING OPTIONS
// ============================================================

function updateCladdingOptions() {
  const type =
    $("claddingType").value;

  $("ekodeckOptions")
    .classList.toggle(
      "hidden",
      type !== "ekodeck"
    );

  $("cypressOptions")
    .classList.toggle(
      "hidden",
      type !==
      "cypressPickets"
    );

  $("lospOptions")
    .classList.toggle(
      "hidden",
      ![
        "losp50",
        "losp90"
      ].includes(type)
    );

  $("merbauOptions")
    .classList.toggle(
      "hidden",
      ![
        "merbau90",
        "merbau140"
      ].includes(type)
    );

  $("colorbondOptions")
    .classList.toggle(
      "hidden",
      type !== "colorbond"
    );

  $("customCladdingOptions")
    .classList.toggle(
      "hidden",
      type !== "custom"
    );

  $("cypressPaintColourWrap")
    .classList.toggle(
      "hidden",
      $("cypressFinish").value !==
      "Paint"
    );

  $("lospPaintColourWrap")
    .classList.toggle(
      "hidden",
      $("lospFinish").value !==
      "Paint"
    );
}


// ============================================================
// OTHER CONDITIONAL SECTIONS
// ============================================================

function updateConditionalSections() {
  updateIncludeSections();

  updateCladdingOptions();

  const hasFixedPanel =
    $("fixedPanelOption").value !==
    "none";

  $("fixedPanelOptions")
    .classList.toggle(
      "hidden",
      !hasFixedPanel
    );

  $("fixedPanelMaterialSummary")
    .classList.toggle(
      "hidden",
      !hasFixedPanel
    );

  $("powderOptions")
    .classList.toggle(
      "hidden",
      !$("powderCoat").checked
    );
}


// ============================================================
// STOCK CUT OPTIMISER
// ============================================================

function splitLongPieces(
  pieces,
  stockLength
) {
  const output = [];

  pieces.forEach((piece) => {
    let remaining = piece;

    while (
      remaining >
      stockLength + 0.000001
    ) {
      output.push(stockLength);
      remaining -= stockLength;
    }

    if (remaining > 0.000001) {
      output.push(remaining);
    }
  });

  return output;
}


function calculateStockFromPieces(
  originalPieces,
  stockLength
) {
  if (
    !stockLength ||
    stockLength <= 0
  ) {
    const total =
      originalPieces.reduce(
        (sum, value) =>
          sum + value,
        0
      );

    return {
      stockLengths: 0,
      purchasedMetres: total,
      usedMetres: total,
      wasteMetres: 0
    };
  }

  const pieces =
    splitLongPieces(
      originalPieces,
      stockLength
    )
      .filter(
        (piece) => piece > 0
      )
      .sort(
        (a, b) => b - a
      );

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
        stockLength + 0.000001
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
    bins.length *
    stockLength;

  return {
    stockLengths:
      bins.length,

    purchasedMetres,

    usedMetres,

    wasteMetres:
      Math.max(
        0,
        purchasedMetres -
        usedMetres
      )
  };
}


// ============================================================
// FRAME CALCULATION
// ============================================================

function calculateFrame(
  gateWidthMm,
  gateHeightMm,
  fixedPanel
) {
  if (!includeFrame()) {
    return {
      perimeterM: 0,
      horizontalRailM: 0,
      verticalRailM: 0,
      fixedPanelFrameM: 0,
      totalUsedM: 0,
      stockLengths: 0,
      purchasedM: 0,
      wasteM: 0,
      costExGST: 0
    };
  }

  const frameKey =
    $("frameSize").value;

  const frame =
    PRICES.steel.frame[
      frameKey
    ];

  const face =
    Number(
      frame.faceMm || 0
    );

  const leaves =
    gateLeafCount();

  const piecesM = [];

  let perimeterM = 0;


  // --------------------------------------------------------
  // GATE PERIMETER
  // --------------------------------------------------------

  if (quoteType === "double") {
    const leafWidthMm =
      gateWidthMm / 2;

    for (let i = 0; i < 2; i++) {
      piecesM.push(
        leafWidthMm / 1000,
        leafWidthMm / 1000,
        gateHeightMm / 1000,
        gateHeightMm / 1000
      );
    }

    perimeterM =
      (
        gateWidthMm * 2 +
        gateHeightMm * 4
      ) / 1000;
  }

  else {
    piecesM.push(
      gateWidthMm / 1000,
      gateWidthMm / 1000,
      gateHeightMm / 1000,
      gateHeightMm / 1000
    );

    perimeterM =
      (
        gateWidthMm * 2 +
        gateHeightMm * 2
      ) / 1000;
  }


  // --------------------------------------------------------
  // HORIZONTAL MID RAILS
  // --------------------------------------------------------

  const horizontalCount =
    Number(
      $("horizontalMidRails")
        .value || 0
    );

  const leafWidthMm =
    gateWidthMm / leaves;

  const horizontalOneMm =
    Math.max(
      0,
      leafWidthMm -
      (face * 2)
    );

  let horizontalRailM = 0;

  for (
    let leaf = 0;
    leaf < leaves;
    leaf++
  ) {
    for (
      let rail = 0;
      rail < horizontalCount;
      rail++
    ) {
      piecesM.push(
        horizontalOneMm /
        1000
      );

      horizontalRailM +=
        horizontalOneMm /
        1000;
    }
  }


  // --------------------------------------------------------
  // VERTICAL MID RAILS
  // --------------------------------------------------------

  const verticalCount =
    Number(
      $("verticalMidRails")
        .value || 0
    );

  const verticalOneMm =
    Math.max(
      0,
      gateHeightMm -
      (face * 2)
    );

  let verticalRailM = 0;

  for (
    let leaf = 0;
    leaf < leaves;
    leaf++
  ) {
    for (
      let rail = 0;
      rail < verticalCount;
      rail++
    ) {
      piecesM.push(
        verticalOneMm /
        1000
      );

      verticalRailM +=
        verticalOneMm /
        1000;
    }
  }


  // --------------------------------------------------------
  // FIXED PANEL FRAME
  // --------------------------------------------------------

  let fixedPanelFrameM = 0;

  if (
    fixedPanel.exists &&
    fixedPanel.widthMm > 0 &&
    fixedPanel.heightMm > 0
  ) {
    const w =
      fixedPanel.widthMm /
      1000;

    const h =
      fixedPanel.heightMm /
      1000;

    piecesM.push(
      w,
      w,
      h,
      h
    );

    fixedPanelFrameM =
      w * 2 +
      h * 2;
  }


  // --------------------------------------------------------
  // STOCK
  // --------------------------------------------------------

  const stock =
    calculateStockFromPieces(
      piecesM,
      frame.stockLengthM
    );

  const rawCost =
    stock.stockLengths *
    Number(
      frame.price || 0
    );

  return {
    perimeterM,

    horizontalRailM,

    verticalRailM,

    fixedPanelFrameM,

    totalUsedM:
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
        frame.priceIncludesGST
      )
  };
}


// ============================================================
// POST MATERIAL
// ============================================================

function calculatePosts(posts) {
  if (!includePosts()) {
    return {
      requiredM: 0,
      stockLengths: 0,
      purchasedM: 0,
      wasteM: 0,
      costExGST: 0,
      concreteCostExGST: 0,
      dynaboltCostExGST: 0,
      concreteBags: 0,
      dynabolts: 0
    };
  }

  const grouped = {};

  let concreteBags = 0;
  let dynabolts = 0;


  // --------------------------------------------------------
  // GROUP POSTS BY STEEL SIZE
  // --------------------------------------------------------

  posts.forEach((post) => {
    if (post.isExisting) {
      return;
    }

    if (
      !grouped[post.postKey]
    ) {
      grouped[post.postKey] = [];
    }

    grouped[
      post.postKey
    ].push(
      post.totalLengthMm /
      1000
    );

    if (
      post.fixing ===
      "concreted" ||
      post.fixing ===
      "fixedPanel"
    ) {
      concreteBags +=
        post.concreteBags;
    }

    if (
      post.fixing === "brick"
    ) {
      dynabolts +=
        post.holes.length;
    }
  });


  // --------------------------------------------------------
  // STEEL COSTS
  // --------------------------------------------------------

  let requiredM = 0;
  let purchasedM = 0;
  let wasteM = 0;
  let stockLengths = 0;
  let costExGST = 0;

  Object.entries(
    grouped
  ).forEach(
    ([postKey, pieces]) => {
      const post =
        PRICES.steel.posts[
          postKey
        ];

      const stock =
        calculateStockFromPieces(
          pieces,
          post.stockLengthM
        );

      requiredM +=
        stock.usedMetres;

      purchasedM +=
        stock.purchasedMetres;

      wasteM +=
        stock.wasteMetres;

      stockLengths +=
        stock.stockLengths;

      const rawCost =
        stock.stockLengths *
        Number(
          post.price || 0
        );

      costExGST +=
        toExGST(
          rawCost,
          post.priceIncludesGST
        );
    }
  );


  // --------------------------------------------------------
  // CONCRETE
  // --------------------------------------------------------

  const concreteRaw =
    concreteBags *
    PRICES.postFixing.concrete
      .pricePerBag;

  const concreteCostExGST =
    toExGST(
      concreteRaw,
      PRICES.postFixing.concrete
        .priceIncludesGST
    );


  // --------------------------------------------------------
  // DYNABOLTS
  // --------------------------------------------------------

  const boltRaw =
    dynabolts *
    PRICES.postFixing.dynabolts
      .priceEach;

  const dynaboltCostExGST =
    toExGST(
      boltRaw,
      PRICES.postFixing.dynabolts
        .priceIncludesGST
    );


  return {
    requiredM,
    stockLengths,
    purchasedM,
    wasteM,
    costExGST,
    concreteCostExGST,
    dynaboltCostExGST,
    concreteBags,
    dynabolts
  };
}


// ============================================================
// POST CUT LIST
// ============================================================

function updatePostCutList(posts) {
  if (
    !includePosts() ||
    posts.length === 0
  ) {
    $("postCutList")
      .innerHTML = "";

    return;
  }

  const lines =
    posts.map((post) => {
      const position =
        post.position
          ? ` — ${post.position}`
          : "";

      if (post.isExisting) {
        return `
          <div>
            <strong>
              Post ${post.number}${position}
            </strong>
            <span>
              Existing structure
            </span>
          </div>
        `;
      }

      let fixingText = "";

      if (
        post.fixing ===
        "concreted"
      ) {
        fixingText =
          `Concreted, ${post.embedMm}mm embedment`;
      }

      else if (
        post.fixing ===
        "fixedPanel"
      ) {
        fixingText =
          `Fixed panel post, ${post.embedMm}mm embedment`;
      }

      else if (
        post.fixing === "brick"
      ) {
        fixingText =
          `Brick fixed, ${post.holes.length} x ${post.dynaboltLengthMm}x10mm Dynabolts`;
      }

      return `
        <div>
          <strong>
            Post ${post.number}${position}
          </strong>

          <span>
            ${post.postLabel}
          </span>

          <span>
            Cut:
            ${post.totalLengthMm}mm
          </span>

          <span>
            ${fixingText}
          </span>
        </div>
      `;
    });

  $("postCutList")
    .innerHTML =
    lines.join("");
}


// ============================================================
// FIXED PANEL
// ============================================================

function getFixedPanel() {
  const option =
    $("fixedPanelOption").value;

  const exists =
    option !== "none";

  const widthMm =
    exists
      ? Number(
          $("fixedPanelWidth")
            .value || 0
        )
      : 0;

  const heightMm =
    exists
      ? Number(
          $("fixedPanelHeight")
            .value || 0
        )
      : 0;

  return {
    exists,
    side: option,
    widthMm,
    heightMm,

    areaM2:
      (widthMm / 1000) *
      (heightMm / 1000),

    direction:
      $("fixedPanelDirection")
        .value,

    claddingType:
      $("fixedPanelCladding")
        .value
  };
}


// ============================================================
// BOARD CLADDING CORE
// ============================================================

function calculateBoardMaterial({
  widthMm,
  heightMm,
  direction,
  data,
  stockLengthM,
  priceMode,
  priceValue
}) {
  const boardWidth =
    Number(
      data.boardWidthMm || 0
    );

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
      rawCost: 0
    };
  }

  let pieceLengthM = 0;
  let courses = 0;

  if (direction === "horizontal") {
    pieceLengthM =
      widthMm / 1000;

    courses =
      Math.ceil(
        heightMm /
        boardWidth
      );
  }

  else {
    pieceLengthM =
      heightMm / 1000;

    courses =
      Math.ceil(
        widthMm /
        boardWidth
      );
  }

  const pieces =
    Array(courses)
      .fill(pieceLengthM);

  const stock =
    calculateStockFromPieces(
      pieces,
      stockLengthM
    );

  let rawCost = 0;

  if (
    priceMode ===
    "stockLength"
  ) {
    rawCost =
      stock.stockLengths *
      Number(
        priceValue || 0
      );
  }

  else if (
    priceMode ===
    "linealMetre"
  ) {
    const chargeM =
      stockLengthM > 0
        ? stock.purchasedMetres
        : stock.usedMetres;

    rawCost =
      chargeM *
      Number(
        priceValue || 0
      );
  }

  return {
    boards: courses,

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
// CLADDING DESCRIPTION
// ============================================================

function getGateCladdingDescription() {
  const type =
    $("claddingType").value;

  const data =
    PRICES.cladding[type];

  if (type === "ekodeck") {
    return (
      `${data.label}, ` +
      `${$("ekodeckColour").value}, ` +
      `${$("claddingDirection").value}`
    );
  }

  if (
    type ===
    "cypressPickets"
  ) {
    let text =
      `${data.label}, ` +
      `${$("cypressFinish").value}`;

    if (
      $("cypressFinish").value ===
      "Paint" &&
      $("cypressPaintColour")
        .value.trim()
    ) {
      text +=
        `, ${$("cypressPaintColour")
          .value.trim()}`;
    }

    text +=
      `, ${$("claddingDirection").value}`;

    return text;
  }

  if (
    type === "losp50" ||
    type === "losp90"
  ) {
    let text =
      `${data.label}, ` +
      `${$("lospFinish").value}`;

    if (
      $("lospFinish").value ===
      "Paint" &&
      $("lospPaintColour")
        .value.trim()
    ) {
      text +=
        `, ${$("lospPaintColour")
          .value.trim()}`;
    }

    text +=
      `, ${$("claddingDirection").value}`;

    return text;
  }

  if (
    type === "merbau90" ||
    type === "merbau140"
  ) {
    return (
      `${data.label}, ` +
      `${$("merbauFinish").value}, ` +
      `${$("claddingDirection").value}`
    );
  }

  if (type === "colorbond") {
    let text =
      `Colorbond ` +
      `${$("colorbondProfile").value}`;

    if (
      $("colorbondNotes")
        .value.trim()
    ) {
      text +=
        `, ${$("colorbondNotes")
          .value.trim()}`;
    }

    return text;
  }

  return (
    $("customCladdingName")
      .value.trim() ||
    "Custom cladding"
  );
}


// ============================================================
// GATE CLADDING COST
// ============================================================

function calculateGateCladding(
  widthMm,
  heightMm
) {
  if (!includeCladding()) {
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

  const type =
    $("claddingType").value;

  const data =
    PRICES.cladding[type];

  const direction =
    $("claddingDirection").value;

  const areaM2 =
    (widthMm / 1000) *
    (heightMm / 1000);


  // --------------------------------------------------------
  // EKODECK
  // --------------------------------------------------------

  if (type === "ekodeck") {
    const calc =
      calculateBoardMaterial({
        widthMm,
        heightMm,
        direction,
        data,
        stockLengthM:
          data.stockLengthM,
        priceMode:
          "stockLength",
        priceValue:
          data.pricePerStockLength
      });

    return {
      ...calc,

      costExGST:
        toExGST(
          calc.rawCost,
          data.priceIncludesGST
        ),

      description:
        getGateCladdingDescription()
    };
  }


  // --------------------------------------------------------
  // CYPRESS
  // --------------------------------------------------------

  if (
    type === "cypressPickets"
  ) {
    const stockLengthM =
      Number(
        $("cypressLength").value
      ) / 1000;

    const calc =
      calculateBoardMaterial({
        widthMm,
        heightMm,
        direction,
        data,
        stockLengthM,
        priceMode:
          "stockLength",
        priceValue:
          data.pricePerStockLength
      });

    return {
      ...calc,

      costExGST:
        toExGST(
          calc.rawCost,
          data.priceIncludesGST
        ),

      description:
        getGateCladdingDescription()
    };
  }


  // --------------------------------------------------------
  // LOSP
  // --------------------------------------------------------

  if (
    type === "losp50" ||
    type === "losp90"
  ) {
    const calc =
      calculateBoardMaterial({
        widthMm,
        heightMm,
        direction,
        data,
        stockLengthM:
          data.stockLengthM,
        priceMode:
          "linealMetre",
        priceValue:
          data.pricePerLinealM
      });

    return {
      ...calc,

      costExGST:
        toExGST(
          calc.rawCost,
          data.priceIncludesGST
        ),

      description:
        getGateCladdingDescription()
    };
  }


  // --------------------------------------------------------
  // MERBAU
  // --------------------------------------------------------

  if (
    type === "merbau90" ||
    type === "merbau140"
  ) {
    const calc =
      calculateBoardMaterial({
        widthMm,
        heightMm,
        direction,
        data,
        stockLengthM:
          data.stockLengthM || 0,
        priceMode:
          "linealMetre",
        priceValue:
          data.pricePerLinealM || 0
      });

    return {
      ...calc,

      costExGST:
        toExGST(
          calc.rawCost,
          data.priceIncludesGST
        ),

      description:
        getGateCladdingDescription()
    };
  }


  // --------------------------------------------------------
  // COLORBOND
  // --------------------------------------------------------

  if (type === "colorbond") {
    const rawCost =
      areaM2 *
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
        getGateCladdingDescription()
    };
  }


  // --------------------------------------------------------
  // CUSTOM
  // --------------------------------------------------------

  return {
    boards: 0,
    requiredM: 0,
    stockLengths: 0,
    purchasedM: 0,
    wasteM: 0,

    costExGST:
      toExGST(
        Number(
          $("customCladdingCost")
            .value || 0
        ),
        true
      ),

    description:
      getGateCladdingDescription()
  };
}


// ============================================================
// FIXED PANEL CLADDING
// ============================================================

function calculateFixedPanelCladding(
  fixedPanel
) {
  if (
    !fixedPanel.exists ||
    !includeCladding()
  ) {
    return {
      requiredM: 0,
      costExGST: 0,
      description: ""
    };
  }

  let type =
    fixedPanel.claddingType;

  if (type === "same") {
    type =
      $("claddingType").value;
  }

  const data =
    PRICES.cladding[type];

  if (!data) {
    return {
      requiredM: 0,
      costExGST: 0,
      description: ""
    };
  }

  const direction =
    fixedPanel.direction;


  // --------------------------------------------------------
  // EKODECK
  // --------------------------------------------------------

  if (type === "ekodeck") {
    const calc =
      calculateBoardMaterial({
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

    return {
      requiredM:
        calc.requiredM,

      costExGST:
        toExGST(
          calc.rawCost,
          data.priceIncludesGST
        ),

      description:
        data.label
    };
  }


  // --------------------------------------------------------
  // CYPRESS
  // --------------------------------------------------------

  if (
    type === "cypressPickets"
  ) {
    const stockM =
      Number(
        $("cypressLength").value
      ) / 1000;

    const calc =
      calculateBoardMaterial({
        widthMm:
          fixedPanel.widthMm,

        heightMm:
          fixedPanel.heightMm,

        direction,

        data,

        stockLengthM:
          stockM,

        priceMode:
          "stockLength",

        priceValue:
          data.pricePerStockLength
      });

    return {
      requiredM:
        calc.requiredM,

      costExGST:
        toExGST(
          calc.rawCost,
          data.priceIncludesGST
        ),

      description:
        data.label
    };
  }


  // --------------------------------------------------------
  // LOSP / MERBAU
  // --------------------------------------------------------

  if (
    [
      "losp50",
      "losp90",
      "merbau90",
      "merbau140"
    ].includes(type)
  ) {
    const calc =
      calculateBoardMaterial({
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

    return {
      requiredM:
        calc.requiredM,

      costExGST:
        toExGST(
          calc.rawCost,
          data.priceIncludesGST
        ),

      description:
        data.label
    };
  }


  // --------------------------------------------------------
  // COLORBOND
  // --------------------------------------------------------

  if (type === "colorbond") {
    const rawCost =
      fixedPanel.areaM2 *
      Number(
        data.pricePerM2 || 0
      );

    return {
      requiredM: 0,

      costExGST:
        toExGST(
          rawCost,
          data.priceIncludesGST
        ),

      description:
        data.label
    };
  }

  return {
    requiredM: 0,
    costExGST: 0,
    description: ""
  };
}


// ============================================================
// HARDWARE
// ============================================================

function calculateHardware(
  fixedPanel
) {
  let hingeSets = 0;
  let latchCostExGST = 0;

  if (includeFrame()) {
    if (quoteType === "single") {
      hingeSets = 1;
    }

    else if (
      quoteType === "double"
    ) {
      hingeSets = 2;
    }

    // Slider = 0 hinge sets.

    const latch =
      PRICES.hardware.latches[
        $("latch").value
      ];

    latchCostExGST =
      toExGST(
        latch.price,
        latch.priceIncludesGST
      );
  }

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


  // --------------------------------------------------------
  // SCREWS
  // --------------------------------------------------------

  let screwUnits = 0;

  if (includeCladding()) {
    screwUnits +=
      gateLeafCount();

    if (fixedPanel.exists) {
      screwUnits++;
    }
  }

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
      PRICES.hardware.latches[
        $("latch").value
      ].label
  };
}


// ============================================================
// FINISH
// ============================================================

function calculateFinishing(
  projectArea
) {
  if (!includeFrame()) {
    return {
      powderCostExGST: 0,
      touchUpCostExGST: 0
    };
  }

  if ($("powderCoat").checked) {
    return {
      powderCostExGST:
        toExGST(
          Number(
            $("powderCost")
              .value || 0
          ),
          PRICES.finishing
            .powderCoat
            .priceIncludesGST
        ),

      touchUpCostExGST: 0
    };
  }

  const raw =
    projectArea *
    PRICES.finishing
      .galvanisedTouchUp
      .pricePerM2;

  return {
    powderCostExGST: 0,

    touchUpCostExGST:
      toExGST(
        raw,
        PRICES.finishing
          .galvanisedTouchUp
          .priceIncludesGST
      )
  };
}


// ============================================================
// LABOUR
// ============================================================

function calculateLabour(posts) {
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

  const hasConcrete =
    posts.some(
      (post) =>
        post.fixing ===
        "concreted" ||
        post.fixing ===
        "fixedPanel"
    );

  const holeDig =
    hasConcrete
      ? Number(
          $("holeDigHours")
            .value || 0
        )
      : 0;

  const soilRemoval =
    hasConcrete
      ? Number(
          $("soilRemovalHours")
            .value || 0
        )
      : 0;

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
// MAIN CALCULATOR
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

  const gateArea =
    (gateWidthMm / 1000) *
    (gateHeightMm / 1000);

  $("gateArea").textContent =
    `${gateArea.toFixed(2)} m²`;


  // --------------------------------------------------------
  // POSTS
  // --------------------------------------------------------

  const posts =
    collectPosts();

  const postMaterials =
    calculatePosts(posts);

  updatePostCutList(posts);


  // --------------------------------------------------------
  // FIXED PANEL
  // --------------------------------------------------------

  const fixedPanel =
    getFixedPanel();


  // --------------------------------------------------------
  // TOTAL PROJECT AREA
  // --------------------------------------------------------

  const projectArea =
    gateArea +
    fixedPanel.areaM2;


  // --------------------------------------------------------
  // FRAME
  // --------------------------------------------------------

  const frame =
    calculateFrame(
      gateWidthMm,
      gateHeightMm,
      fixedPanel
    );


  // --------------------------------------------------------
  // CLADDING
  // --------------------------------------------------------

  const gateCladding =
    calculateGateCladding(
      gateWidthMm,
      gateHeightMm
    );

  const panelCladding =
    calculateFixedPanelCladding(
      fixedPanel
    );


  // --------------------------------------------------------
  // HARDWARE
  // --------------------------------------------------------

  const hardware =
    calculateHardware(
      fixedPanel
    );


  // --------------------------------------------------------
  // FINISH
  // --------------------------------------------------------

  const finishing =
    calculateFinishing(
      projectArea
    );


  // --------------------------------------------------------
  // EXTRA MATERIAL
  // --------------------------------------------------------

  const extraMaterialExGST =
    toExGST(
      Number(
        $("extraHardware")
          .value || 0
      ),
      true
    );


  // --------------------------------------------------------
  // MATERIAL TOTAL
  // --------------------------------------------------------

  const materialsExGST =
    frame.costExGST +

    postMaterials.costExGST +

    postMaterials
      .concreteCostExGST +

    postMaterials
      .dynaboltCostExGST +

    gateCladding.costExGST +

    panelCladding.costExGST +

    hardware.hingeCostExGST +

    hardware.latchCostExGST +

    hardware.screwsCostExGST +

    finishing.powderCostExGST +

    finishing.touchUpCostExGST +

    extraMaterialExGST;


  // --------------------------------------------------------
  // LABOUR
  // --------------------------------------------------------

  const labour =
    calculateLabour(posts);


  // --------------------------------------------------------
  // TRAVEL
  // --------------------------------------------------------

  const travel =
    calculateTravel();


  // --------------------------------------------------------
  // OTHER COSTS
  // --------------------------------------------------------

  const otherCostsExGST =
    toExGST(
      Number(
        $("otherCosts")
          .value || 0
      ),
      true
    );


  // --------------------------------------------------------
  // MARKUP
  // --------------------------------------------------------

  const markup =
    materialsExGST *
    PRICES.business
      .materialMarkup;


  // --------------------------------------------------------
  // TOTALS
  // --------------------------------------------------------

  const exGST =
    materialsExGST +
    labour.costExGST +
    travel.costExGST +
    otherCostsExGST +
    markup;

  const gst =
    exGST *
    PRICES.business.gst;

  const incGST =
    exGST + gst;

  const roundedFinal =
    roundUp(
      incGST,
      PRICES.business.roundTo
    );


  // --------------------------------------------------------
  // MATERIAL DISPLAY
  // --------------------------------------------------------

  $("frameMetres").textContent =
    `${frame.perimeterM.toFixed(2)} m`;

  $("horizontalRailMetres")
    .textContent =
    `${frame.horizontalRailM.toFixed(2)} m`;

  $("verticalRailMetres")
    .textContent =
    `${frame.verticalRailM.toFixed(2)} m`;

  $("fixedPanelFrameMetres")
    .textContent =
    `${frame.fixedPanelFrameM.toFixed(2)} m`;

  $("totalFrameMetres")
    .textContent =
    `${frame.totalUsedM.toFixed(2)} m`;

  $("frameLengths").textContent =
    frame.stockLengths;

  $("frameWaste").textContent =
    `${frame.wasteM.toFixed(2)} m`;


  $("postMetres").textContent =
    `${postMaterials.requiredM.toFixed(2)} m`;

  $("postLengths").textContent =
    postMaterials.stockLengths;

  $("postWaste").textContent =
    `${postMaterials.wasteM.toFixed(2)} m`;


  $("claddingBoards").textContent =
    gateCladding.boards || 0;

  $("claddingMetres").textContent =
    `${(gateCladding.requiredM || 0).toFixed(2)} m`;

  $("claddingStockLengths")
    .textContent =
    gateCladding.stockLengths || 0;

  $("claddingWaste")
    .textContent =
    `${(gateCladding.wasteM || 0).toFixed(2)} m`;


  $("fixedPanelArea")
    .textContent =
    `${fixedPanel.areaM2.toFixed(2)} m²`;

  $("fixedPanelFrameSummary")
    .textContent =
    `${frame.fixedPanelFrameM.toFixed(2)} m`;

  $("fixedPanelCladdingMetres")
    .textContent =
    `${(panelCladding.requiredM || 0).toFixed(2)} m`;


  // --------------------------------------------------------
  // COST DISPLAY
  // --------------------------------------------------------

  $("materialsTotal")
    .textContent =
    money(materialsExGST);

  $("labourTotal")
    .textContent =
    money(labour.costExGST);

  $("travelTotal")
    .textContent =
    money(travel.costExGST);

  $("directOtherTotal")
    .textContent =
    money(otherCostsExGST);

  $("markupTotal")
    .textContent =
    money(markup);

  $("exGstTotal")
    .textContent =
    money(exGST);

  $("gstTotal")
    .textContent =
    money(gst);

  $("incGstTotal")
    .textContent =
    money(incGST);

  $("projectAreaTotal")
    .textContent =
    `${projectArea.toFixed(2)} m²`;


  // --------------------------------------------------------
  // FINAL PRICE
  // --------------------------------------------------------

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
    gateArea,

    posts,
    postMaterials,

    fixedPanel,
    projectArea,

    frame,

    gateCladding,
    panelCladding,

    hardware,
    finishing,

    materialsExGST,

    labour,
    travel,

    otherCostsExGST,

    markup,
    exGST,
    gst,
    incGST,

    roundedFinal
  };

  updateFinalNumbers();

  updateDetailedCosting();
}


// ============================================================
// FINAL PRICE / PROFIT / EFFECTIVE M²
// ============================================================

function updateFinalNumbers() {
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


  // --------------------------------------------------------
  // EFFECTIVE RATE
  // INTERNAL ONLY
  // --------------------------------------------------------

  if (
    lastCalculation.projectArea > 0
  ) {
    const rate =
      finalIncGST /
      lastCalculation.projectArea;

    $("effectiveRate")
      .textContent =
      `${money(rate)}/m²`;
  }

  else {
    $("effectiveRate")
      .textContent =
      "N/A";
  }


  // --------------------------------------------------------
  // CUSTOMER QUOTE PRICE
  // --------------------------------------------------------

  $("quoteExGstDisplay")
    .textContent =
    money(finalExGST);

  $("quoteGstDisplay")
    .textContent =
    money(finalGST);

  $("quoteTotalDisplay")
    .textContent =
    money(finalIncGST);

  buildFinishedQuote(
    finalExGST,
    finalGST,
    finalIncGST
  );
}


// ============================================================
// INTERNAL BREAKDOWN
// ============================================================

function updateDetailedCosting() {
  const c =
    lastCalculation;

  if (!c) {
    return;
  }

  $("costBreakdown")
    .innerHTML = `

      <p>
        <span>Frame steel</span>
        <strong>
          ${money(c.frame.costExGST)}
        </strong>
      </p>

      <p>
        <span>Post steel</span>
        <strong>
          ${money(c.postMaterials.costExGST)}
        </strong>
      </p>

      <p>
        <span>Concrete</span>
        <strong>
          ${money(c.postMaterials.concreteCostExGST)}
        </strong>
      </p>

      <p>
        <span>
          Dynabolts
          (${c.postMaterials.dynabolts})
        </span>
        <strong>
          ${money(c.postMaterials.dynaboltCostExGST)}
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
          Lock-out hinge sets
          (${c.hardware.hingeSets})
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
        <span>Screws / cladding fixings</span>
        <strong>
          ${money(c.hardware.screwsCostExGST)}
        </strong>
      </p>

      <p>
        <span>Powder coating</span>
        <strong>
          ${money(c.finishing.powderCostExGST)}
        </strong>
      </p>

      <p>
        <span>Etch primer / galv spray</span>
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
        <span>Labour cost</span>
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
        <span>Travel cost</span>
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
// POST QUOTE TEXT
// ============================================================

function postQuoteLines(posts) {
  const lines = [];

  posts.forEach((post) => {
    const name =
      post.position ||
      `Post ${post.number}`;

    if (post.isExisting) {
      lines.push(
        `${name}: existing structure`
      );

      return;
    }

    if (
      post.fixing ===
      "concreted" ||
      post.fixing ===
      "fixedPanel"
    ) {
      lines.push(
        `${name}: ${post.postLabel}, concreted approximately ${post.embedMm}mm into ground`
      );
    }

    else if (
      post.fixing === "brick"
    ) {
      lines.push(
        `${name}: ${post.postLabel}, fixed to existing brickwork`
      );
    }
  });

  return lines;
}


// ============================================================
// FINISHED QUOTE
// ============================================================

function buildFinishedQuote(
  finalExGST,
  finalGST,
  finalIncGST
) {
  const c =
    lastCalculation;

  if (!c) {
    return;
  }

  const customer =
    $("customerName")
      .value.trim();

  const address =
    $("siteAddress")
      .value.trim();

  const project =
    $("projectNumber")
      .value.trim();

  const lines = [];

  lines.push("JTLA GATES");

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
    "SCOPE OF WORKS"
  );


  // --------------------------------------------------------
  // FRAME
  // --------------------------------------------------------

  if (includeFrame()) {
    lines.push(
      `${gateTypeLabel()}: ` +
      `${c.gateWidthMm}mm wide x ` +
      `${c.gateHeightMm}mm high`
    );

    lines.push(
      `Frame: ` +
      `${
        PRICES.steel.frame[
          $("frameSize").value
        ].label
      }`
    );

    if (
      Number(
        $("horizontalMidRails")
          .value || 0
      ) > 0
    ) {
      lines.push(
        `Horizontal mid rails: ` +
        `${$("horizontalMidRails").value}`
      );
    }

    if (
      Number(
        $("verticalMidRails")
          .value || 0
      ) > 0
    ) {
      lines.push(
        `Vertical mid rails: ` +
        `${$("verticalMidRails").value}`
      );
    }
  }


  // --------------------------------------------------------
  // POSTS
  // --------------------------------------------------------

  if (
    includePosts() &&
    c.posts.length
  ) {
    lines.push("");

    postQuoteLines(
      c.posts
    ).forEach(
      (line) =>
        lines.push(line)
    );
  }


  // --------------------------------------------------------
  // CLADDING
  // --------------------------------------------------------

  if (includeCladding()) {
    lines.push("");

    lines.push(
      `Cladding: ` +
      `${c.gateCladding.description}`
    );
  }


  // --------------------------------------------------------
  // FIXED PANEL
  // --------------------------------------------------------

  if (c.fixedPanel.exists) {
    lines.push("");

    lines.push(
      `Fixed panel: ` +
      `${c.fixedPanel.widthMm}mm wide x ` +
      `${c.fixedPanel.heightMm}mm high, ` +
      `${c.fixedPanel.direction} cladding`
    );
  }


  // --------------------------------------------------------
  // HARDWARE
  // --------------------------------------------------------

  if (includeFrame()) {
    lines.push("");

    if (
      quoteType !== "slider"
    ) {
      lines.push(
        "Lock-out galvanised hinges"
      );
    }

    if (
      $("latch").value !==
      "none"
    ) {
      lines.push(
        c.hardware.latchLabel
      );
    }
  }


  // --------------------------------------------------------
  // FINISH
  // --------------------------------------------------------

  if (includeFrame()) {
    lines.push("");

    if (
      $("powderCoat").checked
    ) {
      const colour =
        $("powderColour")
          .value.trim();

      lines.push(
        `Steel finish: Powder coated` +
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
      lines.push(
        "Steel finish: Duragalv with exposed fabrication areas treated with etch primer and silver galvanising spray."
      );
    }
  }


  // --------------------------------------------------------
  // PRICE
  // --------------------------------------------------------

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


  // ========================================================
  // ON-SCREEN PROFESSIONAL VERSION
  // ========================================================

  const html = [];

  html.push(`
    <p>
      <strong>Scope of Works</strong>
    </p>
  `);


  if (includeFrame()) {
    html.push(`
      <p>
        Supply and install
        <strong>
          ${gateTypeLabel().toLowerCase()}
        </strong>
        measuring
        ${c.gateWidthMm}mm wide ×
        ${c.gateHeightMm}mm high.
      </p>

      <p>
        <strong>Frame:</strong>
        ${
          PRICES.steel.frame[
            $("frameSize").value
          ].label
        }
      </p>
    `);
  }


  if (
    includePosts() &&
    c.posts.length
  ) {
    const postHtml =
      postQuoteLines(
        c.posts
      )
        .map(
          (line) =>
            `${line}.`
        )
        .join("<br>");

    html.push(`
      <p>
        <strong>Posts:</strong><br>
        ${postHtml}
      </p>
    `);
  }


  if (includeCladding()) {
    html.push(`
      <p>
        <strong>Cladding:</strong>
        ${c.gateCladding.description}
      </p>
    `);
  }


  if (c.fixedPanel.exists) {
    html.push(`
      <p>
        <strong>Fixed panel:</strong>
        ${c.fixedPanel.widthMm}mm wide ×
        ${c.fixedPanel.heightMm}mm high,
        ${c.fixedPanel.direction} cladding.
      </p>
    `);
  }


  if (includeFrame()) {
    let hardwareText = "";

    if (
      quoteType !== "slider"
    ) {
      hardwareText +=
        "Lock-out galvanised hinges";
    }

    if (
      $("latch").value !==
      "none"
    ) {
      if (hardwareText) {
        hardwareText += "; ";
      }

      hardwareText +=
        c.hardware.latchLabel;
    }

    if (hardwareText) {
      html.push(`
        <p>
          <strong>Hardware:</strong>
          ${hardwareText}
        </p>
      `);
    }
  }


  if (
    includeFrame() &&
    $("powderCoat").checked
  ) {
    html.push(`
      <p>
        <strong>Steel finish:</strong>
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
      </p>
    `);
  }

  else if (includeFrame()) {
    html.push(`
      <p>
        <strong>Steel finish:</strong>
        Duragalv with exposed fabrication
        areas treated with etch primer and
        silver galvanising spray.
      </p>
    `);
  }

  $("quoteDescription")
    .innerHTML =
    html.join("");

  updateCustomerDisplay();
}


// ============================================================
// SAVE / LOAD
// ============================================================

function serializePosts() {
  return collectPosts();
}


function collectQuoteData() {
  const form = {};

  document
    .querySelectorAll(
      "input[id], select[id]"
    )
    .forEach((element) => {
      form[element.id] =
        element.type === "checkbox"
          ? element.checked
          : element.value;
    });

  return {
    id:
      $("projectNumber")
        .value.trim(),

    savedAt:
      new Date().toISOString(),

    quoteType,

    customerName:
      $("customerName")
        .value.trim(),

    siteAddress:
      $("siteAddress")
        .value.trim(),

    finalPrice:
      Number(
        $("finalPrice")
          .value || 0
      ),

    form,

    posts:
      serializePosts()
  };
}


function saveQuote() {
  calculateQuote();

  const project =
    $("projectNumber")
      .value.trim();

  if (
    !/^[0-9]{6}$/.test(
      project
    )
  ) {
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

  const index =
    quotes.findIndex(
      (item) =>
        item.id === quote.id
    );

  if (index >= 0) {
    quotes[index] =
      quote;
  }

  else {
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


function clearPosts() {
  $("postsContainer")
    .innerHTML = "";

  postCounter = 0;
}


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

  document
    .querySelectorAll(".tab")
    .forEach((tab) => {
      tab.classList.toggle(
        "active",
        tab.dataset.type ===
        quoteType
      );
    });


  // --------------------------------------------------------
  // STANDARD FORM VALUES
  // --------------------------------------------------------

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
      }

      else {
        element.value =
          value;
      }
    }
  );


  // --------------------------------------------------------
  // POSTS
  // --------------------------------------------------------

  clearPosts();

  if (
    Array.isArray(
      quote.posts
    )
  ) {
    quote.posts.forEach(
      (post) => {
        createPost({
          position:
            post.position,

          postSize:
            post.postKey,

          height:
            post.heightMm,

          fixing:
            post.fixing,

          embed:
            post.embedMm,

          concreteBags:
            post.concreteBags,

          dynaboltLength:
            post.dynaboltLengthMm,

          holes:
            post.holes
        });
      }
    );
  }


  updateConditionalSections();

  calculateProposedGateSize();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


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

  $("includeFrame").checked = true;
  $("includePosts").checked = true;
  $("includeCladding").checked = true;

  $("frameSize").value =
    PRICES.defaults.frame;

  $("horizontalMidRails").value =
    0;

  $("verticalMidRails").value =
    0;

  $("fixedPanelOption").value =
    "none";

  $("fixedPanelWidth").value = 0;
  $("fixedPanelHeight").value = 0;

  $("claddingType").value =
    PRICES.defaults.cladding;

  $("claddingDirection").value =
    PRICES.defaults
      .claddingDirection;

  $("ekodeckColour").value =
    "Greystone";

  $("cypressFinish").value =
    "Raw";

  $("lospFinish").value =
    "Plain";

  $("merbauFinish").value =
    "Raw";

  $("latch").value =
    PRICES.defaults.latch;

  $("powderCoat").checked =
    false;

  $("powderColour").value = "";

  $("powderCost").value =
    PRICES.finishing
      .powderCoat
      .typicalCost;

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

  $("fabricationHours").value = 4;
  $("installationHours").value = 2;
  $("holeDigHours").value = 1;
  $("soilRemovalHours").value = 0.5;

  $("travelKm").value = 0;
  $("otherCosts").value = 0;
  $("extraHardware").value = 0;

  clearPosts();

  createPost({
    position: "Left",
    fixing: "concreted"
  });

  createPost({
    position: "Right",
    fixing: "concreted"
  });

  setQuoteType("single");

  updateConditionalSections();

  validateRequiredFields();

  calculateProposedGateSize();
}


// ============================================================
// SMS / EMAIL
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

  window.location.href =
    `sms:${phone}?body=` +
    encodeURIComponent(
      currentQuoteText
    );
}


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
    `${$("projectNumber")
      .value.trim()}`;

  window.location.href =
    `mailto:${email}` +
    `?subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(currentQuoteText)}`;
}


function printQuote() {
  calculateQuote();
  window.print();
}


// ============================================================
// MAIN EVENTS
// ============================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    setupPriceFields();


    // --------------------------------------------------------
    // CREATE STARTING POSTS
    // --------------------------------------------------------

    createPost({
      position: "Left",
      fixing: "concreted"
    });

    createPost({
      position: "Right",
      fixing: "concreted"
    });


    // --------------------------------------------------------
    // ADD POST BUTTON
    // --------------------------------------------------------

    $("addPostBtn")
      .addEventListener(
        "click",
        () => {
          createPost({
            position: ""
          });
        }
      );


    // --------------------------------------------------------
    // GATE TYPE
    // --------------------------------------------------------

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


    // --------------------------------------------------------
    // INCLUDE SWITCHES
    // --------------------------------------------------------

    [
      "includeFrame",
      "includePosts",
      "includeCladding"
    ].forEach((id) => {
      $(id).addEventListener(
        "change",
        () => {
          updateConditionalSections();
          calculateProposedGateSize();
        }
      );
    });


    // --------------------------------------------------------
    // CUSTOMER
    // --------------------------------------------------------

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


    // --------------------------------------------------------
    // MEASUREMENTS
    // --------------------------------------------------------

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


    // --------------------------------------------------------
    // FIXED PANEL
    // --------------------------------------------------------

    $("fixedPanelOption")
      .addEventListener(
        "change",
        () => {
          updateConditionalSections();
          calculateProposedGateSize();
        }
      );


    // --------------------------------------------------------
    // CLADDING
    // --------------------------------------------------------

    [
      "claddingType",
      "cypressFinish",
      "lospFinish"
    ].forEach((id) => {
      $(id).addEventListener(
        "change",
        () => {
          updateCladdingOptions();
          calculateQuote();
        }
      );
    });


    // --------------------------------------------------------
    // POWDER
    // --------------------------------------------------------

    $("powderCoat")
      .addEventListener(
        "change",
        () => {
          updateConditionalSections();
          calculateQuote();
        }
      );


    // --------------------------------------------------------
    // ALL OTHER STANDARD INPUTS
    // --------------------------------------------------------

    document
      .querySelectorAll(
        "input[id], select[id]"
      )
      .forEach((element) => {

        const special = [
          "customerName",
          "siteAddress",
          "projectNumber",
          "customerPhone",
          "customerEmail",

          "includeFrame",
          "includePosts",
          "includeCladding",

          "cavityWidth",
          "cavityHeight",
          "leftGap",
          "rightGap",
          "bottomGap",

          "fixedPanelWidth",
          "fixedPanelOption",

          "claddingType",
          "cypressFinish",
          "lospFinish",

          "powderCoat",

          "finalPrice"
        ];

        if (
          special.includes(
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


    // --------------------------------------------------------
    // FINAL OVERRIDE
    // --------------------------------------------------------

    $("finalPrice")
      .addEventListener(
        "input",
        updateFinalNumbers
      );


    // --------------------------------------------------------
    // BUTTONS
    // --------------------------------------------------------

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


    // --------------------------------------------------------
    // INITIAL STATE
    // --------------------------------------------------------

    quoteType =
      PRICES.defaults.gateType;

    updateConditionalSections();

    updateCustomerDisplay();

    validateRequiredFields();

    calculateProposedGateSize();

    renderSavedQuotes();

  }
);
