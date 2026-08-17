/* ==========================================================
   JTLA GATES
   MAIN APP ENGINE
   VERSION 230
   ========================================================== */

const $ = id => document.getElementById(id);


/* ==========================================================
   STATE
   ========================================================== */

let components = [];
let componentCounter = 0;

let selectedComponentId = null;

let includeState = {
  gate: true,
  posts: true,
  cladding: true
};

let treatedPineState = {
  capping: true,
  plinth: true
};

let undoState = null;

let lastCalculation = null;

let restoringJob = false;
let refreshLock = false;


/*
  Quote override.

  AUTO:
  Uses app-calculated rounded quote.

  MANUAL:
  User has deliberately altered final price.

  Any PRICING-RELEVANT change resets
  MANUAL back to AUTO.
*/

let manualQuoteActive = false;
let manualQuoteValue = 0;


/*
  Prevent manual quote resetting while
  fields are being restored by code.
*/

let suppressQuoteReset = false;


/* ==========================================================
   COMPONENT COLOUR PALETTE
   STREET ORDER
   ========================================================== */

/*
  Identity colours are separate from
  completion status.

  Completion:
  Red badge = incomplete
  Green badge = complete

  Identity:
  Follows component's physical
  left-to-right street position.
*/

const COMPONENT_COLOURS = [
  {
    name: "green",
    bg: "#42634b",
    text: "#ffffff"
  },

  {
    name: "orange",
    bg: "#9a6035",
    text: "#ffffff"
  },

  {
    name: "blue",
    bg: "#476b82",
    text: "#ffffff"
  },

  {
    name: "purple",
    bg: "#6b567c",
    text: "#ffffff"
  },

  {
    name: "ochre",
    bg: "#927637",
    text: "#ffffff"
  },

  {
    name: "red",
    bg: "#824b4b",
    text: "#ffffff"
  },

  {
    name: "teal",
    bg: "#3f7270",
    text: "#ffffff"
  },

  {
    name: "slate",
    bg: "#59646d",
    text: "#ffffff"
  }
];


/* ==========================================================
   BASIC HELPERS
   ========================================================== */

function num(value) {
  return Number(value || 0);
}


function money(value) {
  return new Intl.NumberFormat(
    "en-AU",
    {
      style: "currency",
      currency: "AUD"
    }
  ).format(num(value));
}


function toExGST(
  value,
  includesGST = true
) {
  if (!includesGST) {
    return num(value);
  }

  return (
    num(value) /
    (1 + PRICES.business.gst)
  );
}


function roundQuote(value) {
  return (
    Math.ceil(
      num(value) /
      PRICES.business.roundTo
    )
    *
    PRICES.business.roundTo
  );
}


function formatProjectNumber(value) {
  const number =
    String(Number(value))
      .padStart(4, "0")
      .slice(-4);

  return `00${number}`;
}


function rawPhone() {
  const field = $("clientPhone");

  if (!field) {
    return "";
  }

  return field.value
    .replace(/\D/g, "")
    .slice(0, 10);
}


function displayPhone(value) {
  const digits =
    String(value || "")
      .replace(/\D/g, "")
      .slice(0, 10);

  if (digits.length !== 10) {
    return digits;
  }

  return (
    `${digits.slice(0, 4)} ` +
    `${digits.slice(4, 7)} ` +
    `${digits.slice(7)}`
  );
}


function validAustralianMobile(value) {
  return /^04\d{8}$/.test(
    String(value || "")
      .replace(/\D/g, "")
  );
}


function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    .test(
      String(value || "").trim()
    );
}


function titleCaseWords(value) {
  return String(value || "")
    .replace(
      /\b[a-z]/g,
      char => char.toUpperCase()
    );
}


function selectedReferenceDescription() {
  const value =
    $("referenceDirection").value;

  if (value === "other") {
    return (
      $("referenceOther").value.trim()
      ||
      "Nominated site reference"
    );
  }

  return (
    PRICES.referenceDirections[value]
    ||
    "Looking from street toward property"
  );
}


function abbreviatedDirection(value) {
  if (value === "vertical") {
    return "Vert";
  }

  if (value === "horizontal") {
    return "Hori";
  }

  return "";
}


function fullDirection(value) {
  if (value === "vertical") {
    return "vertical";
  }

  if (value === "horizontal") {
    return "horizontal";
  }

  return "";
}


/* ==========================================================
   PROJECT NUMBERING / SAVED JOBS
   ========================================================== */

function getSavedJobs() {
  try {
    return JSON.parse(
      localStorage.getItem("jtlaJobs")
      ||
      "{}"
    );
  }
  catch {
    return {};
  }
}


function saveJobsObject(jobs) {
  localStorage.setItem(
    "jtlaJobs",
    JSON.stringify(jobs)
  );
}


function getActiveProjectNumber() {
  let current =
    localStorage.getItem(
      "jtlaActiveProject"
    );

  if (current) {
    return current;
  }


  const jobs =
    getSavedJobs();


  const savedNumbers =
    Object.keys(jobs)
      .map(project =>
        Number(project.slice(-4))
      )
      .filter(Number.isFinite);


  const start =
    PRICES.projects
      .startingProjectNumber;


  const next =
    savedNumbers.length
      ? Math.max(...savedNumbers) + 1
      : start;


  current =
    formatProjectNumber(next);


  localStorage.setItem(
    "jtlaActiveProject",
    current
  );


  return current;
}


function getNextProjectNumber() {
  const jobs =
    getSavedJobs();


  const numbers =
    Object.keys(jobs)
      .map(project =>
        Number(project.slice(-4))
      )
      .filter(Number.isFinite);


  const active =
    Number(
      getActiveProjectNumber()
        .slice(-4)
    );


  const highest =
    Math.max(
      PRICES.projects
        .startingProjectNumber - 1,

      active,

      ...(numbers.length
        ? numbers
        : [0])
    );


  return formatProjectNumber(
    highest + 1
  );
}


/* ==========================================================
   QUOTE AUTO / MANUAL
   ========================================================== */

function resetQuoteToAuto() {
  manualQuoteActive = false;
  manualQuoteValue = 0;

  if (
    lastCalculation &&
    $("quotePrice")
  ) {
    $("quotePrice").value =
      lastCalculation.autoFinalPrice;
  }

  updateQuoteMetrics();
}


function markQuoteManual() {
  const entered =
    num(
      $("quotePrice").value
    );

  if (entered <= 0) {
    resetQuoteToAuto();
    return;
  }

  manualQuoteActive = true;
  manualQuoteValue = entered;

  updateQuoteMetrics();

  autoSaveJob();
}


/*
  Fields which DON'T change job cost.

  Editing these must NOT wipe out
  a deliberate manual quote.
*/

function isNonPricingField(target) {
  if (!target) {
    return false;
  }

  const id =
    target.id || "";


  const nonPricingIds = [
    "clientName",
    "siteAddress",
    "clientPhone",
    "clientEmail",
    "referenceDirection",
    "referenceOther",
    "projectNumber",
    "quotePrice"
  ];


  return nonPricingIds.includes(id);
}


function maybeResetManualQuote(target) {
  if (
    suppressQuoteReset ||
    restoringJob ||
    !manualQuoteActive
  ) {
    return;
  }


  if (
    isNonPricingField(target)
  ) {
    return;
  }


  resetQuoteToAuto();
}


/* ==========================================================
   UNDO
   ========================================================== */

function setUndoState(state) {
  undoState = state;

  $("undoBtn").disabled =
    !undoState;
}


function clearUndoState() {
  undoState = null;

  $("undoBtn").disabled = true;
}


function performUndo() {
  if (!undoState) {
    return;
  }

  const state =
    undoState;

  clearUndoState();


  /*
    Undoing a component change affects price,
    so manual quote returns to AUTO.
  */

  resetQuoteToAuto();


  if (state.type === "delete") {
    restoreDeletedComponent(
      state
    );
  }


  if (state.type === "move") {
    restoreComponentOrder(
      state.order
    );
  }
}


/* ==========================================================
   COMPONENT SNAPSHOT
   ========================================================== */

function snapshotComponent(component) {
  const card =
    document.querySelector(
      `[data-component-id="${component.id}"]`
    );

  if (!card) {
    return null;
  }


  if (component.type === "post") {
    return {
      type: "post",

      steelKey:
        card.querySelector(
          ".post-size"
        ).value,

      fixing:
        card.querySelector(
          ".post-fixing"
        ).value,

      customHeightEnabled:
        card.dataset.customHeight
        === "true",

      customHeight:
        card.querySelector(
          ".post-height-override"
        ).value,

      holes:
        [
          ...card.querySelectorAll(
            ".hole-position"
          )
        ].map(
          input =>
            input.value
        ),

      topBoltEnabled:
        card.querySelector(
          ".house-bolt-enabled"
        ).checked,

      topHole:
        card.querySelector(
          ".top-hole-position"
        ).value,

      offset:
        card.querySelector(
          ".post-offset"
        ).value
    };
  }


  if (component.type === "gate") {
    return {
      type: "gate",

      widthMode:
        card.dataset.widthMode
        ||
        "auto",

      manualWidth:
        card.querySelector(
          ".gate-manual-width"
        ).value,

      frame:
        card.querySelector(
          ".gate-frame"
        ).value,

      horizontalRails:
        card.querySelector(
          ".horizontal-rails"
        ).value,

      verticalRails:
        card.querySelector(
          ".vertical-rails"
        ).value,

      hinge:
        card.querySelector(
          ".hinge-side"
        ).value,

      opens:
        card.querySelector(
          ".open-direction"
        ).value,

      latch:
        card.querySelector(
          ".gate-latch"
        ).value,

      otherLatch:
        card.querySelector(
          ".other-latch-description"
        ).value,

      otherLatchCost:
        card.querySelector(
          ".other-latch-cost"
        ).value
    };
  }


  return {
    type: "panel",

    width:
      card.querySelector(
        ".panel-width"
      ).value,

    height:
      card.querySelector(
        ".panel-height"
      ).value,

    railCount:
      card.querySelector(
        ".panel-rail-count"
      ).value
  };
}


/* ==========================================================
   COMPONENT COLOUR
   ========================================================== */

function getComponentColour(index) {
  return COMPONENT_COLOURS[
    index %
    COMPONENT_COLOURS.length
  ];
}


function applyComponentColours() {
  const visible =
    activeComponents();


  visible.forEach(
    (component, visibleIndex) => {
      const colour =
        getComponentColour(
          visibleIndex
        );


      component.colourIndex =
        visibleIndex;


      const card =
        document.querySelector(
          `[data-component-id="${component.id}"]`
        );


      if (card) {
        card.style.setProperty(
          "--component-colour",
          colour.bg
        );

        card.style.setProperty(
          "--component-text",
          colour.text
        );
      }
    }
  );
}


/* ==========================================================
   RESTORE UNDO
   ========================================================== */

function restoreDeletedComponent(state) {
  restoringJob = true;


  const component = {
    id:
      state.id,

    type:
      state.component.type
  };


  components.splice(
    state.index,
    0,
    component
  );


  buildComponent(
    component,
    state.component
  );


  const container =
    $("componentsContainer");


  components.forEach(item => {
    const card =
      document.querySelector(
        `[data-component-id="${item.id}"]`
      );

    if (card) {
      container.appendChild(card);
    }
  });


  restoringJob = false;


  renumberComponents();

  refreshEverything();
}


function restoreComponentOrder(order) {
  const ordered = [];


  order.forEach(id => {
    const component =
      components.find(
        item =>
          item.id === id
      );

    if (component) {
      ordered.push(component);
    }
  });


  components = ordered;


  const container =
    $("componentsContainer");


  components.forEach(component => {
    const card =
      document.querySelector(
        `[data-component-id="${component.id}"]`
      );

    if (card) {
      container.appendChild(card);
    }
  });


  renumberComponents();

  refreshEverything();
}


/* ==========================================================
   COLOURS
   ========================================================== */

function populateColours() {
  [
    $("colorbondColour"),
    $("powderColour")
  ]
    .filter(Boolean)
    .forEach(select => {
      const previous =
        select.value;


      select.innerHTML = "";


      /*
        Empty powder colour is useful,
        because selecting YES should
        still require deliberate colour.
      */

      if (
        select.id ===
        "powderColour"
      ) {
        const blank =
          document.createElement(
            "option"
          );

        blank.value = "";
        blank.textContent =
          "Select colour";

        select.appendChild(blank);
      }


      [...PRICES.colours]
        .sort()
        .forEach(colour => {
          const option =
            document.createElement(
              "option"
            );

          option.value =
            colour;

          option.textContent =
            colour;

          select.appendChild(
            option
          );
        });


      if (
        previous &&
        [...select.options].some(
          option =>
            option.value ===
            previous
        )
      ) {
        select.value =
          previous;
      }
    });
}


/* ==========================================================
   COMPONENT LABELS
   ========================================================== */

function renumberComponents() {
  const gates =
    components.filter(
      component =>
        component.type === "gate"
    );


  const panels =
    components.filter(
      component =>
        component.type === "panel"
    );


  let postNumber = 0;
  let gateNumber = 0;
  let panelNumber = 0;


  components.forEach(component => {
    if (component.type === "post") {
      postNumber++;

      component.label =
        `Post ${postNumber}`;
    }


    else if (component.type === "gate") {
      gateNumber++;

      component.label =
        gates.length === 1
          ? "Gate"
          : `Gate ${gateNumber}`;
    }


    else {
      panelNumber++;

      component.label =
        panels.length === 1
          ? "Fixed Panel"
          : `Fixed Panel ${panelNumber}`;
    }


    const card =
      document.querySelector(
        `[data-component-id="${component.id}"]`
      );


    if (card) {
      card.querySelector(
        ".component-title"
      ).textContent =
        component.label;
    }
  });


  applyComponentColours();
}


/* ==========================================================
   ADD / BUILD COMPONENTS
   ========================================================== */

function addComponent(
  type,
  savedData = null
) {
  componentCounter++;


  let id =
    savedData?.id
    ||
    `component-${componentCounter}`;


  /*
    Keep counter above restored IDs.
  */

  const parsed =
    Number(
      String(id)
        .replace(
          "component-",
          ""
        )
    );


  if (
    Number.isFinite(parsed)
  ) {
    componentCounter =
      Math.max(
        componentCounter,
        parsed
      );
  }


  const component = {
    id,
    type
  };


  components.push(component);


  buildComponent(
    component,
    savedData
  );


  renumberComponents();


  if (!restoringJob) {
    resetQuoteToAuto();

    refreshEverything();
  }


  return component;
}


function buildComponent(
  component,
  savedData = null
) {
  $("noComponentsMessage")
    ?.remove();


  const shell =
    $("componentTemplate")
      .content
      .cloneNode(true);


  const card =
    shell.querySelector(
      ".component-card"
    );


  card.dataset.componentId =
    component.id;

  card.dataset.componentType =
    component.type;


  const body =
    shell.querySelector(
      ".component-body"
    );


  if (component.type === "post") {
    body.appendChild(
      $("postTemplate")
        .content
        .cloneNode(true)
    );
  }


  else if (component.type === "gate") {
    body.appendChild(
      $("gateTemplate")
        .content
        .cloneNode(true)
    );
  }


  else {
    body.appendChild(
      $("panelTemplate")
        .content
        .cloneNode(true)
    );
  }


  $("componentsContainer")
    .appendChild(shell);


  const inserted =
    document.querySelector(
      `[data-component-id="${component.id}"]`
    );


  setupComponent(
    inserted,
    component,
    savedData
  );
}


function setupComponent(
  card,
  component,
  savedData
) {
  card.querySelector(
    ".remove-btn"
  )
    .addEventListener(
      "click",
      () => {
        removeComponent(
          component.id
        );
      }
    );


  if (component.type === "post") {
    setupPost(
      card,
      savedData
    );
  }


  if (component.type === "gate") {
    setupGate(
      card,
      savedData
    );
  }


  if (component.type === "panel") {
    setupPanel(
      card,
      savedData
    );
  }
}


/* ==========================================================
   POST SETUP
   ========================================================== */

function setupPost(
  card,
  saved = null
) {
  const size =
    card.querySelector(
      ".post-size"
    );


  size.innerHTML = "";


  Object.entries(
    PRICES.steel.posts
  )
    .forEach(
      ([key, item]) => {
        const option =
          document.createElement(
            "option"
          );

        option.value =
          key;

        option.textContent =
          item.label;

        size.appendChild(
          option
        );
      }
    );


  size.value =
    saved?.steelKey
    ||
    PRICES.defaults.postType;


  card.dataset.customHeight =
    saved?.customHeightEnabled
      ? "true"
      : "false";


  if (saved) {
    card.querySelector(
      ".post-fixing"
    ).value =
      saved.fixing || "";


    card.querySelector(
      ".post-height-override"
    ).value =
      saved.customHeight || "";


    card.querySelector(
      ".house-bolt-enabled"
    ).checked =
      Boolean(
        saved.topBoltEnabled
      );


    card.querySelector(
      ".top-hole-position"
    ).value =
      saved.topHole || "";


    card.querySelector(
      ".post-offset"
    ).value =
      saved.offset || "";


    card.querySelector(
      ".hole-list"
    ).innerHTML = "";


    (
      saved.holes || []
    )
      .forEach(value => {
        addHole(
          card,
          value
        );
      });
  }


  card.querySelector(
    ".change-post-height-btn"
  )
    .addEventListener(
      "click",
      () => {
        resetQuoteToAuto();


        card.dataset.customHeight =
          "true";


        if (
          !card.querySelector(
            ".post-height-override"
          ).value
        ) {
          card.querySelector(
            ".post-height-override"
          ).value =
            $("overallHeight").value;
        }


        refreshEverything();
      }
    );


  card.querySelector(
    ".reset-post-height-btn"
  )
    .addEventListener(
      "click",
      () => {
        resetQuoteToAuto();


        card.dataset.customHeight =
          "false";


        card.querySelector(
          ".post-height-override"
        ).value =
          "";


        refreshEverything();
      }
    );


  card.querySelector(
    ".add-hole"
  )
    .addEventListener(
      "click",
      () => {
        resetQuoteToAuto();

        addHole(card);

        refreshEverything();
      }
    );


  card.querySelector(
    ".post-fixing"
  )
    .addEventListener(
      "change",
      () => {
        const fixing =
          card.querySelector(
            ".post-fixing"
          ).value;


        if (
          fixing === "brick" &&
          card.querySelector(
            ".hole-list"
          ).children.length === 0
        ) {
          addHole(card);
          addHole(card);
          addHole(card);
        }


        refreshEverything();
      }
    );


  updatePostUI(card);
}


/* ==========================================================
   HOLES
   ========================================================== */

function addHole(
  card,
  value = ""
) {
  const fragment =
    $("holeTemplate")
      .content
      .cloneNode(true);


  const row =
    fragment.querySelector(
      ".hole-row"
    );


  const input =
    row.querySelector(
      ".hole-position"
    );


  input.value =
    value;


  row.querySelector(
    ".remove-hole"
  )
    .addEventListener(
      "click",
      () => {
        resetQuoteToAuto();

        row.remove();

        refreshEverything();
      }
    );


  card.querySelector(
    ".hole-list"
  )
    .appendChild(fragment);
}


/* ==========================================================
   POST HEIGHT / CUT
   ========================================================== */

function getPostFinishedHeight(card) {
  const custom =
    card.dataset.customHeight
    === "true";


  if (custom) {
    return num(
      card.querySelector(
        ".post-height-override"
      ).value
    );
  }


  return num(
    $("overallHeight").value
  );
}


function getPostCutLength(
  card,
  fixing
) {
  const finishedHeight =
    getPostFinishedHeight(card);


  if (!finishedHeight) {
    return 0;
  }


  if (fixing === "baseplate") {
    return Math.max(
      0,

      finishedHeight -
      PRICES.fabrication
        .baseplateHeightAllowanceMm
    );
  }


  if (fixing === "brick") {
    return finishedHeight;
  }


  if (
    fixing &&
    fixing !== "existing"
  ) {
    return (
      finishedHeight +
      PRICES.fabrication
        .concreteEmbedmentMm
    );
  }


  return 0;
}


function updatePostUI(card) {
  const fixing =
    card.querySelector(
      ".post-fixing"
    ).value;


  const custom =
    card.dataset.customHeight
    === "true";


  const finishedHeight =
    getPostFinishedHeight(card);


  const cut =
    getPostCutLength(
      card,
      fixing
    );


  card.querySelector(
    ".post-height-override-wrap"
  )
    .classList.toggle(
      "hidden",
      !custom
    );


  card.querySelector(
    ".post-height-status"
  ).textContent =
    custom
      ? "CUSTOM"
      : "";


  card.querySelector(
    ".post-visible-height"
  ).textContent =
    finishedHeight
      ? `${finishedHeight} mm`
      : "-";


  card.querySelector(
    ".post-cut"
  ).textContent =
    cut
      ? `${cut} mm`
      : "-";


  card.querySelector(
    ".brick-holes"
  )
    .classList.toggle(
      "hidden",
      fixing !== "brick"
    );


  card.querySelector(
    ".house-bolt"
  )
    .classList.toggle(
      "hidden",
      fixing !== "concreteHouse"
    );


  card.querySelector(
    ".floating-offset"
  )
    .classList.toggle(
      "hidden",
      fixing !== "concreteFloating"
    );


  const topBolt =
    card.querySelector(
      ".house-bolt-enabled"
    ).checked;


  card.querySelector(
    ".house-bolt-position"
  )
    .classList.toggle(
      "hidden",
      !topBolt
    );
}


/* ==========================================================
   GATE SETUP
   ========================================================== */

function setupGate(
  card,
  saved = null
) {
  const frame =
    card.querySelector(
      ".gate-frame"
    );


  frame.innerHTML = "";


  Object.entries(
    PRICES.steel.frame
  )
    .forEach(
      ([key, item]) => {
        const option =
          document.createElement(
            "option"
          );

        option.value =
          key;

        option.textContent =
          item.label;

        frame.appendChild(
          option
        );
      }
    );


  frame.value =
    saved?.frame
    ||
    PRICES.defaults.frameType;


  const latch =
    card.querySelector(
      ".gate-latch"
    );


  latch.innerHTML = "";


  Object.entries(
    PRICES.hardware.latches
  )
    .forEach(
      ([key, item]) => {
        const option =
          document.createElement(
            "option"
          );

        option.value =
          key;

        option.textContent =
          item.label;

        latch.appendChild(
          option
        );
      }
    );


  latch.value =
    saved?.latch
    ||
    "ddDualKey";


  card.dataset.widthMode =
    saved?.widthMode
    ||
    "auto";


  card.querySelector(
    ".gate-manual-width"
  ).value =
    saved?.manualWidth || "";


  card.querySelector(
    ".horizontal-rails"
  ).value =
    saved?.horizontalRails
    ||
    "0";


  card.querySelector(
    ".vertical-rails"
  ).value =
    saved?.verticalRails
    ||
    "0";


  card.querySelector(
    ".hinge-side"
  ).value =
    saved?.hinge
    ||
    PRICES.defaults.hingeSide;


  card.querySelector(
    ".open-direction"
  ).value =
    saved?.opens
    ||
    PRICES.defaults.openDirection;


  card.querySelector(
    ".other-latch-description"
  ).value =
    saved?.otherLatch || "";


  card.querySelector(
    ".other-latch-cost"
  ).value =
    saved?.otherLatchCost || "";


  card.querySelector(
    ".gate-width-mode-btn"
  )
    .addEventListener(
      "click",
      () => {
        resetQuoteToAuto();


        card.dataset.widthMode =
          card.dataset.widthMode
          === "manual"
            ? "auto"
            : "manual";


        refreshEverything();
      }
    );


  updateGateUI(card);
}


function updateGateUI(card) {
  const manual =
    card.dataset.widthMode
    === "manual";


  card.querySelector(
    ".gate-width-mode-btn"
  ).textContent =
    manual
      ? "MANUAL WIDTH"
      : "AUTO WIDTH";


  card.querySelector(
    ".gate-width-mode-btn"
  ).classList.toggle(
    "manual",
    manual
  );


  card.querySelector(
    ".gate-manual-width-wrap"
  ).classList.toggle(
    "hidden",
    !manual
  );


  card.querySelector(
    ".other-latch"
  ).classList.toggle(
    "hidden",

    card.querySelector(
      ".gate-latch"
    ).value !== "other"
  );
}


/* ==========================================================
   FIXED PANEL
   ========================================================== */

function setupPanel(
  card,
  saved = null
) {
  card.querySelector(
    ".panel-width"
  ).value =
    saved?.width || "";


  card.querySelector(
    ".panel-height"
  ).value =
    saved?.height || "";


  card.querySelector(
    ".panel-rail-count"
  ).value =
    saved?.railCount
    ||
    "3";
}


/* ==========================================================
   READ COMPONENTS
   ========================================================== */

function readPosts() {
  return components
    .filter(
      component =>
        component.type === "post"
    )
    .map(component => {
      const card =
        document.querySelector(
          `[data-component-id="${component.id}"]`
        );


      const steelKey =
        card.querySelector(
          ".post-size"
        ).value;


      const steel =
        PRICES.steel.posts[
          steelKey
        ];


      const fixing =
        card.querySelector(
          ".post-fixing"
        ).value;


      const holes =
        [
          ...card.querySelectorAll(
            ".hole-position"
          )
        ]
          .map(
            input =>
              num(input.value)
          )
          .filter(
            value =>
              value > 0
          );


      const topHole =
        card.querySelector(
          ".house-bolt-enabled"
        ).checked

        ? num(
            card.querySelector(
              ".top-hole-position"
            ).value
          )

        : 0;


      return {
        id:
          component.id,

        label:
          component.label,

        steelKey,

        steelLabel:
          steel.label,

        widthMm:
          steel.widthMm,

        depthMm:
          steel.depthMm,

        fixing,

        finishedHeight:
          getPostFinishedHeight(card),

        cutLengthMm:
          getPostCutLength(
            card,
            fixing
          ),

        customHeight:
          card.dataset.customHeight
          === "true",

        holes,

        topHole,

        offset:
          num(
            card.querySelector(
              ".post-offset"
            ).value
          )
      };
    });
}


function readGates() {
  return components
    .filter(
      component =>
        component.type === "gate"
    )
    .map(component => {
      const card =
        document.querySelector(
          `[data-component-id="${component.id}"]`
        );


      return {
        id:
          component.id,

        label:
          component.label,

        width:
          num(
            card.dataset
              .calculatedWidth
          ),

        height:
          num(
            card.dataset
              .calculatedHeight
          ),

        widthMode:
          card.dataset.widthMode
          ||
          "auto",

        manualWidth:
          num(
            card.querySelector(
              ".gate-manual-width"
            ).value
          ),

        frame:
          card.querySelector(
            ".gate-frame"
          ).value,

        horizontalRails:
          num(
            card.querySelector(
              ".horizontal-rails"
            ).value
          ),

        verticalRails:
          num(
            card.querySelector(
              ".vertical-rails"
            ).value
          ),

        hinge:
          card.querySelector(
            ".hinge-side"
          ).value,

        opens:
          card.querySelector(
            ".open-direction"
          ).value,

        latch:
          card.querySelector(
            ".gate-latch"
          ).value,

        otherLatch:
          card.querySelector(
            ".other-latch-description"
          ).value.trim(),

        otherLatchCost:
          num(
            card.querySelector(
              ".other-latch-cost"
            ).value
          )
      };
    });
}


function readPanels() {
  return components
    .filter(
      component =>
        component.type === "panel"
    )
    .map(component => {
      const card =
        document.querySelector(
          `[data-component-id="${component.id}"]`
        );


      return {
        id:
          component.id,

        label:
          component.label,

        width:
          num(
            card.querySelector(
              ".panel-width"
            ).value
          ),

        height:
          num(
            card.querySelector(
              ".panel-height"
            ).value
          ),

        railCount:
          num(
            card.querySelector(
              ".panel-rail-count"
            ).value
          )
      };
    });
}


/* ==========================================================
   ACTIVE COMPONENTS
   ========================================================== */

function componentIsActive(component) {
  if (
    component.type === "post"
  ) {
    return includeState.posts;
  }


  if (
    component.type === "gate"
  ) {
    return includeState.gate;
  }


  return true;
}


function activeComponents() {
  return components.filter(
    componentIsActive
  );
}


/* ==========================================================
   GATE HEIGHT
   ========================================================== */

function getGateControlHeight(
  gateComponent
) {
  const overall =
    num(
      $("overallHeight").value
    );


  if (!includeState.posts) {
    return overall;
  }


  const index =
    components.findIndex(
      component =>
        component.id ===
        gateComponent.id
    );


  let leftHeight = null;
  let rightHeight = null;


  for (
    let i = index - 1;
    i >= 0;
    i--
  ) {
    if (
      components[i].type !==
      "post"
    ) {
      continue;
    }


    const card =
      document.querySelector(
        `[data-component-id="${components[i].id}"]`
      );


    leftHeight =
      getPostFinishedHeight(card);


    break;
  }


  for (
    let i = index + 1;
    i < components.length;
    i++
  ) {
    if (
      components[i].type !==
      "post"
    ) {
      continue;
    }


    const card =
      document.querySelector(
        `[data-component-id="${components[i].id}"]`
      );


    rightHeight =
      getPostFinishedHeight(card);


    break;
  }


  const valid =
    [
      leftHeight,
      rightHeight
    ]
      .filter(
        value =>
          num(value) > 0
      );


  if (!valid.length) {
    return overall;
  }


  return Math.min(
    ...valid
  );
}


/* ==========================================================
   GATE DIMENSIONS
   ========================================================== */

function calculateGateDimensions() {
  const cavity =
    num(
      $("cavityWidth").value
    );


  const gates =
    components.filter(
      component =>
        component.type === "gate"
        &&
        includeState.gate
    );


  if (!gates.length) {
    return;
  }


  const posts =
    readPosts();


  const panels =
    readPanels();


  const active =
    activeComponents();


  const gapTotal =
    Math.max(
      0,
      active.length - 1
    )
    *
    PRICES.fabrication
      .componentGapMm;


  const postWidthTotal =
    includeState.posts

      ? posts.reduce(
          (sum, post) => {
            if (
              post.fixing ===
              "existing"
            ) {
              return sum;
            }

            return (
              sum +
              post.widthMm
            );
          },
          0
        )

      : 0;


  const panelWidthTotal =
    panels.reduce(
      (sum, panel) =>
        sum + panel.width,
      0
    );


  let manualWidthTotal = 0;
  let autoGateCount = 0;


  gates.forEach(component => {
    const card =
      document.querySelector(
        `[data-component-id="${component.id}"]`
      );


    if (
      card.dataset.widthMode ===
      "manual"
    ) {
      manualWidthTotal +=
        num(
          card.querySelector(
            ".gate-manual-width"
          ).value
        );
    }

    else {
      autoGateCount++;
    }
  });


  const remaining =
    Math.max(
      0,

      cavity -
      postWidthTotal -
      panelWidthTotal -
      gapTotal -
      manualWidthTotal
    );


  const autoWidth =
    autoGateCount

      ? Math.floor(
          remaining /
          autoGateCount
        )

      : 0;


  gates.forEach(component => {
    const card =
      document.querySelector(
        `[data-component-id="${component.id}"]`
      );


    const width =
      card.dataset.widthMode ===
      "manual"

        ? num(
            card.querySelector(
              ".gate-manual-width"
            ).value
          )

        : autoWidth;


    const controlHeight =
      getGateControlHeight(
        component
      );


    const height =
      Math.max(
        0,

        controlHeight -
        PRICES.fabrication
          .gateGroundGapMm
      );


    card.dataset.calculatedWidth =
      width;


    card.dataset.calculatedHeight =
      height;


    card.querySelector(
      ".gate-width-display"
    ).textContent =
      width
        ? `${width} mm`
        : "-";


    card.querySelector(
      ".gate-height-display"
    ).textContent =
      height
        ? `${height} mm`
        : "-";


    card.querySelector(
      ".gate-height-basis"
    ).textContent =
      controlHeight
        ? `${height}mm based on ${controlHeight}mm finished height less 40mm ground clearance`
        : "";
  });
}


/* ==========================================================
   INCLUDE UI
   ========================================================== */

function updateIncludeUI() {
  const gateButton =
    $("includeGateBtn");


  gateButton.textContent =
    includeState.gate
      ? "GATE ON"
      : "GATE OFF";


  gateButton.classList.toggle(
    "on",
    includeState.gate
  );


  gateButton.classList.toggle(
    "off",
    !includeState.gate
  );


  const postButton =
    $("includePostsBtn");


  postButton.textContent =
    includeState.posts
      ? "POSTS ON"
      : "POSTS OFF";


  postButton.classList.toggle(
    "on",
    includeState.posts
  );


  postButton.classList.toggle(
    "off",
    !includeState.posts
  );


  const cladButton =
    $("includeCladdingBtn");


  cladButton.textContent =
    includeState.cladding
      ? "CLADDING ON"
      : "CLADDING OFF";


  cladButton.classList.toggle(
    "on",
    includeState.cladding
  );


  cladButton.classList.toggle(
    "off",
    !includeState.cladding
  );


  components
    .filter(
      component =>
        component.type === "post"
    )
    .forEach(component => {
      document.querySelector(
        `[data-component-id="${component.id}"]`
      )
        ?.classList.toggle(
          "hidden",
          !includeState.posts
        );
    });


  components
    .filter(
      component =>
        component.type === "gate"
    )
    .forEach(component => {
      document.querySelector(
        `[data-component-id="${component.id}"]`
      )
        ?.classList.toggle(
          "hidden",
          !includeState.gate
        );
    });


  $("claddingCard")
    .classList.toggle(
      "hidden",
      !includeState.cladding
    );


  $("gateMaterialsCard")
    .classList.toggle(
      "hidden",
      !includeState.gate
    );


  $("postMaterialsCard")
    .classList.toggle(
      "hidden",
      !includeState.posts
    );


  $("claddingMaterialsCard")
    .classList.toggle(
      "hidden",
      !includeState.cladding
    );
}


/* ==========================================================
   CLADDING UI
   ========================================================== */

function updateCladdingUI() {
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
      type !== "cypressPickets"
    );


  $("lospOptions")
    .classList.toggle(
      "hidden",
      ![
        "losp90",
        "losp140"
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


  $("treatedPineOptions")
    .classList.toggle(
      "hidden",
      type !==
      "treatedPinePalings"
    );


  $("colorbondOptions")
    .classList.toggle(
      "hidden",
      type !== "colorbond"
    );


  $("customOptions")
    .classList.toggle(
      "hidden",
      type !== "custom"
    );


  $("cypressColourWrap")
    .classList.toggle(
      "hidden",
      $("cypressFinish").value
      !== "Paint"
    );


  $("lospColourWrap")
    .classList.toggle(
      "hidden",
      $("lospFinish").value
      !== "Paint"
    );


  updateTreatedPineUI();

  updateRailUI();

  updateCladdingSummary();
}


/* ==========================================================
   CLADDING SUMMARY / COLLAPSE
   ========================================================== */

function claddingIsComplete() {
  if (!includeState.cladding) {
    return true;
  }


  const type =
    $("claddingType").value;


  const direction =
    $("claddingDirection").value;


  if (
    !type ||
    !direction
  ) {
    return false;
  }


  if (
    type === "cypressPickets" &&
    $("cypressFinish").value ===
    "Paint" &&
    !$("cypressColour").value.trim()
  ) {
    return false;
  }


  if (
    [
      "losp90",
      "losp140"
    ].includes(type) &&
    $("lospFinish").value ===
    "Paint" &&
    !$("lospColour").value.trim()
  ) {
    return false;
  }


  if (
    type === "custom" &&
    !$("customDescription").value.trim()
  ) {
    return false;
  }


  return true;
}


function getCladdingShortSummary() {
  if (!includeState.cladding) {
    return "Off";
  }


  const type =
    $("claddingType").value;


  const dir =
    abbreviatedDirection(
      $("claddingDirection").value
    );


  if (!claddingIsComplete()) {
    return "Not complete";
  }


  if (type === "ekodeck") {
    return (
      `Eko, ` +
      `${$("ekodeckColour").value}, ` +
      `${dir}`
    );
  }


  if (
    type === "treatedPinePalings"
  ) {
    return (
      `Pine, ` +
      `${$("treatedPineWidth").value}mm, ` +
      `${dir}`
    );
  }


  if (
    type === "cypressPickets"
  ) {
    return (
      `Cypress, ` +
      `${$("cypressFinish").value}, ` +
      `${dir}`
    );
  }


  if (
    [
      "losp90",
      "losp140"
    ].includes(type)
  ) {
    const label =
      type === "losp90"
        ? "LOSP 92"
        : "LOSP 138";


    return (
      `${label}, ` +
      `${$("lospFinish").value}, ` +
      `${dir}`
    );
  }


  if (
    type === "merbau90"
  ) {
    return (
      `Merbau 90, ` +
      `${$("merbauFinish").value}, ` +
      `${dir}`
    );
  }


  if (
    type === "merbau140"
  ) {
    return (
      `Merbau 140, ` +
      `${$("merbauFinish").value}, ` +
      `${dir}`
    );
  }


  if (
    type === "colorbond"
  ) {
    return (
      `Colorbond, ` +
      `${$("colorbondColour").value}, ` +
      `${dir}`
    );
  }


  if (type === "custom") {
    return (
      `${$("customDescription").value}, ` +
      `${dir}`
    );
  }


  return claddingDescription();
}


function updateCladdingSummary() {
  $("claddingSummary")
    .textContent =
      getCladdingShortSummary();
}


/*
  Collapse when a cladding change
  results in a complete selection.

  We don't collapse on every keystroke,
  only on CHANGE events.
*/

function maybeCollapseCladding() {
  if (
    includeState.cladding &&
    claddingIsComplete()
  ) {
    $("claddingCard").open =
      false;
  }
}


/* ==========================================================
   TREATED PINE UI
   ========================================================== */

function updateTreatedPineUI() {
  $("pineCappingToggle")
    .textContent =
      treatedPineState.capping
        ? "CAPPING ON"
        : "CAPPING OFF";


  $("pineCappingToggle")
    .classList.toggle(
      "on",
      treatedPineState.capping
    );


  $("pineCappingToggle")
    .classList.toggle(
      "off",
      !treatedPineState.capping
    );


  $("pinePlinthToggle")
    .textContent =
      treatedPineState.plinth
        ? "PLINTH ON"
        : "PLINTH OFF";


  $("pinePlinthToggle")
    .classList.toggle(
      "on",
      treatedPineState.plinth
    );


  $("pinePlinthToggle")
    .classList.toggle(
      "off",
      !treatedPineState.plinth
    );
}


/* ==========================================================
   RAIL UI
   ========================================================== */

function updateRailUI() {
  const direction =
    $("claddingDirection").value;


  components
    .filter(
      component =>
        component.type === "gate"
    )
    .forEach(component => {
      const card =
        document.querySelector(
          `[data-component-id="${component.id}"]`
        );


      card.querySelector(
        ".horizontal-rail-wrap"
      )
        .classList.toggle(
          "hidden",

          !includeState.cladding ||
          direction !== "vertical"
        );


      card.querySelector(
        ".vertical-rail-wrap"
      )
        .classList.toggle(
          "hidden",

          !includeState.cladding ||
          direction !== "horizontal"
        );
    });


  components
    .filter(
      component =>
        component.type === "panel"
    )
    .forEach(component => {
      const card =
        document.querySelector(
          `[data-component-id="${component.id}"]`
        );


      card.querySelector(
        ".panel-rail-controls"
      )
        .classList.toggle(
          "hidden",
          direction !== "vertical"
        );


      card.querySelector(
        ".panel-cladding-summary"
      ).textContent =
        includeState.cladding
          ? claddingDescription()
          : "No cladding";


      const info =
        card.querySelector(
          ".panel-rail-info"
        );


      if (
        direction === "horizontal"
      ) {
        info.innerHTML =
          `
          <div class="calculated-line">
            <span>Steel rails</span>
            <strong>None</strong>
          </div>
          `;
      }


      else if (
        direction === "vertical"
      ) {
        const count =
          num(
            card.querySelector(
              ".panel-rail-count"
            ).value
          );


        info.innerHTML =
          `
          <div class="calculated-line">
            <span>Rails</span>
            <strong>
              ${
                count === 4
                  ? "Top + Mid + Lower + Extra"
                  : "Top + Mid + Lower"
              }
            </strong>
          </div>
          `;
      }


      else {
        info.innerHTML =
          "";
      }
    });
}


/* ==========================================================
   POWDER COATING UI
   ========================================================== */

function updatePowderUI() {
  const decision =
    $("powderDecision").value;


  $("powderYesBtn")
    .classList.toggle(
      "selected",
      decision === "yes"
    );


  $("powderNoBtn")
    .classList.toggle(
      "selected",
      decision === "no"
    );


  $("powderYesOptions")
    .classList.toggle(
      "hidden",
      decision !== "yes"
    );


  $("powderNoOptions")
    .classList.toggle(
      "hidden",
      decision !== "no"
    );


  updatePowderSummary();
}


function powderSelectionComplete() {
  const decision =
    $("powderDecision").value;


  if (decision === "no") {
    return true;
  }


  if (
    decision === "yes" &&
    $("powderColour").value
  ) {
    return true;
  }


  return false;
}


function updatePowderSummary() {
  const decision =
    $("powderDecision").value;


  if (!decision) {
    $("powderSummary")
      .textContent =
        "Not selected";

    return;
  }


  if (decision === "no") {
    $("powderSummary")
      .textContent =
        "No, Duragalv finish";

    return;
  }


  if (
    decision === "yes" &&
    !$("powderColour").value
  ) {
    $("powderSummary")
      .textContent =
        "Yes, select colour";

    return;
  }


  const incGST =
    lastCalculation
      ? lastCalculation
          .powder
          .customerOptionIncGST
      : 0;


  $("powderSummary")
    .textContent =
      `PC, ${$("powderColour").value}, ${money(incGST)}`;
}


function maybeCollapsePowder() {
  if (
    powderSelectionComplete()
  ) {
    $("powderCard").open =
      false;
  }
}


/* ==========================================================
   STOCK OPTIMISER
   ========================================================== */

function stockPieces(
  pieces,
  stockLength
) {
  const valid =
    pieces
      .filter(
        piece =>
          piece > 0
      )
      .sort(
        (a, b) =>
          b - a
      );


  const bins = [];


  valid.forEach(piece => {
    let placed = false;


    for (
      let i = 0;
      i < bins.length;
      i++
    ) {
      if (
        bins[i] + piece <=
        stockLength + 0.00001
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


  const used =
    valid.reduce(
      (sum, piece) =>
        sum + piece,
      0
    );


  const purchased =
    bins.length *
    stockLength;


  return {
    lengths:
      bins.length,

    used,

    waste:
      Math.max(
        0,
        purchased - used
      )
  };
}


/* ==========================================================
   CLADDING DESCRIPTION
   CLIENT-FACING FULL WORDS
   ========================================================== */

function claddingDescription() {
  if (!includeState.cladding) {
    return "";
  }


  const type =
    $("claddingType").value;


  const data =
    PRICES.cladding[type];


  if (!data) {
    return "";
  }


  let text =
    data.label;


  if (type === "ekodeck") {
    text +=
      `, ${$("ekodeckColour").value}`;
  }


  if (
    type === "cypressPickets"
  ) {
    text +=
      `, ${$("cypressFinish").value}`;


    if (
      $("cypressFinish").value ===
      "Paint"
    ) {
      text +=
        ` ${$("cypressColour").value}`;
    }
  }


  if (
    [
      "losp90",
      "losp140"
    ].includes(type)
  ) {
    text +=
      `, ${$("lospFinish").value}`;


    if (
      $("lospFinish").value ===
      "Paint"
    ) {
      text +=
        ` ${$("lospColour").value}`;
    }
  }


  if (
    [
      "merbau90",
      "merbau140"
    ].includes(type)
  ) {
    text +=
      `, ${$("merbauFinish").value}`;
  }


  if (
    type ===
    "treatedPinePalings"
  ) {
    text +=
      `, ${$("treatedPineLength").value}mm × ${$("treatedPineWidth").value}mm`;
  }


  if (
    type === "colorbond"
  ) {
    text +=
      `, ${$("colorbondProfile").value}`;

    text +=
      `, ${$("colorbondColour").value}`;
  }


  if (type === "custom") {
    text =
      $("customDescription").value
      ||
      "Custom cladding";
  }


  const direction =
    fullDirection(
      $("claddingDirection").value
    );


  if (direction) {
    text +=
      `, ${direction}`;
  }


  return text;
}


/* ==========================================================
   TREATED PINE
   ========================================================== */

function calculateTreatedPine(
  gates,
  panels
) {
  const widthSelected =
    num(
      $("treatedPineWidth").value
    );


  const lengthSelected =
    num(
      $("treatedPineLength").value
    );


  const data =
    PRICES.cladding
      .treatedPinePalings;


  const areas = [];


  if (includeState.gate) {
    gates.forEach(gate => {
      areas.push({
        width:
          gate.width,

        height:
          gate.height
      });
    });
  }


  panels.forEach(panel => {
    areas.push({
      width:
        panel.width,

      height:
        panel.height
    });
  });


  let palingCount = 0;
  let totalAreaM2 = 0;
  let totalWidthM = 0;


  areas.forEach(area => {
    if (
      !area.width ||
      !area.height
    ) {
      return;
    }


    const widthM =
      area.width /
      1000;


    const baseCount =
      area.width /
      100;


    const extraPerMetre =
      data.extraPerMetre[
        widthSelected
      ]
      ||
      0;


    const count =
      Math.ceil(
        baseCount +
        extraPerMetre *
        widthM
      );


    palingCount +=
      count;


    totalAreaM2 +=
      area.width /
      1000 *
      area.height /
      1000;


    totalWidthM +=
      widthM;
  });


  const palingCostIncGST =
    palingCount *
    data.priceEach;


  const labourCostExGST =
    totalAreaM2 *
    data.labourRatePerM2;


  let cappingMetres = 0;
  let plinthMetres = 0;


  if (treatedPineState.capping) {
    cappingMetres =
      $("pineCappingMetres").value

        ? num(
            $("pineCappingMetres").value
          )

        : totalWidthM;
  }


  if (treatedPineState.plinth) {
    plinthMetres =
      $("pinePlinthMetres").value

        ? num(
            $("pinePlinthMetres").value
          )

        : totalWidthM;
  }


  const cappingCostIncGST =
    cappingMetres *
    data.capping
      .pricePerM;


  const plinthCostIncGST =
    plinthMetres *
    data.plinth
      .pricePerM;


  return {
    palingCount,

    palingWidthMm:
      widthSelected,

    palingLengthMm:
      lengthSelected,

    totalAreaM2,

    totalWidthM,

    cappingMetres,

    plinthMetres,

    materialCostExGST:
      toExGST(
        palingCostIncGST,
        true
      )
      +
      toExGST(
        cappingCostIncGST,
        true
      )
      +
      toExGST(
        plinthCostIncGST,
        true
      ),

    labourCostExGST
  };
}


/* ==========================================================
   GENERAL CLADDING
   ========================================================== */

function calculateCladding(
  gates,
  panels
) {
  if (!includeState.cladding) {
    return {
      boards: 0,
      metres: 0,
      stockLengths: 0,
      waste: 0,
      materialCostExGST: 0,
      specialLabourExGST: 0,
      treatedPine: null
    };
  }


  const type =
    $("claddingType").value;


  const direction =
    $("claddingDirection").value;


  const data =
    PRICES.cladding[type];


  if (
    !data ||
    !direction
  ) {
    return {
      boards: 0,
      metres: 0,
      stockLengths: 0,
      waste: 0,
      materialCostExGST: 0,
      specialLabourExGST: 0,
      treatedPine: null
    };
  }


  if (
    type ===
    "treatedPinePalings"
  ) {
    const pine =
      calculateTreatedPine(
        gates,
        panels
      );


    return {
      boards:
        pine.palingCount,

      metres:
        pine.totalWidthM,

      stockLengths:
        pine.palingCount,

      waste: 0,

      materialCostExGST:
        pine.materialCostExGST,

      specialLabourExGST:
        pine.labourCostExGST,

      treatedPine:
        pine
    };
  }


  if (type === "custom") {
    return {
      boards: 0,
      metres: 0,
      stockLengths: 0,
      waste: 0,

      materialCostExGST:
        toExGST(
          num(
            $("customCost").value
          ),
          true
        ),

      specialLabourExGST: 0,

      treatedPine: null
    };
  }


  const areas = [];


  if (includeState.gate) {
    gates.forEach(gate => {
      areas.push({
        width:
          gate.width,

        height:
          gate.height
      });
    });
  }


  panels.forEach(panel => {
    areas.push({
      width:
        panel.width,

      height:
        panel.height
    });
  });


  if (type === "colorbond") {
    const areaM2 =
      areas.reduce(
        (sum, area) => {
          return (
            sum +
            area.width /
            1000 *
            area.height /
            1000
          );
        },
        0
      );


    return {
      boards: 0,
      metres: 0,
      stockLengths: 0,
      waste: 0,

      materialCostExGST:
        toExGST(
          areaM2 *
          num(
            data.pricePerM2
          ),

          data.priceIncludesGST
        ),

      specialLabourExGST: 0,

      treatedPine: null
    };
  }


  const module =
    data.boardWidthMm +
    PRICES.fabrication
      .claddingGapMm;


  const pieces = [];


  areas.forEach(area => {
    if (
      !area.width ||
      !area.height
    ) {
      return;
    }


    const count =
      Math.ceil(
        (
          direction === "vertical"
            ? area.width
            : area.height
        )
        /
        module
      );


    const pieceLength =
      (
        direction === "vertical"
          ? area.height
          : area.width
      )
      /
      1000;


    for (
      let i = 0;
      i < count;
      i++
    ) {
      pieces.push(
        pieceLength
      );
    }
  });


  const metres =
    pieces.reduce(
      (sum, piece) =>
        sum + piece,
      0
    );


  if (
    data.stockLengthM &&
    data.pricePerStockLength
  ) {
    const stock =
      stockPieces(
        pieces,
        data.stockLengthM
      );


    return {
      boards:
        pieces.length,

      metres,

      stockLengths:
        stock.lengths,

      waste:
        stock.waste,

      materialCostExGST:
        toExGST(
          stock.lengths *
          data.pricePerStockLength,

          data.priceIncludesGST
        ),

      specialLabourExGST: 0,

      treatedPine: null
    };
  }


  return {
    boards:
      pieces.length,

    metres,

    stockLengths: 0,

    waste: 0,

    materialCostExGST:
      toExGST(
        metres *
        num(
          data.pricePerLinealM
        ),

        data.priceIncludesGST
      ),

    specialLabourExGST: 0,

    treatedPine: null
  };
}


/* ==========================================================
   POWDER COATING
   ========================================================== */

function calculatePowderCoating(
  posts,
  gates,
  panels
) {
  const decision =
    $("powderDecision").value;


  if (decision !== "yes") {
    return {
      rawCostExGST: 0,
      customerOptionExGST: 0,
      customerOptionIncGST: 0
    };
  }


  let rawCostExGST = 0;


  if (includeState.posts) {
    posts.forEach(post => {
      if (
        !post.cutLengthMm ||
        post.fixing === "existing"
      ) {
        return;
      }


      const rate =
        PRICES.powderCoating
          .postRatePerLm[
            post.steelKey
          ]
        ||
        0;


      rawCostExGST +=
        post.cutLengthMm /
        1000 *
        rate;
    });
  }


  if (includeState.gate) {
    gates.forEach(gate => {
      if (
        !gate.width ||
        !gate.height
      ) {
        return;
      }


      const area =
        gate.width /
        1000 *
        gate.height /
        1000;


      rawCostExGST +=
        area *
        PRICES.powderCoating
          .openFrameRatePerM2;
    });
  }


  /*
    Vertical fixed panel has open frame.

    Horizontal fixed panel has no
    separate internal frame.
  */

  if (
    includeState.cladding &&
    $("claddingDirection").value ===
    "vertical"
  ) {
    panels.forEach(panel => {
      if (
        !panel.width ||
        !panel.height
      ) {
        return;
      }


      const area =
        panel.width /
        1000 *
        panel.height /
        1000;


      rawCostExGST +=
        area *
        PRICES.powderCoating
          .openFrameRatePerM2;
    });
  }


  /*
    JTLA powder coat travel.
  */

  rawCostExGST +=
    PRICES.powderCoating
      .jobTravelAllowanceExGST;


  /*
    This is the amount you can tell
    the customer as the PC option.

    Normal 20% materials markup
    then GST.
  */

  const customerOptionExGST =
    rawCostExGST *
    (
      1 +
      PRICES.business
        .materialMarkup
    );


  const customerOptionIncGST =
    customerOptionExGST *
    (
      1 +
      PRICES.business.gst
    );


  return {
    rawCostExGST,
    customerOptionExGST,
    customerOptionIncGST
  };
}


/* ==========================================================
   NON-PC FINISH
   ========================================================== */

function calculateNonPowderFinish(
  frameUsageByType,
  posts
) {
  if (
    $("powderDecision").value
    !== "no"
  ) {
    return 0;
  }


  let surfaceAreaM2 = 0;


  Object.entries(
    frameUsageByType
  )
    .forEach(
      ([key, metres]) => {
        const steel =
          PRICES.steel.frame[key];


        const perimeterM =
          2 *
          (
            steel.widthMm +
            steel.depthMm
          )
          /
          1000;


        surfaceAreaM2 +=
          perimeterM *
          metres;
      }
    );


  if (includeState.posts) {
    posts.forEach(post => {
      if (
        !post.cutLengthMm ||
        post.fixing === "existing"
      ) {
        return;
      }


      const perimeterM =
        2 *
        (
          post.widthMm +
          post.depthMm
        )
        /
        1000;


      surfaceAreaM2 +=
        perimeterM *
        (
          post.cutLengthMm /
          1000
        );
    });
  }


  return (
    surfaceAreaM2 *
    PRICES.finishing
      .duragalvTouchUp
      .ratePerM2
  );
}


/* ==========================================================
   LABOUR
   ========================================================== */

function calculateLabour(
  posts,
  gates,
  panels,
  cladding
) {
  let autoFabrication = 0;
  let autoInstallation = 0;


  if (includeState.gate) {
    autoFabrication +=
      gates.length *
      PRICES.labour
        .gateFabricationHoursEach;


    autoInstallation +=
      gates.length *
      PRICES.labour
        .hangGateHoursEach;
  }


  if (includeState.posts) {
    posts.forEach(post => {
      if (
        post.fixing &&
        post.fixing !== "existing"
      ) {
        autoFabrication +=
          PRICES.labour
            .postFabricationHoursEach;
      }


      if (
        post.fixing === "brick"
      ) {
        autoFabrication +=
          post.holes.length *
          PRICES.labour
            .drilledHoleHoursEach;
      }


      if (post.topHole) {
        autoFabrication +=
          PRICES.labour
            .drilledHoleHoursEach;
      }


      if (
        [
          "concreteHouse",
          "concreteFloating",
          "fixedPanelLeft",
          "fixedPanelCentre",
          "fixedPanelRight"
        ].includes(
          post.fixing
        )
      ) {
        autoInstallation +=
          PRICES.labour
            .concretePostInstallHoursEach;
      }


      if (
        post.fixing === "baseplate"
      ) {
        autoInstallation +=
          PRICES.labour
            .baseplatePostInstallHoursEach;
      }
    });
  }


  /*
    Standard fixed panel:
    2 hours total.

    Treated pine uses its own
    $50/m² labour system.
  */

  if (
    $("claddingType").value !==
    "treatedPinePalings"
  ) {
    autoFabrication +=
      panels.length *
      PRICES.labour
        .fixedPanelHoursEach;
  }


  const extraEnabled =
    $("additionalLabourEnabled")
      .checked;


  const additionalFabrication =
    extraEnabled

      ? num(
          $("additionalFabricationHours")
            .value
        )

      : 0;


  const additionalInstallation =
    extraEnabled

      ? num(
          $("additionalInstallationHours")
            .value
        )

      : 0;


  const fabricationTotal =
    autoFabrication +
    additionalFabrication;


  const installationTotal =
    autoInstallation +
    additionalInstallation;


  const hourlyLabourExGST =
    (
      fabricationTotal +
      installationTotal
    )
    *
    PRICES.business
      .labourRate;


  return {
    autoFabrication,
    autoInstallation,

    additionalFabrication,
    additionalInstallation,

    fabricationTotal,
    installationTotal,

    totalHours:
      fabricationTotal +
      installationTotal,

    hourlyLabourExGST,

    specialCladdingLabourExGST:
      cladding.specialLabourExGST,

    totalLabourExGST:
      hourlyLabourExGST +
      cladding.specialLabourExGST
  };
}


/* ==========================================================
   LABOUR DISPLAY
   ========================================================== */

function updateLabourDisplay(labour) {
  $("estimatedFabricationHours")
    .textContent =
      `${labour.autoFabrication.toFixed(2)} hrs`;


  $("estimatedInstallationHours")
    .textContent =
      `${labour.autoInstallation.toFixed(2)} hrs`;


  $("additionalLabourFields")
    .classList.toggle(
      "hidden",

      !$("additionalLabourEnabled")
        .checked
    );


  let pineLine = "";


  if (
    labour.specialCladdingLabourExGST >
    0
  ) {
    pineLine =
      `
      <div>
        <span>Treated pine labour</span>
        <strong>
          ${money(labour.specialCladdingLabourExGST)}
        </strong>
      </div>
      `;
  }


  $("labourTotalsPanel")
    .innerHTML =
      `
      <div>
        <span>Auto fabrication</span>
        <strong>
          ${labour.autoFabrication.toFixed(2)} hrs
        </strong>
      </div>

      <div>
        <span>Additional fabrication</span>
        <strong>
          +${labour.additionalFabrication.toFixed(2)} hrs
        </strong>
      </div>

      <div class="labour-subtotal">
        <span>Fabrication total</span>
        <strong>
          ${labour.fabricationTotal.toFixed(2)} hrs
        </strong>
      </div>

      <div>
        <span>Auto installation</span>
        <strong>
          ${labour.autoInstallation.toFixed(2)} hrs
        </strong>
      </div>

      <div>
        <span>Additional installation</span>
        <strong>
          +${labour.additionalInstallation.toFixed(2)} hrs
        </strong>
      </div>

      <div class="labour-subtotal">
        <span>Installation total</span>
        <strong>
          ${labour.installationTotal.toFixed(2)} hrs
        </strong>
      </div>

      ${pineLine}

      <div class="labour-grand-total">
        <span>TOTAL HOURS</span>
        <strong>
          ${labour.totalHours.toFixed(2)} hrs
        </strong>
      </div>
      `;
}


/* ==========================================================
   FRAME STEEL
   ========================================================== */

function calculateFrameSteel(
  gates,
  panels
) {
  const groups = {};


  function addPiece(
    key,
    metres
  ) {
    if (
      !metres ||
      metres <= 0
    ) {
      return;
    }


    if (!groups[key]) {
      groups[key] = [];
    }


    groups[key].push(
      metres
    );
  }


  if (includeState.gate) {
    gates.forEach(gate => {
      if (
        !gate.width ||
        !gate.height
      ) {
        return;
      }


      const key =
        gate.frame;


      const steel =
        PRICES.steel.frame[key];


      addPiece(
        key,
        gate.width / 1000
      );

      addPiece(
        key,
        gate.width / 1000
      );

      addPiece(
        key,
        gate.height / 1000
      );

      addPiece(
        key,
        gate.height / 1000
      );


      if (
        includeState.cladding &&
        $("claddingDirection").value ===
        "vertical"
      ) {
        const railLength =
          Math.max(
            0,

            gate.width -
            steel.widthMm * 2
          )
          /
          1000;


        for (
          let i = 0;
          i <
          gate.horizontalRails;
          i++
        ) {
          addPiece(
            key,
            railLength
          );
        }
      }


      if (
        includeState.cladding &&
        $("claddingDirection").value ===
        "horizontal"
      ) {
        const railLength =
          Math.max(
            0,

            gate.height -
            steel.widthMm * 2
          )
          /
          1000;


        for (
          let i = 0;
          i <
          gate.verticalRails;
          i++
        ) {
          addPiece(
            key,
            railLength
          );
        }
      }
    });
  }


  /*
    Vertical fixed panels:
    top + mid + lower.
    Optional extra rail.
  */

  if (
    includeState.cladding &&
    $("claddingDirection").value ===
    "vertical"
  ) {
    panels.forEach(panel => {
      if (
        !panel.width ||
        !panel.height
      ) {
        return;
      }


      const key =
        PRICES.defaults
          .frameType;


      for (
        let i = 0;
        i < panel.railCount;
        i++
      ) {
        addPiece(
          key,
          panel.width / 1000
        );
      }
    });
  }


  let required = 0;
  let stockLengths = 0;
  let waste = 0;
  let costExGST = 0;


  const usageByType = {};


  Object.entries(groups)
    .forEach(
      ([key, pieces]) => {
        const steel =
          PRICES.steel.frame[key];


        const stock =
          stockPieces(
            pieces,
            steel.stockLengthM
          );


        required +=
          stock.used;


        stockLengths +=
          stock.lengths;


        waste +=
          stock.waste;


        usageByType[key] =
          stock.used;


        costExGST +=
          stock.lengths *
          toExGST(
            steel.pricePerStockLength,
            steel.priceIncludesGST
          );
      }
    );


  return {
    groups,
    usageByType,
    required,
    stockLengths,
    waste,
    costExGST
  };
}


/* ==========================================================
   POST STEEL
   ========================================================== */

function calculatePostSteel(posts) {
  const groups = {};


  if (includeState.posts) {
    posts.forEach(post => {
      if (
        !post.cutLengthMm ||
        post.fixing === "existing"
      ) {
        return;
      }


      if (!groups[
        post.steelKey
      ]) {
        groups[
          post.steelKey
        ] = [];
      }


      groups[
        post.steelKey
      ].push(
        post.cutLengthMm /
        1000
      );
    });
  }


  let required = 0;
  let stockLengths = 0;
  let waste = 0;
  let costExGST = 0;


  const order = {};


  Object.entries(groups)
    .forEach(
      ([key, pieces]) => {
        const steel =
          PRICES.steel.posts[key];


        const stock =
          stockPieces(
            pieces,
            steel.stockLengthM
          );


        required +=
          stock.used;


        stockLengths +=
          stock.lengths;


        waste +=
          stock.waste;


        order[key] =
          stock.lengths;


        costExGST +=
          stock.lengths *
          toExGST(
            steel.pricePerStockLength,
            steel.priceIncludesGST
          );
      }
    );


  return {
    groups,
    order,
    required,
    stockLengths,
    waste,
    costExGST
  };
}


/* ==========================================================
   FIXINGS / HARDWARE
   ========================================================== */

function calculateFixings(
  posts,
  gates,
  panels
) {
  let dynaboltCount = 0;
  let concreteBags = 0;
  let baseplateCount = 0;


  if (includeState.posts) {
    posts.forEach(post => {
      if (
        post.fixing === "brick"
      ) {
        dynaboltCount +=
          post.holes.length;
      }


      if (post.topHole) {
        dynaboltCount++;
      }


      if (
        [
          "concreteHouse",
          "concreteFloating",
          "fixedPanelLeft",
          "fixedPanelCentre",
          "fixedPanelRight"
        ].includes(
          post.fixing
        )
      ) {
        concreteBags +=
          PRICES.concrete
            .defaultBagsPerPost;
      }


      if (
        post.fixing ===
        "baseplate"
      ) {
        baseplateCount++;
      }
    });
  }


  const dynaboltCostExGST =
    toExGST(
      dynaboltCount *
      PRICES.fixings
        .dynabolt
        .priceEach,

      true
    );


  const concreteCostExGST =
    toExGST(
      concreteBags *
      PRICES.concrete
        .pricePerBag,

      true
    );


  const baseplateCostExGST =
    toExGST(
      baseplateCount *
      PRICES.fixings
        .baseplate
        .allowanceEach,

      true
    );


  let gateHardwareExGST = 0;


  if (includeState.gate) {
    gates.forEach(gate => {
      gateHardwareExGST +=
        toExGST(
          PRICES.hardware
            .hinges
            .lockout
            .pricePerSet,

          true
        );


      if (includeState.cladding) {
        gateHardwareExGST +=
          toExGST(
            PRICES.fixings
              .screws
              .defaultPerItem,

            true
          );
      }


      if (
        gate.latch === "other"
      ) {
        gateHardwareExGST +=
          toExGST(
            gate.otherLatchCost,
            true
          );
      }


      else {
        const latch =
          PRICES.hardware
            .latches[
              gate.latch
            ];


        if (latch) {
          gateHardwareExGST +=
            latch.priceIncludesGST

              ? toExGST(
                  latch.price,
                  true
                )

              : num(
                  latch.priceExGST
                );
        }
      }
    });
  }


  let panelScrewCostExGST = 0;


  if (
    includeState.cladding &&
    panels.length
  ) {
    panelScrewCostExGST =
      toExGST(
        panels.length *
        PRICES.fixings
          .screws
          .defaultPerItem,

        true
      );
  }


  return {
    dynaboltCount,
    concreteBags,
    baseplateCount,

    dynaboltCostExGST,
    concreteCostExGST,
    baseplateCostExGST,

    gateHardwareExGST,
    panelScrewCostExGST
  };
}


/* ==========================================================
   MAIN QUOTE CALCULATION
   ========================================================== */

function calculateQuote() {
  calculateGateDimensions();


  const posts =
    readPosts();


  const gates =
    readGates();


  const panels =
    readPanels();


  const frame =
    calculateFrameSteel(
      gates,
      panels
    );


  const postSteel =
    calculatePostSteel(
      posts
    );


  const fixings =
    calculateFixings(
      posts,
      gates,
      panels
    );


  const cladding =
    calculateCladding(
      gates,
      panels
    );


  const powder =
    calculatePowderCoating(
      posts,
      gates,
      panels
    );


  const nonPowderFinishIncGST =
    calculateNonPowderFinish(
      frame.usageByType,
      posts
    );


  const nonPowderFinishExGST =
    toExGST(
      nonPowderFinishIncGST,
      true
    );


  const labour =
    calculateLabour(
      posts,
      gates,
      panels,
      cladding
    );


  const extraHardwareExGST =
    toExGST(
      num(
        $("extraHardware").value
      ),
      true
    );


  const materialsExGST =
    frame.costExGST
    +
    postSteel.costExGST
    +
    fixings.dynaboltCostExGST
    +
    fixings.concreteCostExGST
    +
    fixings.baseplateCostExGST
    +
    fixings.gateHardwareExGST
    +
    fixings.panelScrewCostExGST
    +
    cladding.materialCostExGST
    +
    powder.rawCostExGST
    +
    nonPowderFinishExGST
    +
    extraHardwareExGST;


  const oneWayKm =
    num(
      $("travelKm").value
    );


  const chargeableOneWay =
    Math.max(
      0,

      oneWayKm -
      PRICES.business
        .includedTravelKm
    );


  const travelExGST =
    chargeableOneWay *
    2 *
    PRICES.business
      .travelRatePerKm;


  const otherDirectCostExGST =
    toExGST(
      num(
        $("otherCosts").value
      ),
      true
    );


  const markup =
    materialsExGST *
    PRICES.business
      .materialMarkup;


  const autoExGST =
    materialsExGST
    +
    labour.totalLabourExGST
    +
    travelExGST
    +
    otherDirectCostExGST
    +
    markup;


  const autoGST =
    autoExGST *
    PRICES.business.gst;


  const autoIncGST =
    autoExGST +
    autoGST;


  const autoFinalPrice =
    roundQuote(
      autoIncGST
    );


  lastCalculation = {
    posts,
    gates,
    panels,

    frame,
    postSteel,
    fixings,
    cladding,
    powder,

    nonPowderFinishIncGST,
    nonPowderFinishExGST,

    labour,

    materialsExGST,
    travelExGST,
    otherDirectCostExGST,
    markup,

    autoExGST,
    autoGST,
    autoIncGST,
    autoFinalPrice
  };


  /*
    AUTO quote updates continuously.

    MANUAL quote remains until a
    pricing-relevant edit triggers reset.
  */

  if (!manualQuoteActive) {
    suppressQuoteReset = true;

    $("quotePrice").value =
      autoFinalPrice;

    suppressQuoteReset = false;
  }


  $("frameMetres")
    .textContent =
      `${frame.required.toFixed(2)} m`;


  $("frameLengths")
    .textContent =
      frame.stockLengths;


  $("frameWaste")
    .textContent =
      `${frame.waste.toFixed(2)} m`;


  $("postMetres")
    .textContent =
      `${postSteel.required.toFixed(2)} m`;


  $("postLengths")
    .textContent =
      postSteel.stockLengths;


  $("postWaste")
    .textContent =
      `${postSteel.waste.toFixed(2)} m`;


  $("claddingBoards")
    .textContent =
      cladding.boards;


  $("claddingMetres")
    .textContent =
      `${cladding.metres.toFixed(2)} m`;


  $("claddingStockLengths")
    .textContent =
      cladding.stockLengths;


  $("materialsTotal")
    .textContent =
      money(materialsExGST);


  $("labourTotal")
    .textContent =
      money(
        labour.totalLabourExGST
      );


  $("travelTotal")
    .textContent =
      money(travelExGST);


  $("markupTotal")
    .textContent =
      money(markup);


  $("gstTotal")
    .textContent =
      money(autoGST);


  /*
    Compact powder card shows
    CUSTOMER PC option inc GST.
  */

  $("powderTotalDisplay")
    .textContent =
      money(
        powder.customerOptionIncGST
      );


  $("nonPowderFinishDisplay")
    .textContent =
      money(
        nonPowderFinishIncGST
      );


  updateLabourDisplay(
    labour
  );


  updateQuoteMetrics();

  updatePowderSummary();

  updateFabricationList();

  updateConsumablesList();

  updateLayoutCheck();

  buildQuote();

  updateWarnings();
}


/* ==========================================================
   QUOTE / PROFIT / $M2
   ========================================================== */

function getCurrentQuotePrice() {
  if (manualQuoteActive) {
    return manualQuoteValue;
  }


  return (
    lastCalculation
      ?.autoFinalPrice
    ||
    0
  );
}


function updateQuoteMetrics() {
  if (!lastCalculation) {
    return;
  }


  const currentQuote =
    getCurrentQuotePrice();


  $("quoteModeDisplay")
    .textContent =
      manualQuoteActive
        ? "MANUAL"
        : "AUTO";


  $("quoteModeDisplay")
    .classList.toggle(
      "manual",
      manualQuoteActive
    );


  /*
    Actual direct costs ex GST.
  */

  const actualCostsExGST =
    lastCalculation
      .materialsExGST
    +
    lastCalculation
      .labour
      .totalLabourExGST
    +
    lastCalculation
      .travelExGST
    +
    lastCalculation
      .otherDirectCostExGST;


  const currentQuoteExGST =
    currentQuote /
    (
      1 +
      PRICES.business.gst
    );


  const profit =
    currentQuoteExGST -
    actualCostsExGST;


  $("profitTotal")
    .textContent =
      money(profit);


  /*
    ENTIRE CAVITY RATE.

    This deliberately includes the
    whole project opening, including
    gate, posts, fixed panel etc.
  */

  const cavityWidthM =
    num(
      $("cavityWidth").value
    )
    /
    1000;


  const cavityHeightM =
    num(
      $("overallHeight").value
    )
    /
    1000;


  const cavityAreaM2 =
    cavityWidthM *
    cavityHeightM;


  $("effectiveRate")
    .textContent =
      cavityAreaM2 > 0

        ? `${money(
            currentQuote /
            cavityAreaM2
          )}/m²`

        : "N/A";


  const exGST =
    currentQuote /
    (
      1 +
      PRICES.business.gst
    );


  const gst =
    currentQuote -
    exGST;


  $("quoteExGstDisplay")
    .textContent =
      money(exGST);


  $("quoteGstDisplay")
    .textContent =
      money(gst);


  $("quoteTotalDisplay")
    .textContent =
      money(currentQuote);
}


/* ==========================================================
   CONSUMABLES
   ========================================================== */

function updateConsumablesList() {
  if (!lastCalculation) {
    return;
  }


  const rows = [];


  Object.entries(
    lastCalculation
      .frame
      .groups
  )
    .forEach(
      ([key, pieces]) => {
        const steel =
          PRICES.steel.frame[key];


        const stock =
          stockPieces(
            pieces,
            steel.stockLengthM
          );


        if (stock.lengths) {
          rows.push(
            `
            <div>
              <span>${steel.label}</span>
              <strong>
                ${stock.lengths} × ${steel.stockLengthM}m
              </strong>
            </div>
            `
          );
        }
      }
    );


  Object.entries(
    lastCalculation
      .postSteel
      .order
  )
    .forEach(
      ([key, quantity]) => {
        const steel =
          PRICES.steel.posts[key];


        rows.push(
          `
          <div>
            <span>${steel.label}</span>
            <strong>
              ${quantity} × ${steel.stockLengthM}m
            </strong>
          </div>
          `
        );
      }
    );


  if (
    lastCalculation
      .cladding
      .treatedPine
  ) {
    const pine =
      lastCalculation
        .cladding
        .treatedPine;


    rows.push(
      `
      <div>
        <span>
          Treated Pine Palings
          ${pine.palingLengthMm} × ${pine.palingWidthMm}
        </span>

        <strong>
          ${pine.palingCount}
        </strong>
      </div>
      `
    );


    if (
      treatedPineState.capping
    ) {
      rows.push(
        `
        <div>
          <span>Capping</span>
          <strong>
            ${pine.cappingMetres.toFixed(2)}m
          </strong>
        </div>
        `
      );
    }


    if (
      treatedPineState.plinth
    ) {
      rows.push(
        `
        <div>
          <span>Plinth board</span>
          <strong>
            ${pine.plinthMetres.toFixed(2)}m
          </strong>
        </div>
        `
      );
    }
  }


  else if (includeState.cladding) {
    const type =
      $("claddingType").value;


    const data =
      PRICES.cladding[type];


    if (
      lastCalculation
        .cladding
        .stockLengths > 0
    ) {
      rows.push(
        `
        <div>
          <span>${data.label}</span>
          <strong>
            ${lastCalculation.cladding.stockLengths} stock lengths
          </strong>
        </div>
        `
      );
    }


    else if (
      lastCalculation
        .cladding
        .metres > 0
    ) {
      rows.push(
        `
        <div>
          <span>${data.label}</span>
          <strong>
            ${lastCalculation.cladding.metres.toFixed(2)} lm
          </strong>
        </div>
        `
      );
    }
  }


  if (
    lastCalculation
      .fixings
      .dynaboltCount
  ) {
    rows.push(
      `
      <div>
        <span>75x10mm Dynabolts</span>
        <strong>
          ${lastCalculation.fixings.dynaboltCount}
        </strong>
      </div>
      `
    );
  }


  if (
    lastCalculation
      .fixings
      .concreteBags
  ) {
    rows.push(
      `
      <div>
        <span>Concrete</span>
        <strong>
          ${lastCalculation.fixings.concreteBags} bags
        </strong>
      </div>
      `
    );
  }


  if (
    lastCalculation
      .fixings
      .baseplateCount
  ) {
    rows.push(
      `
      <div>
        <span>Fabricated baseplates</span>
        <strong>
          ${lastCalculation.fixings.baseplateCount}
        </strong>
      </div>
      `
    );
  }


  if (includeState.gate) {
    lastCalculation.gates
      .forEach(gate => {
        rows.push(
          `
          <div>
            <span>${gate.label} hinges</span>
            <strong>
              1 set Lock-out galvanised,
              ${gate.hinge.toUpperCase()}
            </strong>
          </div>
          `
        );


        const latch =
          gate.latch === "other"

            ? (
                gate.otherLatch
                ||
                "Other latch"
              )

            : (
                PRICES.hardware
                  .latches[
                    gate.latch
                  ]?.label
                ||
                ""
              );


        rows.push(
          `
          <div>
            <span>${gate.label} latch</span>
            <strong>${latch}</strong>
          </div>
          `
        );
      });


    if (
      lastCalculation
        .gates.length > 1
    ) {
      rows.push(
        `
        <div>
          <span>Latch keys</span>
          <strong>
            Key alike where required
          </strong>
        </div>
        `
      );
    }
  }


  if (
    $("powderDecision").value ===
    "yes"
  ) {
    rows.push(
      `
      <div>
        <span>Powder-coat colour</span>
        <strong>
          ${$("powderColour").value || "TBC"}
        </strong>
      </div>
      `
    );
  }


  $("consumablesList")
    .innerHTML =
      rows.length

        ? rows.join("")

        : `
          <p class="muted">
            No materials calculated yet.
          </p>
          `;
}


/* ==========================================================
   FABRICATION LIST
   INTERNAL ABBREVIATIONS OK
   ========================================================== */

function updateFabricationList() {
  if (!lastCalculation) {
    return;
  }


  const rows = [];


  rows.push(
    `
    <div class="fabrication-reference">
      <strong>VIEW:</strong>
      ${selectedReferenceDescription().toUpperCase()}
    </div>
    `
  );


  const visible =
    activeComponents();


  visible.forEach(
    (component, visibleIndex) => {
      const colour =
        getComponentColour(
          visibleIndex
        );


      if (
        component.type === "post"
      ) {
        const post =
          lastCalculation.posts
            .find(
              item =>
                item.id ===
                component.id
            );


        if (!post) {
          return;
        }


        let details =
          `${post.label} | ` +
          `${post.steelLabel.replace(" Duragalv", "")} | `;


        if (
          post.cutLengthMm
        ) {
          details +=
            `CUT ${post.cutLengthMm}`;
        }


        if (post.customHeight) {
          details +=
            ` | CUSTOM HEIGHT ${post.finishedHeight}`;
        }


        if (
          post.fixing === "brick"
        ) {
          details +=
            ` | holes ${
              post.holes.length
                ? post.holes.join(" / ")
                : "TBC"
            } from top`;
        }


        if (post.topHole) {
          details +=
            ` | top hole ${post.topHole} from top`;
        }


        if (post.fixing) {
          details +=
            ` | ${postFixingShortName(post.fixing)}`;
        }


        rows.push(
          `
          <div
            class="fabrication-item"
            style="
              --component-colour:${colour.bg};
              --component-text:${colour.text};
            "
          >
            <strong>
              ${details}
            </strong>
          </div>
          `
        );
      }


      if (
        component.type === "gate"
      ) {
        const gate =
          lastCalculation.gates
            .find(
              item =>
                item.id ===
                component.id
            );


        if (!gate) {
          return;
        }


        let railText = "";


        if (
          $("claddingDirection").value ===
          "horizontal" &&
          gate.verticalRails
        ) {
          railText =
            ` | ${gate.verticalRails} Vert rail${gate.verticalRails > 1 ? "s" : ""}`;
        }


        if (
          $("claddingDirection").value ===
          "vertical" &&
          gate.horizontalRails
        ) {
          railText =
            ` | ${gate.horizontalRails} Hori rail${gate.horizontalRails > 1 ? "s" : ""}`;
        }


        rows.push(
          `
          <div
            class="fabrication-item"
            style="
              --component-colour:${colour.bg};
              --component-text:${colour.text};
            "
          >
            <strong>
              ${gate.label} |
              ${gate.width} × ${gate.height} |
              ${PRICES.steel.frame[gate.frame].label.replace(" Duragalv", "")} |
              Hinge ${gate.hinge.charAt(0).toUpperCase()}
              ${railText}
            </strong>
          </div>
          `
        );
      }


      if (
        component.type === "panel"
      ) {
        const panel =
          lastCalculation.panels
            .find(
              item =>
                item.id ===
                component.id
            );


        if (!panel) {
          return;
        }


        let rails = "";


        if (
          $("claddingDirection").value ===
          "vertical"
        ) {
          rails =
            panel.railCount === 4
              ? "Top / Mid / Lower / Extra"
              : "Top / Mid / Lower";
        }


        rows.push(
          `
          <div
            class="fabrication-item"
            style="
              --component-colour:${colour.bg};
              --component-text:${colour.text};
            "
          >
            <strong>
              ${panel.label} |
              ${panel.width} × ${panel.height}
              ${
                rails
                  ? ` | Hori rails ${rails}`
                  : ""
              }
            </strong>
          </div>
          `
        );
      }
    }
  );


  $("fabricationView")
    .innerHTML =
      rows.join("");
}


function postFixingShortName(fixing) {
  const map = {
    brick:
      "brick fixed",

    concreteHouse:
      "concreted next to house",

    concreteFloating:
      "concreted floating",

    fixedPanelLeft:
      "fixed panel left",

    fixedPanelCentre:
      "fixed panel centre",

    fixedPanelRight:
      "fixed panel right",

    baseplate:
      "baseplate",

    existing:
      "existing"
  };


  return (
    map[fixing]
    ||
    fixing
  );
}


/* ==========================================================
   LAYOUT CHECK
   ========================================================== */

function updateLayoutCheck() {
  const cavity =
    num(
      $("cavityWidth").value
    );


  if (!cavity) {
    $("layoutCheck")
      .className =
        "layout-check incomplete";


    $("layoutCheck")
      .textContent =
        "Layout incomplete";


    return;
  }


  const posts =
    readPosts();


  const gates =
    readGates();


  const panels =
    readPanels();


  const active =
    activeComponents();


  const postWidth =
    includeState.posts

      ? posts.reduce(
          (sum, post) => {
            return (
              sum +
              (
                post.fixing === "existing"
                  ? 0
                  : post.widthMm
              )
            );
          },
          0
        )

      : 0;


  const gateWidth =
    includeState.gate

      ? gates.reduce(
          (sum, gate) =>
            sum + gate.width,
          0
        )

      : 0;


  const panelWidth =
    panels.reduce(
      (sum, panel) =>
        sum + panel.width,
      0
    );


  const gaps =
    Math.max(
      0,
      active.length - 1
    )
    *
    PRICES.fabrication
      .componentGapMm;


  const total =
    postWidth +
    gateWidth +
    panelWidth +
    gaps;


  const difference =
    cavity -
    total;


  if (
    Math.abs(difference) <= 2
  ) {
    $("layoutCheck")
      .className =
        "layout-check complete";


    $("layoutCheck")
      .textContent =
        `✓ ${cavity}mm cavity = ${Math.round(total)}mm layout`;
  }


  else if (
    difference < 0
  ) {
    $("layoutCheck")
      .className =
        "layout-check error";


    $("layoutCheck")
      .textContent =
        `Layout exceeds cavity by ${Math.abs(Math.round(difference))}mm`;
  }


  else {
    $("layoutCheck")
      .className =
        "layout-check incomplete";


    $("layoutCheck")
      .textContent =
        `${Math.round(difference)}mm unallocated`;
  }
}


/* ==========================================================
   REQUIRED FIELDS
   ========================================================== */

function setFieldStatus(
  element,
  valid,
  required = true
) {
  if (!element) {
    return;
  }


  element.classList.remove(
    "required",
    "complete",
    "optional"
  );


  if (!required) {
    element.classList.add(
      "optional"
    );

    return;
  }


  element.classList.add(
    valid
      ? "complete"
      : "required"
  );
}


function updateRequiredFields() {
  setFieldStatus(
    document.querySelector(
      '[data-required-field="cavityWidth"]'
    ),

    num(
      $("cavityWidth").value
    ) > 0
  );


  setFieldStatus(
    document.querySelector(
      '[data-required-field="overallHeight"]'
    ),

    num(
      $("overallHeight").value
    ) > 0
  );


  setFieldStatus(
    document.querySelector(
      '[data-required-field="referenceDirection"]'
    ),

    Boolean(
      $("referenceDirection").value
    )
  );


  setFieldStatus(
    document.querySelector(
      '[data-required-field="referenceOther"]'
    ),

    Boolean(
      $("referenceOther").value.trim()
    ),

    $("referenceDirection").value ===
    "other"
  );


  setFieldStatus(
    document.querySelector(
      '[data-required-field="claddingType"]'
    ),

    Boolean(
      $("claddingType").value
    ),

    includeState.cladding
  );


  setFieldStatus(
    document.querySelector(
      '[data-required-field="claddingDirection"]'
    ),

    Boolean(
      $("claddingDirection").value
    ),

    includeState.cladding
  );


  setFieldStatus(
    document.querySelector(
      '[data-required-field="clientName"]'
    ),

    Boolean(
      $("clientName").value.trim()
    )
  );


  setFieldStatus(
    document.querySelector(
      '[data-required-field="siteAddress"]'
    ),

    Boolean(
      $("siteAddress").value.trim()
    )
  );


  setFieldStatus(
    $("phoneLabel"),
    validAustralianMobile(
      rawPhone()
    ),
    false
  );


  setFieldStatus(
    $("emailLabel"),
    validEmail(
      $("clientEmail").value
    ),
    false
  );


  components.forEach(component => {
    const card =
      document.querySelector(
        `[data-component-id="${component.id}"]`
      );


    if (!card) {
      return;
    }


    if (
      component.type === "post"
    ) {
      const fixing =
        card.querySelector(
          ".post-fixing"
        ).value;


      setFieldStatus(
        card.querySelector(
          ".post-steel-label"
        ),

        Boolean(
          card.querySelector(
            ".post-size"
          ).value
        ),

        includeState.posts
      );


      setFieldStatus(
        card.querySelector(
          ".post-fixing-label"
        ),

        Boolean(fixing),

        includeState.posts
      );


      if (
        fixing === "concreteHouse" &&
        card.querySelector(
          ".house-bolt-enabled"
        ).checked
      ) {
        setFieldStatus(
          card.querySelector(
            ".top-hole-label"
          ),

          num(
            card.querySelector(
              ".top-hole-position"
            ).value
          ) > 0,

          true
        );
      }
    }


    if (
      component.type === "gate"
    ) {
      const manual =
        card.dataset.widthMode ===
        "manual";


      setFieldStatus(
        card.querySelector(
          ".gate-manual-width-label"
        ),

        num(
          card.querySelector(
            ".gate-manual-width"
          ).value
        ) > 0,

        manual &&
        includeState.gate
      );


      setFieldStatus(
        card.querySelector(
          ".hinge-side-label"
        ),

        Boolean(
          card.querySelector(
            ".hinge-side"
          ).value
        ),

        includeState.gate
      );


      setFieldStatus(
        card.querySelector(
          ".open-direction-label"
        ),

        Boolean(
          card.querySelector(
            ".open-direction"
          ).value
        ),

        includeState.gate
      );


      setFieldStatus(
        card.querySelector(
          ".gate-latch-label"
        ),

        Boolean(
          card.querySelector(
            ".gate-latch"
          ).value
        ),

        includeState.gate
      );


      if (
        card.querySelector(
          ".gate-latch"
        ).value === "other"
      ) {
        setFieldStatus(
          card.querySelector(
            ".other-latch-description-label"
          ),

          Boolean(
            card.querySelector(
              ".other-latch-description"
            ).value.trim()
          ),

          true
        );
      }
    }


    if (
      component.type === "panel"
    ) {
      setFieldStatus(
        card.querySelector(
          ".panel-width-label"
        ),

        num(
          card.querySelector(
            ".panel-width"
          ).value
        ) > 0
      );


      setFieldStatus(
        card.querySelector(
          ".panel-height-label"
        ),

        num(
          card.querySelector(
            ".panel-height"
          ).value
        ) > 0
      );
    }
  });


  setFieldStatus(
    document.querySelector(
      '[data-required-field="powderColour"]'
    ),

    Boolean(
      $("powderColour").value
    ),

    $("powderDecision").value ===
    "yes"
  );
}


/* ==========================================================
   COMPONENT COMPLETION
   ========================================================== */

function componentComplete(component) {
  if (!componentIsActive(component)) {
    return true;
  }


  const card =
    document.querySelector(
      `[data-component-id="${component.id}"]`
    );


  if (!card) {
    return false;
  }


  if (
    component.type === "post"
  ) {
    const fixing =
      card.querySelector(
        ".post-fixing"
      ).value;


    if (!fixing) {
      return false;
    }


    if (
      fixing === "existing"
    ) {
      return true;
    }


    if (
      getPostFinishedHeight(card) <=
      0
    ) {
      return false;
    }


    if (
      fixing === "brick"
    ) {
      const holes =
        [
          ...card.querySelectorAll(
            ".hole-position"
          )
        ]
          .map(
            input =>
              num(input.value)
          )
          .filter(
            value =>
              value > 0
          );


      return holes.length > 0;
    }


    if (
      fixing === "concreteHouse" &&
      card.querySelector(
        ".house-bolt-enabled"
      ).checked
    ) {
      return (
        num(
          card.querySelector(
            ".top-hole-position"
          ).value
        ) > 0
      );
    }


    return true;
  }


  if (
    component.type === "gate"
  ) {
    const manual =
      card.dataset.widthMode ===
      "manual";


    if (
      manual &&
      num(
        card.querySelector(
          ".gate-manual-width"
        ).value
      ) <= 0
    ) {
      return false;
    }


    return Boolean(
      num(
        card.dataset
          .calculatedWidth
      ) > 0
      &&
      num(
        card.dataset
          .calculatedHeight
      ) > 0
      &&
      card.querySelector(
        ".hinge-side"
      ).value
      &&
      card.querySelector(
        ".open-direction"
      ).value
      &&
      card.querySelector(
        ".gate-latch"
      ).value
    );
  }


  return Boolean(
    num(
      card.querySelector(
        ".panel-width"
      ).value
    ) > 0
    &&
    num(
      card.querySelector(
        ".panel-height"
      ).value
    ) > 0
  );
}


/* ==========================================================
   COMPONENT STATUS
   ========================================================== */

function updateComponentStatus() {
  components.forEach(component => {
    const card =
      document.querySelector(
        `[data-component-id="${component.id}"]`
      );


    if (!card) {
      return;
    }


    const complete =
      componentComplete(
        component
      );


    const badge =
      card.querySelector(
        ".component-status"
      );


    badge.textContent =
      complete
        ? "COMPLETE"
        : "INCOMPLETE";


    badge.classList.toggle(
      "complete",
      complete
    );


    badge.classList.toggle(
      "incomplete",
      !complete
    );
  });
}


/* ==========================================================
   MUD MAP
   ========================================================== */

function renderMudMap() {
  const map =
    $("mudMap");


  map.innerHTML = "";


  const visible =
    activeComponents();


  if (!visible.length) {
    map.innerHTML =
      `
      <div class="mud-empty">
        Add components below
      </div>
      `;

    return;
  }


  visible.forEach(
    (component, index) => {
      const colour =
        getComponentColour(index);


      const wrapper =
        document.createElement(
          "div"
        );


      wrapper.className =
        "mud-item";


      const button =
        document.createElement(
          "button"
        );


      button.type =
        "button";


      button.className =
        "mud-component";


      button.style.setProperty(
        "--component-colour",
        colour.bg
      );


      button.style.setProperty(
        "--component-text",
        colour.text
      );


      if (
        selectedComponentId ===
        component.id
      ) {
        button.classList.add(
          "selected"
        );
      }


      const label =
        document.createElement(
          "span"
        );


      label.className =
        "mud-label";


      label.textContent =
        component.label;


      button.appendChild(label);


      /*
        Completion dot.
      */

      const status =
        document.createElement(
          "span"
        );


      status.className =
        `mud-status ${
          componentComplete(component)
            ? "complete"
            : "incomplete"
        }`;


      button.appendChild(status);


      /*
        Gate hinge.
      */

      if (
        component.type === "gate"
      ) {
        const card =
          document.querySelector(
            `[data-component-id="${component.id}"]`
          );


        const hinge =
          card.querySelector(
            ".hinge-side"
          ).value;


        if (hinge) {
          const marker =
            document.createElement(
              "span"
            );


          marker.className =
            `mud-hinge ${hinge}`;


          marker.textContent =
            "H";


          button.appendChild(
            marker
          );
        }
      }


      button.addEventListener(
        "click",
        () => {
          selectedComponentId =
            component.id;


          renderMudMap();


          jumpToComponent(
            component.id
          );
        }
      );


      wrapper.appendChild(
        button
      );


      if (
        selectedComponentId ===
        component.id
      ) {
        const controls =
          document.createElement(
            "div"
          );


        controls.className =
          "mud-move-controls";


        const left =
          document.createElement(
            "button"
          );


        left.type =
          "button";

        left.textContent =
          "◀";


        const right =
          document.createElement(
            "button"
          );


        right.type =
          "button";

        right.textContent =
          "▶";


        left.addEventListener(
          "click",
          event => {
            event.stopPropagation();


            moveComponent(
              component.id,
              -1
            );
          }
        );


        right.addEventListener(
          "click",
          event => {
            event.stopPropagation();


            moveComponent(
              component.id,
              1
            );
          }
        );


        controls.append(
          left,
          right
        );


        wrapper.appendChild(
          controls
        );
      }


      map.appendChild(
        wrapper
      );
    }
  );
}


/* ==========================================================
   MOVE / REMOVE COMPONENT
   ========================================================== */

function jumpToComponent(id) {
  const card =
    document.querySelector(
      `[data-component-id="${id}"]`
    );


  if (!card) {
    return;
  }


  card.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}


function moveComponent(
  id,
  direction
) {
  const beforeOrder =
    components.map(
      component =>
        component.id
    );


  const index =
    components.findIndex(
      component =>
        component.id === id
    );


  const target =
    index + direction;


  if (
    target < 0 ||
    target >= components.length
  ) {
    return;
  }


  resetQuoteToAuto();


  setUndoState({
    type: "move",
    order: beforeOrder
  });


  [
    components[index],
    components[target]
  ] = [
    components[target],
    components[index]
  ];


  const container =
    $("componentsContainer");


  components.forEach(component => {
    const card =
      document.querySelector(
        `[data-component-id="${component.id}"]`
      );


    if (card) {
      container.appendChild(
        card
      );
    }
  });


  renumberComponents();

  refreshEverything();
}


function removeComponent(id) {
  const index =
    components.findIndex(
      component =>
        component.id === id
    );


  if (index < 0) {
    return;
  }


  resetQuoteToAuto();


  const component =
    components[index];


  const snapshot =
    snapshotComponent(
      component
    );


  setUndoState({
    type: "delete",

    id:
      component.id,

    index,

    component:
      snapshot
  });


  components.splice(
    index,
    1
  );


  document.querySelector(
    `[data-component-id="${id}"]`
  )?.remove();


  if (
    selectedComponentId === id
  ) {
    selectedComponentId = null;
  }


  renumberComponents();

  refreshEverything();
}


/* ==========================================================
   CLIENT QUOTE
   FULL WORDS ONLY
   ========================================================== */

function buildQuote() {
  if (!lastCalculation) {
    return;
  }


  const html = [];


  html.push(
    `
    <div class="quote-section">

      <h4>
        PROJECT DESCRIPTION
      </h4>

      <p>
        Supply, fabricate and install
        ${projectDescriptionText()}.
      </p>

    </div>
    `
  );


  html.push(
    `
    <div class="quote-section">

      <h4>
        FABRICATION
      </h4>

      ${fabricationQuoteText()}

    </div>
    `
  );


  html.push(
    `
    <div class="quote-section">

      <h4>
        INSTALLATION
      </h4>

      <p>
        <strong>
          All left and right orientation references are based on
          ${selectedReferenceDescription().toLowerCase()}.
        </strong>
      </p>

      ${installationQuoteText()}

    </div>
    `
  );


  html.push(
    `
    <div class="quote-section">

      <h4>
        FINISH
      </h4>

      ${finishQuoteText()}

    </div>
    `
  );


  $("quoteDescription")
    .innerHTML =
      html.join("");


  $("bankReference")
    .textContent =
      $("projectNumber").value;
}


function projectDescriptionText() {
  const gateCount =
    includeState.gate
      ? lastCalculation
          .gates.length
      : 0;


  const panelCount =
    lastCalculation
      .panels.length;


  const cavity =
    num(
      $("cavityWidth").value
    );


  const height =
    num(
      $("overallHeight").value
    );


  let objectText = "";


  if (
    gateCount &&
    panelCount
  ) {
    objectText =
      `${gateCount === 1 ? "a custom steel-framed pedestrian gate" : `${gateCount} custom steel-framed gates`} and ${panelCount === 1 ? "a fixed panel" : `${panelCount} fixed panels`}`;
  }


  else if (gateCount) {
    objectText =
      gateCount === 1
        ? "a custom steel-framed pedestrian gate"
        : `${gateCount} custom steel-framed gates`;
  }


  else if (panelCount) {
    objectText =
      panelCount === 1
        ? "a custom fixed panel"
        : `${panelCount} custom fixed panels`;
  }


  else {
    objectText =
      "the nominated steelwork";
  }


  let text =
    objectText;


  if (
    cavity &&
    height
  ) {
    text +=
      ` to suit an opening approximately ${cavity}mm wide × ${height}mm high`;
  }


  if (includeState.cladding) {
    text +=
      `, with ${claddingDescription()} cladding`;
  }


  return text;
}


function fabricationQuoteText() {
  const lines = [];


  if (includeState.gate) {
    lastCalculation.gates
      .forEach(gate => {
        const latchName =
          gate.latch === "other"

            ? (
                gate.otherLatch ||
                "nominated latch"
              )

            : (
                PRICES.hardware
                  .latches[
                    gate.latch
                  ]?.label
                ||
                "gate latch"
              );


        /*
          Full client wording.
        */

        let railText = "";


        if (
          $("claddingDirection").value ===
          "horizontal" &&
          gate.verticalRails
        ) {
          railText =
            ` Includes ${gate.verticalRails} vertical mid rail${gate.verticalRails > 1 ? "s" : ""}.`;
        }


        if (
          $("claddingDirection").value ===
          "vertical" &&
          gate.horizontalRails
        ) {
          railText =
            ` Includes ${gate.horizontalRails} horizontal mid rail${gate.horizontalRails > 1 ? "s" : ""}.`;
        }


        lines.push(
          `
          <p>
            <strong>${gate.label}:</strong>
            ${gate.width}mm wide × ${gate.height}mm high,
            fabricated from
            ${PRICES.steel.frame[gate.frame].label}.
            Hinged on the ${gate.hinge},
            opening ${gate.opens}.
            ${latchName}.
            ${railText}
          </p>
          `
        );
      });
  }


  if (includeState.posts) {
    const newPostCount =
      lastCalculation.posts
        .filter(
          post =>
            post.fixing &&
            post.fixing !==
            "existing"
        )
        .length;


    if (newPostCount) {
      lines.push(
        `
        <p>
          Fabricate ${newPostCount}
          custom Duragalv steel
          ${newPostCount === 1 ? "post" : "posts"}
          to suit the nominated installation.
        </p>
        `
      );
    }
  }


  lastCalculation.panels
    .forEach(panel => {
      let railText = "";


      if (
        $("claddingDirection").value ===
        "vertical"
      ) {
        railText =
          panel.railCount === 4

            ? " Includes top, middle, lower and additional horizontal rails."

            : " Includes top, middle and lower horizontal rails.";
      }


      lines.push(
        `
        <p>
          <strong>${panel.label}:</strong>
          ${panel.width}mm wide × ${panel.height}mm high.
          ${railText}
        </p>
        `
      );
    });


  if (includeState.cladding) {
    lines.push(
      `
      <p>
        ${claddingDescription()} cladding.
      </p>
      `
    );
  }


  return lines.join("");
}


function installationQuoteText() {
  const lines = [];


  if (includeState.posts) {
    const fixingDescriptions =
      [
        ...new Set(
          lastCalculation.posts
            .filter(
              post =>
                post.fixing &&
                post.fixing !== "existing"
            )
            .map(
              post =>
                postFixingCustomerName(
                  post.fixing
                )
            )
        )
      ];


    if (
      fixingDescriptions.length
    ) {
      lines.push(
        `
        <p>
          Install posts using
          ${fixingDescriptions.join(" and ")}
          as nominated for the site.
        </p>
        `
      );
    }
  }


  if (includeState.gate) {
    lastCalculation.gates
      .forEach(gate => {
        const hingeWord =
          gate.hinge === "left"
            ? "left"
            : "right";


        const openWord =
          gate.opens === "in"
            ? "inward"
            : "outward";


        lines.push(
          `
          <p>
            ${gate.label} fitted with
            heavy-duty galvanised lock-out hinges,
            hinged on the ${hingeWord}
            and opening ${openWord}
            when viewed from the nominated reference direction.
            The latch is fitted to the opposite side.
          </p>
          `
        );
      });
  }


  return lines.join("");
}


function postFixingCustomerName(fixing) {
  const map = {
    brick:
      "brick-fixed posts",

    concreteHouse:
      "concreted posts adjacent to the building",

    concreteFloating:
      "concreted freestanding posts",

    fixedPanelLeft:
      "concreted fixed-panel posts",

    fixedPanelCentre:
      "concreted fixed-panel posts",

    fixedPanelRight:
      "concreted fixed-panel posts",

    baseplate:
      "baseplated posts"
  };


  return (
    map[fixing]
    ||
    "the nominated fixing method"
  );
}


function finishQuoteText() {
  const decision =
    $("powderDecision").value;


  if (decision === "yes") {
    return (
      `
      <p>
        Steelwork powder coated
        <strong>${$("powderColour").value || "colour to be confirmed"}</strong>.
      </p>

      <p>
        Allow approximately 2 weeks
        for powder-coating processing.
      </p>
      `
    );
  }


  if (decision === "no") {
    return (
      `
      <p>
        Duragalv steel with exposed fabrication areas
        treated with etch primer and silver galvanising spray.
      </p>
      `
    );
  }


  return (
    `
    <p>
      Finish to be confirmed.
    </p>
    `
  );
}


/* ==========================================================
   WARNINGS
   ========================================================== */

function getWarnings() {
  const warnings = [];


  if (
    !num(
      $("cavityWidth").value
    )
  ) {
    warnings.push(
      "Overall cavity width is required."
    );
  }


  if (
    !num(
      $("overallHeight").value
    )
  ) {
    warnings.push(
      "Height above finished surface is required."
    );
  }


  if (
    !$("clientName").value.trim()
  ) {
    warnings.push(
      "Client name is incomplete."
    );
  }


  if (
    !$("siteAddress").value.trim()
  ) {
    warnings.push(
      "Client address is incomplete."
    );
  }


  if (
    $("powderDecision").value ===
    ""
  ) {
    warnings.push(
      "Powder-coating decision has not been completed."
    );
  }


  if (
    $("powderDecision").value ===
    "yes" &&
    !$("powderColour").value
  ) {
    warnings.push(
      "Powder-coating colour is required."
    );
  }


  components.forEach(component => {
    if (
      !componentComplete(component) &&
      componentIsActive(component)
    ) {
      warnings.push(
        `${component.label} is incomplete.`
      );
    }
  });


  const checkText =
    $("layoutCheck")
      .textContent;


  if (
    checkText.includes(
      "unallocated"
    )
    ||
    checkText.includes(
      "exceeds"
    )
  ) {
    warnings.push(
      `Layout check: ${checkText}`
    );
  }


  return warnings;
}


function updateWarnings() {
  const warnings =
    getWarnings();


  $("warningSection")
    .classList.toggle(
      "hidden",
      !warnings.length
    );


  $("warningList")
    .innerHTML =
      warnings
        .map(
          warning =>
            `<div>${warning}</div>`
        )
        .join("");
}


/* ==========================================================
   AUTOSAVE
   ========================================================== */

function serializeCurrentJob() {
  const componentData =
    components.map(component => {
      const data =
        snapshotComponent(
          component
        );


      return {
        id:
          component.id,

        ...data
      };
    });


  return {
    project:
      $("projectNumber").value,

    clientName:
      $("clientName").value,

    address:
      $("siteAddress").value,

    phone:
      rawPhone(),

    email:
      $("clientEmail").value,

    cavityWidth:
      $("cavityWidth").value,

    overallHeight:
      $("overallHeight").value,

    referenceDirection:
      $("referenceDirection").value,

    referenceOther:
      $("referenceOther").value,

    includeState,

    cladding: {
      type:
        $("claddingType").value,

      direction:
        $("claddingDirection").value,

      ekodeckColour:
        $("ekodeckColour").value,

      cypressFinish:
        $("cypressFinish").value,

      cypressColour:
        $("cypressColour").value,

      lospFinish:
        $("lospFinish").value,

      lospColour:
        $("lospColour").value,

      merbauFinish:
        $("merbauFinish").value,

      treatedPineLength:
        $("treatedPineLength").value,

      treatedPineWidth:
        $("treatedPineWidth").value,

      treatedPineState,

      cappingMetres:
        $("pineCappingMetres").value,

      plinthMetres:
        $("pinePlinthMetres").value,

      colorbondProfile:
        $("colorbondProfile").value,

      colorbondColour:
        $("colorbondColour").value,

      customDescription:
        $("customDescription").value,

      customCost:
        $("customCost").value
    },

    powderDecision:
      $("powderDecision").value,

    powderColour:
      $("powderColour").value,

    additionalLabour: {
      enabled:
        $("additionalLabourEnabled")
          .checked,

      fabrication:
        $("additionalFabricationHours")
          .value,

      installation:
        $("additionalInstallationHours")
          .value
    },

    travelKm:
      $("travelKm").value,

    extraHardware:
      $("extraHardware").value,

    otherCosts:
      $("otherCosts").value,

    manualQuoteActive,

    manualQuoteValue,

    components:
      componentData,

    finalPrice:
      getCurrentQuotePrice(),

    updatedAt:
      new Date()
        .toISOString()
  };
}


function autoSaveJob() {
  if (
    restoringJob ||
    !lastCalculation
  ) {
    return;
  }


  const job =
    serializeCurrentJob();


  const jobs =
    getSavedJobs();


  jobs[
    job.project
  ] = job;


  saveJobsObject(
    jobs
  );


  localStorage.setItem(
    "jtlaActiveProject",
    job.project
  );


  renderSavedJobs();
}


/* ==========================================================
   LOAD JOB
   ========================================================== */

function loadJob(project) {
  const jobs =
    getSavedJobs();


  const job =
    jobs[project];


  if (!job) {
    return;
  }


  restoringJob = true;
  suppressQuoteReset = true;


  components = [];
  componentCounter = 0;
  selectedComponentId = null;


  $("componentsContainer")
    .innerHTML =
      `
      <p
        id="noComponentsMessage"
        class="muted"
      >
        Add the job components above,
        then use the sticky map to jump to each one.
      </p>
      `;


  $("projectNumber").value =
    job.project;


  $("clientName").value =
    job.clientName || "";


  $("siteAddress").value =
    job.address || "";


  $("clientPhone").value =
    job.phone || "04";


  $("clientEmail").value =
    job.email || "";


  $("cavityWidth").value =
    job.cavityWidth || "";


  $("overallHeight").value =
    job.overallHeight || "";


  $("referenceDirection").value =
    job.referenceDirection
    ||
    PRICES.defaults
      .referenceDirection;


  $("referenceOther").value =
    job.referenceOther || "";


  includeState = {
    gate:
      job.includeState?.gate
      ??
      true,

    posts:
      job.includeState?.posts
      ??
      true,

    cladding:
      job.includeState?.cladding
      ??
      true
  };


  const cladding =
    job.cladding || {};


  $("claddingType").value =
    cladding.type
    ||
    PRICES.defaults
      .claddingType;


  $("claddingDirection").value =
    cladding.direction || "";


  $("ekodeckColour").value =
    cladding.ekodeckColour
    ||
    $("ekodeckColour").value;


  $("cypressFinish").value =
    cladding.cypressFinish
    ||
    "Raw";


  $("cypressColour").value =
    cladding.cypressColour || "";


  $("lospFinish").value =
    cladding.lospFinish
    ||
    "Primed";


  $("lospColour").value =
    cladding.lospColour || "";


  $("merbauFinish").value =
    cladding.merbauFinish
    ||
    "Raw";


  $("treatedPineLength").value =
    cladding.treatedPineLength
    ||
    "1800";


  $("treatedPineWidth").value =
    cladding.treatedPineWidth
    ||
    "100";


  treatedPineState =
    cladding.treatedPineState
    ||
    {
      capping: true,
      plinth: true
    };


  $("pineCappingMetres").value =
    cladding.cappingMetres
    ||
    "";


  $("pinePlinthMetres").value =
    cladding.plinthMetres
    ||
    "";


  $("colorbondProfile").value =
    cladding.colorbondProfile
    ||
    $("colorbondProfile").value;


  if (
    cladding.colorbondColour
  ) {
    $("colorbondColour").value =
      cladding.colorbondColour;
  }


  $("customDescription").value =
    cladding.customDescription
    ||
    "";


  $("customCost").value =
    cladding.customCost
    ||
    "";


  $("powderDecision").value =
    job.powderDecision || "";


  $("powderColour").value =
    job.powderColour || "";


  $("additionalLabourEnabled")
    .checked =
      Boolean(
        job.additionalLabour
          ?.enabled
      );


  $("additionalFabricationHours")
    .value =
      job.additionalLabour
        ?.fabrication
      ||
      "";


  $("additionalInstallationHours")
    .value =
      job.additionalLabour
        ?.installation
      ||
      "";


  $("travelKm").value =
    job.travelKm || "";


  $("extraHardware").value =
    job.extraHardware || "";


  $("otherCosts").value =
    job.otherCosts || "";


  manualQuoteActive =
    Boolean(
      job.manualQuoteActive
    );


  manualQuoteValue =
    num(
      job.manualQuoteValue
    );


  (
    job.components || []
  )
    .forEach(saved => {
      addComponent(
        saved.type,
        saved
      );
    });


  localStorage.setItem(
    "jtlaActiveProject",
    job.project
  );


  restoringJob = false;
  suppressQuoteReset = false;


  clearUndoState();


  refreshEverything();


  /*
    Restore quote display after
    calculations are available.
  */

  if (
    manualQuoteActive &&
    manualQuoteValue > 0
  ) {
    $("quotePrice").value =
      manualQuoteValue;
  }


  updateQuoteMetrics();
}


/* ==========================================================
   NEW JOB
   ========================================================== */

function newJob() {
  const proceed =
    confirm(
      "Start a new job? Your current job is already saved."
    );


  if (!proceed) {
    return;
  }


  const next =
    getNextProjectNumber();


  suppressQuoteReset = true;


  localStorage.setItem(
    "jtlaActiveProject",
    next
  );


  components = [];
  componentCounter = 0;
  selectedComponentId = null;
  lastCalculation = null;


  manualQuoteActive =
    false;

  manualQuoteValue =
    0;


  $("componentsContainer")
    .innerHTML =
      `
      <p
        id="noComponentsMessage"
        class="muted"
      >
        Add the job components above,
        then use the sticky map to jump to each one.
      </p>
      `;


  $("projectNumber").value =
    next;


  $("clientName").value =
    "";


  $("siteAddress").value =
    "";


  $("clientPhone").value =
    "04";


  $("clientEmail").value =
    "";


  $("cavityWidth").value =
    "";


  $("overallHeight").value =
    "";


  $("referenceDirection").value =
    PRICES.defaults
      .referenceDirection;


  $("referenceOther").value =
    "";


  includeState = {
    gate: true,
    posts: true,
    cladding: true
  };


  $("claddingType").value =
    PRICES.defaults
      .claddingType;


  $("claddingDirection").value =
    "";


  $("treatedPineLength").value =
    "1800";


  $("treatedPineWidth").value =
    "100";


  treatedPineState = {
    capping: true,
    plinth: true
  };


  $("pineCappingMetres").value =
    "";


  $("pinePlinthMetres").value =
    "";


  $("powderDecision").value =
    "";


  $("powderColour").value =
    "";


  $("additionalLabourEnabled")
    .checked =
      false;


  $("additionalFabricationHours")
    .value =
      "";


  $("additionalInstallationHours")
    .value =
      "";


  $("travelKm").value =
    "";


  $("extraHardware").value =
    "";


  $("otherCosts").value =
    "";


  $("quotePrice").value =
    "";


  clearUndoState();


  suppressQuoteReset = false;


  $("claddingCard").open =
    true;


  $("powderCard").open =
    true;


  refreshEverything();
}


/* ==========================================================
   SAVED JOBS
   ========================================================== */

function renderSavedJobs() {
  const list =
    $("savedJobsList");


  const jobs =
    getSavedJobs();


  const keys =
    Object.keys(jobs)
      .sort()
      .reverse();


  if (!keys.length) {
    list.innerHTML =
      `
      <p class="muted">
        No saved jobs yet.
      </p>
      `;

    return;
  }


  list.innerHTML = "";


  keys.forEach(project => {
    const job =
      jobs[project];


    const row =
      document.createElement(
        "div"
      );


    row.className =
      "saved-job-row";


    row.innerHTML =
      `
      <div class="saved-job-info">

        <strong>
          ${project}
        </strong>

        <span>
          ${job.clientName || "Unnamed client"}
        </span>

        <small>
          ${
            job.finalPrice
              ? money(job.finalPrice)
              : "No price yet"
          }
        </small>

      </div>

      <div class="saved-job-actions">

        <button
          type="button"
          class="open-saved-job"
        >
          Open
        </button>

        <button
          type="button"
          class="delete-saved-job"
        >
          Delete
        </button>

      </div>
      `;


    row.querySelector(
      ".open-saved-job"
    )
      .addEventListener(
        "click",
        () => {
          loadJob(project);
        }
      );


    row.querySelector(
      ".delete-saved-job"
    )
      .addEventListener(
        "click",
        () => {
          deleteSavedJob(
            project
          );
        }
      );


    list.appendChild(
      row
    );
  });
}


function deleteSavedJob(project) {
  const proceed =
    confirm(
      `Delete saved job ${project}?`
    );


  if (!proceed) {
    return;
  }


  const jobs =
    getSavedJobs();


  delete jobs[project];


  saveJobsObject(
    jobs
  );


  const active =
    localStorage.getItem(
      "jtlaActiveProject"
    );


  if (
    active === project
  ) {
    localStorage.removeItem(
      "jtlaActiveProject"
    );


    /*
      Don't call newJob() here because
      that would give a second confirm.
    */

    location.reload();

    return;
  }


  renderSavedJobs();
}


/* ==========================================================
   HEADER
   ========================================================== */

function updateHeader() {
  $("topClientName")
    .textContent =
      $("clientName").value
      ||
      "New Client";


  $("topClientPhone")
    .textContent =
      displayPhone(
        rawPhone()
      );


  $("topProjectNumber")
    .textContent =
      $("projectNumber").value;
}


/* ==========================================================
   SMS
   ========================================================== */

function smsProjectDescription() {
  const gateCount =
    includeState.gate
      ? lastCalculation.gates.length
      : 0;


  const panelCount =
    lastCalculation.panels.length;


  const parts = [];


  if (gateCount === 1) {
    parts.push(
      "a custom steel gate"
    );
  }


  if (gateCount > 1) {
    parts.push(
      `${gateCount} custom steel gates`
    );
  }


  if (panelCount === 1) {
    parts.push(
      "1 fixed panel"
    );
  }


  if (panelCount > 1) {
    parts.push(
      `${panelCount} fixed panels`
    );
  }


  let description =
    parts.length
      ? parts.join(" and ")
      : "custom steelwork";


  if (includeState.cladding) {
    description +=
      ` with ${claddingDescription()} cladding`;
  }


  return description;
}


function sendSMS() {
  refreshEverything();


  if (
    !validAustralianMobile(
      rawPhone()
    )
  ) {
    setFieldStatus(
      $("phoneLabel"),
      false,
      true
    );


    alert(
      "Please enter a valid 10-digit mobile number beginning with 04."
    );


    return;
  }


  const message =
    `Hi ${$("clientName").value}, ` +
    `JTLA Gates quote ${$("projectNumber").value} for ${smsProjectDescription()}. ` +
    `Total ${$("quoteTotalDisplay").textContent} incl GST. ` +
    `Regards, Jody Tuuta 0439 517 783`;


  location.href =
    `sms:${rawPhone()}` +
    `?body=${encodeURIComponent(message)}`;
}


/* ==========================================================
   EMAIL
   ========================================================== */

/*
  mailto creates a plain-text email.

  The on-screen Finished Quote uses
  green headings.

  Standard mailto links cannot reliably
  force HTML/green heading formatting in
  the customer's email client.
*/

function buildEmailBody() {
  const exGST =
    $("quoteExGstDisplay")
      .textContent;


  const gst =
    $("quoteGstDisplay")
      .textContent;


  const total =
    $("quoteTotalDisplay")
      .textContent;


  let text = "";


  text +=
    `${$("clientName").value}\n`;


  text +=
    `${$("siteAddress").value}\n\n`;


  text +=
    `PROJECT DESCRIPTION\n`;


  text +=
    `Supply, fabricate and install ${projectDescriptionText()}.\n\n`;


  text +=
    `FABRICATION\n`;


  if (includeState.gate) {
    lastCalculation.gates
      .forEach(gate => {
        const latch =
          gate.latch === "other"

            ? (
                gate.otherLatch ||
                "Nominated latch"
              )

            : (
                PRICES.hardware
                  .latches[
                    gate.latch
                  ]?.label
                ||
                "Gate latch"
              );


        text +=
          `${gate.label}: ${gate.width}mm wide × ${gate.height}mm high. ` +
          `${PRICES.steel.frame[gate.frame].label}. ` +
          `Hinged on the ${gate.hinge}, opening ${gate.opens}. ` +
          `${latch}. `;


        if (
          $("claddingDirection").value ===
          "horizontal" &&
          gate.verticalRails
        ) {
          text +=
            `${gate.verticalRails} vertical mid rail${gate.verticalRails > 1 ? "s" : ""}. `;
        }


        if (
          $("claddingDirection").value ===
          "vertical" &&
          gate.horizontalRails
        ) {
          text +=
            `${gate.horizontalRails} horizontal mid rail${gate.horizontalRails > 1 ? "s" : ""}. `;
        }


        text +=
          `\n`;
      });
  }


  lastCalculation.panels
    .forEach(panel => {
      text +=
        `${panel.label}: ${panel.width}mm wide × ${panel.height}mm high.`;


      if (
        $("claddingDirection").value ===
        "vertical"
      ) {
        text +=
          panel.railCount === 4

            ? ` Top, middle, lower and additional horizontal rails.`

            : ` Top, middle and lower horizontal rails.`;
      }


      text +=
        `\n`;
    });


  if (includeState.cladding) {
    text +=
      `${claddingDescription()} cladding.\n`;
  }


  text +=
    `\nINSTALLATION\n`;


  text +=
    `All left and right orientation references are based on ${selectedReferenceDescription().toLowerCase()}.\n`;


  if (includeState.gate) {
    lastCalculation.gates
      .forEach(gate => {
        text +=
          `${gate.label} fitted with heavy-duty galvanised lock-out hinges, ` +
          `hinged on the ${gate.hinge} and opening ${gate.opens === "in" ? "inward" : "outward"} when viewed from the nominated reference direction. ` +
          `The latch is fitted to the opposite side.\n`;
      });
  }


  text +=
    `\nFINISH\n`;


  if (
    $("powderDecision").value ===
    "yes"
  ) {
    text +=
      `Steelwork powder coated ${$("powderColour").value}.\n`;

    text +=
      `Allow approximately 2 weeks for powder-coating processing.\n`;
  }


  else {
    text +=
      `Duragalv steel with exposed fabrication areas treated with etch primer and silver galvanising spray.\n`;
  }


  text +=
    `\nPRICE\n`;


  text +=
    `Price ex GST: ${exGST}\n`;


  text +=
    `GST: ${gst}\n`;


  text +=
    `TOTAL INC GST: ${total}\n`;


  text +=
    `\nTERMS\n`;


  text +=
    `50% deposit required on acceptance.\n`;


  text +=
    `Balance payable on completion.\n`;


  text +=
    `\nBANK TRANSFER\n`;


  text +=
    `Name: ${PRICES.bank.accountName}\n`;


  text +=
    `BSB: ${PRICES.bank.bsb}\n`;


  text +=
    `Account: ${PRICES.bank.accountNumber}\n`;


  text +=
    `Reference: ${$("projectNumber").value}\n`;


  text +=
    `\nTo proceed, please reply to this email confirming acceptance of Quote ${$("projectNumber").value}.\n`;


  text +=
    `\nKind regards,\n`;


  text +=
    `Jody Tuuta\n`;


  text +=
    `JTLA Gates\n`;


  text +=
    `0439 517 783`;


  return text;
}


function sendEmail() {
  refreshEverything();


  if (
    !validEmail(
      $("clientEmail").value
    )
  ) {
    setFieldStatus(
      $("emailLabel"),
      false,
      true
    );


    alert(
      "Please enter a valid email address."
    );


    return;
  }


  const subject =
    `JTLA Gates Quote ${$("projectNumber").value}`;


  const body =
    buildEmailBody();


  location.href =
    `mailto:${$("clientEmail").value}` +
    `?bcc=${encodeURIComponent(PRICES.quote.bccEmail)}` +
    `&subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(body)}`;
}


/* ==========================================================
   REFRESH EVERYTHING
   ========================================================== */

function refreshEverything() {
  if (refreshLock) {
    return;
  }


  refreshLock = true;


  try {
    renumberComponents();


    components
      .filter(
        component =>
          component.type === "post"
      )
      .forEach(component => {
        const card =
          document.querySelector(
            `[data-component-id="${component.id}"]`
          );


        updatePostUI(card);
      });


    components
      .filter(
        component =>
          component.type === "gate"
      )
      .forEach(component => {
        const card =
          document.querySelector(
            `[data-component-id="${component.id}"]`
          );


        updateGateUI(card);
      });


    $("referenceOtherWrap")
      .classList.toggle(
        "hidden",

        $("referenceDirection").value !==
        "other"
      );


    updateIncludeUI();

    updateCladdingUI();

    updatePowderUI();

    calculateGateDimensions();

    updateRequiredFields();

    updateComponentStatus();

    renderMudMap();

    calculateQuote();

    updateHeader();


    if (!restoringJob) {
      autoSaveJob();
    }
  }


  finally {
    refreshLock = false;
  }
}


/* ==========================================================
   PHONE
   ========================================================== */

function setupPhoneField() {
  const field =
    $("clientPhone");


  if (!field.value) {
    field.value =
      "04";
  }


  field.addEventListener(
    "focus",
    () => {
      if (
        !field.value.startsWith(
          "04"
        )
      ) {
        field.value =
          "04";
      }


      const end =
        field.value.length;


      field.setSelectionRange(
        end,
        end
      );
    }
  );


  field.addEventListener(
    "input",
    () => {
      let digits =
        field.value
          .replace(/\D/g, "");


      if (
        !digits.startsWith(
          "04"
        )
      ) {
        digits =
          "04" +
          digits.replace(
            /^0*4?/,
            ""
          );
      }


      field.value =
        digits.slice(
          0,
          10
        );
    }
  );


  field.addEventListener(
    "blur",
    () => {
      if (
        field.value.length < 2
      ) {
        field.value =
          "04";
      }
    }
  );
}


/* ==========================================================
   GLOBAL LIVE EVENTS
   ========================================================== */

function setupLiveEvents() {
  /*
    INPUT:
    Immediate calculation while typing.
  */

  document.addEventListener(
    "input",
    event => {
      const target =
        event.target;


      if (
        target.closest(
          "#savedJobsList"
        )
      ) {
        return;
      }


      /*
        Quote itself is special.
      */

      if (
        target.id === "quotePrice"
      ) {
        markQuoteManual();

        buildQuote();

        return;
      }


      maybeResetManualQuote(
        target
      );


      refreshEverything();
    }
  );


  /*
    CHANGE:
    Dropdowns, toggles etc.
  */

  document.addEventListener(
    "change",
    event => {
      const target =
        event.target;


      if (
        target.closest(
          "#savedJobsList"
        )
      ) {
        return;
      }


      maybeResetManualQuote(
        target
      );


      refreshEverything();


      /*
        Cladding collapses after
        a completed dropdown choice.
      */

      if (
        target.closest(
          "#claddingSection"
        )
      ) {
        maybeCollapseCladding();
      }


      /*
        PC collapses after
        colour selection.
      */

      if (
        target.id ===
        "powderColour"
      ) {
        maybeCollapsePowder();
      }
    }
  );
}


/* ==========================================================
   INITIALISE
   ========================================================== */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    populateColours();


    $("projectNumber").value =
      getActiveProjectNumber();


    $("referenceDirection").value =
      PRICES.defaults
        .referenceDirection;


    setupPhoneField();


    /*
      Client name/address.
    */

    [
      "clientName",
      "siteAddress"
    ]
      .forEach(id => {
        $(id).addEventListener(
          "blur",
          () => {
            $(id).value =
              titleCaseWords(
                $(id).value
              );


            refreshEverything();
          }
        );
      });


    /*
      Add Components.
    */

    $("addPostBtn")
      .addEventListener(
        "click",
        () =>
          addComponent("post")
      );


    $("addGateBtn")
      .addEventListener(
        "click",
        () =>
          addComponent("gate")
      );


    $("addPanelBtn")
      .addEventListener(
        "click",
        () =>
          addComponent("panel")
      );


    /*
      Include toggles.
    */

    $("includeGateBtn")
      .addEventListener(
        "click",
        () => {
          resetQuoteToAuto();


          includeState.gate =
            !includeState.gate;


          refreshEverything();
        }
      );


    $("includePostsBtn")
      .addEventListener(
        "click",
        () => {
          resetQuoteToAuto();


          includeState.posts =
            !includeState.posts;


          refreshEverything();
        }
      );


    $("includeCladdingBtn")
      .addEventListener(
        "click",
        () => {
          resetQuoteToAuto();


          includeState.cladding =
            !includeState.cladding;


          refreshEverything();
        }
      );


    /*
      Treated pine.
    */

    $("pineCappingToggle")
      .addEventListener(
        "click",
        () => {
          resetQuoteToAuto();


          treatedPineState.capping =
            !treatedPineState.capping;


          refreshEverything();
        }
      );


    $("pinePlinthToggle")
      .addEventListener(
        "click",
        () => {
          resetQuoteToAuto();


          treatedPineState.plinth =
            !treatedPineState.plinth;


          refreshEverything();
        }
      );


    /*
      Powder coating.
    */

    $("powderYesBtn")
      .addEventListener(
        "click",
        () => {
          resetQuoteToAuto();


          $("powderDecision").value =
            "yes";


          $("powderCard").open =
            true;


          refreshEverything();


          if (
            $("powderColour").value
          ) {
            maybeCollapsePowder();
          }
        }
      );


    $("powderNoBtn")
      .addEventListener(
        "click",
        () => {
          resetQuoteToAuto();


          $("powderDecision").value =
            "no";


          refreshEverything();


          maybeCollapsePowder();
        }
      );


    /*
      Additional labour.
    */

    $("additionalLabourEnabled")
      .addEventListener(
        "change",
        () => {
          resetQuoteToAuto();


          if (
            !$("additionalLabourEnabled")
              .checked
          ) {
            $("additionalFabricationHours")
              .value =
                "";


            $("additionalInstallationHours")
              .value =
                "";
          }


          refreshEverything();
        }
      );


    /*
      Quote reset.
    */

    $("resetQuoteBtn")
      .addEventListener(
        "click",
        () => {
          resetQuoteToAuto();

          refreshEverything();
        }
      );


    /*
      Undo.
    */

    $("undoBtn")
      .addEventListener(
        "click",
        performUndo
      );


    /*
      Save.
    */

    $("saveBtn")
      .addEventListener(
        "click",
        () => {
          refreshEverything();

          autoSaveJob();


          const original =
            $("saveBtn")
              .textContent;


          $("saveBtn")
            .textContent =
              "Saved";


          setTimeout(
            () => {
              $("saveBtn")
                .textContent =
                  original;
            },
            800
          );
        }
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
        () => {
          refreshEverything();

          window.print();
        }
      );


    $("newJobBtn")
      .addEventListener(
        "click",
        newJob
      );


    /*
      Restore active job.
    */

    const active =
      localStorage.getItem(
        "jtlaActiveProject"
      );


    const jobs =
      getSavedJobs();


    if (
      active &&
      jobs[active]
    ) {
      loadJob(active);
    }


    setupLiveEvents();


    renderSavedJobs();


    clearUndoState();


    refreshEverything();
  }
);
