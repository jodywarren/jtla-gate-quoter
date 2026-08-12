const $ = id => document.getElementById(id);

let components = [];
let componentCounter = 0;
let selectedComponentId = null;

let includeState = {
  frame: true,
  posts: true,
  cladding: true
};

let powderSelections = new Set();

let lastCalculation = null;


/* =========================================================
   HELPERS
========================================================= */

function num(value) {
  return Number(value || 0);
}

function money(value) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD"
  }).format(num(value));
}

function exGST(value, includesGST = true) {

  if (!includesGST) {
    return num(value);
  }

  return num(value) /
    (1 + PRICES.business.gst);
}

function roundUp(value) {

  return Math.ceil(
    num(value) /
    PRICES.business.roundTo
  ) *
  PRICES.business.roundTo;
}

function formatProject(value) {

  const lastFour =
    String(Number(value))
      .slice(-4)
      .padStart(4, "0");

  return `00${lastFour}`;
}

function capitaliseWords(value) {

  return String(value || "")
    .replace(/\b[a-z]/g, letter =>
      letter.toUpperCase()
    );
}

function fullPhone() {

  const digits =
    $("clientPhoneDigits")
      .value
      .replace(/\D/g, "")
      .slice(0, 8);

  return digits.length
    ? `04${digits}`
    : "";
}


/* =========================================================
   PROJECT NUMBER
========================================================= */

function getProjectNumber() {

  let value =
    localStorage.getItem(
      "jtlaCurrentProjectNumber"
    );

  if (!value) {

    value =
      formatProject(
        PRICES.projects
          .startingProjectNumber
      );

    localStorage.setItem(
      "jtlaCurrentProjectNumber",
      value
    );
  }

  return value;
}

function createNextProject() {

  const current =
    Number(
      getProjectNumber()
    );

  const next =
    formatProject(
      current + 1
    );

  localStorage.setItem(
    "jtlaCurrentProjectNumber",
    next
  );

  return next;
}


/* =========================================================
   COLOURS
========================================================= */

function populateColours() {

  [
    $("colorbondColour"),
    $("powderColour")
  ].forEach(select => {

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
  });
}


/* =========================================================
   COMPONENT NAMES
========================================================= */

function renumberComponents() {

  const posts =
    components.filter(
      c => c.type === "post"
    );

  const gates =
    components.filter(
      c => c.type === "gate"
    );

  const panels =
    components.filter(
      c => c.type === "panel"
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
}


/* =========================================================
   ADD COMPONENT
========================================================= */

function addComponent(type) {

  componentCounter++;

  const component = {
    id: `c${componentCounter}`,
    type
  };

  components.push(component);

  buildComponent(component);

  renumberComponents();

  refreshEverything();
}


/* =========================================================
   BUILD COMPONENT
========================================================= */

function buildComponent(component) {

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
    component
  );
}


/* =========================================================
   COMPONENT SETUP
========================================================= */

function setupComponent(card, component) {

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


  card.querySelectorAll(
    "input, select"
  ).forEach(field => {

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


/* =========================================================
   POST SETUP
========================================================= */

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
    option.textContent =
      item.label;

    select.appendChild(option);
  });

  select.value =
    PRICES.defaults.postType;


  card.querySelector(
    ".post-fixing"
  ).addEventListener(
    "change",
    () => {

      updatePostUI(card);

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
    () => updatePostUI(card)
  );


  card.querySelector(
    ".post-height-override-enabled"
  ).addEventListener(
    "change",
    () => updatePostUI(card)
  );


  updatePostUI(card);
}


/* =========================================================
   HOLES
========================================================= */

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


/* =========================================================
   POST HEIGHT
========================================================= */

function getPostVisibleHeight(card) {

  const overrideEnabled =
    card.querySelector(
      ".post-height-override-enabled"
    ).checked;

  if (overrideEnabled) {

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


/* =========================================================
   POST UI
========================================================= */

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
  ).classList.toggle(
    "hidden",
    !override
  );


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


  const visibleHeight =
    getPostVisibleHeight(card);


  let cut = 0;


  if (
    fixing === "brick" ||
    fixing === "baseplate"
  ) {

    cut = visibleHeight;
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


  card.querySelector(
    ".post-visible-height"
  ).textContent =
    visibleHeight
      ? `${visibleHeight} mm`
      : "-";


  card.querySelector(
    ".post-cut"
  ).textContent =
    cut
      ? `${cut} mm`
      : "-";
}


/* =========================================================
   GATE SETUP
========================================================= */

function setupGate(card) {

  const frame =
    card.querySelector(
      ".gate-frame"
    );

  Object.entries(
    PRICES.steel.frame
  ).forEach(([key, item]) => {

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
    PRICES.defaults.frameType;


  const latch =
    card.querySelector(
      ".gate-latch"
    );

  Object.entries(
    PRICES.hardware.latches
  ).forEach(([key, item]) => {

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
    "ddDualKey";


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


/* =========================================================
   READ POSTS
========================================================= */

function readPosts() {

  return components
    .filter(
      c => c.type === "post"
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
        .map(x => num(x.value))
        .filter(x => x > 0);

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

        cut = visibleHeight;
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

        id: component.id,
        label: component.label,

        steelKey,
        steelLabel:
          steel.label,

        width:
          steel.widthMm,

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
          )
      };
    });
}


/* =========================================================
   GATE HEIGHT
========================================================= */

function getGateHeight(component) {

  const index =
    components.findIndex(
      c => c.id === component.id
    );

  /*
     Prefer adjacent post height.
  */

  for (
    let distance = 1;
    distance < components.length;
    distance++
  ) {

    const candidates = [
      components[
        index - distance
      ],
      components[
        index + distance
      ]
    ];


    for (const candidate of candidates) {

      if (
        !candidate ||
        candidate.type !== "post"
      ) {
        continue;
      }


      const card =
        document.querySelector(
          `[data-component-id="${candidate.id}"]`
        );


      const height =
        getPostVisibleHeight(card);


      if (height > 0) {

        return Math.max(
          0,
          height -
          PRICES.defaults
            .gateGroundGapMm
        );
      }
    }
  }


  return Math.max(
    0,
    num(
      $("overallHeight").value
    ) -
    PRICES.defaults
      .gateGroundGapMm
  );
}


/* =========================================================
   GATE DIMENSIONS
========================================================= */

function calculateGateDimensions() {

  const cavity =
    num(
      $("cavityWidth").value
    );

  const gates =
    components.filter(
      c => c.type === "gate"
    );

  if (!gates.length) {
    return;
  }


  const posts =
    readPosts();

  const panels =
    readPanels();


  const postWidth =
    includeState.posts
      ? posts.reduce(
          (sum, post) => {

            return sum +
              (
                post.fixing ===
                "existing"
                  ? 0
                  : post.width
              );
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


  const gaps =
    Math.max(
      0,
      components.length - 1
    ) *
    PRICES.defaults
      .componentGapMm;


  const available =
    Math.max(
      0,
      cavity -
      postWidth -
      panelWidth -
      gaps
    );


  const eachGate =
    gates.length
      ? Math.floor(
          available /
          gates.length
        )
      : 0;


  gates.forEach(component => {

    const card =
      document.querySelector(
        `[data-component-id="${component.id}"]`
      );

    const height =
      getGateHeight(component);


    card.dataset.calculatedWidth =
      eachGate;

    card.dataset.calculatedHeight =
      height;


    card.querySelector(
      ".gate-width-display"
    ).textContent =
      eachGate
        ? `${eachGate} mm`
        : "-";


    card.querySelector(
      ".gate-height-display"
    ).textContent =
      height
        ? `${height} mm`
        : "-";
  });
}


/* =========================================================
   READ GATES
========================================================= */

function readGates() {

  return components
    .filter(
      c => c.type === "gate"
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


/* =========================================================
   READ PANELS
========================================================= */

function readPanels() {

  return components
    .filter(
      c => c.type === "panel"
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


/* =========================================================
   INCLUDE VISIBILITY
========================================================= */

function updateIncludeVisibility() {

  $("claddingSection")
    .classList.toggle(
      "hidden",
      !includeState.cladding
    );


  $("frameMaterialsCard")
    .classList.toggle(
      "hidden",
      !includeState.frame
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


  document
    .querySelectorAll(
      ".gate-frame-wrap"
    )
    .forEach(element => {

      element.classList.toggle(
        "hidden",
        !includeState.frame
      );
    });


  updateRailVisibility();
}


/* =========================================================
   GLOBAL CLADDING UI
========================================================= */

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
      type !==
        "cypressPickets"
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


/* =========================================================
   MID RAILS
========================================================= */

function updateRailVisibility() {

  const direction =
    $("claddingDirection")
      .value;


  components
    .filter(
      c => c.type === "gate"
    )
    .forEach(component => {

      const card =
        document.querySelector(
          `[data-component-id="${component.id}"]`
        );


      card.querySelector(
        ".horizontal-rail-wrap"
      ).classList.toggle(
        "hidden",
        !includeState.frame ||
        !includeState.cladding ||
        direction !== "vertical"
      );


      card.querySelector(
        ".vertical-rail-wrap"
      ).classList.toggle(
        "hidden",
        !includeState.frame ||
        !includeState.cladding ||
        direction !== "horizontal"
      );
    });


  updatePanelRails();
}


/* =========================================================
   PANEL RAILS
========================================================= */

function updatePanelRails() {

  const direction =
    $("claddingDirection")
      .value;


  components
    .filter(
      c => c.type === "panel"
    )
    .forEach(component => {

      const card =
        document.querySelector(
          `[data-component-id="${component.id}"]`
        );

      const info =
        card.querySelector(
          ".panel-rail-info"
        );

      const summary =
        card.querySelector(
          ".panel-cladding-summary"
        );


      summary.textContent =
        includeState.cladding
          ? claddingDescription()
          : "No cladding";


      if (
        !includeState.cladding ||
        !includeState.frame
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


        const count =
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
          `
          <div class="calculated-line">
            <span>
              Horizontal fixing rails
            </span>

            <strong>
              ${count || "-"}
            </strong>
          </div>
          `;
      }


      else {

        info.innerHTML = "";
      }
    });
}


/* =========================================================
   COMPLETE STATUS
========================================================= */

function componentComplete(component) {

  const card =
    document.querySelector(
      `[data-component-id="${component.id}"]`
    );


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


    if (
      fixing === "existing"
    ) {
      return true;
    }


    const height =
      getPostVisibleHeight(card);


    if (!height) {
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

      return num(
        card.querySelector(
          ".top-hole-position"
        ).value
      ) > 0;
    }


    return true;
  }


  if (component.type === "gate") {

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


/* =========================================================
   MUD MAP
========================================================= */

function renderMudMap() {

  const map =
    $("mudMap");

  map.innerHTML = "";


  if (!components.length) {

    map.innerHTML =
      `<div class="mud-empty">
        Add components below
      </div>`;

    return;
  }


  components.forEach(component => {

    const wrapper =
      document.createElement("div");

    wrapper.className =
      "mud-item";


    const button =
      document.createElement(
        "button"
      );

    button.type = "button";

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

        const h =
          document.createElement(
            "span"
          );

        h.className =
          `mud-hinge ${hinge}`;

        h.textContent = "H";


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


        button.append(h, l);
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

      left.type = "button";
      left.textContent = "◀";


      const right =
        document.createElement(
          "button"
        );

      right.type = "button";
      right.textContent = "▶";


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


/* =========================================================
   MOVE / JUMP / REMOVE
========================================================= */

function moveComponent(id, direction) {

  const index =
    components.findIndex(
      c => c.id === id
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

    container.appendChild(card);
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
      c => c.id !== id
    );


  document.querySelector(
    `[data-component-id="${id}"]`
  )?.remove();


  powderSelections.delete(id);


  if (
    selectedComponentId === id
  ) {

    selectedComponentId = null;
  }


  renumberComponents();

  refreshEverything();
}


/* =========================================================
   POWDER BUTTONS
========================================================= */

function renderPowderButtons() {

  const list =
    $("powderComponentList");

  list.innerHTML = "";


  components.forEach(component => {

    let available = true;


    if (
      component.type === "post"
    ) {

      const card =
        document.querySelector(
          `[data-component-id="${component.id}"]`
        );

      if (
        card.querySelector(
          ".post-fixing"
        ).value === "existing"
      ) {

        available = false;
      }
    }


    if (
      component.type === "panel" &&
      $("claddingDirection")
        .value !== "vertical"
    ) {

      available = false;
    }


    if (!available) {
      return;
    }


    const button =
      document.createElement(
        "button"
      );

    button.type = "button";

    button.className =
      powderSelections.has(
        component.id
      )
        ? "powder-component on"
        : "powder-component off";


    button.textContent =
      component.label;


    button.addEventListener(
      "click",
      () => {

        if (
          powderSelections.has(
            component.id
          )
        ) {

          powderSelections.delete(
            component.id
          );
        }

        else {

          powderSelections.add(
            component.id
          );
        }


        refreshEverything();
      }
    );


    list.appendChild(button);
  });
}


function powderCostIncGST() {

  if (
    !$("powderEnabled").checked
  ) {

    return 0;
  }


  let total = 0;


  powderSelections.forEach(id => {

    const component =
      components.find(
        c => c.id === id
      );


    if (!component) {
      return;
    }


    if (
      component.type === "gate"
    ) {

      total +=
        PRICES.powderCoating
          .gate.priceEach;
    }


    else if (
      component.type === "post"
    ) {

      total +=
        PRICES.powderCoating
          .post.priceEach;
    }


    else {

      total +=
        PRICES.powderCoating
          .fixedPanelVertical
          .priceEach;
    }
  });


  return total;
}


/* =========================================================
   STOCK OPTIMISER
========================================================= */

function stockPieces(
  pieces,
  stockLength
) {

  const valid =
    pieces
      .filter(x => x > 0)
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
      (sum, item) =>
        sum + item,
      0
    );


  return {

    lengths:
      bins.length,

    used,

    waste:
      bins.length *
      stockLength -
      used
  };
}


/* =========================================================
   CLADDING CALCULATION
========================================================= */

function calculateCladding(
  gates,
  panels
) {

  if (!includeState.cladding) {

    return {
      boards: 0,
      metres: 0,
      stockLengths: 0,
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
      costExGST: 0
    };
  }


  if (type === "custom") {

    return {

      boards: 0,
      metres: 0,
      stockLengths: 0,

      costExGST:
        exGST(
          num(
            $("customCost").value
          ),
          true
        )
    };
  }


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


  if (type === "colorbond") {

    const m2 =
      areas.reduce(
        (sum, area) =>

          sum +

          area.width /
          1000 *

          area.height /
          1000,
        0
      );


    return {

      boards: 0,
      metres: 0,
      stockLengths: 0,

      costExGST:
        exGST(
          m2 *
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
        ) /
        module
      );


    const pieceLength =
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

      pieces.push(
        pieceLength
      );
    }
  });


  const metres =
    pieces.reduce(
      (sum, item) =>
        sum + item,
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

      costExGST:
        exGST(
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

    costExGST:
      exGST(
        metres *
        num(
          data.pricePerLinealM
        ),
        data.priceIncludesGST
      )
  };
}


/* =========================================================
   LABOUR
========================================================= */

function labourEstimate(
  posts,
  gates,
  panels
) {

  let fabrication =
    gates.length *
    PRICES.labour
      .gateBaseHours;


  fabrication +=
    panels.length *
    PRICES.labour
      .fixedPanelHours;


  let installation =
    gates.length *
    PRICES.labour
      .hangGateHours;


  posts.forEach(post => {

    if (
      post.fixing &&
      post.fixing !== "existing"
    ) {

      fabrication +=
        PRICES.labour
          .postHours;
    }


    /*
      EACH HOLE =
      5 minutes labour.
    */

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


  return {
    fabrication,
    installation
  };
}


/* =========================================================
   MAIN CALCULATION
========================================================= */

function calculateQuote() {

  calculateGateDimensions();


  const posts =
    readPosts();

  const gates =
    readGates();

  const panels =
    readPanels();


  /* FRAME */

  let framePieces = [];


  if (includeState.frame) {

    gates.forEach(gate => {

      if (
        !gate.width ||
        !gate.height
      ) {
        return;
      }


      framePieces.push(

        gate.width / 1000,
        gate.width / 1000,

        gate.height / 1000,
        gate.height / 1000
      );


      const frame =
        PRICES.steel.frame[
          gate.frame
        ];


      if (
        includeState.cladding &&
        $("claddingDirection")
          .value === "vertical"
      ) {

        const rail =
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

          framePieces.push(rail);
        }
      }


      if (
        includeState.cladding &&
        $("claddingDirection")
          .value === "horizontal"
      ) {

        const rail =
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

          framePieces.push(rail);
        }
      }
    });


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


        const count =
          Math.min(
            3,
            Math.max(
              1,
              Math.ceil(
                panel.height /
                900
              )
            )
          );


        for (
          let i = 0;
          i < count;
          i++
        ) {

          framePieces.push(
            panel.width /
            1000
          );
        }
      });
    }
  }


  const frameStock =
    stockPieces(
      framePieces,
      8
    );


  const frameCostEx =
    includeState.frame

      ?

      frameStock.lengths *

      exGST(
        PRICES.steel.frame[
          PRICES.defaults
            .frameType
        ].pricePerStockLength,
        true
      )

      :

      0;


  /* POSTS */

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
        post.cut / 1000
      );
    });
  }


  let postUsed = 0;
  let postLengths = 0;
  let postWaste = 0;
  let postSteelEx = 0;


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


      postUsed +=
        stock.used;

      postLengths +=
        stock.lengths;

      postWaste +=
        stock.waste;


      postSteelEx +=
        stock.lengths *
        exGST(
          steel.pricePerStockLength,
          steel.priceIncludesGST
        );
    }
  );


  /* FIXINGS */

  let concreteInc = 0;
  let dynaboltsInc = 0;
  let baseplatesInc = 0;


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

        concreteInc +=
          2 * 8;
      }


      /*
        EVERY DRILLED HOLE =
        1 dynabolt @ $2.50.
      */

      if (
        post.fixing === "brick"
      ) {

        dynaboltsInc +=

          post.holes.length *

          PRICES.fixings
            .dynabolt
            .priceEach;
      }


      if (post.topHole) {

        dynaboltsInc +=
          PRICES.fixings
            .dynabolt
            .priceEach;
      }


      if (
        post.fixing ===
        "baseplate"
      ) {

        baseplatesInc +=
          PRICES.fixings
            .baseplate
            .priceEach;
      }
    });
  }


  /* HARDWARE */

  let hardwareEx = 0;


  gates.forEach(gate => {

    hardwareEx +=
      exGST(
        PRICES.hardware
          .hinges
          .lockout
          .pricePerSet,
        true
      );


    hardwareEx +=
      exGST(
        PRICES.fixings
          .screws
          .defaultPerGate,
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
        PRICES.hardware
          .latches[
            gate.latch
          ];


      if (latch) {

        if (
          latch.priceIncludesGST
        ) {

          hardwareEx +=
            exGST(
              latch.price,
              true
            );
        }

        else {

          hardwareEx +=
            num(
              latch.priceExGST
            );
        }
      }
    }
  });


  /* CLADDING */

  const cladding =
    calculateCladding(
      gates,
      panels
    );


  /* POWDER */

  const powderInc =
    powderCostIncGST();


  $("powderTotalDisplay")
    .textContent =
      money(powderInc);


  /* MATERIAL TOTAL */

  const materialsEx =

    frameCostEx +

    postSteelEx +

    exGST(
      concreteInc,
      true
    ) +

    exGST(
      dynaboltsInc,
      true
    ) +

    exGST(
      baseplatesInc,
      true
    ) +

    hardwareEx +

    cladding.costExGST +

    exGST(
      powderInc,
      true
    ) +

    exGST(
      num(
        $("extraHardware")
          .value
      ),
      true
    );


  /* LABOUR */

  const labour =
    labourEstimate(
      posts,
      gates,
      panels
    );


  $("estimatedFabricationHours")
    .textContent =
      `${labour.fabrication.toFixed(2)} hrs`;


  $("estimatedInstallationHours")
    .textContent =
      `${labour.installation.toFixed(2)} hrs`;


  const fabricationHours =
    $("overrideLabour").checked
      ? num(
          $("fabricationHoursOverride")
            .value
        )
      : labour.fabrication;


  const installationHours =
    $("overrideLabour").checked
      ? num(
          $("installationHoursOverride")
            .value
        )
      : labour.installation;


  const labourEx =

    (
      fabricationHours +
      installationHours
    ) *

    PRICES.business
      .labourRate;


  /* TRAVEL */

  const oneWay =
    num(
      $("travelKm").value
    );


  const chargeable =
    Math.max(
      0,
      oneWay -
      PRICES.business
        .includedTravelKm
    );


  const travelEx =

    chargeable *

    2 *

    PRICES.business
      .travelRatePerKm;


  const otherEx =
    exGST(
      num(
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


  const finalPrice =
    roundUp(
      calculatedInc
    );


  $("finalPrice").value =
    finalPrice;


  /* MATERIAL DISPLAY */

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
      `${postUsed.toFixed(2)} m`;

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

  $("claddingStockLengths")
    .textContent =
      cladding.stockLengths;


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

    finalPrice,
    powderInc,

    cladding,

    dynaboltCount:
      posts.reduce(
        (sum, post) =>

          sum +

          (
            post.fixing ===
            "brick"
              ? post.holes.length
              : 0
          ) +

          (
            post.topHole
              ? 1
              : 0
          ),
        0
      ),

    concreteBags:
      posts.reduce(
        (sum, post) => {

          return sum +

            (
              [
                "concreteHouse",
                "concreteFloating",
                "fixedPanelLeft",
                "fixedPanelCentre",
                "fixedPanelRight"
              ].includes(
                post.fixing
              )
                ? 2
                : 0
            );
        },
        0
      )
  };


  updateFinalDisplays();

  updateConsumables();

  updateFabrication();

  updateLayoutCheck();
}


/* =========================================================
   FINAL PRICE
========================================================= */

function updateFinalDisplays() {

  if (!lastCalculation) {
    return;
  }


  const inc =
    lastCalculation.finalPrice;


  const ex =
    inc /
    (
      1 +
      PRICES.business.gst
    );


  const gst =
    inc - ex;


  const actualCosts =

    lastCalculation.materialsEx +

    lastCalculation.labourEx +

    lastCalculation.travelEx +

    lastCalculation.otherEx;


  const profit =
    ex -
    actualCosts;


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
      (sum, item) =>

        sum +

        item.width /
        1000 *

        item.height /
        1000,
      0
    );


  $("effectiveRate")
    .textContent =
      area
        ? `${money(inc / area)}/m²`
        : "N/A";


  buildQuote();
}


/* =========================================================
   CONSUMABLES
========================================================= */

function updateConsumables() {

  if (!lastCalculation) {
    return;
  }


  const lines = [];


  if (
    lastCalculation
      .dynaboltCount > 0
  ) {

    lines.push(
      `
      <div>
        <span>
          75x10mm Dynabolts
        </span>

        <strong>
          ${lastCalculation.dynaboltCount}
        </strong>
      </div>
      `
    );
  }


  if (
    lastCalculation
      .concreteBags > 0
  ) {

    lines.push(
      `
      <div>
        <span>
          Concrete
        </span>

        <strong>
          ${lastCalculation.concreteBags} bags
        </strong>
      </div>
      `
    );
  }


  lastCalculation.gates
    .forEach(gate => {

      lines.push(
        `
        <div>
          <span>
            ${gate.label} hinges
          </span>

          <strong>
            Lock-out set,
            ${gate.hinge
              ? gate.hinge.toUpperCase()
              : "side not selected"}
          </strong>
        </div>
        `
      );


      let latchName = "";


      if (
        gate.latch === "other"
      ) {

        latchName =
          gate.otherLatch ||
          "Other latch";
      }

      else {

        latchName =
          PRICES.hardware
            .latches[
              gate.latch
            ]?.label || "";
      }


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
    lastCalculation.gates
      .length > 1
  ) {

    lines.push(
      `
      <div>
        <span>
          Multiple gate latches
        </span>

        <strong>
          Key alike where required
        </strong>
      </div>
      `
    );
  }


  $("consumablesList")
    .innerHTML =
      lines.length
        ? lines.join("")
        : `<p class="muted">
             No hardware calculated yet.
           </p>`;
}


/* =========================================================
   FABRICATION VIEW
========================================================= */

function updateFabrication() {

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

            ${
              post.cut
                ? `<span>
                     CUT ${post.cut} mm
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
                     ${post.topHole} mm
                   </span>`
                : ""
            }

          </div>
          `
        );
      });
  }


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
            Hinge
            ${gate.hinge || "-"},
            open
            ${gate.opens || "-"}
          </span>

        </div>
        `
      );
    });


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

        </div>
        `
      );
    });


  $("fabricationView")
    .innerHTML =
      lines.join("");
}


/* =========================================================
   LAYOUT CHECK
========================================================= */

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
      ? posts.reduce(
          (sum, post) =>

            sum +

            (
              post.fixing ===
              "existing"
                ? 0
                : post.width
            ),
          0
        )
      : 0;


  const total =
    postWidth +

    gates.reduce(
      (sum, gate) =>
        sum + gate.width,
      0
    ) +

    panels.reduce(
      (sum, panel) =>
        sum + panel.width,
      0
    ) +

    Math.max(
      0,
      components.length - 1
    ) *
    PRICES.defaults
      .componentGapMm;


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


/* =========================================================
   CLADDING DESCRIPTION
========================================================= */

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


  if (type === "colorbond") {

    text +=
      `, ${$("colorbondProfile").value}`;

    text +=
      `, ${$("colorbondColour").value}`;
  }


  if (
    $("claddingDirection").value
  ) {

    text +=
      `, ${$("claddingDirection").value}`;
  }


  return text;
}


/* =========================================================
   CUSTOMER QUOTE
========================================================= */

function buildQuote() {

  const html = [];


  html.push(
    `
    <p>
      <strong>
        Quote ${$("projectNumber").value}
      </strong>
    </p>

    <p>
      ${$("clientName").value}
      <br>
      ${$("siteAddress").value}
    </p>
    `
  );


  lastCalculation.gates
    .forEach(gate => {

      const latch =
        gate.latch === "other"
          ? gate.otherLatch
          : PRICES.hardware
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

          Hinge
          ${gate.hinge},
          open
          ${gate.opens}.

          ${latch || ""}.

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
    $("powderEnabled").checked &&
    lastCalculation.powderInc > 0
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
    includeState.frame ||
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


  /*
    Deposit wording is NOT repeated here.
    It only appears in the quote footer.
  */


  $("quoteDescription")
    .innerHTML =
      html.join("");
}


/* =========================================================
   TOP BAR
========================================================= */

function updateTopBar() {

  $("topClientName")
    .textContent =
      $("clientName").value ||
      "New Client";


  $("topClientPhone")
    .textContent =
      fullPhone();


  $("topProjectNumber")
    .textContent =
      $("projectNumber").value;
}


/* =========================================================
   UPDATE COMPONENT STATUS
========================================================= */

function updateComponentStatus() {

  components.forEach(component => {

    const card =
      document.querySelector(
        `[data-component-id="${component.id}"]`
      );

    const complete =
      componentComplete(component);


    card.classList.toggle(
      "complete",
      complete
    );


    card.classList.toggle(
      "incomplete",
      !complete
    );


    card.querySelector(
      ".component-status"
    ).textContent =
      complete
        ? "COMPLETE"
        : "INCOMPLETE";
  });
}


/* =========================================================
   REFRESH
========================================================= */

function refreshEverything() {

  calculateGateDimensions();

  components
    .filter(
      c => c.type === "post"
    )
    .forEach(component => {

      const card =
        document.querySelector(
          `[data-component-id="${component.id}"]`
        );

      updatePostUI(card);
    });


  updateIncludeVisibility();

  updateCladdingUI();

  renumberComponents();

  updateRailVisibility();

  updateComponentStatus();

  renderMudMap();

  renderPowderButtons();

  calculateQuote();

  updateTopBar();
}


/* =========================================================
   SAVE CURRENT JOB
========================================================= */

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

          type: "post",

          size:
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

          height:
            card.querySelector(
              ".post-height-override"
            ).value,

          holes:
            [
              ...card.querySelectorAll(
                ".hole-position"
              )
            ]
            .map(x => x.value),

          topBolt:
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

          type: "gate",

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
          ).value
      };
    });


  return {

    project:
      $("projectNumber").value,

    clientName:
      $("clientName").value,

    address:
      $("siteAddress").value,

    phoneDigits:
      $("clientPhoneDigits")
        .value,

    email:
      $("clientEmail").value,

    cavityWidth:
      $("cavityWidth").value,

    overallHeight:
      $("overallHeight").value,

    claddingType:
      $("claddingType").value,

    claddingDirection:
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

    includeState,

    components:
      componentData,

    powderEnabled:
      $("powderEnabled").checked,

    powderColour:
      $("powderColour").value,

    powderSelections:
      [...powderSelections],

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
      serializeCurrentJob()
    )
  );
}


/* =========================================================
   RESTORE JOB
========================================================= */

function restoreCurrentJob() {

  const raw =
    localStorage.getItem(
      "jtlaCurrentJob"
    );


  if (!raw) {
    return;
  }


  try {

    const job =
      JSON.parse(raw);


    $("clientName").value =
      job.clientName || "";

    $("siteAddress").value =
      job.address || "";

    $("clientPhoneDigits").value =
      job.phoneDigits || "";

    $("clientEmail").value =
      job.email || "";

    $("cavityWidth").value =
      job.cavityWidth || "";

    $("overallHeight").value =
      job.overallHeight || "";


    if (job.claddingType) {
      $("claddingType").value =
        job.claddingType;
    }

    if (job.claddingDirection) {
      $("claddingDirection").value =
        job.claddingDirection;
    }


    $("ekodeckColour").value =
      job.ekodeckColour ||
      $("ekodeckColour").value;


    $("cypressFinish").value =
      job.cypressFinish ||
      $("cypressFinish").value;


    $("cypressColour").value =
      job.cypressColour || "";


    $("lospFinish").value =
      job.lospFinish ||
      $("lospFinish").value;


    $("lospColour").value =
      job.lospColour || "";


    $("merbauFinish").value =
      job.merbauFinish ||
      $("merbauFinish").value;


    $("colorbondProfile").value =
      job.colorbondProfile ||
      $("colorbondProfile").value;


    $("colorbondColour").value =
      job.colorbondColour ||
      $("colorbondColour").value;


    includeState =
      job.includeState || {
        frame: true,
        posts: true,
        cladding: true
      };


    /*
      Restore components.
    */

    (job.components || [])
      .forEach(saved => {

        addComponent(
          saved.type
        );

        const component =
          components[
            components.length - 1
          ];


        const card =
          document.querySelector(
            `[data-component-id="${component.id}"]`
          );


        if (
          saved.type === "post"
        ) {

          card.querySelector(
            ".post-size"
          ).value =
            saved.size ||
            PRICES.defaults
              .postType;


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
            saved.height || "";


          card.querySelector(
            ".house-bolt-enabled"
          ).checked =
            Boolean(
              saved.topBolt
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


          (saved.holes || [])
            .forEach(value => {

              addHole(
                card,
                value
              );
            });
        }


        else if (
          saved.type === "gate"
        ) {

          card.querySelector(
            ".gate-frame"
          ).value =
            saved.frame ||
            PRICES.defaults
              .frameType;


          card.querySelector(
            ".horizontal-rails"
          ).value =
            saved.horizontalRails ||
            "0";


          card.querySelector(
            ".vertical-rails"
          ).value =
            saved.verticalRails ||
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
            ".gate-latch"
          ).value =
            saved.latch ||
            "ddDualKey";


          card.querySelector(
            ".other-latch-description"
          ).value =
            saved.otherLatch || "";


          card.querySelector(
            ".other-latch-cost"
          ).value =
            saved.otherLatchCost || "";
        }


        else {

          card.querySelector(
            ".panel-width"
          ).value =
            saved.width || "";


          card.querySelector(
            ".panel-height"
          ).value =
            saved.height || "";
        }
      });


    $("powderEnabled").checked =
      Boolean(
        job.powderEnabled
      );


    $("powderOptions")
      .classList.toggle(
        "hidden",
        !$("powderEnabled")
          .checked
      );


    if (job.powderColour) {

      $("powderColour").value =
        job.powderColour;
    }


    powderSelections =
      new Set(
        job.powderSelections || []
      );


    $("travelKm").value =
      job.travelKm || "";

    $("extraHardware").value =
      job.extraHardware || "";

    $("otherCosts").value =
      job.otherCosts || "";

  }

  catch (error) {

    console.error(
      "Could not restore current job",
      error
    );
  }
}


/* =========================================================
   UPDATE BUTTON
========================================================= */

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


/* =========================================================
   NEW JOB
========================================================= */

function newJob() {

  if (
    !confirm(
      "Start a new job? This will clear the current working job."
    )
  ) {
    return;
  }


  localStorage.removeItem(
    "jtlaCurrentJob"
  );


  createNextProject();


  location.reload();
}


/* =========================================================
   SMS
========================================================= */

function sendSMS() {

  updateJob();


  const text =

    `Hi ${$("clientName").value}, ` +

    `JTLA Gates quote ${$("projectNumber").value}: ` +

    `${$("quoteTotalDisplay").textContent} incl GST. ` +

    `50% deposit on acceptance, balance on completion. ` +

    `Regards, Jody Tuuta 0439 517 783`;


  location.href =

    `sms:${fullPhone()}` +

    `?body=${encodeURIComponent(text)}`;
}


/* =========================================================
   EMAIL
========================================================= */

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

    `\n\n50% deposit required on acceptance. Balance payable on completion.` +

    `\n\nRegards,\nJody Tuuta\nJTLA Gates\n0439 517 783`;


  location.href =

    `mailto:${$("clientEmail").value}` +

    `?bcc=${encodeURIComponent("jtladesign@gmail.com")}` +

    `&subject=${encodeURIComponent(subject)}` +

    `&body=${encodeURIComponent(body)}`;
}


/* =========================================================
   EVENTS
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    populateColours();


    $("projectNumber").value =
      getProjectNumber();


    /*
      Client name / address capitalization.
    */

    [
      "clientName",
      "siteAddress"
    ].forEach(id => {

      $(id).addEventListener(
        "blur",
        () => {

          $(id).value =
            capitaliseWords(
              $(id).value
            );

          updateTopBar();
        }
      );
    });


    /*
      Mobile number = 04 + 8 digits.
    */

    $("clientPhoneDigits")
      .addEventListener(
        "input",
        () => {

          $("clientPhoneDigits")
            .value =

            $("clientPhoneDigits")
              .value
              .replace(/\D/g, "")
              .slice(0, 8);

          updateTopBar();
        }
      );


    /*
      Add components.
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
      Include buttons.
    */

    [
      [
        "includeFrameBtn",
        "frame"
      ],

      [
        "includePostsBtn",
        "posts"
      ],

      [
        "includeCladdingBtn",
        "cladding"
      ]
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


    /*
      Site / cladding.
    */

    [
      "cavityWidth",
      "overallHeight",

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

      $(id).addEventListener(
        "input",
        refreshEverything
      );


      $(id).addEventListener(
        "change",
        refreshEverything
      );
    });


    /*
      Powder coating.
    */

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


    /*
      Labour / extras.
    */

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


    [
      "clientName",
      "siteAddress",
      "clientEmail"
    ]
    .forEach(id => {

      $(id).addEventListener(
        "input",
        updateTopBar
      );
    });


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


    /*
      Restore existing job AFTER
      event handlers exist.
    */

    restoreCurrentJob();

    updateCladdingUI();

    refreshEverything();
  }
);
