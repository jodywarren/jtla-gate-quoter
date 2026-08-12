// ============================================================
// JTLA GATE QUOTER
// V1.5
// app.js
// ============================================================

const $ = (id) => document.getElementById(id);

let components = [];
let componentCounter = 0;
let lastCalculation = null;
let currentQuoteText = "";
let includeState = {
  frame: true,
  posts: true,
  cladding: true
};


// ============================================================
// HELPERS
// ============================================================

function money(value) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD"
  }).format(Number(value || 0));
}

function toExGST(value, includesGST) {
  const amount = Number(value || 0);

  if (!includesGST) {
    return amount;
  }

  return amount / (1 + PRICES.business.gst);
}

function roundUp(value, increment) {
  if (!increment || increment <= 0) {
    return value;
  }

  return Math.ceil(value / increment) * increment;
}

function formatProjectNumber(value) {
  return String(value).padStart(
    PRICES.projectNumbers.digits,
    "0"
  );
}

function getNextProjectNumber() {
  const stored = localStorage.getItem(
    "jtlaNextProjectNumber"
  );

  const next = stored
    ? Number(stored)
    : PRICES.projectNumbers.startingNumber;

  return formatProjectNumber(next);
}

function advanceProjectNumber() {
  const current = Number(
    $("projectNumber").value || 0
  );

  if (!current) {
    return;
  }

  localStorage.setItem(
    "jtlaNextProjectNumber",
    String(current + 1)
  );
}

function getComponentById(id) {
  return components.find(
    (component) => component.id === id
  );
}

function componentLabel(type, index) {
  if (type === "post") {
    return `P${index}`;
  }

  if (type === "gate") {
    return `G${index}`;
  }

  return `FP${index}`;
}

function safeNumber(value) {
  return Number(value || 0);
}


// ============================================================
// CUSTOMER
// ============================================================

function updateCustomerHeader() {
  const customer =
    $("customerName").value.trim();

  const project =
    $("projectNumber").value.trim();

  $("stickyCustomerName").textContent =
    customer || "New Job";

  $("stickyProjectNumber").textContent =
    project || getNextProjectNumber();

  $("quoteProjectNumber").textContent =
    project;

  $("quoteCustomerName").textContent =
    customer;

  $("quoteCustomerAddress").textContent =
    $("siteAddress").value.trim();
}

function validateRequiredFields() {
  document
    .querySelectorAll(
      ".required-field input"
    )
    .forEach((input) => {
      let valid = false;

      if (input.id === "projectNumber") {
        valid =
          /^[0-9]{6}$/.test(
            input.value.trim()
          );
      }

      else if (
        input.id === "customerEmail"
      ) {
        valid =
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            .test(input.value.trim());
      }

      else if (
        input.id === "customerPhone"
      ) {
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
// INCLUDE BUTTONS
// ============================================================

function setupIncludeButton(id, key) {
  $(id).addEventListener(
    "click",
    () => {
      includeState[key] =
        !includeState[key];

      updateIncludeButton(
        id,
        key
      );

      calculateQuote();
    }
  );
}

function updateIncludeButton(id, key) {
  const button = $(id);
  const on = includeState[key];

  button.classList.toggle(
    "on",
    on
  );

  button.classList.toggle(
    "off",
    !on
  );

  button.textContent =
    `${key.toUpperCase()} ${on ? "ON" : "OFF"}`;
}


// ============================================================
// COMPONENT CREATION
// ============================================================

function addComponent(type) {
  componentCounter++;

  const component = {
    id: `component-${componentCounter}`,
    type,
    order: components.length
  };

  components.push(component);

  renderComponentCard(component);
  renumberComponents();
  renderMudMap();
  calculateQuote();
}

function renderComponentCard(component) {
  const template =
    $("componentTemplate");

  const fragment =
    template.content.cloneNode(true);

  const card =
    fragment.querySelector(
      ".component-card"
    );

  card.dataset.componentId =
    component.id;

  card.dataset.componentType =
    component.type;

  const fields =
    fragment.querySelector(
      ".component-fields"
    );

  if (component.type === "post") {
    fields.appendChild(
      $("postEditorTemplate")
        .content.cloneNode(true)
    );
  }

  else if (
    component.type === "gate"
  ) {
    fields.appendChild(
      $("gateEditorTemplate")
        .content.cloneNode(true)
    );
  }

  else {
    fields.appendChild(
      $("panelEditorTemplate")
        .content.cloneNode(true)
    );
  }

  $("componentsContainer")
    .appendChild(fragment);

  const inserted =
    $("componentsContainer")
      .lastElementChild;

  setupComponentCard(
    inserted,
    component
  );
}


// ============================================================
// COMPONENT CARD SETUP
// ============================================================

function setupComponentCard(
  card,
  component
) {
  card
    .querySelector(
      ".remove-component-btn"
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
    setupPostEditor(
      card,
      component
    );
  }

  else if (
    component.type === "gate"
  ) {
    setupGateEditor(
      card,
      component
    );
  }

  else {
    setupPanelEditor(
      card,
      component
    );
  }

  card
    .querySelectorAll(
      "input, select, textarea"
    )
    .forEach((element) => {
      element.addEventListener(
        "input",
        () => {
          handleComponentChange(
            component.id
          );
        }
      );

      element.addEventListener(
        "change",
        () => {
          handleComponentChange(
            component.id
          );
        }
      );
    });
}

function handleComponentChange(id) {
  propagateFirstPostHeight();
  updateAllConditionalFields();
  updateComponentCompletion(id);
  calculateQuote();
  renderMudMap();
}


// ============================================================
// POST EDITOR
// ============================================================

function setupPostEditor(
  card,
  component
) {
  const sizeSelect =
    card.querySelector(
      ".post-size"
    );

  Object.entries(
    PRICES.steel.posts
  ).forEach(([key, post]) => {
    const option =
      document.createElement("option");

    option.value = key;
    option.textContent =
      post.label;

    sizeSelect.appendChild(option);
  });

  sizeSelect.value =
    PRICES.defaults.postType;

  const fixing =
    card.querySelector(
      ".post-fixing"
    );

  fixing.addEventListener(
    "change",
    () => {
      updatePostOptions(card);
    }
  );

  card.querySelector(
    ".post-top-bolt-enabled"
  ).addEventListener(
    "change",
    () => {
      updatePostOptions(card);
    }
  );

  card.querySelector(
    ".add-hole-btn"
  ).addEventListener(
    "click",
    () => {
      addHoleRow(card);
    }
  );

  updatePostOptions(card);
}

function addHoleRow(
  card,
  value = ""
) {
  const fragment =
    $("holeTemplate")
      .content.cloneNode(true);

  const row =
    fragment.querySelector(
      ".hole-row"
    );

  const input =
    fragment.querySelector(
      ".hole-position"
    );

  input.value = value;

  fragment
    .querySelector(
      ".remove-hole-btn"
    )
    .addEventListener(
      "click",
      () => {
        row.remove();
        calculateQuote();
        renderMudMap();
      }
    );

  input.addEventListener(
    "input",
    () => {
      calculateQuote();
      renderMudMap();
    }
  );

  card
    .querySelector(
      ".hole-list"
    )
    .appendChild(fragment);
}

function updatePostOptions(card) {
  const fixing =
    card.querySelector(
      ".post-fixing"
    ).value;

  card
    .querySelector(
      ".post-house-options"
    )
    .classList.toggle(
      "hidden",
      fixing !== "concreteHouse"
    );

  card
    .querySelector(
      ".post-floating-options"
    )
    .classList.toggle(
      "hidden",
      fixing !== "concreteFloating"
    );

  card
    .querySelector(
      ".post-brick-options"
    )
    .classList.toggle(
      "hidden",
      fixing !== "brick"
    );

  card
    .querySelector(
      ".post-baseplate-options"
    )
    .classList.toggle(
      "hidden",
      fixing !== "baseplate"
    );

  const concreted = [
    "concreteHouse",
    "concreteFloating",
    "fixedPanelLeft",
    "fixedPanelCentre",
    "fixedPanelRight"
  ].includes(fixing);

  card
    .querySelector(
      ".post-concrete-note"
    )
    .classList.toggle(
      "hidden",
      !concreted
    );

  const topBoltEnabled =
    card.querySelector(
      ".post-top-bolt-enabled"
    ).checked;

  card
    .querySelector(
      ".post-top-bolt-fields"
    )
    .classList.toggle(
      "hidden",
      !(
        fixing === "concreteHouse" &&
        topBoltEnabled
      )
    );

  const height =
    safeNumber(
      card.querySelector(
        ".post-height"
      ).value
    );

  let cutLength = 0;

  if (
    fixing === "existing"
  ) {
    cutLength = 0;
  }

  else if (
    fixing === "baseplate" ||
    fixing === "brick"
  ) {
    cutLength = height;
  }

  else if (fixing) {
    cutLength =
      height +
      PRICES.rules.concreteEmbedMm;
  }

  card
    .querySelector(
      ".post-cut-length"
    )
    .textContent =
    cutLength
      ? `${cutLength} mm`
      : "-";
}


// ============================================================
// GATE EDITOR
// ============================================================

function setupGateEditor(
  card,
  component
) {
  const frameSelect =
    card.querySelector(
      ".gate-frame-size"
    );

  Object.entries(
    PRICES.steel.frame
  ).forEach(([key, frame]) => {
    const option =
      document.createElement("option");

    option.value = key;
    option.textContent =
      frame.label;

    frameSelect.appendChild(option);
  });

  frameSelect.value =
    PRICES.defaults.frame;

  const latchSelect =
    card.querySelector(
      ".gate-latch"
    );

  Object.entries(
    PRICES.hardware.latches
  ).forEach(([key, latch]) => {
    const option =
      document.createElement("option");

    option.value = key;
    option.textContent =
      latch.label;

    latchSelect.appendChild(option);
  });

  latchSelect.value =
    PRICES.defaults.latch;

  populateColourSelect(
    card.querySelector(
      ".gate-colorbond-colour"
    )
  );

  populateColourSelect(
    card.querySelector(
      ".gate-powder-colour"
    )
  );

  card.querySelector(
    ".gate-cladding-type"
  ).value =
    PRICES.defaults.cladding;

  card.querySelector(
    ".gate-cladding-direction"
  ).value =
    "";

  updateGateOptions(card);
}

function updateGateOptions(card) {
  const type =
    card.querySelector(
      ".gate-cladding-type"
    ).value;

  const direction =
    card.querySelector(
      ".gate-cladding-direction"
    ).value;

  card
    .querySelector(
      ".gate-horizontal-rails-wrap"
    )
    .classList.toggle(
      "hidden",
      direction !== "vertical"
    );

  card
    .querySelector(
      ".gate-vertical-rails-wrap"
    )
    .classList.toggle(
      "hidden",
      direction !== "horizontal"
    );

  card
    .querySelector(
      ".gate-ekodeck-options"
    )
    .classList.toggle(
      "hidden",
      type !== "ekodeck"
    );

  card
    .querySelector(
      ".gate-cypress-options"
    )
    .classList.toggle(
      "hidden",
      type !== "cypressPickets"
    );

  card
    .querySelector(
      ".gate-losp-options"
    )
    .classList.toggle(
      "hidden",
      ![
        "losp50",
        "losp90"
      ].includes(type)
    );

  card
    .querySelector(
      ".gate-merbau-options"
    )
    .classList.toggle(
      "hidden",
      ![
        "merbau90",
        "merbau140"
      ].includes(type)
    );

  card
    .querySelector(
      ".gate-colorbond-options"
    )
    .classList.toggle(
      "hidden",
      type !== "colorbond"
    );

  card
    .querySelector(
      ".gate-custom-options"
    )
    .classList.toggle(
      "hidden",
      type !== "custom"
    );

  const cypressPaint =
    card.querySelector(
      ".gate-cypress-finish"
    ).value === "Paint";

  card
    .querySelector(
      ".gate-cypress-colour-wrap"
    )
    .classList.toggle(
      "hidden",
      !cypressPaint
    );

  const lospPaint =
    card.querySelector(
      ".gate-losp-finish"
    ).value === "Paint";

  card
    .querySelector(
      ".gate-losp-colour-wrap"
    )
    .classList.toggle(
      "hidden",
      !lospPaint
    );

  const otherLatch =
    card.querySelector(
      ".gate-latch"
    ).value === "other";

  card
    .querySelector(
      ".gate-other-latch-wrap"
    )
    .classList.toggle(
      "hidden",
      !otherLatch
    );

  const powder =
    card.querySelector(
      ".gate-powder-coated"
    ).checked;

  card
    .querySelector(
      ".gate-powder-options"
    )
    .classList.toggle(
      "hidden",
      !powder
    );

  const special =
    card.querySelector(
      ".gate-special-height"
    ).checked;

  card
    .querySelector(
      ".gate-special-height-wrap"
    )
    .classList.toggle(
      "hidden",
      !special
    );
}


// ============================================================
// PANEL EDITOR
// ============================================================

function setupPanelEditor(
  card,
  component
) {
  populateColourSelect(
    card.querySelector(
      ".panel-powder-colour"
    )
  );

  updatePanelOptions(card);
}

function updatePanelOptions(card) {
  const direction =
    card.querySelector(
      ".panel-direction"
    ).value;

  card
    .querySelector(
      ".panel-horizontal-note"
    )
    .classList.toggle(
      "hidden",
      direction !== "horizontal"
    );

  card
    .querySelector(
      ".panel-vertical-options"
    )
    .classList.toggle(
      "hidden",
      direction !== "vertical"
    );

  const powder =
    card.querySelector(
      ".panel-powder-coated"
    ).checked;

  card
    .querySelector(
      ".panel-powder-options"
    )
    .classList.toggle(
      "hidden",
      !powder
    );

  const special =
    card.querySelector(
      ".panel-special-height"
    ).checked;

  card
    .querySelector(
      ".panel-special-height-wrap"
    )
    .classList.toggle(
      "hidden",
      !special
    );

  const height =
    safeNumber(
      card.querySelector(
        ".panel-height"
      ).value
    );

  let automaticRails = 0;

  if (
    direction === "vertical" &&
    height > 0
  ) {
    automaticRails =
      Math.max(
        1,
        Math.ceil(height / 900)
      );
  }

  const override =
    card.querySelector(
      ".panel-rail-override"
    ).value;

  const count =
    override
      ? Number(override)
      : automaticRails;

  card
    .querySelector(
      ".panel-rail-count"
    )
    .textContent =
    `${count} rail${count === 1 ? "" : "s"}`;
}


// ============================================================
// COLOUR SELECTS
// ============================================================

function populateColourSelect(select) {
  select.innerHTML = "";

  PRICES.colours.forEach(
    (colour) => {
      const option =
        document.createElement("option");

      option.value = colour;
      option.textContent = colour;

      select.appendChild(option);
    }
  );
}


// ============================================================
// REMOVE / RENUMBER
// ============================================================

function removeComponent(id) {
  components =
    components.filter(
      (component) =>
        component.id !== id
    );

  const card =
    document.querySelector(
      `[data-component-id="${id}"]`
    );

  if (card) {
    card.remove();
  }

  renumberComponents();
  renderMudMap();
  calculateQuote();
}

function renumberComponents() {
  let postIndex = 0;
  let gateIndex = 0;
  let panelIndex = 0;

  components.forEach(
    (component, index) => {
      component.order = index;

      if (
        component.type === "post"
      ) {
        postIndex++;
        component.label =
          componentLabel(
            "post",
            postIndex
          );
      }

      else if (
        component.type === "gate"
      ) {
        gateIndex++;
        component.label =
          componentLabel(
            "gate",
            gateIndex
          );
      }

      else {
        panelIndex++;
        component.label =
          componentLabel(
            "panel",
            panelIndex
          );
      }

      const card =
        document.querySelector(
          `[data-component-id="${component.id}"]`
        );

      if (card) {
        card
          .querySelector(
            ".component-title"
          )
          .textContent =
          component.label;
      }
    }
  );
}


// ============================================================
// COMPONENT COMPLETION
// ============================================================

function isPostComplete(card) {
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

  const height =
    safeNumber(
      card.querySelector(
        ".post-height"
      ).value
    );

  if (!height) {
    return false;
  }

  if (fixing === "brick") {
    const holes = [
      ...card.querySelectorAll(
        ".hole-position"
      )
    ].filter(
      (input) =>
        safeNumber(input.value) > 0
    );

    return holes.length > 0;
  }

  if (
    fixing === "concreteHouse" &&
    card.querySelector(
      ".post-top-bolt-enabled"
    ).checked
  ) {
    return (
      safeNumber(
        card.querySelector(
          ".post-top-bolt-position"
        ).value
      ) > 0
    );
  }

  if (
    fixing === "concreteFloating"
  ) {
    return (
      safeNumber(
        card.querySelector(
          ".post-floating-offset"
        ).value
      ) >= 0
    );
  }

  return true;
}

function isGateComplete(card) {
  const width =
    safeNumber(
      card.querySelector(
        ".gate-width"
      ).value
    );

  const height =
    safeNumber(
      card.querySelector(
        ".gate-height"
      ).value
    );

  const direction =
    card.querySelector(
      ".gate-cladding-direction"
    ).value;

  const hinge =
    card.querySelector(
      ".gate-hinge-side"
    ).value;

  const open =
    card.querySelector(
      ".gate-open-direction"
    ).value;

  const latch =
    card.querySelector(
      ".gate-latch"
    ).value;

  if (
    !width ||
    !height ||
    !direction ||
    !hinge ||
    !open ||
    !latch
  ) {
    return false;
  }

  if (latch === "other") {
    return (
      card.querySelector(
        ".gate-other-latch-description"
      ).value.trim() !== ""
    );
  }

  return true;
}

function isPanelComplete(card) {
  const width =
    safeNumber(
      card.querySelector(
        ".panel-width"
      ).value
    );

  const height =
    safeNumber(
      card.querySelector(
        ".panel-height"
      ).value
    );

  const direction =
    card.querySelector(
      ".panel-direction"
    ).value;

  return (
    width > 0 &&
    height > 0 &&
    direction !== ""
  );
}

function updateComponentCompletion(id) {
  const component =
    getComponentById(id);

  const card =
    document.querySelector(
      `[data-component-id="${id}"]`
    );

  if (!component || !card) {
    return;
  }

  let complete = false;

  if (component.type === "post") {
    complete =
      isPostComplete(card);
  }

  else if (
    component.type === "gate"
  ) {
    complete =
      isGateComplete(card);
  }

  else {
    complete =
      isPanelComplete(card);
  }

  component.complete = complete;

  card.classList.toggle(
    "complete",
    complete
  );

  card.classList.toggle(
    "incomplete",
    !complete
  );

  card
    .querySelector(
      ".component-status-text"
    )
    .textContent =
    complete
      ? "Complete"
      : "Incomplete";
}

function updateAllCompletion() {
  components.forEach(
    (component) => {
      updateComponentCompletion(
        component.id
      );
    }
  );
}


// ============================================================
// MUD MAP
// ============================================================

function renderMudMap() {
  const map = $("mudMap");

  map.innerHTML = "";

  if (!components.length) {
    map.innerHTML =
      `<div class="mud-map-empty">
        Add a component to begin
      </div>`;

    return;
  }

  components.forEach(
    (component) => {
      const node =
        document.createElement("div");

      node.className =
        "mud-map-component";

      node.dataset.componentId =
        component.id;

      node.textContent =
        component.label || "";

      node.classList.toggle(
        "complete",
        Boolean(component.complete)
      );

      node.classList.toggle(
        "incomplete",
        !component.complete
      );

      addMudMapSymbols(
        node,
        component
      );

      setupMudMapInteractions(
        node,
        component
      );

      map.appendChild(node);
    }
  );
}

function addMudMapSymbols(
  node,
  component
) {
  if (
    component.type !== "gate"
  ) {
    return;
  }

  const card =
    document.querySelector(
      `[data-component-id="${component.id}"]`
    );

  if (!card) {
    return;
  }

  const hinge =
    card.querySelector(
      ".gate-hinge-side"
    ).value;

  const open =
    card.querySelector(
      ".gate-open-direction"
    ).value;

  if (!hinge) {
    return;
  }

  const hingeMark =
    document.createElement("span");

  hingeMark.className =
    `gate-symbol hinge ${hinge}`;

  hingeMark.textContent = "H";

  const latchMark =
    document.createElement("span");

  latchMark.className =
    `gate-symbol latch ${
      hinge === "left"
        ? "right"
        : "left"
    }`;

  latchMark.textContent = "L";

  node.appendChild(hingeMark);
  node.appendChild(latchMark);

  if (open) {
    const openMark =
      document.createElement("span");

    openMark.className =
      "gate-open-symbol";

    openMark.textContent =
      open === "in"
        ? "IN"
        : "OUT";

    node.appendChild(openMark);
  }
}


// ============================================================
// DOUBLE TAP + LONG HOLD DRAG
// ============================================================

function setupMudMapInteractions(
  node,
  component
) {
  let tapTimer = null;
  let holdTimer = null;
  let dragging = false;

  node.addEventListener(
    "pointerdown",
    (event) => {
      holdTimer =
        setTimeout(
          () => {
            dragging = true;

            node.classList.add(
              "dragging"
            );

            node.setPointerCapture(
              event.pointerId
            );
          },
          1000
        );
    }
  );

  node.addEventListener(
    "pointerup",
    () => {
      clearTimeout(
        holdTimer
      );

      if (dragging) {
        dragging = false;

        node.classList.remove(
          "dragging"
        );

        reorderFromMudMap();
        return;
      }

      if (tapTimer) {
        clearTimeout(
          tapTimer
        );

        tapTimer = null;

        jumpToComponent(
          component.id
        );
      }

      else {
        tapTimer =
          setTimeout(
            () => {
              tapTimer = null;
            },
            280
          );
      }
    }
  );

  node.addEventListener(
    "pointermove",
    (event) => {
      if (!dragging) {
        return;
      }

      moveMudMapNode(
        node,
        event.clientX
      );
    }
  );

  node.addEventListener(
    "pointercancel",
    () => {
      clearTimeout(
        holdTimer
      );

      dragging = false;

      node.classList.remove(
        "dragging"
      );
    }
  );
}

function moveMudMapNode(
  node,
  clientX
) {
  const siblings = [
    ...$("mudMap")
      .querySelectorAll(
        ".mud-map-component:not(.dragging)"
      )
  ];

  const target =
    siblings.find((sibling) => {
      const rect =
        sibling.getBoundingClientRect();

      return clientX <
        rect.left +
        rect.width / 2;
    });

  if (target) {
    $("mudMap")
      .insertBefore(
        node,
        target
      );
  }

  else {
    $("mudMap")
      .appendChild(node);
  }
}

function reorderFromMudMap() {
  const ids = [
    ...$("mudMap")
      .querySelectorAll(
        ".mud-map-component"
      )
  ].map(
    (node) =>
      node.dataset.componentId
  );

  components.sort(
    (a, b) =>
      ids.indexOf(a.id) -
      ids.indexOf(b.id)
  );

  const container =
    $("componentsContainer");

  components.forEach(
    (component) => {
      const card =
        document.querySelector(
          `[data-component-id="${component.id}"]`
        );

      if (card) {
        container.appendChild(card);
      }
    }
  );

  renumberComponents();
  calculateQuote();
  renderMudMap();
}

function jumpToComponent(id) {
  const card =
    document.querySelector(
      `[data-component-id="${id}"]`
    );

  if (!card) {
    return;
  }

  $("componentsSection").open = true;

  card.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}


// ============================================================
// POST HEIGHT PROPAGATION
// ============================================================

function propagateFirstPostHeight() {
  const postCards =
    components
      .filter(
        (component) =>
          component.type === "post"
      )
      .map(
        (component) =>
          document.querySelector(
            `[data-component-id="${component.id}"]`
          )
      )
      .filter(Boolean);

  let firstEntered = null;

  for (const card of postCards) {
    const input =
      card.querySelector(
        ".post-height"
      );

    const value =
      safeNumber(
        input.value
      );

    if (value > 0) {
      firstEntered = value;
      break;
    }
  }

  if (!firstEntered) {
    return;
  }

  postCards.forEach((card) => {
    const input =
      card.querySelector(
        ".post-height"
      );

    if (!input.value) {
      input.value =
        firstEntered;
    }
  });
}


// ============================================================
// READ COMPONENT DATA
// ============================================================

function readPost(component) {
  const card =
    document.querySelector(
      `[data-component-id="${component.id}"]`
    );

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
    safeNumber(
      card.querySelector(
        ".post-height"
      ).value
    );

  const holes = [
    ...card.querySelectorAll(
      ".hole-position"
    )
  ].map(
    (input) =>
      safeNumber(input.value)
  ).filter(
    (value) =>
      value > 0
  );

  const topBolt =
    fixing === "concreteHouse" &&
    card.querySelector(
      ".post-top-bolt-enabled"
    ).checked
      ? safeNumber(
          card.querySelector(
            ".post-top-bolt-position"
          ).value
        )
      : 0;

  let cutLength = 0;

  if (
    fixing === "existing"
  ) {
    cutLength = 0;
  }

  else if (
    fixing === "brick" ||
    fixing === "baseplate"
  ) {
    cutLength = height;
  }

  else if (fixing) {
    cutLength =
      height +
      PRICES.rules.concreteEmbedMm;
  }

  return {
    id: component.id,
    label: component.label,
    postKey,
    postLabel:
      postData.label,
    widthMm:
      postData.widthMm,
    heightMm:
      height,
    fixing,
    holes,
    topBolt,
    cutLengthMm:
      cutLength,
    floatingOffsetMm:
      safeNumber(
        card.querySelector(
          ".post-floating-offset"
        ).value
      ),
    houseNote:
      card.querySelector(
        ".post-house-note"
      ).value.trim(),
    powderCoated:
      card.querySelector(
        ".post-powder-coated"
      ).checked
  };
}

function readGate(component) {
  const card =
    document.querySelector(
      `[data-component-id="${component.id}"]`
    );

  return {
    id: component.id,
    label: component.label,
    widthMm:
      safeNumber(
        card.querySelector(
          ".gate-width"
        ).value
      ),
    heightMm:
      safeNumber(
        card.querySelector(
          ".gate-height"
        ).value
      ),
    frameKey:
      card.querySelector(
        ".gate-frame-size"
      ).value,
    claddingType:
      card.querySelector(
        ".gate-cladding-type"
      ).value,
    claddingDirection:
      card.querySelector(
        ".gate-cladding-direction"
      ).value,
    horizontalRails:
      safeNumber(
        card.querySelector(
          ".gate-horizontal-rails"
        ).value
      ),
    verticalRails:
      safeNumber(
        card.querySelector(
          ".gate-vertical-rails"
        ).value
      ),
    hingeSide:
      card.querySelector(
        ".gate-hinge-side"
      ).value,
    openDirection:
      card.querySelector(
        ".gate-open-direction"
      ).value,
    latch:
      card.querySelector(
        ".gate-latch"
      ).value,
    otherLatchDescription:
      card.querySelector(
        ".gate-other-latch-description"
      ).value.trim(),
    otherLatchCost:
      safeNumber(
        card.querySelector(
          ".gate-other-latch-cost"
        ).value
      ),
    powderCoated:
      card.querySelector(
        ".gate-powder-coated"
      ).checked,
    powderColour:
      card.querySelector(
        ".gate-powder-colour"
      ).value,
    ekodeckColour:
      card.querySelector(
        ".gate-ekodeck-colour"
      ).value,
    cypressFinish:
      card.querySelector(
        ".gate-cypress-finish"
      ).value,
    cypressColour:
      card.querySelector(
        ".gate-cypress-colour"
      ).value.trim(),
    lospFinish:
      card.querySelector(
        ".gate-losp-finish"
      ).value,
    lospColour:
      card.querySelector(
        ".gate-losp-colour"
      ).value.trim(),
    merbauFinish:
      card.querySelector(
        ".gate-merbau-finish"
      ).value,
    colorbondProfile:
      card.querySelector(
        ".gate-colorbond-profile"
      ).value,
    colorbondColour:
      card.querySelector(
        ".gate-colorbond-colour"
      ).value,
    customDescription:
      card.querySelector(
        ".gate-custom-description"
      ).value.trim(),
    customCost:
      safeNumber(
        card.querySelector(
          ".gate-custom-cost"
        ).value
      ),
    specialHeight:
      card.querySelector(
        ".gate-special-height"
      ).checked,
    heightAdjustmentMm:
      safeNumber(
        card.querySelector(
          ".gate-height-adjustment"
        ).value
      ),
    specialNotes:
      card.querySelector(
        ".gate-height-notes"
      ).value.trim()
  };
}

function readPanel(component) {
  const card =
    document.querySelector(
      `[data-component-id="${component.id}"]`
    );

  return {
    id: component.id,
    label: component.label,
    widthMm:
      safeNumber(
        card.querySelector(
          ".panel-width"
        ).value
      ),
    heightMm:
      safeNumber(
        card.querySelector(
          ".panel-height"
        ).value
      ),
    direction:
      card.querySelector(
        ".panel-direction"
      ).value,
    railOverride:
      card.querySelector(
        ".panel-rail-override"
      ).value,
    powderCoated:
      card.querySelector(
        ".panel-powder-coated"
      ).checked,
    powderColour:
      card.querySelector(
        ".panel-powder-colour"
      ).value,
    specialHeight:
      card.querySelector(
        ".panel-special-height"
      ).checked,
    heightAdjustmentMm:
      safeNumber(
        card.querySelector(
          ".panel-height-adjustment"
        ).value
      ),
    specialNotes:
      card.querySelector(
        ".panel-height-notes"
      ).value.trim()
  };
}


// ============================================================
// AUTO GATE WIDTHS FROM CAVITY
// ============================================================

function updateGateWidthsFromCavity() {
  const cavity =
    safeNumber(
      $("cavityWidth").value
    );

  if (!cavity) {
    return;
  }

  const posts =
    components
      .filter(
        (component) =>
          component.type === "post"
      )
      .map(readPost);

  const panels =
    components
      .filter(
        (component) =>
          component.type === "panel"
      )
      .map(readPanel);

  const gates =
    components
      .filter(
        (component) =>
          component.type === "gate"
      );

  if (!gates.length) {
    return;
  }

  const postWidth =
    includeState.posts
      ? posts.reduce(
          (sum, post) =>
            sum +
            (
              post.fixing === "existing"
                ? 0
                : safeNumber(
                    post.widthMm
                  )
            ),
          0
        )
      : 0;

  const panelWidth =
    panels.reduce(
      (sum, panel) =>
        sum + panel.widthMm,
      0
    );

  const totalGaps =
    Math.max(
      0,
      components.length - 1
    ) *
    PRICES.rules.componentGapMm;

  const available =
    cavity -
    postWidth -
    panelWidth -
    totalGaps;

  if (available <= 0) {
    return;
  }

  const gateCards =
    gates.map(
      (component) =>
        document.querySelector(
          `[data-component-id="${component.id}"]`
        )
    );

  const manual = [];
  const blank = [];

  gateCards.forEach(
    (card) => {
      const input =
        card.querySelector(
          ".gate-width"
        );

      if (
        input.dataset.manual === "true" &&
        safeNumber(input.value) > 0
      ) {
        manual.push(input);
      }

      else {
        blank.push(input);
      }
    }
  );

  const manualTotal =
    manual.reduce(
      (sum, input) =>
        sum +
        safeNumber(input.value),
      0
    );

  const remaining =
    Math.max(
      0,
      available -
      manualTotal
    );

  const defaultWidth =
    blank.length
      ? remaining /
        blank.length
      : 0;

  blank.forEach(
    (input) => {
      input.value =
        Math.round(defaultWidth);
    }
  );
}


// ============================================================
// CAVITY CHECK
// ============================================================

function updateLayoutCheck() {
  const cavity =
    safeNumber(
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
    components
      .filter(
        (c) =>
          c.type === "post"
      )
      .map(readPost);

  const gates =
    components
      .filter(
        (c) =>
          c.type === "gate"
      )
      .map(readGate);

  const panels =
    components
      .filter(
        (c) =>
          c.type === "panel"
      )
      .map(readPanel);

  const postsWidth =
    includeState.posts
      ? posts.reduce(
          (sum, post) =>
            sum +
            (
              post.fixing === "existing"
                ? 0
                : post.widthMm
            ),
          0
        )
      : 0;

  const gatesWidth =
    gates.reduce(
      (sum, gate) =>
        sum + gate.widthMm,
      0
    );

  const panelsWidth =
    panels.reduce(
      (sum, panel) =>
        sum + panel.widthMm,
      0
    );

  const gaps =
    Math.max(
      0,
      components.length - 1
    ) *
    PRICES.rules.componentGapMm;

  const total =
    postsWidth +
    gatesWidth +
    panelsWidth +
    gaps;

  const difference =
    cavity - total;

  if (
    components.some(
      (component) =>
        !component.complete
    )
  ) {
    $("layoutCheck")
      .className =
      "layout-check incomplete";

    $("layoutCheck")
      .textContent =
      `Cavity ${cavity} mm | Layout ${Math.round(total)} mm | Still incomplete`;

    return;
  }

  if (
    Math.abs(difference) <= 2
  ) {
    $("layoutCheck")
      .className =
      "layout-check complete";

    $("layoutCheck")
      .textContent =
      `✓ Cavity ${cavity} mm = Layout ${Math.round(total)} mm`;
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


// ============================================================
// STOCK CUTTING
// ============================================================

function calculateStockFromPieces(
  pieces,
  stockLength
) {
  const valid =
    pieces
      .filter(
        (value) =>
          value > 0
      )
      .sort(
        (a, b) =>
          b - a
      );

  if (!valid.length) {
    return {
      stockLengths: 0,
      usedMetres: 0,
      purchasedMetres: 0,
      wasteMetres: 0
    };
  }

  const bins = [];

  valid.forEach((piece) => {
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
    stockLengths:
      bins.length,
    usedMetres:
      used,
    purchasedMetres:
      purchased,
    wasteMetres:
      purchased - used
  };
}


// ============================================================
// FRAME MATERIALS
// ============================================================

function calculateFrameMaterials(gates, panels) {
  if (!includeState.frame) {
    return {
      usedM: 0,
      stockLengths: 0,
      wasteM: 0,
      costExGST: 0
    };
  }

  const grouped = {};

  gates.forEach((gate) => {
    const frame =
      PRICES.steel.frame[
        gate.frameKey
      ];

    if (!grouped[gate.frameKey]) {
      grouped[gate.frameKey] = [];
    }

    const w =
      gate.widthMm / 1000;

    const h =
      gate.heightMm / 1000;

    grouped[gate.frameKey]
      .push(
        w,
        w,
        h,
        h
      );

    const face =
      frame.faceMm;

    if (
      gate.claddingDirection === "vertical"
    ) {
      const railLength =
        Math.max(
          0,
          gate.widthMm -
          face * 2
        ) / 1000;

      for (
        let i = 0;
        i < gate.horizontalRails;
        i++
      ) {
        grouped[gate.frameKey]
          .push(railLength);
      }
    }

    if (
      gate.claddingDirection === "horizontal"
    ) {
      const railLength =
        Math.max(
          0,
          gate.heightMm -
          face * 2
        ) / 1000;

      for (
        let i = 0;
        i < gate.verticalRails;
        i++
      ) {
        grouped[gate.frameKey]
          .push(railLength);
      }
    }
  });

  panels.forEach((panel) => {
    if (
      panel.direction !== "vertical"
    ) {
      return;
    }

    const frameKey =
      PRICES.defaults.frame;

    const frame =
      PRICES.steel.frame[
        frameKey
      ];

    if (!grouped[frameKey]) {
      grouped[frameKey] = [];
    }

    const connectedPosts =
      getAdjacentPosts(
        panel.id
      );

    const leftWidth =
      connectedPosts.left
        ? readPost(
            connectedPosts.left
          ).widthMm
        : 0;

    const rightWidth =
      connectedPosts.right
        ? readPost(
            connectedPosts.right
          ).widthMm
        : 0;

    const railLengthMm =
      Math.max(
        0,
        panel.widthMm -
        leftWidth -
        rightWidth
      );

    const automatic =
      Math.max(
        1,
        Math.ceil(
          panel.heightMm / 900
        )
      );

    const count =
      panel.railOverride
        ? Number(
            panel.railOverride
          )
        : automatic;

    for (
      let i = 0;
      i < count;
      i++
    ) {
      grouped[frameKey]
        .push(
          railLengthMm / 1000
        );
    }
  });

  let usedM = 0;
  let stockLengths = 0;
  let wasteM = 0;
  let costExGST = 0;

  Object.entries(grouped)
    .forEach(
      ([key, pieces]) => {
        const frame =
          PRICES.steel.frame[
            key
          ];

        const stock =
          calculateStockFromPieces(
            pieces,
            frame.stockLengthM
          );

        usedM +=
          stock.usedMetres;

        stockLengths +=
          stock.stockLengths;

        wasteM +=
          stock.wasteMetres;

        const raw =
          stock.stockLengths *
          frame.pricePerStockLength;

        costExGST +=
          toExGST(
            raw,
            frame.priceIncludesGST
          );
      }
    );

  return {
    usedM,
    stockLengths,
    wasteM,
    costExGST
  };
}


// ============================================================
// POSTS
// ============================================================

function calculatePostMaterials(posts) {
  if (!includeState.posts) {
    return {
      usedM: 0,
      stockLengths: 0,
      wasteM: 0,
      steelCostExGST: 0,
      concreteCostExGST: 0,
      boltCostExGST: 0,
      baseplateCostExGST: 0
    };
  }

  const grouped = {};

  let concreteBags = 0;
  let dynaboltCount = 0;
  let baseplates = 0;

  posts.forEach((post) => {
    if (
      !post.fixing ||
      post.fixing === "existing"
    ) {
      return;
    }

    if (!grouped[post.postKey]) {
      grouped[post.postKey] = [];
    }

    grouped[post.postKey]
      .push(
        post.cutLengthMm /
        1000
      );

    if (
      [
        "concreteHouse",
        "concreteFloating",
        "fixedPanelLeft",
        "fixedPanelCentre",
        "fixedPanelRight"
      ].includes(post.fixing)
    ) {
      concreteBags +=
        PRICES.postFixing
          .concrete
          .defaultBagsPerPost;
    }

    if (
      post.fixing === "brick"
    ) {
      dynaboltCount +=
        post.holes.length;
    }

    if (
      post.topBolt > 0
    ) {
      dynaboltCount++;
    }

    if (
      post.fixing === "baseplate"
    ) {
      baseplates++;
    }
  });

  let usedM = 0;
  let stockLengths = 0;
  let wasteM = 0;
  let steelCostExGST = 0;

  Object.entries(grouped)
    .forEach(
      ([key, pieces]) => {
        const post =
          PRICES.steel.posts[
            key
          ];

        const stock =
          calculateStockFromPieces(
            pieces,
            post.stockLengthM
          );

        usedM +=
          stock.usedMetres;

        stockLengths +=
          stock.stockLengths;

        wasteM +=
          stock.wasteMetres;

        const raw =
          stock.stockLengths *
          post.pricePerStockLength;

        steelCostExGST +=
          toExGST(
            raw,
            post.priceIncludesGST
          );
      }
    );

  const concreteRaw =
    concreteBags *
    PRICES.postFixing
      .concrete
      .pricePerBag;

  const boltRaw =
    dynaboltCount *
    PRICES.postFixing
      .dynabolts
      .priceEach;

  const baseplateRaw =
    baseplates *
    PRICES.postFixing
      .baseplate
      .allowanceEach;

  return {
    usedM,
    stockLengths,
    wasteM,
    steelCostExGST,

    concreteCostExGST:
      toExGST(
        concreteRaw,
        PRICES.postFixing
          .concrete
          .priceIncludesGST
      ),

    boltCostExGST:
      toExGST(
        boltRaw,
        PRICES.postFixing
          .dynabolts
          .priceIncludesGST
      ),

    baseplateCostExGST:
      toExGST(
        baseplateRaw,
        PRICES.postFixing
          .baseplate
          .priceIncludesGST
      )
  };
}


// ============================================================
// CLADDING
// ============================================================

function calculateCladdingMaterial(
  gate,
  widthMm,
  heightMm
) {
  const data =
    PRICES.cladding[
      gate.claddingType
    ];

  if (
    !includeState.cladding ||
    !data ||
    !widthMm ||
    !heightMm
  ) {
    return {
      boards: 0,
      usedM: 0,
      stockLengths: 0,
      wasteM: 0,
      costExGST: 0
    };
  }

  const moduleMm =
    (
      data.boardWidthMm || 0
    ) +
    PRICES.rules.claddingGapMm;

  if (
    gate.claddingType === "colorbond"
  ) {
    const area =
      widthMm / 1000 *
      heightMm / 1000;

    const raw =
      area *
      data.pricePerM2;

    return {
      boards: 0,
      usedM: 0,
      stockLengths: 0,
      wasteM: 0,
      costExGST:
        toExGST(
          raw,
          data.priceIncludesGST
        )
    };
  }

  if (
    gate.claddingType === "custom"
  ) {
    return {
      boards: 0,
      usedM: 0,
      stockLengths: 0,
      wasteM: 0,
      costExGST:
        toExGST(
          gate.customCost,
          true
        )
    };
  }

  const vertical =
    gate.claddingDirection ===
    "vertical";

  const boardCount =
    Math.ceil(
      (
        vertical
          ? widthMm
          : heightMm
      ) /
      moduleMm
    );

  const pieceLengthM =
    (
      vertical
        ? heightMm
        : widthMm
    ) / 1000;

  const pieces =
    Array(boardCount)
      .fill(pieceLengthM);

  let stockLength = 0;
  let priceMode = "";
  let priceValue = 0;

  if (
    gate.claddingType ===
    "ekodeck"
  ) {
    stockLength =
      data.stockLengthM;

    priceMode =
      "stock";

    priceValue =
      data.pricePerStockLength;
  }

  else if (
    gate.claddingType ===
    "cypressPickets"
  ) {
    stockLength =
      Math.max(
        ...data.availableLengthsMm
      ) / 1000;

    priceMode =
      "lineal";

    priceValue =
      data.pricePerLinealM;
  }

  else {
    stockLength =
      data.stockLengthM || 0;

    priceMode =
      "lineal";

    priceValue =
      data.pricePerLinealM || 0;
  }

  const stock =
    calculateStockFromPieces(
      pieces,
      stockLength || pieceLengthM
    );

  let raw = 0;

  if (priceMode === "stock") {
    raw =
      stock.stockLengths *
      priceValue;
  }

  else {
    raw =
      stock.purchasedMetres *
      priceValue;
  }

  return {
    boards:
      boardCount,
    usedM:
      stock.usedMetres,
    stockLengths:
      stock.stockLengths,
    wasteM:
      stock.wasteMetres,
    costExGST:
      toExGST(
        raw,
        data.priceIncludesGST
      )
  };
}


// ============================================================
// FIXED PANEL CLADDING
// ============================================================

function getMatchingGateForPanel(
  panelComponent
) {
  const index =
    components.findIndex(
      (component) =>
        component.id ===
        panelComponent.id
    );

  for (
    let offset = 1;
    offset <
      components.length;
    offset++
  ) {
    const left =
      components[
        index - offset
      ];

    const right =
      components[
        index + offset
      ];

    if (
      left &&
      left.type === "gate"
    ) {
      return left;
    }

    if (
      right &&
      right.type === "gate"
    ) {
      return right;
    }
  }

  return null;
}


// ============================================================
// ADJACENT POSTS
// ============================================================

function getAdjacentPosts(id) {
  const index =
    components.findIndex(
      (component) =>
        component.id === id
    );

  let left = null;
  let right = null;

  for (
    let i = index - 1;
    i >= 0;
    i--
  ) {
    if (
      components[i].type ===
      "post"
    ) {
      left =
        components[i];
      break;
    }
  }

  for (
    let i = index + 1;
    i < components.length;
    i++
  ) {
    if (
      components[i].type ===
      "post"
    ) {
      right =
        components[i];
      break;
    }
  }

  return {
    left,
    right
  };
}


// ============================================================
// POWDER COATING
// ============================================================

function calculatePowderCoating(
  posts,
  gates,
  panels
) {
  let raw = 0;

  posts.forEach((post) => {
    if (
      post.powderCoated &&
      post.fixing !== "existing"
    ) {
      raw +=
        PRICES.powderCoating
          .postEach;
    }
  });

  gates.forEach((gate) => {
    if (gate.powderCoated) {
      raw +=
        PRICES.powderCoating
          .gateEach;
    }
  });

  panels.forEach((panel) => {
    if (
      panel.powderCoated &&
      panel.direction === "vertical"
    ) {
      raw +=
        PRICES.powderCoating
          .verticalFixedPanelEach;
    }
  });

  return toExGST(
    raw,
    PRICES.powderCoating
      .priceIncludesGST
  );
}


// ============================================================
// LABOUR
// ============================================================

function calculateLabourEstimate(
  posts,
  gates,
  panels
) {
  let fabrication = 0;
  let installation = 0;

  fabrication +=
    gates.length *
    PRICES.labour
      .gateFabricationHoursEach;

  posts.forEach((post) => {
    if (
      post.fixing !== "existing"
    ) {
      fabrication +=
        PRICES.labour
          .postFabricationHoursEach;
    }

    fabrication +=
      post.holes.length *
      PRICES.labour
        .boltHoleFabricationHoursEach;

    if (post.topBolt > 0) {
      fabrication +=
        PRICES.labour
          .boltHoleFabricationHoursEach;
    }

    if (
      [
        "concreteHouse",
        "concreteFloating",
        "fixedPanelLeft",
        "fixedPanelCentre",
        "fixedPanelRight"
      ].includes(post.fixing)
    ) {
      installation +=
        PRICES.labour
          .concretePostInstallHoursEach;
    }

    if (
      post.fixing === "baseplate"
    ) {
      installation +=
        PRICES.labour
          .baseplatePostInstallHoursEach;
    }
  });

  fabrication +=
    panels.length *
    PRICES.labour
      .fixedPanelFabricationHoursEach;

  installation +=
    gates.length *
    PRICES.labour
      .gateInstallHoursEach;

  return {
    fabrication,
    installation
  };
}


// ============================================================
// FABRICATION VIEW
// ============================================================

function updateFabricationView(
  posts,
  gates,
  panels
) {
  const lines = [];

  posts.forEach((post) => {
    let text =
      `<div class="fabrication-item">
        <strong>${post.label}</strong>
        <span>${post.postLabel}</span>`;

    if (
      post.fixing !== "existing"
    ) {
      text +=
        `<span>Cut ${post.cutLengthMm} mm</span>`;
    }

    if (post.fixing === "brick") {
      text +=
        `<span>75x10 Dynabolts @ ${
          post.holes.join(" / ")
        } mm from top</span>`;
    }

    if (
      post.fixing ===
      "concreteHouse"
    ) {
      text +=
        `<span>Concreted next to house, 650 mm embedment</span>`;

      if (post.topBolt > 0) {
        text +=
          `<span>Top bolt @ ${post.topBolt} mm from top</span>`;
      }
    }

    if (
      post.fixing ===
      "concreteFloating"
    ) {
      text +=
        `<span>Concreted floating, 650 mm embedment</span>`;

      if (
        post.floatingOffsetMm
      ) {
        text +=
          `<span>Offset ${post.floatingOffsetMm} mm</span>`;
      }
    }

    if (
      post.fixing ===
      "baseplate"
    ) {
      text +=
        `<span>Baseplated, 4 x 75x10 Dynabolts</span>`;
    }

    text += `</div>`;

    lines.push(text);
  });

  gates.forEach((gate) => {
    lines.push(`
      <div class="fabrication-item">
        <strong>${gate.label}</strong>
        <span>${gate.widthMm} x ${gate.heightMm} mm</span>
        <span>Hinge ${gate.hingeSide || "-"}, opens ${gate.openDirection || "-"}</span>
      </div>
    `);
  });

  panels.forEach((panel) => {
    lines.push(`
      <div class="fabrication-item">
        <strong>${panel.label}</strong>
        <span>${panel.widthMm} x ${panel.heightMm} mm</span>
        <span>${panel.direction || "-"} cladding</span>
      </div>
    `);
  });

  $("fabricationView")
    .innerHTML =
    lines.length
      ? lines.join("")
      : `<p class="muted">
          Add components and measurements to build fabrication notes.
        </p>`;
}


// ============================================================
// MAIN CALCULATION
// ============================================================

function calculateQuote() {
  updateAllConditionalFields();
  updateAllCompletion();
  updateGateWidthsFromCavity();
  updateAllCompletion();
  renderMudMap();
  updateLayoutCheck();

  const posts =
    components
      .filter(
        (component) =>
          component.type === "post"
      )
      .map(readPost);

  const gates =
    components
      .filter(
        (component) =>
          component.type === "gate"
      )
      .map(readGate);

  const panelComponents =
    components.filter(
      (component) =>
        component.type === "panel"
    );

  const panels =
    panelComponents.map(
      readPanel
    );

  const frame =
    calculateFrameMaterials(
      gates,
      panels
    );

  const postMaterials =
    calculatePostMaterials(
      posts
    );

  let claddingBoards = 0;
  let claddingMetres = 0;
  let claddingStock = 0;
  let claddingWaste = 0;
  let claddingCostExGST = 0;

  gates.forEach((gate) => {
    const calc =
      calculateCladdingMaterial(
        gate,
        gate.widthMm,
        gate.heightMm
      );

    claddingBoards +=
      calc.boards;

    claddingMetres +=
      calc.usedM;

    claddingStock +=
      calc.stockLengths;

    claddingWaste +=
      calc.wasteM;

    claddingCostExGST +=
      calc.costExGST;
  });

  panelComponents.forEach(
    (component) => {
      const panel =
        readPanel(component);

      const matchingGate =
        getMatchingGateForPanel(
          component
        );

      if (!matchingGate) {
        return;
      }

      const gate =
        readGate(
          matchingGate
        );

      const panelGate = {
        ...gate,
        claddingDirection:
          panel.direction
      };

      const calc =
        calculateCladdingMaterial(
          panelGate,
          panel.widthMm,
          panel.heightMm
        );

      claddingBoards +=
        calc.boards;

      claddingMetres +=
        calc.usedM;

      claddingStock +=
        calc.stockLengths;

      claddingWaste +=
        calc.wasteM;

      claddingCostExGST +=
        calc.costExGST;
    }
  );

  let hingeCostExGST = 0;
  let latchCostExGST = 0;
  let screwsCostExGST = 0;

  gates.forEach((gate) => {
    if (includeState.frame) {
      hingeCostExGST +=
        toExGST(
          PRICES.hardware.hinges
            .pricePerSet,
          PRICES.hardware.hinges
            .priceIncludesGST
        );
    }

    if (gate.latch === "other") {
      latchCostExGST +=
        toExGST(
          gate.otherLatchCost,
          true
        );
    }

    else {
      const latch =
        PRICES.hardware.latches[
          gate.latch
        ];

      latchCostExGST +=
        toExGST(
          latch.price,
          latch.priceIncludesGST
        );
    }

    if (includeState.cladding) {
      screwsCostExGST +=
        toExGST(
          PRICES.hardware.screws
            .defaultPerGate,
          PRICES.hardware.screws
            .priceIncludesGST
        );
    }
  });

  const powderCostExGST =
    calculatePowderCoating(
      posts,
      gates,
      panels
    );

  const gateArea =
    gates.reduce(
      (sum, gate) =>
        sum +
        (
          gate.widthMm /
          1000
        ) *
        (
          gate.heightMm /
          1000
        ),
      0
    );

  const panelArea =
    panels.reduce(
      (sum, panel) =>
        sum +
        (
          panel.widthMm /
          1000
        ) *
        (
          panel.heightMm /
          1000
        ),
      0
    );

  const projectArea =
    gateArea +
    panelArea;

  const anyPowderCoated =
    posts.some(
      (post) =>
        post.powderCoated
    ) ||
    gates.some(
      (gate) =>
        gate.powderCoated
    ) ||
    panels.some(
      (panel) =>
        panel.powderCoated
    );

  const touchUpRaw =
    anyPowderCoated
      ? 0
      : projectArea *
        PRICES.galvanisedFinish
          .pricePerM2;

  const touchUpCostExGST =
    toExGST(
      touchUpRaw,
      PRICES.galvanisedFinish
        .priceIncludesGST
    );

  const extraMaterialExGST =
    toExGST(
      safeNumber(
        $("extraHardware").value
      ),
      true
    );

  const materialsExGST =
    frame.costExGST +
    postMaterials
      .steelCostExGST +
    postMaterials
      .concreteCostExGST +
    postMaterials
      .boltCostExGST +
    postMaterials
      .baseplateCostExGST +
    claddingCostExGST +
    hingeCostExGST +
    latchCostExGST +
    screwsCostExGST +
    powderCostExGST +
    touchUpCostExGST +
    extraMaterialExGST;

  const labourEstimate =
    calculateLabourEstimate(
      posts,
      gates,
      panels
    );

  $("estimatedFabricationHours")
    .textContent =
    `${labourEstimate.fabrication.toFixed(2)} hrs`;

  $("estimatedInstallationHours")
    .textContent =
    `${labourEstimate.installation.toFixed(2)} hrs`;

  const override =
    $("overrideLabour").checked;

  const fabricationHours =
    override
      ? safeNumber(
          $("fabricationHoursOverride")
            .value
        )
      : labourEstimate.fabrication;

  const installationHours =
    override
      ? safeNumber(
          $("installationHoursOverride")
            .value
        )
      : labourEstimate.installation;

  const labourHours =
    fabricationHours +
    installationHours;

  const labourCostExGST =
    labourHours *
    PRICES.business
      .labourRateExGST;

  const oneWayKm =
    safeNumber(
      $("travelKm").value
    );

  const returnKm =
    oneWayKm * 2;

  const includedReturnKm =
    PRICES.business
      .travelFreeOneWayKm *
    2;

  const chargeableKm =
    Math.max(
      0,
      returnKm -
      includedReturnKm
    );

  const travelCostExGST =
    chargeableKm *
    PRICES.business
      .travelRatePerKm;

  const otherCostsExGST =
    toExGST(
      safeNumber(
        $("otherCosts").value
      ),
      true
    );

  const markup =
    materialsExGST *
    PRICES.business
      .materialMarkup;

  const exGST =
    materialsExGST +
    labourCostExGST +
    travelCostExGST +
    otherCostsExGST +
    markup;

  const gst =
    exGST *
    PRICES.business.gst;

  const incGST =
    exGST + gst;

  const rounded =
    roundUp(
      incGST,
      PRICES.business.roundTo
    );

  if (
    !$("finalPrice").value ||
    !lastCalculation ||
    Math.abs(
      safeNumber(
        $("finalPrice").value
      ) -
      lastCalculation.rounded
    ) < 0.01
  ) {
    $("finalPrice").value =
      rounded;
  }

  $("frameMetres")
    .textContent =
    `${frame.usedM.toFixed(2)} m`;

  $("frameLengths")
    .textContent =
    frame.stockLengths;

  $("frameWaste")
    .textContent =
    `${frame.wasteM.toFixed(2)} m`;

  $("postMetres")
    .textContent =
    `${postMaterials.usedM.toFixed(2)} m`;

  $("postLengths")
    .textContent =
    postMaterials.stockLengths;

  $("postWaste")
    .textContent =
    `${postMaterials.wasteM.toFixed(2)} m`;

  $("claddingBoards")
    .textContent =
    claddingBoards;

  $("claddingMetres")
    .textContent =
    `${claddingMetres.toFixed(2)} m`;

  $("claddingStockLengths")
    .textContent =
    claddingStock;

  $("claddingWaste")
    .textContent =
    `${claddingWaste.toFixed(2)} m`;

  $("materialsTotal")
    .textContent =
    money(materialsExGST);

  $("labourTotal")
    .textContent =
    money(labourCostExGST);

  $("travelTotal")
    .textContent =
    money(travelCostExGST);

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

  lastCalculation = {
    posts,
    gates,
    panels,
    frame,
    postMaterials,
    claddingCostExGST,
    materialsExGST,
    labourCostExGST,
    travelCostExGST,
    otherCostsExGST,
    markup,
    exGST,
    gst,
    incGST,
    rounded,
    projectArea,
    powderCostExGST,
    touchUpCostExGST
  };

  updateFinalPricing();
  updateFabricationView(
    posts,
    gates,
    panels
  );

  updateDetailedCosting();
}


// ============================================================
// FINAL PRICE
// ============================================================

function updateFinalPricing() {
  if (!lastCalculation) {
    return;
  }

  const finalIncGST =
    safeNumber(
      $("finalPrice").value
    );

  const finalExGST =
    finalIncGST /
    (1 + PRICES.business.gst);

  const finalGST =
    finalIncGST -
    finalExGST;

  const actualCosts =
    lastCalculation.materialsExGST +
    lastCalculation.labourCostExGST +
    lastCalculation.travelCostExGST +
    lastCalculation.otherCostsExGST;

  const profit =
    finalExGST -
    actualCosts;

  $("profitTotal")
    .textContent =
    money(profit);

  if (
    lastCalculation.projectArea > 0
  ) {
    $("effectiveRate")
      .textContent =
      `${money(
        finalIncGST /
        lastCalculation.projectArea
      )}/m²`;
  }

  else {
    $("effectiveRate")
      .textContent =
      "N/A";
  }

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
// DETAILED COSTING
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
          ${money(c.postMaterials.steelCostExGST)}
        </strong>
      </p>

      <p>
        <span>Concrete</span>
        <strong>
          ${money(c.postMaterials.concreteCostExGST)}
        </strong>
      </p>

      <p>
        <span>Dynabolts</span>
        <strong>
          ${money(c.postMaterials.boltCostExGST)}
        </strong>
      </p>

      <p>
        <span>Baseplates</span>
        <strong>
          ${money(c.postMaterials.baseplateCostExGST)}
        </strong>
      </p>

      <p>
        <span>Cladding</span>
        <strong>
          ${money(c.claddingCostExGST)}
        </strong>
      </p>

      <p>
        <span>Powder coating</span>
        <strong>
          ${money(c.powderCostExGST)}
        </strong>
      </p>

      <p>
        <span>Duragalv touch-up</span>
        <strong>
          ${money(c.touchUpCostExGST)}
        </strong>
      </p>

      <p>
        <span>Labour</span>
        <strong>
          ${money(c.labourCostExGST)}
        </strong>
      </p>

      <p>
        <span>Travel</span>
        <strong>
          ${money(c.travelCostExGST)}
        </strong>
      </p>

      <p>
        <span>Material markup</span>
        <strong>
          ${money(c.markup)}
        </strong>
      </p>

    `;
}


// ============================================================
// QUOTE DESCRIPTION
// ============================================================

function getGateCladdingText(gate) {
  const data =
    PRICES.cladding[
      gate.claddingType
    ];

  if (!data) {
    return "";
  }

  if (
    gate.claddingType ===
    "ekodeck"
  ) {
    return (
      `${data.label}, ` +
      `${gate.ekodeckColour}, ` +
      `${gate.claddingDirection}`
    );
  }

  if (
    gate.claddingType ===
    "cypressPickets"
  ) {
    let text =
      `${data.label}, ` +
      `${gate.cypressFinish}`;

    if (
      gate.cypressFinish ===
      "Paint" &&
      gate.cypressColour
    ) {
      text +=
        ` ${gate.cypressColour}`;
    }

    return (
      `${text}, ` +
      `${gate.claddingDirection}`
    );
  }

  if (
    gate.claddingType ===
    "losp50" ||
    gate.claddingType ===
    "losp90"
  ) {
    let text =
      `${data.label}, ` +
      `${gate.lospFinish}`;

    if (
      gate.lospFinish ===
      "Paint" &&
      gate.lospColour
    ) {
      text +=
        ` ${gate.lospColour}`;
    }

    return (
      `${text}, ` +
      `${gate.claddingDirection}`
    );
  }

  if (
    gate.claddingType ===
    "merbau90" ||
    gate.claddingType ===
    "merbau140"
  ) {
    return (
      `${data.label}, ` +
      `${gate.merbauFinish}, ` +
      `${gate.claddingDirection}`
    );
  }

  if (
    gate.claddingType ===
    "colorbond"
  ) {
    return (
      `Colorbond ${gate.colorbondProfile}, ` +
      `${gate.colorbondColour}`
    );
  }

  return (
    gate.customDescription ||
    "Custom cladding"
  );
}

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

  const html = [];

  html.push(`
    <p>
      <strong>Scope of Works</strong>
    </p>
  `);

  c.gates.forEach((gate) => {
    html.push(`
      <p>
        <strong>${gate.label}:</strong>
        ${gate.widthMm}mm wide ×
        ${gate.heightMm}mm high.
        Hinge ${gate.hingeSide},
        opens ${gate.openDirection}.
      </p>
    `);

    if (includeState.frame) {
      html.push(`
        <p>
          <strong>Frame:</strong>
          ${
            PRICES.steel.frame[
              gate.frameKey
            ].label
          }
        </p>
      `);
    }

    if (includeState.cladding) {
      html.push(`
        <p>
          <strong>Cladding:</strong>
          ${getGateCladdingText(gate)}
        </p>
      `);
    }

    const latchLabel =
      gate.latch === "other"
        ? gate.otherLatchDescription
        : PRICES.hardware.latches[
            gate.latch
          ].label;

    html.push(`
      <p>
        <strong>Hardware:</strong>
        Lock-out galvanised hinges;
        ${latchLabel}.
      </p>
    `);
  });

  c.posts.forEach((post) => {
    if (
      post.fixing === "existing"
    ) {
      return;
    }

    let description = "";

    if (post.fixing === "brick") {
      description =
        "fixed to existing brickwork";
    }

    else if (
      post.fixing ===
      "concreteHouse"
    ) {
      description =
        "concreted next to house";
    }

    else if (
      post.fixing ===
      "concreteFloating"
    ) {
      description =
        "concreted floating";
    }

    else if (
      post.fixing ===
      "baseplate"
    ) {
      description =
        "baseplated to existing concrete";
    }

    else {
      description =
        "concreted fixed-panel post";
    }

    html.push(`
      <p>
        <strong>${post.label}:</strong>
        ${post.postLabel},
        ${description}.
      </p>
    `);
  });

  c.panels.forEach((panel) => {
    html.push(`
      <p>
        <strong>${panel.label}:</strong>
        ${panel.widthMm}mm wide ×
        ${panel.heightMm}mm high,
        ${panel.direction} cladding.
      </p>
    `);
  });

  const keyedAlike =
    c.gates.length > 1;

  if (keyedAlike) {
    html.push(`
      <p>
        <strong>Latches:</strong>
        Keyed alike where applicable.
      </p>
    `);
  }

  const hasPowder =
    c.posts.some(
      (post) =>
        post.powderCoated
    ) ||
    c.gates.some(
      (gate) =>
        gate.powderCoated
    ) ||
    c.panels.some(
      (panel) =>
        panel.powderCoated
    );

  if (hasPowder) {
    html.push(`
      <p>
        <strong>Finish:</strong>
        Powder coated as selected.
        <br>
        <em>
          ${PRICES.quote.powderCoatLeadTime}
        </em>
      </p>
    `);
  }

  else if (includeState.frame) {
    html.push(`
      <p>
        <strong>Finish:</strong>
        ${PRICES.galvanisedFinish.quoteText}
      </p>
    `);
  }

  html.push(`
    <p>
      <strong>Terms:</strong>
      ${PRICES.quote.depositText}
    </p>
  `);

  $("quoteDescription")
    .innerHTML =
    html.join("");

  buildEmailAndSmsText(
    finalExGST,
    finalGST,
    finalIncGST
  );
}


// ============================================================
// SMS / EMAIL TEXT
// ============================================================

function buildEmailAndSmsText(
  finalExGST,
  finalGST,
  finalIncGST
) {
  const customer =
    $("customerName").value.trim();

  const project =
    $("projectNumber").value.trim();

  const fullLines = [
    "JTLA GATES",
    "Jody Tuuta | 0439 517 783",
    "",
    `Quote ${project}`,
    `Customer: ${customer}`,
    `Site: ${$("siteAddress").value.trim()}`,
    "",
    "PROJECT DESCRIPTION"
  ];

  lastCalculation.gates
    .forEach((gate) => {
      fullLines.push(
        `${gate.label}: ${gate.widthMm} x ${gate.heightMm}mm, hinge ${gate.hingeSide}, opens ${gate.openDirection}`
      );

      if (includeState.cladding) {
        fullLines.push(
          `Cladding: ${getGateCladdingText(gate)}`
        );
      }
    });

  lastCalculation.panels
    .forEach((panel) => {
      fullLines.push(
        `${panel.label}: ${panel.widthMm} x ${panel.heightMm}mm, ${panel.direction} cladding`
      );
    });

  fullLines.push("");
  fullLines.push(
    `Price ex GST: ${money(finalExGST)}`
  );
  fullLines.push(
    `GST: ${money(finalGST)}`
  );
  fullLines.push(
    `TOTAL INC GST: ${money(finalIncGST)}`
  );
  fullLines.push("");
  fullLines.push(
    PRICES.quote.depositText
  );
  fullLines.push("");
  fullLines.push("Regards,");
  fullLines.push("Jody Tuuta");
  fullLines.push("JTLA Gates");
  fullLines.push("0439 517 783");

  currentQuoteText =
    fullLines.join("\n");
}


// ============================================================
// EMAIL / SMS
// ============================================================

function sendSMS() {
  calculateQuote();

  const phone =
    $("customerPhone").value.trim();

  if (!phone) {
    alert(
      "Enter the customer's phone number first."
    );

    return;
  }

  const project =
    $("projectNumber").value.trim();

  const customer =
    $("customerName").value.trim();

  const total =
    money(
      safeNumber(
        $("finalPrice").value
      )
    );

  const sms =
    `Hi ${customer}, ` +
    `JTLA Gates quote ${project}: ` +
    `${total} incl GST. ` +
    `50% deposit on acceptance, balance on completion. ` +
    `Regards, Jody Tuuta 0439 517 783`;

  window.location.href =
    `sms:${phone}?body=` +
    encodeURIComponent(sms);
}

function sendEmail() {
  calculateQuote();

  const email =
    $("customerEmail").value.trim();

  if (!email) {
    alert(
      "Enter the customer's email address first."
    );

    return;
  }

  const project =
    $("projectNumber").value.trim();

  const subject =
    `JTLA Gates Quote ${project}`;

  window.location.href =
    `mailto:${email}` +
    `?bcc=${encodeURIComponent(PRICES.quote.bccEmail)}` +
    `&subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(currentQuoteText)}`;
}

function printQuote() {
  calculateQuote();
  window.print();
}


// ============================================================
// SAVE / LOAD
// ============================================================

function serializeComponents() {
  return components.map(
    (component) => {
      if (component.type === "post") {
        return {
          ...component,
          data:
            readPost(component)
        };
      }

      if (component.type === "gate") {
        return {
          ...component,
          data:
            readGate(component)
        };
      }

      return {
        ...component,
        data:
          readPanel(component)
      };
    }
  );
}

function saveJob() {
  calculateQuote();

  const project =
    $("projectNumber").value.trim();

  if (
    !/^[0-9]{6}$/.test(
      project
    )
  ) {
    alert(
      "Project number is invalid."
    );

    return;
  }

  const job = {
    project,
    customer:
      $("customerName").value.trim(),
    site:
      $("siteAddress").value.trim(),
    phone:
      $("customerPhone").value.trim(),
    email:
      $("customerEmail").value.trim(),
    cavityWidth:
      $("cavityWidth").value,
    cavityHeight:
      $("cavityHeight").value,
    components:
      serializeComponents(),
    finalPrice:
      safeNumber(
        $("finalPrice").value
      ),
    savedAt:
      new Date().toISOString()
  };

  let jobs =
    JSON.parse(
      localStorage.getItem(
        "jtlaGateJobs"
      ) || "[]"
    );

  const index =
    jobs.findIndex(
      (item) =>
        item.project === project
    );

  if (index >= 0) {
    jobs[index] = job;
  }

  else {
    jobs.unshift(job);
  }

  localStorage.setItem(
    "jtlaGateJobs",
    JSON.stringify(jobs)
  );

  renderSavedJobs();
}

function renderSavedJobs() {
  const jobs =
    JSON.parse(
      localStorage.getItem(
        "jtlaGateJobs"
      ) || "[]"
    );

  const container =
    $("savedQuotes");

  if (!jobs.length) {
    container.innerHTML =
      `<p class="muted">
        No saved jobs yet.
      </p>`;

    return;
  }

  container.innerHTML =
    jobs.map(
      (job) => `
        <div class="saved-row">
          <div>
            <strong>${job.project}</strong>
            <span>${job.customer}</span>
            <small>${job.site}</small>
          </div>

          <div class="saved-actions">
            <strong>${money(job.finalPrice)}</strong>

            <button
              type="button"
              class="small"
              data-load="${job.project}"
            >
              Open
            </button>

            <button
              type="button"
              class="small danger"
              data-delete="${job.project}"
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
        () => {
          loadJob(
            button.dataset.load
          );
        }
      );
    });

  container
    .querySelectorAll(
      "[data-delete]"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          deleteJob(
            button.dataset.delete
          );
        }
      );
    });
}

function deleteJob(project) {
  let jobs =
    JSON.parse(
      localStorage.getItem(
        "jtlaGateJobs"
      ) || "[]"
    );

  jobs =
    jobs.filter(
      (job) =>
        job.project !== project
    );

  localStorage.setItem(
    "jtlaGateJobs",
    JSON.stringify(jobs)
  );

  renderSavedJobs();
}


// ============================================================
// NEW JOB
// ============================================================

function newJob() {
  advanceProjectNumber();

  components = [];
  componentCounter = 0;

  $("componentsContainer")
    .innerHTML = "";

  $("customerName").value = "";
  $("siteAddress").value = "";
  $("customerPhone").value = "";
  $("customerEmail").value = "";

  $("projectNumber").value =
    getNextProjectNumber();

  $("cavityWidth").value = "";
  $("cavityHeight").value = "";

  $("steppedSite").checked =
    false;

  $("steppedHeightAdjustment")
    .value = "";

  $("steppedNotes").value = "";

  $("travelKm").value = "";
  $("extraHardware").value = "";
  $("otherCosts").value = "";

  $("overrideLabour").checked =
    false;

  $("fabricationHoursOverride")
    .value = "";

  $("installationHoursOverride")
    .value = "";

  includeState = {
    frame: true,
    posts: true,
    cladding: true
  };

  updateIncludeButton(
    "includeFrameBtn",
    "frame"
  );

  updateIncludeButton(
    "includePostsBtn",
    "posts"
  );

  updateIncludeButton(
    "includeCladdingBtn",
    "cladding"
  );

  updateCustomerHeader();
  validateRequiredFields();
  renderMudMap();
  calculateQuote();
}


// ============================================================
// CONDITIONALS
// ============================================================

function updateAllConditionalFields() {
  components.forEach(
    (component) => {
      const card =
        document.querySelector(
          `[data-component-id="${component.id}"]`
        );

      if (!card) {
        return;
      }

      if (component.type === "post") {
        updatePostOptions(card);
      }

      else if (
        component.type === "gate"
      ) {
        updateGateOptions(card);
      }

      else {
        updatePanelOptions(card);
      }
    }
  );

  $("steppedSiteOptions")
    .classList.toggle(
      "hidden",
      !$("steppedSite").checked
    );

  $("labourOverrideFields")
    .classList.toggle(
      "hidden",
      !$("overrideLabour").checked
    );
}


// ============================================================
// EVENTS
// ============================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {
    $("projectNumber").value =
      getNextProjectNumber();

    updateCustomerHeader();

    setupIncludeButton(
      "includeFrameBtn",
      "frame"
    );

    setupIncludeButton(
      "includePostsBtn",
      "posts"
    );

    setupIncludeButton(
      "includeCladdingBtn",
      "cladding"
    );

    $("addPostBtn")
      .addEventListener(
        "click",
        () => {
          addComponent("post");
        }
      );

    $("addGateBtn")
      .addEventListener(
        "click",
        () => {
          addComponent("gate");
        }
      );

    $("addPanelBtn")
      .addEventListener(
        "click",
        () => {
          addComponent("panel");
        }
      );

    [
      "customerName",
      "siteAddress",
      "customerPhone",
      "customerEmail"
    ].forEach((id) => {
      $(id).addEventListener(
        "input",
        () => {
          updateCustomerHeader();
          validateRequiredFields();
          calculateQuote();
        }
      );
    });

    [
      "cavityWidth",
      "cavityHeight",
      "travelKm",
      "extraHardware",
      "otherCosts",
      "fabricationHoursOverride",
      "installationHoursOverride"
    ].forEach((id) => {
      $(id).addEventListener(
        "input",
        calculateQuote
      );
    });

    $("steppedSite")
      .addEventListener(
        "change",
        () => {
          updateAllConditionalFields();
        }
      );

    $("overrideLabour")
      .addEventListener(
        "change",
        () => {
          updateAllConditionalFields();
          calculateQuote();
        }
      );

    $("finalPrice")
      .addEventListener(
        "input",
        updateFinalPricing
      );

    $("saveBtn")
      .addEventListener(
        "click",
        saveJob
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
        newJob
      );

    renderSavedJobs();
    renderMudMap();
    validateRequiredFields();
    calculateQuote();
  }
);
