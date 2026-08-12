const $ = id => document.getElementById(id);

let components = [];
let selectedComponentId = null;
let componentCounter = 0;

let includeState = {
  frame: true,
  posts: true,
  cladding: true
};

let currentJobLoaded = false;
let lastCalculation = null;


// ============================================================
// HELPERS
// ============================================================

function n(value) {
  return Number(value || 0);
}

function money(value) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD"
  }).format(n(value));
}

function exGST(value, includesGST = true) {
  if (!includesGST) return n(value);

  return n(value) /
    (1 + PRICES.business.gst);
}

function roundUp(value) {
  return Math.ceil(
    n(value) /
    PRICES.business.roundTo
  ) *
  PRICES.business.roundTo;
}

function projectFormat(value) {
  return String(value)
    .padStart(6, "0");
}


// ============================================================
// PROJECT NUMBER
// ============================================================

function getCurrentProjectNumber() {

  let current =
    localStorage.getItem(
      "jtlaCurrentProjectNumber"
    );

  if (!current) {

    const next =
      localStorage.getItem(
        "jtlaNextProjectNumber"
      );

    current =
      next ||
      projectFormat(
        PRICES.projectNumbers
          .startingNumber
      );

    localStorage.setItem(
      "jtlaCurrentProjectNumber",
      current
    );
  }

  return current;
}

function createNextProjectNumber() {

  const current =
    Number(
      getCurrentProjectNumber()
    );

  const next =
    projectFormat(
      current + 1
    );

  localStorage.setItem(
    "jtlaCurrentProjectNumber",
    next
  );

  localStorage.setItem(
    "jtlaNextProjectNumber",
    next
  );

  return next;
}


// ============================================================
// GLOBAL CLADDING
// ============================================================

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
      !["losp50", "losp90"]
        .includes(type)
    );

  $("merbauOptions")
    .classList.toggle(
      "hidden",
      !["merbau90", "merbau140"]
        .includes(type)
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

  updateGateRailVisibility();
  updatePanelRailInformation();
}


// ============================================================
// COMPONENT ADD
// ============================================================

function addComponent(type) {

  componentCounter++;

  const component = {
    id: `c${componentCounter}`,
    type
  };

  components.push(component);

  buildComponentCard(component);

  renumberComponents();

  selectedComponentId =
    component.id;

  refreshEverything();

  jumpToComponent(
    component.id
  );
}


// ============================================================
// BUILD COMPONENT CARD
// ============================================================

function buildComponentCard(component) {

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

  const body =
    shell.querySelector(
      ".component-body"
    );

  let template;

  if (component.type === "post") {
    template = $("postTemplate");
  }

  else if (
    component.type === "gate"
  ) {
    template = $("gateTemplate");
  }

  else {
    template = $("panelTemplate");
  }

  body.appendChild(
    template.content.cloneNode(true)
  );

  $("componentsContainer")
    .appendChild(shell);

  const inserted =
    document.querySelector(
      `[data-component-id="${component.id}"]`
    );

  setupComponent(
    inserted,
    component
  );
}


// ============================================================
// SETUP COMPONENT
// ============================================================

function setupComponent(
  card,
  component
) {

  card.querySelector(
    ".remove-btn"
  ).addEventListener(
    "click",
    () =>
      removeComponent(
        component.id
      )
  );

  if (component.type === "post") {
    setupPost(card);
  }

  if (component.type === "gate") {
    setupGate(card);
  }

  card
    .querySelectorAll(
      "input, select"
    )
    .forEach(field => {

      field.addEventListener(
        "input",
        refreshEverything
      );

      field.addEventListener(
        "change",
        refreshEverything
      );

    });
}


// ============================================================
// POST
// ============================================================

function setupPost(card) {

  const select =
    card.querySelector(
      ".post-size"
    );

  Object.entries(
    PRICES.steel.posts
  ).forEach(
    ([key, value]) => {

      const option =
        document.createElement(
          "option"
        );

      option.value = key;
      option.textContent =
        value.label;

      select.appendChild(option);
    }
  );

  select.value =
    PRICES.defaults.postType;

  card.querySelector(
    ".post-fixing"
  ).addEventListener(
    "change",
    () => {
      updatePostConditional(card);

      if (
        card.querySelector(
          ".post-fixing"
        ).value === "brick" &&
        card.querySelector(
          ".hole-list"
        ).children.length === 0
      ) {

        addHole(card);
        addHole(card);
        addHole(card);
      }
    }
  );

  card.querySelector(
    ".add-hole"
  ).addEventListener(
    "click",
    () => addHole(card)
  );

  card.querySelector(
    ".house-bolt-enabled"
  ).addEventListener(
    "change",
    () =>
      updatePostConditional(card)
  );
}

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

  input.value = value;

  row.querySelector(
    ".remove-hole"
  ).addEventListener(
    "click",
    () => {
      row.remove();
      refreshEverything();
    }
  );

  input.addEventListener(
    "input",
    refreshEverything
  );

  card.querySelector(
    ".hole-list"
  ).appendChild(fragment);
}

function updatePostConditional(card) {

  const fixing =
    card.querySelector(
      ".post-fixing"
    ).value;

  card.querySelector(
    ".brick-holes"
  ).classList.toggle(
    "hidden",
    fixing !== "brick"
  );

  card.querySelector(
    ".house-bolt"
  ).classList.toggle(
    "hidden",
    fixing !== "concreteHouse"
  );

  card.querySelector(
    ".floating-offset"
  ).classList.toggle(
    "hidden",
    fixing !== "concreteFloating"
  );

  const top =
    card.querySelector(
      ".house-bolt-enabled"
    ).checked;

  card.querySelector(
    ".house-bolt-position"
  ).classList.toggle(
    "hidden",
    !top
  );

  const height =
    n(
      card.querySelector(
        ".post-height"
      ).value
    );

  let cut = 0;

  if (
    fixing === "brick" ||
    fixing === "baseplate"
  ) {
    cut = height;
  }

  else if (
    fixing &&
    fixing !== "existing"
  ) {
    cut =
      height +
      PRICES.rules
        .concreteEmbedMm;
  }

  card.querySelector(
    ".post-cut"
  ).textContent =
    cut
      ? `${cut} mm`
      : "-";
}


// ============================================================
// GATE
// ============================================================

function setupGate(card) {

  const frame =
    card.querySelector(
      ".gate-frame"
    );

  Object.entries(
    PRICES.steel.frame
  ).forEach(
    ([key, value]) => {

      const option =
        document.createElement(
          "option"
        );

      option.value = key;
      option.textContent =
        value.label;

      frame.appendChild(option);
    }
  );

  frame.value =
    PRICES.defaults.frame;


  const latch =
    card.querySelector(
      ".gate-latch"
    );

  Object.entries(
    PRICES.hardware.latches
  ).forEach(
    ([key, value]) => {

      const option =
        document.createElement(
          "option"
        );

      option.value = key;
      option.textContent =
        value.label;

      latch.appendChild(option);
    }
  );

  latch.value =
    PRICES.defaults.latch;

  latch.addEventListener(
    "change",
    () => {
      card.querySelector(
        ".other-latch"
      ).classList.toggle(
        "hidden",
        latch.value !== "other"
      );
    }
  );
}


// ============================================================
// RAILS
// ============================================================

function updateGateRailVisibility() {

  const direction =
    $("claddingDirection").value;

  getCards("gate")
    .forEach(card => {

      card.querySelector(
        ".horizontal-rail-wrap"
      ).classList.toggle(
        "hidden",
        direction !== "vertical"
      );

      card.querySelector(
        ".vertical-rail-wrap"
      ).classList.toggle(
        "hidden",
        direction !== "horizontal"
      );
    });
}

function updatePanelRailInformation() {

  const direction =
    $("claddingDirection").value;

  getCards("panel")
    .forEach(card => {

      const info =
        card.querySelector(
          ".panel-rail-info"
        );

      if (
        direction === "horizontal"
      ) {

        info.innerHTML =
          `<div class="calculated-line">
             <span>Panel rails</span>
             <strong>None</strong>
           </div>`;
      }

      else if (
        direction === "vertical"
      ) {

        const height =
          n(
            card.querySelector(
              ".panel-height"
            ).value
          );

        const rails =
          height
            ? Math.min(
                3,
                Math.max(
                  1,
                  Math.ceil(
                    height / 900
                  )
                )
              )
            : 0;

        info.innerHTML =
          `<div class="calculated-line">
             <span>Horizontal fixing rails</span>
             <strong>
               ${rails || "-"}
             </strong>
           </div>`;
      }

      else {
        info.innerHTML = "";
      }
    });
}


// ============================================================
// FIND CARDS
// ============================================================

function getCards(type) {

  return components
    .filter(c =>
      c.type === type
    )
    .map(c =>
      document.querySelector(
        `[data-component-id="${c.id}"]`
      )
    )
    .filter(Boolean);
}


// ============================================================
// READ POSTS
// ============================================================

function readPosts() {

  return components
    .filter(c =>
      c.type === "post"
    )
    .map(component => {

      const card =
        document.querySelector(
          `[data-component-id="${component.id}"]`
        );

      const key =
        card.querySelector(
          ".post-size"
        ).value;

      const fixing =
        card.querySelector(
          ".post-fixing"
        ).value;

      const height =
        n(
          card.querySelector(
            ".post-height"
          ).value
        );

      const holes =
        [...card.querySelectorAll(
          ".hole-position"
        )]
        .map(x => n(x.value))
        .filter(Boolean);

      let cut = 0;

      if (
        fixing === "brick" ||
        fixing === "baseplate"
      ) {
        cut = height;
      }

      else if (
        fixing &&
        fixing !== "existing"
      ) {
        cut =
          height +
          PRICES.rules
            .concreteEmbedMm;
      }

      return {
        id: component.id,
        label: component.label,
        key,
        fixing,
        height,
        cut,
        width:
          PRICES.steel.posts[key]
            .widthMm,
        holes,
        topHole:
          card.querySelector(
            ".house-bolt-enabled"
          ).checked
            ? n(
                card.querySelector(
                  ".top-hole-position"
                ).value
              )
            : 0
      };
    });
}


// ============================================================
// READ GATES
// ============================================================

function readGates() {

  return components
    .filter(c =>
      c.type === "gate"
    )
    .map(component => {

      const card =
        document.querySelector(
          `[data-component-id="${component.id}"]`
        );

      return {
        id: component.id,
        label: component.label,

        width:
          n(
            card.dataset
              .calculatedWidth
          ),

        height:
          n(
            card.querySelector(
              ".gate-height"
            ).value
          ),

        frame:
          card.querySelector(
            ".gate-frame"
          ).value,

        hRails:
          n(
            card.querySelector(
              ".horizontal-rails"
            ).value
          ),

        vRails:
          n(
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
          n(
            card.querySelector(
              ".other-latch-cost"
            ).value
          )
      };
    });
}


// ============================================================
// READ PANELS
// ============================================================

function readPanels() {

  return components
    .filter(c =>
      c.type === "panel"
    )
    .map(component => {

      const card =
        document.querySelector(
          `[data-component-id="${component.id}"]`
        );

      return {
        id: component.id,
        label: component.label,

        width:
          n(
            card.querySelector(
              ".panel-width"
            ).value
          ),

        height:
          n(
            card.querySelector(
              ".panel-height"
            ).value
          )
      };
    });
}


// ============================================================
// GATE WIDTH CALCULATION
// ============================================================

function calculateGateWidths() {

  const cavity =
    n(
      $("cavityWidth").value
    );

  const gates =
    components.filter(
      c => c.type === "gate"
    );

  if (
    !cavity ||
    gates.length === 0
  ) {
    return;
  }

  const posts =
    readPosts();

  const panels =
    readPanels();

  const postWidth =
    posts.reduce(
      (sum, p) =>
        sum +
        (
          p.fixing === "existing"
            ? 0
            : p.width
        ),
      0
    );

  const panelWidth =
    panels.reduce(
      (sum, p) =>
        sum + p.width,
      0
    );

  const gaps =
    Math.max(
      0,
      components.length - 1
    ) *
    PRICES.rules.componentGapMm;

  const remaining =
    Math.max(
      0,
      cavity -
      postWidth -
      panelWidth -
      gaps
    );

  const each =
    Math.round(
      remaining /
      gates.length
    );

  gates.forEach(
    component => {

      const card =
        document.querySelector(
          `[data-component-id="${component.id}"]`
        );

      card.dataset
        .calculatedWidth =
        each;

      card.querySelector(
        ".gate-width-display"
      ).textContent =
        `${each} mm`;
    });
}


// ============================================================
// COMPLETION
// ============================================================

function componentComplete(component) {

  const card =
    document.querySelector(
      `[data-component-id="${component.id}"]`
    );

  if (!card) return false;


  if (
    component.type === "post"
  ) {

    const fixing =
      card.querySelector(
        ".post-fixing"
      ).value;

    if (!fixing) return false;

    if (
      fixing === "existing"
    ) return true;

    const height =
      n(
        card.querySelector(
          ".post-height"
        ).value
      );

    if (!height) return false;

    if (
      fixing === "brick"
    ) {

      return [
        ...card.querySelectorAll(
          ".hole-position"
        )
      ].some(
        x => n(x.value) > 0
      );
    }

    if (
      fixing === "concreteHouse" &&
      card.querySelector(
        ".house-bolt-enabled"
      ).checked
    ) {

      return n(
        card.querySelector(
          ".top-hole-position"
        ).value
      ) > 0;
    }

    return true;
  }


  if (
    component.type === "gate"
  ) {

    return (
      n(
        card.dataset
          .calculatedWidth
      ) > 0
      &&
      n(
        card.querySelector(
          ".gate-height"
        ).value
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


  if (
    component.type === "panel"
  ) {

    return (
      n(
        card.querySelector(
          ".panel-width"
        ).value
      ) > 0
      &&
      n(
        card.querySelector(
          ".panel-height"
        ).value
      ) > 0
    );
  }

  return false;
}


// ============================================================
// RENUMBER
// ============================================================

function renumberComponents() {

  let p = 0;
  let g = 0;
  let f = 0;

  components.forEach(component => {

    if (
      component.type === "post"
    ) {
      component.label =
        `P${++p}`;
    }

    else if (
      component.type === "gate"
    ) {
      component.label =
        `G${++g}`;
    }

    else {
      component.label =
        `FP${++f}`;
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


// ============================================================
// MUD MAP
// ============================================================

function renderMudMap() {

  const map =
    $("mudMap");

  map.innerHTML = "";

  if (
    components.length === 0
  ) {

    map.innerHTML =
      `<div class="mud-empty">
        Add components below
       </div>`;

    return;
  }

  components.forEach(component => {

    const complete =
      componentComplete(component);

    const wrapper =
      document.createElement("div");

    wrapper.className =
      "mud-item";

    const button =
      document.createElement("button");

    button.className =
      `mud-component ${
        complete
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
        card?.querySelector(
          ".hinge-side"
        ).value;

      if (hinge) {

        const h =
          document.createElement(
            "span"
          );

        h.className =
          `mud-hinge ${hinge}`;

        h.textContent = "H";

        button.appendChild(h);

        const l =
          document.createElement(
            "span"
          );

        l.className =
          `mud-latch ${
            hinge === "left"
              ? "right"
              : "left"
          }`;

        l.textContent = "L";

        button.appendChild(l);
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

      left.textContent = "◀";

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

      const right =
        document.createElement(
          "button"
        );

      right.textContent = "▶";

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


// ============================================================
// MOVE COMPONENT
// ============================================================

function moveComponent(
  id,
  direction
) {

  const index =
    components.findIndex(
      c => c.id === id
    );

  const target =
    index + direction;

  if (
    target < 0 ||
    target >=
      components.length
  ) return;

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


// ============================================================
// JUMP
// ============================================================

function jumpToComponent(id) {

  const card =
    document.querySelector(
      `[data-component-id="${id}"]`
    );

  if (!card) return;

  card.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}


// ============================================================
// REMOVE
// ============================================================

function removeComponent(id) {

  components =
    components.filter(
      c => c.id !== id
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


// ============================================================
// POST HEIGHT PROPAGATION
// ============================================================

function propagatePostHeight() {

  const cards =
    getCards("post");

  let firstHeight = 0;

  for (
    const card of cards
  ) {

    const value =
      n(
        card.querySelector(
          ".post-height"
        ).value
      );

    if (value) {
      firstHeight = value;
      break;
    }
  }

  if (!firstHeight) return;

  cards.forEach(card => {

    const input =
      card.querySelector(
        ".post-height"
      );

    if (!input.value) {
      input.value =
        firstHeight;
    }
  });
}


// ============================================================
// POWDER COATING
// ============================================================

function renderPowderComponents() {

  const list =
    $("powderComponentList");

  list.innerHTML = "";

  components.forEach(component => {

    let amount = 0;
    let allowed = true;

    if (
      component.type === "gate"
    ) {
      amount =
        PRICES.powderCoating
          .gateEach;
    }

    else if (
      component.type === "post"
    ) {

      const card =
        document.querySelector(
          `[data-component-id="${component.id}"]`
        );

      const fixing =
        card?.querySelector(
          ".post-fixing"
        ).value;

      if (
        fixing === "existing"
      ) {
        allowed = false;
      }

      amount =
        PRICES.powderCoating
          .postEach;
    }

    else {

      if (
        $("claddingDirection")
          .value === "vertical"
      ) {

        amount =
          PRICES.powderCoating
            .verticalFixedPanelEach;
      }

      else {
        allowed = false;
      }
    }

    if (!allowed) return;

    const label =
      document.createElement(
        "label"
      );

    label.className =
      "powder-item";

    label.innerHTML =
      `
      <input
        type="checkbox"
        class="powder-component-check"
        data-id="${component.id}"
      >
      <span>
        ${component.label}
      </span>
      <strong>
        ${money(amount)}
      </strong>
      `;

    list.appendChild(label);
  });

  list.querySelectorAll(
    ".powder-component-check"
  ).forEach(box => {

    box.addEventListener(
      "change",
      refreshEverything
    );
  });
}

function powderCostIncGST() {

  if (
    !$("powderEnabled").checked
  ) return 0;

  let total = 0;

  document
    .querySelectorAll(
      ".powder-component-check:checked"
    )
    .forEach(box => {

      const component =
        components.find(
          c =>
            c.id ===
            box.dataset.id
        );

      if (!component) return;

      if (
        component.type === "gate"
      ) {
        total +=
          PRICES.powderCoating
            .gateEach;
      }

      else if (
        component.type === "post"
      ) {
        total +=
          PRICES.powderCoating
            .postEach;
      }

      else {
        total +=
          PRICES.powderCoating
            .verticalFixedPanelEach;
      }
    });

  return total;
}


// ============================================================
// LABOUR
// ============================================================

function labourEstimate(
  posts,
  gates,
  panels
) {

  let fabrication =
    gates.length *
    PRICES.labour
      .gateFabricationHoursEach;

  fabrication +=
    panels.length *
    PRICES.labour
      .fixedPanelFabricationHoursEach;

  let installation =
    gates.length *
    PRICES.labour
      .gateInstallHoursEach;

  posts.forEach(post => {

    if (
      post.fixing &&
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

    if (post.topHole) {

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
      ].includes(
        post.fixing
      )
    ) {

      installation +=
        PRICES.labour
          .concretePostInstallHoursEach;
    }

    if (
      post.fixing ===
      "baseplate"
    ) {

      installation +=
        PRICES.labour
          .baseplatePostInstallHoursEach;
    }
  });

  return {
    fabrication,
    installation
  };
}


// ============================================================
// STOCK
// ============================================================

function stockPieces(
  pieces,
  stockLength
) {

  const valid =
    pieces
      .filter(Boolean)
      .sort(
        (a,b) => b-a
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
        stockLength
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
      (a,b) => a+b,
      0
    );

  const purchased =
    bins.length *
    stockLength;

  return {
    lengths: bins.length,
    used,
    waste:
      purchased - used
  };
}


// ============================================================
// MAIN CALCULATION
// ============================================================

function calculateQuote() {

  calculateGateWidths();

  const posts =
    readPosts();

  const gates =
    readGates();

  const panels =
    readPanels();


  // FRAME

  let framePieces = [];
  let frameCost = 0;

  gates.forEach(gate => {

    if (
      !gate.width ||
      !gate.height
    ) return;

    const frame =
      PRICES.steel.frame[
        gate.frame
      ];

    const w =
      gate.width / 1000;

    const h =
      gate.height / 1000;

    framePieces.push(
      w,w,h,h
    );

    if (
      $("claddingDirection")
        .value === "vertical"
    ) {

      const rail =
        Math.max(
          0,
          gate.width -
          frame.faceMm * 2
        ) / 1000;

      for (
        let i = 0;
        i < gate.hRails;
        i++
      ) {
        framePieces.push(
          rail
        );
      }
    }

    if (
      $("claddingDirection")
        .value === "horizontal"
    ) {

      const rail =
        Math.max(
          0,
          gate.height -
          frame.faceMm * 2
        ) / 1000;

      for (
        let i = 0;
        i < gate.vRails;
        i++
      ) {
        framePieces.push(
          rail
        );
      }
    }
  });


  // vertical panels use horizontal rails

  if (
    $("claddingDirection")
      .value === "vertical"
  ) {

    panels.forEach(panel => {

      if (
        !panel.width ||
        !panel.height
      ) return;

      const rails =
        Math.min(
          3,
          Math.max(
            1,
            Math.ceil(
              panel.height / 900
            )
          )
        );

      const length =
        panel.width / 1000;

      for (
        let i = 0;
        i < rails;
        i++
      ) {
        framePieces.push(
          length
        );
      }
    });
  }

  const frameStock =
    stockPieces(
      framePieces,
      8
    );

  if (
    includeState.frame
  ) {

    frameCost =
      frameStock.lengths *
      exGST(
        PRICES.steel.frame[
          PRICES.defaults.frame
        ].pricePerStockLength,
        true
      );
  }


  // POSTS

  const postPieces =
    posts
      .filter(
        p =>
          p.fixing &&
          p.fixing !== "existing"
      )
      .map(
        p => p.cut / 1000
      );

  const postStock =
    stockPieces(
      postPieces,
      8
    );

  let postSteelCost = 0;

  if (
    includeState.posts
  ) {

    const groups = {};

    posts.forEach(post => {

      if (
        !post.cut ||
        post.fixing === "existing"
      ) return;

      if (!groups[post.key]) {
        groups[post.key] = [];
      }

      groups[post.key]
        .push(
          post.cut / 1000
        );
    });

    Object.entries(groups)
      .forEach(
        ([key,pieces]) => {

          const steel =
            PRICES.steel.posts[
              key
            ];

          const stock =
            stockPieces(
              pieces,
              steel.stockLengthM
            );

          postSteelCost +=
            stock.lengths *
            exGST(
              steel.pricePerStockLength,
              steel.priceIncludesGST
            );
        }
      );
  }


  // CONCRETE / BOLTS / BASEPLATES

  let concreteInc = 0;
  let boltsInc = 0;
  let baseplatesInc = 0;

  posts.forEach(post => {

    if (
      [
        "concreteHouse",
        "concreteFloating",
        "fixedPanelLeft",
        "fixedPanelCentre",
        "fixedPanelRight"
      ].includes(post.fixing)
    ) {

      concreteInc +=
        PRICES.postFixing
          .concrete
          .defaultBagsPerPost *
        PRICES.postFixing
          .concrete
          .pricePerBag;
    }

    if (
      post.fixing === "brick"
    ) {

      boltsInc +=
        post.holes.length *
        PRICES.postFixing
          .dynabolts
          .priceEach;
    }

    if (post.topHole) {

      boltsInc +=
        PRICES.postFixing
          .dynabolts
          .priceEach;
    }

    if (
      post.fixing === "baseplate"
    ) {

      baseplatesInc +=
        PRICES.postFixing
          .baseplate
          .allowanceEach;
    }
  });


  // LATCHES / HINGES

  let hardwareEx = 0;

  gates.forEach(gate => {

    hardwareEx +=
      exGST(
        PRICES.hardware.hinges
          .pricePerSet,
        true
      );

    if (
      gate.latch === "other"
    ) {

      hardwareEx +=
        exGST(
          gate.otherLatchCost,
          true
        );
    }

    else {

      const latch =
        PRICES.hardware.latches[
          gate.latch
        ];

      if (latch) {

        hardwareEx +=
          exGST(
            latch.price,
            latch.priceIncludesGST
          );
      }
    }
  });


  // POWDER

  const powderInc =
    powderCostIncGST();

  $("powderTotalDisplay")
    .textContent =
    money(powderInc);


  // CLADDING

  const cladding =
    calculateGlobalCladding(
      gates,
      panels
    );


  const materialsEx =
    frameCost +
    postSteelCost +
    exGST(concreteInc, true) +
    exGST(boltsInc, true) +
    exGST(baseplatesInc, true) +
    hardwareEx +
    cladding.costExGST +
    exGST(powderInc, true) +
    exGST(
      n(
        $("extraHardware").value
      ),
      true
    );


  // LABOUR

  const estimate =
    labourEstimate(
      posts,
      gates,
      panels
    );

  $("estimatedFabricationHours")
    .textContent =
      `${estimate.fabrication.toFixed(2)} hrs`;

  $("estimatedInstallationHours")
    .textContent =
      `${estimate.installation.toFixed(2)} hrs`;

  const override =
    $("overrideLabour").checked;

  const fabHours =
    override
      ? n(
          $("fabricationHoursOverride")
            .value
        )
      : estimate.fabrication;

  const installHours =
    override
      ? n(
          $("installationHoursOverride")
            .value
        )
      : estimate.installation;

  const labourEx =
    (
      fabHours +
      installHours
    ) *
    PRICES.business
      .labourRateExGST;


  // TRAVEL

  const oneWay =
    n(
      $("travelKm").value
    );

  const chargeable =
    Math.max(
      0,
      oneWay -
      PRICES.business
        .travelFreeOneWayKm
    );

  const travelEx =
    chargeable *
    2 *
    PRICES.business
      .travelRatePerKm;


  const otherEx =
    exGST(
      n(
        $("otherCosts").value
      ),
      true
    );


  const markup =
    materialsEx *
    PRICES.business
      .materialMarkup;


  const totalEx =
    materialsEx +
    labourEx +
    travelEx +
    otherEx +
    markup;

  const gst =
    totalEx *
    PRICES.business.gst;

  const calculatedInc =
    totalEx + gst;

  const rounded =
    roundUp(
      calculatedInc
    );


  if (
    !$("finalPrice").value ||
    !lastCalculation
  ) {

    $("finalPrice").value =
      rounded;
  }


  // DISPLAY

  $("frameMetres")
    .textContent =
      `${frameStock.used.toFixed(2)} m`;

  $("frameLengths")
    .textContent =
      frameStock.lengths;

  $("frameWaste")
    .textContent =
      `${frameStock.waste.toFixed(2)} m`;

  $("postMetres")
    .textContent =
      `${postStock.used.toFixed(2)} m`;

  $("postLengths")
    .textContent =
      postStock.lengths;

  $("postWaste")
    .textContent =
      `${postStock.waste.toFixed(2)} m`;

  $("claddingBoards")
    .textContent =
      cladding.boards;

  $("claddingMetres")
    .textContent =
      `${cladding.metres.toFixed(2)} m`;

  $("materialsTotal")
    .textContent =
      money(materialsEx);

  $("labourTotal")
    .textContent =
      money(labourEx);

  $("travelTotal")
    .textContent =
      money(travelEx);

  $("markupTotal")
    .textContent =
      money(markup);

  $("gstTotal")
    .textContent =
      money(gst);


  lastCalculation = {
    posts,
    gates,
    panels,
    materialsEx,
    labourEx,
    travelEx,
    otherEx,
    markup,
    totalEx,
    gst,
    rounded,
    cladding,
    powderInc
  };

  updateFinalPriceDisplays();
  updateFabrication();
  updateLayoutCheck();
}


// ============================================================
// GLOBAL CLADDING CALC
// ============================================================

function calculateGlobalCladding(
  gates,
  panels
) {

  if (
    !includeState.cladding
  ) {

    return {
      boards: 0,
      metres: 0,
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
      costExGST: 0
    };
  }

  let boards = 0;
  let metres = 0;
  let costInc = 0;

  const areas = [
    ...gates.map(g => ({
      width: g.width,
      height: g.height
    })),

    ...panels.map(p => ({
      width: p.width,
      height: p.height
    }))
  ];


  if (
    type === "custom"
  ) {

    return {
      boards: 0,
      metres: 0,

      costExGST:
        exGST(
          n(
            $("customCost").value
          ),
          true
        )
    };
  }


  if (
    type === "colorbond"
  ) {

    const m2 =
      areas.reduce(
        (sum,a) =>
          sum +
          a.width / 1000 *
          a.height / 1000,
        0
      );

    costInc =
      m2 *
      n(data.pricePerM2);

    return {
      boards: 0,
      metres: 0,
      costExGST:
        exGST(
          costInc,
          data.priceIncludesGST
        )
    };
  }


  const module =
    data.boardWidthMm +
    PRICES.rules.claddingGapMm;

  areas.forEach(area => {

    if (
      !area.width ||
      !area.height
    ) return;

    const count =
      Math.ceil(
        (
          direction === "vertical"
            ? area.width
            : area.height
        ) /
        module
      );

    const length =
      (
        direction === "vertical"
          ? area.height
          : area.width
      ) / 1000;

    boards += count;

    metres +=
      count * length;
  });


  if (
    type === "ekodeck"
  ) {

    const lengths =
      Math.ceil(
        metres /
        data.stockLengthM
      );

    costInc =
      lengths *
      data.pricePerStockLength;
  }

  else {

    costInc =
      metres *
      n(data.pricePerLinealM);
  }


  return {
    boards,
    metres,

    costExGST:
      exGST(
        costInc,
        data.priceIncludesGST
      )
  };
}


// ============================================================
// FINAL PRICE
// ============================================================

function updateFinalPriceDisplays() {

  if (!lastCalculation) return;

  const inc =
    n(
      $("finalPrice").value
    );

  const ex =
    inc /
    (1 + PRICES.business.gst);

  const gst =
    inc - ex;

  const actualCosts =
    lastCalculation.materialsEx +
    lastCalculation.labourEx +
    lastCalculation.travelEx +
    lastCalculation.otherEx;

  const profit =
    ex - actualCosts;


  $("profitTotal")
    .textContent =
      money(profit);

  $("quoteExGstDisplay")
    .textContent =
      money(ex);

  $("quoteGstDisplay")
    .textContent =
      money(gst);

  $("quoteTotalDisplay")
    .textContent =
      money(inc);


  const area =
    [
      ...lastCalculation.gates,
      ...lastCalculation.panels
    ]
    .reduce(
      (sum,item) =>
        sum +
        item.width / 1000 *
        item.height / 1000,
      0
    );

  $("effectiveRate")
    .textContent =
      area
        ? `${money(inc / area)}/m²`
        : "N/A";

  buildQuote();
}


// ============================================================
// FABRICATION
// ============================================================

function updateFabrication() {

  if (!lastCalculation) return;

  const html = [];

  lastCalculation.posts
    .forEach(post => {

      html.push(`
        <div class="fabrication-item">

          <strong>
            ${post.label}
          </strong>

          <span>
            ${
              PRICES.steel.posts[
                post.key
              ].label
            }
          </span>

          ${
            post.cut
              ? `<span>
                   CUT ${post.cut}mm
                 </span>`
              : ""
          }

          ${
            post.fixing === "brick"
              ? `<span>
                  Holes @
                  ${post.holes.join(" / ")}
                  mm from top
                </span>`
              : ""
          }

          ${
            post.topHole
              ? `<span>
                  Top hole @
                  ${post.topHole}mm
                </span>`
              : ""
          }

        </div>
      `);
    });


  lastCalculation.gates
    .forEach(gate => {

      html.push(`
        <div class="fabrication-item">

          <strong>
            ${gate.label}
          </strong>

          <span>
            ${gate.width}
            ×
            ${gate.height}mm
          </span>

          <span>
            Hinge ${gate.hinge || "-"},
            open ${gate.opens || "-"}
          </span>

        </div>
      `);
    });


  lastCalculation.panels
    .forEach(panel => {

      html.push(`
        <div class="fabrication-item">

          <strong>
            ${panel.label}
          </strong>

          <span>
            ${panel.width}
            ×
            ${panel.height}mm
          </span>

        </div>
      `);
    });


  $("fabricationView")
    .innerHTML =
      html.join("");
}


// ============================================================
// LAYOUT CHECK
// ============================================================

function updateLayoutCheck() {

  const cavity =
    n(
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

  const postWidth =
    posts.reduce(
      (sum,p) =>
        sum +
        (
          p.fixing === "existing"
            ? 0
            : p.width
        ),
      0
    );

  const other =
    [
      ...gates,
      ...panels
    ].reduce(
      (sum,item) =>
        sum + item.width,
      0
    );

  const gaps =
    Math.max(
      0,
      components.length - 1
    ) *
    PRICES.rules.componentGapMm;

  const total =
    postWidth +
    other +
    gaps;

  const difference =
    cavity - total;


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
        `${Math.round(difference)}mm still unallocated`;
  }
}


// ============================================================
// QUOTE
// ============================================================

function claddingDescription() {

  const type =
    $("claddingType").value;

  const data =
    PRICES.cladding[type];

  if (!data) return "";

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
      $("cypressFinish").value
        === "Paint"
    ) {
      text +=
        ` ${$("cypressColour").value}`;
    }
  }

  if (
    ["losp50","losp90"]
      .includes(type)
  ) {

    text +=
      `, ${$("lospFinish").value}`;

    if (
      $("lospFinish").value
        === "Paint"
    ) {
      text +=
        ` ${$("lospColour").value}`;
    }
  }

  if (
    ["merbau90","merbau140"]
      .includes(type)
  ) {

    text +=
      `, ${$("merbauFinish").value}`;
  }

  if (
    type === "colorbond"
  ) {

    text +=
      `, ${$("colorbondProfile").value}, ${$("colorbondColour").value}`;
  }

  text +=
    `, ${$("claddingDirection").value}`;

  return text;
}

function buildQuote() {

  if (!lastCalculation) return;

  const html = [];

  html.push(`
    <p>
      <strong>
        Quote ${$("projectNumber").value}
      </strong>
    </p>

    <p>
      ${$("customerName").value}
      <br>
      ${$("siteAddress").value}
    </p>
  `);


  lastCalculation.gates
    .forEach(gate => {

      const latch =
        gate.latch === "other"
          ? gate.otherLatch
          : PRICES.hardware
              .latches[
                gate.latch
              ]?.label;

      html.push(`
        <p>
          <strong>
            ${gate.label}
          </strong>
          ${gate.width} ×
          ${gate.height}mm.
          Hinge ${gate.hinge},
          open ${gate.opens}.
          ${latch || ""}.
        </p>
      `);
    });


  if (
    includeState.cladding
  ) {

    html.push(`
      <p>
        <strong>
          Cladding:
        </strong>
        ${claddingDescription()}
      </p>
    `);
  }


  lastCalculation.panels
    .forEach(panel => {

      html.push(`
        <p>
          <strong>
            ${panel.label}
          </strong>
          ${panel.width}
          ×
          ${panel.height}mm
          fixed panel.
        </p>
      `);
    });


  if (
    $("powderEnabled").checked &&
    powderCostIncGST() > 0
  ) {

    html.push(`
      <p>
        <strong>
          Powder coated:
        </strong>
        ${$("powderColour").value}.
        Allow approximately 2 weeks
        for processing.
      </p>
    `);
  }

  else {

    html.push(`
      <p>
        Duragalv steel with exposed
        fabrication areas treated
        with etch primer and silver
        galvanising spray.
      </p>
    `);
  }


  html.push(`
    <p>
      <strong>
        50% deposit required on acceptance.
      </strong>
      Balance payable on completion.
    </p>
  `);


  $("quoteDescription")
    .innerHTML =
      html.join("");
}


// ============================================================
// SAVE CURRENT WORKING JOB
// ============================================================

function getJobData() {

  return {
    project:
      $("projectNumber").value,

    customer:
      $("customerName").value,

    address:
      $("siteAddress").value,

    phone:
      $("customerPhone").value,

    email:
      $("customerEmail").value,

    cavityWidth:
      $("cavityWidth").value,

    cavityHeight:
      $("cavityHeight").value,

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
        $("colorbondColour").value
    },

    includeState,

    components:
      components.map(component => {

        if (
          component.type === "post"
        ) {
          return {
            type: "post",
            data:
              readPosts()
                .find(
                  p =>
                    p.id ===
                    component.id
                )
          };
        }

        if (
          component.type === "gate"
        ) {
          return {
            type: "gate",
            data:
              readGates()
                .find(
                  g =>
                    g.id ===
                    component.id
                )
          };
        }

        return {
          type: "panel",
          data:
            readPanels()
              .find(
                p =>
                  p.id ===
                  component.id
              )
        };
      }),

    finalPrice:
      $("finalPrice").value,

    travelKm:
      $("travelKm").value,

    extraHardware:
      $("extraHardware").value,

    otherCosts:
      $("otherCosts").value
  };
}

function saveCurrentJob() {

  localStorage.setItem(
    "jtlaCurrentJob",
    JSON.stringify(
      getJobData()
    )
  );
}


// ============================================================
// UPDATE BUTTON
// ============================================================

function updateJob() {

  propagatePostHeight();

  refreshEverything();

  saveCurrentJob();

  updateTopBar();

  flashUpdateButton();
}

function flashUpdateButton() {

  const button =
    $("updateBtn");

  const original =
    button.textContent;

  button.textContent =
    "UPDATED";

  button.classList.add(
    "updated"
  );

  setTimeout(
    () => {

      button.textContent =
        original;

      button.classList.remove(
        "updated"
      );
    },
    900
  );
}


// ============================================================
// REFRESH EVERYTHING
// ============================================================

function refreshEverything() {

  propagatePostHeight();

  calculateGateWidths();

  getCards("post")
    .forEach(
      updatePostConditional
    );

  updateCladdingUI();

  renumberComponents();

  components.forEach(component => {

    const card =
      document.querySelector(
        `[data-component-id="${component.id}"]`
      );

    const complete =
      componentComplete(component);

    card?.classList.toggle(
      "complete",
      complete
    );

    card?.classList.toggle(
      "incomplete",
      !complete
    );

    const status =
      card?.querySelector(
        ".component-status"
      );

    if (status) {

      status.textContent =
        complete
          ? "COMPLETE"
          : "INCOMPLETE";
    }
  });

  renderMudMap();
  renderPowderComponents();
  calculateQuote();
  updateTopBar();
}


// ============================================================
// TOP BAR
// ============================================================

function updateTopBar() {

  $("topCustomerName")
    .textContent =
      $("customerName").value ||
      "New Job";

  $("topCustomerPhone")
    .textContent =
      $("customerPhone").value;

  $("topProjectNumber")
    .textContent =
      $("projectNumber").value;
}


// ============================================================
// NEW JOB
// ============================================================

function newJob() {

  if (
    !confirm(
      "Start a new job? This will clear the current working job."
    )
  ) return;

  localStorage.removeItem(
    "jtlaCurrentJob"
  );

  const project =
    createNextProjectNumber();

  location.reload();
}


// ============================================================
// SMS
// ============================================================

function sendSMS() {

  updateJob();

  const phone =
    $("customerPhone").value;

  const name =
    $("customerName").value;

  const total =
    money(
      $("finalPrice").value
    );

  const text =
    `Hi ${name}, JTLA Gates quote ` +
    `${$("projectNumber").value}: ` +
    `${total} incl GST. ` +
    `50% deposit on acceptance, ` +
    `balance on completion. ` +
    `Regards, Jody Tuuta 0439 517 783`;

  location.href =
    `sms:${phone}?body=` +
    encodeURIComponent(text);
}


// ============================================================
// EMAIL
// ============================================================

function sendEmail() {

  updateJob();

  const email =
    $("customerEmail").value;

  const subject =
    `JTLA Gates Quote ${$("projectNumber").value}`;

  const body =
    document
      .getElementById(
        "quoteDescription"
      )
      .innerText +
    `\n\nTOTAL INC GST: ` +
    `${$("quoteTotalDisplay").innerText}` +
    `\n\nRegards,\nJody Tuuta\nJTLA Gates\n0439 517 783`;

  location.href =
    `mailto:${email}` +
    `?bcc=${encodeURIComponent(PRICES.quote.bccEmail)}` +
    `&subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(body)}`;
}


// ============================================================
// PRINT
// ============================================================

function printQuote() {
  updateJob();
  window.print();
}


// ============================================================
// POPULATE COLOURS
// ============================================================

function populateColours() {

  [
    $("colorbondColour"),
    $("powderColour")
  ].forEach(select => {

    select.innerHTML = "";

    PRICES.colours
      .slice()
      .sort()
      .forEach(colour => {

        const option =
          document.createElement(
            "option"
          );

        option.value = colour;
        option.textContent =
          colour;

        select.appendChild(
          option
        );
      });
  });
}


// ============================================================
// INITIALISE
// ============================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    populateColours();

    $("projectNumber").value =
      getCurrentProjectNumber();


    // ADD COMPONENTS

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


    // INCLUDE

    [
      ["includeFrameBtn","frame"],
      ["includePostsBtn","posts"],
      ["includeCladdingBtn","cladding"]
    ].forEach(
      ([id,key]) => {

        $(id).addEventListener(
          "click",
          () => {

            includeState[key] =
              !includeState[key];

            $(id).classList.toggle(
              "on",
              includeState[key]
            );

            $(id).classList.toggle(
              "off",
              !includeState[key]
            );

            $(id).textContent =
              `${key.toUpperCase()} ${
                includeState[key]
                  ? "ON"
                  : "OFF"
              }`;

            refreshEverything();
          }
        );
      }
    );


    // GLOBAL CLADDING

    [
      "claddingType",
      "claddingDirection",
      "ekodeckColour",
      "cypressFinish",
      "cypressColour",
      "lospFinish",
      "lospColour",
      "merbauFinish",
      "colorbondProfile",
      "colorbondColour",
      "customDescription",
      "customCost",
      "cavityWidth",
      "cavityHeight"
    ].forEach(id => {

      $(id).addEventListener(
        "input",
        refreshEverything
      );

      $(id).addEventListener(
        "change",
        refreshEverything
      );
    });


    // CUSTOMER

    [
      "customerName",
      "customerPhone",
      "siteAddress",
      "customerEmail"
    ].forEach(id => {

      $(id).addEventListener(
        "input",
        updateTopBar
      );
    });


    // POWDER

    $("powderEnabled")
      .addEventListener(
        "change",
        () => {

          $("powderOptions")
            .classList.toggle(
              "hidden",
              !$("powderEnabled")
                .checked
            );

          renderPowderComponents();
          refreshEverything();
        }
      );


    // LABOUR

    $("overrideLabour")
      .addEventListener(
        "change",
        () => {

          $("labourOverride")
            .classList.toggle(
              "hidden",
              !$("overrideLabour")
                .checked
            );

          refreshEverything();
        }
      );


    [
      "fabricationHoursOverride",
      "installationHoursOverride",
      "travelKm",
      "extraHardware",
      "otherCosts"
    ].forEach(id => {

      $(id).addEventListener(
        "input",
        refreshEverything
      );
    });


    $("finalPrice")
      .addEventListener(
        "input",
        updateFinalPriceDisplays
      );


    // MAIN ACTIONS

    $("updateBtn")
      .addEventListener(
        "click",
        updateJob
      );

    $("saveBtn")
      .addEventListener(
        "click",
        updateJob
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

    $("newJobBtn")
      .addEventListener(
        "click",
        newJob
      );


    updateCladdingUI();

    updateTopBar();

    renderMudMap();

    calculateQuote();

  }
);
