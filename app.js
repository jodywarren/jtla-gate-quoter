'use strict';

(() => {

  const CFG = window.PRICES;

  if (!CFG) {
    console.error('JTLA Gates: PRICES configuration was not loaded.');
    return;
  }


  /* =========================================================
     BASIC HELPERS
     ========================================================= */

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    Array.from(root.querySelectorAll(selector));


  const money = (value) => {
    const n = Number(value) || 0;

    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(n);
  };


  const num = (value, fallback = 0) => {
    const n = Number(value);

    return Number.isFinite(n)
      ? n
      : fallback;
  };


  const round = (value, digits = 2) => {
    const factor =
      10 ** digits;

    return (
      Math.round(
        (num(value) + Number.EPSILON) *
        factor
      ) /
      factor
    );
  };


  const clamp = (value, min, max) =>
    Math.min(
      max,
      Math.max(min, value)
    );


  const deepClone = (value) =>
    JSON.parse(
      JSON.stringify(value)
    );


  const uid = (prefix = 'id') => {

    if (
      window.crypto &&
      crypto.randomUUID
    ) {
      return (
        `${prefix}_${crypto.randomUUID()}`
      );
    }

    return (
      `${prefix}_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 9)}`
    );
  };


  const titleCase = (value) => {

    return String(value || '')
      .toLowerCase()
      .replace(
        /\b([a-z])/g,
        (match) =>
          match.toUpperCase()
      )
      .replace(
        /\b(Mc)([a-z])/g,
        (_, first, second) =>
          first +
          second.toUpperCase()
      )
      .replace(
        /\b(O')([a-z])/g,
        (_, first, second) =>
          first +
          second.toUpperCase()
      );
  };


  const safe = (value) =>

    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');


  const gstExclusive = (
    amount,
    priceIncludesGST
  ) => {

    const value =
      num(amount);

    return priceIncludesGST
      ? value /
        (1 + CFG.business.gst)
      : value;
  };


  const ceilTo = (
    value,
    increment
  ) => {

    const inc =
      num(increment, 1);

    if (inc <= 0) {
      return value;
    }

    return (
      Math.ceil(
        num(value) / inc
      ) *
      inc
    );
  };


  const formatHours = (hours) =>
    `${round(hours, 2).toFixed(2)} hr`;


  const mm = (value) =>
    `${Math.round(num(value))} mm`;


  const sqm = (value) =>
    `${round(value, 2).toFixed(2)} m²`;


  const lm = (value) =>
    `${round(value, 2).toFixed(2)} m`;


  const setPath = (
    object,
    path,
    value
  ) => {

    const parts =
      String(path).split('.');

    let ref =
      object;

    parts.forEach(
      (key, index) => {

        if (
          index ===
          parts.length - 1
        ) {
          ref[key] =
            value;
        } else {

          if (
            !ref[key] ||
            typeof ref[key] !==
              'object'
          ) {
            ref[key] = {};
          }

          ref =
            ref[key];
        }
      }
    );
  };


  /* =========================================================
     PROJECT NUMBER / STORAGE
     ========================================================= */

  function getSavedJobsRaw() {

    try {

      const raw =
        localStorage.getItem(
          CFG.storage.savedJobsKey
        );

      const parsed =
        raw
          ? JSON.parse(raw)
          : [];

      return Array.isArray(parsed)
        ? parsed
        : [];

    } catch {

      return [];
    }
  }


  function projectDigits(value) {

    return String(
      Math.max(
        0,
        parseInt(value, 10) ||
        0
      )
    ).padStart(
      CFG.projects.numberDigits,
      '0'
    );
  }


  function formatProjectNumber(value) {

    return (
      `${CFG.projects.prefix}${projectDigits(value)}`
    );
  }


  function parseProjectNumber(value) {

    const digits =
      String(value || '')
        .replace(/\D/g, '');

    if (!digits) {
      return (
        CFG.projects.startingProjectNumber
      );
    }

    const tail =
      digits.slice(
        -CFG.projects.numberDigits
      );

    return (
      parseInt(tail, 10) ||
      CFG.projects.startingProjectNumber
    );
  }


  function nextProjectNumber() {

    const saved =
      getSavedJobsRaw();

    const nums =
      saved
        .map(
          (savedJob) =>
            parseProjectNumber(
              savedJob?.client
                ?.projectNumber ||
              savedJob?.projectNumber
            )
        )
        .filter(
          Number.isFinite
        );


    const activeRaw =
      localStorage.getItem(
        CFG.storage.activeJobKey
      );


    if (activeRaw) {

      try {

        const active =
          JSON.parse(activeRaw);

        nums.push(
          parseProjectNumber(
            active?.client
              ?.projectNumber
          )
        );

      } catch {
        // Ignore corrupt active job.
      }
    }


    const highest =
      nums.length
        ? Math.max(
            ...nums,
            CFG.projects
              .startingProjectNumber -
              1
          )
        : CFG.projects
            .startingProjectNumber -
          1;


    return highest + 1;
  }


  /* =========================================================
     DEFAULT JOB DATA
     ========================================================= */

  function defaultCladding() {

    return {

      type:
        CFG.defaults.claddingType,

      direction:
        CFG.defaults
          .claddingDirection,

      colour: '',

      finish: '',

      profile: '',

      gapMm:
        CFG.defaults.claddingGapMm,

      palingLengthMm: '',

      palingWidthMm: '',

      accessoryLengthMode:
        'auto',

      accessoryLengthM: 0,

      capping: true,

      plinth: true,

      custom: {

        name: '',

        costingMode:
          'total',

        totalCost: 0,

        quantity: 1,

        unitCost: 0,

        priceIncludesGST:
          true,

        labourRatePerM2:
          0
      },

      colorbond: {

        labourRatePerM2:
          0
      }
    };
  }


  function createNewJob(
    projectNumber =
      nextProjectNumber()
  ) {

    return {

      schemaVersion:
        CFG.version.schema,

      id:
        uid('job'),

      createdAt:
        new Date()
          .toISOString(),

      updatedAt:
        new Date()
          .toISOString(),


      site: {

        cavityWidthMm:
          0,

        finishedHeightMm:
          CFG.defaults
            .finishedHeightMm,

        oneWayTravelKm:
          0,

        referenceDirection:
          CFG.defaults
            .referenceDirection,

        referenceCustom:
          ''
      },


      components:
        [],

      selectedComponentId:
        null,


      cladding:
        defaultCladding(),


      powder: {

        enabled:
          CFG.defaults
            .powderCoating,

        colour:
          CFG.defaults
            .powderColour
      },


      labour: {

        additionalFabricationHours:
          0,

        additionalInstallHours:
          0
      },


      client: {

        name: '',

        address: '',

        projectNumber:
          formatProjectNumber(
            projectNumber
          ),

        mobile:
          CFG.clientFields
            .mobile
            .defaultValue,

        email: '',

        notes: '',

        includeNotesInQuote:
          false
      },


      quote: {

        mode:
          'auto',

        manualIncGST:
          null
      },


      ui: {

        activeSection:
          'site'
      }
    };
  }


  /* =========================================================
     COMPONENT FACTORIES
     ========================================================= */

  function newPost() {

    return {

      id:
        uid('post'),

      type:
        'post',

      postType:
        CFG.defaults.postType,

      fixing:
        'fixed_brick',

      heightMode:
        'auto',

      manualFinishedHeightMm:
        CFG.defaults
          .finishedHeightMm,

      holePositionsMm:
        []
    };
  }


  function newGate() {

    return {

      id:
        uid('gate'),

      type:
        'gate',

      frameType:
        CFG.defaults.frameType,

      hingeSide:
        CFG.defaults.hingeSide,

      openDirection:
        CFG.defaults
          .openDirection,

      widthMode:
        'auto',

      manualWidthMm:
        1000,

      relationship:
        'single',

      doublePairId:
        '',

      internalRailCount:
        CFG.defaults
          .gateInternalRailCount,

      latchType:
        'ddDualKey'
    };
  }


  function newPanelPost(side) {

    return {

      id:
        uid(`fp_${side}`),

      postType:
        CFG.defaults.postType,

      fixing:
        side === 'left'
          ? CFG.defaults
              .fixedPanelLeftPostFixing
          : CFG.defaults
              .fixedPanelRightPostFixing,

      heightMode:
        'auto',

      manualFinishedHeightMm:
        CFG.defaults
          .finishedHeightMm,

      holePositionsMm:
        []
    };
  }


  function newFixedPanel() {

    return {

      id:
        uid('panel'),

      type:
        'fixedPanel',

      widthMm:
        700,

      leftPost:
        newPanelPost('left'),

      rightPost:
        newPanelPost('right'),

      verticalRailCount:
        CFG.defaults
          .fixedPanelVerticalRailCount
    };
  }


  function hydrateComponent(component) {

    if (
      component?.type ===
      'post'
    ) {
      return {
        ...newPost(),
        ...component
      };
    }


    if (
      component?.type ===
      'gate'
    ) {
      return {
        ...newGate(),
        ...component
      };
    }


    if (
      component?.type ===
      'fixedPanel'
    ) {

      const defaults =
        newFixedPanel();

      return {

        ...defaults,

        ...component,

        leftPost: {
          ...defaults.leftPost,
          ...(component.leftPost || {})
        },

        rightPost: {
          ...defaults.rightPost,
          ...(component.rightPost || {})
        }
      };
    }


    return component;
  }


  function hydrateJob(raw) {

    const base =
      createNewJob(
        parseProjectNumber(
          raw?.client
            ?.projectNumber
        )
      );


    const merged = {

      ...base,

      ...raw,


      site: {

        ...base.site,

        ...(raw?.site || {})
      },


      cladding: {

        ...base.cladding,

        ...(raw?.cladding || {}),

        custom: {

          ...base.cladding.custom,

          ...(raw?.cladding
            ?.custom || {})
        },

        colorbond: {

          ...base.cladding
            .colorbond,

          ...(raw?.cladding
            ?.colorbond || {})
        }
      },


      powder: {

        ...base.powder,

        ...(raw?.powder || {})
      },


      labour: {

        ...base.labour,

        ...(raw?.labour || {})
      },


      client: {

        ...base.client,

        ...(raw?.client || {})
      },


      quote: {

        ...base.quote,

        ...(raw?.quote || {})
      },


      ui: {

        ...base.ui,

        ...(raw?.ui || {})
      },


      components:
        Array.isArray(
          raw?.components
        )
          ? raw.components
          : []
    };


    merged.components =
      merged.components.map(
        hydrateComponent
      );


    if (
      !merged.selectedComponentId ||
      !merged.components.some(
        (component) =>
          component.id ===
          merged.selectedComponentId
      )
    ) {
      merged.selectedComponentId =
        merged.components[0]?.id ||
        null;
    }


    return merged;
  }


  function loadActiveJob() {

    try {

      const raw =
        localStorage.getItem(
          CFG.storage.activeJobKey
        );


      if (!raw) {
        return createNewJob();
      }


      return hydrateJob(
        JSON.parse(raw)
      );

    } catch {

      return createNewJob();
    }
  }


  let job =
    loadActiveJob();

  let calculation =
    null;

  let undoStack =
    [];

  let toastTimer =
    null;

  let dialogAction =
    null;


  /* =========================================================
     AUTOSAVE / UNDO
     ========================================================= */

  function pushUndo() {

    undoStack.push(
      deepClone(job)
    );


    if (
      undoStack.length >
      CFG.storage
        .undoHistoryLimit
    ) {
      undoStack.shift();
    }


    updateUndoButton();
  }


  function undo() {

    if (
      !undoStack.length
    ) {
      return;
    }


    job =
      undoStack.pop();


    autosave();

    renderAll();

    toast('Undone');
  }


  function markPricingChanged() {

    if (
      job.quote.mode ===
      'manual'
    ) {

      job.quote.mode =
        'auto';

      job.quote.manualIncGST =
        null;


      toast(
        'Pricing changed. Quote returned to Auto.'
      );
    }
  }


  function mutate(
    fn,
    {
      pricing = false,
      undoable = false
    } = {}
  ) {

    if (undoable) {
      pushUndo();
    }


    fn();


    if (pricing) {
      markPricingChanged();
    }


    job.updatedAt =
      new Date()
        .toISOString();


    autosave();

    renderAll();
  }


  function autosave() {

    if (
      !CFG.storage
        .autosaveActiveJob
    ) {
      return;
    }


    try {

      localStorage.setItem(
        CFG.storage.activeJobKey,
        JSON.stringify(job)
      );


      const status =
        $('#autosave-status');


      if (status) {
        status.textContent =
          'Autosaved';
      }

    } catch (error) {

      console.error(error);


      const status =
        $('#autosave-status');


      if (status) {
        status.textContent =
          'Save error';
      }
    }
  }


  /* =========================================================
     COMPONENT LABELS
     ========================================================= */

  function componentDisplayLabels() {

    const counts = {

      post:
        job.components.filter(
          (component) =>
            component.type ===
            'post'
        ).length,

      gate:
        job.components.filter(
          (component) =>
            component.type ===
            'gate'
        ).length,

      fixedPanel:
        job.components.filter(
          (component) =>
            component.type ===
            'fixedPanel'
        ).length
    };


    const seen = {

      post: 0,

      gate: 0,

      fixedPanel: 0
    };


    const labels =
      {};


    job.components.forEach(
      (component) => {

        seen[
          component.type
        ] += 1;


        if (
          component.type ===
          'post'
        ) {
          labels[
            component.id
          ] =
            `Post ${seen.post}`;
        }


        if (
          component.type ===
          'gate'
        ) {

          labels[
            component.id
          ] =
            counts.gate === 1
              ? 'Gate'
              : `Gate ${seen.gate}`;
        }


        if (
          component.type ===
          'fixedPanel'
        ) {

          labels[
            component.id
          ] =
            counts.fixedPanel ===
            1
              ? 'Fixed Panel'
              : `Fixed Panel ${seen.fixedPanel}`;
        }
      }
    );


    return labels;
  }


  /* =========================================================
     CONFIG HELPERS
     ========================================================= */

  function postConfig(postType) {

    return (
      CFG.steel.posts[
        postType
      ] ||
      CFG.steel.posts[
        CFG.defaults.postType
      ]
    );
  }


  function frameConfig(frameType) {

    return (
      CFG.steel.frame[
        frameType
      ] ||
      CFG.steel.frame[
        CFG.defaults.frameType
      ]
    );
  }


  function postFinishedHeight(post) {

    if (
      post.heightMode ===
      'manual'
    ) {
      return Math.max(
        0,
        num(
          post.manualFinishedHeightMm
        )
      );
    }


    return Math.max(
      0,
      num(
        job.site
          .finishedHeightMm
      )
    );
  }


  function postCutLengthMm(post) {

    const finished =
      postFinishedHeight(post);


    if (
      post.fixing ===
      'existing_structure'
    ) {
      return 0;
    }


    if (
      post.fixing ===
      'baseplate'
    ) {

      return Math.max(
        0,
        finished -
          CFG.fabrication
            .baseplateHeightAllowanceMm
      );
    }


    if (
      post.fixing ===
        'concrete_house' ||
      post.fixing ===
        'concrete_floating'
    ) {

      return (
        finished +
        CFG.fabrication
          .concreteEmbedmentMm
      );
    }


    return finished;
  }


  function gateFrameHeightMm() {

    return Math.max(
      0,
      num(
        job.site
          .finishedHeightMm
      ) -
        CFG.fabrication
          .gateGroundGapMm
    );
  }


  function panelWidthMm(panel) {

    return Math.max(
      0,
      num(panel.widthMm)
    );
  }


  function componentOccupiedWidthMm(
    component
  ) {

    if (
      component.type ===
      'post'
    ) {

      if (
        component.fixing ===
        'existing_structure'
      ) {
        return 0;
      }


      return postConfig(
        component.postType
      ).widthMm;
    }


    if (
      component.type ===
      'fixedPanel'
    ) {

      return panelWidthMm(
        component
      );
    }


    return 0;
  }


  /* =========================================================
     GATE DIMENSIONS
     ========================================================= */

  function gateGapTotalMm() {

    let total =
      0;


    const components =
      job.components;


    for (
      let index = 0;
      index <
      components.length - 1;
      index += 1
    ) {

      const first =
        components[index];

      const second =
        components[
          index + 1
        ];


      if (
        first.type ===
          'gate' &&
        second.type ===
          'gate' &&
        first.relationship ===
          'double' &&
        second.relationship ===
          'double' &&
        first.doublePairId &&
        first.doublePairId ===
          second.doublePairId
      ) {

        total +=
          CFG.fabrication
            .doubleGateCentreGapMm;

      } else if (
        first.type ===
          'gate' ||
        second.type ===
          'gate'
      ) {

        total +=
          CFG.fabrication
            .gateSideGapMm;
      }
    }


    return total;
  }


  function calculateGateWidths() {

    const result =
      {};


    const gates =
      job.components.filter(
        (component) =>
          component.type ===
          'gate'
      );


    if (
      !gates.length
    ) {
      return result;
    }


    const cavity =
      Math.max(
        0,
        num(
          job.site
            .cavityWidthMm
        )
      );


    const nonGateWidth =
      job.components
        .filter(
          (component) =>
            component.type !==
            'gate'
        )
        .reduce(
          (
            sum,
            component
          ) =>
            sum +
            componentOccupiedWidthMm(
              component
            ),
          0
        );


    const gapTotal =
      gateGapTotalMm();


    const manualGates =
      gates.filter(
        (gate) =>
          gate.widthMode ===
          'manual'
      );


    const autoGates =
      gates.filter(
        (gate) =>
          gate.widthMode !==
          'manual'
      );


    const manualTotal =
      manualGates.reduce(
        (
          sum,
          gate
        ) =>
          sum +
          Math.max(
            0,
            num(
              gate.manualWidthMm
            )
          ),
        0
      );


    manualGates.forEach(
      (gate) => {

        result[
          gate.id
        ] =
          Math.max(
            0,
            num(
              gate.manualWidthMm
            )
          );
      }
    );


    let available =
      cavity -
      nonGateWidth -
      gapTotal -
      manualTotal;


    available =
      Math.max(
        0,
        available
      );


    if (
      autoGates.length ===
      1
    ) {

      result[
        autoGates[0].id
      ] =
        available;


      return result;
    }


    if (
      autoGates.length >
      1
    ) {

      const doubleGroups =
        new Map();

      const unpaired =
        [];


      autoGates.forEach(
        (gate) => {

          if (
            gate.relationship ===
              'double' &&
            gate.doublePairId
          ) {

            if (
              !doubleGroups.has(
                gate.doublePairId
              )
            ) {
              doubleGroups.set(
                gate.doublePairId,
                []
              );
            }


            doubleGroups
              .get(
                gate.doublePairId
              )
              .push(gate);

          } else {

            unpaired.push(
              gate
            );
          }
        }
      );


      const completeDoubleGroups =
        [
          ...doubleGroups.values()
        ].filter(
          (group) =>
            group.length === 2
        );


      const invalidDoubleGates =
        [
          ...doubleGroups.values()
        ]
          .filter(
            (group) =>
              group.length !==
              2
          )
          .flat();


      unpaired.push(
        ...invalidDoubleGates
      );


      if (
        completeDoubleGroups.length ===
          1 &&
        unpaired.length ===
          0 &&
        autoGates.length ===
          2
      ) {

        const each =
          available / 2;


        completeDoubleGroups[0]
          .forEach(
            (gate) => {

              result[
                gate.id
              ] =
                each;
            }
          );

      } else {

        const each =
          autoGates.length
            ? available /
              autoGates.length
            : 0;


        autoGates.forEach(
          (gate) => {

            result[
              gate.id
            ] =
              each;
          }
        );
      }
    }


    return result;
  }


  function railCutLengthForGate(
    gate,
    gateWidth,
    gateHeight
  ) {

    const frame =
      frameConfig(
        gate.frameType
      );


    if (
      job.cladding.direction ===
      'horizontal'
    ) {

      return Math.max(
        0,
        gateHeight -
          frame.widthMm *
          2
      );
    }


    return Math.max(
      0,
      gateWidth -
        frame.widthMm *
        2
    );
  }


  /* =========================================================
     MATERIAL COST HELPERS
     ========================================================= */

  function stockLengthCost(
    totalLengthM,
    stockLengthM,
    stockPrice,
    includesGST
  ) {

    const qty =
      totalLengthM > 0
        ? Math.ceil(
            totalLengthM /
            stockLengthM
          )
        : 0;


    return {

      qty,

      costExGST:
        qty *
        gstExclusive(
          stockPrice,
          includesGST
        )
    };
  }


  function latchCostExGST(
    latchType
  ) {

    const item =
      CFG.hardware.latches[
        latchType
      ] ||
      CFG.hardware.latches
        .ddDualKey;


    if (
      'priceExGST' in
      item
    ) {

      return num(
        item.priceExGST
      );
    }


    return gstExclusive(
      item.price,
      item.priceIncludesGST
    );
  }


  /* =========================================================
     CLADDING SURFACES
     ========================================================= */

  function cladSurfaces(
    gateWidths
  ) {

    const surfaces =
      [];


    const gateHeight =
      gateFrameHeightMm();


    job.components.forEach(
      (component) => {

        if (
          component.type ===
          'gate'
        ) {

          const steelWidth =
            Math.max(
              0,
              num(
                gateWidths[
                  component.id
                ]
              )
            );


          const cladWidth =
            steelWidth +
            CFG.fabrication
              .gateCladdingOverhangMm *
              2;


          surfaces.push({

            componentId:
              component.id,

            type:
              'gate',

            widthMm:
              cladWidth,

            heightMm:
              gateHeight,

            steelWidthMm:
              steelWidth,

            steelHeightMm:
              gateHeight
          });
        }


        if (
          component.type ===
          'fixedPanel'
        ) {

          surfaces.push({

            componentId:
              component.id,

            type:
              'fixedPanel',

            widthMm:
              panelWidthMm(
                component
              ),

            heightMm:
              Math.max(
                0,
                num(
                  job.site
                    .finishedHeightMm
                )
              ),

            steelWidthMm:
              panelWidthMm(
                component
              ),

            steelHeightMm:
              Math.max(
                0,
                num(
                  job.site
                    .finishedHeightMm
                )
              )
          });
        }
      }
    );


    return surfaces;
  }


  function claddingAreaM2(
    surfaces
  ) {

    return surfaces.reduce(
      (
        sum,
        surface
      ) =>
        sum +
        (
          surface.widthMm /
          1000
        ) *
        (
          surface.heightMm /
          1000
        ),
      0
    );
  }


  /* =========================================================
     BOARD CLADDING
     ========================================================= */

  function calculateBoardCladding(
    config,
    surfaces
  ) {

    const direction =
      job.cladding.direction;


    const gap =
      Math.max(
        0,
        num(
          job.cladding.gapMm,
          CFG.fabrication
            .claddingGapMm
        )
      );


    let pieces =
      0;

    let cutLengthTotalM =
      0;

    let rawLinealM =
      0;


    surfaces.forEach(
      (surface) => {

        const acrossMm =
          direction ===
          'vertical'
            ? surface.widthMm
            : surface.heightMm;


        const cutBaseMm =
          direction ===
          'vertical'
            ? surface.heightMm
            : surface.widthMm;


        const boardWidth =
          num(
            config.boardWidthMm
          );


        const pitch =
          Math.max(
            1,
            boardWidth + gap
          );


        const qty =
          Math.max(
            1,
            Math.ceil(
              (
                acrossMm +
                gap
              ) /
              pitch
            )
          );


        const processing =
          config
            .processingAllowanceMode ===
          'add_standard'
            ? CFG.fabrication
                .claddingProcessingAllowanceMm
            : 0;


        const cutMm =
          cutBaseMm +
          processing;


        pieces +=
          qty;


        cutLengthTotalM +=
          (
            qty *
            cutMm
          ) /
          1000;


        rawLinealM +=
          (
            qty *
            cutBaseMm
          ) /
          1000;
      }
    );


    let materialCostExGST =
      0;

    let orderText =
      '';


    if (
      config.stockLengthM &&
      config.pricePerStockLength !=
        null
    ) {

      const order =
        stockLengthCost(
          cutLengthTotalM,
          config.stockLengthM,
          config.pricePerStockLength,
          config.priceIncludesGST
        );


      materialCostExGST =
        order.costExGST;


      orderText =
        `${order.qty} × ${config.stockLengthM}m lengths`;

    } else if (
      config.pricePerLinealM !=
      null
    ) {

      materialCostExGST =
        cutLengthTotalM *
        gstExclusive(
          config.pricePerLinealM,
          config.priceIncludesGST
        );


      orderText =
        `${round(
          cutLengthTotalM,
          2
        )} lm`;
    }


    return {

      pieces,

      cutLengthTotalM,

      rawLinealM,

      materialCostExGST,

      orderText
    };
  }


  /* =========================================================
     TREATED PINE
     ========================================================= */

  function calculatePine(
    surfaces
  ) {

    const config =
      CFG.cladding
        .treatedPinePalings;


    const width =
      num(
        job.cladding
          .palingWidthMm
      );


    const length =
      num(
        job.cladding
          .palingLengthMm
      );


    let qty =
      0;


    if (
      width &&
      length
    ) {

      surfaces.forEach(
        (surface) => {

          const metresWide =
            surface.widthMm /
            1000;


          if (
            width ===
            150
          ) {

            qty +=
              Math.ceil(
                surface.widthMm /
                100
              );

          } else {

            const base =
              Math.ceil(
                surface.widthMm /
                width
              );


            const extra =
              Math.ceil(
                metresWide *
                3
              );


            qty +=
              base +
              extra;
          }
        }
      );
    }


    const palingCostExGST =
      qty *
      gstExclusive(
        config.priceEach,
        config.priceIncludesGST
      );


    const autoAccessoryLengthM =
      surfaces.reduce(
        (
          sum,
          surface
        ) =>
          sum +
          surface.widthMm /
          1000,
        0
      );


    const accessoryLengthM =
      job.cladding
        .accessoryLengthMode ===
      'manual'
        ? Math.max(
            0,
            num(
              job.cladding
                .accessoryLengthM
            )
          )
        : autoAccessoryLengthM;


    const cappingCostExGST =
      job.cladding.capping
        ? accessoryLengthM *
          gstExclusive(
            config.capping
              .pricePerM,
            config.capping
              .priceIncludesGST
          )
        : 0;


    const plinthCostExGST =
      job.cladding.plinth
        ? accessoryLengthM *
          gstExclusive(
            config.plinth
              .pricePerM,
            config.plinth
              .priceIncludesGST
          )
        : 0;


    return {

      qty,

      palingWidthMm:
        width,

      palingLengthMm:
        length,

      materialCostExGST:
        palingCostExGST +
        cappingCostExGST +
        plinthCostExGST,

      palingCostExGST,

      cappingCostExGST,

      plinthCostExGST,

      accessoryLengthM,

      autoAccessoryLengthM,

      orderText:
        width &&
        length
          ? `${qty} × ${width}×${length}mm palings`
          : 'Select paling width and length'
    };
  }


  /* =========================================================
     MESH
     ========================================================= */

  function meshPieces(
    surfaces
  ) {

    const pieces =
      [];


    surfaces.forEach(
      (surface) => {

        const component =
          job.components.find(
            (item) =>
              item.id ===
              surface.componentId
          );


        if (!component) {
          return;
        }


        if (
          component.type ===
          'gate'
        ) {

          const frame =
            frameConfig(
              component.frameType
            );


          pieces.push({

            widthMm:
              Math.max(
                0,
                surface
                  .steelWidthMm -
                  frame.widthMm *
                  2
              ),

            heightMm:
              Math.max(
                0,
                surface
                  .steelHeightMm -
                  frame.widthMm *
                  2
              ),

            componentId:
              component.id
          });

        } else if (
          component.type ===
          'fixedPanel'
        ) {

          const leftWidth =
            component.leftPost
              .fixing ===
            'existing_structure'
              ? 0
              : postConfig(
                  component
                    .leftPost
                    .postType
                ).widthMm;


          const rightWidth =
            component.rightPost
              .fixing ===
            'existing_structure'
              ? 0
              : postConfig(
                  component
                    .rightPost
                    .postType
                ).widthMm;


          pieces.push({

            widthMm:
              Math.max(
                0,
                panelWidthMm(
                  component
                ) -
                  leftWidth -
                  rightWidth
              ),

            heightMm:
              Math.max(
                0,
                num(
                  job.site
                    .finishedHeightMm
                )
              ),

            componentId:
              component.id
          });
        }
      }
    );


    return pieces;
  }


  function fitCountInSheet(
    sheet,
    piece
  ) {

    const firstOrientation =
      Math.floor(
        sheet.lengthMm /
        piece.widthMm
      ) *
      Math.floor(
        sheet.widthMm /
        piece.heightMm
      );


    const secondOrientation =
      Math.floor(
        sheet.lengthMm /
        piece.heightMm
      ) *
      Math.floor(
        sheet.widthMm /
        piece.widthMm
      );


    return Math.max(
      firstOrientation,
      secondOrientation,
      0
    );
  }


  function calculateMesh(
    surfaces
  ) {

    const config =
      CFG.cladding
        .galvMesh50;


    const pieces =
      meshPieces(
        surfaces
      ).filter(
        (piece) =>
          piece.widthMm >
            0 &&
          piece.heightMm >
            0
      );


    const areaM2 =
      pieces.reduce(
        (
          sum,
          piece
        ) =>
          sum +
          (
            piece.widthMm /
            1000
          ) *
          (
            piece.heightMm /
            1000
          ),
        0
      );


    const materialCostExGST =
      areaM2 *
      config.pricePerM2;


    const order =
      [];


    pieces.forEach(
      (piece) => {

        let best =
          null;


        config.sheets.forEach(
          (sheet) => {

            const capacity =
              fitCountInSheet(
                sheet,
                piece
              );


            if (
              capacity <
              1
            ) {
              return;
            }


            const sheetArea =
              sheet.lengthMm *
              sheet.widthMm;


            const effectiveArea =
              sheetArea /
              capacity;


            if (
              !best ||
              effectiveArea <
                best.effectiveArea
            ) {

              best = {

                sheet,

                capacity,

                effectiveArea
              };
            }
          }
        );


        if (best) {

          const existing =
            order.find(
              (item) =>
                item.key ===
                best.sheet.key
            );


          if (existing) {

            existing.pieces +=
              1;

          } else {

            order.push({

              key:
                best.sheet.key,

              label:
                best.sheet.label,

              pieces:
                1,

              capacity:
                best.capacity
            });
          }
        }
      }
    );


    const orderText =
      order.length
        ? order
            .map(
              (item) =>
                `${Math.ceil(
                  item.pieces /
                  item.capacity
                )} × ${item.label}`
            )
            .join(', ')
        : 'Check sheet size manually';


    return {

      pieces,

      areaM2,

      materialCostExGST,

      orderText
    };
  }


  /* =========================================================
     CUSTOM / ALL CLADDING
     ========================================================= */

  function calculateCustomCladding(
    areaM2
  ) {

    const custom =
      job.cladding.custom;


    let materialCost =
      0;


    if (
      custom.costingMode ===
      'quantity_unit'
    ) {

      materialCost =
        Math.max(
          0,
          num(
            custom.quantity
          )
        ) *
        Math.max(
          0,
          num(
            custom.unitCost
          )
        );

    } else {

      materialCost =
        Math.max(
          0,
          num(
            custom.totalCost
          )
        );
    }


    return {

      materialCostExGST:
        gstExclusive(
          materialCost,
          custom.priceIncludesGST
        ),

      labourRatePerM2:
        Math.max(
          0,
          num(
            custom.labourRatePerM2
          )
        ),

      orderText:
        custom.name ||
        'Custom material'
    };
  }


  function calculateCladding(
    surfaces
  ) {

    const type =
      job.cladding.type;


    const config =
      CFG.cladding[type];


    const areaM2 =
      claddingAreaM2(
        surfaces
      );


    let detail =
      {};

    let materialCostExGST =
      0;


    let labourRatePerM2 =
      num(
        config?.labourRatePerM2
      );


    if (
      [
        'ekodeck',
        'cypressPickets',
        'losp90',
        'losp140',
        'merbau90',
        'merbau140'
      ].includes(type)
    ) {

      detail =
        calculateBoardCladding(
          config,
          surfaces
        );


      materialCostExGST =
        detail.materialCostExGST;

    } else if (
      type ===
      'treatedPinePalings'
    ) {

      detail =
        calculatePine(
          surfaces
        );


      materialCostExGST =
        detail.materialCostExGST;

    } else if (
      type ===
      'galvMesh50'
    ) {

      detail =
        calculateMesh(
          surfaces
        );


      materialCostExGST =
        detail.materialCostExGST;

    } else if (
      type ===
      'colorbond'
    ) {

      materialCostExGST =
        areaM2 *
        gstExclusive(
          config.pricePerM2,
          config.priceIncludesGST
        );


      labourRatePerM2 =
        Math.max(
          0,
          num(
            job.cladding
              .colorbond
              .labourRatePerM2
          )
        );


      detail = {

        orderText:
          `${round(
            areaM2,
            2
          )} m² ${job.cladding.profile || 'Colorbond'}`
      };

    } else if (
      type ===
      'custom'
    ) {

      detail =
        calculateCustomCladding(
          areaM2
        );


      materialCostExGST =
        detail.materialCostExGST;


      labourRatePerM2 =
        detail.labourRatePerM2;
    }


    return {

      type,

      config,

      areaM2,

      materialCostExGST,

      labourRatePerM2,

      labourCostExGST:
        areaM2 *
        labourRatePerM2,

      detail
    };
  }


  /* =========================================================
     POSTS
     ========================================================= */

  function collectPhysicalPosts() {

    const posts =
      [];


    const labels =
      componentDisplayLabels();


    job.components.forEach(
      (component) => {

        if (
          component.type ===
          'post'
        ) {

          posts.push({

            ownerId:
              component.id,

            ownerLabel:
              labels[
                component.id
              ],

            side: '',

            post:
              component
          });
        }


        if (
          component.type ===
          'fixedPanel'
        ) {

          posts.push({

            ownerId:
              component.id,

            ownerLabel:
              labels[
                component.id
              ],

            side:
              'Left',

            post:
              component.leftPost
          });


          posts.push({

            ownerId:
              component.id,

            ownerLabel:
              labels[
                component.id
              ],

            side:
              'Right',

            post:
              component.rightPost
          });
        }
      }
    );


    return posts;
  }


  function postLabour(post) {

    if (
      post.fixing ===
      'existing_structure'
    ) {

      return {

        fabrication:
          0,

        installation:
          0,

        drilling:
          0
      };
    }


    const holes =
      Array.isArray(
        post.holePositionsMm
      )
        ? post
            .holePositionsMm
            .length
        : 0;


    if (
      post.fixing ===
      'baseplate'
    ) {

      return {

        fabrication:
          0,

        drilling:
          holes *
          CFG.labour
            .baseplateHoleHoursEach,

        installation:
          CFG.labour
            .baseplatePostInstallHoursEach
      };
    }


    let fabrication =
      CFG.labour
        .postFabricationHoursEach;


    let drilling =
      0;


    if (
      post.fixing ===
      'fixed_brick'
    ) {

      fabrication =
        Math.max(
          CFG.labour
            .brickFixedMinimumHours,

          holes *
          CFG.labour
            .drilledHoleHoursEach
        );
    }


    let installation =
      0;


    if (
      post.fixing ===
        'concrete_house' ||
      post.fixing ===
        'concrete_floating'
    ) {

      installation =
        CFG.labour
          .concretePostInstallHoursEach;
    }


    return {

      fabrication,

      installation,

      drilling
    };
  }


  function calculatePosts() {

    const physicalPosts =
      collectPhysicalPosts();


    const byTypeLengths =
      {};


    let fabricationHours =
      0;

    let installationHours =
      0;

    let dynabolts =
      0;

    let concretePosts =
      0;

    let baseplates =
      0;

    let baseplateAllowanceExGST =
      0;


    const cutList =
      [];


    physicalPosts.forEach(
      (item) => {

        const post =
          item.post;


        const cutLengthMm =
          postCutLengthMm(post);


        const holes =
          Array.isArray(
            post.holePositionsMm
          )
            ? post
                .holePositionsMm
                .length
            : 0;


        const labour =
          postLabour(post);


        fabricationHours +=
          labour.fabrication +
          labour.drilling;


        installationHours +=
          labour.installation;


        dynabolts +=
          holes;


        if (
          post.fixing ===
            'concrete_house' ||
          post.fixing ===
            'concrete_floating'
        ) {

          concretePosts +=
            1;
        }


        if (
          post.fixing ===
          'baseplate'
        ) {

          baseplates +=
            1;


          baseplateAllowanceExGST +=
            CFG.fixings
              .baseplate
              .fabricationAllowanceExGST;
        }


        if (
          post.fixing !==
            'existing_structure' &&
          cutLengthMm > 0
        ) {

          byTypeLengths[
            post.postType
          ] =
            (
              byTypeLengths[
                post.postType
              ] ||
              0
            ) +
            cutLengthMm /
            1000;
        }


        cutList.push({

          label:
            `${item.ownerLabel}${item.side ? ` ${item.side} Post` : ''}`,

          postType:
            post.postType,

          cutLengthMm,

          fixing:
            post.fixing,

          holes:
            [
              ...(
                post.holePositionsMm ||
                []
              )
            ].sort(
              (
                first,
                second
              ) =>
                first -
                second
            )
        });
      }
    );


    let steelCostExGST =
      0;


    const steelOrders =
      [];


    Object.entries(
      byTypeLengths
    ).forEach(
      ([
        type,
        lengthM
      ]) => {

        const config =
          postConfig(type);


        const order =
          stockLengthCost(
            lengthM,
            config.stockLengthM,
            config.pricePerStockLength,
            config.priceIncludesGST
          );


        steelCostExGST +=
          order.costExGST;


        steelOrders.push({

          type,

          label:
            config.label,

          lengthM,

          stockQty:
            order.qty,

          stockLengthM:
            config.stockLengthM,

          costExGST:
            order.costExGST
        });
      }
    );


    const dynaboltCostExGST =
      dynabolts *
      gstExclusive(
        CFG.fixings
          .dynabolt
          .priceEach,
        CFG.fixings
          .dynabolt
          .priceIncludesGST
      );


    const concreteBags =
      concretePosts *
      CFG.concrete
        .defaultBagsPerPost;


    const concreteCostExGST =
      concreteBags *
      gstExclusive(
        CFG.concrete
          .pricePerBag,
        CFG.concrete
          .priceIncludesGST
      );


    return {

      physicalPosts,

      fabricationHours,

      installationHours,

      dynabolts,

      dynaboltCostExGST,

      concretePosts,

      concreteBags,

      concreteCostExGST,

      baseplates,

      baseplateAllowanceExGST,

      steelCostExGST,

      steelOrders,

      cutList
    };
  }


  /* =========================================================
     GATE / FIXED PANEL FRAMES
     ========================================================= */

  function calculateFrames(
    gateWidths
  ) {

    const lengthsByType =
      {};


    const cutList =
      [];


    let gateFabricationHours =
      0;

    let gateInstallHours =
      0;

    let panelFabricationHours =
      0;

    let panelInstallHours =
      0;

    let hingeSets =
      0;

    let latchCostExGSTTotal =
      0;

    let screwItems =
      0;


    const labels =
      componentDisplayLabels();


    const gateHeight =
      gateFrameHeightMm();


    job.components.forEach(
      (component) => {

        if (
          component.type ===
          'gate'
        ) {

          const width =
            Math.max(
              0,
              num(
                gateWidths[
                  component.id
                ]
              )
            );


          const frame =
            frameConfig(
              component.frameType
            );


          const railCount =
            clamp(
              parseInt(
                component
                  .internalRailCount,
                10
              ) ||
              0,
              0,
              CFG.rails.gate
                .maximumInternalRailCount
            );


          const railLength =
            railCutLengthForGate(
              component,
              width,
              gateHeight
            );


          const perimeterM =
            (
              width *
                2 +
              gateHeight *
                2
            ) /
            1000;


          const railM =
            (
              railCount *
              railLength
            ) /
            1000;


          lengthsByType[
            component.frameType
          ] =
            (
              lengthsByType[
                component.frameType
              ] ||
              0
            ) +
            perimeterM +
            railM;


          gateFabricationHours +=
            CFG.labour
              .gateFabricationHoursEach;


          gateInstallHours +=
            CFG.labour
              .hangGateHoursEach;


          hingeSets +=
            1;


          latchCostExGSTTotal +=
            latchCostExGST(
              component.latchType
            );


          screwItems +=
            1;


          cutList.push({

            label:
              labels[
                component.id
              ],

            type:
              'gate',

            frameType:
              component.frameType,

            widthMm:
              width,

            heightMm:
              gateHeight,

            railCount,

            railLengthMm:
              railLength,

            railOrientation:
              job.cladding.direction ===
              'horizontal'
                ? 'vertical'
                : 'horizontal',

            hingeSide:
              component.hingeSide
          });
        }


        if (
          component.type ===
          'fixedPanel'
        ) {

          const width =
            panelWidthMm(
              component
            );


          const height =
            Math.max(
              0,
              num(
                job.site
                  .finishedHeightMm
              )
            );


          const frameType =
            CFG.defaults.frameType;


          let railCount =
            0;

          let railLength =
            0;


          if (
            job.cladding.direction ===
            'vertical'
          ) {

            railCount =
              clamp(
                parseInt(
                  component
                    .verticalRailCount,
                  10
                ) ||
                CFG.rails
                  .fixedPanel
                  .verticalDefaultRailCount,
                CFG.rails
                  .fixedPanel
                  .verticalMinimumRailCount,
                CFG.rails
                  .fixedPanel
                  .verticalMaximumRailCount
              );


            const leftWidth =
              component.leftPost
                .fixing ===
              'existing_structure'
                ? 0
                : postConfig(
                    component
                      .leftPost
                      .postType
                  ).widthMm;


            const rightWidth =
              component.rightPost
                .fixing ===
              'existing_structure'
                ? 0
                : postConfig(
                    component
                      .rightPost
                      .postType
                  ).widthMm;


            railLength =
              Math.max(
                0,
                width -
                  leftWidth -
                  rightWidth
              );


            lengthsByType[
              frameType
            ] =
              (
                lengthsByType[
                  frameType
                ] ||
                0
              ) +
              (
                railCount *
                railLength
              ) /
              1000;
          }


          panelFabricationHours +=
            CFG.labour
              .fixedPanelFabricationHoursEach;


          panelInstallHours +=
            CFG.labour
              .fixedPanelInstallHoursEach;


          screwItems +=
            1;


          cutList.push({

            label:
              labels[
                component.id
              ],

            type:
              'fixedPanel',

            frameType,

            widthMm:
              width,

            heightMm:
              height,

            railCount,

            railLengthMm:
              railLength,

            railOrientation:
              'horizontal'
          });
        }
      }
    );


    let steelCostExGST =
      0;


    const steelOrders =
      [];


    Object.entries(
      lengthsByType
    ).forEach(
      ([
        type,
        lengthM
      ]) => {

        const config =
          frameConfig(type);


        const order =
          stockLengthCost(
            lengthM,
            config.stockLengthM,
            config.pricePerStockLength,
            config.priceIncludesGST
          );


        steelCostExGST +=
          order.costExGST;


        steelOrders.push({

          type,

          label:
            config.label,

          lengthM,

          stockQty:
            order.qty,

          stockLengthM:
            config.stockLengthM,

          costExGST:
            order.costExGST
        });
      }
    );


    const hingeCostExGST =
      hingeSets *
      gstExclusive(
        CFG.hardware
          .hinges
          .lockout
          .pricePerSet,
        CFG.hardware
          .hinges
          .lockout
          .priceIncludesGST
      );


    const screwCostExGST =
      screwItems *
      gstExclusive(
        CFG.fixings
          .screws
          .defaultPerItem,
        CFG.fixings
          .screws
          .priceIncludesGST
      );


    return {

      lengthsByType,

      steelCostExGST,

      steelOrders,

      gateFabricationHours,

      gateInstallHours,

      panelFabricationHours,

      panelInstallHours,

      hingeSets,

      hingeCostExGST,

      latchCostExGST:
        latchCostExGSTTotal,

      screwItems,

      screwCostExGST,

      cutList
    };
  }


  /* =========================================================
     POWDER COATING / STEEL FINISH
     ========================================================= */

  function calculatePowder(
    posts,
    frames
  ) {

    if (
      !job.powder.enabled
    ) {

      let areaM2 =
        0;


      posts.physicalPosts
        .forEach(
          ({ post }) => {

            if (
              post.fixing ===
              'existing_structure'
            ) {
              return;
            }


            const config =
              postConfig(
                post.postType
              );


            const length =
              postCutLengthMm(
                post
              ) /
              1000;


            areaM2 +=
              length *
              (
                (
                  config.widthMm +
                  config.depthMm
                ) *
                2 /
                1000
              );
          }
        );


      frames.cutList
        .forEach(
          (item) => {

            if (
              item.type ===
              'gate'
            ) {

              const config =
                frameConfig(
                  item.frameType
                );


              const totalLengthM =
                (
                  item.widthMm *
                    2 +
                  item.heightMm *
                    2 +
                  item.railCount *
                    item.railLengthMm
                ) /
                1000;


              areaM2 +=
                totalLengthM *
                (
                  (
                    config.widthMm +
                    config.depthMm
                  ) *
                  2 /
                  1000
                );
            }


            if (
              item.type ===
                'fixedPanel' &&
              item.railCount >
                0
            ) {

              const config =
                frameConfig(
                  item.frameType
                );


              const lengthM =
                (
                  item.railCount *
                  item.railLengthMm
                ) /
                1000;


              areaM2 +=
                lengthM *
                (
                  (
                    config.widthMm +
                    config.depthMm
                  ) *
                  2 /
                  1000
                );
            }
          }
        );


      const costExGST =
        areaM2 *
        gstExclusive(
          CFG.finishing
            .duragalvTouchUp
            .ratePerM2,
          CFG.finishing
            .duragalvTouchUp
            .priceIncludesGST
        );


      return {

        enabled:
          false,

        postsExGST:
          0,

        framesExGST:
          0,

        travelExGST:
          0,

        touchUpExGST:
          costExGST,

        totalExGST:
          costExGST,

        areaM2
      };
    }


    let postCost =
      0;


    posts.physicalPosts
      .forEach(
        ({ post }) => {

          if (
            post.fixing ===
            'existing_structure'
          ) {
            return;
          }


          const rate =
            num(
              CFG.powderCoating
                .postRatePerLm[
                  post.postType
                ]
            );


          postCost +=
            (
              postCutLengthMm(
                post
              ) /
              1000
            ) *
            rate;
        }
      );


    let frameArea =
      0;


    frames.cutList.forEach(
      (item) => {

        if (
          item.type ===
          'gate'
        ) {

          frameArea +=
            (
              item.widthMm /
              1000
            ) *
            (
              item.heightMm /
              1000
            );
        }


        if (
          item.type ===
            'fixedPanel' &&
          item.railCount >
            0
        ) {

          frameArea +=
            (
              item.widthMm /
              1000
            ) *
            (
              item.heightMm /
              1000
            );
        }
      }
    );


    const framesExGST =
      frameArea *
      CFG.powderCoating
        .openFrameRatePerM2;


    const travelExGST =
      CFG.powderCoating
        .jobTravelAllowanceExGST;


    return {

      enabled:
        true,

      postsExGST:
        postCost,

      framesExGST,

      travelExGST,

      touchUpExGST:
        0,

      totalExGST:
        postCost +
        framesExGST +
        travelExGST,

      frameAreaM2:
        frameArea
    };
  }


  /* =========================================================
     TRAVEL
     ========================================================= */

  function calculateTravel() {

    const oneWayKm =
      Math.max(
        0,
        num(
          job.site
            .oneWayTravelKm
        )
      );


    const roundTripKm =
      oneWayKm *
      2;


    const chargeableKm =
      Math.max(
        0,
        roundTripKm -
          CFG.business
            .includedTravelKm
      );


    return {

      oneWayKm,

      roundTripKm,

      chargeableKm,

      costExGST:
        chargeableKm *
        CFG.business
          .travelRatePerKm
    };
  }


  /* =========================================================
     LAYOUT STATUS
     ========================================================= */

  function calculateLayoutStatus(
    gateWidths
  ) {

    const cavity =
      Math.max(
        0,
        num(
          job.site
            .cavityWidthMm
        )
      );


    const nonGateWidth =
      job.components
        .filter(
          (component) =>
            component.type !==
            'gate'
        )
        .reduce(
          (
            sum,
            component
          ) =>
            sum +
            componentOccupiedWidthMm(
              component
            ),
          0
        );


    const gateWidth =
      job.components
        .filter(
          (component) =>
            component.type ===
            'gate'
        )
        .reduce(
          (
            sum,
            component
          ) =>
            sum +
            Math.max(
              0,
              num(
                gateWidths[
                  component.id
                ]
              )
            ),
          0
        );


    const gaps =
      gateGapTotalMm();


    const total =
      nonGateWidth +
      gateWidth +
      gaps;


    const difference =
      cavity -
      total;


    const autoGates =
      job.components.filter(
        (component) =>
          component.type ===
            'gate' &&
          component.widthMode !==
            'manual'
      );


    const unrelatedAutoAmbiguous =
      autoGates.length >
        1 &&
      !(
        autoGates.length ===
          2 &&
        autoGates[0]
          .relationship ===
          'double' &&
        autoGates[1]
          .relationship ===
          'double' &&
        autoGates[0]
          .doublePairId &&
        autoGates[0]
          .doublePairId ===
          autoGates[1]
            .doublePairId
      );


    return {

      cavity,

      nonGateWidth,

      gateWidth,

      gaps,

      total,

      difference,

      unrelatedAutoAmbiguous,

      valid:
        cavity >
          0 &&
        Math.abs(
          difference
        ) <
          1 &&
        !unrelatedAutoAmbiguous
    };
  }


  /* =========================================================
     MASTER CALCULATION
     ========================================================= */

  function calculateJob() {

    const gateWidths =
      calculateGateWidths();


    const surfaces =
      cladSurfaces(
        gateWidths
      );


    const posts =
      calculatePosts();


    const frames =
      calculateFrames(
        gateWidths
      );


    const cladding =
      calculateCladding(
        surfaces
      );


    const powder =
      calculatePowder(
        posts,
        frames
      );


    const travel =
      calculateTravel();


    const fabricationAutoHours =
      frames.gateFabricationHours +
      frames.panelFabricationHours +
      posts.fabricationHours;


    const installationAutoHours =
      frames.gateInstallHours +
      frames.panelInstallHours +
      posts.installationHours;


    const fabricationTotalHours =
      fabricationAutoHours +
      Math.max(
        0,
        num(
          job.labour
            .additionalFabricationHours
        )
      );


    const installationTotalHours =
      installationAutoHours +
      Math.max(
        0,
        num(
          job.labour
            .additionalInstallHours
        )
      );


    const coreLabourHours =
      fabricationTotalHours +
      installationTotalHours;


    const coreLabourCostExGST =
      coreLabourHours *
      CFG.business
        .labourRate;


    const claddingLabourCostExGST =
      cladding
        .labourCostExGST;


    const labourCostExGST =
      coreLabourCostExGST +
      claddingLabourCostExGST;


    const materialsBeforeMarkupExGST =
      posts.steelCostExGST +
      frames.steelCostExGST +
      posts.dynaboltCostExGST +
      posts.concreteCostExGST +
      posts.baseplateAllowanceExGST +
      frames.hingeCostExGST +
      frames.latchCostExGST +
      frames.screwCostExGST +
      cladding.materialCostExGST;


    const materialMarkupExGST =
      materialsBeforeMarkupExGST *
      CFG.business
        .materialMarkup;


    const sellExGST =
      materialsBeforeMarkupExGST +
      materialMarkupExGST +
      labourCostExGST +
      travel.costExGST +
      powder.totalExGST;


    const autoIncGSTUnrounded =
      sellExGST *
      (
        1 +
        CFG.business.gst
      );


    const autoIncGST =
      ceilTo(
        autoIncGSTUnrounded,
        CFG.business.roundTo
      );


    const finalIncGST =
      job.quote.mode ===
        'manual' &&
      Number.isFinite(
        Number(
          job.quote
            .manualIncGST
        )
      )
        ? Math.max(
            0,
            num(
              job.quote
                .manualIncGST
            )
          )
        : autoIncGST;


    const finalExGST =
      finalIncGST /
      (
        1 +
        CFG.business.gst
      );


    const finalGST =
      finalIncGST -
      finalExGST;


    const actualCostExGST =
      materialsBeforeMarkupExGST +
      labourCostExGST +
      travel.costExGST +
      powder.totalExGST;


    const profitExGST =
      finalExGST -
      actualCostExGST;


    const cavityAreaM2 =
      (
        Math.max(
          0,
          num(
            job.site
              .cavityWidthMm
          )
        ) /
        1000
      ) *
      (
        Math.max(
          0,
          num(
            job.site
              .finishedHeightMm
          )
        ) /
        1000
      );


    const effectiveRate =
      cavityAreaM2 > 0
        ? finalIncGST /
          cavityAreaM2
        : 0;


    const layout =
      calculateLayoutStatus(
        gateWidths
      );


    return {

      gateWidths,

      surfaces,

      posts,

      frames,

      cladding,

      powder,

      travel,


      labour: {

        fabricationAutoHours,

        installationAutoHours,

        fabricationTotalHours,

        installationTotalHours,

        coreLabourHours,

        coreLabourCostExGST,

        claddingLabourCostExGST,

        totalCostExGST:
          labourCostExGST
      },


      costing: {

        materialsBeforeMarkupExGST,

        materialMarkupExGST,

        labourCostExGST,

        travelExGST:
          travel.costExGST,

        finishExGST:
          powder.totalExGST,

        sellExGST,

        autoIncGST,

        autoIncGSTUnrounded,

        finalIncGST,

        finalExGST,

        finalGST,

        actualCostExGST,

        profitExGST,

        cavityAreaM2,

        effectiveRate
      },


      layout
    };
  }


  /* =========================================================
     COMPONENT COMPLETE
     ========================================================= */

  function componentComplete(
    component
  ) {

    if (
      component.type ===
      'post'
    ) {

      if (
        !component.postType ||
        !component.fixing
      ) {
        return false;
      }


      if (
        component.heightMode ===
          'manual' &&
        num(
          component
            .manualFinishedHeightMm
        ) <= 0
      ) {
        return false;
      }


      return true;
    }


    if (
      component.type ===
      'gate'
    ) {

      if (
        !component.frameType ||
        !component.hingeSide ||
        !component.openDirection
      ) {
        return false;
      }


      if (
        component.widthMode ===
          'manual' &&
        num(
          component.manualWidthMm
        ) <= 0
      ) {
        return false;
      }


      if (
        component.relationship ===
          'double' &&
        !component.doublePairId
      ) {
        return false;
      }


      return true;
    }


    if (
      component.type ===
      'fixedPanel'
    ) {

      if (
        num(
          component.widthMm
        ) <= 0
      ) {
        return false;
      }


      if (
        !component.leftPost
          ?.postType ||
        !component.leftPost
          ?.fixing ||
        !component.rightPost
          ?.postType ||
        !component.rightPost
          ?.fixing
      ) {
        return false;
      }


      return true;
    }


    return false;
  }


  /* =========================================================
     MASTER RENDER
     ========================================================= */

  function renderAll() {

    calculation =
      calculateJob();


    renderHeader();

    renderNavigation();

    renderSite();

    renderMudMap();

    renderComponentEditor();

    renderLayoutSummary();

    renderCladding();

    renderPowder();

    renderMaterials();

    renderLabour();

    renderCosting();

    renderClient();

    renderQuote();

    renderSavedJobs();

    updateUndoButton();
  }


  /* =========================================================
     HEADER / NAVIGATION
     ========================================================= */

  function renderHeader() {

    $('#header-client-name')
      .textContent =
      job.client.name ||
      'New Job';


    $('#header-client-mobile')
      .textContent =
      job.client.mobile ||
      '04';


    $('#project-number-display')
      .textContent =
      job.client
        .projectNumber;


    $('#quote-mode-header')
      .textContent =
      job.quote.mode ===
      'manual'
        ? 'Manual'
        : 'Auto';
  }


  function renderNavigation() {

    const active =
      job.ui.activeSection ||
      'site';


    $$('.nav-tab')
      .forEach(
        (button) => {

          button.classList.toggle(
            'active',
            button.dataset
              .sectionTarget ===
              active
          );
        }
      );


    $$('.app-section')
      .forEach(
        (section) => {

          section.classList.toggle(
            'active',
            section.dataset
              .section ===
              active
          );
        }
      );
  }


  function navigate(section) {

    job.ui.activeSection =
      section;


    autosave();

    renderNavigation();


    window.scrollTo({
      top: 0,
      behavior: 'auto'
    });
  }


  /* =========================================================
     SIMPLE INPUT RENDER
     ========================================================= */

  function setInputValue(
    selector,
    value
  ) {

    const element =
      $(selector);


    if (
      element &&
      document.activeElement !==
        element
    ) {

      element.value =
        value ?? '';
    }
  }


  /* =========================================================
     SITE
     ========================================================= */

  function renderSite() {

    setInputValue(
      '#site-cavity-width',
      job.site
        .cavityWidthMm ||
        ''
    );


    setInputValue(
      '#site-finished-height',
      job.site
        .finishedHeightMm ||
        ''
    );


    setInputValue(
      '#site-travel-km',
      job.site
        .oneWayTravelKm ||
        ''
    );


    setInputValue(
      '#site-reference-direction',
      job.site
        .referenceDirection
    );


    setInputValue(
      '#site-reference-custom',
      job.site
        .referenceCustom
    );


    $('#site-ground-gap-display')
      .textContent =
      mm(
        CFG.fabrication
          .gateGroundGapMm
      );


    $('#site-gate-gap-display')
      .textContent =
      mm(
        CFG.fabrication
          .gateSideGapMm *
          2
      );


    $('#custom-reference-wrap')
      .classList.toggle(
        'hidden',
        job.site
          .referenceDirection !==
          'other'
      );


    const cavityGroup =
      $('#site-cavity-width')
        ?.closest(
          '.required-field'
        );


    if (cavityGroup) {

      cavityGroup
        .classList.toggle(
          'complete',
          num(
            job.site
              .cavityWidthMm
          ) > 0
        );
    }


    const heightGroup =
      $('#site-finished-height')
        ?.closest(
          '.required-field'
        );


    if (heightGroup) {

      heightGroup
        .classList.toggle(
          'complete',
          num(
            job.site
              .finishedHeightMm
          ) > 0
        );
    }
  }


  /* =========================================================
     MUD MAP
     ========================================================= */

  function renderMudMap() {

    const root =
      $('#mud-map');


    const labels =
      componentDisplayLabels();


    if (
      !job.components.length
    ) {

      root.innerHTML =
        '<div class="empty-state">Add a Post, Gate or Fixed Panel below.</div>';

      return;
    }


    root.innerHTML =
      job.components
        .map(
          (component) => {

            const selected =
              component.id ===
              job.selectedComponentId
                ? ' selected'
                : '';


            const complete =
              componentComplete(
                component
              );


            const className =
              component.type ===
              'fixedPanel'
                ? 'fixed-panel'
                : component.type;


            let dimensions =
              '';

            let hinge =
              '';

            let extraClass =
              '';

            let relationship =
              '';


            if (
              component.type ===
              'post'
            ) {

              dimensions =
                component.fixing ===
                'existing_structure'
                  ? 'Existing'
                  : `${Math.round(
                      postCutLengthMm(
                        component
                      )
                    )}mm cut`;
            }


            if (
              component.type ===
              'gate'
            ) {

              const width =
                calculation
                  .gateWidths[
                    component.id
                  ] ||
                0;


              const height =
                gateFrameHeightMm();


              dimensions =
                `${Math.round(width)} × ${Math.round(height)}mm`;


              hinge =
                `<span class="mud-map-hinge ${component.hingeSide}">H</span>`;


              extraClass =
                component.hingeSide ===
                'right'
                  ? ' hinge-right'
                  : '';


              if (
                component.relationship ===
                  'double' &&
                component.doublePairId
              ) {

                relationship =
                  '<span class="mud-map-double">DOUBLE</span>';
              }
            }


            if (
              component.type ===
              'fixedPanel'
            ) {

              dimensions =
                `${Math.round(
                  panelWidthMm(
                    component
                  )
                )} × ${Math.round(
                  num(
                    job.site
                      .finishedHeightMm
                  )
                )}mm`;
            }


            return `
              <div
                class="mud-map-item ${className}${selected}${extraClass}"
                data-action="select-component"
                data-component-id="${safe(component.id)}"
                role="button"
                tabindex="0"
              >

                ${hinge}

                <button
                  type="button"
                  class="mud-map-delete"
                  data-action="delete-component"
                  data-component-id="${safe(component.id)}"
                  aria-label="Delete ${safe(labels[component.id])}"
                  title="Delete ${safe(labels[component.id])}"
                >
                  ×
                </button>

                <span
                  class="mud-map-status${complete ? ' complete' : ''}"
                ></span>

                <span class="mud-map-name">
                  ${safe(labels[component.id])}
                </span>

                ${relationship}

                <span class="mud-map-dimensions">
                  ${safe(dimensions)}
                </span>

              </div>
            `;
          }
        )
        .join('');
  }


  /* =========================================================
     COMPONENT EDITOR HELPERS
     ========================================================= */

  function optionsFromObject(
    object,
    selected
  ) {

    return Object.entries(
      object
    )
      .map(
        ([
          key,
          config
        ]) =>
          `<option value="${safe(key)}" ${key === selected ? 'selected' : ''}>${safe(config.label)}</option>`
      )
      .join('');
  }


  function fixingOptions(
    selected
  ) {

    return Object.entries(
      CFG.postFixings
    )
      .map(
        ([
          key,
          config
        ]) =>
          `<option value="${safe(key)}" ${key === selected ? 'selected' : ''}>${safe(config.label)}</option>`
      )
      .join('');
  }


  function renderHoleEditor(
    ownerId,
    side,
    post
  ) {

    const positions =
      [
        ...(
          post.holePositionsMm ||
          []
        )
      ].sort(
        (
          first,
          second
        ) =>
          first -
          second
      );


    const sideAttr =
      side
        ? ` data-panel-side="${side}"`
        : '';


    return `
      <div class="component-subsection">

        <div class="component-subsection-title">
          Bolt / Hole Positions From Top
        </div>

        <div class="form-grid two-column">

          <div class="field-group">

            <label>
              Add Hole Position
            </label>

            <div class="input-with-unit">

              <input
                type="number"
                min="0"
                step="1"
                inputmode="numeric"
                id="hole-input-${safe(ownerId)}-${safe(side || 'main')}"
                placeholder="e.g. 150"
              >

              <span class="input-unit">
                mm
              </span>

            </div>

          </div>


          <div class="field-group">

            <label>&nbsp;</label>

            <button
              type="button"
              class="primary-btn"
              data-action="add-hole"
              data-component-id="${safe(ownerId)}"
              ${sideAttr}
            >
              Add Hole
            </button>

          </div>

        </div>


        <div
          class="required-materials-list"
          style="margin-top:10px;"
        >

          ${
            positions.length
              ? positions
                  .map(
                    (position) => `
                      <div class="required-material-row">

                        <span>
                          ${Math.round(position)} mm from top
                        </span>

                        <button
                          type="button"
                          class="secondary-btn"
                          data-action="delete-hole"
                          data-component-id="${safe(ownerId)}"
                          data-hole="${position}"
                          ${sideAttr}
                        >
                          Remove
                        </button>

                      </div>
                    `
                  )
                  .join('')
              : '<div class="empty-state">No holes entered.</div>'
          }

        </div>

      </div>
    `;
  }


  function componentToolbar(
    component
  ) {

    const index =
      job.components.findIndex(
        (item) =>
          item.id ===
          component.id
      );


    return `
      <div class="component-toolbar">

        <button
          type="button"
          data-action="move-component-left"
          data-component-id="${safe(component.id)}"
          ${index === 0 ? 'disabled' : ''}
        >
          ←
        </button>

        <button
          type="button"
          data-action="move-component-right"
          data-component-id="${safe(component.id)}"
          ${index === job.components.length - 1 ? 'disabled' : ''}
        >
          →
        </button>

        <button
          type="button"
          class="delete"
          data-action="delete-component"
          data-component-id="${safe(component.id)}"
        >
          Delete
        </button>

      </div>
    `;
  }


  /* =========================================================
     POST EDITOR
     ========================================================= */

  function renderPostEditor(
    component,
    label
  ) {

    const needsHoles =
      component.fixing ===
        'fixed_brick' ||
      component.fixing ===
        'baseplate';


    return `
      <div
        id="component-card-${safe(component.id)}"
        class="card component-card post${component.id === job.selectedComponentId ? ' component-selected' : ''}"
      >

        <div class="component-card-header">

          <div class="component-title-wrap">

            <h2 class="component-title">
              ${safe(label)}
            </h2>

            <div class="component-subtitle">
              Standalone post
            </div>

          </div>

          ${componentToolbar(component)}

        </div>


        <div class="form-grid two-column">

          <div class="field-group required-field complete">

            <label>
              Post Size
            </label>

            <select
              data-component-field="postType"
              data-component-id="${safe(component.id)}"
            >
              ${optionsFromObject(
                CFG.steel.posts,
                component.postType
              )}
            </select>

          </div>


          <div class="field-group required-field complete">

            <label>
              Fixing
            </label>

            <select
              data-component-field="fixing"
              data-component-id="${safe(component.id)}"
            >
              ${fixingOptions(component.fixing)}
            </select>

          </div>

        </div>


        <div class="component-subsection">

          <div class="component-subsection-title">
            Post Height
          </div>


          <div class="segmented-control">

            <button
              type="button"
              class="segment-btn ${component.heightMode === 'auto' ? 'active' : ''}"
              data-action="set-post-height-mode"
              data-component-id="${safe(component.id)}"
              data-value="auto"
            >
              AUTO
            </button>

            <button
              type="button"
              class="segment-btn ${component.heightMode === 'manual' ? 'active' : ''}"
              data-action="set-post-height-mode"
              data-component-id="${safe(component.id)}"
              data-value="manual"
            >
              MANUAL
            </button>

          </div>


          ${
            component.heightMode ===
            'manual'
              ? `
                <div
                  class="field-group"
                  style="margin-top:10px;"
                >

                  <label>
                    Finished Height
                  </label>

                  <div class="input-with-unit">

                    <input
                      type="number"
                      inputmode="numeric"
                      min="0"
                      step="1"
                      value="${num(component.manualFinishedHeightMm)}"
                      data-component-field="manualFinishedHeightMm"
                      data-component-id="${safe(component.id)}"
                    >

                    <span class="input-unit">
                      mm
                    </span>

                  </div>

                </div>
              `
              : ''
          }


          <div class="compact-feature-summary">

            Cut length:
            ${
              component.fixing ===
              'existing_structure'
                ? 'No new post'
                : mm(
                    postCutLengthMm(
                      component
                    )
                  )
            }

          </div>

        </div>


        ${
          needsHoles
            ? renderHoleEditor(
                component.id,
                '',
                component
              )
            : ''
        }

      </div>
    `;
  }


  /* =========================================================
     DOUBLE GATE PAIRS
     ========================================================= */

  function availableDoublePairOptions(
    currentGate
  ) {

    const pairs =
      new Map();


    job.components
      .filter(
        (gate) =>
          gate.type ===
            'gate' &&
          gate.id !==
            currentGate.id &&
          gate.relationship ===
            'double' &&
          gate.doublePairId
      )
      .forEach(
        (gate) => {

          pairs.set(
            gate.doublePairId,
            gate.doublePairId
          );
        }
      );


    const current =
      currentGate.doublePairId;


    if (current) {

      pairs.set(
        current,
        current
      );
    }


    const options =
      [
        ...pairs.keys()
      ]
        .map(
          (id) =>
            `<option value="${safe(id)}" ${id === current ? 'selected' : ''}>${safe(id)}</option>`
        )
        .join('');


    return `
      <option value="">
        Select / create pair
      </option>

      ${options}

      <option value="__new__">
        Create new pair
      </option>
    `;
  }


  /* =========================================================
     GATE EDITOR
     ========================================================= */

  function renderGateEditor(
    component,
    label
  ) {

    const width =
      calculation
        .gateWidths[
          component.id
        ] ||
      0;


    return `
      <div
        id="component-card-${safe(component.id)}"
        class="card component-card gate${component.id === job.selectedComponentId ? ' component-selected' : ''}"
      >

        <div class="component-card-header">

          <div class="component-title-wrap">

            <h2 class="component-title">
              ${safe(label)}
            </h2>

            <div class="component-subtitle">
              ${Math.round(width)} × ${Math.round(gateFrameHeightMm())}mm steel frame
            </div>

          </div>

          ${componentToolbar(component)}

        </div>


        <div class="form-grid two-column">

          <div class="field-group required-field complete">

            <label>
              Frame Steel
            </label>

            <select
              data-component-field="frameType"
              data-component-id="${safe(component.id)}"
            >
              ${optionsFromObject(
                CFG.steel.frame,
                component.frameType
              )}
            </select>

          </div>


          <div class="field-group">

            <label>
              Latch
            </label>

            <select
              data-component-field="latchType"
              data-component-id="${safe(component.id)}"
            >
              ${optionsFromObject(
                CFG.hardware.latches,
                component.latchType
              )}
            </select>

          </div>

        </div>


        <div class="component-subsection">

          <div class="component-subsection-title">
            Gate Width
          </div>


          <div class="segmented-control">

            <button
              type="button"
              class="segment-btn ${component.widthMode === 'auto' ? 'active' : ''}"
              data-action="set-gate-width-mode"
              data-component-id="${safe(component.id)}"
              data-value="auto"
            >
              AUTO
            </button>

            <button
              type="button"
              class="segment-btn ${component.widthMode === 'manual' ? 'active' : ''}"
              data-action="set-gate-width-mode"
              data-component-id="${safe(component.id)}"
              data-value="manual"
            >
              MANUAL
            </button>

          </div>


          ${
            component.widthMode ===
            'manual'
              ? `
                <div
                  class="field-group"
                  style="margin-top:10px;"
                >

                  <label>
                    Manual Steel Frame Width
                  </label>

                  <div class="input-with-unit">

                    <input
                      type="number"
                      inputmode="numeric"
                      min="0"
                      step="1"
                      value="${num(component.manualWidthMm)}"
                      data-component-field="manualWidthMm"
                      data-component-id="${safe(component.id)}"
                    >

                    <span class="input-unit">
                      mm
                    </span>

                  </div>

                </div>
              `
              : `
                <div class="compact-feature-summary">
                  Auto steel frame width: ${mm(width)}
                </div>
              `
          }

        </div>


        <div class="component-subsection">

          <div class="component-subsection-title">
            Operation
          </div>


          <div class="form-grid two-column">

            <div class="field-group">

              <label>
                Hinge Side
              </label>

              <select
                data-component-field="hingeSide"
                data-component-id="${safe(component.id)}"
              >

                <option
                  value="left"
                  ${component.hingeSide === 'left' ? 'selected' : ''}
                >
                  Left
                </option>

                <option
                  value="right"
                  ${component.hingeSide === 'right' ? 'selected' : ''}
                >
                  Right
                </option>

              </select>

            </div>


            <div class="field-group">

              <label>
                Opens
              </label>

              <select
                data-component-field="openDirection"
                data-component-id="${safe(component.id)}"
              >

                <option
                  value="in"
                  ${component.openDirection === 'in' ? 'selected' : ''}
                >
                  In
                </option>

                <option
                  value="out"
                  ${component.openDirection === 'out' ? 'selected' : ''}
                >
                  Out
                </option>

              </select>

            </div>

          </div>

        </div>


        <div class="component-subsection">

          <div class="component-subsection-title">
            Gate Type
          </div>


          <div class="form-grid two-column">

            <div class="field-group">

              <label>
                Relationship
              </label>

              <select
                data-component-field="relationship"
                data-component-id="${safe(component.id)}"
              >

                <option
                  value="single"
                  ${component.relationship === 'single' ? 'selected' : ''}
                >
                  Single / Independent
                </option>

                <option
                  value="double"
                  ${component.relationship === 'double' ? 'selected' : ''}
                >
                  Double Gate
                </option>

              </select>

            </div>


            ${
              component.relationship ===
              'double'
                ? `
                  <div class="field-group required-field complete">

                    <label>
                      Double Pair
                    </label>

                    <select
                      data-action-change="set-double-pair"
                      data-component-id="${safe(component.id)}"
                    >
                      ${availableDoublePairOptions(component)}
                    </select>

                  </div>
                `
                : ''
            }

          </div>

        </div>


        <div class="component-subsection">

          <div class="component-subsection-title">
            Internal Rails
          </div>


          <div class="form-grid two-column">

            <div class="field-group">

              <label>
                Rail Count
              </label>

              <input
                type="number"
                min="0"
                max="${CFG.rails.gate.maximumInternalRailCount}"
                step="1"
                value="${num(component.internalRailCount)}"
                data-component-field="internalRailCount"
                data-component-id="${safe(component.id)}"
              >

            </div>


            <div class="field-group">

              <label>
                Calculated Rail Length
              </label>

              <div class="compact-feature-summary">
                ${mm(
                  railCutLengthForGate(
                    component,
                    width,
                    gateFrameHeightMm()
                  )
                )}
              </div>

            </div>

          </div>

        </div>

      </div>
    `;
  }


  /* =========================================================
     FIXED PANEL POST EDITOR
     ========================================================= */

  function renderPanelPostEditor(
    panel,
    side,
    post
  ) {

    const sideName =
      side === 'left'
        ? 'Left'
        : 'Right';


    const needsHoles =
      post.fixing ===
        'fixed_brick' ||
      post.fixing ===
        'baseplate';


    return `
      <div class="option-panel">

        <div class="option-panel-title">
          ${sideName} Post
        </div>


        <div class="form-grid two-column">

          <div class="field-group required-field complete">

            <label>
              Post Size
            </label>

            <select
              data-panel-post-field="postType"
              data-component-id="${safe(panel.id)}"
              data-panel-side="${side}"
            >
              ${optionsFromObject(
                CFG.steel.posts,
                post.postType
              )}
            </select>

          </div>


          <div class="field-group required-field complete">

            <label>
              Fixing
            </label>

            <select
              data-panel-post-field="fixing"
              data-component-id="${safe(panel.id)}"
              data-panel-side="${side}"
            >
              ${fixingOptions(post.fixing)}
            </select>

          </div>

        </div>


        <div class="component-subsection">

          <div class="component-subsection-title">
            Height
          </div>


          <div class="segmented-control">

            <button
              type="button"
              class="segment-btn ${post.heightMode === 'auto' ? 'active' : ''}"
              data-action="set-panel-post-height-mode"
              data-component-id="${safe(panel.id)}"
              data-panel-side="${side}"
              data-value="auto"
            >
              AUTO
            </button>

            <button
              type="button"
              class="segment-btn ${post.heightMode === 'manual' ? 'active' : ''}"
              data-action="set-panel-post-height-mode"
              data-component-id="${safe(panel.id)}"
              data-panel-side="${side}"
              data-value="manual"
            >
              MANUAL
            </button>

          </div>


          ${
            post.heightMode ===
            'manual'
              ? `
                <div
                  class="field-group"
                  style="margin-top:10px;"
                >

                  <label>
                    Finished Height
                  </label>

                  <div class="input-with-unit">

                    <input
                      type="number"
                      min="0"
                      step="1"
                      value="${num(post.manualFinishedHeightMm)}"
                      data-panel-post-field="manualFinishedHeightMm"
                      data-component-id="${safe(panel.id)}"
                      data-panel-side="${side}"
                    >

                    <span class="input-unit">
                      mm
                    </span>

                  </div>

                </div>
              `
              : ''
          }


          <div class="compact-feature-summary">

            Cut length:
            ${
              post.fixing ===
              'existing_structure'
                ? 'No new post'
                : mm(
                    postCutLengthMm(post)
                  )
            }

          </div>

        </div>


        ${
          needsHoles
            ? renderHoleEditor(
                panel.id,
                side,
                post
              )
            : ''
        }

      </div>
    `;
  }


  /* =========================================================
     FIXED PANEL EDITOR
     ========================================================= */

  function renderFixedPanelEditor(
    component,
    label
  ) {

    return `
      <div
        id="component-card-${safe(component.id)}"
        class="card component-card fixed-panel${component.id === job.selectedComponentId ? ' component-selected' : ''}"
      >

        <div class="component-card-header">

          <div class="component-title-wrap">

            <h2 class="component-title">
              ${safe(label)}
            </h2>

            <div class="component-subtitle">
              Complete panel including two built-in posts
            </div>

          </div>

          ${componentToolbar(component)}

        </div>


        <div
          class="field-group required-field ${num(component.widthMm) > 0 ? 'complete' : ''}"
        >

          <label>
            Overall Fixed Panel Width
          </label>

          <div class="input-with-unit">

            <input
              type="number"
              min="0"
              step="1"
              inputmode="numeric"
              value="${num(component.widthMm)}"
              data-component-field="widthMm"
              data-component-id="${safe(component.id)}"
            >

            <span class="input-unit">
              mm
            </span>

          </div>


          <small class="field-help">
            Includes the two built-in posts. No clearance is deducted around a fixed panel.
          </small>

        </div>


        <div class="component-subsection">

          <div class="component-subsection-title">
            Built-in Posts
          </div>


          <div class="dynamic-options">

            ${renderPanelPostEditor(
              component,
              'left',
              component.leftPost
            )}

            ${renderPanelPostEditor(
              component,
              'right',
              component.rightPost
            )}

          </div>

        </div>


        ${
          job.cladding.direction ===
          'vertical'
            ? `
              <div class="component-subsection">

                <div class="component-subsection-title">
                  Vertical Cladding Rails
                </div>

                <div class="field-group">

                  <label>
                    Total Rail Count
                  </label>

                  <input
                    type="number"
                    min="${CFG.rails.fixedPanel.verticalMinimumRailCount}"
                    max="${CFG.rails.fixedPanel.verticalMaximumRailCount}"
                    step="1"
                    value="${num(component.verticalRailCount)}"
                    data-component-field="verticalRailCount"
                    data-component-id="${safe(component.id)}"
                  >

                  <small class="field-help">
                    Default is top, middle and bottom. Increase where required.
                  </small>

                </div>

              </div>
            `
            : `
              <div class="compact-feature-summary">
                Horizontal cladding: no fixed-panel rails. Cladding spans between the two posts.
              </div>
            `
        }

      </div>
    `;
  }


  function renderComponentEditor() {

    const root =
      $('#component-editor');


    if (
      !job.components.length
    ) {

      root.innerHTML =
        '<div class="card"><div class="empty-state large">Add a Post, Gate or Fixed Panel to begin.</div></div>';

      return;
    }


    const labels =
      componentDisplayLabels();


    root.innerHTML =
      job.components
        .map(
          (component) => {

            if (
              component.type ===
              'post'
            ) {

              return renderPostEditor(
                component,
                labels[
                  component.id
                ]
              );
            }


            if (
              component.type ===
              'gate'
            ) {

              return renderGateEditor(
                component,
                labels[
                  component.id
                ]
              );
            }


            if (
              component.type ===
              'fixedPanel'
            ) {

              return renderFixedPanelEditor(
                component,
                labels[
                  component.id
                ]
              );
            }


            return '';
          }
        )
        .join('');
  }


  /* =========================================================
     LAYOUT SUMMARY
     ========================================================= */

  function renderLayoutSummary() {

    const layout =
      calculation.layout;


    const status =
      $('#layout-width-status');


    if (
      !job.components.length ||
      layout.unrelatedAutoAmbiguous ||
      !layout.valid
    ) {

      status.textContent =
        'Not Confirmed';

      status.className =
        'compact-status error';

    } else {

      status.textContent =
        'Measurements Confirmed';

      status.className =
        'compact-status success';
    }


    $('#layout-calculation-summary')
      .innerHTML = `

        <div class="summary-row">

          <span>
            Cavity
          </span>

          <strong>
            ${mm(layout.cavity)}
          </strong>

        </div>


        <div class="summary-row">

          <span>
            Components
          </span>

          <strong>
            ${mm(
              layout.nonGateWidth +
              layout.gateWidth
            )}
          </strong>

        </div>


        <div class="summary-row">

          <span>
            Gate gaps
          </span>

          <strong>
            ${mm(layout.gaps)}
          </strong>

        </div>


        <div class="summary-row summary-total">

          <span>
            Difference
          </span>

          <strong>
            ${mm(layout.difference)}
          </strong>

        </div>


        ${
          layout.unrelatedAutoAmbiguous
            ? `
              <div
                class="compact-status error"
                style="margin-top:8px;"
              >
                Multiple unrelated Auto gates are ambiguous. Set at least one gate width to Manual.
              </div>
            `
            : ''
        }
      `;
  }


  /* =========================================================
     CLADDING DISPLAY
     ========================================================= */

  function claddingSummaryText() {

    const type =
      job.cladding.type;


    const config =
      CFG.cladding[type];


    if (!config) {
      return 'Select material';
    }


    if (
      type ===
      'galvMesh50'
    ) {
      return (
        'Mesh, 50x50, 4mm'
      );
    }


    if (
      type ===
      'treatedPinePalings'
    ) {

      return [
        'Treated Pine',
        job.cladding.direction ===
        'vertical'
          ? 'Vert'
          : 'Hori'
      ].join(', ');
    }


    if (
      type ===
      'custom'
    ) {

      return [
        job.cladding.custom.name ||
          'Custom',
        job.cladding.direction ===
        'vertical'
          ? 'Vert'
          : 'Hori'
      ].join(', ');
    }


    const finish =
      job.cladding.colour ||
      job.cladding.finish ||
      job.cladding.profile ||
      '';


    return [
      config.shortLabel ||
        config.label,
      finish,
      config.allowDirection ===
      false
        ? ''
        : (
            job.cladding.direction ===
            'vertical'
              ? 'Vert'
              : 'Hori'
          )
    ]
      .filter(Boolean)
      .join(', ');
  }


  function renderDirectionControl() {

    return `
      <div class="field-group required-field complete">

        <label>
          Direction
        </label>

        <select
          data-cladding-field="direction"
        >

          <option
            value="horizontal"
            ${job.cladding.direction === 'horizontal' ? 'selected' : ''}
          >
            Horizontal
          </option>

          <option
            value="vertical"
            ${job.cladding.direction === 'vertical' ? 'selected' : ''}
          >
            Vertical
          </option>

        </select>

      </div>
    `;
  }


  function renderCladdingOptions() {

    const type =
      job.cladding.type;


    const config =
      CFG.cladding[type];


    if (!config) {
      return '';
    }


    let html =
      '';


    if (
      config.allowDirection !==
      false
    ) {

      html +=
        renderDirectionControl();
    }


    if (
      type ===
      'ekodeck'
    ) {

      html += `
        <div
          class="field-group required-field ${job.cladding.colour ? 'complete' : ''}"
        >

          <label>
            Colour
          </label>

          <select
            data-cladding-field="colour"
          >

            <option value="">
              Select colour
            </option>

            ${
              config.colours
                .map(
                  (value) =>
                    `<option value="${safe(value)}" ${value === job.cladding.colour ? 'selected' : ''}>${safe(value)}</option>`
                )
                .join('')
            }

          </select>

        </div>
      `;
    }


    if (
      [
        'cypressPickets',
        'losp90',
        'losp140',
        'merbau90',
        'merbau140'
      ].includes(type)
    ) {

      html += `
        <div
          class="field-group required-field ${job.cladding.finish ? 'complete' : ''}"
        >

          <label>
            Finish
          </label>

          <select
            data-cladding-field="finish"
          >

            <option value="">
              Select finish
            </option>

            ${
              (
                config.finishes ||
                []
              )
                .map(
                  (value) =>
                    `<option value="${safe(value)}" ${value === job.cladding.finish ? 'selected' : ''}>${safe(value)}</option>`
                )
                .join('')
            }

          </select>

        </div>
      `;
    }


    if (
      type ===
      'colorbond'
    ) {

      html += `
        <div
          class="field-group required-field ${job.cladding.profile ? 'complete' : ''}"
        >

          <label>
            Profile
          </label>

          <select
            data-cladding-field="profile"
          >

            <option value="">
              Select profile
            </option>

            ${
              config.profiles
                .map(
                  (value) =>
                    `<option value="${safe(value)}" ${value === job.cladding.profile ? 'selected' : ''}>${safe(value)}</option>`
                )
                .join('')
            }

          </select>

        </div>


        <div class="field-group">

          <label>
            Cladding Labour Rate
          </label>

          <div class="input-with-unit">

            <input
              type="number"
              min="0"
              step="1"
              value="${num(job.cladding.colorbond.labourRatePerM2)}"
              data-cladding-nested="colorbond.labourRatePerM2"
            >

            <span class="input-unit">
              $/m²
            </span>

          </div>

        </div>
      `;
    }


    if (
      type ===
      'treatedPinePalings'
    ) {

      html += `
        <div class="form-grid two-column">

          <div
            class="field-group required-field ${job.cladding.palingLengthMm ? 'complete' : ''}"
          >

            <label>
              Paling Length
            </label>

            <select
              data-cladding-field="palingLengthMm"
            >

              <option value="">
                Select length
              </option>

              ${
                config.lengthsMm
                  .map(
                    (value) =>
                      `<option value="${value}" ${num(job.cladding.palingLengthMm) === value ? 'selected' : ''}>${value}mm</option>`
                  )
                  .join('')
              }

            </select>

          </div>


          <div
            class="field-group required-field ${job.cladding.palingWidthMm ? 'complete' : ''}"
          >

            <label>
              Paling Width
            </label>

            <select
              data-cladding-field="palingWidthMm"
            >

              <option value="">
                Select width
              </option>

              ${
                config.widthsMm
                  .map(
                    (value) =>
                      `<option value="${value}" ${num(job.cladding.palingWidthMm) === value ? 'selected' : ''}>${value}mm</option>`
                  )
                  .join('')
              }

            </select>

          </div>

        </div>


        <div class="option-panel">

          <div class="option-panel-title">
            Capping / Plinth
          </div>


          <div class="switch-row">

            <span class="switch-label">
              Capping
            </span>

            <button
              type="button"
              class="toggle-btn ${job.cladding.capping ? 'on' : ''}"
              data-action="toggle-cladding"
              data-field="capping"
            >
              ${job.cladding.capping ? 'ON' : 'OFF'}
            </button>

          </div>


          <div class="switch-row">

            <span class="switch-label">
              Plinth
            </span>

            <button
              type="button"
              class="toggle-btn ${job.cladding.plinth ? 'on' : ''}"
              data-action="toggle-cladding"
              data-field="plinth"
            >
              ${job.cladding.plinth ? 'ON' : 'OFF'}
            </button>

          </div>


          <div
            class="segmented-control"
            style="margin-top:8px;"
          >

            <button
              type="button"
              class="segment-btn ${job.cladding.accessoryLengthMode === 'auto' ? 'active' : ''}"
              data-action="set-accessory-length-mode"
              data-value="auto"
            >
              AUTO
            </button>

            <button
              type="button"
              class="segment-btn ${job.cladding.accessoryLengthMode === 'manual' ? 'active' : ''}"
              data-action="set-accessory-length-mode"
              data-value="manual"
            >
              MANUAL
            </button>

          </div>


          ${
            job.cladding.accessoryLengthMode ===
            'manual'
              ? `
                <div
                  class="field-group"
                  style="margin-top:10px;"
                >

                  <label>
                    Shared Capping / Plinth Length
                  </label>

                  <div class="input-with-unit">

                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value="${num(job.cladding.accessoryLengthM)}"
                      data-cladding-field="accessoryLengthM"
                    >

                    <span class="input-unit">
                      m
                    </span>

                  </div>

                </div>
              `
              : `
                <div class="compact-feature-summary">
                  Shared calculated length:
                  ${lm(calculation.cladding.detail.autoAccessoryLengthM || 0)}
                </div>
              `
          }

        </div>
      `;
    }


    if (
      type ===
      'custom'
    ) {

      const custom =
        job.cladding.custom;


      html += `
        <div class="field-group">

          <label>
            Material Name
          </label>

          <input
            type="text"
            value="${safe(custom.name)}"
            data-cladding-nested="custom.name"
          >

        </div>


        <div class="field-group">

          <label>
            Costing Method
          </label>

          <select
            data-cladding-nested="custom.costingMode"
          >

            <option
              value="total"
              ${custom.costingMode === 'total' ? 'selected' : ''}
            >
              Total material cost
            </option>

            <option
              value="quantity_unit"
              ${custom.costingMode === 'quantity_unit' ? 'selected' : ''}
            >
              Quantity × unit cost
            </option>

          </select>

        </div>


        ${
          custom.costingMode ===
          'total'
            ? `
              <div class="field-group">

                <label>
                  Total Material Cost
                </label>

                <div class="input-with-unit">

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value="${num(custom.totalCost)}"
                    data-cladding-nested="custom.totalCost"
                  >

                  <span class="input-unit">
                    $
                  </span>

                </div>

              </div>
            `
            : `
              <div class="form-grid two-column">

                <div class="field-group">

                  <label>
                    Quantity
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value="${num(custom.quantity)}"
                    data-cladding-nested="custom.quantity"
                  >

                </div>


                <div class="field-group">

                  <label>
                    Unit Cost
                  </label>

                  <div class="input-with-unit">

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value="${num(custom.unitCost)}"
                      data-cladding-nested="custom.unitCost"
                    >

                    <span class="input-unit">
                      $
                    </span>

                  </div>

                </div>

              </div>
            `
        }


        <div class="field-group">

          <label>
            Price Entered As
          </label>

          <select
            data-cladding-nested="custom.priceIncludesGST"
          >

            <option
              value="true"
              ${custom.priceIncludesGST ? 'selected' : ''}
            >
              Includes GST
            </option>

            <option
              value="false"
              ${!custom.priceIncludesGST ? 'selected' : ''}
            >
              Ex GST
            </option>

          </select>

        </div>


        <div class="field-group">

          <label>
            Cladding Labour Rate
          </label>

          <div class="input-with-unit">

            <input
              type="number"
              min="0"
              step="1"
              value="${num(custom.labourRatePerM2)}"
              data-cladding-nested="custom.labourRatePerM2"
            >

            <span class="input-unit">
              $/m²
            </span>

          </div>

        </div>
      `;
    }


    return html;
  }


  function renderCladding() {

    setInputValue(
      '#cladding-type',
      job.cladding.type
    );


    $('#cladding-summary')
      .textContent =
      claddingSummaryText();


    $('#cladding-options')
      .innerHTML =
      renderCladdingOptions();


    const materialField =
      $('#cladding-material-field');


    if (materialField) {

      materialField
        .classList.toggle(
          'complete',
          !!job.cladding.type
        );
    }


    const cladding =
      calculation.cladding;


    let detail =
      '';


    if (
      cladding.detail
        ?.orderText
    ) {

      detail += `
        <div class="summary-row">

          <span>
            Order
          </span>

          <strong>
            ${safe(cladding.detail.orderText)}
          </strong>

        </div>
      `;
    }


    if (
      cladding.type ===
        'treatedPinePalings' &&
      (
        job.cladding.capping ||
        job.cladding.plinth
      )
    ) {

      detail += `
        <div class="summary-row">

          <span>
            Capping / Plinth Length
          </span>

          <strong>
            ${lm(cladding.detail.accessoryLengthM)}
          </strong>

        </div>
      `;
    }


    $('#cladding-calculation')
      .innerHTML = `

        <div class="summary-row">

          <span>
            Clad Area
          </span>

          <strong>
            ${sqm(cladding.areaM2)}
          </strong>

        </div>

        ${detail}

        <div class="summary-row">

          <span>
            Material Cost EX GST
          </span>

          <strong>
            ${money(cladding.materialCostExGST)}
          </strong>

        </div>


        <div class="summary-row">

          <span>
            Labour Rate
          </span>

          <strong>
            ${money(cladding.labourRatePerM2)}/m²
          </strong>

        </div>


        <div class="summary-row summary-total">

          <span>
            Cladding Labour EX GST
          </span>

          <strong>
            ${money(cladding.labourCostExGST)}
          </strong>

        </div>
      `;
  }


  /* =========================================================
     POWDER RENDER
     ========================================================= */

  function renderPowder() {

    $('#powder-yes-btn')
      .classList.toggle(
        'active',
        job.powder.enabled
      );


    $('#powder-no-btn')
      .classList.toggle(
        'active',
        !job.powder.enabled
      );


    $('#powder-options')
      .classList.toggle(
        'hidden',
        !job.powder.enabled
      );


    const select =
      $('#powder-colour');


    if (
      select &&
      select.options.length <=
        1
    ) {

      select.innerHTML =
        '<option value="">Select colour</option>' +
        CFG.colours
          .map(
            (colour) =>
              `<option value="${safe(colour)}">${safe(colour)}</option>`
          )
          .join('');
    }


    setInputValue(
      '#powder-colour',
      job.powder.colour
    );


    const group =
      select?.closest(
        '.required-field'
      );


    if (group) {

      group.classList.toggle(
        'complete',
        !!job.powder.colour
      );
    }


    const powder =
      calculation.powder;


    $('#powder-summary')
      .textContent =
      job.powder.enabled
        ? `PC, ${job.powder.colour || 'Select colour'}, ${money(powder.totalExGST)}`
        : `No powder coating, touch-up ${money(powder.touchUpExGST)}`;


    $('#powder-calculation')
      .innerHTML =
      job.powder.enabled
        ? `
          <div class="summary-row">

            <span>
              Posts
            </span>

            <strong>
              ${money(powder.postsExGST)}
            </strong>

          </div>


          <div class="summary-row">

            <span>
              Frames
            </span>

            <strong>
              ${money(powder.framesExGST)}
            </strong>

          </div>


          <div class="summary-row">

            <span>
              Travel
            </span>

            <strong>
              ${money(powder.travelExGST)}
            </strong>

          </div>


          <div class="summary-row summary-total">

            <span>
              Powder Coating EX GST
            </span>

            <strong>
              ${money(powder.totalExGST)}
            </strong>

          </div>
        `
        : `
          <div class="summary-row">

            <span>
              Duragalv Touch-up
            </span>

            <strong>
              ${money(powder.touchUpExGST)}
            </strong>

          </div>


          <div class="summary-row summary-total">

            <span>
              Finish EX GST
            </span>

            <strong>
              ${money(powder.totalExGST)}
            </strong>

          </div>
        `;
  }


  /* =========================================================
     MATERIALS RENDER
     ========================================================= */

  function renderMaterials() {

    const steelItems = [

      ...calculation.posts
        .steelOrders
        .map(
          (order) => ({

            title:
              order.label,

            value:
              `${order.stockQty} × ${order.stockLengthM}m stock (${round(order.lengthM, 2)}m required)`
          })
        ),


      ...calculation.frames
        .steelOrders
        .map(
          (order) => ({

            title:
              order.label,

            value:
              `${order.stockQty} × ${order.stockLengthM}m stock (${round(order.lengthM, 2)}m required)`
          })
        )
    ];


    $('#steel-materials-list')
      .innerHTML =
      steelItems.length
        ? steelItems
            .map(
              (item) => `
                <div class="material-item">

                  <div class="material-item-title">
                    ${safe(item.title)}
                  </div>

                  <div class="material-item-value">
                    ${safe(item.value)}
                  </div>

                </div>
              `
            )
            .join('')
        : '<div class="empty-state">No steel calculated yet.</div>';


    const cladding =
      calculation.cladding;


    $('#cladding-materials-list')
      .innerHTML = `

        <div class="material-item">

          <div class="material-item-title">
            ${safe(cladding.config?.label || 'Cladding')}
          </div>

          <div class="material-item-value">
            ${safe(cladding.detail?.orderText || `${round(cladding.areaM2, 2)} m²`)}
          </div>

        </div>


        <div class="material-item">

          <div class="material-item-title">
            Clad Area
          </div>

          <div class="material-item-value">
            ${sqm(cladding.areaM2)}
          </div>

        </div>
      `;


    const required =
      [];


    calculation.posts
      .steelOrders
      .forEach(
        (order) => {

          required.push([
            order.label,
            `${order.stockQty} × ${order.stockLengthM}m`
          ]);
        }
      );


    calculation.frames
      .steelOrders
      .forEach(
        (order) => {

          required.push([
            order.label,
            `${order.stockQty} × ${order.stockLengthM}m`
          ]);
        }
      );


    if (
      cladding.detail
        ?.orderText
    ) {

      required.push([
        cladding.config
          ?.label ||
          'Cladding',
        cladding.detail
          .orderText
      ]);
    }


    if (
      calculation.posts
        .dynabolts
    ) {

      required.push([
        CFG.fixings
          .dynabolt
          .label,
        `${calculation.posts.dynabolts}`
      ]);
    }


    if (
      calculation.frames
        .hingeSets
    ) {

      required.push([
        CFG.hardware
          .hinges
          .lockout
          .label,
        `${calculation.frames.hingeSets} set${calculation.frames.hingeSets === 1 ? '' : 's'}`
      ]);
    }


    if (
      calculation.frames
        .hingeSets
    ) {

      required.push([
        'Gate latch',
        `${calculation.frames.hingeSets}`
      ]);
    }


    if (
      calculation.posts
        .concreteBags
    ) {

      required.push([
        'Concrete',
        `${calculation.posts.concreteBags} bags`
      ]);
    }


    if (
      calculation.posts
        .concretePosts &&
      CFG.concrete
        .addSpoilRemovalRequirement
    ) {

      required.push([
        'Spoil removal',
        `${calculation.posts.concretePosts} concreted post${calculation.posts.concretePosts === 1 ? '' : 's'}`
      ]);
    }


    if (
      calculation.posts
        .baseplates
    ) {

      required.push([
        'Baseplated post allowance',
        `${calculation.posts.baseplates}`
      ]);
    }


    if (
      cladding.type ===
      'treatedPinePalings'
    ) {

      if (
        job.cladding.capping
      ) {

        required.push([
          'Capping',
          lm(
            cladding.detail
              .accessoryLengthM
          )
        ]);
      }


      if (
        job.cladding.plinth
      ) {

        required.push([
          'Plinth',
          lm(
            cladding.detail
              .accessoryLengthM
          )
        ]);
      }
    }


    if (
      cladding.type ===
      'galvMesh50'
    ) {

      required.push([
        'Mesh sheets',
        cladding.detail
          .orderText
      ]);
    }


    $('#required-materials-list')
      .innerHTML =
      required.length
        ? required
            .map(
              ([
                name,
                quantity
              ]) => `
                <div class="required-material-row">

                  <span>
                    ${safe(name)}
                  </span>

                  <strong>
                    ${safe(quantity)}
                  </strong>

                </div>
              `
            )
            .join('')
        : '<div class="empty-state">Required materials will appear here.</div>';


    const cuts =
      [];


    calculation.posts
      .cutList
      .forEach(
        (item) => {

          cuts.push([

            item.label,

            item.cutLengthMm
              ? `${postConfig(item.postType).label}: ${Math.round(item.cutLengthMm)}mm${item.holes.length ? ` | Holes: ${item.holes.join(', ')}mm` : ''}`
              : 'Existing structure / no new post'
          ]);
        }
      );


    calculation.frames
      .cutList
      .forEach(
        (item) => {

          if (
            item.type ===
            'gate'
          ) {

            cuts.push([

              `${item.label} (${item.hingeSide === 'left' ? 'L' : 'R'})`,

              `${Math.round(item.widthMm)} × ${Math.round(item.heightMm)}mm | ${item.railCount} ${item.railOrientation} rail${item.railCount === 1 ? '' : 's'} @ ${Math.round(item.railLengthMm)}mm`
            ]);

          } else {

            cuts.push([

              item.label,

              `${Math.round(item.widthMm)} × ${Math.round(item.heightMm)}mm | ${item.railCount ? `${item.railCount} rails @ ${Math.round(item.railLengthMm)}mm` : 'No rails'}`
            ]);
          }
        }
      );


    $('#fabrication-cut-list')
      .innerHTML =
      cuts.length
        ? cuts
            .map(
              ([
                name,
                detail
              ]) => `
                <div class="cut-list-row">

                  <span>
                    ${safe(name)}
                  </span>

                  <strong>
                    ${safe(detail)}
                  </strong>

                </div>
              `
            )
            .join('')
        : '<div class="empty-state">Fabrication dimensions will appear here.</div>';
  }


  /* =========================================================
     LABOUR RENDER
     ========================================================= */

  function renderLabour() {

    const labour =
      calculation.labour;


    $('#labour-fabrication-auto')
      .textContent =
      formatHours(
        labour.fabricationAutoHours
      );


    setInputValue(
      '#labour-fabrication-additional',
      job.labour
        .additionalFabricationHours
    );


    $('#labour-fabrication-total')
      .textContent =
      formatHours(
        labour.fabricationTotalHours
      );


    $('#labour-install-auto')
      .textContent =
      formatHours(
        labour.installationAutoHours
      );


    setInputValue(
      '#labour-install-additional',
      job.labour
        .additionalInstallHours
    );


    $('#labour-install-total')
      .textContent =
      formatHours(
        labour.installationTotalHours
      );


    $('#fabrication-labour-breakdown')
      .innerHTML = `

        <div class="labour-breakdown-row">

          <span>
            Gate fabrication
          </span>

          <strong>
            ${formatHours(calculation.frames.gateFabricationHours)}
          </strong>

        </div>


        <div class="labour-breakdown-row">

          <span>
            Fixed panel fabrication
          </span>

          <strong>
            ${formatHours(calculation.frames.panelFabricationHours)}
          </strong>

        </div>


        <div class="labour-breakdown-row">

          <span>
            Posts / drilling
          </span>

          <strong>
            ${formatHours(calculation.posts.fabricationHours)}
          </strong>

        </div>
      `;


    $('#installation-labour-breakdown')
      .innerHTML = `

        <div class="labour-breakdown-row">

          <span>
            Hang gates / fit latches
          </span>

          <strong>
            ${formatHours(calculation.frames.gateInstallHours)}
          </strong>

        </div>


        <div class="labour-breakdown-row">

          <span>
            Fixed panel installation
          </span>

          <strong>
            ${formatHours(calculation.frames.panelInstallHours)}
          </strong>

        </div>


        <div class="labour-breakdown-row">

          <span>
            Post installation
          </span>

          <strong>
            ${formatHours(calculation.posts.installationHours)}
          </strong>

        </div>
      `;


    $('#cladding-labour-summary')
      .innerHTML = `

        <div class="summary-row">

          <span>
            Area
          </span>

          <strong>
            ${sqm(calculation.cladding.areaM2)}
          </strong>

        </div>


        <div class="summary-row">

          <span>
            Rate
          </span>

          <strong>
            ${money(calculation.cladding.labourRatePerM2)}/m²
          </strong>

        </div>


        <div class="summary-row summary-total">

          <span>
            Cladding Labour
          </span>

          <strong>
            ${money(calculation.cladding.labourCostExGST)}
          </strong>

        </div>
      `;


    const totalHoursEquivalent =
      labour.fabricationTotalHours +
      labour.installationTotalHours +
      (
        calculation.cladding
          .labourCostExGST /
        CFG.business
          .labourRate
      );


    $('#total-labour-hours')
      .textContent =
      `${round(totalHoursEquivalent, 2).toFixed(2)} hours equivalent`;


    $('#total-labour-cost')
      .textContent =
      money(
        labour.totalCostExGST
      );
  }


  /* =========================================================
     COSTING RENDER
     ========================================================= */

  function renderCosting() {

    const costing =
      calculation.costing;


    $('#cost-materials')
      .textContent =
      money(
        costing.materialsBeforeMarkupExGST
      );


    $('#cost-labour')
      .textContent =
      money(
        costing.labourCostExGST
      );


    $('#cost-travel')
      .textContent =
      money(
        costing.travelExGST
      );


    $('#cost-finish')
      .textContent =
      money(
        costing.finishExGST
      );


    $('#cost-markup')
      .textContent =
      money(
        costing.materialMarkupExGST
      );


    $('#cost-ex-gst')
      .textContent =
      money(
        costing.sellExGST
      );


    $('#cost-gst')
      .textContent =
      money(
        costing.autoIncGSTUnrounded -
        costing.sellExGST
      );


    const roundingAmount =
      costing.autoIncGST -
      costing.autoIncGSTUnrounded;


    const roundingElement =
      $('#cost-rounding');


    if (
      roundingElement
    ) {

      roundingElement
        .textContent =
        money(
          roundingAmount
        );
    }


    $('#cost-auto-quote')
      .textContent =
      money(
        costing.autoIncGST
      );


    $('#costing-quote-mode')
      .textContent =
      job.quote.mode ===
      'manual'
        ? 'Manual'
        : 'Auto';


    $('#costing-profit')
      .textContent =
      money(
        costing.profitExGST
      );


    $('#costing-effective-rate')
      .textContent =
      money(
        costing.effectiveRate
      );


    $('#costing-cavity-area')
      .textContent =
      sqm(
        costing.cavityAreaM2
      );
  }


  /* =========================================================
     CLIENT
     ========================================================= */

  function renderClient() {

    setInputValue(
      '#client-name',
      job.client.name
    );


    setInputValue(
      '#client-address',
      job.client.address
    );


    setInputValue(
      '#client-project-number',
      job.client
        .projectNumber
    );


    setInputValue(
      '#client-mobile',
      job.client.mobile
    );


    setInputValue(
      '#client-email',
      job.client.email
    );


    ensureClientNotesField();


    setInputValue(
      '#client-notes',
      job.client.notes ||
      ''
    );


    const includeNotes =
      $('#client-notes-include');


    if (includeNotes) {

      includeNotes.checked =
        Boolean(
          job.client
            .includeNotesInQuote
        );
    }
  }


  function ensureClientNotesField() {

    if (
      $('#client-notes-wrap')
    ) {
      return;
    }


    const email =
      $('#client-email');


    if (!email) {
      return;
    }


    const anchor =
      email.closest(
        '.field-group'
      ) ||
      email.parentElement;


    const wrap =
      document.createElement(
        'div'
      );


    wrap.id =
      'client-notes-wrap';


    wrap.className =
      'field-group';


    wrap.style.cssText =
      'margin-top:12px;grid-column:1/-1;';


    wrap.innerHTML = `

      <label for="client-notes">
        Notes
      </label>

      <textarea
        id="client-notes"
        data-state-path="client.notes"
        rows="1"
        placeholder="Add job note..."
        style="width:100%;min-height:42px;resize:none;overflow:hidden;box-sizing:border-box;"
      ></textarea>


      <label
        style="display:flex;align-items:center;gap:8px;margin-top:8px;cursor:pointer;font-weight:600;"
      >

        <input
          id="client-notes-include"
          type="checkbox"
          data-state-path="client.includeNotesInQuote"
        >

        Include in client quote

      </label>
    `;


    anchor.insertAdjacentElement(
      'afterend',
      wrap
    );


    const notes =
      $('#client-notes');


    notes.addEventListener(
      'focus',
      () => {

        notes.rows =
          3;

        notes.style.resize =
          'vertical';

        notes.style.overflow =
          'auto';
      }
    );


    notes.addEventListener(
      'blur',
      () => {

        notes.rows =
          1;

        notes.style.resize =
          'none';

        notes.style.overflow =
          'hidden';
      }
    );
  }


  /* =========================================================
     CLIENT QUOTE WORDING
     ========================================================= */

  function fullDirectionWord() {

    return (
      job.cladding.direction ===
      'vertical'
        ? 'vertically'
        : 'horizontally'
    );
  }


  function claddingClientDescription() {

    const type =
      job.cladding.type;


    const config =
      CFG.cladding[type];


    if (!config) {
      return (
        'selected cladding'
      );
    }


    if (
      type ===
      'galvMesh50'
    ) {

      return (
        '50×50mm galvanised mesh with 4.0mm wire'
      );
    }


    if (
      type ===
      'treatedPinePalings'
    ) {

      const size =
        job.cladding
          .palingWidthMm &&
        job.cladding
          .palingLengthMm
          ? ` ${job.cladding.palingWidthMm}×${job.cladding.palingLengthMm}mm`
          : '';


      return (
        `treated pine${size} palings`
      );
    }


    if (
      type ===
      'custom'
    ) {

      return (
        job.cladding.custom
          .name ||
        'custom cladding'
      );
    }


    if (
      type ===
      'colorbond'
    ) {

      const profile =
        job.cladding.profile ||
        'Colorbond cladding';


      return profile;
    }


    const extras =
      [];


    if (
      job.cladding.colour
    ) {

      extras.push(
        job.cladding.colour
      );
    }


    if (
      job.cladding.finish
    ) {

      extras.push(
        job.cladding.finish
      );
    }


    return (
      `${config.label}${
        extras.length
          ? `, ${extras.join(', ')}`
          : ''
      }`
    );
  }


  function referenceText() {

    if (
      job.site
        .referenceDirection ===
      'other'
    ) {

      return (
        job.site
          .referenceCustom ||
        'the nominated viewing direction'
      );
    }


    return (
      CFG.referenceDirections[
        job.site
          .referenceDirection
      ] ||
      CFG.referenceDirections
        .streetToProperty
    );
  }


  function postFixingClientText(
    post
  ) {

    const fallback = {

      fixed_brick:
        'fixed to existing brickwork',

      concrete_house:
        'concreted into the ground beside the house',

      concrete_floating:
        'concreted into the ground',

      baseplate:
        'baseplate fixed',

      existing_structure:
        'existing structure'
    };


    return (
      fallback[
        post.fixing
      ] ||
      CFG.postFixings[
        post.fixing
      ]?.label ||
      'installed to suit the existing structure'
    );
  }


  function postClientLines() {

    return collectPhysicalPosts()
      .filter(
        (item) =>
          item.post.fixing !==
          'existing_structure'
      )
      .map(
        (item) => {

          const label =
            item.side
              ? `${item.ownerLabel} ${item.side.toLowerCase()} post`
              : item.ownerLabel;


          return (
            `${label}: ${postFixingClientText(item.post)}.`
          );
        }
      );
  }


  function latchClientText(
    latchType
  ) {

    const item =
      CFG.hardware.latches[
        latchType
      ] ||
      CFG.hardware.latches
        .ddDualKey;


    if (
      latchType ===
      'ddDualKey'
    ) {

      return (
        'D&D dual-way key-lockable latch, supplied with 2 keys'
      );
    }


    return String(
      item?.label ||
      'gate latch'
    ).replace(/\.$/, '');
  }


  function gateClientLines() {

    const labels =
      componentDisplayLabels();


    return job.components
      .filter(
        (component) =>
          component.type ===
          'gate'
      )
      .flatMap(
        (gate) => {

          const hinge =
            gate.hingeSide ===
            'left'
              ? 'left'
              : 'right';


          const latchSide =
            hinge ===
            'left'
              ? 'right'
              : 'left';


          const opening =
            gate.openDirection ===
            'in'
              ? 'inward'
              : 'outward';


          return [

            `${labels[gate.id]}: hinged on the ${hinge}, latch on the ${latchSide}, opening ${opening}.`,

            `Fit ${latchClientText(gate.latchType)}.`
          ];
        }
      );
  }


  function claddingFabricationText() {

    const description =
      claddingClientDescription();


    if (
      job.cladding.type ===
      'galvMesh50'
    ) {

      return (
        `Fit ${description} to the steel frame.`
      );
    }


    if (
      job.cladding.type ===
      'colorbond'
    ) {

      return (
        `Install ${description} ${fullDirectionWord()} to suit the project.`
      );
    }


    return (
      `Install ${description} ${fullDirectionWord()}.`
    );
  }


  function quoteTexts() {

    const gates =
      job.components.filter(
        (component) =>
          component.type ===
          'gate'
      );


    const panels =
      job.components.filter(
        (component) =>
          component.type ===
          'fixedPanel'
      );


    const cavityWidth =
      Math.round(
        num(
          job.site
            .cavityWidthMm
        )
      );


    const finishedHeight =
      Math.round(
        num(
          job.site
            .finishedHeightMm
        )
      );


    const cladding =
      claddingClientDescription();


    const pairIds =
      new Set(
        gates
          .filter(
            (gate) =>
              gate.relationship ===
                'double' &&
              gate.doublePairId
          )
          .map(
            (gate) =>
              gate.doublePairId
          )
      );


    const isOneDoubleGate =
      gates.length ===
        2 &&
      pairIds.size ===
        1 &&
      gates.every(
        (gate) =>
          gate.relationship ===
          'double'
      );


    let projectType =
      'gate project';


    if (
      isOneDoubleGate
    ) {

      projectType =
        'double gate';

    } else if (
      gates.length ===
        1 &&
      !panels.length
    ) {

      projectType =
        'gate';

    } else if (
      !gates.length &&
      panels.length ===
        1
    ) {

      projectType =
        'fixed panel';

    } else if (
      !gates.length &&
      panels.length >
        1
    ) {

      projectType =
        'fixed panel project';
    }


    const project =
      `Supply, fabricate and install a custom steel-framed ${projectType} for the measured cavity approximately ${cavityWidth}mm wide × ${finishedHeight}mm high, with ${cladding}.`;


    const fabricationLines =
      [];


    if (
      gates.length
    ) {

      fabricationLines.push(
        gates.length === 1
          ? `Fabricate custom steel gate frame to suit the ${cavityWidth}mm wide opening.`
          : `Fabricate ${gates.length} custom steel gate frames to suit the ${cavityWidth}mm wide opening.`
      );
    }


    if (
      panels.length
    ) {

      fabricationLines.push(
        panels.length === 1
          ? 'Fabricate fixed panel to suit the measured opening.'
          : `Fabricate ${panels.length} fixed panels to suit the measured opening.`
      );
    }


    fabricationLines.push(
      ...postClientLines()
    );


    fabricationLines.push(
      claddingFabricationText()
    );


    const installationLines = [

      `As viewed from ${referenceText()}:`
    ];


    installationLines.push(
      ...gateClientLines()
    );


    if (
      gates.length
    ) {

      installationLines.push(
        gates.length === 1
          ? 'Fit and adjust heavy-duty galvanised lock-out hinges.'
          : 'Fit and adjust heavy-duty galvanised lock-out hinges to each gate.'
      );
    }


    if (
      panels.length
    ) {

      installationLines.push(
        panels.length === 1
          ? 'Install fixed panel to the nominated post arrangement.'
          : 'Install fixed panels to the nominated post arrangements.'
      );
    }


    const finish =
      job.powder.enabled
        ? `Steel posts and gate/fixed-panel steelwork powder coated in ${job.powder.colour || 'the selected colour'}.\nAllow up to 2 weeks for powder-coating.`
        : '';


    return {

      project,

      fabrication:
        fabricationLines.join(
          '\n'
        ),

      installation:
        installationLines.join(
          '\n'
        ),

      finish
    };
  }


  /* =========================================================
     EMAIL
     ========================================================= */

  function emailContent(
    texts
  ) {

    const reference =
      job.client
        .projectNumber;


    const firstName =
      job.client.name
        ? job.client.name
            .trim()
            .split(/\s+/)[0]
        : '';


    const greeting =
      firstName
        ? `Hi ${firstName},`
        : 'Hi,';


    const subject =
      `JTLA Gates Quote ${reference}`;


    const finishSection =
      texts.finish
        ? `
FINISH
${texts.finish}
`
        : '';


    const notes =
      String(
        job.client.notes ||
        ''
      ).trim();


    const notesSection =
      job.client
        .includeNotesInQuote &&
      notes
        ? `
NOTES
${notes}
`
        : '';


    const body =
`${greeting}

Thank you for the opportunity to quote your gate project.

PROJECT DESCRIPTION
${texts.project}

FABRICATION
${texts.fabrication}

INSTALLATION
${texts.installation}
${finishSection}
PRICE
Total ex GST: ${money(calculation.costing.finalExGST)}
GST: ${money(calculation.costing.finalGST)}
Total inc GST: ${money(calculation.costing.finalIncGST)}
${notesSection}
TERMS
${CFG.quote.depositText}
${CFG.quote.acceptanceText}

BANK TRANSFER
Account Name: ${CFG.bank.accountName}
BSB: ${CFG.bank.bsb}
Account Number: ${CFG.bank.accountNumber}

Thank you,
Jody`;


    return {

      subject,

      body
    };
  }


  function emailHtml(
    texts
  ) {

    const notes =
      String(
        job.client.notes ||
        ''
      ).trim();


    const escapeLines =
      (value) =>
        safe(value)
          .replace(
            /\n/g,
            '<br>'
          );


    const firstName =
      job.client.name
        ? job.client.name
            .trim()
            .split(/\s+/)[0]
        : '';


    const greeting =
      firstName
        ? `Hi ${safe(firstName)},`
        : 'Hi,';


    const finishHtml =
      texts.finish
        ? `
          <p>
            <strong>FINISH</strong><br>
            ${escapeLines(texts.finish)}
          </p>
        `
        : '';


    const notesHtml =
      job.client
        .includeNotesInQuote &&
      notes
        ? `
          <p>
            <strong>NOTES</strong><br>
            ${escapeLines(notes)}
          </p>
        `
        : '';


    return `
      <div
        style="
          font-family:Arial,sans-serif;
          font-size:14px;
          line-height:1.45;
          color:#111;
        "
      >

        <p>
          ${greeting}
        </p>

        <p>
          Thank you for the opportunity to quote your gate project.
        </p>


        <p>
          <strong>PROJECT DESCRIPTION</strong><br>
          ${escapeLines(texts.project)}
        </p>


        <p>
          <strong>FABRICATION</strong><br>
          ${escapeLines(texts.fabrication)}
        </p>


        <p>
          <strong>INSTALLATION</strong><br>
          ${escapeLines(texts.installation)}
        </p>


        ${finishHtml}


        <p>
          <strong>PRICE</strong>
        </p>


        <table
          style="
            border-collapse:collapse;
            min-width:320px;
          "
        >

          <tr>

            <td
              style="
                padding:4px 30px 4px 0;
              "
            >
              Total ex GST
            </td>

            <td
              style="
                padding:4px 0;
                text-align:right;
              "
            >
              ${safe(money(calculation.costing.finalExGST))}
            </td>

          </tr>


          <tr>

            <td
              style="
                padding:4px 30px 4px 0;
              "
            >
              GST
            </td>

            <td
              style="
                padding:4px 0;
                text-align:right;
              "
            >
              ${safe(money(calculation.costing.finalGST))}
            </td>

          </tr>


          <tr>

            <td
              style="
                padding:6px 30px 4px 0;
                border-top:1px solid #777;
              "
            >
              <strong>
                Total inc GST
              </strong>
            </td>

            <td
              style="
                padding:6px 0 4px;
                border-top:1px solid #777;
                text-align:right;
              "
            >
              <strong>
                ${safe(money(calculation.costing.finalIncGST))}
              </strong>
            </td>

          </tr>

        </table>


        ${notesHtml}


        <p>
          <strong>TERMS</strong><br>
          ${escapeLines(CFG.quote.depositText)}<br>
          ${escapeLines(CFG.quote.acceptanceText)}
        </p>


        <p>
          <strong>BANK TRANSFER</strong><br>
          Account Name: ${safe(CFG.bank.accountName)}<br>
          BSB: ${safe(CFG.bank.bsb)}<br>
          Account Number: ${safe(CFG.bank.accountNumber)}
        </p>


        <p>
          Thank you,<br>
          Jody
        </p>

      </div>
    `;
  }


  async function copyEmailRich() {

    const texts =
      quoteTexts();


    const email =
      emailContent(texts);


    const plain =
      `${email.subject}\n\n${email.body}`;


    try {

      if (
        navigator.clipboard
          ?.write &&
        window.ClipboardItem
      ) {

        const html =
          `<div><strong>${safe(email.subject)}</strong></div><br>${emailHtml(texts)}`;


        await navigator.clipboard.write([
          new ClipboardItem({

            'text/plain':
              new Blob(
                [plain],
                {
                  type:
                    'text/plain'
                }
              ),

            'text/html':
              new Blob(
                [html],
                {
                  type:
                    'text/html'
                }
              )
          })
        ]);


        toast(
          'Email copied'
        );


        return;
      }

    } catch (error) {

      console.warn(
        'Rich email copy unavailable; using plain text.',
        error
      );
    }


    await copyText(
      plain,
      'Email copied'
    );
  }


  /* =========================================================
     SMS
     ========================================================= */

  function smsContent() {

    const reference =
      job.client
        .projectNumber;


    const amount =
      money(
        calculation.costing
          .finalIncGST
      );


    const firstName =
      job.client.name
        ? job.client.name
            .trim()
            .split(/\s+/)[0]
        : '';


    const greeting =
      firstName
        ? `Hi ${firstName},`
        : 'Hi,';


    const cavity =
      Math.round(
        num(
          job.site
            .cavityWidthMm
        )
      );


    const height =
      Math.round(
        num(
          job.site
            .finishedHeightMm
        )
      );


    const gates =
      job.components
        .filter(
          (component) =>
            component.type ===
            'gate'
        )
        .length;


    const panels =
      job.components
        .filter(
          (component) =>
            component.type ===
            'fixedPanel'
        )
        .length;


    let work =
      'custom gate';


    if (
      gates > 1
    ) {
      work =
        'custom gates';
    }


    if (
      !gates &&
      panels === 1
    ) {
      work =
        'custom fixed panel';
    }


    if (
      !gates &&
      panels > 1
    ) {
      work =
        'custom fixed panels';
    }


    if (
      gates &&
      panels
    ) {
      work =
        'custom gate and fixed panel works';
    }


    let claddingName =
      claddingClientDescription();


    if (
      job.cladding.type ===
      'treatedPinePalings'
    ) {
      claddingName =
        'treated pine';
    }


    if (
      job.cladding.type ===
      'ekodeck'
    ) {
      claddingName =
        'Ekodeck screening';
    }


    if (
      job.cladding.type ===
      'galvMesh50'
    ) {
      claddingName =
        'galvanised mesh';
    }


    return `${greeting}

JTLA Gates quote ${reference}:
Supply and install ${work} with ${claddingName}.
${cavity}mm wide cavity, finished height ${height}mm.
Total ${amount} inc. GST.

Thank you,
Jody`;
  }


  /* =========================================================
     QUOTE RENDER
     ========================================================= */

  function renderQuote() {

    const costing =
      calculation.costing;


    const manual =
      job.quote.mode ===
      'manual';


    $('#quote-mode-display')
      .textContent =
      manual
        ? 'Manual'
        : 'Auto';


    $('#quote-reset-auto-btn')
      .classList.toggle(
        'hidden',
        !manual
      );


    setInputValue(
      '#quote-final-amount',
      round(
        costing.finalIncGST,
        2
      )
    );


    $('#quote-profit')
      .textContent =
      money(
        costing.profitExGST
      );


    $('#quote-effective-rate')
      .textContent =
      money(
        costing.effectiveRate
      );


    const texts =
      quoteTexts();


    $('#finished-quote-reference')
      .textContent =
      `Quote ${job.client.projectNumber}`;


    $('#finished-quote-client')
      .textContent =
      job.client.name ||
      'Client';


    $('#quote-project-description')
      .textContent =
      texts.project;


    $('#quote-fabrication')
      .textContent =
      texts.fabrication;


    $('#quote-installation')
      .textContent =
      texts.installation;


    /*
      IMPORTANT:
      Hide ONLY the individual Finish quote-section.
      Never hide section-quote itself.
    */

    const quoteFinish =
      $('#quote-finish');


    if (quoteFinish) {

      quoteFinish.textContent =
        texts.finish ||
        '';


      const finishBlock =
        quoteFinish.closest(
          '.quote-section'
        );


      if (finishBlock) {

        finishBlock.classList.toggle(
          'hidden',
          !texts.finish
        );
      }
    }


    $('#quote-price-ex-gst')
      .textContent =
      money(
        costing.finalExGST
      );


    $('#quote-price-gst')
      .textContent =
      money(
        costing.finalGST
      );


    $('#quote-price-inc-gst')
      .textContent =
      money(
        costing.finalIncGST
      );


    $('#quote-terms')
      .textContent =
      CFG.quote.depositText;


    $('#quote-bank-details')
      .innerHTML = `

        <div>
          ${safe(CFG.bank.accountName)}
        </div>

        <div>
          BSB: ${safe(CFG.bank.bsb)}
        </div>

        <div>
          Account: ${safe(CFG.bank.accountNumber)}
        </div>
      `;


    const email =
      emailContent(texts);


    $('#email-subject')
      .value =
      email.subject;


    $('#email-body')
      .value =
      email.body;


    $('#sms-body')
      .value =
      smsContent();
  }


  /* =========================================================
     SAVED JOBS
     ========================================================= */

  function saveCurrentJob() {

    const jobs =
      getSavedJobsRaw();


    const snapshot =
      deepClone(job);


    snapshot.savedAt =
      new Date()
        .toISOString();


    const index =
      jobs.findIndex(
        (savedJob) =>
          savedJob.id ===
            snapshot.id ||
          savedJob?.client
            ?.projectNumber ===
            snapshot.client
              .projectNumber
      );


    if (
      index >= 0
    ) {

      jobs[index] =
        snapshot;

    } else {

      jobs.push(
        snapshot
      );
    }


    localStorage.setItem(
      CFG.storage.savedJobsKey,
      JSON.stringify(jobs)
    );


    toast(
      'Job saved'
    );


    renderSavedJobs();
  }


  function renderSavedJobs() {

    const root =
      $('#saved-jobs-list');


    const jobs =
      getSavedJobsRaw()
        .sort(
          (
            first,
            second
          ) =>
            String(
              second.updatedAt ||
              second.savedAt
            ).localeCompare(
              String(
                first.updatedAt ||
                first.savedAt
              )
            )
        );


    if (
      !jobs.length
    ) {

      root.innerHTML =
        '<div class="empty-state large">No saved jobs yet.</div>';

      return;
    }


    root.innerHTML =
      jobs
        .map(
          (savedJob) => `

            <div class="saved-job-card">

              <div class="saved-job-info">

                <div class="saved-job-name">

                  ${safe(savedJob.client?.projectNumber || '')}
                  ·
                  ${safe(savedJob.client?.name || 'Unnamed client')}

                </div>

                <div class="saved-job-meta">

                  ${safe(savedJob.client?.address || 'No address')}
                  ·
                  ${safe(savedJob.client?.mobile || '')}

                </div>

              </div>


              <div class="saved-job-actions">

                <button
                  type="button"
                  data-action="open-saved-job"
                  data-job-id="${safe(savedJob.id)}"
                >
                  Open
                </button>

                <button
                  type="button"
                  class="delete"
                  data-action="delete-saved-job"
                  data-job-id="${safe(savedJob.id)}"
                >
                  Delete
                </button>

              </div>

            </div>
          `
        )
        .join('');
  }


  function openSavedJob(
    jobId
  ) {

    const jobs =
      getSavedJobsRaw();


    const found =
      jobs.find(
        (savedJob) =>
          savedJob.id ===
          jobId
      );


    if (!found) {
      return;
    }


    job =
      hydrateJob(found);


    undoStack =
      [];


    autosave();

    renderAll();


    toast(
      'Saved job opened'
    );
  }


  function deleteSavedJob(
    jobId
  ) {

    const jobs =
      getSavedJobsRaw()
        .filter(
          (savedJob) =>
            savedJob.id !==
            jobId
        );


    localStorage.setItem(
      CFG.storage.savedJobsKey,
      JSON.stringify(jobs)
    );


    renderSavedJobs();


    toast(
      'Saved job deleted'
    );
  }


  function startNewJob() {

    pushUndo();


    job =
      createNewJob();


    autosave();

    renderAll();


    toast(
      'New job created'
    );
  }


  /* =========================================================
     TOAST / CONFIRM / COPY
     ========================================================= */

  function toast(message) {

    const element =
      $('#toast');


    if (!element) {
      return;
    }


    element.textContent =
      message;


    element.classList.add(
      'show'
    );


    clearTimeout(
      toastTimer
    );


    toastTimer =
      setTimeout(
        () => {

          element.classList.remove(
            'show'
          );
        },
        1800
      );
  }


  function confirmAction(
    title,
    message,
    action
  ) {

    const dialog =
      $('#confirm-dialog');


    if (
      !dialog?.showModal
    ) {

      if (
        window.confirm(
          message
        )
      ) {

        action();
      }


      return;
    }


    $('#confirm-dialog-title')
      .textContent =
      title;


    $('#confirm-dialog-message')
      .textContent =
      message;


    dialogAction =
      action;


    dialog.showModal();
  }


  async function copyText(
    text,
    successMessage
  ) {

    try {

      await navigator.clipboard
        .writeText(text);


      toast(
        successMessage
      );

    } catch {

      const textarea =
        document.createElement(
          'textarea'
        );


      textarea.value =
        text;


      document.body
        .appendChild(
          textarea
        );


      textarea.select();


      document.execCommand(
        'copy'
      );


      textarea.remove();


      toast(
        successMessage
      );
    }
  }


  /* =========================================================
     FIELD HANDLERS
     ========================================================= */

  function inferValue(
    element
  ) {

    if (
      element.type ===
      'number'
    ) {

      return (
        element.value === ''
          ? 0
          : Number(
              element.value
            )
      );
    }


    if (
      element.type ===
      'checkbox'
    ) {

      return element.checked;
    }


    if (
      element.dataset
        .claddingNested ===
      'custom.priceIncludesGST'
    ) {

      return (
        element.value ===
        'true'
      );
    }


    return element.value;
  }


  function isPricingPath(
    path
  ) {

    return [
      'site.cavityWidthMm',
      'site.finishedHeightMm',
      'site.oneWayTravelKm',
      'labour.additionalFabricationHours',
      'labour.additionalInstallHours',
      'cladding.',
      'powder.'
    ].some(
      (prefix) =>
        path === prefix ||
        path.startsWith(
          prefix
        )
    );
  }


  function handleStateInput(
    element
  ) {

    const path =
      element.dataset
        .statePath;


    if (!path) {
      return false;
    }


    let value =
      inferValue(
        element
      );


    if (
      path ===
        'client.name' ||
      path ===
        'client.address'
    ) {

      value =
        titleCase(
          value
        );
    }


    if (
      path ===
      'client.mobile'
    ) {

      let digits =
        String(value)
          .replace(
            /\D/g,
            ''
          )
          .slice(
            0,
            CFG.clientFields
              .mobile
              .maxDigits
          );


      if (
        !digits.startsWith(
          '04'
        )
      ) {

        digits =
          `04${digits.replace(/^0*/, '')}`
            .slice(
              0,
              10
            );
      }


      value =
        digits;


      element.value =
        digits;
    }


    if (
      path ===
      'client.projectNumber'
    ) {

      value =
        formatProjectNumber(
          parseProjectNumber(
            value
          )
        );


      element.value =
        value;
    }


    /*
      New cladding material:
      remove finish/colour data belonging
      to the previous material.
    */

    if (
      path ===
      'cladding.type'
    ) {

      mutate(
        () => {

          job.cladding.type =
            value;

          job.cladding.colour =
            '';

          job.cladding.finish =
            '';

          job.cladding.profile =
            '';

          job.cladding.palingLengthMm =
            '';

          job.cladding.palingWidthMm =
            '';

          job.cladding.accessoryLengthMode =
            'auto';

          job.cladding.accessoryLengthM =
            0;

          job.cladding.capping =
            true;

          job.cladding.plinth =
            true;


          job.cladding.custom = {

            name: '',

            costingMode:
              'total',

            totalCost:
              0,

            quantity:
              1,

            unitCost:
              0,

            priceIncludesGST:
              true,

            labourRatePerM2:
              0
          };


          job.cladding.colorbond = {

            labourRatePerM2:
              0
          };
        },
        {
          pricing:
            true
        }
      );


      return true;
    }


    mutate(
      () => {

        setPath(
          job,
          path,
          value
        );
      },
      {
        pricing:
          isPricingPath(
            path
          )
      }
    );


    return true;
  }


  function handleComponentField(
    element
  ) {

    const id =
      element.dataset
        .componentId;


    const field =
      element.dataset
        .componentField;


    if (
      !id ||
      !field
    ) {
      return false;
    }


    const component =
      job.components.find(
        (item) =>
          item.id === id
      );


    if (!component) {
      return true;
    }


    const numericFields = [

      'manualFinishedHeightMm',

      'manualWidthMm',

      'internalRailCount',

      'widthMm',

      'verticalRailCount'
    ];


    const value =
      numericFields.includes(
        field
      )
        ? num(
            element.value
          )
        : element.value;


    mutate(
      () => {

        const oldPairId =
          component.doublePairId;


        component[field] =
          value;


        /*
          RETURN DOUBLE GATE TO SINGLE
        */

        if (
          field ===
            'relationship' &&
          value ===
            'single'
        ) {

          if (oldPairId) {

            job.components.forEach(
              (other) => {

                if (
                  other.type ===
                    'gate' &&
                  other.id !==
                    component.id &&
                  other.relationship ===
                    'double' &&
                  other.doublePairId ===
                    oldPairId
                ) {

                  other.relationship =
                    'single';

                  other.doublePairId =
                    '';
                }
              }
            );
          }


          component.doublePairId =
            '';
        }


        /*
          AUTOMATICALLY CREATE SECOND LEAF
          WHEN DOUBLE GATE IS SELECTED.
        */

        if (
          field ===
            'relationship' &&
          value ===
            'double'
        ) {

          if (
            !component.doublePairId
          ) {

            component.doublePairId =
              `Pair ${Date.now()
                .toString()
                .slice(-4)}`;
          }


          const pairMembers =
            job.components.filter(
              (other) =>
                other.type ===
                  'gate' &&
                other.id !==
                  component.id &&
                other.relationship ===
                  'double' &&
                other.doublePairId ===
                  component.doublePairId
            );


          if (
            !pairMembers.length
          ) {

            const partner =
              newGate();


            partner.relationship =
              'double';

            partner.doublePairId =
              component.doublePairId;

            partner.frameType =
              component.frameType;

            partner.openDirection =
              component.openDirection;

            partner.widthMode =
              component.widthMode;

            partner.manualWidthMm =
              component.manualWidthMm;

            partner.internalRailCount =
              component.internalRailCount;

            partner.latchType =
              component.latchType;

            partner.hingeSide =
              component.hingeSide ===
              'left'
                ? 'right'
                : 'left';


            const index =
              job.components.findIndex(
                (item) =>
                  item.id ===
                  component.id
              );


            job.components.splice(
              index + 1,
              0,
              partner
            );
          }
        }
      },
      {
        pricing:
          true
      }
    );


    return true;
  }


  function handlePanelPostField(
    element
  ) {

    const id =
      element.dataset
        .componentId;


    const side =
      element.dataset
        .panelSide;


    const field =
      element.dataset
        .panelPostField;


    if (
      !id ||
      !side ||
      !field
    ) {
      return false;
    }


    const panel =
      job.components.find(
        (component) =>
          component.id ===
            id &&
          component.type ===
            'fixedPanel'
      );


    if (!panel) {
      return true;
    }


    const post =
      side ===
      'left'
        ? panel.leftPost
        : panel.rightPost;


    const value =
      field ===
      'manualFinishedHeightMm'
        ? num(
            element.value
          )
        : element.value;


    mutate(
      () => {

        post[field] =
          value;
      },
      {
        pricing:
          true
      }
    );


    return true;
  }


  function handleCladdingField(
    element
  ) {

    if (
      element.dataset
        .claddingField
    ) {

      const field =
        element.dataset
          .claddingField;


      const numeric = [

        'gapMm',

        'palingLengthMm',

        'palingWidthMm',

        'accessoryLengthM'
      ];


      const value =
        numeric.includes(
          field
        )
          ? (
              element.value ===
              ''
                ? ''
                : num(
                    element.value
                  )
            )
          : element.value;


      mutate(
        () => {

          job.cladding[
            field
          ] =
            value;
        },
        {
          pricing:
            true
        }
      );


      return true;
    }


    if (
      element.dataset
        .claddingNested
    ) {

      const path =
        `cladding.${element.dataset.claddingNested}`;


      let value =
        inferValue(
          element
        );


      if (
        [
          'custom.totalCost',
          'custom.quantity',
          'custom.unitCost',
          'custom.labourRatePerM2',
          'colorbond.labourRatePerM2'
        ].includes(
          element.dataset
            .claddingNested
        )
      ) {

        value =
          num(
            element.value
          );
      }


      setPath(
        job,
        path,
        value
      );


      markPricingChanged();


      job.updatedAt =
        new Date()
          .toISOString();


      autosave();

      renderAll();


      return true;
    }


    return false;
  }


  /* =========================================================
     CHANGE EVENTS
     ========================================================= */

  document.addEventListener(
    'change',
    (event) => {

      const element =
        event.target;


      if (
        !(
          element instanceof
          HTMLElement
        )
      ) {
        return;
      }


      if (
        element.dataset
          .actionChange ===
        'set-double-pair'
      ) {

        const gate =
          job.components.find(
            (component) =>
              component.id ===
                element.dataset
                  .componentId &&
              component.type ===
                'gate'
          );


        if (!gate) {
          return;
        }


        mutate(
          () => {

            gate.doublePairId =
              element.value ===
              '__new__'
                ? `Pair ${Date.now()
                    .toString()
                    .slice(-4)}`
                : element.value;
          },
          {
            pricing:
              true
          }
        );


        return;
      }


      if (
        handleComponentField(
          element
        )
      ) {
        return;
      }


      if (
        handlePanelPostField(
          element
        )
      ) {
        return;
      }


      if (
        handleCladdingField(
          element
        )
      ) {
        return;
      }


      handleStateInput(
        element
      );
    }
  );


  /* =========================================================
     LIVE CLIENT INPUT
     ========================================================= */

  document.addEventListener(
    'input',
    (event) => {

      const element =
        event.target;


      if (
        !(
          element instanceof
          HTMLElement
        )
      ) {
        return;
      }


      if (
        element.dataset
          .statePath ===
          'client.name' ||
        element.dataset
          .statePath ===
          'client.mobile' ||
        element.dataset
          .statePath ===
          'client.notes'
      ) {

        let value =
          element.value;


        if (
          element.dataset
            .statePath ===
          'client.mobile'
        ) {

          value =
            String(value)
              .replace(
                /\D/g,
                ''
              )
              .slice(
                0,
                10
              );


          if (
            !value.startsWith(
              '04'
            )
          ) {

            value =
              `04${value.replace(/^0*/, '')}`
                .slice(
                  0,
                  10
                );


            element.value =
              value;
          }
        }


        setPath(
          job,
          element.dataset
            .statePath,
          value
        );


        autosave();

        renderHeader();
      }
    }
  );


  /* =========================================================
     CLICK EVENTS
     ========================================================= */

  document.addEventListener(
    'click',
    (event) => {

      const button =
        event.target.closest(
          '[data-action], .nav-tab, #undo-btn'
        );


      if (!button) {
        return;
      }


      /*
        NAVIGATION TABS
      */

      if (
        button.classList.contains(
          'nav-tab'
        )
      ) {

        navigate(
          button.dataset
            .sectionTarget
        );


        return;
      }


      /*
        UNDO
      */

      if (
        button.id ===
        'undo-btn'
      ) {

        undo();

        return;
      }


      const action =
        button.dataset.action;


      /*
        ADD COMPONENT
      */

      if (
        action ===
        'add-component'
      ) {

        const type =
          button.dataset
            .componentType;


        mutate(
          () => {

            let component;


            if (
              type ===
              'post'
            ) {
              component =
                newPost();
            }


            if (
              type ===
              'gate'
            ) {
              component =
                newGate();
            }


            if (
              type ===
              'fixedPanel'
            ) {
              component =
                newFixedPanel();
            }


            if (!component) {
              return;
            }


            job.components.push(
              component
            );


            job.selectedComponentId =
              component.id;
          },
          {
            pricing:
              true,

            undoable:
              true
          }
        );


        setTimeout(
          () => {

            const card =
              document.getElementById(
                `component-card-${job.selectedComponentId}`
              );


            card?.scrollIntoView({
              behavior:
                'smooth',

              block:
                'start'
            });
          },
          0
        );


        return;
      }


      /*
        SELECT COMPONENT
      */

      if (
        action ===
        'select-component'
      ) {

        job.selectedComponentId =
          button.dataset
            .componentId;


        autosave();

        renderMudMap();

        renderComponentEditor();


        setTimeout(
          () => {

            const card =
              document.getElementById(
                `component-card-${job.selectedComponentId}`
              );


            card?.scrollIntoView({
              behavior:
                'smooth',

              block:
                'start'
            });
          },
          0
        );


        return;
      }


      /*
        MOVE COMPONENT
      */

      if (
        action ===
          'move-component-left' ||
        action ===
          'move-component-right'
      ) {

        const id =
          button.dataset
            .componentId;


        const index =
          job.components
            .findIndex(
              (component) =>
                component.id ===
                id
            );


        if (
          index < 0
        ) {
          return;
        }


        const next =
          action ===
          'move-component-left'
            ? index - 1
            : index + 1;


        if (
          next < 0 ||
          next >=
            job.components.length
        ) {
          return;
        }


        mutate(
          () => {

            [
              job.components[index],
              job.components[next]
            ] =
            [
              job.components[next],
              job.components[index]
            ];
          },
          {
            pricing:
              true,

            undoable:
              true
          }
        );


        return;
      }


      /*
        DELETE COMPONENT
      */

      if (
        action ===
        'delete-component'
      ) {

        const id =
          button.dataset
            .componentId;


        const labels =
          componentDisplayLabels();


        confirmAction(
          'Delete component',

          `Delete ${labels[id] || 'this component'}?`,

          () => {

            mutate(
              () => {

                const target =
                  job.components.find(
                    (component) =>
                      component.id ===
                      id
                  );


                /*
                  If one leaf of a double gate is deleted,
                  remove the complete paired double gate.
                */

                if (
                  target?.type ===
                    'gate' &&
                  target.relationship ===
                    'double' &&
                  target.doublePairId
                ) {

                  job.components =
                    job.components.filter(
                      (component) =>
                        !(
                          component.type ===
                            'gate' &&
                          component.relationship ===
                            'double' &&
                          component.doublePairId ===
                            target.doublePairId
                        )
                    );

                } else {

                  job.components =
                    job.components.filter(
                      (component) =>
                        component.id !==
                        id
                    );
                }


                if (
                  !job.components.some(
                    (component) =>
                      component.id ===
                      job.selectedComponentId
                  )
                ) {

                  job.selectedComponentId =
                    job.components[0]
                      ?.id ||
                    null;
                }
              },
              {
                pricing:
                  true,

                undoable:
                  true
              }
            );
          }
        );


        return;
      }


      /*
        POST HEIGHT MODE
      */

      if (
        action ===
        'set-post-height-mode'
      ) {

        const component =
          job.components.find(
            (item) =>
              item.id ===
                button.dataset
                  .componentId &&
              item.type ===
                'post'
          );


        if (!component) {
          return;
        }


        mutate(
          () => {

            component.heightMode =
              button.dataset.value;
          },
          {
            pricing:
              true
          }
        );


        return;
      }


      /*
        FIXED PANEL POST HEIGHT MODE
      */

      if (
        action ===
        'set-panel-post-height-mode'
      ) {

        const panel =
          job.components.find(
            (component) =>
              component.id ===
                button.dataset
                  .componentId &&
              component.type ===
                'fixedPanel'
          );


        if (!panel) {
          return;
        }


        const post =
          button.dataset
            .panelSide ===
          'left'
            ? panel.leftPost
            : panel.rightPost;


        mutate(
          () => {

            post.heightMode =
              button.dataset.value;
          },
          {
            pricing:
              true
          }
        );


        return;
      }


      /*
        GATE WIDTH MODE
      */

      if (
        action ===
        'set-gate-width-mode'
      ) {

        const gate =
          job.components.find(
            (component) =>
              component.id ===
                button.dataset
                  .componentId &&
              component.type ===
                'gate'
          );


        if (!gate) {
          return;
        }


        mutate(
          () => {

            gate.widthMode =
              button.dataset.value;


            if (
              gate.widthMode ===
                'manual' &&
              (
                !gate.manualWidthMm ||
                gate.manualWidthMm <=
                  0
              )
            ) {

              gate.manualWidthMm =
                calculation
                  .gateWidths[
                    gate.id
                  ] ||
                1000;
            }


            if (
              gate.relationship ===
                'double' &&
              gate.doublePairId
            ) {

              const partner =
                job.components.find(
                  (other) =>
                    other.type ===
                      'gate' &&
                    other.id !==
                      gate.id &&
                    other.relationship ===
                      'double' &&
                    other.doublePairId ===
                      gate.doublePairId
                );


              if (partner) {

                partner.widthMode =
                  gate.widthMode;


                if (
                  gate.widthMode ===
                  'manual'
                ) {

                  partner.manualWidthMm =
                    gate.manualWidthMm;
                }
              }
            }
          },
          {
            pricing:
              true
          }
        );


        return;
      }


      /*
        ADD HOLE
      */

      if (
        action ===
        'add-hole'
      ) {

        const id =
          button.dataset
            .componentId;


        const side =
          button.dataset
            .panelSide ||
          '';


        const inputId =
          `hole-input-${id}-${side || 'main'}`;


        const input =
          document.getElementById(
            inputId
          );


        const value =
          Math.round(
            num(
              input?.value,
              -1
            )
          );


        if (
          value < 0
        ) {
          return;
        }


        const component =
          job.components.find(
            (item) =>
              item.id ===
              id
          );


        let post =
          null;


        if (
          component?.type ===
          'post'
        ) {

          post =
            component;
        }


        if (
          component?.type ===
          'fixedPanel'
        ) {

          post =
            side === 'left'
              ? component.leftPost
              : component.rightPost;
        }


        if (!post) {
          return;
        }


        if (
          (
            post.holePositionsMm ||
            []
          ).includes(
            value
          )
        ) {

          toast(
            'That hole position is already entered'
          );


          return;
        }


        mutate(
          () => {

            post.holePositionsMm =
              [
                ...(
                  post.holePositionsMm ||
                  []
                ),
                value
              ].sort(
                (
                  first,
                  second
                ) =>
                  first -
                  second
              );
          },
          {
            pricing:
              true
          }
        );


        return;
      }


      /*
        DELETE HOLE
      */

      if (
        action ===
        'delete-hole'
      ) {

        const id =
          button.dataset
            .componentId;


        const side =
          button.dataset
            .panelSide ||
          '';


        const hole =
          num(
            button.dataset.hole
          );


        const component =
          job.components.find(
            (item) =>
              item.id ===
              id
          );


        let post =
          null;


        if (
          component?.type ===
          'post'
        ) {

          post =
            component;
        }


        if (
          component?.type ===
          'fixedPanel'
        ) {

          post =
            side === 'left'
              ? component.leftPost
              : component.rightPost;
        }


        if (!post) {
          return;
        }


        mutate(
          () => {

            post.holePositionsMm =
              (
                post.holePositionsMm ||
                []
              ).filter(
                (position) =>
                  num(position) !==
                  hole
              );
          },
          {
            pricing:
              true
          }
        );


        return;
      }


      /*
        CLADDING TOGGLES
      */

      if (
        action ===
        'toggle-cladding'
      ) {

        const field =
          button.dataset.field;


        mutate(
          () => {

            job.cladding[field] =
              !job.cladding[field];
          },
          {
            pricing:
              true
          }
        );


        return;
      }


      /*
        TREATED PINE ACCESSORY LENGTH
      */

      if (
        action ===
        'set-accessory-length-mode'
      ) {

        mutate(
          () => {

            job.cladding
              .accessoryLengthMode =
              button.dataset.value;


            if (
              job.cladding
                .accessoryLengthMode ===
                'manual' &&
              !job.cladding
                .accessoryLengthM
            ) {

              job.cladding
                .accessoryLengthM =
                calculation
                  .cladding
                  .detail
                  ?.autoAccessoryLengthM ||
                0;
            }
          },
          {
            pricing:
              true
          }
        );


        return;
      }


      /*
        POWDER COATING
      */

      if (
        action ===
        'set-powder'
      ) {

        mutate(
          () => {

            job.powder.enabled =
              button.dataset.value ===
              'yes';


            if (
              !job.powder.enabled
            ) {

              job.powder.colour =
                '';
            }
          },
          {
            pricing:
              true
          }
        );


        return;
      }


      /*
        RESET MANUAL PRICE
      */

      if (
        action ===
        'reset-quote-auto'
      ) {

        mutate(
          () => {

            job.quote.mode =
              'auto';

            job.quote.manualIncGST =
              null;
          }
        );


        return;
      }


      /*
        COPY EMAIL
      */

      if (
        action ===
        'copy-email'
      ) {

        copyEmailRich();

        return;
      }


      /*
        COPY SMS
      */

      if (
        action ===
        'copy-sms'
      ) {

        copyText(
          $('#sms-body').value,
          'SMS copied'
        );


        return;
      }


      /*
        SAVE JOB
      */

      if (
        action ===
        'save-job'
      ) {

        saveCurrentJob();

        return;
      }


      /*
        NEW JOB
      */

      if (
        action ===
        'new-job'
      ) {

        confirmAction(
          'New job',

          'Start a new job? The active job is autosaved, but use Save Current Job if you want it kept in Saved Jobs.',

          startNewJob
        );


        return;
      }


      /*
        OPEN SAVED JOB
      */

      if (
        action ===
        'open-saved-job'
      ) {

        const id =
          button.dataset
            .jobId;


        confirmAction(
          'Open saved job',

          'Open this saved job and replace the current active job?',

          () =>
            openSavedJob(
              id
            )
        );


        return;
      }


      /*
        DELETE SAVED JOB
      */

      if (
        action ===
        'delete-saved-job'
      ) {

        const id =
          button.dataset
            .jobId;


        confirmAction(
          'Delete saved job',

          'Permanently delete this saved job?',

          () =>
            deleteSavedJob(
              id
            )
        );
      }
    }
  );


  /* =========================================================
     MANUAL QUOTE
     ========================================================= */

  $('#quote-final-amount')
    ?.addEventListener(
      'change',
      (event) => {

        const value =
          Math.max(
            0,
            num(
              event.target.value
            )
          );


        mutate(
          () => {

            job.quote.mode =
              'manual';

            job.quote.manualIncGST =
              value;
          }
        );
      }
    );


  /* =========================================================
     CONFIRM DIALOG
     ========================================================= */

  $('#confirm-dialog')
    ?.addEventListener(
      'close',
      (event) => {

        if (
          event.target
            .returnValue ===
            'confirm' &&
          typeof dialogAction ===
            'function'
        ) {

          const action =
            dialogAction;


          dialogAction =
            null;


          action();

        } else {

          dialogAction =
            null;
        }
      }
    );


  /* =========================================================
     UNDO BUTTON
     ========================================================= */

  function updateUndoButton() {

    const button =
      $('#undo-btn');


    if (button) {

      button.disabled =
        undoStack.length ===
        0;
    }
  }


  /* =========================================================
     INITIALISE
     ========================================================= */

  renderAll();

})();
