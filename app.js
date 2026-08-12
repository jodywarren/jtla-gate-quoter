/* ==========================================================
   JTLA GATE QUOTER
   APP ENGINE
   ========================================================== */

const $ = id => document.getElementById(id);

let components = [];
let selectedComponentId = null;
let componentCounter = 0;

let includeState = {
  frame: true,
  posts: true,
  cladding: true
};

let lastCalculation = null;


/* ==========================================================
   BASIC HELPERS
========================================================== */

function num(value) {
  return Number(value || 0);
}

function money(value) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD"
  }).format(num(value));
}

function toExGST(value, includesGST = true) {
  if (!includesGST) {
    return num(value);
  }

  return num(value) / (1 + PRICES.business.gst);
}

function roundQuote(value) {
  return Math.ceil(
    num(value) / PRICES.business.roundTo
  ) * PRICES.business.roundTo;
}

function formatProject(value) {
  return String(value).padStart(6, "0");
}


/* ==========================================================
   PROJECT NUMBER
========================================================== */

function getCurrentProjectNumber() {

  let current =
    localStorage.getItem(
      "jtlaCurrentProjectNumber"
    );

  if (!current) {

    current = formatProject(
      PRICES.projects.startingProjectNumber
    );

    localStorage.setItem(
      "jtlaCurrentProjectNumber",
      current
    );
  }

  return current;
}

function nextProjectNumber() {

  const current =
    Number(getCurrentProjectNumber());

  const next =
    formatProject(current + 1);

  localStorage.setItem(
    "jtlaCurrentProjectNumber",
    next
  );

  return next;
}


/* ==========================================================
   COLOURS
========================================================== */

function populateColours() {

  [
    $("colorbondColour"),
    $("powderColour")
  ].forEach(select => {

    if (!select) return;

    select.innerHTML = "";

    [...PRICES.colours]
      .sort()
      .forEach(colour => {

        const option =
          document.createElement("option");

        option.value = colour;
        option.textContent = colour;

        select.appendChild(option);
      });
  });
}


/* ==========================================================
   GLOBAL CLADDING
========================================================== */

function updateCladdingUI() {

  const type =
    $("claddingType").value;

  const direction =
    $("claddingDirection").value;

  const claddingEnabled =
    includeState.cladding;


  /*
     Entire global cladding area disappears
     when CLADDING OFF.
  */

  [
    $("claddingType")?.closest("label"),
    $("claddingDirection")?.closest("label"),
    $("ekodeckOptions"),
    $("cypressOptions"),
    $("lospOptions"),
    $("merbauOptions"),
    $("colorbondOptions"),
    $("customOptions")
  ].forEach(element => {

    if (!element) return;

    if (!claddingEnabled) {
      element.classList.add("hidden");
    }
  });


  if (!claddingEnabled) {

    updateGateRailVisibility();
    updatePanelRailInformation();

    return;
  }


  $("claddingType")
    .closest("label")
    ?.classList.remove("hidden");

  $("claddingDirection")
    .closest("label")
    ?.classList.remove("hidden");


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
      $("cypressFinish").value !== "Paint"
    );


  $("lospColourWrap")
    .classList.toggle(
      "hidden",
      $("lospFinish").value !== "Paint"
    );


  updateGateRailVisibility();
  updatePanelRailInformation();
}


/* ==========================================================
   ADD COMPONENT
========================================================== */

function addComponent(type) {

  componentCounter++;

  const component = {
    id: `c${componentCounter}`,
    type
  };

  components.push(component);

  buildComponentCard(component);

  /*
     Component is deliberately NOT selected and
     we DO NOT jump down the page.

     This lets you build the whole mud map first.
  */

  renumberComponents();

  refreshEverything();
}


/* ==========================================================
   BUILD COMPONENT CARD
========================================================== */

function buildComponentCard(component) {

  $("noComponentsMessage")?.remove();

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
    component
  );
}


/* ==========================================================
   COMPONENT SETUP
========================================================== */

function setupComponent(
  card,
  component
) {

  card.querySelector(
    ".remove-btn"
  ).addEventListener(
    "click",
    () => {
      removeComponent(component.id);
    }
  );


  if (component.type === "post") {
    setupPost(card);
  }

  if (component.type === "gate") {
    setupGate(card);
  }


  card
    .querySelectorAll(
      "input, select, textarea"
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


/* ==========================================================
   FIND COMPONENT CARDS
========================================================== */

function getCards(type) {

  return components
    .filter(
      component =>
        component.type === type
    )
    .map(
      component =>
        document.querySelector(
          `[data-component-id="${component.id}"]`
        )
    )
    .filter(Boolean);
}


/* ==========================================================
   POST
========================================================== */

function setupPost(card) {

  const select =
    card.querySelector(
      ".post-size"
    );


  Object.entries(
    PRICES.steel.posts
  ).forEach(([key, item]) => {

    const option =
      document.createElement("option");

    option.value = key;
    option.textContent = item.label;

    select.appendChild(option);
  });


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
        ).value === "brick"
        &&
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
    () => updatePostConditional(card)
  );


  updatePostConditional(card);
}


function addHole(card, value = "") {

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


  const houseBolt =
    card.querySelector(
      ".house-bolt-enabled"
    ).checked;


  card.querySelector(
    ".house-bolt-position"
  ).classList.toggle(
    "hidden",
    !houseBolt
  );


  const height =
    num(
      card.querySelector(
        ".post-height"
      ).value
    );


  let cutLength = 0;


  if (
    fixing === "brick" ||
    fixing === "baseplate"
  ) {

    cutLength = height;
  }

  else if (
    fixing &&
    fixing !== "existing"
  ) {

    cutLength =
      height +
      PRICES.defaults
        .concreteEmbedmentMm;
  }


  card.querySelector(
    ".post-cut"
  ).textContent =
    cutLength
      ? `${cutLength} mm`
      : "-";
}


/* ==========================================================
   GATE
========================================================== */

function setupGate(card) {

  const frame =
    card.querySelector(
      ".gate-frame"
    );


  Object.entries(
    PRICES.steel.frame
  ).forEach(([key, item]) => {

    const option =
      document.createElement("option");

    option.value = key;
    option.textContent = item.label;

    frame.appendChild(option);
  });


  frame.value =
    PRICES.defaults.frameType;


  const latch =
    card.querySelector(
      ".gate-latch"
    );


  Object.entries(
    PRICES.hardware.latches
  ).forEach(([key, item]) => {

    const option =
      document.createElement("option");

    option.value = key;
    option.textContent = item.label;

    latch.appendChild(option);
  });


  latch.value = "ddDualKey";


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


/* ==========================================================
   POST HEIGHT PROPAGATION
========================================================== */

function propagatePostHeight() {

  const cards =
    getCards("post");

  let firstHeight = 0;


  for (const card of cards) {

    const height =
      num(
        card.querySelector(
          ".post-height"
        ).value
      );

    if (height) {

      firstHeight = height;

      break;
    }
  }


  if (!firstHeight) {
    return;
  }


  cards.forEach(card => {

    const input =
      card.querySelector(
        ".post-height"
      );

    if (!input.value) {
      input.value = firstHeight;
    }
  });
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


      const height =
        num(
          card.querySelector(
            ".post-height"
          ).value
        );


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
          value => value > 0
        );


      const topHole =
        card.querySelector(
          ".house-bolt-enabled"
        ).checked
        ?
        num(
          card.querySelector(
            ".top-hole-position"
          ).value
        )
        :
        0;


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
          PRICES.defaults
            .concreteEmbedmentMm;
      }


      return {

        id: component.id,
        label: component.label,

        steelKey,

        steelLabel:
          steel.label,

        width:
          steel.widthMm,

        fixing,

        height,

        cut,

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


/* ==========================================================
   GATE HEIGHT
========================================================== */

function getGateBaseHeight(
  gateComponent
) {

  const gateIndex =
    components.findIndex(
      component =>
        component.id ===
        gateComponent.id
    );


  /*
     First look for a post immediately
     either side of this gate.
  */

  for (
    let distance = 1;
    distance <= components.length;
    distance++
  ) {

    const left =
      components[
        gateIndex - distance
      ];

    const right =
      components[
        gateIndex + distance
      ];


    for (const item of [left, right]) {

      if (
        !item ||
        item.type !== "post"
      ) {
        continue;
      }


      const card =
        document.querySelector(
          `[data-component-id="${item.id}"]`
        );


      const height =
        num(
          card?.querySelector(
            ".post-height"
          )?.value
        );


      if (height > 0) {

        return height;
      }
    }
  }


  /*
     Otherwise use overall cavity height.
  */

  return num(
    $("cavityHeight").value
  );
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

        id: component.id,
        label: component.label,

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

        id: component.id,
        label: component.label,

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
          )
      };
    });
}


/* ==========================================================
   AUTO GATE DIMENSIONS
========================================================== */

function calculateGateDimensions() {

  const cavityWidth =
    num(
      $("cavityWidth").value
    );


  const gates =
    components.filter(
      component =>
        component.type === "gate"
    );


  if (!gates.length) {
    return;
  }


  const posts =
    readPosts();

  const panels =
    readPanels();


  let postsWidth = 0;


  if (includeState.posts) {

    postsWidth =
      posts.reduce(
        (sum, post) => {

          if (
            post.fixing === "existing"
          ) {
            return sum;
          }

          return sum +
            post.width;
        },
        0
      );
  }


  const panelsWidth =
    panels.reduce(
      (sum, panel) =>
        sum + panel.width,
      0
    );


  const gaps =
    Math.max(
      0,
      components.length - 1
    ) *
    PRICES.defaults
      .componentGapMm;


  const availableGateWidth =
    Math.max(
      0,
      cavityWidth -
      postsWidth -
      panelsWidth -
      gaps
    );


  const gateWidth =
    gates.length
    ?
    Math.floor(
      availableGateWidth /
      gates.length
    )
    :
    0;


  gates.forEach(component => {

    const card =
      document.querySelector(
        `[data-component-id="${component.id}"]`
      );


    const baseHeight =
      getGateBaseHeight(
        component
      );


    const gateHeight =
      Math.max(
        0,
        baseHeight -
        PRICES.defaults
          .gateGroundGapMm
      );


    card.dataset.calculatedWidth =
      gateWidth;

    card.dataset.calculatedHeight =
      gateHeight;


    card.querySelector(
      ".gate-width-display"
    ).textContent =
      gateWidth
      ?
      `${gateWidth} mm`
      :
      "-";


    /*
       Gate height input is now replaced
       by the automatic value visually.
    */

    const heightInput =
      card.querySelector(
        ".gate-height"
      );


    if (heightInput) {

      heightInput.value =
        gateHeight || "";

      heightInput.readOnly = true;

      heightInput.placeholder =
        "Calculated";
    }
  });
}


/* ==========================================================
   RAIL VISIBILITY
========================================================== */

function updateGateRailVisibility() {

  const direction =
    $("claddingDirection").value;


  getCards("gate")
    .forEach(card => {

      /*
         If cladding is OFF, rails tied to
         cladding disappear as well.
      */

      const show =
        includeState.cladding;


      card.querySelector(
        ".horizontal-rail-wrap"
      ).classList.toggle(
        "hidden",
        !show ||
        direction !== "vertical"
      );


      card.querySelector(
        ".vertical-rail-wrap"
      ).classList.toggle(
        "hidden",
        !show ||
        direction !== "horizontal"
      );


      /*
         FRAME OFF means hide frame selector
         and all mid rails.
      */

      const frameLabel =
        card.querySelector(
          ".gate-frame"
        )?.closest("label");


      frameLabel?.classList.toggle(
        "hidden",
        !includeState.frame
      );


      if (!includeState.frame) {

        card.querySelector(
          ".horizontal-rail-wrap"
        ).classList.add("hidden");

        card.querySelector(
          ".vertical-rail-wrap"
        ).classList.add("hidden");
      }
    });
}


/* ==========================================================
   PANEL INFORMATION
========================================================== */

function updatePanelRailInformation() {

  const direction =
    $("claddingDirection").value;


  getCards("panel")
    .forEach(card => {

      const summary =
        card.querySelector(
          ".panel-cladding-summary"
        );


      const railInfo =
        card.querySelector(
          ".panel-rail-info"
        );


      if (!includeState.cladding) {

        summary
          .closest(
            ".calculated-line"
          )
          ?.classList.add(
            "hidden"
          );

        railInfo.innerHTML = "";

        return;
      }


      summary
        .closest(
          ".calculated-line"
        )
        ?.classList.remove(
          "hidden"
        );


      summary.textContent =
        claddingDescription();


      if (
        direction === "horizontal"
      ) {

        railInfo.innerHTML =
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

        const height =
          num(
            card.querySelector(
              ".panel-height"
            ).value
          );


        const railCount =
          height
          ?
          Math.min(
            3,
            Math.max(
              1,
              Math.ceil(
                height /
                PRICES.defaults
                  .fixedPanelVerticalRailSpacingApproxMm
              )
            )
          )
          :
          0;


        railInfo.innerHTML =
          `
          <div class="calculated-line">
            <span>Horizontal fixing rails</span>
            <strong>
              ${railCount || "-"}
            </strong>
          </div>
          `;
      }


      else {

        railInfo.innerHTML = "";
      }
    });
}


/* ==========================================================
   TOGGLE VISIBILITY
========================================================== */

function updateIncludeVisibility() {

  /*
     Post cards
  */

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

      card?.classList.toggle(
        "component-disabled",
        !includeState.posts
      );
    });


  /*
     Material summary boxes
  */

  const frameElements = [
    $("frameMetres")?.parentElement,
    $("frameLengths")?.parentElement,
    $("frameWaste")?.parentElement
  ];

  frameElements.forEach(element => {
    element?.classList.toggle(
      "hidden",
      !includeState.frame
    );
  });


  const postElements = [
    $("postMetres")?.parentElement,
    $("postLengths")?.parentElement,
    $("postWaste")?.parentElement
  ];

  postElements.forEach(element => {
    element?.classList.toggle(
      "hidden",
      !includeState.posts
    );
  });


  const claddingElements = [
    $("claddingBoards")?.parentElement,
    $("claddingMetres")?.parentElement
  ];

  claddingElements.forEach(element => {
    element?.classList.toggle(
      "hidden",
      !includeState.cladding
    );
  });


  updateCladdingUI();
  updateGateRailVisibility();
  updatePanelRailInformation();
}


/* ==========================================================
   COMPONENT COMPLETION
========================================================== */

function componentComplete(component) {

  const card =
    document.querySelector(
      `[data-component-id="${component.id}"]`
    );


  if (!card) {
    return false;
  }


  if (component.type === "post") {

    if (!includeState.posts) {
      return true;
    }


    const fixing =
      card.querySelector(
        ".post-fixing"
      ).value;


    if (!fixing) {
      return false;
    }


    if (fixing === "existing") {
      return true;
    }


    const height =
      num(
        card.querySelector(
          ".post-height"
        ).value
      );


    if (!height) {
      return false;
    }


    if (fixing === "brick") {

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
      fixing === "concreteHouse"
      &&
      card.querySelector(
        ".house-bolt-enabled"
      ).checked
    ) {

      return num(
        card.querySelector(
          ".top-hole-position"
        ).value
      ) > 0;
    }


    return true;
  }


  if (component.type === "gate") {

    const width =
      num(
        card.dataset
          .calculatedWidth
      );


    const height =
      num(
        card.dataset
          .calculatedHeight
      );


    return Boolean(
      width > 0
      &&
      height > 0
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


  if (component.type === "panel") {

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


  return false;
}


/* ==========================================================
   RENUMBER
========================================================== */

function renumberComponents() {

  let post = 0;
  let gate = 0;
  let panel = 0;


  components.forEach(component => {

    if (component.type === "post") {
      component.label =
        `P${++post}`;
    }

    else if (
      component.type === "gate"
    ) {
      component.label =
        `G${++gate}`;
    }

    else {
      component.label =
        `FP${++panel}`;
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
   MUD MAP
========================================================== */

function renderMudMap() {

  const map =
    $("mudMap");

  map.innerHTML = "";


  if (!components.length) {

    map.innerHTML =
      `
      <div class="mud-empty">
        Add components below
      </div>
      `;

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


    if (component.type === "gate") {

      const card =
        document.querySelector(
          `[data-component-id="${component.id}"]`
        );


      const hinge =
        card?.querySelector(
          ".hinge-side"
        )?.value;


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


    /*
       Single tap:
       select + jump.
    */

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


    /*
       Move arrows only appear
       for selected component.
    */

    if (
      selectedComponentId ===
      component.id
    ) {

      const controls =
        document.createElement("div");

      controls.className =
        "mud-move-controls";


      const left =
        document.createElement("button");

      left.type = "button";
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
        document.createElement("button");

      right.type = "button";
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


/* ==========================================================
   MOVE COMPONENT
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
  ] =
  [
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


/* ==========================================================
   JUMP
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


/* ==========================================================
   REMOVE
========================================================== */

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
   STOCK OPTIMISATION
========================================================== */

function stockPieces(
  pieces,
  stockLength
) {

  const valid =
    pieces
      .filter(
        piece => piece > 0
      )
      .sort(
        (a, b) => b - a
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
      (sum, value) =>
        sum + value,
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
      purchased - used
  };
}


/* ==========================================================
   CLADDING COST
========================================================== */

function calculateGlobalCladding(
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


  if (type === "custom") {

    return {
      boards: 0,
      metres: 0,
      stockLengths: 0,
      waste: 0,

      costExGST:
        toExGST(
          num(
            $("customCost").value
          ),
          true
        )
    };
  }


  const areas = [

    ...gates.map(gate => ({
      width: gate.width,
      height: gate.height
    })),

    ...panels.map(panel => ({
      width: panel.width,
      height: panel.height
    }))
  ];


  if (type === "colorbond") {

    const areaM2 =
      areas.reduce(
        (sum, area) =>
          sum +
          (
            area.width / 1000
          ) *
          (
            area.height / 1000
          ),
        0
      );


    const raw =
      areaM2 *
      num(
        data.pricePerM2
      );


    return {

      boards: 0,
      metres: 0,
      stockLengths: 0,
      waste: 0,

      costExGST:
        toExGST(
          raw,
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
        ) /
        module
      );


    const lengthM =
      (
        direction === "vertical"
        ? area.height
        : area.width
      ) /
      1000;


    for (
      let i = 0;
      i < count;
      i++
    ) {

      pieces.push(lengthM);
    }
  });


  const usedMetres =
    pieces.reduce(
      (sum, value) =>
        sum + value,
      0
    );


  /*
     Products sold by fixed stock length.
  */

  if (
    data.stockLengthM &&
    data.pricePerStockLength
  ) {

    const stock =
      stockPieces(
        pieces,
        data.stockLengthM
      );


    const raw =
      stock.lengths *
      data.pricePerStockLength;


    return {

      boards:
        pieces.length,

      metres:
        usedMetres,

      stockLengths:
        stock.lengths,

      waste:
        stock.waste,

      costExGST:
        toExGST(
          raw,
          data.priceIncludesGST
        )
    };
  }


  /*
     Lineal-metre products.
  */

  const raw =
    usedMetres *
    num(
      data.pricePerLinealM
    );


  return {

    boards:
      pieces.length,

    metres:
      usedMetres,

    stockLengths: 0,

    waste: 0,

    costExGST:
      toExGST(
        raw,
        data.priceIncludesGST
      )
  };
}


/* ==========================================================
   POWDER COATING
========================================================== */

function renderPowderComponents() {

  const list =
    $("powderComponentList");


  if (!list) {
    return;
  }


  /*
     Save checked IDs before rebuilding.
  */

  const checked =
    new Set(
      [
        ...list.querySelectorAll(
          ".powder-component-check:checked"
        )
      ]
      .map(
        checkbox =>
          checkbox.dataset.id
      )
    );


  list.innerHTML = "";


  components.forEach(component => {

    let allowed = true;


    if (component.type === "post") {

      const card =
        document.querySelector(
          `[data-component-id="${component.id}"]`
        );


      const fixing =
        card?.querySelector(
          ".post-fixing"
        )?.value;


      if (
        fixing === "existing"
      ) {

        allowed = false;
      }
    }


    /*
       Horizontal fixed panels have no
       separate $150 coating item.
       Their posts are coated individually.
    */

    if (
      component.type === "panel"
      &&
      $("claddingDirection").value
        !== "vertical"
    ) {

      allowed = false;
    }


    if (!allowed) {
      return;
    }


    const label =
      document.createElement("label");

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
      `;


    const checkbox =
      label.querySelector(
        "input"
      );


    checkbox.checked =
      checked.has(
        component.id
      );


    checkbox.addEventListener(
      "change",
      refreshEverything
    );


    list.appendChild(label);
  });
}


function powderCostIncGST() {

  if (
    !$("powderEnabled").checked
  ) {

    return 0;
  }


  let total = 0;


  document
    .querySelectorAll(
      ".powder-component-check:checked"
    )
    .forEach(checkbox => {

      const component =
        components.find(
          item =>
            item.id ===
            checkbox.dataset.id
        );


      if (!component) {
        return;
      }


      if (component.type === "gate") {

        total +=
          PRICES.powderCoating
            .gate
            .priceEach;
      }


      else if (
        component.type === "post"
      ) {

        total +=
          PRICES.powderCoating
            .post
            .priceEach;
      }


      else if (
        component.type === "panel"
      ) {

        total +=
          PRICES.powderCoating
            .fixedPanelVertical
            .priceEach;
      }
    });


  return total;
}


/* ==========================================================
   LABOUR
========================================================== */

function labourEstimate(
  posts,
  gates,
  panels
) {

  let fabrication = 0;
  let installation = 0;


  fabrication +=
    gates.length *
    PRICES.labour
      .gateBaseHours;


  fabrication +=
    panels.length *
    PRICES.labour
      .fixedPanelHours;


  posts.forEach(post => {

    if (
      post.fixing &&
      post.fixing !== "existing"
    ) {

      fabrication +=
        PRICES.labour
          .postHours;
    }


    fabrication +=
      post.holes.length *
      PRICES.labour
        .holeHours;


    if (post.topHole) {

      fabrication +=
        PRICES.labour
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

      installation +=
        PRICES.labour
          .concretePostHours;
    }


    if (
      post.fixing ===
      "baseplate"
    ) {

      installation +=
        PRICES.labour
          .baseplateHours;
    }
  });


  installation +=
    gates.length *
    PRICES.labour
      .hangGateHours;


  return {
    fabrication,
    installation
  };
}


/* ==========================================================
   MAIN COST CALCULATION
========================================================== */

function calculateQuote() {

  calculateGateDimensions();


  const posts =
    readPosts();

  const gates =
    readGates();

  const panels =
    readPanels();


  /* ------------------------------------------------------
     FRAME
  ------------------------------------------------------ */

  const frameGroups = {};


  if (includeState.frame) {

    gates.forEach(gate => {

      if (
        !gate.width ||
        !gate.height
      ) {

        return;
      }


      if (!frameGroups[gate.frame]) {

        frameGroups[
          gate.frame
        ] = [];
      }


      const frame =
        PRICES.steel.frame[
          gate.frame
        ];


      frameGroups[
        gate.frame
      ].push(

        gate.width / 1000,
        gate.width / 1000,

        gate.height / 1000,
        gate.height / 1000
      );


      if (
        includeState.cladding
        &&
        $("claddingDirection").value
          === "vertical"
      ) {

        const railLength =
          Math.max(
            0,
            gate.width -
            frame.widthMm * 2
          ) /
          1000;


        for (
          let i = 0;
          i < gate.hRails;
          i++
        ) {

          frameGroups[
            gate.frame
          ].push(
            railLength
          );
        }
      }


      if (
        includeState.cladding
        &&
        $("claddingDirection").value
          === "horizontal"
      ) {

        const railLength =
          Math.max(
            0,
            gate.height -
            frame.widthMm * 2
          ) /
          1000;


        for (
          let i = 0;
          i < gate.vRails;
          i++
        ) {

          frameGroups[
            gate.frame
          ].push(
            railLength
          );
        }
      }
    });


    /*
       Vertical-clad panels get horizontal rails.
    */

    if (
      includeState.cladding
      &&
      $("claddingDirection").value
        === "vertical"
    ) {

      panels.forEach(panel => {

        if (
          !panel.width ||
          !panel.height
        ) {

          return;
        }


        const frameKey =
          PRICES.defaults.frameType;


        if (!frameGroups[frameKey]) {

          frameGroups[
            frameKey
          ] = [];
        }


        const railCount =
          Math.min(
            3,
            Math.max(
              1,
              Math.ceil(
                panel.height /
                PRICES.defaults
                  .fixedPanelVerticalRailSpacingApproxMm
              )
            )
          );


        for (
          let i = 0;
          i < railCount;
          i++
        ) {

          frameGroups[
            frameKey
          ].push(
            panel.width /
            1000
          );
        }
      });
    }
  }


  let frameMetres = 0;
  let frameLengths = 0;
  let frameWaste = 0;
  let frameCostExGST = 0;


  Object.entries(
    frameGroups
  ).forEach(
    ([key, pieces]) => {

      const steel =
        PRICES.steel.frame[
          key
        ];


      const stock =
        stockPieces(
          pieces,
          steel.stockLengthM
        );


      frameMetres +=
        stock.used;

      frameLengths +=
        stock.lengths;

      frameWaste +=
        stock.waste;


      frameCostExGST +=
        stock.lengths *
        toExGST(
          steel.pricePerStockLength,
          steel.priceIncludesGST
        );
    }
  );


  /* ------------------------------------------------------
     POSTS
  ------------------------------------------------------ */

  const postGroups = {};


  if (includeState.posts) {

    posts.forEach(post => {

      if (
        !post.cut ||
        post.fixing === "existing"
      ) {

        return;
      }


      if (
        !postGroups[
          post.steelKey
        ]
      ) {

        postGroups[
          post.steelKey
        ] = [];
      }


      postGroups[
        post.steelKey
      ].push(
        post.cut /
        1000
      );
    });
  }


  let postMetres = 0;
  let postLengths = 0;
  let postWaste = 0;
  let postSteelExGST = 0;


  Object.entries(
    postGroups
  ).forEach(
    ([key, pieces]) => {

      const steel =
        PRICES.steel.posts[
          key
        ];


      const stock =
        stockPieces(
          pieces,
          steel.stockLengthM
        );


      postMetres +=
        stock.used;

      postLengths +=
        stock.lengths;

      postWaste +=
        stock.waste;


      postSteelExGST +=
        stock.lengths *
        toExGST(
          steel.pricePerStockLength,
          steel.priceIncludesGST
        );
    }
  );


  /* ------------------------------------------------------
     FIXINGS / CONCRETE
  ------------------------------------------------------ */

  let fixingCostsIncGST = 0;


  if (includeState.posts) {

    posts.forEach(post => {

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

        /*
           Retain 2 bags at $8 each.
        */

        fixingCostsIncGST +=
          2 * 8;
      }


      if (
        post.fixing === "brick"
      ) {

        fixingCostsIncGST +=
          post.holes.length *
          PRICES.fixings
            .dynabolt
            .priceEach;
      }


      if (post.topHole) {

        fixingCostsIncGST +=
          PRICES.fixings
            .dynabolt
            .priceEach;
      }


      if (
        post.fixing === "baseplate"
      ) {

        fixingCostsIncGST +=
          PRICES.fixings
            .baseplate
            .priceEach;
      }
    });
  }


  /* ------------------------------------------------------
     GATE HARDWARE
  ------------------------------------------------------ */

  let hardwareExGST = 0;


  gates.forEach(gate => {

    hardwareExGST +=
      toExGST(
        PRICES.hardware.hinges
          .lockout
          .pricePerSet,
        true
      );


    hardwareExGST +=
      toExGST(
        PRICES.fixings.screws
          .defaultPerGate,
        true
      );


    if (
      gate.latch === "other"
    ) {

      hardwareExGST +=
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


      if (latch) {

        const rawPrice =
          latch.priceIncludesGST
          ?
          latch.price
          :
          latch.priceExGST;


        hardwareExGST +=
          toExGST(
            rawPrice,
            latch.priceIncludesGST
          );
      }
    }
  });


  /* ------------------------------------------------------
     CLADDING
  ------------------------------------------------------ */

  const cladding =
    calculateGlobalCladding(
      gates,
      panels
    );


  /* ------------------------------------------------------
     POWDER COATING
  ------------------------------------------------------ */

  const powderIncGST =
    powderCostIncGST();


  $("powderTotalDisplay")
    .textContent =
      money(powderIncGST);


  /* ------------------------------------------------------
     MATERIAL COST TOTAL
  ------------------------------------------------------ */

  const materialsExGST =

    frameCostExGST +

    postSteelExGST +

    toExGST(
      fixingCostsIncGST,
      true
    ) +

    hardwareExGST +

    cladding.costExGST +

    toExGST(
      powderIncGST,
      true
    ) +

    toExGST(
      num(
        $("extraHardware").value
      ),
      true
    );


  /* ------------------------------------------------------
     LABOUR
  ------------------------------------------------------ */

  const estimatedLabour =
    labourEstimate(
      posts,
      gates,
      panels
    );


  $("estimatedFabricationHours")
    .textContent =
      `${estimatedLabour.fabrication.toFixed(2)} hrs`;


  $("estimatedInstallationHours")
    .textContent =
      `${estimatedLabour.installation.toFixed(2)} hrs`;


  const override =
    $("overrideLabour").checked;


  const fabricationHours =
    override
    ?
    num(
      $("fabricationHoursOverride")
        .value
    )
    :
    estimatedLabour.fabrication;


  const installationHours =
    override
    ?
    num(
      $("installationHoursOverride")
        .value
    )
    :
    estimatedLabour.installation;


  const labourExGST =
    (
      fabricationHours +
      installationHours
    ) *
    PRICES.business
      .labourRate;


  /* ------------------------------------------------------
     TRAVEL
  ------------------------------------------------------ */

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


  /* ------------------------------------------------------
     OTHER COSTS
  ------------------------------------------------------ */

  const otherExGST =
    toExGST(
      num(
        $("otherCosts").value
      ),
      true
    );


  /* ------------------------------------------------------
     MARKUP
  ------------------------------------------------------ */

  const markup =
    materialsExGST *
    PRICES.business
      .materialMarkup;


  /* ------------------------------------------------------
     QUOTE TOTAL
  ------------------------------------------------------ */

  const totalExGST =

    materialsExGST +

    labourExGST +

    travelExGST +

    otherExGST +

    markup;


  const gst =
    totalExGST *
    PRICES.business.gst;


  const calculatedIncGST =
    totalExGST +
    gst;


  const finalPrice =
    roundQuote(
      calculatedIncGST
    );


  /*
     IMPORTANT CHANGE:

     Final price is ALWAYS recalculated
     and inserted automatically.
  */

  $("finalPrice").value =
    finalPrice;


  $("finalPrice").readOnly =
    true;


  /* ------------------------------------------------------
     DISPLAY MATERIALS
  ------------------------------------------------------ */

  $("frameMetres")
    .textContent =
      `${frameMetres.toFixed(2)} m`;

  $("frameLengths")
    .textContent =
      frameLengths;

  $("frameWaste")
    .textContent =
      `${frameWaste.toFixed(2)} m`;


  $("postMetres")
    .textContent =
      `${postMetres.toFixed(2)} m`;

  $("postLengths")
    .textContent =
      postLengths;

  $("postWaste")
    .textContent =
      `${postWaste.toFixed(2)} m`;


  $("claddingBoards")
    .textContent =
      cladding.boards;

  $("claddingMetres")
    .textContent =
      `${cladding.metres.toFixed(2)} m`;


  /* ------------------------------------------------------
     INTERNAL TOTALS
  ------------------------------------------------------ */

  $("materialsTotal")
    .textContent =
      money(materialsExGST);


  $("labourTotal")
    .textContent =
      money(labourExGST);


  $("travelTotal")
    .textContent =
      money(travelExGST);


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

    materialsExGST,
    labourExGST,
    travelExGST,
    otherExGST,

    markup,

    totalExGST,

    gst,

    calculatedIncGST,

    finalPrice,

    cladding,

    powderIncGST
  };


  updateFinalPriceDisplays();

  updateFabrication();

  updateLayoutCheck();
}


/* ==========================================================
   FINAL PRICE DISPLAY
========================================================== */

function updateFinalPriceDisplays() {

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
      .labourExGST +

    lastCalculation
      .travelExGST +

    lastCalculation
      .otherExGST;


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

        return sum +
          (
            item.width /
            1000
          ) *
          (
            item.height /
            1000
          );
      },
      0
    );


  $("effectiveRate")
    .textContent =
      projectArea
      ?
      `${money(
        finalIncGST /
        projectArea
      )}/m²`
      :
      "N/A";


  buildQuote();
}


/* ==========================================================
   FABRICATION VIEW
========================================================== */

function updateFabrication() {

  if (!lastCalculation) {
    return;
  }


  const html = [];


  lastCalculation.posts
    .forEach(post => {

      if (
        !includeState.posts
      ) {
        return;
      }


      html.push(
        `
        <div class="fabrication-item">

          <strong>
            ${post.label}
          </strong>

          <span>
            ${post.steelLabel}
          </span>

          ${
            post.cut
            ?
            `<span>
              CUT ${post.cut} mm
             </span>`
            :
            ""
          }

          ${
            post.fixing === "brick"
            ?
            `<span>
              Holes @
              ${post.holes.join(" / ")}
              mm from top
             </span>`
            :
            ""
          }

          ${
            post.topHole
            ?
            `<span>
              Top hole @
              ${post.topHole} mm
             </span>`
            :
            ""
          }

        </div>
        `
      );
    });


  lastCalculation.gates
    .forEach(gate => {

      html.push(
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
            Hinge ${gate.hinge || "-"},
            open ${gate.opens || "-"}
          </span>

        </div>
        `
      );
    });


  lastCalculation.panels
    .forEach(panel => {

      html.push(
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

        </div>
        `
      );
    });


  $("fabricationView")
    .innerHTML =
      html.join("");
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


  const postWidth =
    includeState.posts
    ?
    posts.reduce(
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
    :
    0;


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
      components.length - 1
    ) *
    PRICES.defaults
      .componentGapMm;


  const total =

    postWidth +

    gateWidth +

    panelWidth +

    gaps;


  const difference =
    cavity - total;


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
        `✓ ${cavity} mm cavity = ${Math.round(total)} mm layout`;
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

    return "No cladding";
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
      $("cypressFinish").value
        === "Paint"
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
      $("lospFinish").value
        === "Paint"
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


  if (type === "colorbond") {

    text +=
      `, ${$("colorbondProfile").value}`;

    text +=
      `, ${$("colorbondColour").value}`;
  }


  if (type === "custom") {

    text =
      $("customDescription").value ||
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
   FINISHED QUOTE
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
        Quote ${$("projectNumber").value}
      </strong>
    </p>

    <p>
      ${$("customerName").value}
      <br>
      ${$("siteAddress").value}
    </p>
    `
  );


  lastCalculation.gates
    .forEach(gate => {

      const latch =
        gate.latch === "other"
        ?
        gate.otherLatch
        :
        PRICES.hardware
          .latches[
            gate.latch
          ]?.label;


      html.push(
        `
        <p>
          <strong>
            ${gate.label}:
          </strong>

          ${gate.width}
          ×
          ${gate.height} mm.

          Hinge ${gate.hinge},
          open ${gate.opens}.

          ${latch || ""}.
        </p>
        `
      );
    });


  if (includeState.cladding) {

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
          ${panel.height} mm
          fixed panel.
        </p>
        `
      );
    });


  /*
     POWDER COATING

     Show colour and processing time only.
     No component prices.
  */

  if (
    $("powderEnabled").checked
    &&
    lastCalculation
      .powderIncGST > 0
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


  else if (
    includeState.frame
    ||
    includeState.posts
  ) {

    html.push(
      `
      <p>
        ${PRICES.quote.standardSteelFinish}
      </p>
      `
    );
  }


  html.push(
    `
    <p>
      <strong>
        50% deposit required on acceptance.
      </strong>

      Balance payable on completion.
    </p>
    `
  );


  $("quoteDescription")
    .innerHTML =
      html.join("");
}


/* ==========================================================
   TOP BAR
========================================================== */

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


/* ==========================================================
   SAVE CURRENT JOB
========================================================== */

function saveCurrentJob() {

  const job = {

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

    claddingType:
      $("claddingType").value,

    claddingDirection:
      $("claddingDirection").value,

    includeState,

    finalPrice:
      $("finalPrice").value
  };


  localStorage.setItem(
    "jtlaCurrentJob",
    JSON.stringify(job)
  );
}


/* ==========================================================
   UPDATE BUTTON
========================================================== */

function updateJob() {

  refreshEverything();

  saveCurrentJob();


  const button =
    $("updateBtn");


  button.textContent =
    "UPDATED";


  button.classList.add(
    "updated"
  );


  setTimeout(
    () => {

      button.textContent =
        "UPDATE";

      button.classList.remove(
        "updated"
      );
    },
    800
  );
}


/* ==========================================================
   REFRESH EVERYTHING
========================================================== */

function refreshEverything() {

  propagatePostHeight();

  calculateGateDimensions();


  getCards("post")
    .forEach(
      updatePostConditional
    );


  updateIncludeVisibility();


  renumberComponents();


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
        ?
        "COMPLETE"
        :
        "INCOMPLETE";
    }
  });


  renderMudMap();

  renderPowderComponents();

  calculateQuote();

  updateTopBar();
}


/* ==========================================================
   NEW JOB
========================================================== */

function newJob() {

  const okay =
    confirm(
      "Start a new job? This clears the current working job."
    );


  if (!okay) {
    return;
  }


  localStorage.removeItem(
    "jtlaCurrentJob"
  );


  nextProjectNumber();


  location.reload();
}


/* ==========================================================
   SMS
========================================================== */

function sendSMS() {

  updateJob();


  const message =

    `Hi ${$("customerName").value}, ` +

    `JTLA Gates quote ${$("projectNumber").value}: ` +

    `${$("quoteTotalDisplay").textContent} incl GST. ` +

    `50% deposit on acceptance, balance on completion. ` +

    `Regards, Jody Tuuta 0439 517 783`;


  location.href =

    `sms:${$("customerPhone").value}` +

    `?body=${encodeURIComponent(message)}`;
}


/* ==========================================================
   EMAIL
========================================================== */

function sendEmail() {

  updateJob();


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

    `\n\nRegards,\nJody Tuuta\nJTLA Gates\n0439 517 783`;


  location.href =

    `mailto:${$("customerEmail").value}` +

    `?bcc=${encodeURIComponent("jtladesign@gmail.com")}` +

    `&subject=${encodeURIComponent(subject)}` +

    `&body=${encodeURIComponent(body)}`;
}


/* ==========================================================
   INIT
========================================================== */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    populateColours();


    $("projectNumber").value =
      getCurrentProjectNumber();


    /* ADD PARTS */

    $("addPostBtn")
      .addEventListener(
        "click",
        () => addComponent("post")
      );


    $("addGateBtn")
      .addEventListener(
        "click",
        () => addComponent("gate")
      );


    $("addPanelBtn")
      .addEventListener(
        "click",
        () => addComponent("panel")
      );


    /* INCLUDE */

    [
      ["includeFrameBtn", "frame"],
      ["includePostsBtn", "posts"],
      ["includeCladdingBtn", "cladding"]
    ]
    .forEach(([id, key]) => {

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
    });


    /* CLADDING */

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
      "customCost"
    ]
    .forEach(id => {

      $(id)?.addEventListener(
        "input",
        refreshEverything
      );


      $(id)?.addEventListener(
        "change",
        refreshEverything
      );
    });


    /* CAVITY */

    [
      "cavityWidth",
      "cavityHeight"
    ]
    .forEach(id => {

      $(id).addEventListener(
        "input",
        refreshEverything
      );
    });


    /* CUSTOMER */

    [
      "customerName",
      "customerPhone",
      "siteAddress",
      "customerEmail"
    ]
    .forEach(id => {

      $(id).addEventListener(
        "input",
        updateTopBar
      );
    });


    /* POWDER */

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


          refreshEverything();
        }
      );


    $("powderColour")
      .addEventListener(
        "change",
        refreshEverything
      );


    /* LABOUR */

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
    ]
    .forEach(id => {

      $(id).addEventListener(
        "input",
        refreshEverything
      );
    });


    /* ACTIONS */

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
        () => {
          updateJob();
          window.print();
        }
      );


    $("newJobBtn")
      .addEventListener(
        "click",
        newJob
      );


    updateTopBar();

    updateCladdingUI();

    renderMudMap();

    calculateQuote();
  }
);
