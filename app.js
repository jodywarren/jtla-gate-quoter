/* ==========================================================
   JTLA GATES QUOTER
   CONSOLIDATED APP ENGINE
   ========================================================== */

const $ = id => document.getElementById(id);


/* ==========================================================
   STATE
========================================================== */

let components = [];
let componentCounter = 0;
let selectedComponentId = null;
let lastCalculation = null;
let restoringJob = false;
let refreshLock = false;

let includeState = {
  gate: true,
  posts: true,
  cladding: true
};


/*
  Labour TIME rules.

  These describe the work, not the hourly rate.
  Hourly rate still comes from prices.js.
*/

const LABOUR_TIME = {

  gateFabricationHours: 2.0,

  postFabricationHours: 0.5,

  fixedPanelHours: 2.0,

  holeHours: 10 / 60,

  concretePostInstallHours: 0.5,

  baseplatePostInstallHours: 20 / 60,

  hangGateHours: 1.5
};


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
    ) *
    PRICES.business.roundTo
  );
}


function formatProjectNumber(value) {

  const fourDigits =
    String(Number(value))
      .padStart(4, "0")
      .slice(-4);

  return `00${fourDigits}`;
}


function capitaliseWords(value) {

  return String(value || "")
    .toLowerCase()
    .replace(
      /\b[a-z]/g,
      letter =>
        letter.toUpperCase()
    );
}


function rawPhone() {

  const field =
    $("clientPhone");

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
    digits.slice(0, 4) +
    " " +
    digits.slice(4, 7) +
    " " +
    digits.slice(7)
  );
}


/* ==========================================================
   PROJECT NUMBERING
========================================================== */

function getCurrentProjectNumber() {

  let current =
    localStorage.getItem(
      "jtlaActiveProject"
    );

  if (current) {
    return current;
  }


  const jobs =
    getSavedJobs();


  const numbers =
    Object.keys(jobs)
      .map(project =>
        Number(
          String(project)
            .slice(-4)
        )
      )
      .filter(Number.isFinite);


  const starting =
    PRICES.projects
      ?.startingProjectNumber
      || 1246;


  const next =
    numbers.length
      ? Math.max(...numbers) + 1
      : starting;


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
        Number(
          String(project)
            .slice(-4)
        )
      )
      .filter(Number.isFinite);


  const current =
    Number(
      getCurrentProjectNumber()
        .slice(-4)
    );


  const starting =
    PRICES.projects
      ?.startingProjectNumber
      || 1246;


  const highest =
    Math.max(
      starting - 1,
      current,
      ...(numbers.length
        ? numbers
        : [0])
    );


  return formatProjectNumber(
    highest + 1
  );
}


/* ==========================================================
   SAVED JOB LIBRARY
========================================================== */

function getSavedJobs() {

  try {

    return JSON.parse(
      localStorage.getItem(
        "jtlaJobs"
      ) || "{}"
    );

  }

  catch {

    return {};
  }
}


function setSavedJobs(jobs) {

  localStorage.setItem(
    "jtlaJobs",
    JSON.stringify(jobs)
  );
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
   COLOURS
========================================================== */

function populateColours() {

  [
    $("colorbondColour"),
    $("powderColour")
  ]
  .filter(Boolean)
  .forEach(select => {

    const current =
      select.value;

    select.innerHTML = "";


    [...PRICES.colours]
      .sort()
      .forEach(colour => {

        const option =
          document.createElement(
            "option"
          );

        option.value = colour;
        option.textContent = colour;

        select.appendChild(option);
      });


    if (
      current &&
      [...select.options]
        .some(
          option =>
            option.value === current
        )
    ) {

      select.value = current;
    }
  });
}


/* ==========================================================
   COMPONENT NAMES
========================================================== */

function renumberComponents() {

  const activeGates =
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

    if (
      component.type === "post"
    ) {

      postNumber++;

      component.label =
        `Post ${postNumber}`;
    }


    else if (
      component.type === "gate"
    ) {

      gateNumber++;

      component.label =
        activeGates.length === 1
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
}


/* ==========================================================
   ADD COMPONENT
========================================================== */

function addComponent(
  type,
  savedData = null
) {

  componentCounter++;

  const component = {
    id: `component-${componentCounter}`,
    type
  };


  components.push(component);

  buildComponent(
    component,
    savedData
  );

  renumberComponents();


  /*
    Do NOT jump down to the new component.
    User can add the whole layout first.
  */

  if (!restoringJob) {
    refreshEverything();
  }


  return component;
}


/* ==========================================================
   BUILD COMPONENT CARD
========================================================== */

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


  if (
    component.type === "post"
  ) {

    body.appendChild(
      $("postTemplate")
        .content
        .cloneNode(true)
    );
  }


  else if (
    component.type === "gate"
  ) {

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


/* ==========================================================
   COMPONENT SETUP
========================================================== */

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


  if (
    component.type === "post"
  ) {

    setupPost(
      card,
      savedData
    );
  }


  else if (
    component.type === "gate"
  ) {

    setupGate(
      card,
      savedData
    );
  }


  else {

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

  const select =
    card.querySelector(
      ".post-size"
    );


  select.innerHTML = "";


  Object.entries(
    PRICES.steel.posts
  )
  .forEach(([key, item]) => {

    const option =
      document.createElement(
        "option"
      );

    option.value = key;
    option.textContent =
      item.label;

    select.appendChild(option);
  });


  select.value =
    saved?.steelKey ||
    saved?.size ||
    PRICES.defaults.postType;


  if (saved) {

    card.querySelector(
      ".post-fixing"
    ).value =
      saved.fixing || "";


    card.querySelector(
      ".post-height-override-enabled"
    ).checked =
      Boolean(
        saved.overrideHeight
      );


    card.querySelector(
      ".post-height-override"
    ).value =
      saved.overrideHeightValue ||
      saved.height ||
      "";


    card.querySelector(
      ".house-bolt-enabled"
    ).checked =
      Boolean(
        saved.topBoltEnabled
        ?? saved.topBolt
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
    .forEach(value =>
      addHole(
        card,
        value
      )
    );
  }


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


  card.querySelector(
    ".add-hole"
  )
  .addEventListener(
    "click",
    () => {

      addHole(card);

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
    fragment.querySelector(
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
   POST HEIGHT
========================================================== */

function getPostVisibleHeight(card) {

  if (!card) {

    return num(
      $("overallHeight")
        ?.value
    );
  }


  const override =
    card.querySelector(
      ".post-height-override-enabled"
    )?.checked;


  if (override) {

    return num(
      card.querySelector(
        ".post-height-override"
      )?.value
    );
  }


  return num(
    $("overallHeight")
      ?.value
  );
}


/* ==========================================================
   POST UI
========================================================== */

function updatePostUI(card) {

  const fixing =
    card.querySelector(
      ".post-fixing"
    ).value;


  const override =
    card.querySelector(
      ".post-height-override-enabled"
    ).checked;


  card.querySelector(
    ".post-height-override-wrap"
  )
  .classList.toggle(
    "hidden",
    !override
  );


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


  const visibleHeight =
    getPostVisibleHeight(card);


  let cutLength = 0;


  if (
    fixing === "brick" ||
    fixing === "baseplate"
  ) {

    cutLength =
      visibleHeight;
  }


  else if (
    fixing &&
    fixing !== "existing"
  ) {

    cutLength =
      visibleHeight +
      PRICES.defaults
        .concreteEmbedmentMm;
  }


  card.querySelector(
    ".post-visible-height"
  ).textContent =
    visibleHeight
      ? `${visibleHeight} mm`
      : "-";


  card.querySelector(
    ".post-cut"
  ).textContent =
    cutLength
      ? `${cutLength} mm`
      : "-";
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
  .forEach(([key, item]) => {

    const option =
      document.createElement(
        "option"
      );

    option.value = key;
    option.textContent =
      item.label;

    frame.appendChild(option);
  });


  frame.value =
    saved?.frame ||
    PRICES.defaults.frameType;


  const latch =
    card.querySelector(
      ".gate-latch"
    );


  latch.innerHTML = "";


  Object.entries(
    PRICES.hardware.latches
  )
  .forEach(([key, item]) => {

    const option =
      document.createElement(
        "option"
      );

    option.value = key;
    option.textContent =
      item.label;

    latch.appendChild(option);
  });


  latch.value =
    saved?.latch ||
    "ddDualKey";


  /*
    Add automatic/manual width controls.
  */

  const widthArea =
    card.querySelector(
      ".gate-width-display"
    )
    ?.closest(
      ".calculated-box"
    );


  const widthControls =
    document.createElement(
      "div"
    );


  widthControls.className =
    "gate-width-controls";


  widthControls.innerHTML =
    `
    <button
      type="button"
      class="gate-width-mode-btn"
    >
      AUTO WIDTH
    </button>

    <div class="gate-manual-width-wrap hidden">

      <label>
        Manual gate width (mm)

        <input
          type="number"
          class="gate-manual-width"
          placeholder="Enter width"
        >
      </label>

    </div>
    `;


  widthArea
    ?.insertAdjacentElement(
      "afterend",
      widthControls
    );


  const modeButton =
    card.querySelector(
      ".gate-width-mode-btn"
    );


  const manualWrap =
    card.querySelector(
      ".gate-manual-width-wrap"
    );


  const manualInput =
    card.querySelector(
      ".gate-manual-width"
    );


  card.dataset.widthMode =
    saved?.widthMode ||
    "auto";


  manualInput.value =
    saved?.manualWidth || "";


  function updateWidthModeUI() {

    const manual =
      card.dataset.widthMode ===
      "manual";


    modeButton.textContent =
      manual
        ? "MANUAL WIDTH"
        : "AUTO WIDTH";


    modeButton.classList.toggle(
      "manual",
      manual
    );


    manualWrap.classList.toggle(
      "hidden",
      !manual
    );
  }


  modeButton.addEventListener(
    "click",
    () => {

      card.dataset.widthMode =
        card.dataset.widthMode ===
        "manual"
          ? "auto"
          : "manual";


      updateWidthModeUI();

      refreshEverything();
    }
  );


  updateWidthModeUI();


  if (saved) {

    card.querySelector(
      ".horizontal-rails"
    ).value =
      saved.horizontalRails ||
      saved.hRails ||
      "0";


    card.querySelector(
      ".vertical-rails"
    ).value =
      saved.verticalRails ||
      saved.vRails ||
      "0";


    card.querySelector(
      ".hinge-side"
    ).value =
      saved.hinge || "";


    card.querySelector(
      ".open-direction"
    ).value =
      saved.opens || "";


    card.querySelector(
      ".other-latch-description"
    ).value =
      saved.otherLatch || "";


    card.querySelector(
      ".other-latch-cost"
    ).value =
      saved.otherLatchCost || "";
  }


  card.querySelector(
    ".other-latch"
  )
  .classList.toggle(
    "hidden",
    latch.value !== "other"
  );


  latch.addEventListener(
    "change",
    () => {

      card.querySelector(
        ".other-latch"
      )
      .classList.toggle(
        "hidden",
        latch.value !== "other"
      );
    }
  );
}


/* ==========================================================
   FIXED PANEL SETUP
========================================================== */

function setupPanel(
  card,
  saved = null
) {

  /*
    Add optional mid rail for
    vertical-clad panels.
  */

  const railInfo =
    card.querySelector(
      ".panel-rail-info"
    );


  const option =
    document.createElement(
      "label"
    );


  option.className =
    "check-line panel-midrail-option";


  option.innerHTML =
    `
    <input
      type="checkbox"
      class="panel-midrail"
    >

    Add centre mid rail
    `;


  railInfo
    ?.insertAdjacentElement(
      "beforebegin",
      option
    );


  if (saved) {

    card.querySelector(
      ".panel-width"
    ).value =
      saved.width || "";


    card.querySelector(
      ".panel-height"
    ).value =
      saved.height || "";


    card.querySelector(
      ".panel-midrail"
    ).checked =
      Boolean(
        saved.midRail
      );
  }
}


/* ==========================================================
   READ POSTS
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


      const visibleHeight =
        getPostVisibleHeight(card);


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


      let cut = 0;


      if (
        fixing === "brick" ||
        fixing === "baseplate"
      ) {

        cut =
          visibleHeight;
      }


      else if (
        fixing &&
        fixing !== "existing"
      ) {

        cut =
          visibleHeight +
          PRICES.defaults
            .concreteEmbedmentMm;
      }


      return {

        id:
          component.id,

        label:
          component.label,

        steelKey,

        steelLabel:
          steel.label,

        width:
          steel.widthMm,

        depth:
          steel.depthMm,

        fixing,

        visibleHeight,

        cut,

        holes,

        topHole,

        offset:
          num(
            card.querySelector(
              ".post-offset"
            ).value
          ),

        overrideHeight:
          card.querySelector(
            ".post-height-override-enabled"
          ).checked,

        overrideHeightValue:
          card.querySelector(
            ".post-height-override"
          ).value
      };
    });
}


/* ==========================================================
   GATE HEIGHT
========================================================== */

function getNearestPostHeight(
  gateComponent
) {

  if (!includeState.posts) {

    return num(
      $("overallHeight").value
    );
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
      getPostVisibleHeight(card);

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
      getPostVisibleHeight(card);

    break;
  }


  const heights =
    [
      leftHeight,
      rightHeight
    ]
    .filter(
      height =>
        num(height) > 0
    );


  if (heights.length) {

    return Math.min(
      ...heights
    );
  }


  return num(
    $("overallHeight").value
  );
}


/* ==========================================================
   GATE WIDTH CALCULATION
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


  const gaps =
    Math.max(
      0,
      active.length - 1
    ) *
    PRICES.defaults
      .componentGapMm;


  const postWidth =
    includeState.posts
      ? posts.reduce(
          (sum, post) => {

            if (
              post.fixing ===
              "existing"
            ) {
              return sum;
            }

            return sum +
              post.width;
          },
          0
        )
      : 0;


  const panelWidth =
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
      postWidth -
      panelWidth -
      gaps -
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


    const postHeight =
      getNearestPostHeight(
        component
      );


    const height =
      Math.max(
        0,

        postHeight -
        PRICES.defaults
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
  });
}


/* ==========================================================
   READ GATES
========================================================== */

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

        active:
          includeState.gate,

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
          card.dataset.widthMode ||
          "auto",

        manualWidth:
          num(
            card.querySelector(
              ".gate-manual-width"
            )?.value
          ),

        frame:
          card.querySelector(
            ".gate-frame"
          ).value,

        hRails:
          num(
            card.querySelector(
              ".horizontal-rails"
            ).value
          ),

        vRails:
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
          ).value,

        otherLatchCost:
          num(
            card.querySelector(
              ".other-latch-cost"
            ).value
          )
      };
    });
}


/* ==========================================================
   READ PANELS
========================================================== */

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

        midRail:
          Boolean(
            card.querySelector(
              ".panel-midrail"
            )?.checked
          )
      };
    });
}


/* ==========================================================
   INCLUDE BUTTONS / VISIBILITY
========================================================== */

function updateIncludeUI() {

  const gateButton =
    $("includeFrameBtn");


  if (gateButton) {

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
  }


  const postButton =
    $("includePostsBtn");


  if (postButton) {

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
  }


  const cladButton =
    $("includeCladdingBtn");


  if (cladButton) {

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
  }


  /*
    Hide all signs of posts when POSTS OFF.
  */

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


  /*
    Hide all gate cards when GATE OFF.
  */

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


  /*
    Hide cladding setup and summary.
  */

  $("claddingSection")
    ?.classList.toggle(
      "hidden",
      !includeState.cladding
    );


  $("postMaterialsCard")
    ?.classList.toggle(
      "hidden",
      !includeState.posts
    );


  $("claddingMaterialsCard")
    ?.classList.toggle(
      "hidden",
      !includeState.cladding
    );
}


/* ==========================================================
   CLADDING UI
========================================================== */

function updateCladdingUI() {

  if (!includeState.cladding) {
    return;
  }


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
      $("cypressFinish")
        .value !== "Paint"
    );


  $("lospColourWrap")
    .classList.toggle(
      "hidden",
      $("lospFinish")
        .value !== "Paint"
    );
}


/* ==========================================================
   RAIL VISIBILITY
========================================================== */

function updateRailVisibility() {

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
        ".panel-midrail-option"
      )
      ?.classList.toggle(
        "hidden",
        direction !== "vertical"
      );


      const info =
        card.querySelector(
          ".panel-rail-info"
        );


      if (
        !includeState.cladding
      ) {

        info.innerHTML = "";

        return;
      }


      if (
        direction === "horizontal"
      ) {

        info.innerHTML =
          `
          <div class="calculated-line">

            <span>
              Steel rails
            </span>

            <strong>
              None
            </strong>

          </div>
          `;
      }


      else if (
        direction === "vertical"
      ) {

        const midRail =
          card.querySelector(
            ".panel-midrail"
          )?.checked;


        info.innerHTML =
          `
          <div class="calculated-line">

            <span>
              Horizontal rails
            </span>

            <strong>
              ${
                midRail
                  ? "Top + Mid + Bottom"
                  : "Top + Bottom"
              }
            </strong>

          </div>
          `;
      }


      else {

        info.innerHTML = "";
      }
    });
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
      getPostVisibleHeight(card) <= 0
    ) {
      return false;
    }


    if (
      fixing === "brick"
    ) {

      return [
        ...card.querySelectorAll(
          ".hole-position"
        )
      ].some(
        input =>
          num(input.value) > 0
      );
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


  visible.forEach(component => {

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
      `mud-component ${
        componentComplete(component)
          ? "complete"
          : "incomplete"
      }`;


    if (
      selectedComponentId ===
      component.id
    ) {

      button.classList.add(
        "selected"
      );
    }


    button.textContent =
      component.label;


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

        const hingeMarker =
          document.createElement(
            "span"
          );


        hingeMarker.className =
          `mud-hinge ${hinge}`;


        hingeMarker.textContent =
          "H";


        const latchMarker =
          document.createElement(
            "span"
          );


        latchMarker.className =
          `mud-latch ${
            hinge === "left"
              ? "right"
              : "left"
          }`;


        latchMarker.textContent =
          "L";


        button.append(
          hingeMarker,
          latchMarker
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


    wrapper.appendChild(button);


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


    map.appendChild(wrapper);
  });
}


/* ==========================================================
   MOVE / JUMP / REMOVE
========================================================== */

function moveComponent(
  id,
  direction
) {

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
      container.appendChild(card);
    }
  });


  renumberComponents();

  refreshEverything();
}


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


function removeComponent(id) {

  components =
    components.filter(
      component =>
        component.id !== id
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
   POWDER COATING
========================================================== */

function setupPowderUI() {

  const checkbox =
    $("powderEnabled");


  if (!checkbox) {
    return;
  }


  /*
    Hide ugly native checkbox row.
  */

  const oldLabel =
    checkbox.closest(
      ".check-line"
    );


  if (oldLabel) {
    oldLabel.classList.add(
      "hidden"
    );
  }


  let button =
    $("powderToggleBtn");


  if (!button) {

    button =
      document.createElement(
        "button"
      );


    button.id =
      "powderToggleBtn";


    button.type =
      "button";


    button.className =
      "powder-job-toggle";


    const content =
      $("powderOptions")
        ?.parentElement;


    content?.insertBefore(
      button,
      $("powderOptions")
    );
  }


  button.addEventListener(
    "click",
    () => {

      checkbox.checked =
        !checkbox.checked;


      refreshEverything();
    }
  );


  /*
    Old per-component powder list
    is no longer needed.
  */

  $("powderComponentList")
    ?.classList.add(
      "hidden"
    );
}


function powderCostIncGST(
  posts,
  gates,
  panels
) {

  if (
    !$("powderEnabled")
      .checked
  ) {

    return 0;
  }


  let total = 0;


  if (includeState.gate) {

    total +=
      gates.length *
      PRICES.powderCoating
        .gate
        .priceEach;
  }


  if (includeState.posts) {

    const newPosts =
      posts.filter(
        post =>
          post.fixing &&
          post.fixing !==
          "existing"
      );


    total +=
      newPosts.length *
      PRICES.powderCoating
        .post
        .priceEach;
  }


  /*
    Horizontal fixed panels:
    no separate panel powder charge.

    Vertical fixed panels:
    $150 each in addition to posts.
  */

  if (
    includeState.cladding &&
    $("claddingDirection")
      .value === "vertical"
  ) {

    total +=
      panels.length *
      PRICES.powderCoating
        .fixedPanelVertical
        .priceEach;
  }


  return total;
}


function updatePowderUI(
  powderCost
) {

  const enabled =
    $("powderEnabled")
      .checked;


  const button =
    $("powderToggleBtn");


  if (button) {

    button.textContent =
      enabled
        ? "POWDER COATING INCLUDED"
        : "POWDER COATING NOT INCLUDED";


    button.classList.toggle(
      "on",
      enabled
    );


    button.classList.toggle(
      "off",
      !enabled
    );
  }


  $("powderOptions")
    .classList.toggle(
      "hidden",
      !enabled
    );


  $("powderTotalDisplay")
    .textContent =
      money(powderCost);
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

        bins[i] +=
          piece;


        placed =
          true;


        break;
      }
    }


    if (!placed) {

      bins.push(
        piece
      );
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
   CLADDING
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
      costExGST: 0
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
      costExGST: 0
    };
  }


  if (
    type === "custom"
  ) {

    return {

      boards: 0,
      metres: 0,
      stockLengths: 0,
      waste: 0,

      costExGST:
        toExGST(
          num(
            $("customCost")
              .value
          ),
          true
        )
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


  if (
    type === "colorbond"
  ) {

    const areaM2 =
      areas.reduce(
        (sum, area) => {

          return (
            sum +
            area.width / 1000 *
            area.height / 1000
          );
        },
        0
      );


    return {

      boards: 0,
      metres: 0,
      stockLengths: 0,
      waste: 0,

      costExGST:
        toExGST(
          areaM2 *
          num(
            data.pricePerM2
          ),
          data.priceIncludesGST
        )
    };
  }


  const module =
    data.boardWidthMm +
    PRICES.defaults
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
      / 1000;


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

      costExGST:
        toExGST(

          stock.lengths *
          data.pricePerStockLength,

          data.priceIncludesGST
        )
    };
  }


  return {

    boards:
      pieces.length,

    metres,

    stockLengths: 0,

    waste: 0,

    costExGST:
      toExGST(

        metres *
        num(
          data.pricePerLinealM
        ),

        data.priceIncludesGST
      )
  };
}


/* ==========================================================
   LABOUR
========================================================== */

function calculateLabour(
  posts,
  gates,
  panels
) {

  let autoFabrication = 0;
  let autoInstallation = 0;


  if (includeState.gate) {

    autoFabrication +=
      gates.length *
      LABOUR_TIME
        .gateFabricationHours;


    autoInstallation +=
      gates.length *
      LABOUR_TIME
        .hangGateHours;
  }


  if (includeState.posts) {

    posts.forEach(post => {

      if (
        post.fixing &&
        post.fixing !==
        "existing"
      ) {

        autoFabrication +=
          LABOUR_TIME
            .postFabricationHours;
      }


      /*
        Every entered hole:
        +10 minutes labour.
      */

      if (
        post.fixing === "brick"
      ) {

        autoFabrication +=
          post.holes.length *
          LABOUR_TIME
            .holeHours;
      }


      if (post.topHole) {

        autoFabrication +=
          LABOUR_TIME
            .holeHours;
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
          LABOUR_TIME
            .concretePostInstallHours;
      }


      if (
        post.fixing ===
        "baseplate"
      ) {

        autoInstallation +=
          LABOUR_TIME
            .baseplatePostInstallHours;
      }
    });
  }


  /*
    Complete fixed panel:
    2 hours total additional work.

    Covers cladding/cutting/drilling/fixing
    and panel fabrication work.
  */

  autoFabrication +=
    panels.length *
    LABOUR_TIME
      .fixedPanelHours;


  const extraFabrication =
    num(
      $("fabricationHoursOverride")
        ?.value
    );


  const extraInstallation =
    num(
      $("installationHoursOverride")
        ?.value
    );


  const fabricationTotal =
    autoFabrication +
    extraFabrication;


  const installationTotal =
    autoInstallation +
    extraInstallation;


  return {

    autoFabrication,

    autoInstallation,

    extraFabrication,

    extraInstallation,

    fabricationTotal,

    installationTotal,

    totalHours:
      fabricationTotal +
      installationTotal
  };
}


/* ==========================================================
   ADDITIONAL LABOUR UI
========================================================== */

function setupAdditionalLabourUI() {

  const checkbox =
    $("overrideLabour");


  if (!checkbox) {
    return;
  }


  const label =
    checkbox.closest(
      ".check-line"
    );


  if (label) {

    const textNodes =
      [...label.childNodes]
      .filter(
        node =>
          node.nodeType ===
          Node.TEXT_NODE
      );


    textNodes.forEach(
      node =>
        node.remove()
    );


    label.append(
      document.createTextNode(
        " Add additional labour"
      )
    );
  }


  const fabrication =
    $("fabricationHoursOverride")
      ?.closest("label");


  if (fabrication) {

    fabrication.childNodes[0]
      .textContent =
      "Additional fabrication hours ";
  }


  const installation =
    $("installationHoursOverride")
      ?.closest("label");


  if (installation) {

    installation.childNodes[0]
      .textContent =
      "Additional installation hours ";
  }


  let totals =
    $("labourTotalsPanel");


  if (!totals) {

    totals =
      document.createElement(
        "div"
      );


    totals.id =
      "labourTotalsPanel";


    totals.className =
      "labour-totals-panel";


    $("labourOverride")
      ?.insertAdjacentElement(
        "afterend",
        totals
      );
  }
}


function updateLabourDisplay(labour) {

  $("estimatedFabricationHours")
    .textContent =
      `${labour.autoFabrication.toFixed(2)} hrs`;


  $("estimatedInstallationHours")
    .textContent =
      `${labour.autoInstallation.toFixed(2)} hrs`;


  const enabled =
    $("overrideLabour")
      .checked;


  $("labourOverride")
    .classList.toggle(
      "hidden",
      !enabled
    );


  const panel =
    $("labourTotalsPanel");


  if (panel) {

    panel.innerHTML =
      `
      <div>
        <span>
          Auto fabrication
        </span>

        <strong>
          ${labour.autoFabrication.toFixed(2)} hrs
        </strong>
      </div>

      <div>
        <span>
          Additional fabrication
        </span>

        <strong>
          +${labour.extraFabrication.toFixed(2)} hrs
        </strong>
      </div>

      <div class="labour-subtotal">
        <span>
          Fabrication total
        </span>

        <strong>
          ${labour.fabricationTotal.toFixed(2)} hrs
        </strong>
      </div>

      <div>
        <span>
          Auto installation
        </span>

        <strong>
          ${labour.autoInstallation.toFixed(2)} hrs
        </strong>
      </div>

      <div>
        <span>
          Additional installation
        </span>

        <strong>
          +${labour.extraInstallation.toFixed(2)} hrs
        </strong>
      </div>

      <div class="labour-subtotal">
        <span>
          Installation total
        </span>

        <strong>
          ${labour.installationTotal.toFixed(2)} hrs
        </strong>
      </div>

      <div class="labour-grand-total">
        <span>
          TOTAL LABOUR
        </span>

        <strong>
          ${labour.totalHours.toFixed(2)} hrs
        </strong>
      </div>
      `;
  }
}


/* ==========================================================
   STEEL FINISHING
========================================================== */

function steelFinishingCostIncGST(
  frameUsageBySection,
  posts
) {

  if (
    $("powderEnabled")
      .checked
  ) {

    return 0;
  }


  let surfaceArea = 0;


  Object.entries(
    frameUsageBySection
  )
  .forEach(([key, metres]) => {

    const steel =
      PRICES.steel.frame[key];


    if (!steel) {
      return;
    }


    const perimeterM =
      2 *
      (
        steel.widthMm +
        steel.depthMm
      )
      /
      1000;


    surfaceArea +=
      perimeterM *
      metres;
  });


  if (includeState.posts) {

    posts.forEach(post => {

      if (
        !post.cut ||
        post.fixing ===
        "existing"
      ) {
        return;
      }


      const perimeterM =
        2 *
        (
          post.width +
          post.depth
        )
        /
        1000;


      surfaceArea +=
        perimeterM *
        (
          post.cut / 1000
        );
    });
  }


  return (
    surfaceArea *
    PRICES.finishing
      .duragalvTouchUp
      .ratePerM2
  );
}


/* ==========================================================
   MAIN QUOTE CALCULATION
========================================================== */

function calculateQuote() {

  calculateGateDimensions();


  const posts =
    readPosts();


  const gates =
    readGates()
      .filter(
        gate =>
          gate.active
      );


  const panels =
    readPanels();


  /* --------------------------------------------------------
     FRAME STEEL
  -------------------------------------------------------- */

  const frameGroups = {};


  const addFramePiece =
    (
      key,
      metres
    ) => {

      if (
        !metres ||
        metres <= 0
      ) {
        return;
      }


      if (!frameGroups[key]) {

        frameGroups[key] = [];
      }


      frameGroups[key].push(
        metres
      );
    };


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


      addFramePiece(
        key,
        gate.width / 1000
      );

      addFramePiece(
        key,
        gate.width / 1000
      );

      addFramePiece(
        key,
        gate.height / 1000
      );

      addFramePiece(
        key,
        gate.height / 1000
      );


      if (
        includeState.cladding &&
        $("claddingDirection")
          .value === "vertical"
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
          i < gate.hRails;
          i++
        ) {

          addFramePiece(
            key,
            railLength
          );
        }
      }


      if (
        includeState.cladding &&
        $("claddingDirection")
          .value === "horizontal"
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
          i < gate.vRails;
          i++
        ) {

          addFramePiece(
            key,
            railLength
          );
        }
      }
    });
  }


  /*
    Vertical fixed panel:
    top + bottom rails standard.
    Optional centre mid rail.
  */

  if (
    includeState.cladding &&
    $("claddingDirection")
      .value === "vertical"
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


      addFramePiece(
        key,
        panel.width / 1000
      );


      addFramePiece(
        key,
        panel.width / 1000
      );


      if (panel.midRail) {

        addFramePiece(
          key,
          panel.width / 1000
        );
      }
    });
  }


  let frameRequired = 0;
  let frameStockLengths = 0;
  let frameWaste = 0;
  let frameCostExGST = 0;

  const frameUsageBySection = {};


  Object.entries(
    frameGroups
  )
  .forEach(([key, pieces]) => {

    const steel =
      PRICES.steel.frame[key];


    const stock =
      stockPieces(
        pieces,
        steel.stockLengthM
      );


    frameRequired +=
      stock.used;


    frameStockLengths +=
      stock.lengths;


    frameWaste +=
      stock.waste;


    frameUsageBySection[key] =
      stock.used;


    frameCostExGST +=
      stock.lengths *
      toExGST(
        steel.pricePerStockLength,
        steel.priceIncludesGST
      );
  });


  /* --------------------------------------------------------
     POST STEEL
  -------------------------------------------------------- */

  const postGroups = {};


  if (includeState.posts) {

    posts.forEach(post => {

      if (
        !post.cut ||
        post.fixing ===
        "existing"
      ) {
        return;
      }


      if (!postGroups[
        post.steelKey
      ]) {

        postGroups[
          post.steelKey
        ] = [];
      }


      postGroups[
        post.steelKey
      ].push(
        post.cut / 1000
      );
    });
  }


  let postRequired = 0;
  let postStockLengths = 0;
  let postWaste = 0;
  let postSteelCostExGST = 0;

  const postOrder = {};


  Object.entries(
    postGroups
  )
  .forEach(([key, pieces]) => {

    const steel =
      PRICES.steel.posts[key];


    const stock =
      stockPieces(
        pieces,
        steel.stockLengthM
      );


    postRequired +=
      stock.used;


    postStockLengths +=
      stock.lengths;


    postWaste +=
      stock.waste;


    postOrder[key] =
      stock.lengths;


    postSteelCostExGST +=
      stock.lengths *
      toExGST(
        steel.pricePerStockLength,
        steel.priceIncludesGST
      );
  });


  /* --------------------------------------------------------
     FIXINGS
  -------------------------------------------------------- */

  let dynaboltCount = 0;
  let concreteBags = 0;
  let baseplateCount = 0;


  if (includeState.posts) {

    posts.forEach(post => {

      /*
        Every entered brick hole:
        one Dynabolt.
      */

      if (
        post.fixing === "brick"
      ) {

        dynaboltCount +=
          post.holes.length;
      }


      /*
        Optional top hole:
        one Dynabolt.
      */

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
          PRICES.installation
            ?.defaultConcreteBagsPerPost
          || 2;
      }


      if (
        post.fixing ===
        "baseplate"
      ) {

        baseplateCount++;
      }
    });
  }


  const dynaboltsIncGST =
    dynaboltCount *
    PRICES.fixings
      .dynabolt
      .priceEach;


  const concreteBagPrice =
    PRICES.installation
      ?.concreteBagPrice
    || 8;


  const concreteIncGST =
    concreteBags *
    concreteBagPrice;


  /*
    Baseplate $25 already includes
    plate, drilling, welding AND bolts.

    No extra Dynabolts are added.
  */

  const baseplatesIncGST =
    baseplateCount *
    PRICES.fixings
      .baseplate
      .priceEach;


  /* --------------------------------------------------------
     GATE HARDWARE
  -------------------------------------------------------- */

  let hardwareCostExGST = 0;


  if (includeState.gate) {

    gates.forEach(gate => {

      hardwareCostExGST +=
        toExGST(
          PRICES.hardware
            .hinges
            .lockout
            .pricePerSet,

          true
        );


      hardwareCostExGST +=
        toExGST(
          PRICES.fixings
            .screws
            .defaultPerGate,

          true
        );


      if (
        gate.latch === "other"
      ) {

        hardwareCostExGST +=
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

          if (
            latch.priceIncludesGST
          ) {

            hardwareCostExGST +=
              toExGST(
                latch.price,
                true
              );
          }

          else {

            hardwareCostExGST +=
              num(
                latch.priceExGST
              );
          }
        }
      }
    });
  }


  /*
    Fixed panel screws / fixings:
    $10 per panel.
  */

  const panelScrewsIncGST =
    includeState.cladding

      ? panels.length *
        PRICES.fixings
          .screws
          .defaultPerGate

      : 0;


  /* --------------------------------------------------------
     CLADDING
  -------------------------------------------------------- */

  const cladding =
    calculateCladding(
      gates,
      panels
    );


  /* --------------------------------------------------------
     POWDER COATING
  -------------------------------------------------------- */

  const powderIncGST =
    powderCostIncGST(
      posts,
      gates,
      panels
    );


  updatePowderUI(
    powderIncGST
  );


  /* --------------------------------------------------------
     NON-PC STEEL TOUCH-UP
  -------------------------------------------------------- */

  const finishingIncGST =
    steelFinishingCostIncGST(
      frameUsageBySection,
      posts
    );


  /* --------------------------------------------------------
     MATERIALS
  -------------------------------------------------------- */

  const materialsExGST =

    frameCostExGST +

    postSteelCostExGST +

    toExGST(
      dynaboltsIncGST,
      true
    ) +

    toExGST(
      concreteIncGST,
      true
    ) +

    toExGST(
      baseplatesIncGST,
      true
    ) +

    hardwareCostExGST +

    toExGST(
      panelScrewsIncGST,
      true
    ) +

    cladding.costExGST +

    toExGST(
      powderIncGST,
      true
    ) +

    toExGST(
      finishingIncGST,
      true
    ) +

    toExGST(
      num(
        $("extraHardware")
          .value
      ),
      true
    );


  /* --------------------------------------------------------
     LABOUR
  -------------------------------------------------------- */

  const labour =
    calculateLabour(
      posts,
      gates,
      panels
    );


  updateLabourDisplay(
    labour
  );


  const labourCostExGST =
    labour.totalHours *
    PRICES.business
      .labourRate;


  /* --------------------------------------------------------
     TRAVEL
  -------------------------------------------------------- */

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


  const travelCostExGST =

    chargeableOneWay *

    2 *

    PRICES.business
      .travelRatePerKm;


  /* --------------------------------------------------------
     OTHER COSTS
  -------------------------------------------------------- */

  const otherCostExGST =
    toExGST(
      num(
        $("otherCosts")
          .value
      ),
      true
    );


  /* --------------------------------------------------------
     MARKUP
  -------------------------------------------------------- */

  const markup =
    materialsExGST *
    PRICES.business
      .materialMarkup;


  /* --------------------------------------------------------
     TOTAL
  -------------------------------------------------------- */

  const calculatedExGST =

    materialsExGST +

    labourCostExGST +

    travelCostExGST +

    otherCostExGST +

    markup;


  const calculatedGST =
    calculatedExGST *
    PRICES.business.gst;


  const calculatedIncGST =
    calculatedExGST +
    calculatedGST;


  const finalPrice =
    roundQuote(
      calculatedIncGST
    );


  $("finalPrice").value =
    finalPrice;


  /* --------------------------------------------------------
     DISPLAY
  -------------------------------------------------------- */

  $("frameMetres")
    .textContent =
      `${frameRequired.toFixed(2)} m`;


  $("frameLengths")
    .textContent =
      frameStockLengths;


  $("frameWaste")
    .textContent =
      `${frameWaste.toFixed(2)} m`;


  $("postMetres")
    .textContent =
      `${postRequired.toFixed(2)} m`;


  $("postLengths")
    .textContent =
      postStockLengths;


  $("postWaste")
    .textContent =
      `${postWaste.toFixed(2)} m`;


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
      money(labourCostExGST);


  $("travelTotal")
    .textContent =
      money(travelCostExGST);


  $("markupTotal")
    .textContent =
      money(markup);


  $("gstTotal")
    .textContent =
      money(calculatedGST);


  lastCalculation = {

    posts,
    gates,
    panels,

    frameRequired,
    frameStockLengths,
    frameWaste,
    frameGroups,

    postRequired,
    postStockLengths,
    postWaste,
    postOrder,

    dynaboltCount,
    concreteBags,
    baseplateCount,

    cladding,

    powderIncGST,
    finishingIncGST,

    labour,

    materialsExGST,
    labourCostExGST,
    travelCostExGST,
    otherCostExGST,
    markup,

    calculatedExGST,
    calculatedGST,
    calculatedIncGST,

    finalPrice
  };


  updateFinalDisplays();

  updateConsumables();

  updateFabrication();

  updateLayoutCheck();
}


/* ==========================================================
   FINAL PRICE DISPLAY
========================================================== */

function updateFinalDisplays() {

  if (!lastCalculation) {
    return;
  }


  const finalIncGST =
    lastCalculation.finalPrice;


  const finalExGST =
    finalIncGST /
    (
      1 +
      PRICES.business.gst
    );


  const finalGST =
    finalIncGST -
    finalExGST;


  const actualCosts =

    lastCalculation
      .materialsExGST +

    lastCalculation
      .labourCostExGST +

    lastCalculation
      .travelCostExGST +

    lastCalculation
      .otherCostExGST;


  const profit =
    finalExGST -
    actualCosts;


  $("profitTotal")
    .textContent =
      money(profit);


  $("quoteExGstDisplay")
    .textContent =
      money(finalExGST);


  $("quoteGstDisplay")
    .textContent =
      money(finalGST);


  $("quoteTotalDisplay")
    .textContent =
      money(finalIncGST);


  const projectArea =
    [

      ...lastCalculation.gates,

      ...lastCalculation.panels

    ]
    .reduce(
      (sum, item) => {

        return (
          sum +
          item.width / 1000 *
          item.height / 1000
        );
      },
      0
    );


  $("effectiveRate")
    .textContent =
      projectArea
        ? `${money(
            finalIncGST /
            projectArea
          )}/m²`
        : "N/A";


  buildQuote();
}


/* ==========================================================
   CONSUMABLES / ORDER LIST
========================================================== */

function updateConsumables() {

  if (!lastCalculation) {
    return;
  }


  const lines = [];


  /*
    FRAME STEEL
  */

  Object.entries(
    lastCalculation
      .frameGroups
  )
  .forEach(([key, pieces]) => {

    const steel =
      PRICES.steel.frame[key];


    const stock =
      stockPieces(
        pieces,
        steel.stockLengthM
      );


    if (stock.lengths) {

      lines.push(
        `
        <div>

          <span>
            ${steel.label}
          </span>

          <strong>
            ${stock.lengths}
            ×
            ${steel.stockLengthM}m length
          </strong>

        </div>
        `
      );
    }
  });


  /*
    POST STEEL
  */

  Object.entries(
    lastCalculation
      .postOrder
  )
  .forEach(([key, count]) => {

    if (!count) {
      return;
    }


    const steel =
      PRICES.steel.posts[key];


    lines.push(
      `
      <div>

        <span>
          ${steel.label}
        </span>

        <strong>
          ${count}
          ×
          ${steel.stockLengthM}m length
        </strong>

      </div>
      `
    );
  });


  /*
    CLADDING
  */

  if (
    includeState.cladding
  ) {

    const type =
      $("claddingType").value;


    const material =
      PRICES.cladding[type];


    if (
      lastCalculation
        .cladding
        .stockLengths > 0
    ) {

      lines.push(
        `
        <div>

          <span>
            ${material.label}
          </span>

          <strong>
            ${
              lastCalculation
                .cladding
                .stockLengths
            }
            stock lengths
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

      lines.push(
        `
        <div>

          <span>
            ${material.label}
          </span>

          <strong>
            ${
              lastCalculation
                .cladding
                .metres
                .toFixed(2)
            } lm
          </strong>

        </div>
        `
      );
    }
  }


  /*
    DYNABOLTS
  */

  if (
    lastCalculation
      .dynaboltCount
  ) {

    lines.push(
      `
      <div>

        <span>
          75x10mm Dynabolts
        </span>

        <strong>
          ${
            lastCalculation
              .dynaboltCount
          }
        </strong>

      </div>
      `
    );
  }


  /*
    CONCRETE
  */

  if (
    lastCalculation
      .concreteBags
  ) {

    lines.push(
      `
      <div>

        <span>
          Concrete
        </span>

        <strong>
          ${
            lastCalculation
              .concreteBags
          } bags
        </strong>

      </div>
      `
    );
  }


  /*
    BASEPLATES
  */

  if (
    lastCalculation
      .baseplateCount
  ) {

    lines.push(
      `
      <div>

        <span>
          Fabricated baseplates
        </span>

        <strong>
          ${
            lastCalculation
              .baseplateCount
          }
        </strong>

      </div>
      `
    );
  }


  /*
    GATE HARDWARE
  */

  if (includeState.gate) {

    lastCalculation.gates
      .forEach(gate => {

        lines.push(
          `
          <div>

            <span>
              ${gate.label} hinges
            </span>

            <strong>
              1 set Lock-out galvanised,
              ${
                gate.hinge
                  ? gate.hinge
                      .toUpperCase()
                  : "SIDE TBC"
              }
            </strong>

          </div>
          `
        );


        const latchName =
          gate.latch === "other"

            ? (
                gate.otherLatch ||
                "Other latch"
              )

            : (
                PRICES.hardware
                  .latches[
                    gate.latch
                  ]?.label
                || ""
              );


        lines.push(
          `
          <div>

            <span>
              ${gate.label} latch
            </span>

            <strong>
              ${latchName}
            </strong>

          </div>
          `
        );
      });


    if (
      lastCalculation
        .gates.length > 1
    ) {

      lines.push(
        `
        <div>

          <span>
            Latch keys
          </span>

          <strong>
            Key alike where required
          </strong>

        </div>
        `
      );
    }
  }


  /*
    SCREWS
  */

  const screwJobs =
    (
      includeState.gate
        ? lastCalculation
            .gates.length
        : 0
    )
    +
    (
      includeState.cladding
        ? lastCalculation
            .panels.length
        : 0
    );


  if (screwJobs) {

    lines.push(
      `
      <div>

        <span>
          Cladding screws / fixings
        </span>

        <strong>
          ${screwJobs}
          job allowance
        </strong>

      </div>
      `
    );
  }


  /*
    POWDER COAT
  */

  if (
    $("powderEnabled")
      .checked
  ) {

    lines.push(
      `
      <div>

        <span>
          Powder coat
        </span>

        <strong>
          ${$("powderColour").value}
        </strong>

      </div>
      `
    );
  }


  $("consumablesList")
    .innerHTML =
      lines.length

        ? lines.join("")

        : `
          <p class="muted">
            No materials calculated yet.
          </p>
          `;
}


/* ==========================================================
   FABRICATION VIEW
========================================================== */

function updateFabrication() {

  if (!lastCalculation) {
    return;
  }


  const lines = [];


  if (includeState.posts) {

    lastCalculation.posts
      .forEach(post => {

        lines.push(
          `
          <div class="fabrication-item">

            <strong>
              ${post.label}
            </strong>

            <span>
              ${post.steelLabel}
            </span>

            <span>
              Finished height:
              ${post.visibleHeight || "-"} mm
            </span>

            ${
              post.cut
                ? `
                  <span>
                    CUT:
                    ${post.cut} mm
                  </span>
                  `
                : ""
            }

            ${
              post.fixing === "brick"
                ? `
                  <span>
                    Holes:
                    ${
                      post.holes.length
                        ? post.holes.join(" / ")
                        : "TBC"
                    }
                    mm from top
                  </span>
                  `
                : ""
            }

            ${
              post.topHole
                ? `
                  <span>
                    Top bolt hole:
                    ${post.topHole}
                    mm from top
                  </span>
                  `
                : ""
            }

          </div>
          `
        );
      });
  }


  if (includeState.gate) {

    lastCalculation.gates
      .forEach(gate => {

        lines.push(
          `
          <div class="fabrication-item">

            <strong>
              ${gate.label}
            </strong>

            <span>
              ${gate.width}
              ×
              ${gate.height} mm
            </span>

            <span>
              ${
                gate.widthMode ===
                "manual"
                  ? "Manual width"
                  : "Auto width"
              }
            </span>

            <span>
              Hinge:
              ${
                gate.hinge
                  ? gate.hinge
                      .toUpperCase()
                  : "-"
              }
            </span>

            <span>
              Opens:
              ${gate.opens || "-"}
            </span>

          </div>
          `
        );
      });
  }


  lastCalculation.panels
    .forEach(panel => {

      lines.push(
        `
        <div class="fabrication-item">

          <strong>
            ${panel.label}
          </strong>

          <span>
            ${panel.width}
            ×
            ${panel.height} mm
          </span>

          ${
            $("claddingDirection")
              .value === "vertical"
              ? `
                <span>
                  Rails:
                  ${
                    panel.midRail
                      ? "Top / Mid / Bottom"
                      : "Top / Bottom"
                  }
                </span>
                `
              : ""
          }

        </div>
        `
      );
    });


  $("fabricationView")
    .innerHTML =
      lines.join("");
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


  const visible =
    activeComponents();


  const posts =
    readPosts();


  const gates =
    readGates()
      .filter(
        gate =>
          gate.active
      );


  const panels =
    readPanels();


  const postWidth =
    includeState.posts

      ? posts.reduce(
          (sum, post) => {

            if (
              post.fixing ===
              "existing"
            ) {
              return sum;
            }

            return sum +
              post.width;
          },
          0
        )

      : 0;


  const gateWidth =
    gates.reduce(
      (sum, gate) =>
        sum + gate.width,
      0
    );


  const panelWidth =
    panels.reduce(
      (sum, panel) =>
        sum + panel.width,
      0
    );


  const gaps =
    Math.max(
      0,
      visible.length - 1
    ) *
    PRICES.defaults
      .componentGapMm;


  const layoutWidth =

    postWidth +
    gateWidth +
    panelWidth +
    gaps;


  const difference =
    cavity -
    layoutWidth;


  if (
    Math.abs(
      difference
    ) <= 2
  ) {

    $("layoutCheck")
      .className =
        "layout-check complete";


    $("layoutCheck")
      .textContent =
        `✓ ${cavity} mm cavity = ${Math.round(layoutWidth)} mm layout`;
  }


  else if (
    difference < 0
  ) {

    $("layoutCheck")
      .className =
        "layout-check error";


    $("layoutCheck")
      .textContent =
        `Layout exceeds cavity by ${Math.abs(Math.round(difference))} mm`;
  }


  else {

    $("layoutCheck")
      .className =
        "layout-check incomplete";


    $("layoutCheck")
      .textContent =
        `${Math.round(difference)} mm unallocated`;
  }
}


/* ==========================================================
   CLADDING DESCRIPTION
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


  if (
    type === "ekodeck"
  ) {

    text +=
      `, ${$("ekodeckColour").value}`;
  }


  if (
    type === "cypressPickets"
  ) {

    text +=
      `, ${$("cypressFinish").value}`;


    if (
      $("cypressFinish")
        .value === "Paint"
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
      $("lospFinish")
        .value === "Paint"
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
    type === "colorbond"
  ) {

    text +=
      `, ${$("colorbondProfile").value}`;

    text +=
      `, ${$("colorbondColour").value}`;
  }


  if (
    type === "custom"
  ) {

    text =
      $("customDescription")
        .value
      ||
      "Custom cladding";
  }


  if (
    $("claddingDirection").value
  ) {

    text +=
      `, ${$("claddingDirection").value}`;
  }


  return text;
}


/* ==========================================================
   CLIENT QUOTE
========================================================== */

function buildQuote() {

  if (!lastCalculation) {
    return;
  }


  const html = [];


  html.push(
    `
    <p>

      <strong>
        Quote
        ${$("projectNumber").value}
      </strong>

    </p>

    <p>

      ${$("clientName").value}

      <br>

      ${$("siteAddress").value}

    </p>
    `
  );


  if (includeState.gate) {

    lastCalculation.gates
      .forEach(gate => {

        const latchName =
          gate.latch === "other"

            ? (
                gate.otherLatch ||
                "Other latch"
              )

            : (
                PRICES.hardware
                  .latches[
                    gate.latch
                  ]?.label
                || ""
              );


        html.push(
          `
          <p>

            <strong>
              ${gate.label}:
            </strong>

            ${gate.width}
            ×
            ${gate.height} mm.

            Hinge
            ${gate.hinge || "TBC"},

            open
            ${gate.opens || "TBC"}.

            ${latchName}.

          </p>
          `
        );
      });
  }


  lastCalculation.panels
    .forEach(panel => {

      html.push(
        `
        <p>

          <strong>
            ${panel.label}:
          </strong>

          ${panel.width}
          ×
          ${panel.height} mm.

        </p>
        `
      );
    });


  if (
    includeState.cladding
  ) {

    html.push(
      `
      <p>

        <strong>
          Cladding:
        </strong>

        ${claddingDescription()}

      </p>
      `
    );
  }


  if (
    $("powderEnabled")
      .checked
  ) {

    html.push(
      `
      <p>

        <strong>
          Powder coating:
        </strong>

        ${$("powderColour").value}.

        Allow approximately 2 weeks
        for processing.

      </p>
      `
    );
  }


  else {

    html.push(
      `
      <p>
        ${
          PRICES.quote
            .standardSteelFinish
        }
      </p>
      `
    );
  }


  /*
    Deposit note deliberately NOT inserted here.

    It appears once only in the
    Finished Quote footer.
  */


  $("quoteDescription")
    .innerHTML =
      html.join("");
}


/* ==========================================================
   HEADER
========================================================== */

function updateHeader() {

  $("topClientName")
    .textContent =
      $("clientName").value ||
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


    card.classList.toggle(
      "complete",
      complete
    );


    card.classList.toggle(
      "incomplete",
      !complete
    );


    const status =
      card.querySelector(
        ".component-status"
      );


    if (status) {

      status.textContent =
        complete
          ? "COMPLETE"
          : "INCOMPLETE";
    }
  });
}


/* ==========================================================
   SERIALISE CURRENT JOB
========================================================== */

function serializeCurrentJob() {

  const componentData =
    components.map(component => {

      const card =
        document.querySelector(
          `[data-component-id="${component.id}"]`
        );


      if (
        component.type === "post"
      ) {

        return {

          type:
            "post",

          steelKey:
            card.querySelector(
              ".post-size"
            ).value,

          fixing:
            card.querySelector(
              ".post-fixing"
            ).value,

          overrideHeight:
            card.querySelector(
              ".post-height-override-enabled"
            ).checked,

          overrideHeightValue:
            card.querySelector(
              ".post-height-override"
            ).value,

          holes:
            [
              ...card.querySelectorAll(
                ".hole-position"
              )
            ]
            .map(
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


      if (
        component.type === "gate"
      ) {

        return {

          type:
            "gate",

          widthMode:
            card.dataset
              .widthMode ||
            "auto",

          manualWidth:
            card.querySelector(
              ".gate-manual-width"
            )?.value || "",

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

        type:
          "panel",

        width:
          card.querySelector(
            ".panel-width"
          ).value,

        height:
          card.querySelector(
            ".panel-height"
          ).value,

        midRail:
          Boolean(
            card.querySelector(
              ".panel-midrail"
            )?.checked
          )
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

      colorbondProfile:
        $("colorbondProfile").value,

      colorbondColour:
        $("colorbondColour").value,

      customDescription:
        $("customDescription").value,

      customCost:
        $("customCost").value
    },

    powderEnabled:
      $("powderEnabled").checked,

    powderColour:
      $("powderColour").value,

    additionalLabour: {

      enabled:
        $("overrideLabour").checked,

      fabrication:
        $("fabricationHoursOverride")
          .value,

      installation:
        $("installationHoursOverride")
          .value
    },

    travelKm:
      $("travelKm").value,

    extraHardware:
      $("extraHardware").value,

    otherCosts:
      $("otherCosts").value,

    components:
      componentData,

    finalPrice:
      lastCalculation
        ?.finalPrice
      || 0,

    updatedAt:
      new Date()
        .toISOString()
  };
}


/* ==========================================================
   AUTOSAVE
========================================================== */

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


  setSavedJobs(jobs);


  localStorage.setItem(
    "jtlaActiveProject",
    job.project
  );


  renderSavedJobs();
}


/* ==========================================================
   RESTORE JOB
========================================================== */

function loadJob(
  projectNumber
) {

  const jobs =
    getSavedJobs();


  const job =
    jobs[
      projectNumber
    ];


  if (!job) {
    return;
  }


  restoringJob = true;


  /*
    Clear current components.
  */

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
        then use the sticky map to jump
        to each one.
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


  includeState = {

    gate:
      job.includeState
        ?.gate
      ??
      true,

    posts:
      job.includeState
        ?.posts
      ??
      true,

    cladding:
      job.includeState
        ?.cladding
      ??
      true
  };


  const cladding =
    job.cladding || {};


  $("claddingType").value =
    cladding.type ||
    "ekodeck";


  $("claddingDirection").value =
    cladding.direction ||
    "";


  $("ekodeckColour").value =
    cladding.ekodeckColour ||
    $("ekodeckColour").value;


  $("cypressFinish").value =
    cladding.cypressFinish ||
    "Raw";


  $("cypressColour").value =
    cladding.cypressColour ||
    "";


  $("lospFinish").value =
    cladding.lospFinish ||
    "Primed";


  $("lospColour").value =
    cladding.lospColour ||
    "";


  $("merbauFinish").value =
    cladding.merbauFinish ||
    "Raw";


  $("colorbondProfile").value =
    cladding.colorbondProfile ||
    $("colorbondProfile").value;


  if (
    cladding.colorbondColour
  ) {

    $("colorbondColour").value =
      cladding.colorbondColour;
  }


  $("customDescription").value =
    cladding.customDescription ||
    "";


  $("customCost").value =
    cladding.customCost || "";


  $("powderEnabled").checked =
    Boolean(
      job.powderEnabled
    );


  if (
    job.powderColour
  ) {

    $("powderColour").value =
      job.powderColour;
  }


  const additional =
    job.additionalLabour || {};


  $("overrideLabour").checked =
    Boolean(
      additional.enabled
    );


  $("fabricationHoursOverride")
    .value =
      additional.fabrication ||
      "";


  $("installationHoursOverride")
    .value =
      additional.installation ||
      "";


  $("travelKm").value =
    job.travelKm || "";


  $("extraHardware").value =
    job.extraHardware || "";


  $("otherCosts").value =
    job.otherCosts || "";


  (
    job.components || []
  )
  .forEach(savedComponent => {

    addComponent(
      savedComponent.type,
      savedComponent
    );
  });


  localStorage.setItem(
    "jtlaActiveProject",
    job.project
  );


  restoringJob = false;


  refreshEverything();
}


/* ==========================================================
   NEW JOB
========================================================== */

function newJob() {

  /*
    Current job is already autosaved.
  */

  const next =
    getNextProjectNumber();


  localStorage.setItem(
    "jtlaActiveProject",
    next
  );


  components = [];

  componentCounter = 0;

  selectedComponentId = null;

  lastCalculation = null;


  $("componentsContainer")
    .innerHTML =
      `
      <p
        id="noComponentsMessage"
        class="muted"
      >
        Add the job components above,
        then use the sticky map to jump
        to each one.
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


  includeState = {

    gate: true,
    posts: true,
    cladding: true
  };


  $("claddingType").value =
    "ekodeck";


  $("claddingDirection").value =
    "";


  $("powderEnabled").checked =
    false;


  $("overrideLabour").checked =
    false;


  $("fabricationHoursOverride")
    .value =
      "";


  $("installationHoursOverride")
    .value =
      "";


  $("travelKm").value =
    "";


  $("extraHardware").value =
    "";


  $("otherCosts").value =
    "";


  refreshEverything();
}


/* ==========================================================
   DELETE SAVED JOB
========================================================== */

function deleteSavedJob(project) {

  if (
    !confirm(
      `Delete saved job ${project}?`
    )
  ) {
    return;
  }


  const jobs =
    getSavedJobs();


  delete jobs[project];


  setSavedJobs(jobs);


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


    newJob();

    return;
  }


  renderSavedJobs();
}


/* ==========================================================
   SAVED JOBS UI
========================================================== */

function setupSavedJobsUI() {

  if ($("savedJobsSection")) {
    return;
  }


  const section =
    document.createElement(
      "details"
    );


  section.id =
    "savedJobsSection";


  section.className =
    "card saved-jobs-card";


  section.innerHTML =
    `
    <summary>
      Saved Jobs
    </summary>

    <div
      id="savedJobsList"
      class="card-content saved-jobs-list"
    >
    </div>
    `;


  const actions =
    document.querySelector(
      ".actions"
    );


  actions?.insertAdjacentElement(
    "afterend",
    section
  );


  renderSavedJobs();
}


function renderSavedJobs() {

  const list =
    $("savedJobsList");


  if (!list) {
    return;
  }


  const jobs =
    getSavedJobs();


  const projectNumbers =
    Object.keys(jobs)
      .sort()
      .reverse();


  if (!projectNumbers.length) {

    list.innerHTML =
      `
      <p class="muted">
        No saved jobs yet.
      </p>
      `;

    return;
  }


  list.innerHTML = "";


  projectNumbers
    .forEach(project => {

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
            ${
              job.clientName ||
              "Unnamed client"
            }
          </span>

          <small>
            ${
              job.finalPrice
                ? money(
                    job.finalPrice
                  )
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


      list.appendChild(row);
    });
}


/* ==========================================================
   SMS
========================================================== */

function sendSMS() {

  refreshEverything();


  const text =

    `Hi ${$("clientName").value}, ` +

    `JTLA Gates quote ${$("projectNumber").value}: ` +

    `${$("quoteTotalDisplay").textContent} incl GST. ` +

    `50% deposit on acceptance, balance on completion. ` +

    `Regards, Jody Tuuta 0439 517 783`;


  location.href =

    `sms:${rawPhone()}` +

    `?body=${encodeURIComponent(text)}`;
}


/* ==========================================================
   EMAIL
========================================================== */

function sendEmail() {

  refreshEverything();


  const subject =
    `JTLA Gates Quote ${$("projectNumber").value}`;


  const body =

    $("quoteDescription")
      .innerText +

    `\n\nPrice ex GST: ` +
    $("quoteExGstDisplay")
      .textContent +

    `\nGST: ` +
    $("quoteGstDisplay")
      .textContent +

    `\nTOTAL INC GST: ` +
    $("quoteTotalDisplay")
      .textContent +

    `\n\n50% deposit required on acceptance. ` +
    `Balance payable on completion.` +

    `\n\nRegards,\n` +
    `Jody Tuuta\n` +
    `JTLA Gates\n` +
    `0439 517 783`;


  location.href =

    `mailto:${$("clientEmail").value}` +

    `?bcc=${encodeURIComponent(
      "jtladesign@gmail.com"
    )}` +

    `&subject=${encodeURIComponent(
      subject
    )}` +

    `&body=${encodeURIComponent(
      body
    )}`;
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


    updateIncludeUI();

    updateCladdingUI();

    updateRailVisibility();

    calculateGateDimensions();

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
   PHONE FIELD
========================================================== */

function setupPhoneField() {

  const phone =
    $("clientPhone");


  if (!phone) {
    return;
  }


  if (!phone.value) {

    phone.value =
      "04";
  }


  phone.addEventListener(
    "focus",
    () => {

      if (
        !phone.value.startsWith(
          "04"
        )
      ) {

        phone.value =
          "04";
      }


      const end =
        phone.value.length;


      phone.setSelectionRange(
        end,
        end
      );
    }
  );


  phone.addEventListener(
    "input",
    () => {

      let digits =
        phone.value
          .replace(/\D/g, "");


      if (
        !digits.startsWith(
          "04"
        )
      ) {

        digits =
          "04" +
          digits
            .replace(
              /^0*4?/,
              ""
            );
      }


      phone.value =
        digits.slice(
          0,
          10
        );
    }
  );


  phone.addEventListener(
    "blur",
    () => {

      if (
        phone.value.length <
        2
      ) {

        phone.value =
          "04";
      }
    }
  );
}


/* ==========================================================
   CLIENT TEXT FORMAT
========================================================== */

function setupClientTextFields() {

  [
    "clientName",
    "siteAddress"
  ]
  .forEach(id => {

    const field =
      $(id);


    field.addEventListener(
      "blur",
      () => {

        field.value =
          capitaliseWords(
            field.value
          );


        refreshEverything();
      }
    );
  });
}


/* ==========================================================
   GLOBAL LIVE UPDATE
========================================================== */

function setupLiveUpdates() {

  document.addEventListener(
    "input",
    event => {

      if (
        event.target.closest(
          "#savedJobsSection"
        )
      ) {
        return;
      }


      refreshEverything();
    }
  );


  document.addEventListener(
    "change",
    event => {

      if (
        event.target.closest(
          "#savedJobsSection"
        )
      ) {
        return;
      }


      refreshEverything();
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


    /*
      Remove old UPDATE button.

      Everything now recalculates and
      autosaves live.
    */

    $("updateBtn")
      ?.remove();


    setupPhoneField();

    setupClientTextFields();

    setupPowderUI();

    setupAdditionalLabourUI();

    setupSavedJobsUI();


    /*
      Project number.
    */

    $("projectNumber").value =
      getCurrentProjectNumber();


    /*
      Add components.
    */

    $("addPostBtn")
      .addEventListener(
        "click",
        () =>
          addComponent(
            "post"
          )
      );


    $("addGateBtn")
      .addEventListener(
        "click",
        () =>
          addComponent(
            "gate"
          )
      );


    $("addPanelBtn")
      .addEventListener(
        "click",
        () =>
          addComponent(
            "panel"
          )
      );


    /*
      GATE ON/OFF
    */

    $("includeFrameBtn")
      .addEventListener(
        "click",
        () => {

          includeState.gate =
            !includeState.gate;


          refreshEverything();
        }
      );


    /*
      POSTS ON/OFF
    */

    $("includePostsBtn")
      .addEventListener(
        "click",
        () => {

          includeState.posts =
            !includeState.posts;


          refreshEverything();
        }
      );


    /*
      CLADDING ON/OFF
    */

    $("includeCladdingBtn")
      .addEventListener(
        "click",
        () => {

          includeState.cladding =
            !includeState.cladding;


          refreshEverything();
        }
      );


    /*
      Additional labour.
    */

    $("overrideLabour")
      .addEventListener(
        "change",
        () => {

          if (
            !$("overrideLabour")
              .checked
          ) {

            $("fabricationHoursOverride")
              .value =
              "";

            $("installationHoursOverride")
              .value =
              "";
          }


          refreshEverything();
        }
      );


    /*
      New job.
    */

    $("newJobBtn")
      .addEventListener(
        "click",
        newJob
      );


    /*
      Save button becomes manual
      reassurance only.
      Autosave already happens.
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


    /*
      Restore active saved project.
    */

    const activeProject =
      localStorage.getItem(
        "jtlaActiveProject"
      );


    const jobs =
      getSavedJobs();


    if (
      activeProject &&
      jobs[activeProject]
    ) {

      loadJob(
        activeProject
      );
    }


    else {

      setupLiveUpdates();

      refreshEverything();
    }


    /*
      If loadJob was used, attach
      live events afterwards.
    */

    if (
      activeProject &&
      jobs[activeProject]
    ) {

      setupLiveUpdates();
    }


    updateHeader();

    renderSavedJobs();
  }
);
