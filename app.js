'use strict';
 
/* =========================================================
   JTLA GATES
   CLEAN REBUILD
   app.js
 
   Architecture:
   - One central job state object
   - State is the source of truth
   - Pure-ish calculation functions derive job results
   - Render functions display state/results
   - LocalStorage persists active + saved jobs
   - Event delegation avoids duplicate listeners
   ========================================================= */
 
(() => {
  const CFG = window.PRICES;
  if (!CFG) {
    console.error('JTLA Gates: PRICES configuration was not loaded.');
    return;
  }
 
  /* =======================================================
     DOM HELPERS
     ======================================================= */
 
  /* Slider extension. Kept here so the existing prices.js and saved-job storage remain untouched. */
  CFG.steel = CFG.steel || {};
  CFG.steel.frame = CFG.steel.frame || {};
  CFG.steel.frame['25x25_rhs'] = {
    ...(CFG.steel.frame['25x25_rhs'] || {}),
    label: '25x25 SHS Duragalv', widthMm: 25, depthMm: 25,
    stockLengthM: 8, pricePerStockLength: 60, priceIncludesGST: false
  };
  CFG.steel.frame['50x50_rhs'] = {
    ...(CFG.steel.frame['50x50_rhs'] || {}),
    label: '50x50 SHS Duragalv', widthMm: 50, depthMm: 50,
    stockLengthM: 8, pricePerStockLength: 72, priceIncludesGST: false
  };
  CFG.steel.frame['100x50_rhs'] = {
    label: '100x50 RHS Duragalv', widthMm: 100, depthMm: 50,
    stockLengthM: 8, pricePerStockLength: 150, priceIncludesGST: false
  };
 
  CFG.hardware = CFG.hardware || {};
  CFG.hardware.slider = {
    wheel: { label: 'Roller wheel', priceExGST: 45, priceEachExGST: 45, defaultQty: 2 },
    guideRollerSet: { label: 'Guide roller set', priceExGST: 25, priceEachExGST: 25, defaultQty: 1 },
    track: { label: 'Galvanised sliding gate track', stockLengthM: 3, pricePerStockLengthExGST: 55, lengthMultiplier: 2 },
    dropBolt: { label: 'Drop bolt', priceExGST: 20, priceEachExGST: 20, defaultQty: 0 },
    rollerGuideTopFabricationAllowanceExGST: 50,
    catchFabricationAllowanceExGST: 40
  };
  CFG.hardware.latches = CFG.hardware.latches || {};
  if (!CFG.hardware.latches.dropBolt) {
    CFG.hardware.latches.dropBolt = { label: 'Drop bolt', priceExGST: 20 };
  }
 
  CFG.slider = {
    clearanceMm: 20,
    groundTrackClearanceMm: 20,
    defaultOverhangMm: 300,
    defaultOverhangMode: 'lower_rail',
    defaultSlideDirection: 'left',
    topFrameType: '50x50_rhs',
    endFrameType: '50x50_rhs',
    bottomFrameType: '100x50_rhs',
    internalRailType: '25x25_rhs',
    fabricationMinutesPerM: 50,
    installationHoursPerM: 1,
    trackMultiplier: 2,
    rollerGuidePostType: '65x65_shs',
    rollerClearanceMm: 100,
    rollerGuideTopDefaultMm: 400,
    rollerGuideTopMaterialMinimumMm: 400,
    rollerGuideTopMinimumMaterialMm: 400,
    rollerGuideWasteMm: 100,
    rollerGuideWasteAllowanceMm: 100,
    rollerGuideWeldAllowanceExGST: 50,
    catchAllowanceExGST: 40
  };
 
  /* Updated bank account name. */
  if (CFG.bank) {
    CFG.bank.accountName = String(CFG.bank.accountName || '').replace('GF Tuuta', 'CF Tuuta');
  }
 
  /* All steel is Duragalv. Keep internal labels concise. */
  Object.values(CFG.steel.frame || {}).forEach(item => {
    if (item?.label) item.label = item.label.replace(/\s+Duragalv\b/gi, '');
  });
  Object.values(CFG.steel.posts || {}).forEach(item => {
    if (item?.label) item.label = item.label.replace(/\s+Duragalv\b/gi, '');
  });
 
  if (CFG.cladding?.colorbond) {
    CFG.cladding.colorbond.rawMaterialRatePerM2ExGST = 25;
    CFG.cladding.colorbond.rawMaterialRatePerM2 = 25;
    CFG.cladding.colorbond.rawMaterialPriceIncludesGST = false;
    CFG.cladding.colorbond.installedSellRatePerM2ExGST = 50;
    CFG.cladding.colorbond.installedRatePerM2 = 50;
    CFG.cladding.colorbond.installedRateIncludesGST = false;
    CFG.cladding.colorbond.labourRatePerM2 = 0;
    CFG.cladding.colorbond.screwAllowancePerLinealMExGST = 3;
    CFG.cladding.colorbond.sheetWidthMm = 890;
    CFG.cladding.colorbond.finishedCoverMm = 800;
  }
 
  const $ = (selector, root = document) => root.querySelector(selector);
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
    return Number.isFinite(n) ? n : fallback;
  };
 
  const round = (value, digits = 2) => {
    const f = 10 ** digits;
    return Math.round((num(value) + Number.EPSILON) * f) / f;
  };
 
  const clamp = (value, min, max) =>
    Math.min(max, Math.max(min, value));
 
  const deepClone = (value) =>
    JSON.parse(JSON.stringify(value));
 
  const uid = (prefix = 'id') => {
    if (window.crypto && crypto.randomUUID) {
      return `${prefix}_${crypto.randomUUID()}`;
    }
 
    return `${prefix}_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 9)}`;
  };
 
  const titleCase = (value) => {
    return String(value || '')
      .toLowerCase()
      .replace(/\b([a-z])/g, (m) => m.toUpperCase())
      .replace(/\b(Mc)([a-z])/g, (_, a, b) => a + b.toUpperCase())
      .replace(/\b(O')([a-z])/g, (_, a, b) => a + b.toUpperCase());
  };
 
  const safe = (value) =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
 
  const gstExclusive = (amount, priceIncludesGST) => {
    const v = num(amount);
    return priceIncludesGST ? v / (1 + CFG.business.gst) : v;
  };
 
  const gstInclusive = (amount, priceIncludesGST) => {
    const v = num(amount);
    return priceIncludesGST ? v : v * (1 + CFG.business.gst);
  };
 
  const ceilTo = (value, increment) => {
    const inc = num(increment, 1);
 
    if (inc <= 0) {
      return value;
    }
 
    return Math.ceil(num(value) / inc) * inc;
  };
 
  const formatHours = (hours) =>
    `${round(hours, 2).toFixed(2)} hr`;
 
  const mm = (value) =>
    `${Math.round(num(value))} mm`;
 
  const sqm = (value) =>
    `${round(value, 2).toFixed(2)} m²`;
 
  const lm = (value) =>
    `${round(value, 2).toFixed(2)} m`;
 
  const getPath = (obj, path) => {
    return String(path)
      .split('.')
      .reduce((acc, key) => acc?.[key], obj);
  };
 
  const setPath = (obj, path, value) => {
    const parts = String(path).split('.');
    let ref = obj;
 
    parts.forEach((key, index) => {
      if (index === parts.length - 1) {
        ref[key] = value;
      } else {
        if (!ref[key] || typeof ref[key] !== 'object') {
          ref[key] = {};
        }
 
        ref = ref[key];
      }
    });
  };
 
  /* =======================================================
     STATE
     ======================================================= */
 
  function getSavedJobsRaw() {
    try {
      const raw = localStorage.getItem(CFG.storage.savedJobsKey);
      const parsed = raw ? JSON.parse(raw) : [];
 
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
 
  function projectDigits(value) {
    return String(
      Math.max(0, parseInt(value, 10) || 0)
    ).padStart(CFG.projects.numberDigits, '0');
  }
 
  function formatProjectNumber(value) {
    return `${CFG.projects.prefix}${projectDigits(value)}`;
  }
 
  function parseProjectNumber(value) {
    const digits = String(value || '').replace(/\D/g, '');
 
    if (!digits) {
      return CFG.projects.startingProjectNumber;
    }
 
    const tail = digits.slice(-CFG.projects.numberDigits);
 
    return (
      parseInt(tail, 10) ||
      CFG.projects.startingProjectNumber
    );
  }
 
  function nextProjectNumber() {
    const saved = getSavedJobsRaw();
 
    const nums = saved
      .map((job) =>
        parseProjectNumber(
          job?.client?.projectNumber ||
          job?.projectNumber
        )
      )
      .filter(Number.isFinite);
 
    const activeRaw =
      localStorage.getItem(CFG.storage.activeJobKey);
 
    if (activeRaw) {
      try {
        const active = JSON.parse(activeRaw);
 
        nums.push(
          parseProjectNumber(
            active?.client?.projectNumber
          )
        );
      } catch {
        // Ignore bad active state.
      }
    }
 
    const highest = nums.length
      ? Math.max(
          ...nums,
          CFG.projects.startingProjectNumber - 1
        )
      : CFG.projects.startingProjectNumber - 1;
 
    return highest + 1;
  }
 
  function defaultCladding() {
    return {
      type: CFG.defaults.claddingType,
      direction: CFG.defaults.claddingDirection,
      colour: '',
      finish: '',
      profile: '',
      gapMm: CFG.defaults.claddingGapMm,
 
      palingLengthMm: '',
      palingWidthMm: '',
 
      accessoryLengthMode: 'auto',
      accessoryLengthM: 0,
 
      capping: true,
      plinth: true,
 
      custom: {
        name: '',
        costingMode: 'total',
        totalCost: 0,
        quantity: 1,
        unitCost: 0,
        priceIncludesGST: true,
        labourRatePerM2: 0
      },
 
      colorbond: {
        labourRatePerM2: 0
      }
    };
  }
 
  function createNewJob(projectNumber = nextProjectNumber()) {
    return {
      schemaVersion: CFG.version.schema,
 
      id: uid('job'),
 
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
 
      site: {
        cavityWidthMm: 0,
        finishedHeightMm: CFG.defaults.finishedHeightMm,
        oneWayTravelKm: 0,
        referenceDirection: CFG.defaults.referenceDirection,
        referenceCustom: ''
      },
 
      components: [],
      selectedComponentId: null,
 
      cladding: defaultCladding(),
 
      powder: {
        enabled: CFG.defaults.powderCoating,
        colour: CFG.defaults.powderColour
      },
 
      labour: {
        additionalFabricationHours: 0,
        additionalInstallHours: 0
      },
 
      client: {
        name: '',
        address: '',
        projectNumber: formatProjectNumber(projectNumber),
        mobile: CFG.clientFields.mobile.defaultValue,
        email: '',
        notes: '',
        includeNotesInQuote: false
      },
 
      quote: {
        mode: 'auto',
        manualIncGST: null
      },
 
      ui: {
        activeSection: 'site'
      }
    };
  }
 
  function hydrateJob(raw) {
    const base = createNewJob(
      parseProjectNumber(raw?.client?.projectNumber)
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
          ...(raw?.cladding?.custom || {})
        },
 
        colorbond: {
          ...base.cladding.colorbond,
          ...(raw?.cladding?.colorbond || {})
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
 
      components: Array.isArray(raw?.components)
        ? raw.components
        : []
    };
 
    merged.components =
      merged.components.map(hydrateComponent);
 
    if (
      !merged.selectedComponentId ||
      !merged.components.some(
        (c) => c.id === merged.selectedComponentId
      )
    ) {
      merged.selectedComponentId =
        merged.components[0]?.id || null;
    }
 
    return merged;
  }
 
  function hydrateComponent(c) {
    if (c?.type === 'post') {
      return {
        ...newPost(),
        ...c
      };
    }
 
    if (c?.type === 'gate') {
      return {
        ...newGate(),
        ...c
      };
    }
 
    if (c?.type === 'fixedPanel') {
      const d = newFixedPanel();
      const savedRails = Array.isArray(c.internalRails)
        ? c.internalRails.map((r, index) => {
            const fallbackPosition =
              index === 0 ? 'top' :
              index === 1 ? 'mid' :
              index === 2 ? 'bottom' :
              'extra';
 
            return {
              ...newPanelRail(
                r.orientation || 'horizontal',
                r.steelType || CFG.defaults.frameType,
                r.position || fallbackPosition
              ),
              ...r,
              position: r.position || fallbackPosition
            };
          })
        : null;
      return {
        ...d,
        ...c,
        railMode: c.railMode || (savedRails ? 'manual' : 'auto'),
        internalRails: savedRails || d.internalRails,
        leftPost: { ...d.leftPost, ...(c.leftPost || {}) },
        rightPost: { ...d.rightPost, ...(c.rightPost || {}) }
      };
    }
 
    if (c?.type === 'slider') {
      const d = newSlider();
 
      return {
        ...d,
        ...c,
        internalRails: Array.isArray(c.internalRails)
          ? c.internalRails.map(r => ({ ...newSliderRail(r.orientation || 'horizontal'), ...r }))
          : [],
        catchPost: {
          ...d.catchPost,
          ...(c.catchPost || {})
        },
        rollerGuide: {
          ...d.rollerGuide,
          ...(c.rollerGuide || {}),
          leftPost: {
            ...d.rollerGuide.leftPost,
            ...(c.rollerGuide?.leftPost || {})
          },
          rightPost: {
            ...d.rollerGuide.rightPost,
            ...(c.rollerGuide?.rightPost || {})
          }
        }
      };
    }
 
    return c;
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
 
  let job = loadActiveJob();
  let calculation = null;
  let undoStack = [];
  let toastTimer = null;
  let dialogAction = null;
 
  /* =======================================================
     COMPONENT FACTORIES
     ======================================================= */
 
  function newPost() {
    return {
      id: uid('post'),
      type: 'post',
      catchForSliderId: '',
 
      postType: CFG.defaults.postType,
 
      fixing: 'fixed_brick',
 
      heightMode: 'auto',
 
      manualFinishedHeightMm:
        CFG.defaults.finishedHeightMm,
 
      holePositionsMm: []
    };
  }
 
  function newGate() {
    return {
      id: uid('gate'),
      type: 'gate',
 
      frameType: CFG.defaults.frameType,
 
      hingeSide: CFG.defaults.hingeSide,
 
      openDirection:
        CFG.defaults.openDirection,
 
      widthMode: 'auto',
 
      manualWidthMm: 1000,
 
      relationship: 'single',
 
      doublePairId: '',
 
      internalRailCount:
        CFG.defaults.gateInternalRailCount,
 
      latchType: 'ddDualKey'
    };
  }
 
 
  function newSliderSubPost(prefix = 'slider_post', postType = CFG.defaults.postType) {
    return {
      id: uid(prefix),
      postType,
      fixing: 'concrete_floating',
      heightMode: 'manual',
      manualFinishedHeightMm: CFG.defaults.finishedHeightMm,
      holePositionsMm: []
    };
  }
 
  function newSliderRail(orientation = 'horizontal') {
    return {
      id: uid('slider_rail'),
      orientation,
      lengthMode: 'auto',
      manualLengthMm: 0
    };
  }
 
  function newSlider() {
    return {
      id: uid('slider'),
      type: 'slider',
      openingWidthMode: 'auto',
      manualOpeningWidthMm: 3000,
      overhangMode: CFG.slider.defaultOverhangMode || 'lower_rail',
      overhangMm: CFG.slider.defaultOverhangMm || 300,
      slideDirection: CFG.slider.defaultSlideDirection || 'left',
      topFrameType: CFG.slider.topFrameType || '50x50_rhs',
      bottomFrameType: CFG.slider.bottomFrameType || '100x50_rhs',
      endFrameType: CFG.slider.endFrameType || '50x50_rhs',
      internalRailType: CFG.slider.internalRailType || '25x25_rhs',
      internalRails: [],
      wheelQty: CFG.hardware.slider.wheel.defaultQty || 2,
      guideRollerQty: CFG.hardware.slider.guideRollerSet.defaultQty || 1,
      trackMode: 'auto',
      manualTrackLengthM: 0,
      latchType: 'ddDualKey',
      includeCatchPost: true,
      includeRollerGuide: true,
      catchPost: newSliderSubPost('slider_catch', CFG.defaults.postType),
      rollerGuide: {
        topWidthMm: CFG.slider.rollerGuideTopDefaultMm || 400,
        leftPost: newSliderSubPost('slider_guide_left', CFG.slider.rollerGuidePostType || '65x65_shs'),
        rightPost: newSliderSubPost('slider_guide_right', CFG.slider.rollerGuidePostType || '65x65_shs')
      }
    };
  }
 
  function newPanelPost(side) {
    return {
      id: uid(`fp_${side}`),
 
      postType:
        CFG.defaults.postType,
 
      fixing:
        side === 'left'
          ? CFG.defaults.fixedPanelLeftPostFixing
          : CFG.defaults.fixedPanelRightPostFixing,
 
      heightMode: 'auto',
 
      manualFinishedHeightMm:
        CFG.defaults.finishedHeightMm,
 
      holePositionsMm: []
    };
  }
 
  function newPanelRail(orientation = 'horizontal', steelType = CFG.defaults.frameType, position = 'extra') {
    return {
      id: uid('panel_rail'),
      orientation,
      steelType,
      position,
      lengthMode: 'auto',
      manualLengthMm: 0
    };
  }
 
  function newFixedPanel() {
    return {
      id: uid('panel'),
      type: 'fixedPanel',
      widthMm: 700,
      catchForSliderId: '',
      catchPostSide: 'right',
      leftPost: newPanelPost('left'),
      rightPost: newPanelPost('right'),
      railMode: 'auto',
      internalRails: [
        newPanelRail('horizontal', CFG.defaults.frameType, 'top'),
        newPanelRail('horizontal', CFG.defaults.frameType, 'mid'),
        newPanelRail('horizontal', CFG.defaults.frameType, 'bottom')
      ]
    };
  }
 
  /* =======================================================
     STATE MUTATION
     ======================================================= */
 
  function pushUndo() {
    undoStack.push(
      deepClone(job)
    );
 
    if (
      undoStack.length >
      CFG.storage.undoHistoryLimit
    ) {
      undoStack.shift();
    }
 
    updateUndoButton();
  }
 
  function undo() {
    if (!undoStack.length) {
      return;
    }
 
    job = undoStack.pop();
 
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
      new Date().toISOString();
 
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
    } catch (err) {
      console.error(err);
 
      const status =
        $('#autosave-status');
 
      if (status) {
        status.textContent =
          'Save error';
      }
    }
  }
 
  /* =======================================================
     LABELS / COMPONENT ORDER
     ======================================================= */
 
  function componentDisplayLabels() {
    const counts = {
      post: job.components.filter(c => c.type === 'post').length,
      gate: job.components.filter(c => c.type === 'gate').length,
      slider: job.components.filter(c => c.type === 'slider').length,
      fixedPanel: job.components.filter(c => c.type === 'fixedPanel').length
    };
 
    const seen = { post: 0, gate: 0, slider: 0, fixedPanel: 0 };
    const labels = {};
 
    job.components.forEach(c => {
      if (!(c.type in seen)) return;
      seen[c.type] += 1;
 
      if (c.type === 'post') labels[c.id] = `Post ${seen.post}`;
      if (c.type === 'gate') labels[c.id] = counts.gate === 1 ? 'Gate' : `Gate ${seen.gate}`;
      if (c.type === 'slider') labels[c.id] = counts.slider === 1 ? 'Sliding Gate' : `Sliding Gate ${seen.slider}`;
      if (c.type === 'fixedPanel') labels[c.id] = counts.fixedPanel === 1 ? 'Fixed Panel' : `Fixed Panel ${seen.fixedPanel}`;
    });
 
    return labels;
  }
 
  function selectedComponent() {
    return (
      job.components.find(
        (c) =>
          c.id ===
          job.selectedComponentId
      ) || null
    );
  }
 
  function sliderComponents() {
    return job.components.filter(c => c.type === 'slider');
  }
 
  function defaultCatchSliderId() {
    const selected = selectedComponent();
    if (selected?.type === 'slider') return selected.id;
    const sliders = sliderComponents();
    return sliders.length === 1 ? sliders[0].id : '';
  }
 
  function panelRailPositionLabel(position) {
    const labels = { top: 'Top', mid: 'Mid', bottom: 'Bottom', extra: 'Extra' };
    return labels[position] || 'Extra';
  }
 
  function catchTargetLabel(component) {
    const slider = sliderComponents().find(s => s.id === component.catchForSliderId);
    return slider ? componentDisplayLabels()[slider.id] : '';
  }
 
  /* =======================================================
     DIMENSION HELPERS
     ======================================================= */
 
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
    if (post.heightMode === 'manual') {
      return Math.max(0, num(post.manualFinishedHeightMm));
    }
 
    return Math.max(0, num(job.site.finishedHeightMm));
  }
 
  function postCutLengthMm(post) {
    const finished = postFinishedHeight(post);
 
    if (post.fixing === 'existing_structure') return 0;
 
    if (post.fixing === 'baseplate') {
      return Math.max(0, finished - CFG.fabrication.baseplateHeightAllowanceMm);
    }
 
    if (post.fixing === 'concrete_house' || post.fixing === 'concrete_floating') {
      return finished + CFG.fabrication.concreteEmbedmentMm;
    }
 
    return finished;
  }
 
  function gateFrameHeightMm() {
    return Math.max(
      0,
      num(
        job.site.finishedHeightMm
      ) -
        CFG.fabrication
          .gateGroundGapMm
    );
  }
 
 
  function sliderFrameHeightMm() {
    return Math.max(0, num(job.site.finishedHeightMm) - CFG.slider.groundTrackClearanceMm);
  }
 
  function sliderOpeningWidthMm(slider) {
    if (slider.openingWidthMode === 'manual') {
      return Math.max(0, num(slider.manualOpeningWidthMm));
    }
 
    const otherOccupied = job.components
      .filter(c => c.id !== slider.id && c.type !== 'gate' && c.type !== 'slider')
      .reduce((sum, c) => sum + componentOccupiedWidthMm(c), 0);
 
    return Math.max(0, num(job.site.cavityWidthMm) - otherOccupied);
  }
 
  function sliderManufacturedLengthMm(slider) {
    return sliderOpeningWidthMm(slider) + Math.max(0, num(slider.overhangMm));
  }
 
  function sliderGateBodyWidthMm(slider) {
    return slider.overhangMode === 'full_gate'
      ? sliderManufacturedLengthMm(slider)
      : sliderOpeningWidthMm(slider);
  }
 
  function sliderCladdingDimensions(slider) {
    const top = frameConfig(slider.topFrameType);
    const bottom = frameConfig(slider.bottomFrameType);
    const end = frameConfig(slider.endFrameType);
    const frameHeight = sliderFrameHeightMm();
    const gateBodyWidth = sliderGateBodyWidthMm(slider);
 
    return {
      widthMm: Math.max(0, gateBodyWidth - end.widthMm * 2),
      heightMm: Math.max(0, frameHeight - bottom.widthMm - top.widthMm)
    };
  }
 
  function sliderRailAutoLengthMm(slider, rail) {
    const dims = sliderCladdingDimensions(slider);
    return rail.orientation === 'vertical' ? dims.heightMm : dims.widthMm;
  }
 
  function sliderTrackRequiredM(slider) {
    if (slider.trackMode === 'manual') {
      return Math.max(0, num(slider.manualTrackLengthM));
    }
    return (sliderManufacturedLengthMm(slider) / 1000) * CFG.hardware.slider.track.lengthMultiplier;
  }
 
  function sliderGuideUprightHeightMm(slider) {
    return sliderFrameHeightMm() + CFG.slider.rollerClearanceMm;
  }
 
  function setSliderSubPostHeights(slider) {
    const guideHeight = sliderGuideUprightHeightMm(slider);
    slider.rollerGuide.leftPost.heightMode = 'manual';
    slider.rollerGuide.rightPost.heightMode = 'manual';
    slider.rollerGuide.leftPost.manualFinishedHeightMm = guideHeight;
    slider.rollerGuide.rightPost.manualFinishedHeightMm = guideHeight;
 
    slider.catchPost.heightMode = 'manual';
    slider.catchPost.manualFinishedHeightMm = Math.max(0, num(job.site.finishedHeightMm));
  }
 
  function panelWidthMm(panel) {
    return Math.max(
      0,
      num(panel.widthMm)
    );
  }
 
  function panelInternalWidthMm(panel) {
    const leftW = panel.leftPost.fixing === 'existing_structure' ? 0 : postConfig(panel.leftPost.postType).widthMm;
    const rightW = panel.rightPost.fixing === 'existing_structure' ? 0 : postConfig(panel.rightPost.postType).widthMm;
    return Math.max(0, panelWidthMm(panel) - leftW - rightW);
  }
 
  function panelRailAutoLengthMm(panel, rail) {
    return rail.orientation === 'vertical'
      ? Math.max(0, num(job.site.finishedHeightMm))
      : panelInternalWidthMm(panel);
  }
 
  function panelRailsUsed(panel) {
    if (panel.railMode !== 'manual' && job.cladding.direction === 'horizontal') return [];
    return Array.isArray(panel.internalRails) ? panel.internalRails : [];
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
 
    if (component.type === 'slider') {
      return sliderOpeningWidthMm(component);
    }
 
    return 0;
  }
 
  function pairMap() {
    const gates =
      job.components.filter(
        (c) => c.type === 'gate'
      );
 
    const pairs =
      new Map();
 
    gates.forEach(
      (g) => {
        if (
          g.relationship !==
            'double' ||
          !g.doublePairId
        ) {
          return;
        }
 
        if (
          !pairs.has(
            g.doublePairId
          )
        ) {
          pairs.set(
            g.doublePairId,
            []
          );
        }
 
        pairs
          .get(g.doublePairId)
          .push(g);
      }
    );
 
    return pairs;
  }
 
  function gateGapTotalMm() {
    let total = 0;
 
    const comps =
      job.components;
 
    for (
      let i = 0;
      i <
      comps.length - 1;
      i += 1
    ) {
      const a = comps[i];
      const b = comps[i + 1];
 
      if (
        a.type === 'gate' &&
        b.type === 'gate' &&
        a.relationship ===
          'double' &&
        b.relationship ===
          'double' &&
        a.doublePairId &&
        a.doublePairId ===
          b.doublePairId
      ) {
        total +=
          CFG.fabrication
            .doubleGateCentreGapMm;
      } else if (
        a.type === 'gate' ||
        b.type === 'gate'
      ) {
        total +=
          CFG.fabrication
            .gateSideGapMm;
      }
    }
 
    return total;
  }
 
  function calculateGateWidths() {
    const result = {};
 
    const gates =
      job.components.filter(
        (c) => c.type === 'gate'
      );
 
    if (!gates.length) {
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
          (c) =>
            c.type !==
            'gate'
        )
        .reduce(
          (sum, c) =>
            sum +
            componentOccupiedWidthMm(
              c
            ),
          0
        );
 
    const gapTotal =
      gateGapTotalMm();
 
    const manualGates =
      gates.filter(
        (g) =>
          g.widthMode ===
          'manual'
      );
 
    const autoGates =
      gates.filter(
        (g) =>
          g.widthMode !==
          'manual'
      );
 
    const manualTotal =
      manualGates.reduce(
        (sum, g) =>
          sum +
          Math.max(
            0,
            num(
              g.manualWidthMm
            )
          ),
        0
      );
 
    manualGates.forEach(
      (g) => {
        result[g.id] =
          Math.max(
            0,
            num(
              g.manualWidthMm
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
      autoGates.length === 1
    ) {
      result[
        autoGates[0].id
      ] = available;
 
      return result;
    }
 
    if (
      autoGates.length > 1
    ) {
      const doubleGroups =
        new Map();
 
      const unpaired = [];
 
      autoGates.forEach(
        (g) => {
          if (
            g.relationship ===
              'double' &&
            g.doublePairId
          ) {
            if (
              !doubleGroups.has(
                g.doublePairId
              )
            ) {
              doubleGroups.set(
                g.doublePairId,
                []
              );
            }
 
            doubleGroups
              .get(g.doublePairId)
              .push(g);
          } else {
            unpaired.push(g);
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
              group.length !== 2
          )
          .flat();
 
      unpaired.push(
        ...invalidDoubleGates
      );
 
      if (
        completeDoubleGroups.length ===
          1 &&
        unpaired.length === 0 &&
        autoGates.length === 2
      ) {
        const each =
          available / 2;
 
        completeDoubleGroups[0]
          .forEach(
            (g) => {
              result[g.id] =
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
          (g) => {
            result[g.id] =
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
          frame.widthMm * 2
      );
    }
 
    return Math.max(
      0,
      gateWidth -
        frame.widthMm * 2
    );
  }
 
  /* =======================================================
     COST HELPERS
     ======================================================= */
 
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
 
  /* Pack complete cut pieces into stock lengths without joining offcuts. */
  function packStockCuts(cutsMm, stockLengthM) {
    const stockMm = Math.max(1, num(stockLengthM) * 1000);
    const cuts = (cutsMm || []).map(v => Math.max(0, num(v))).filter(v => v > 0).sort((a, b) => b - a);
    const bins = [];
    const oversized = [];
 
    cuts.forEach(cut => {
      if (cut > stockMm) {
        const fullLengths = Math.floor(cut / stockMm);
        const remainder = cut - fullLengths * stockMm;
        for (let i = 0; i < fullLengths; i += 1) bins.push({ remainingMm: 0, cutsMm: [stockMm] });
        if (remainder > 0) bins.push({ remainingMm: stockMm - remainder, cutsMm: [remainder] });
        oversized.push(cut);
        return;
      }
      let bestIndex = -1;
      let bestRemainingAfter = Infinity;
      bins.forEach((bin, index) => {
        if (bin.remainingMm >= cut) {
          const remainingAfter = bin.remainingMm - cut;
          if (remainingAfter < bestRemainingAfter) {
            bestRemainingAfter = remainingAfter;
            bestIndex = index;
          }
        }
      });
      if (bestIndex >= 0) {
        bins[bestIndex].cutsMm.push(cut);
        bins[bestIndex].remainingMm -= cut;
      } else {
        bins.push({ remainingMm: stockMm - cut, cutsMm: [cut] });
      }
    });
 
    return {
      qty: bins.length,
      bins,
      oversized,
      totalCutM: cuts.reduce((sum, v) => sum + v, 0) / 1000
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
 
  /* =======================================================
     CLADDING CALCULATIONS
     ======================================================= */
 
  function cladSurfaces(gateWidths) {
    const surfaces = [];
    const gateHeight = gateFrameHeightMm();
 
    job.components.forEach(c => {
      if (c.type === 'gate') {
        const steelWidth = Math.max(0, num(gateWidths[c.id]));
        const cladWidth = steelWidth + CFG.fabrication.gateCladdingOverhangMm * 2;
 
        surfaces.push({
          componentId: c.id,
          type: 'gate',
          widthMm: cladWidth,
          heightMm: gateHeight,
          steelWidthMm: steelWidth,
          steelHeightMm: gateHeight
        });
      }
 
      if (c.type === 'fixedPanel') {
        surfaces.push({
          componentId: c.id,
          type: 'fixedPanel',
          widthMm: panelWidthMm(c),
          heightMm: Math.max(0, num(job.site.finishedHeightMm)),
          steelWidthMm: panelWidthMm(c),
          steelHeightMm: Math.max(0, num(job.site.finishedHeightMm))
        });
      }
 
      if (c.type === 'slider') {
        const dims = sliderCladdingDimensions(c);
        surfaces.push({
          componentId: c.id,
          type: 'slider',
          widthMm: dims.widthMm,
          heightMm: dims.heightMm,
          steelWidthMm: sliderGateBodyWidthMm(c),
          steelHeightMm: sliderFrameHeightMm()
        });
      }
    });
 
    return surfaces;
  }
 
  function claddingAreaM2(
    surfaces
  ) {
    return surfaces.reduce(
      (sum, s) =>
        sum +
        (
          s.widthMm /
          1000
        ) *
        (
          s.heightMm /
          1000
        ),
      0
    );
  }
 
  function calculateBoardCladding(
    cfg,
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
 
    let pieces = 0;
    let cutLengthTotalM = 0;
    let rawLinealM = 0;
 
    surfaces.forEach(
      (s) => {
        const acrossMm =
          direction ===
          'vertical'
            ? s.widthMm
            : s.heightMm;
 
        const cutBaseMm =
          direction ===
          'vertical'
            ? s.heightMm
            : s.widthMm;
 
        const boardWidth =
          num(
            cfg.boardWidthMm
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
          cfg.processingAllowanceMode ===
          'add_standard'
            ? CFG.fabrication
                .claddingProcessingAllowanceMm
            : 0;
 
        const cutMm =
          cutBaseMm +
          processing;
 
        pieces += qty;
 
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
 
    let materialCostExGST = 0;
    let orderText = '';
 
    if (
      cfg.stockLengthM &&
      cfg.pricePerStockLength != null
    ) {
      const order =
        stockLengthCost(
          cutLengthTotalM,
          cfg.stockLengthM,
          cfg.pricePerStockLength,
          cfg.priceIncludesGST
        );
 
      materialCostExGST =
        order.costExGST;
 
      orderText =
        `${order.qty} × ${cfg.stockLengthM}m lengths`;
    } else if (
      cfg.pricePerLinealM != null
    ) {
      materialCostExGST =
        cutLengthTotalM *
        gstExclusive(
          cfg.pricePerLinealM,
          cfg.priceIncludesGST
        );
 
      orderText =
        `${round(cutLengthTotalM, 2)} lm`;
    }
 
    return {
      pieces,
      cutLengthTotalM,
      rawLinealM,
      materialCostExGST,
      orderText
    };
  }
 
  function calculatePine(
    surfaces
  ) {
    const cfg =
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
 
    let qty = 0;
 
    if (
      width &&
      length
    ) {
      surfaces.forEach(
        (s) => {
          const metresWide =
            s.widthMm /
            1000;
 
          if (
            width === 150
          ) {
            qty +=
              Math.ceil(
                s.widthMm /
                100
              );
          } else {
            const base =
              Math.ceil(
                s.widthMm /
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
 
    const materialCostExGST =
      qty *
      gstExclusive(
        cfg.priceEach,
        cfg.priceIncludesGST
      );
 
    const autoAccessoryLengthM =
      surfaces.reduce(
        (sum, s) =>
          sum +
          s.widthMm /
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
 
    const cappingCost =
      job.cladding.capping
        ? accessoryLengthM *
          gstExclusive(
            cfg.capping
              .pricePerM,
            cfg.capping
              .priceIncludesGST
          )
        : 0;
 
    const plinthCost =
      job.cladding.plinth
        ? accessoryLengthM *
          gstExclusive(
            cfg.plinth
              .pricePerM,
            cfg.plinth
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
        materialCostExGST +
        cappingCost +
        plinthCost,
 
      palingCostExGST:
        materialCostExGST,
 
      cappingCostExGST:
        cappingCost,
 
      plinthCostExGST:
        plinthCost,
 
      accessoryLengthM,
      autoAccessoryLengthM,
 
      orderText:
        width &&
        length
          ? `${qty} × ${width}×${length}mm palings`
          : 'Select paling width and length'
    };
  }
 
  function meshPieces(surfaces) {
    const pieces = [];
 
    surfaces.forEach(s => {
      const comp = job.components.find(c => c.id === s.componentId);
      if (!comp) return;
 
      if (comp.type === 'gate') {
        const frame = frameConfig(comp.frameType);
        pieces.push({
          widthMm: Math.max(0, s.steelWidthMm - frame.widthMm * 2),
          heightMm: Math.max(0, s.steelHeightMm - frame.widthMm * 2),
          componentId: comp.id
        });
      } else if (comp.type === 'fixedPanel') {
        const leftW = comp.leftPost.fixing === 'existing_structure' ? 0 : postConfig(comp.leftPost.postType).widthMm;
        const rightW = comp.rightPost.fixing === 'existing_structure' ? 0 : postConfig(comp.rightPost.postType).widthMm;
        pieces.push({
          widthMm: Math.max(0, panelWidthMm(comp) - leftW - rightW),
          heightMm: Math.max(0, num(job.site.finishedHeightMm)),
          componentId: comp.id
        });
      } else if (comp.type === 'slider') {
        pieces.push({
          widthMm: Math.max(0, s.widthMm),
          heightMm: Math.max(0, s.heightMm),
          componentId: comp.id
        });
      }
    });
 
    return pieces;
  }
 
  function fitCountInSheet(
    sheet,
    piece
  ) {
    const a =
      Math.floor(
        sheet.lengthMm /
        piece.widthMm
      ) *
      Math.floor(
        sheet.widthMm /
        piece.heightMm
      );
 
    const b =
      Math.floor(
        sheet.lengthMm /
        piece.heightMm
      ) *
      Math.floor(
        sheet.widthMm /
        piece.widthMm
      );
 
    return Math.max(
      a,
      b,
      0
    );
  }
 
  function calculateMesh(
    surfaces
  ) {
    const cfg =
      CFG.cladding.galvMesh50;
 
    const pieces =
      meshPieces(surfaces)
        .filter(
          (p) =>
            p.widthMm > 0 &&
            p.heightMm > 0
        );
 
    const areaM2 =
      pieces.reduce(
        (sum, p) =>
          sum +
          (
            p.widthMm /
            1000
          ) *
          (
            p.heightMm /
            1000
          ),
        0
      );
 
    const materialCostExGST =
      areaM2 *
      cfg.pricePerM2;
 
    const order = [];
 
    pieces.forEach(
      (piece) => {
        let best = null;
 
        cfg.sheets.forEach(
          (sheet) => {
            const capacity =
              fitCountInSheet(
                sheet,
                piece
              );
 
            if (
              capacity < 1
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
              (o) =>
                o.key ===
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
              (o) =>
                `${Math.ceil(
                  o.pieces /
                  o.capacity
                )} × ${o.label}`
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
 
  function calculateCustomCladding(
    areaM2
  ) {
    const c =
      job.cladding.custom;
 
    let materialCost = 0;
 
    if (
      c.costingMode ===
      'quantity_unit'
    ) {
      materialCost =
        Math.max(
          0,
          num(c.quantity)
        ) *
        Math.max(
          0,
          num(c.unitCost)
        );
    } else {
      materialCost =
        Math.max(
          0,
          num(c.totalCost)
        );
    }
 
    return {
      materialCostExGST:
        gstExclusive(
          materialCost,
          c.priceIncludesGST
        ),
 
      labourRatePerM2:
        Math.max(
          0,
          num(
            c.labourRatePerM2
          )
        ),
 
      orderText:
        c.name ||
        'Custom material'
    };
  }
 
  function calculateCladding(surfaces) {
    const type = job.cladding.type;
    const cfg = CFG.cladding[type];
    const areaM2 = claddingAreaM2(surfaces);
 
    let detail = {};
    let materialCostExGST = 0;
    let labourRatePerM2 = num(cfg?.labourRatePerM2);
    let directSellExGST = 0;
 
    if (['ekodeck', 'cypressPickets', 'losp90', 'losp140', 'merbau90', 'merbau140'].includes(type)) {
      detail = calculateBoardCladding(cfg, surfaces);
      materialCostExGST = detail.materialCostExGST;
    } else if (type === 'treatedPinePalings') {
      detail = calculatePine(surfaces);
      materialCostExGST = detail.materialCostExGST;
    } else if (type === 'galvMesh50') {
      detail = calculateMesh(surfaces);
      materialCostExGST = detail.materialCostExGST;
    } else if (type === 'colorbond') {
      materialCostExGST = areaM2 * gstExclusive(
        cfg.rawMaterialRatePerM2,
        cfg.rawMaterialPriceIncludesGST
      );
      directSellExGST = areaM2 * gstExclusive(
        cfg.installedRatePerM2,
        cfg.installedRateIncludesGST
      );
      labourRatePerM2 = 0;
 
      const finishedCoverMm = Math.max(1, num(cfg.finishedCoverMm, 800));
      const sheetWidthMm = Math.max(finishedCoverMm, num(cfg.sheetWidthMm, 890));
      const sheetGroups = new Map();
      let totalSheets = 0;
 
      surfaces.forEach(surface => {
        const vertical = job.cladding.direction === 'vertical';
        const coverDimensionMm = vertical
          ? Math.max(0, num(surface.widthMm))
          : Math.max(0, num(surface.heightMm));
        const cutLengthMm = vertical
          ? Math.max(0, num(surface.heightMm))
          : Math.max(0, num(surface.widthMm));
 
        if (!coverDimensionMm || !cutLengthMm) return;
 
        const sheetCount = Math.ceil(coverDimensionMm / finishedCoverMm);
        const roundedCut = Math.ceil(cutLengthMm);
        totalSheets += sheetCount;
        sheetGroups.set(roundedCut, (sheetGroups.get(roundedCut) || 0) + sheetCount);
      });
 
      const sheetOrderLines = [...sheetGroups.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([cutLengthMm, qty]) =>
          `${qty} sheet${qty === 1 ? '' : 's'} @ ${cutLengthMm}mm long`
        );
 
      const screwLinealM = surfaces.reduce(
        (sum, surface) => sum + Math.max(0, num(surface.widthMm)) / 1000,
        0
      );
      const screwAllowanceExGST = screwLinealM * num(cfg.screwAllowancePerLinealMExGST, 3);
 
      detail = {
        orderText: `${sheetOrderLines.join(' + ') || 'No sheets calculated'} | ${sheetWidthMm}mm sheet width, ${finishedCoverMm}mm finished cover | ${job.cladding.profile || 'Colorbond'} - ${job.cladding.colour || 'select colour'}`,
        installedRatePerM2: cfg.installedRatePerM2,
        directSellExGST,
        screwLinealM,
        screwAllowanceExGST,
        totalSheets,
        sheetWidthMm,
        finishedCoverMm,
        sheetOrderLines
      };
 
      materialCostExGST += screwAllowanceExGST;
      directSellExGST += screwAllowanceExGST;
    } else if (type === 'custom') {
      detail = calculateCustomCladding(areaM2);
      materialCostExGST = detail.materialCostExGST;
      labourRatePerM2 = detail.labourRatePerM2;
    }
 
    return {
      type,
      config: cfg,
      areaM2,
      materialCostExGST,
      labourRatePerM2,
      labourCostExGST: areaM2 * labourRatePerM2,
      directSellExGST,
      detail
    };
  }
 
  /* =======================================================
     POSTS / STEEL / LABOUR CALCULATIONS
     ======================================================= */
 
  function collectPhysicalPosts() {
    const posts = [];
    const labels = componentDisplayLabels();
 
    job.components.forEach(c => {
      if (c.type === 'post') {
        posts.push({ ownerId: c.id, ownerLabel: labels[c.id], side: '', role: c.catchForSliderId ? 'external_slider_catch' : 'post', catchForSliderId: c.catchForSliderId || '', post: c });
      }
 
      if (c.type === 'fixedPanel') {
        posts.push({ ownerId: c.id, ownerLabel: labels[c.id], side: 'Left', role: c.catchForSliderId && c.catchPostSide === 'left' ? 'external_slider_catch' : 'panel', catchForSliderId: c.catchForSliderId || '', post: c.leftPost });
        posts.push({ ownerId: c.id, ownerLabel: labels[c.id], side: 'Right', role: c.catchForSliderId && c.catchPostSide !== 'left' ? 'external_slider_catch' : 'panel', catchForSliderId: c.catchForSliderId || '', post: c.rightPost });
      }
 
      if (c.type === 'slider') {
        setSliderSubPostHeights(c);
 
        if (c.includeCatchPost) {
          posts.push({
            ownerId: c.id,
            ownerLabel: labels[c.id],
            side: 'Catch',
            role: 'slider_catch',
            post: c.catchPost
          });
        }
 
        if (c.includeRollerGuide) {
          posts.push({
            ownerId: c.id,
            ownerLabel: labels[c.id],
            side: 'Roller Guide Left',
            role: 'slider_guide_left',
            post: c.rollerGuide.leftPost
          });
          posts.push({
            ownerId: c.id,
            ownerLabel: labels[c.id],
            side: 'Roller Guide Right',
            role: 'slider_guide_right',
            post: c.rollerGuide.rightPost
          });
        }
      }
    });
 
    return posts;
  }
 
  function postLabour(post) {
    if (
      post.fixing ===
      'existing_structure'
    ) {
      return {
        fabrication: 0,
        installation: 0,
        drilling: 0
      };
    }
 
    const holes =
      Array.isArray(
        post.holePositionsMm
      )
        ? post.holePositionsMm.length
        : 0;
 
    if (
      post.fixing ===
      'baseplate'
    ) {
      return {
        fabrication: 0,
 
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
 
    let drilling = 0;
 
    /*
      Brick-fixed post:
      30 minute minimum, then 10 minutes per hole
      once the hole count exceeds the minimum.
    */
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
 
    /*
      Concreted next to house:
      retain normal post fabrication + concrete install,
      and add 10 minutes for every stabilising bolt/hole.
    */
    if (
      post.fixing ===
      'concrete_house'
    ) {
      drilling =
        holes *
        CFG.labour
          .drilledHoleHoursEach;
    }
 
    let installation = 0;
 
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
    const physicalPosts = collectPhysicalPosts();
    const byTypeLengths = {};
    let fabricationHours = 0;
    let installationHours = 0;
    let dynabolts = 0;
    let concretePosts = 0;
    let baseplates = 0;
    let baseplateAllowanceExGST = 0;
    let sliderSpecialAllowanceExGST = 0;
    const cutList = [];
 
    physicalPosts.forEach(item => {
      const p = item.post;
      const cutMm = postCutLengthMm(p);
      const holes = Array.isArray(p.holePositionsMm) ? p.holePositionsMm.length : 0;
      const labour = postLabour(p);
 
      fabricationHours += labour.fabrication + labour.drilling;
      if (!String(item.role || '').startsWith('slider_')) {
        installationHours += labour.installation;
      }
      dynabolts += holes;
 
      if (p.fixing === 'concrete_house' || p.fixing === 'concrete_floating') concretePosts += 1;
 
      if (p.fixing === 'baseplate') {
        baseplates += 1;
        baseplateAllowanceExGST += CFG.fixings.baseplate.fabricationAllowanceExGST;
      }
 
      if (p.fixing !== 'existing_structure' && cutMm > 0) {
        byTypeLengths[p.postType] = (byTypeLengths[p.postType] || 0) + cutMm / 1000;
      }
 
      cutList.push({
        label: `${item.ownerLabel}${item.side ? ` - ${item.side}` : ''}${item.role === 'external_slider_catch' ? ' - Slider Catch' : ''}`,
        postType: p.postType,
        cutLengthMm: cutMm,
        fixing: p.fixing,
        role: item.role,
        holes: [...(p.holePositionsMm || [])].sort((a, b) => a - b)
      });
    });
 
    job.components.filter(c => c.type === 'slider').forEach(slider => {
      if (slider.includeRollerGuide) {
        const topMaterialMm = Math.max(
          CFG.slider.rollerGuideTopMinimumMaterialMm,
          num(slider.rollerGuide.topWidthMm)
        );
        const extraMm = topMaterialMm + CFG.slider.rollerGuideWasteAllowanceMm;
        const type = CFG.slider.rollerGuidePostType;
        byTypeLengths[type] = (byTypeLengths[type] || 0) + extraMm / 1000;
        sliderSpecialAllowanceExGST += CFG.hardware.slider.rollerGuideTopFabricationAllowanceExGST;
        cutList.push({
          label: `${componentDisplayLabels()[slider.id]} - Roller Guide Top`,
          postType: type,
          cutLengthMm: topMaterialMm,
          fixing: 'fabricated_top',
          role: 'slider_guide_top',
          holes: [],
          materialAllowanceMm: extraMm
        });
      }
 
      if (slider.includeCatchPost) {
        sliderSpecialAllowanceExGST += CFG.hardware.slider.catchFabricationAllowanceExGST;
      }
    });
 
    const validSliderIds = new Set(
      job.components.filter(c => c.type === 'slider').map(c => c.id)
    );
 
    job.components.forEach(c => {
      if (
        (c.type === 'post' || c.type === 'fixedPanel') &&
        c.catchForSliderId &&
        validSliderIds.has(c.catchForSliderId)
      ) {
        sliderSpecialAllowanceExGST += CFG.hardware.slider.catchFabricationAllowanceExGST;
      }
    });
 
    let steelCostExGST = 0;
    const steelOrders = [];
    const cutsByType = {};
    cutList.forEach(item => {
      if (!item.postType || item.fixing === 'existing_structure') return;
      const materialMm = Math.max(0, num(item.materialAllowanceMm || item.cutLengthMm));
      if (!materialMm) return;
      if (!cutsByType[item.postType]) cutsByType[item.postType] = [];
      cutsByType[item.postType].push(materialMm);
    });
 
    Object.entries(cutsByType).forEach(([type, cutsMm]) => {
      const cfg = postConfig(type);
      const packed = packStockCuts(cutsMm, cfg.stockLengthM);
      const costExGST = packed.qty * gstExclusive(cfg.pricePerStockLength, cfg.priceIncludesGST);
      steelCostExGST += costExGST;
      steelOrders.push({ type, label: cfg.label, lengthM: packed.totalCutM, stockQty: packed.qty, stockLengthM: cfg.stockLengthM, costExGST, stockPlan: packed.bins });
    });
 
    const dynaboltCostExGST = dynabolts * gstExclusive(
      CFG.fixings.dynabolt.priceEach,
      CFG.fixings.dynabolt.priceIncludesGST
    );
 
    const concreteBags = concretePosts * CFG.concrete.defaultBagsPerPost;
    const concreteCostExGST = concreteBags * gstExclusive(
      CFG.concrete.pricePerBag,
      CFG.concrete.priceIncludesGST
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
      sliderSpecialAllowanceExGST,
      steelCostExGST,
      steelOrders,
      cutList
    };
  }
 
  function calculateFrames(gateWidths) {
    const lengthsByType = {};
    const cutsByType = {};
    const cutList = [];
    const sliderHardware = [];
    let gateFabricationHours = 0;
    let gateInstallHours = 0;
    let panelFabricationHours = 0;
    let panelInstallHours = 0;
    let sliderFabricationHours = 0;
    let sliderInstallHours = 0;
    let hingeSets = 0;
    let latchCostExGSTTotal = 0;
    let sliderHardwareCostExGST = 0;
    let sliderTrackCostExGST = 0;
    let screwItems = 0;
    const labels = componentDisplayLabels();
    const gateHeight = gateFrameHeightMm();
    const chargedDoublePairs = new Set();
 
    const addCut = (type, lengthMm) => {
      const value = Math.max(0, num(lengthMm));
      if (!value) return;
      if (!cutsByType[type]) cutsByType[type] = [];
      cutsByType[type].push(value);
      lengthsByType[type] = (lengthsByType[type] || 0) + value / 1000;
    };
 
    job.components.forEach(c => {
      if (c.type === 'gate') {
        const width = Math.max(0, num(gateWidths[c.id]));
        const railCount = clamp(parseInt(c.internalRailCount, 10) || 0, 0, CFG.rails.gate.maximumInternalRailCount);
        const railLength = railCutLengthForGate(c, width, gateHeight);
        addCut(c.frameType, width); addCut(c.frameType, width);
        addCut(c.frameType, gateHeight); addCut(c.frameType, gateHeight);
        for (let i = 0; i < railCount; i += 1) addCut(c.frameType, railLength);
 
        gateFabricationHours += CFG.labour.gateFabricationHoursEach;
        gateInstallHours += CFG.labour.hangGateHoursEach;
        hingeSets += 1;
 
        const isDouble = c.relationship === 'double' && c.doublePairId;
        if (!isDouble || !chargedDoublePairs.has(c.doublePairId)) {
          latchCostExGSTTotal += latchCostExGST(c.latchType);
          if (isDouble) chargedDoublePairs.add(c.doublePairId);
        }
        screwItems += 1;
 
        cutList.push({ componentId: c.id, label: labels[c.id], type: 'gate', frameType: c.frameType, widthMm: width, heightMm: gateHeight, railCount, railLengthMm: railLength, railOrientation: job.cladding.direction === 'horizontal' ? 'vertical' : 'horizontal', hingeSide: c.hingeSide, latchType: c.latchType, doublePairId: c.doublePairId || '', relationship: c.relationship || 'single' });
      }
 
      if (c.type === 'fixedPanel') {
        const width = panelWidthMm(c);
        const height = Math.max(0, num(job.site.finishedHeightMm));
        const rails = panelRailsUsed(c).map(rail => {
          const lengthMm = rail.lengthMode === 'manual' ? Math.max(0, num(rail.manualLengthMm)) : panelRailAutoLengthMm(c, rail);
          const steelType = rail.steelType || CFG.defaults.frameType;
          addCut(steelType, lengthMm);
          return { ...rail, steelType, lengthMm };
        });
        panelFabricationHours += CFG.labour.fixedPanelFabricationHoursEach;
        panelInstallHours += CFG.labour.fixedPanelInstallHoursEach;
        screwItems += 1;
        cutList.push({ componentId: c.id, label: labels[c.id], type: 'fixedPanel', widthMm: width, heightMm: height, rails });
      }
 
      if (c.type === 'slider') {
        const openingWidthMm = sliderOpeningWidthMm(c);
        const manufacturedLengthMm = sliderManufacturedLengthMm(c);
        const gateBodyWidthMm = sliderGateBodyWidthMm(c);
        const frameHeightMm = sliderFrameHeightMm();
        const topLengthMm = c.overhangMode === 'full_gate' ? manufacturedLengthMm : openingWidthMm;
        const bottomLengthMm = manufacturedLengthMm;
        const endLengthMm = frameHeightMm;
        addCut(c.bottomFrameType, bottomLengthMm);
        addCut(c.topFrameType, topLengthMm);
        addCut(c.endFrameType, endLengthMm); addCut(c.endFrameType, endLengthMm);
 
        const rails = (c.internalRails || []).map(rail => {
          const lengthMm = rail.lengthMode === 'manual' ? Math.max(0, num(rail.manualLengthMm)) : sliderRailAutoLengthMm(c, rail);
          addCut(c.internalRailType, lengthMm);
          return { ...rail, lengthMm };
        });
 
        const manufacturedM = manufacturedLengthMm / 1000;
        sliderFabricationHours += manufacturedM * (CFG.slider.fabricationMinutesPerM / 60);
        sliderInstallHours += manufacturedM * CFG.slider.installationHoursPerM;
        const wheelQty = Math.max(0, parseInt(c.wheelQty, 10) || 0);
        const guideQty = Math.max(0, parseInt(c.guideRollerQty, 10) || 0);
        const trackRequiredM = sliderTrackRequiredM(c);
        const trackStockQty = trackRequiredM > 0 ? Math.ceil(trackRequiredM / CFG.hardware.slider.track.stockLengthM) : 0;
        const wheelCost = wheelQty * CFG.hardware.slider.wheel.priceEachExGST;
        const guideCost = guideQty * CFG.hardware.slider.guideRollerSet.priceEachExGST;
        const trackCost = trackStockQty * CFG.hardware.slider.track.pricePerStockLengthExGST;
        const sliderLatch = latchCostExGST(c.latchType);
        sliderHardwareCostExGST += wheelCost + guideCost + sliderLatch;
        sliderTrackCostExGST += trackCost;
        sliderHardware.push({ componentId: c.id, label: labels[c.id], wheelQty, guideQty, latchType: c.latchType, trackRequiredM, trackStockQty, trackCostExGST: trackCost, rails, openingWidthMm, manufacturedLengthMm, gateBodyWidthMm, frameHeightMm, cladding: sliderCladdingDimensions(c) });
        screwItems += 1;
        cutList.push({ componentId: c.id, label: labels[c.id], type: 'slider', openingWidthMm, manufacturedLengthMm, gateBodyWidthMm, frameHeightMm, topLengthMm, bottomLengthMm, endLengthMm, topFrameType: c.topFrameType, bottomFrameType: c.bottomFrameType, endFrameType: c.endFrameType, internalRailType: c.internalRailType, rails, slideDirection: c.slideDirection, latchType: c.latchType });
      }
    });
 
    let steelCostExGST = 0;
    const steelOrders = [];
    Object.entries(cutsByType).forEach(([type, cutsMm]) => {
      const cfg = frameConfig(type);
      const packed = packStockCuts(cutsMm, cfg.stockLengthM);
      const costExGST = packed.qty * gstExclusive(cfg.pricePerStockLength, cfg.priceIncludesGST);
      steelCostExGST += costExGST;
      steelOrders.push({ type, label: cfg.label, lengthM: packed.totalCutM, stockQty: packed.qty, stockLengthM: cfg.stockLengthM, costExGST, stockPlan: packed.bins, cutsMm: [...cutsMm] });
    });
 
    const hingeCostExGST = hingeSets * gstExclusive(CFG.hardware.hinges.lockout.pricePerSet, CFG.hardware.hinges.lockout.priceIncludesGST);
    const screwCostExGST = job.cladding.type === 'colorbond' ? 0 : screwItems * gstExclusive(CFG.fixings.screws.defaultPerItem, CFG.fixings.screws.priceIncludesGST);
 
    return { lengthsByType, steelCostExGST, steelOrders, gateFabricationHours, gateInstallHours, panelFabricationHours, panelInstallHours, sliderFabricationHours, sliderInstallHours, hingeSets, hingeCostExGST, latchCostExGST: latchCostExGSTTotal, sliderHardwareCostExGST, sliderTrackCostExGST, sliderHardware, screwItems, screwCostExGST, cutList };
  }
 
  function calculatePowder(posts, frames) {
    if (!job.powder.enabled) {
      let areaM2 = 0;
 
      posts.physicalPosts.forEach(({ post }) => {
        if (post.fixing === 'existing_structure') return;
        const cfg = postConfig(post.postType);
        const l = postCutLengthMm(post) / 1000;
        areaM2 += l * (((cfg.widthMm + cfg.depthMm) * 2) / 1000);
      });
 
      frames.cutList.forEach(item => {
        if (item.type === 'gate') {
          const cfg = frameConfig(item.frameType);
          const perimeterM = (item.widthMm * 2 + item.heightMm * 2 + item.railCount * item.railLengthMm) / 1000;
          areaM2 += perimeterM * (((cfg.widthMm + cfg.depthMm) * 2) / 1000);
        }
 
        if (item.type === 'fixedPanel' && item.rails?.length) {
          item.rails.forEach(rail => {
            const cfg = frameConfig(rail.steelType);
            areaM2 += (rail.lengthMm / 1000) * (((cfg.widthMm + cfg.depthMm) * 2) / 1000);
          });
        }
 
        if (item.type === 'slider') {
          const parts = [
            [item.bottomFrameType, item.bottomLengthMm],
            [item.topFrameType, item.topLengthMm],
            [item.endFrameType, item.endLengthMm * 2]
          ];
          item.rails.forEach(r => parts.push([item.internalRailType, r.lengthMm]));
          parts.forEach(([type, lengthMm]) => {
            const cfg = frameConfig(type);
            areaM2 += (lengthMm / 1000) * (((cfg.widthMm + cfg.depthMm) * 2) / 1000);
          });
        }
      });
 
      const costExGST = areaM2 * gstExclusive(
        CFG.finishing.duragalvTouchUp.ratePerM2,
        CFG.finishing.duragalvTouchUp.priceIncludesGST
      );
 
      return {
        enabled: false,
        postsExGST: 0,
        framesExGST: 0,
        travelExGST: 0,
        touchUpExGST: costExGST,
        totalExGST: costExGST,
        areaM2
      };
    }
 
    let postCost = 0;
    posts.physicalPosts.forEach(({ post }) => {
      if (post.fixing === 'existing_structure') return;
      const rate = num(CFG.powderCoating.postRatePerLm[post.postType]);
      postCost += (postCutLengthMm(post) / 1000) * rate;
    });
 
    let frameArea = 0;
    frames.cutList.forEach(item => {
      if (item.type === 'gate') frameArea += (item.widthMm / 1000) * (item.heightMm / 1000);
      if (item.type === 'fixedPanel' && item.rails?.length) frameArea += (item.widthMm / 1000) * (item.heightMm / 1000);
      if (item.type === 'slider') frameArea += (item.gateBodyWidthMm / 1000) * (item.frameHeightMm / 1000);
    });
 
    const framesExGST = frameArea * CFG.powderCoating.openFrameRatePerM2;
    const travelExGST = CFG.powderCoating.jobTravelAllowanceExGST;
 
    return {
      enabled: true,
      postsExGST: postCost,
      framesExGST,
      travelExGST,
      touchUpExGST: 0,
      totalExGST: postCost + framesExGST + travelExGST,
      frameAreaM2: frameArea
    };
  }
 
  function calculateTravel() {
    const oneWay =
      Math.max(
        0,
        num(
          job.site
            .oneWayTravelKm
        )
      );
 
    const roundTrip =
      oneWay *
      2;
 
    const chargeableKm =
      Math.max(
        0,
        roundTrip -
          CFG.business
            .includedTravelKm
      );
 
    return {
      oneWayKm:
        oneWay,
 
      roundTripKm:
        roundTrip,
 
      chargeableKm,
 
      costExGST:
        chargeableKm *
        CFG.business
          .travelRatePerKm
    };
  }
 
  /* =======================================================
     MASTER CALCULATION
     ======================================================= */
 
  function calculateJob() {
    const gateWidths = calculateGateWidths();
    const surfaces = cladSurfaces(gateWidths);
    const posts = calculatePosts();
    const frames = calculateFrames(gateWidths);
    const cladding = calculateCladding(surfaces);
    const powder = calculatePowder(posts, frames);
    const travel = calculateTravel();
 
    const fabricationAutoHours =
      frames.gateFabricationHours +
      frames.panelFabricationHours +
      frames.sliderFabricationHours +
      posts.fabricationHours;
 
    const installationAutoHours =
      frames.gateInstallHours +
      frames.panelInstallHours +
      frames.sliderInstallHours +
      posts.installationHours;
 
    const fabricationTotalHours = fabricationAutoHours + Math.max(0, num(job.labour.additionalFabricationHours));
    const installationTotalHours = installationAutoHours + Math.max(0, num(job.labour.additionalInstallHours));
    const coreLabourHours = fabricationTotalHours + installationTotalHours;
    const coreLabourCostExGST = coreLabourHours * CFG.business.labourRate;
    const claddingLabourCostExGST = cladding.labourCostExGST;
    const labourCostExGST = coreLabourCostExGST + claddingLabourCostExGST;
 
    const materialsBeforeMarkupExGST =
      posts.steelCostExGST +
      frames.steelCostExGST +
      posts.dynaboltCostExGST +
      posts.concreteCostExGST +
      posts.baseplateAllowanceExGST +
      posts.sliderSpecialAllowanceExGST +
      frames.hingeCostExGST +
      frames.latchCostExGST +
      frames.sliderHardwareCostExGST +
      frames.sliderTrackCostExGST +
      frames.screwCostExGST +
      cladding.materialCostExGST;
 
    /* Colorbond $50/m² is a supply-and-install sell rate, so do not add the normal material markup to that installed rate. */
    const markupBaseExGST = Math.max(0, materialsBeforeMarkupExGST - cladding.materialCostExGST) +
      (cladding.type === 'colorbond' ? 0 : cladding.materialCostExGST);
    const materialMarkupExGST = markupBaseExGST * CFG.business.materialMarkup;
 
    const sellExGST =
      materialsBeforeMarkupExGST +
      materialMarkupExGST +
      labourCostExGST +
      travel.costExGST +
      powder.totalExGST +
      cladding.directSellExGST -
      (cladding.type === 'colorbond' ? cladding.materialCostExGST : 0);
 
    const autoIncGSTUnrounded = sellExGST * (1 + CFG.business.gst);
    const autoIncGST = ceilTo(autoIncGSTUnrounded, CFG.business.roundTo);
 
    const finalIncGST = job.quote.mode === 'manual' && Number.isFinite(Number(job.quote.manualIncGST))
      ? Math.max(0, num(job.quote.manualIncGST))
      : autoIncGST;
 
    const finalExGST = finalIncGST / (1 + CFG.business.gst);
    const finalGST = finalIncGST - finalExGST;
 
    const actualCostExGST = materialsBeforeMarkupExGST + labourCostExGST + travel.costExGST + powder.totalExGST;
    const profitExGST = finalExGST - actualCostExGST;
    const cavityAreaM2 = (Math.max(0, num(job.site.cavityWidthMm)) / 1000) * (Math.max(0, num(job.site.finishedHeightMm)) / 1000);
    const effectiveRate = cavityAreaM2 > 0 ? finalIncGST / cavityAreaM2 : 0;
    const layout = calculateLayoutStatus(gateWidths);
 
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
        totalCostExGST: labourCostExGST
      },
      costing: {
        materialsBeforeMarkupExGST,
        materialMarkupExGST,
        labourCostExGST,
        travelExGST: travel.costExGST,
        finishExGST: powder.totalExGST,
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
          (c) =>
            c.type !==
            'gate'
        )
        .reduce(
          (sum, c) =>
            sum +
            componentOccupiedWidthMm(
              c
            ),
          0
        );
 
    const gateWidth =
      job.components
        .filter(
          (c) =>
            c.type ===
            'gate'
        )
        .reduce(
          (sum, c) =>
            sum +
            Math.max(
              0,
              num(
                gateWidths[
                  c.id
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
        (c) =>
          c.type ===
            'gate' &&
          c.widthMode !==
            'manual'
      );
 
    const unrelatedAutoAmbiguous =
      autoGates.length > 1 &&
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
        cavity > 0 &&
        Math.abs(
          difference
        ) < 1 &&
        !unrelatedAutoAmbiguous
    };
  }
 
  /* =======================================================
     COMPLETION STATUS
     ======================================================= */
 
  function componentComplete(c) {
    if (c.type === 'post') {
      if (!c.postType || !c.fixing) return false;
      if (c.heightMode === 'manual' && num(c.manualFinishedHeightMm) <= 0) return false;
      return true;
    }
 
    if (c.type === 'gate') {
      if (!c.frameType || !c.hingeSide || !c.openDirection) return false;
      if (c.widthMode === 'manual' && num(c.manualWidthMm) <= 0) return false;
      if (c.relationship === 'double' && !c.doublePairId) return false;
      return true;
    }
 
    if (c.type === 'fixedPanel') {
      if (num(c.widthMm) <= 0) return false;
      if (!c.leftPost?.postType || !c.leftPost?.fixing || !c.rightPost?.postType || !c.rightPost?.fixing) return false;
      return true;
    }
 
    if (c.type === 'slider') {
      return sliderOpeningWidthMm(c) > 0 && sliderFrameHeightMm() > 0;
    }
 
    return false;
  }
 
  /* =======================================================
     RENDER MASTER
     ======================================================= */
 
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
 
  /* =======================================================
     HEADER / NAV
     ======================================================= */
 
  function ensureHeaderQuoteTotal() {
    const undoBtn =
      $('#undo-btn');
 
    if (!undoBtn) {
      return;
    }
 
    let wrapper =
      $('#undo-quote-wrap');
 
    if (!wrapper) {
      wrapper =
        document.createElement(
          'div'
        );
 
      wrapper.id =
        'undo-quote-wrap';
 
      wrapper.style.cssText =
        'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;margin-top:7px;';
 
      undoBtn.parentNode.insertBefore(
        wrapper,
        undoBtn
      );
 
      wrapper.appendChild(
        undoBtn
      );
 
      const total =
        document.createElement(
          'div'
        );
 
      total.id =
        'header-current-quote';
 
      total.style.cssText =
        'font-weight:800;color:#1f7a3d;font-size:18px;line-height:1;white-space:nowrap;';
 
      wrapper.appendChild(
        total
      );
    }
 
    undoBtn.style.marginTop =
      '4px';
  }
 
  function hideMetricById(id) {
    const el =
      document.getElementById(
        id
      );
 
    if (!el) {
      return;
    }
 
    const parent =
      el.closest(
        '.quote-metric, .metric, .summary-item, .stat, .field-group'
      );
 
    if (
      parent &&
      !parent.classList.contains(
        'app-section'
      )
    ) {
      parent.style.display =
        'none';
    } else {
      el.style.display =
        'none';
    }
  }
 
  function ensureSendQuoteUi() {
    const quoteTab =
      $('.nav-tab[data-section-target="quote"]');
 
    if (quoteTab) {
      quoteTab.textContent =
        'SEND QUOTE';
    }
 
    const quoteSection =
      $('[data-section="quote"]');
 
    if (quoteSection) {
      const heading =
        quoteSection.querySelector(
          'h1, h2, .section-title, .card-title'
        );
 
      if (
        heading &&
        heading.textContent
          .trim()
          .toLowerCase() ===
          'quote'
      ) {
        heading.textContent =
          'Send Quote';
      }
    }
 
    const emailButton =
      $('[data-action="copy-email"]');
 
    if (emailButton) {
      emailButton.textContent =
        'Send Email';
    }
 
    const smsButton =
      $('[data-action="copy-sms"]');
 
    if (smsButton) {
      smsButton.textContent =
        'Send SMS';
    }
 
    /*
      Remove the large letterhead/finished-quote preview,
      but leave the Email and SMS review areas visible.
    */
    const previewStart =
      $('#finished-quote-reference');
 
    if (previewStart) {
      let node =
        previewStart.parentElement;
 
      const emailBody =
        $('#email-body');
 
      while (
        node &&
        node !== quoteSection
      ) {
        const hasProject =
          !!node.querySelector(
            '#quote-project-description'
          );
 
        const hasPrice =
          !!node.querySelector(
            '#quote-price-inc-gst'
          );
 
        const containsEmail =
          emailBody
            ? node.contains(
                emailBody
              )
            : false;
 
        if (
          hasProject &&
          hasPrice &&
          !containsEmail
        ) {
          node.style.display =
            'none';
 
          break;
        }
 
        node =
          node.parentElement;
      }
    }
 
    hideMetricById(
      'quote-profit'
    );
 
    hideMetricById(
      'quote-effective-rate'
    );
  }
 
 
  function ensureSliderUi() {
    const addButtons = $$('[data-action="add-component"]');
    const gateButton = addButtons.find(btn => btn.dataset.componentType === 'gate');
 
    if (gateButton && !document.querySelector('[data-component-type="slider"]')) {
      const sliderButton = gateButton.cloneNode(true);
      sliderButton.dataset.componentType = 'slider';
      sliderButton.textContent = 'Sliding Gate';
      sliderButton.title = 'Add sliding gate';
      gateButton.insertAdjacentElement('afterend', sliderButton);
    }
 
    const sliderButton = document.querySelector('[data-component-type="slider"]');
    const hasSlider = sliderComponents().length > 0;
 
    if (sliderButton && !document.querySelector('[data-component-type="catchPost"]')) {
      const catchPostButton = gateButton.cloneNode(true);
      catchPostButton.dataset.componentType = 'catchPost';
      catchPostButton.textContent = 'Catch Post';
      catchPostButton.title = 'Add post as slider catch';
      catchPostButton.classList.add('slider-catch-add');
      sliderButton.insertAdjacentElement('afterend', catchPostButton);
 
      const catchPanelButton = gateButton.cloneNode(true);
      catchPanelButton.dataset.componentType = 'catchFixedPanel';
      catchPanelButton.textContent = 'Catch Fixed Panel';
      catchPanelButton.title = 'Add fixed panel with slider catch';
      catchPanelButton.classList.add('slider-catch-add');
      catchPostButton.insertAdjacentElement('afterend', catchPanelButton);
    }
 
    $$('.slider-catch-add').forEach(btn => {
      btn.style.display = hasSlider ? '' : 'none';
    });
 
    if (!document.getElementById('jtla-slider-style')) {
      const style = document.createElement('style');
      style.id = 'jtla-slider-style';
      style.textContent = `
        .component-card.slider { border-left: 6px solid #b56b22; background: #fff8f0; }
        .mud-map-item.slider { background: #fff0df; border-color: #b56b22; min-width: 165px; }
        .slider-open-arrow { display:block; font-weight:800; color:#8a4d15; margin-top:4px; letter-spacing:.03em; }
        .slider-subgrid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
        .slider-rail-row { display:grid; grid-template-columns:110px 110px 130px 110px 1fr auto; gap:8px; align-items:end; margin:7px 0; }
        .slider-hardware-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }
        @media (max-width:700px) {
          .slider-subgrid,.slider-hardware-grid { grid-template-columns:1fr; }
          .slider-rail-row { grid-template-columns:1fr 1fr; }
        }
      `;
      document.head.appendChild(style);
    }
  }
 
  function renderHeader() {
    ensureHeaderQuoteTotal();
    ensureSendQuoteUi();
    ensureSliderUi();
 
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
 
    const total =
      $('#header-current-quote');
 
    if (
      total &&
      calculation
    ) {
      total.textContent =
        `$${Math.round(
          calculation.costing
            .finalIncGST
        )}`;
    }
  }
 
  function renderNavigation() {
    const active =
      job.ui.activeSection ||
      'site';
 
    $$('.nav-tab')
      .forEach(
        (btn) =>
          btn.classList.toggle(
            'active',
            btn.dataset
              .sectionTarget ===
              active
          )
      );
 
    $$('.app-section')
      .forEach(
        (section) =>
          section.classList.toggle(
            'active',
            section.dataset
              .section ===
              active
          )
      );
  }
 
  function navigate(section) {
    job.ui.activeSection =
      section;
 
    autosave();
    renderNavigation();
 
    window.scrollTo({
      top: 0,
      behavior: 'instant'
    });
  }
 
  /* =======================================================
     SITE
     ======================================================= */
 
  function setInputValue(
    selector,
    value
  ) {
    const el =
      $(selector);
 
    if (
      el &&
      document.activeElement !==
        el
    ) {
      el.value =
        value ?? '';
    }
  }
 
  function stepIntegerTravel(input) {
    input.step = '1';
    input.min = '0';
  }
 
  function renderSite() {
    setInputValue(
      '#site-cavity-width',
      job.site
        .cavityWidthMm || ''
    );
 
    setInputValue(
      '#site-finished-height',
      job.site
        .finishedHeightMm || ''
    );
 
    setInputValue(
      '#site-travel-km',
      job.site
        .oneWayTravelKm || ''
    );
 
    const travelInput = $('#site-travel-km');
    if (travelInput) stepIntegerTravel(travelInput);
 
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
 
    const activeComponent = selectedComponent();
    const sliderSelected = activeComponent?.type === 'slider';
 
    $('#site-ground-gap-display')
      .textContent =
      mm(
        sliderSelected
          ? CFG.slider.groundTrackClearanceMm
          : CFG.fabrication.gateGroundGapMm
      );
 
    $('#site-gate-gap-display')
      .textContent =
      mm(
        sliderSelected
          ? 0
          : CFG.fabrication.gateSideGapMm * 2
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
 
  /* =======================================================
     MUD MAP
     ======================================================= */
 
  function gateMudMapImage(c) {
    if (c.type !== 'gate') return '';

    const railCount = Math.max(
      0,
      Math.round(num(c.internalRailCount))
    );

    const railOrientation =
      job.cladding.direction === 'horizontal'
        ? 'vertical'
        : 'horizontal';

    if (
      railCount === 1 &&
      railOrientation === 'vertical' &&
      c.hingeSide === 'left'
    ) {
      return 'gate-images/examples/swing-mid-vertical.svg';
    }

    return '';
  }

  function renderMudMap() {
    const root = $('#mud-map');
    const labels = componentDisplayLabels();
 
    if (!job.components.length) {
      root.innerHTML = '<div class="empty-state">Add a Post, Gate, Sliding Gate or Fixed Panel below.</div>';
      return;
    }
 
    root.innerHTML = job.components.map(c => {
      const selected = c.id === job.selectedComponentId ? ' selected' : '';
      const complete = componentComplete(c);
      const cls = c.type === 'fixedPanel' ? 'fixed-panel' : c.type;
      let dims = '';
      let hinge = '';
      let extraClass = '';
      let relationship = '';
      let sliderArrow = '';
      let componentImage = '';
 
      if (c.type === 'post') {
        const fixingLabel = String(CFG.postFixings[c.fixing]?.label || c.fixing || '')
          .replace(/\.$/, '');
        dims = c.fixing === 'existing_structure'
          ? `Existing · ${fixingLabel}${c.catchForSliderId ? ' · CATCH' : ''}`
          : `${Math.round(postCutLengthMm(c))}mm · ${fixingLabel}${c.catchForSliderId ? ' · CATCH' : ''}`;
      }
 
      if (c.type === 'gate') {
        const w = calculation.gateWidths[c.id] || 0;
        const h = gateFrameHeightMm();
        dims = `${Math.round(w)} × ${Math.round(h)}mm`;
        hinge = `<span class="mud-map-hinge ${c.hingeSide}">H</span>`;
        extraClass = c.hingeSide === 'right' ? ' hinge-right' : '';
        if (c.relationship === 'double' && c.doublePairId) relationship = '<span class="mud-map-double">DOUBLE</span>';

        const imagePath = gateMudMapImage(c);

        if (imagePath) {
          componentImage = `
            <img
              src="${imagePath}"
              alt=""
              style="
                display:block;
                width:100%;
                height:95px;
                object-fit:contain;
                margin:6px 0 4px;
              "
            >
          `;

          hinge = '';
        }
      }
 
      if (c.type === 'slider') {
        dims = `${Math.round(sliderManufacturedLengthMm(c))} × ${Math.round(sliderFrameHeightMm())}mm`;
        sliderArrow = c.slideDirection === 'left'
          ? '<span class="slider-open-arrow">← TO OPEN</span>'
          : '<span class="slider-open-arrow">TO OPEN →</span>';
      }
 
      if (c.type === 'fixedPanel') {
        dims = `${Math.round(panelWidthMm(c))} × ${Math.round(num(job.site.finishedHeightMm))}mm${c.catchForSliderId ? ` · CATCH ${c.catchPostSide === 'left' ? 'L' : 'R'}` : ''}`;
      }
 
      return `
        <div class="mud-map-item ${cls}${selected}${extraClass}" data-action="select-component" data-component-id="${safe(c.id)}" role="button" tabindex="0">
          ${hinge}
          <button type="button" class="mud-map-delete" data-action="delete-component" data-component-id="${safe(c.id)}" aria-label="Delete ${safe(labels[c.id])}" title="Delete ${safe(labels[c.id])}">×</button>
          <span class="mud-map-status${complete ? ' complete' : ''}"></span>
          <span class="mud-map-name">${safe(labels[c.id])}</span>
          ${relationship}
          ${componentImage}
          <span class="mud-map-dimensions">${safe(dims)}</span>
          ${sliderArrow}
        </div>`;
    }).join('');
  }
 
  /* =======================================================
     COMPONENT EDITORS
     ======================================================= */
 
  function optionsFromObject(
    obj,
    selected
  ) {
    return Object.entries(obj)
      .map(
        ([key, cfg]) =>
          `<option value="${safe(key)}" ${key === selected ? 'selected' : ''}>${safe(cfg.label)}</option>`
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
        ([key, cfg]) =>
          `<option value="${safe(key)}" ${key === selected ? 'selected' : ''}>${safe(cfg.label)}</option>`
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
        ...(post.holePositionsMm || [])
      ].sort(
        (a, b) =>
          a - b
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
                    (p) => `
                      <div class="required-material-row">
 
                        <span>
                          ${Math.round(p)} mm from top
                        </span>
 
                        <button
                          type="button"
                          class="secondary-btn"
                          data-action="delete-hole"
                          data-component-id="${safe(ownerId)}"
                          data-hole="${p}"
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
 
  function componentToolbar(c) {
    const index =
      job.components.findIndex(
        (x) =>
          x.id === c.id
      );
 
    return `
      <div class="component-toolbar">
 
        <button
          type="button"
          data-action="move-component-left"
          data-component-id="${safe(c.id)}"
          ${index === 0 ? 'disabled' : ''}
        >
          ←
        </button>
 
        <button
          type="button"
          data-action="move-component-right"
          data-component-id="${safe(c.id)}"
          ${index === job.components.length - 1 ? 'disabled' : ''}
        >
          →
        </button>
 
        <button
          type="button"
          class="delete"
          data-action="delete-component"
          data-component-id="${safe(c.id)}"
        >
          Delete
        </button>
 
      </div>
    `;
  }
 
  function renderPostEditor(
    c,
    label
  ) {
    const needsHoles =
      c.fixing ===
        'fixed_brick' ||
      c.fixing ===
        'concrete_house' ||
      c.fixing ===
        'baseplate';
 
    return `
      <div
        id="component-card-${safe(c.id)}"
        class="card component-card post${c.id === job.selectedComponentId ? ' component-selected' : ''}"
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
 
          ${componentToolbar(c)}
 
        </div>
 
 
        <div class="form-grid two-column">
 
          <div class="field-group required-field complete">
 
            <label>
              Post Size
            </label>
 
            <select
              data-component-field="postType"
              data-component-id="${safe(c.id)}"
            >
              ${optionsFromObject(
                CFG.steel.posts,
                c.postType
              )}
            </select>
 
          </div>
 
 
          <div class="field-group required-field complete">
 
            <label>
              Fixing
            </label>
 
            <select
              data-component-field="fixing"
              data-component-id="${safe(c.id)}"
            >
              ${fixingOptions(c.fixing)}
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
              class="segment-btn ${c.heightMode === 'auto' ? 'active' : ''}"
              data-action="set-post-height-mode"
              data-component-id="${safe(c.id)}"
              data-value="auto"
            >
              AUTO
            </button>
 
            <button
              type="button"
              class="segment-btn ${c.heightMode === 'manual' ? 'active' : ''}"
              data-action="set-post-height-mode"
              data-component-id="${safe(c.id)}"
              data-value="manual"
            >
              MANUAL
            </button>
 
          </div>
 
 
          ${
            c.heightMode ===
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
                      value="${num(c.manualFinishedHeightMm)}"
                      data-component-field="manualFinishedHeightMm"
                      data-component-id="${safe(c.id)}"
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
              c.fixing ===
              'existing_structure'
                ? 'No new post'
                : mm(
                    postCutLengthMm(c)
                  )
            }
 
          </div>
 
        </div>
 
 
        ${
          needsHoles
            ? renderHoleEditor(
                c.id,
                '',
                c
              )
            : ''
        }
 
        ${renderCatchAssignmentControls(c)}
 
      </div>
    `;
  }
 
  function availableDoublePairOptions(
    currentGate
  ) {
    const pairs =
      new Map();
 
    job.components
      .filter(
        (g) =>
          g.type ===
            'gate' &&
          g.id !==
            currentGate.id &&
          g.relationship ===
            'double' &&
          g.doublePairId
      )
      .forEach(
        (g) =>
          pairs.set(
            g.doublePairId,
            g.doublePairId
          )
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
      [...pairs.keys()]
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
 
  function renderGateEditor(
    c,
    label
  ) {
    const w =
      calculation
        .gateWidths[
          c.id
        ] || 0;
 
    return `
      <div
        id="component-card-${safe(c.id)}"
        class="card component-card gate${c.id === job.selectedComponentId ? ' component-selected' : ''}"
      >
 
        <div class="component-card-header">
 
          <div class="component-title-wrap">
 
            <h2 class="component-title">
              ${safe(label)}
            </h2>
 
            <div class="component-subtitle">
              ${Math.round(w)} × ${Math.round(gateFrameHeightMm())}mm steel frame
            </div>
 
          </div>
 
          ${componentToolbar(c)}
 
        </div>
 
 
        <div class="form-grid two-column">
 
          <div class="field-group required-field complete">
 
            <label>
              Frame Steel
            </label>
 
            <select
              data-component-field="frameType"
              data-component-id="${safe(c.id)}"
            >
              ${optionsFromObject(
                CFG.steel.frame,
                c.frameType
              )}
            </select>
 
          </div>
 
 
          <div class="field-group">
 
            <label>
              Latch
            </label>
 
            <select
              data-component-field="latchType"
              data-component-id="${safe(c.id)}"
            >
              ${optionsFromObject(
                CFG.hardware.latches,
                c.latchType
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
              class="segment-btn ${c.widthMode === 'auto' ? 'active' : ''}"
              data-action="set-gate-width-mode"
              data-component-id="${safe(c.id)}"
              data-value="auto"
            >
              AUTO
            </button>
 
            <button
              type="button"
              class="segment-btn ${c.widthMode === 'manual' ? 'active' : ''}"
              data-action="set-gate-width-mode"
              data-component-id="${safe(c.id)}"
              data-value="manual"
            >
              MANUAL
            </button>
 
          </div>
 
 
          ${
            c.widthMode ===
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
                      value="${num(c.manualWidthMm)}"
                      data-component-field="manualWidthMm"
                      data-component-id="${safe(c.id)}"
                    >
 
                    <span class="input-unit">
                      mm
                    </span>
 
                  </div>
 
                </div>
              `
              : `
                <div class="compact-feature-summary">
                  Auto steel frame width: ${mm(w)}
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
                data-component-id="${safe(c.id)}"
              >
 
                <option
                  value="left"
                  ${c.hingeSide === 'left' ? 'selected' : ''}
                >
                  Left
                </option>
 
                <option
                  value="right"
                  ${c.hingeSide === 'right' ? 'selected' : ''}
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
                data-component-id="${safe(c.id)}"
              >
 
                <option
                  value="in"
                  ${c.openDirection === 'in' ? 'selected' : ''}
                >
                  In
                </option>
 
                <option
                  value="out"
                  ${c.openDirection === 'out' ? 'selected' : ''}
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
                data-component-id="${safe(c.id)}"
              >
 
                <option
                  value="single"
                  ${c.relationship === 'single' ? 'selected' : ''}
                >
                  Single / Independent
                </option>
 
                <option
                  value="double"
                  ${c.relationship === 'double' ? 'selected' : ''}
                >
                  Double Gate
                </option>
 
              </select>
 
            </div>
 
 
            ${
              c.relationship ===
              'double'
                ? `
                  <div class="field-group required-field complete">
 
                    <label>
                      Double Pair
                    </label>
 
                    <select
                      data-action-change="set-double-pair"
                      data-component-id="${safe(c.id)}"
                    >
                      ${availableDoublePairOptions(c)}
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
                value="${num(c.internalRailCount)}"
                data-component-field="internalRailCount"
                data-component-id="${safe(c.id)}"
              >
 
            </div>
 
 
            <div class="field-group">
 
              <label>
                Calculated Rail Length
              </label>
 
              <div class="compact-feature-summary">
                ${mm(
                  railCutLengthForGate(
                    c,
                    w,
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
        'concrete_house' ||
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
 
  function renderCatchAssignmentControls(component) {
    const sliders = sliderComponents();
 
    if (!sliders.length || !['post', 'fixedPanel'].includes(component.type)) {
      return '';
    }
 
    const options = [
      '<option value="">Not a slider catch</option>',
      ...sliders.map(
        slider =>
          `<option value="${safe(slider.id)}" ${component.catchForSliderId === slider.id ? 'selected' : ''}>Catch for ${safe(componentDisplayLabels()[slider.id])}</option>`
      )
    ].join('');
 
    return `
      <div class="component-subsection">
        <div class="component-subsection-title">Slider Catch</div>
 
        <div class="form-grid two-column">
          <div class="field-group">
            <label>Catch use</label>
            <select
              data-catch-field="catchForSliderId"
              data-component-id="${safe(component.id)}"
            >
              ${options}
            </select>
          </div>
 
          ${
            component.type === 'fixedPanel' && component.catchForSliderId
              ? `
                <div class="field-group">
                  <label>Catch post side</label>
                  <select
                    data-catch-field="catchPostSide"
                    data-component-id="${safe(component.id)}"
                  >
                    <option value="left" ${component.catchPostSide === 'left' ? 'selected' : ''}>Left post</option>
                    <option value="right" ${component.catchPostSide !== 'left' ? 'selected' : ''}>Right post</option>
                  </select>
                </div>
              `
              : ''
          }
        </div>
 
        ${
          component.catchForSliderId
            ? `<div class="compact-feature-summary">Adds $${CFG.hardware.slider.catchFabricationAllowanceExGST} catch fabrication allowance to ${safe(catchTargetLabel(component))}.</div>`
            : ''
        }
      </div>
    `;
  }
 
  function renderFixedPanelEditor(c, label) {
    const activeRails = panelRailsUsed(c);
    const railRows = activeRails.map((rail) => {
      const shownLength = rail.lengthMode === 'manual' ? num(rail.manualLengthMm) : panelRailAutoLengthMm(c, rail);
      return `
        <div class="slider-rail-row">
          <div class="field-group"><label>Rail position</label><select data-panel-rail-field="position" data-component-id="${safe(c.id)}" data-rail-id="${safe(rail.id)}"><option value="top" ${rail.position === 'top' ? 'selected' : ''}>Top</option><option value="mid" ${rail.position === 'mid' ? 'selected' : ''}>Mid</option><option value="bottom" ${rail.position === 'bottom' ? 'selected' : ''}>Bottom</option><option value="extra" ${!['top','mid','bottom'].includes(rail.position) ? 'selected' : ''}>Extra</option></select></div>
          <div class="field-group"><label>Direction</label><select data-panel-rail-field="orientation" data-component-id="${safe(c.id)}" data-rail-id="${safe(rail.id)}"><option value="horizontal" ${rail.orientation === 'horizontal' ? 'selected' : ''}>Horizontal</option><option value="vertical" ${rail.orientation === 'vertical' ? 'selected' : ''}>Vertical</option></select></div>
          <div class="field-group"><label>Steel</label><select data-panel-rail-field="steelType" data-component-id="${safe(c.id)}" data-rail-id="${safe(rail.id)}">${optionsFromObject(CFG.steel.frame, rail.steelType || CFG.defaults.frameType)}</select></div>
          <div class="field-group"><label>Length</label><select data-panel-rail-field="lengthMode" data-component-id="${safe(c.id)}" data-rail-id="${safe(rail.id)}"><option value="auto" ${rail.lengthMode === 'auto' ? 'selected' : ''}>Auto</option><option value="manual" ${rail.lengthMode === 'manual' ? 'selected' : ''}>Manual</option></select></div>
          <div class="field-group"><label>${rail.lengthMode === 'manual' ? 'Manual length' : 'Calculated length'}</label><div class="input-with-unit"><input type="number" min="0" step="1" value="${Math.round(shownLength)}" ${rail.lengthMode === 'manual' ? '' : 'disabled'} data-panel-rail-field="manualLengthMm" data-component-id="${safe(c.id)}" data-rail-id="${safe(rail.id)}"><span class="input-unit">mm</span></div></div>
          <button type="button" class="delete" data-action="delete-panel-rail" data-component-id="${safe(c.id)}" data-rail-id="${safe(rail.id)}">×</button>
        </div>`;
    }).join('');
    const autoMessage = c.railMode !== 'manual' && job.cladding.direction === 'horizontal'
      ? '<div class="compact-feature-summary">Auto layout: no rails for horizontal cladding. Add a rail below to override.</div>'
      : '';
 
    return `
      <div id="component-card-${safe(c.id)}" class="card component-card fixed-panel${c.id === job.selectedComponentId ? ' component-selected' : ''}">
        <div class="component-card-header"><div class="component-title-wrap"><h2 class="component-title">${safe(label)}</h2><div class="component-subtitle">Complete panel including two built-in posts</div></div>${componentToolbar(c)}</div>
        <div class="field-group required-field ${num(c.widthMm) > 0 ? 'complete' : ''}"><label>Overall Fixed Panel Width</label><div class="input-with-unit"><input type="number" min="0" step="1" inputmode="numeric" value="${num(c.widthMm)}" data-component-field="widthMm" data-component-id="${safe(c.id)}"><span class="input-unit">mm</span></div><small class="field-help">Includes the two built-in posts. No clearance is deducted around a fixed panel.</small></div>
        <div class="component-subsection"><div class="component-subsection-title">Built-in Posts</div><div class="dynamic-options">${renderPanelPostEditor(c, 'left', c.leftPost)}${renderPanelPostEditor(c, 'right', c.rightPost)}</div></div>
        ${renderCatchAssignmentControls(c)}
        <div class="component-subsection"><div class="component-subsection-title">Internal Rails</div><div class="compact-feature-summary">Each rail can use its own steel size. Auto horizontal length is the clear distance between posts; Auto vertical length is the finished panel height.</div>${autoMessage}${railRows || '<div class="empty-state">No internal rails included.</div>'}<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;"><button type="button" class="secondary-btn" data-action="add-panel-rail" data-component-id="${safe(c.id)}" data-orientation="horizontal">+ Horizontal Rail</button><button type="button" class="secondary-btn" data-action="add-panel-rail" data-component-id="${safe(c.id)}" data-orientation="vertical">+ Vertical Rail</button><button type="button" class="secondary-btn" data-action="reset-panel-rails-auto" data-component-id="${safe(c.id)}">Reset Rails to Auto</button></div></div>
      </div>`;
  }
 
  function renderSliderPostMini(slider, key, label, post) {
    const needsHoles = ['fixed_brick', 'baseplate', 'concrete_house'].includes(post.fixing);
    return `
      <div class="option-panel">
        <div class="option-panel-title">${safe(label)}</div>
        <div class="slider-subgrid">
          ${key.startsWith('rollerGuide.')
            ? `<div class="field-group"><label>Post size</label><div class="compact-feature-summary">65×65 SHS</div></div>`
            : `<div class="field-group"><label>Post size</label><select data-slider-post-field="postType" data-component-id="${safe(slider.id)}" data-slider-post-key="${safe(key)}">${optionsFromObject(CFG.steel.posts, post.postType)}</select></div>`}
          <div class="field-group"><label>Fixing</label><select data-slider-post-field="fixing" data-component-id="${safe(slider.id)}" data-slider-post-key="${safe(key)}">${fixingOptions(post.fixing)}</select></div>
        </div>
        <div class="compact-feature-summary">${safe(CFG.postFixings[post.fixing]?.label || post.fixing)}</div>
        ${needsHoles ? renderHoleEditor(slider.id, `slider:${key}`, post) : ''}
      </div>`;
  }
 
  function renderSliderEditor(c, label) {
    setSliderSubPostHeights(c);
    const opening = sliderOpeningWidthMm(c);
    const manufactured = sliderManufacturedLengthMm(c);
    const frameHeight = sliderFrameHeightMm();
    const clad = sliderCladdingDimensions(c);
    const trackM = sliderTrackRequiredM(c);
    const trackQty = trackM > 0 ? Math.ceil(trackM / CFG.hardware.slider.track.stockLengthM) : 0;
 
    const railRows = (c.internalRails || []).map((rail, index) => {
      const autoLength = sliderRailAutoLengthMm(c, rail);
      const shownLength = rail.lengthMode === 'manual' ? num(rail.manualLengthMm) : autoLength;
      return `
        <div class="slider-rail-row">
          <div class="field-group"><label>Rail ${index + 1}</label><select data-slider-rail-field="orientation" data-component-id="${safe(c.id)}" data-rail-id="${safe(rail.id)}"><option value="horizontal" ${rail.orientation === 'horizontal' ? 'selected' : ''}>Horizontal</option><option value="vertical" ${rail.orientation === 'vertical' ? 'selected' : ''}>Vertical</option></select></div>
          <div class="field-group"><label>Length</label><select data-slider-rail-field="lengthMode" data-component-id="${safe(c.id)}" data-rail-id="${safe(rail.id)}"><option value="auto" ${rail.lengthMode === 'auto' ? 'selected' : ''}>Auto</option><option value="manual" ${rail.lengthMode === 'manual' ? 'selected' : ''}>Manual</option></select></div>
          <div class="field-group"><label>${rail.lengthMode === 'manual' ? 'Manual length' : 'Calculated length'}</label><div class="input-with-unit"><input type="number" min="0" step="1" value="${Math.round(shownLength)}" ${rail.lengthMode === 'manual' ? '' : 'disabled'} data-slider-rail-field="manualLengthMm" data-component-id="${safe(c.id)}" data-rail-id="${safe(rail.id)}"><span class="input-unit">mm</span></div></div>
          <button type="button" class="delete" data-action="delete-slider-rail" data-component-id="${safe(c.id)}" data-rail-id="${safe(rail.id)}">×</button>
        </div>`;
    }).join('');
 
    return `
      <div id="component-card-${safe(c.id)}" class="card component-card slider${c.id === job.selectedComponentId ? ' component-selected' : ''}">
        <div class="component-card-header"><div class="component-title-wrap"><h2 class="component-title">${safe(label)}</h2><div class="component-subtitle">${Math.round(manufactured)} × ${Math.round(frameHeight)}mm manufactured slider</div></div>${componentToolbar(c)}</div>
 
        <div class="component-subsection">
          <div class="component-subsection-title">Slider Size & Direction</div>
          <div class="slider-subgrid">
            <div class="field-group"><label>Opening width</label><select data-slider-field="openingWidthMode" data-component-id="${safe(c.id)}"><option value="auto" ${c.openingWidthMode === 'auto' ? 'selected' : ''}>Auto from cavity</option><option value="manual" ${c.openingWidthMode === 'manual' ? 'selected' : ''}>Manual</option></select></div>
            <div class="field-group"><label>${c.openingWidthMode === 'manual' ? 'Manual opening width' : 'Calculated opening width'}</label><div class="input-with-unit"><input type="number" min="0" step="1" value="${Math.round(c.openingWidthMode === 'manual' ? num(c.manualOpeningWidthMm) : opening)}" ${c.openingWidthMode === 'manual' ? '' : 'disabled'} data-slider-field="manualOpeningWidthMm" data-component-id="${safe(c.id)}"><span class="input-unit">mm</span></div></div>
            <div class="field-group"><label>Overhang type</label><select data-slider-field="overhangMode" data-component-id="${safe(c.id)}"><option value="lower_rail" ${c.overhangMode === 'lower_rail' ? 'selected' : ''}>Lower 100×50 rail only</option><option value="full_gate" ${c.overhangMode === 'full_gate' ? 'selected' : ''}>Full gate overhang</option></select></div>
            <div class="field-group"><label>Overhang</label><div class="input-with-unit"><input type="number" min="0" step="10" value="${num(c.overhangMm)}" data-slider-field="overhangMm" data-component-id="${safe(c.id)}"><span class="input-unit">mm</span></div></div>
            <div class="field-group"><label>Slides</label><select data-slider-field="slideDirection" data-component-id="${safe(c.id)}"><option value="left" ${c.slideDirection === 'left' ? 'selected' : ''}>Left to open</option><option value="right" ${c.slideDirection === 'right' ? 'selected' : ''}>Right to open</option></select></div>
          </div>
          <div class="compact-feature-summary">Manufactured length: ${mm(manufactured)} · Frame height: ${mm(frameHeight)} · Internal cladding: ${mm(clad.widthMm)} × ${mm(clad.heightMm)}</div>
        </div>
 
        <div class="component-subsection">
          <div class="component-subsection-title">Slider Frame</div>
          <div class="slider-subgrid">
            <div class="field-group"><label>Top rail</label><select data-slider-field="topFrameType" data-component-id="${safe(c.id)}">${optionsFromObject(CFG.steel.frame, c.topFrameType)}</select></div>
            <div class="field-group"><label>Bottom rail</label><select data-slider-field="bottomFrameType" data-component-id="${safe(c.id)}">${optionsFromObject(CFG.steel.frame, c.bottomFrameType)}</select></div>
            <div class="field-group"><label>End rails</label><select data-slider-field="endFrameType" data-component-id="${safe(c.id)}">${optionsFromObject(CFG.steel.frame, c.endFrameType)}</select></div>
            <div class="field-group"><label>Internal rail steel</label><select data-slider-field="internalRailType" data-component-id="${safe(c.id)}">${optionsFromObject(CFG.steel.frame, c.internalRailType)}</select></div>
          </div>
        </div>
 
        <div class="component-subsection">
          <div class="component-subsection-title">Internal Cladding Rails</div>
          <div class="compact-feature-summary">All slider cladding is inside the perimeter frame. Rail Auto lengths use the finished internal cladding opening.</div>
          ${railRows || '<div class="empty-state">No internal 25×25 rails added.</div>'}
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;"><button type="button" class="secondary-btn" data-action="add-slider-rail" data-component-id="${safe(c.id)}" data-orientation="horizontal">+ Horizontal Rail</button><button type="button" class="secondary-btn" data-action="add-slider-rail" data-component-id="${safe(c.id)}" data-orientation="vertical">+ Vertical Rail</button></div>
        </div>
 
        <div class="component-subsection">
          <div class="component-subsection-title">Slider Hardware</div>
          <div class="slider-hardware-grid">
            <div class="field-group"><label>Wheels @ $45</label><input type="number" min="0" step="1" value="${num(c.wheelQty)}" data-slider-field="wheelQty" data-component-id="${safe(c.id)}"></div>
            <div class="field-group"><label>Guide roller sets @ $25</label><input type="number" min="0" step="1" value="${num(c.guideRollerQty)}" data-slider-field="guideRollerQty" data-component-id="${safe(c.id)}"></div>
          </div>
          <div class="slider-subgrid" style="margin-top:10px;">
            <div class="field-group"><label>Latch</label><select data-slider-field="latchType" data-component-id="${safe(c.id)}">${optionsFromObject(CFG.hardware.latches, c.latchType)}</select></div>
            <div class="field-group"><label>Track</label><select data-slider-field="trackMode" data-component-id="${safe(c.id)}"><option value="auto" ${c.trackMode === 'auto' ? 'selected' : ''}>Auto - 2× gate length</option><option value="manual" ${c.trackMode === 'manual' ? 'selected' : ''}>Manual</option></select></div>
            <div class="field-group"><label>${c.trackMode === 'manual' ? 'Manual track required' : 'Track required'}</label><div class="input-with-unit"><input type="number" min="0" step="0.1" value="${round(trackM, 2)}" ${c.trackMode === 'manual' ? '' : 'disabled'} data-slider-field="manualTrackLengthM" data-component-id="${safe(c.id)}"><span class="input-unit">m</span></div></div>
          </div>
          <div class="compact-feature-summary">Order ${trackQty} × 3m track lengths (${money(trackQty * CFG.hardware.slider.track.pricePerStockLengthExGST)} ex GST)</div>
        </div>
 
        <div class="component-subsection">
          <div class="component-subsection-title">Catch Post</div>
          <div class="switch-row">
            <span class="switch-label">Slider catch post</span>
            <button
              type="button"
              class="${c.includeCatchPost ? 'delete' : 'secondary-btn'}"
              data-action="toggle-slider-item"
              data-component-id="${safe(c.id)}"
              data-field="includeCatchPost"
            >
              ${c.includeCatchPost ? 'Delete Catch Post' : 'Add Catch Post'}
            </button>
          </div>
          ${
            c.includeCatchPost
              ? renderSliderPostMini(c, 'catchPost', 'Catch Post', c.catchPost)
              : '<div class="compact-feature-summary">Use a standalone Post or Fixed Panel as the slider catch if required.</div>'
          }
        </div>
 
        <div class="component-subsection">
          <div class="component-subsection-title">Roller Guide Frame</div>
          <div class="switch-row"><span class="switch-label">Include 65×65 roller guide frame + $50 top welding</span><button type="button" class="toggle-btn ${c.includeRollerGuide ? 'on' : ''}" data-action="toggle-slider-item" data-component-id="${safe(c.id)}" data-field="includeRollerGuide">${c.includeRollerGuide ? 'ON' : 'OFF'}</button></div>
          ${c.includeRollerGuide ? `
            <div class="field-group" style="margin-top:10px;"><label>Top crossbar finished width</label><div class="input-with-unit"><input type="number" min="0" step="10" value="${num(c.rollerGuide.topWidthMm)}" data-slider-guide-field="topWidthMm" data-component-id="${safe(c.id)}"><span class="input-unit">mm</span></div><small class="field-help">Material allowance never drops below 400mm, plus 100mm total waste allowance.</small></div>
            <div class="compact-feature-summary">Guide upright height above ground: ${mm(sliderGuideUprightHeightMm(c))}</div>
            ${renderSliderPostMini(c, 'rollerGuide.leftPost', 'Roller Guide - Left Upright', c.rollerGuide.leftPost)}
            ${renderSliderPostMini(c, 'rollerGuide.rightPost', 'Roller Guide - Right Upright', c.rollerGuide.rightPost)}
          ` : ''}
        </div>
 
        <div style="margin-top:12px;"><button type="button" class="secondary-btn" data-action="reset-slider-auto" data-component-id="${safe(c.id)}">Reset Slider to Auto Defaults</button></div>
      </div>`;
  }
 
  function renderComponentEditor() {
    const root =
      $('#component-editor');
 
    if (
      !job.components.length
    ) {
      root.innerHTML =
        '<div class="card"><div class="empty-state large">Add a Post, Gate, Sliding Gate or Fixed Panel to begin.</div></div>';
 
      return;
    }
 
    const labels =
      componentDisplayLabels();
 
    root.innerHTML =
      job.components
        .map(
          (c) => {
            if (
              c.type === 'post'
            ) {
              return renderPostEditor(
                c,
                labels[c.id]
              );
            }
 
            if (
              c.type === 'gate'
            ) {
              return renderGateEditor(
                c,
                labels[c.id]
              );
            }
 
            if (
              c.type ===
              'fixedPanel'
            ) {
              return renderFixedPanelEditor(
                c,
                labels[c.id]
              );
            }
 
            if (c.type === 'slider') {
              return renderSliderEditor(c, labels[c.id]);
            }
 
            return '';
          }
        )
        .join('');
  }
 
  /* =======================================================
     LAYOUT
     ======================================================= */
 
  function renderLayoutSummary() {
    const l =
      calculation.layout;
 
    const status =
      $('#layout-width-status');
 
    if (
      !job.components.length
    ) {
      status.textContent =
        'Not Confirmed';
 
      status.className =
        'compact-status error';
    } else if (
      l.unrelatedAutoAmbiguous
    ) {
      status.textContent =
        'Not Confirmed';
 
      status.className =
        'compact-status error';
    } else if (
      l.valid
    ) {
      status.textContent =
        'Measurements Confirmed';
 
      status.className =
        'compact-status success';
    } else {
      status.textContent =
        'Not Confirmed';
 
      status.className =
        'compact-status error';
    }
 
    $('#layout-calculation-summary')
      .innerHTML = `
        <div class="summary-row">
 
          <span>
            Cavity
          </span>
 
          <strong>
            ${mm(l.cavity)}
          </strong>
 
        </div>
 
 
        <div class="summary-row">
 
          <span>
            Components
          </span>
 
          <strong>
            ${mm(
              l.nonGateWidth +
              l.gateWidth
            )}
          </strong>
 
        </div>
 
 
        <div class="summary-row">
 
          <span>
            Gate gaps
          </span>
 
          <strong>
            ${mm(l.gaps)}
          </strong>
 
        </div>
 
 
        <div class="summary-row summary-total">
 
          <span>
            Difference
          </span>
 
          <strong>
            ${mm(l.difference)}
          </strong>
 
        </div>
 
 
        ${
          l.unrelatedAutoAmbiguous
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
 
  /* =======================================================
     CLADDING
     ======================================================= */
 
  function claddingSummaryText() {
    const type =
      job.cladding.type;
 
    const cfg =
      CFG.cladding[type];
 
    if (!cfg) {
      return 'Select material';
    }
 
    if (
      type ===
      'galvMesh50'
    ) {
      return 'Mesh, 50x50, 4mm';
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
      cfg.shortLabel ||
        cfg.label,
 
      finish,
 
      cfg.allowDirection ===
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
 
    const cfg =
      CFG.cladding[type];
 
    if (!cfg) {
      return '';
    }
 
    let html = '';
 
    if (
      cfg.allowDirection !==
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
              cfg.colours
                .map(
                  (v) =>
                    `<option value="${safe(v)}" ${v === job.cladding.colour ? 'selected' : ''}>${safe(v)}</option>`
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
                cfg.finishes ||
                []
              )
                .map(
                  (v) =>
                    `<option value="${safe(v)}" ${v === job.cladding.finish ? 'selected' : ''}>${safe(v)}</option>`
                )
                .join('')
            }
 
          </select>
 
        </div>
      `;
    }
 
    if (
      type === 'colorbond'
    ) {
      html += `
        <div class="field-group required-field ${job.cladding.profile ? 'complete' : ''}">
          <label>Profile</label>
          <select data-cladding-field="profile">
            <option value="">Select profile</option>
            ${cfg.profiles.map(v => `<option value="${safe(v)}" ${v === job.cladding.profile ? 'selected' : ''}>${safe(v)}</option>`).join('')}
          </select>
        </div>
        <div class="field-group required-field ${job.cladding.colour ? 'complete' : ''}">
          <label>Colorbond colour</label>
          <select data-cladding-field="colour">
            <option value="">Select colour</option>
            ${CFG.colours.map(v => `<option value="${safe(v)}" ${v === job.cladding.colour ? 'selected' : ''}>${safe(v)}</option>`).join('')}
          </select>
        </div>
        <div class="compact-feature-summary">Colorbond supply + fitting: ${money(cfg.installedRatePerM2)}/m² ex GST. This rate already includes cladding fitting labour.</div>`;
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
                cfg.lengthsMm
                  .map(
                    (v) =>
                      `<option value="${v}" ${num(job.cladding.palingLengthMm) === v ? 'selected' : ''}>${v}mm</option>`
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
                cfg.widthsMm
                  .map(
                    (v) =>
                      `<option value="${v}" ${num(job.cladding.palingWidthMm) === v ? 'selected' : ''}>${v}mm</option>`
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
      const c =
        job.cladding.custom;
 
      html += `
        <div class="field-group required-field ${c.name ? 'complete' : ''}">
 
          <label>
            Other cladding description
          </label>
 
          <input
            type="text"
            value="${safe(c.name)}"
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
              ${c.costingMode === 'total' ? 'selected' : ''}
            >
              Total material cost
            </option>
 
            <option
              value="quantity_unit"
              ${c.costingMode === 'quantity_unit' ? 'selected' : ''}
            >
              Quantity × unit cost
            </option>
 
          </select>
 
        </div>
 
 
        ${
          c.costingMode ===
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
                    value="${num(c.totalCost)}"
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
                    value="${num(c.quantity)}"
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
                      value="${num(c.unitCost)}"
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
              ${c.priceIncludesGST ? 'selected' : ''}
            >
              Includes GST
            </option>
 
            <option
              value="false"
              ${!c.priceIncludesGST ? 'selected' : ''}
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
              value="${num(c.labourRatePerM2)}"
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
 
    const c =
      calculation.cladding;
 
    let detail = '';
 
    if (c.type === 'colorbond') {
      detail += `
        <div class="summary-row"><span>Supply + fitting rate</span><strong>${money(c.config.installedRatePerM2)}/m²</strong></div>
        <div class="compact-feature-summary">The Colorbond rate already includes fitting labour. No separate cladding labour is added.</div>
        <div class="summary-row"><span>Screw allowance</span><strong>${lm(c.detail.screwLinealM || 0)} × $${num(c.config.screwAllowancePerLinealMExGST, 3).toFixed(2)} = ${money(c.detail.screwAllowanceExGST || 0)}</strong></div>
        <div class="summary-row summary-total"><span>Colorbond allowance EX GST</span><strong>${money(c.directSellExGST)}</strong></div>`;
    }
 
    if (
      c.detail?.orderText
    ) {
      detail += `
        <div class="summary-row">
 
          <span>
            Order
          </span>
 
          <strong>
            ${safe(c.detail.orderText)}
          </strong>
 
        </div>
      `;
    }
 
    if (
      c.type ===
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
            ${lm(c.detail.accessoryLengthM)}
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
            ${sqm(c.areaM2)}
          </strong>
 
        </div>
 
        ${detail}
 
        <div class="summary-row">
 
          <span>
            Material Cost EX GST
          </span>
 
          <strong>
            ${money(c.materialCostExGST)}
          </strong>
 
        </div>
 
 
        <div class="summary-row">
 
          <span>
            Labour Rate
          </span>
 
          <strong>
            ${money(c.labourRatePerM2)}/m²
          </strong>
 
        </div>
 
 
        <div class="summary-row summary-total">
 
          <span>
            Cladding Labour EX GST
          </span>
 
          <strong>
            ${money(c.labourCostExGST)}
          </strong>
 
        </div>
      `;
  }
 
  /* =======================================================
     POWDER
     ======================================================= */
 
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
      select.options.length <= 1
    ) {
      select.innerHTML =
        '<option value="">Select colour</option>' +
        CFG.colours
          .map(
            (c) =>
              `<option value="${safe(c)}">${safe(c)}</option>`
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
 
    const p =
      calculation.powder;
 
    $('#powder-summary')
      .textContent =
      job.powder.enabled
        ? `PC, ${job.powder.colour || 'Select colour'}, ${money(p.totalExGST)}`
        : `No powder coating, touch-up ${money(p.touchUpExGST)}`;
 
    $('#powder-calculation')
      .innerHTML =
      job.powder.enabled
        ? `
          <div class="summary-row">
 
            <span>
              Posts
            </span>
 
            <strong>
              ${money(p.postsExGST)}
            </strong>
 
          </div>
 
 
          <div class="summary-row">
 
            <span>
              Frames
            </span>
 
            <strong>
              ${money(p.framesExGST)}
            </strong>
 
          </div>
 
 
          <div class="summary-row">
 
            <span>
              Travel
            </span>
 
            <strong>
              ${money(p.travelExGST)}
            </strong>
 
          </div>
 
 
          <div class="summary-row summary-total">
 
            <span>
              Powder Coating EX GST
            </span>
 
            <strong>
              ${money(p.totalExGST)}
            </strong>
 
          </div>
        `
        : `
          <div class="summary-row">
 
            <span>
              Duragalv Touch-up
            </span>
 
            <strong>
              ${money(p.touchUpExGST)}
            </strong>
 
          </div>
 
 
          <div class="summary-row summary-total">
 
            <span>
              Finish EX GST
            </span>
 
            <strong>
              ${money(p.totalExGST)}
            </strong>
 
          </div>
        `;
  }
 
  /* =======================================================
     MATERIALS
     ======================================================= */
 
  function renderMaterials() {
    const steelItems = [
      ...calculation.posts.steelOrders.map(o => ({
        title: o.label,
        value: `${o.stockQty} × ${o.stockLengthM}m stock (${round(o.lengthM, 2)}m complete cuts required)${o.stockPlan?.length ? ` | Cut plan: ${o.stockPlan.map((bin, index) => `L${index + 1}: ${bin.cutsMm.map(v => Math.round(v)).join(' + ')}mm`).join(' ; ')}` : ''}`
      })),
      ...calculation.frames.steelOrders.map(o => ({
        title: o.label,
        value: `${o.stockQty} × ${o.stockLengthM}m stock (${round(o.lengthM, 2)}m complete cuts required)${o.stockPlan?.length ? ` | Cut plan: ${o.stockPlan.map((bin, index) => `L${index + 1}: ${bin.cutsMm.map(v => Math.round(v)).join(' + ')}mm`).join(' ; ')}` : ''}`
      }))
    ];
 
    $('#steel-materials-list').innerHTML = steelItems.length
      ? steelItems.map(i => `<div class="material-item"><div class="material-item-title">${safe(i.title)}</div><div class="material-item-value">${safe(i.value)}</div></div>`).join('')
      : '<div class="empty-state">No steel calculated yet.</div>';
 
    const clad = calculation.cladding;
    const cladItems = [
      { title: clad.config?.label || 'Cladding', value: clad.detail?.orderText || `${round(clad.areaM2, 2)} m²` },
      { title: 'Clad Area', value: sqm(clad.areaM2) }
    ];
    if (clad.type === 'colorbond') {
      cladItems.push({ title: 'Supply + fitting', value: `${money(clad.config.installedRatePerM2)}/m² - fitting labour included` });
      cladItems.push({ title: 'Sheets to order', value: `${clad.detail.totalSheets || 0} sheet${clad.detail.totalSheets === 1 ? '' : 's'} | ${(clad.detail.sheetOrderLines || []).join(' + ') || 'No sheet lengths calculated'} | ${clad.detail.sheetWidthMm || 890}mm sheet width / ${clad.detail.finishedCoverMm || 800}mm finished cover` });
      cladItems.push({ title: 'Colorbond screws', value: `${lm(clad.detail.screwLinealM || 0)} × $${num(clad.config.screwAllowancePerLinealMExGST, 3).toFixed(2)} = ${money(clad.detail.screwAllowanceExGST || 0)} ex GST` });
    }
    $('#cladding-materials-list').innerHTML = cladItems.map(i => `<div class="material-item"><div class="material-item-title">${safe(i.title)}</div><div class="material-item-value">${safe(i.value)}</div></div>`).join('');
 
    const req = [];
    calculation.posts.steelOrders.forEach(o => req.push([o.label, `${o.stockQty} × ${o.stockLengthM}m`]));
    calculation.frames.steelOrders.forEach(o => req.push([o.label, `${o.stockQty} × ${o.stockLengthM}m`]));
    if (clad.detail?.orderText) req.push([clad.config?.label || 'Cladding', clad.detail.orderText]);
    if (clad.type === 'colorbond' && clad.detail?.sheetOrderLines?.length) {
      clad.detail.sheetOrderLines.forEach(
        line => req.push(['Colorbond sheet', `${line} × ${clad.detail.sheetWidthMm || 890}mm wide (${clad.detail.finishedCoverMm || 800}mm cover)`])
      );
    }
    if (calculation.posts.dynabolts) req.push([CFG.fixings.dynabolt.label, `${calculation.posts.dynabolts}`]);
    if (calculation.frames.hingeSets) req.push([CFG.hardware.hinges.lockout.label, `${calculation.frames.hingeSets} set${calculation.frames.hingeSets === 1 ? '' : 's'}`]);
 
    const materialLatchPairs = new Set();
    job.components.filter(c => c.type === 'gate').forEach(g => {
      const isDouble = g.relationship === 'double' && g.doublePairId;
      if (!isDouble || !materialLatchPairs.has(g.doublePairId)) {
        req.push([isDouble ? 'Double Gate latch' : `${componentDisplayLabels()[g.id]} latch`, latchClientText(g.latchType)]);
        if (isDouble) materialLatchPairs.add(g.doublePairId);
      }
      req.push([`${componentDisplayLabels()[g.id]} hinges to order`, `${hingeOrderSide(g).toUpperCase()} hinge set`]);
    });
 
    calculation.frames.sliderHardware.forEach(s => {
      const slider = job.components.find(c => c.id === s.componentId);
      req.push(['Roller wheels', `${s.wheelQty} × ${CFG.hardware.slider.wheel.label} @ $45`]);
      req.push(['Guide rollers', `${s.guideQty} × ${CFG.hardware.slider.guideRollerSet.label} @ $25`]);
      req.push(['Latch', latchClientText(s.latchType)]);
      req.push(['Track', `${s.trackStockQty} × ${CFG.hardware.slider.track.stockLengthM}m lengths (${round(s.trackRequiredM, 2)}m required)`]);
      if (slider?.includeCatchPost) req.push(['Catch post', `Post + $${CFG.hardware.slider.catchFabricationAllowanceExGST} catch fabrication allowance`]);
      if (slider?.includeRollerGuide) req.push(['Roller guide', `65×65 SHS guide frame + $${CFG.hardware.slider.rollerGuideTopFabricationAllowanceExGST} top welding allowance`]);
    });
 
    job.components
      .filter(c => (c.type === 'post' || c.type === 'fixedPanel') && c.catchForSliderId)
      .forEach(c => {
        const label = componentDisplayLabels()[c.id];
        const side = c.type === 'fixedPanel'
          ? ` - ${c.catchPostSide === 'left' ? 'Left' : 'Right'} post`
          : '';
        req.push([`${label}${side} catch`, `$${CFG.hardware.slider.catchFabricationAllowanceExGST} catch fabrication allowance`]);
      });
 
    if (calculation.posts.concreteBags) req.push(['Concrete', `${calculation.posts.concreteBags} bags`]);
    if (calculation.posts.concretePosts && CFG.concrete.addSpoilRemovalRequirement) req.push(['Spoil removal', `${calculation.posts.concretePosts} concreted post${calculation.posts.concretePosts === 1 ? '' : 's'}`]);
    if (calculation.posts.baseplates) req.push(['Baseplated post allowance', `${calculation.posts.baseplates}`]);
    if (clad.type === 'treatedPinePalings') {
      if (job.cladding.capping) req.push(['Capping', lm(clad.detail.accessoryLengthM)]);
      if (job.cladding.plinth) req.push(['Plinth', lm(clad.detail.accessoryLengthM)]);
    }
    if (clad.type === 'galvMesh50') req.push(['Mesh sheets', clad.detail.orderText]);
 
    $('#required-materials-list').innerHTML = req.length
      ? req.map(([name, qty]) => `<div class="required-material-row"><span>${safe(name)}</span><strong>${safe(qty)}</strong></div>`).join('')
      : '<div class="empty-state">Required materials will appear here.</div>';
 
    const cuts = [];
    calculation.posts.cutList.forEach(i => {
      const detail = i.cutLengthMm
        ? `${postConfig(i.postType).label}: ${Math.round(i.cutLengthMm)}mm${i.materialAllowanceMm ? ` (${Math.round(i.materialAllowanceMm)}mm material allowed)` : ''}${i.holes.length ? ` | Holes: ${i.holes.join(', ')}mm` : ''}`
        : 'Existing structure / no new post';
      cuts.push([i.label, detail]);
    });
 
    calculation.frames.cutList.forEach(i => {
      if (i.type === 'gate') {
        cuts.push([
          `${i.label} (${i.hingeSide === 'left' ? 'L' : 'R'} hinge viewed from reference)`,
          `${Math.round(i.widthMm)} × ${Math.round(i.heightMm)}mm | ${i.railCount} ${i.railOrientation} rail${i.railCount === 1 ? '' : 's'} @ ${Math.round(i.railLengthMm)}mm | Order ${hingeOrderSide(job.components.find(c => c.id === i.componentId) || { hingeSide: i.hingeSide })} hinges | ${latchClientText(i.latchType)}`
        ]);
      } else if (i.type === 'fixedPanel') {
        cuts.push([i.label, `${Math.round(i.widthMm)} × ${Math.round(i.heightMm)}mm | ${i.rails?.length || 0} internal rail${i.rails?.length === 1 ? '' : 's'}`]);
        (i.rails || []).forEach(r => cuts.push([`${i.label} ${panelRailPositionLabel(r.position)} rail`, `${r.orientation}: ${Math.round(r.lengthMm)}mm ${frameConfig(r.steelType).label}`]));
      } else if (i.type === 'slider') {
        cuts.push([i.label, `Opening ${Math.round(i.openingWidthMm)}mm | Manufactured ${Math.round(i.manufacturedLengthMm)} × ${Math.round(i.frameHeightMm)}mm`]);
        cuts.push([`${i.label} bottom`, `${frameConfig(i.bottomFrameType).label}: ${Math.round(i.bottomLengthMm)}mm`]);
        cuts.push([`${i.label} top`, `${frameConfig(i.topFrameType).label}: ${Math.round(i.topLengthMm)}mm`]);
        cuts.push([`${i.label} ends`, `2 × ${frameConfig(i.endFrameType).label} @ ${Math.round(i.endLengthMm)}mm`]);
        i.rails.forEach((r, idx) => cuts.push([`${i.label} internal rail ${idx + 1}`, `${r.orientation}: ${Math.round(r.lengthMm)}mm ${frameConfig(i.internalRailType).label}`]));
      }
    });
 
    $('#fabrication-cut-list').innerHTML = cuts.length
      ? cuts.map(([name, detail]) => `<div class="cut-list-row"><span>${safe(name)}</span><strong>${safe(detail)}</strong></div>`).join('')
      : '<div class="empty-state">Fabrication dimensions will appear here.</div>';
  }
 
  /* =======================================================
     LABOUR
     ======================================================= */
 
  function renderLabour() {
    const l = calculation.labour;
 
    $('#labour-fabrication-auto').textContent = formatHours(l.fabricationAutoHours);
    setInputValue('#labour-fabrication-additional', job.labour.additionalFabricationHours);
    $('#labour-fabrication-total').textContent = formatHours(l.fabricationTotalHours);
    $('#labour-install-auto').textContent = formatHours(l.installationAutoHours);
    setInputValue('#labour-install-additional', job.labour.additionalInstallHours);
    $('#labour-install-total').textContent = formatHours(l.installationTotalHours);
 
    $('#fabrication-labour-breakdown').innerHTML = `
      <div class="labour-breakdown-row"><span>Gate fabrication</span><strong>${formatHours(calculation.frames.gateFabricationHours)}</strong></div>
      <div class="labour-breakdown-row"><span>Sliding gate fabrication</span><strong>${formatHours(calculation.frames.sliderFabricationHours)}</strong></div>
      <div class="labour-breakdown-row"><span>Fixed panel fabrication</span><strong>${formatHours(calculation.frames.panelFabricationHours)}</strong></div>
      <div class="labour-breakdown-row"><span>Posts / drilling</span><strong>${formatHours(calculation.posts.fabricationHours)}</strong></div>`;
 
    $('#installation-labour-breakdown').innerHTML = `
      <div class="labour-breakdown-row"><span>Hang swing gates / fit latches</span><strong>${formatHours(calculation.frames.gateInstallHours)}</strong></div>
      <div class="labour-breakdown-row"><span>Sliding gate installation</span><strong>${formatHours(calculation.frames.sliderInstallHours)}</strong></div>
      <div class="labour-breakdown-row"><span>Fixed panel installation</span><strong>${formatHours(calculation.frames.panelInstallHours)}</strong></div>
      <div class="labour-breakdown-row"><span>Post installation</span><strong>${formatHours(calculation.posts.installationHours)}</strong></div>`;
 
    $('#cladding-labour-summary').innerHTML = calculation.cladding.type === 'colorbond'
      ? `<div class="summary-row"><span>Area</span><strong>${sqm(calculation.cladding.areaM2)}</strong></div><div class="compact-feature-summary">No separate Colorbond cladding labour is added here. The ${money(calculation.cladding.config.installedRatePerM2)}/m² Colorbond rate already includes fitting labour.</div>`
      : `<div class="summary-row"><span>Area</span><strong>${sqm(calculation.cladding.areaM2)}</strong></div><div class="summary-row"><span>Rate</span><strong>${money(calculation.cladding.labourRatePerM2)}/m²</strong></div><div class="summary-row summary-total"><span>Cladding Labour</span><strong>${money(calculation.cladding.labourCostExGST)}</strong></div>`;
 
    const totalHoursEquivalent = l.fabricationTotalHours + l.installationTotalHours + (calculation.cladding.labourCostExGST / CFG.business.labourRate);
    $('#total-labour-hours').textContent = `${round(totalHoursEquivalent, 2).toFixed(2)} hours equivalent`;
    $('#total-labour-cost').textContent = money(l.totalCostExGST);
  }
 
  /* =======================================================
     COSTING
     ======================================================= */
 
  function renderCosting() {
    const c =
      calculation.costing;
 
    $('#cost-materials')
      .textContent =
      money(
        c.materialsBeforeMarkupExGST
      );
 
    $('#cost-labour')
      .textContent =
      money(
        c.labourCostExGST
      );
 
    $('#cost-travel')
      .textContent =
      money(
        c.travelExGST
      );
 
    $('#cost-finish')
      .textContent =
      money(
        c.finishExGST
      );
 
    $('#cost-markup')
      .textContent =
      money(
        c.materialMarkupExGST
      );
 
    $('#cost-ex-gst')
      .textContent =
      money(
        c.sellExGST
      );
 
    $('#cost-gst')
      .textContent =
      money(
        c.autoIncGSTUnrounded -
        c.sellExGST
      );
 
    const roundingAmount =
      c.autoIncGST -
      c.autoIncGSTUnrounded;
 
    const roundingEl =
      $('#cost-rounding');
 
    if (roundingEl) {
      roundingEl.textContent =
        money(
          roundingAmount
        );
    }
 
    $('#cost-auto-quote')
      .textContent =
      money(
        c.autoIncGST
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
        c.profitExGST
      );
 
    $('#costing-effective-rate')
      .textContent =
      money(
        c.effectiveRate
      );
 
    $('#costing-cavity-area')
      .textContent =
      sqm(
        c.cavityAreaM2
      );
  }
 
  /* =======================================================
     CLIENT
     ======================================================= */
 
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
        '.field-group, .field, .form-field, label, .input-group'
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
      <label
        for="client-notes"
        style="display:block;font-weight:700;margin-bottom:6px;"
      >
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
 
  /* =======================================================
     CLIENT QUOTE WORDING
     ======================================================= */
 
  function fullDirectionWord() {
    return (
      job.cladding.direction ===
      'vertical'
        ? 'vertical'
        : 'horizontal'
    );
  }
 
  function claddingClientDescription() {
    const type =
      job.cladding.type;
 
    const cfg =
      CFG.cladding[type];
 
    if (!cfg) {
      return 'selected cladding';
    }
 
    if (
      type ===
      'galvMesh50'
    ) {
      return '50×50mm galvanised mesh with 4.0mm wire';
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
        'other selected cladding'
      );
    }
 
    if (
      type ===
      'colorbond'
    ) {
      return (
        job.cladding.profile ||
        cfg.label ||
        'Colorbond cladding'
      );
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
      `${cfg.label}${
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
      'streetToProperty'
    ) {
      return 'the street looking toward the property';
    }
 
    if (
      job.site
        .referenceDirection ===
      'propertyToStreet'
    ) {
      return 'inside the property looking toward the street';
    }
 
    if (
      job.site
        .referenceDirection ===
      'north'
    ) {
      return 'looking North';
    }
 
    if (
      job.site
        .referenceDirection ===
      'south'
    ) {
      return 'looking South';
    }
 
    if (
      job.site
        .referenceDirection ===
      'east'
    ) {
      return 'looking East';
    }
 
    if (
      job.site
        .referenceDirection ===
      'west'
    ) {
      return 'looking West';
    }
 
    if (
      job.site
        .referenceDirection ===
      'other'
    ) {
      return (
        job.site
          .referenceCustom ||
        'the nominated direction'
      );
    }
 
    return 'the street looking toward the property';
  }
 
  function installationReferenceLine() {
    const direction = job.site.referenceDirection;
 
    if (direction === 'streetToProperty') {
      return 'As viewed from the street looking toward the property:';
    }
 
    if (direction === 'propertyToStreet') {
      return 'As viewed from inside the property looking toward the street:';
    }
 
    if (direction === 'north') {
      return 'As viewed looking North:';
    }
 
    if (direction === 'south') {
      return 'As viewed looking South:';
    }
 
    if (direction === 'east') {
      return 'As viewed looking East:';
    }
 
    if (direction === 'west') {
      return 'As viewed looking West:';
    }
 
    const custom = String(job.site.referenceCustom || '').trim();
 
    return custom
      ? `As viewed ${custom}:`
      : 'As viewed from the nominated reference:';
  }
 
  function hingeOrderSide(gate) {
    const shownSide =
      gate.hingeSide ===
      'right'
        ? 'right'
        : 'left';
 
    /*
      Lock-out hinges are labelled from inside the property.
      Only a STREET -> PROPERTY reference requires inversion.
      Inside-property and compass references keep L = L / R = R.
    */
    if (
      job.site
        .referenceDirection ===
      'streetToProperty'
    ) {
      return (
        shownSide ===
        'left'
          ? 'right'
          : 'left'
      );
    }
 
    return shownSide;
  }
 
  function hingeMaterialLabel(gate) {
    const base =
      CFG.hardware
        .hinges
        .lockout
        .label ||
      'Lock-out galvanised hinges';
 
    return (
      `${base} - ${hingeOrderSide(gate).toUpperCase()}`
    );
  }
 
  function latchClientText(latchType) {
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
      return 'D&D dual-way key-lockable latch, supplied with 2 keys';
    }
 
    return String(
      item?.label ||
      'gate latch'
    ).replace(
      /\.$/,
      ''
    );
  }
 
  function postFixingClientText(post) {
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
 
  function gateClientLines() {
    const labels = componentDisplayLabels();
    const seenDoubleLatchPairs = new Set();
    const lines = [];
 
    job.components.filter(gate => gate.type === 'gate').forEach(gate => {
      const hinge = gate.hingeSide === 'left' ? 'left' : 'right';
      const latchSide = hinge === 'left' ? 'right' : 'left';
      const opening = gate.openDirection === 'in' ? 'inward' : 'outward';
      const isDouble = gate.relationship === 'double' && gate.doublePairId;
      lines.push(
        isDouble
          ? `${labels[gate.id]}: hinged on the ${hinge}, meeting at centre, opening ${opening}.`
          : `${labels[gate.id]}: hinged on the ${hinge}, latch on the ${latchSide}, opening ${opening}.`
      );
      if (!isDouble || !seenDoubleLatchPairs.has(gate.doublePairId)) {
        lines.push(`Fit ${latchClientText(gate.latchType)}.`);
        if (isDouble) seenDoubleLatchPairs.add(gate.doublePairId);
      }
    });
    return lines;
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
 
    return (
      `Install ${description} in a ${fullDirectionWord()} direction.`
    );
  }
 
  function quoteTexts() {
    const gates = job.components.filter(c => c.type === 'gate');
    const sliders = job.components.filter(c => c.type === 'slider');
    const panels = job.components.filter(c => c.type === 'fixedPanel');
    const cavityW = Math.round(num(job.site.cavityWidthMm));
    const height = Math.round(num(job.site.finishedHeightMm));
    const clad = claddingClientDescription();
 
    const pairIds = new Set(
      gates.filter(g => g.relationship === 'double' && g.doublePairId).map(g => g.doublePairId)
    );
    const isOneDoubleGate = gates.length === 2 && pairIds.size === 1 && gates.every(g => g.relationship === 'double');
 
    let projectType = 'gate project';
    if (sliders.length === 1 && !gates.length && !panels.length) projectType = 'sliding gate';
    else if (sliders.length > 1 && !gates.length && !panels.length) projectType = 'sliding gate project';
    else if (isOneDoubleGate && !sliders.length) projectType = 'double gate';
    else if (gates.length === 1 && !panels.length && !sliders.length) projectType = 'gate';
    else if (!gates.length && !sliders.length && panels.length === 1) projectType = 'fixed panel';
    else if (!gates.length && !sliders.length && panels.length > 1) projectType = 'fixed panel project';
 
    const project = `Supply, fabricate and install a custom steel-framed ${projectType} for the measured cavity approximately ${cavityW}mm wide × ${height}mm high, with ${clad}.`;
 
    const fabricationLines = [];
    if (gates.length) {
      fabricationLines.push(gates.length === 1
        ? `Fabricate custom steel gate frame to suit the ${cavityW}mm wide opening.`
        : `Fabricate ${gates.length} custom steel gate frames to suit the ${cavityW}mm wide opening.`);
    }
    sliders.forEach(s => {
      fabricationLines.push(
        `Fabricate custom sliding gate approximately ${Math.round(sliderManufacturedLengthMm(s))}mm long × ${Math.round(sliderFrameHeightMm())}mm high, including 100×50mm Duragalv lower rail, 50×50mm Duragalv top/end framing and selected internal support rails.`
      );
    });
    if (panels.length) {
      fabricationLines.push(panels.length === 1
        ? 'Fabricate fixed panel to suit the measured opening.'
        : `Fabricate ${panels.length} fixed panels to suit the measured opening.`);
    }
    fabricationLines.push(...postClientLines());
    fabricationLines.push(claddingFabricationText());
 
    const installationLines = [`As viewed from ${referenceText()}:`];
    installationLines.push(...gateClientLines());
    sliders.forEach(s => {
      installationLines.push(
        `Sliding gate opens to the ${s.slideDirection}, complete with galvanised track, roller wheels, guide rollers, roller support frame, nominated catch arrangement and selected latch hardware.`
      );
    });
    if (gates.length) {
      installationLines.push(gates.length === 1
        ? 'Fit and adjust heavy-duty galvanised lock-out hinges.'
        : 'Fit and adjust heavy-duty galvanised lock-out hinges to each gate.');
    }
    if (panels.length) {
      installationLines.push(panels.length === 1
        ? 'Install fixed panel to the nominated post arrangement.'
        : 'Install fixed panels to the nominated post arrangements.');
    }
 
    const finish = job.powder.enabled
      ? `Steel posts and gate/fixed-panel steelwork powder coated in ${job.powder.colour || 'the selected colour'}.\nAllow up to 2 weeks for powder-coating.`
      : '';
 
    return {
      project,
      fabrication: fabricationLines.join('\n'),
      installation: installationLines.join('\n'),
      finish
    };
  }
 
  function emailContent(texts) {
    const ref =
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
      `JTLA Gates Quote ${ref}`;
 
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
 
  async function sendEmailToClient() {
    const to =
      String(
        job.client.email ||
        ''
      ).trim();
 
    if (
      !to ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        to
      )
    ) {
      alert(
        'Please enter a valid client email address.'
      );
 
      return;
    }
 
    const texts =
      quoteTexts();
 
    const email =
      emailContent(texts);
 
    const bcc =
      CFG.quote?.bccEmail ||
      'jtladesign@gmail.com';
 
    const href =
      `mailto:${encodeURIComponent(to)}` +
      `?bcc=${encodeURIComponent(bcc)}` +
      `&subject=${encodeURIComponent(email.subject)}` +
      `&body=${encodeURIComponent(email.body)}`;
 
    window.location.href =
      href;
  }
 
  async function sendSmsToClient() {
    const mobile =
      String(
        job.client.mobile ||
        ''
      ).replace(
        /\D/g,
        ''
      );
 
    if (
      !/^04\d{8}$/.test(
        mobile
      )
    ) {
      alert(
        'Please enter a valid 10-digit mobile number beginning with 04.'
      );
 
      return;
    }
 
    const message =
      smsContent();
 
    /*
      Keep a clipboard copy as a backup, then open
      the phone's SMS app with number + message ready.
    */
    try {
      await navigator.clipboard
        ?.writeText(
          message
        );
    } catch {
      // SMS launch still proceeds if clipboard access is blocked.
    }
 
    window.location.href =
      `sms:${mobile}?body=${encodeURIComponent(message)}`;
  }
 
  function smsContent() {
    const ref = job.client.projectNumber;
    const amount = money(calculation.costing.finalIncGST);
    const firstName = job.client.name ? job.client.name.trim().split(/\s+/)[0] : '';
    const greeting = firstName ? `Hi ${firstName},` : 'Hi,';
    const cavity = Math.round(num(job.site.cavityWidthMm));
    const height = Math.round(num(job.site.finishedHeightMm));
    const gates = job.components.filter(c => c.type === 'gate').length;
    const sliders = job.components.filter(c => c.type === 'slider').length;
    const panels = job.components.filter(c => c.type === 'fixedPanel').length;
 
    let work = 'custom gate';
    if (sliders === 1 && !gates && !panels) work = 'custom sliding gate';
    else if (sliders > 1 && !gates && !panels) work = 'custom sliding gates';
    else if (gates > 1 && !sliders) work = 'custom gates';
    else if (!gates && !sliders && panels === 1) work = 'custom fixed panel';
    else if (!gates && !sliders && panels > 1) work = 'custom fixed panels';
    else if ((gates || sliders) && panels) work = 'custom gate and fixed panel works';
    else if (gates && sliders) work = 'custom gate works';
 
    let claddingName = claddingClientDescription();
    if (job.cladding.type === 'treatedPinePalings') claddingName = 'treated pine';
    if (job.cladding.type === 'ekodeck') claddingName = 'Ekodeck screening';
    if (job.cladding.type === 'galvMesh50') claddingName = 'galvanised mesh';
    if (job.cladding.type === 'colorbond') claddingName = `Colorbond${job.cladding.colour ? ` ${job.cladding.colour}` : ''}`;
 
    return `${greeting}\n\nJTLA Gates quote ${ref}:\nSupply and install ${work} with ${claddingName}.\n${cavity}mm wide cavity, finished height ${height}mm.\nTotal ${amount} inc. GST.\n\nThank you,\nJody`;
  }
 
  /* =======================================================
     QUOTE
     ======================================================= */
 
  function renderQuote() {
    const c =
      calculation.costing;
 
    ensureSendQuoteUi();
 
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
        c.finalIncGST,
        2
      )
    );
 
    /*
      Profit and effective $/m² remain in Costing only.
      They are deliberately hidden in Send Quote.
    */
    hideMetricById(
      'quote-profit'
    );
 
    hideMetricById(
      'quote-effective-rate'
    );
 
    const texts =
      quoteTexts();
 
    /*
      The old letterhead-style finished quote is retained
      in the DOM for compatibility, but hidden by
      ensureSendQuoteUi(). Email + SMS are the review areas.
    */
    const reference =
      $('#finished-quote-reference');
 
    if (reference) {
      reference.textContent =
        `Quote ${job.client.projectNumber}`;
    }
 
    const client =
      $('#finished-quote-client');
 
    if (client) {
      client.textContent =
        job.client.name ||
        'Client';
    }
 
    const project =
      $('#quote-project-description');
 
    if (project) {
      project.textContent =
        texts.project;
    }
 
    const fabrication =
      $('#quote-fabrication');
 
    if (fabrication) {
      fabrication.textContent =
        texts.fabrication;
    }
 
    const installation =
      $('#quote-installation');
 
    if (installation) {
      installation.textContent =
        texts.installation;
    }
 
    const finish =
      $('#quote-finish');
 
    if (finish) {
      finish.textContent =
        texts.finish ||
        '';
    }
 
    const exGst =
      $('#quote-price-ex-gst');
 
    if (exGst) {
      exGst.textContent =
        money(
          c.finalExGST
        );
    }
 
    const gst =
      $('#quote-price-gst');
 
    if (gst) {
      gst.textContent =
        money(
          c.finalGST
        );
    }
 
    const incGst =
      $('#quote-price-inc-gst');
 
    if (incGst) {
      incGst.textContent =
        money(
          c.finalIncGST
        );
    }
 
    const terms =
      $('#quote-terms');
 
    if (terms) {
      terms.textContent =
        CFG.quote.depositText;
    }
 
    const bank =
      $('#quote-bank-details');
 
    if (bank) {
      bank.innerHTML = `
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
    }
 
    const email =
      emailContent(texts);
 
    const emailSubject =
      $('#email-subject');
 
    if (emailSubject) {
      emailSubject.value =
        email.subject;
    }
 
    const emailBody =
      $('#email-body');
 
    if (emailBody) {
      emailBody.value =
        email.body;
    }
 
    const smsBody =
      $('#sms-body');
 
    if (smsBody) {
      smsBody.value =
        smsContent();
    }
  }
 
  /* =======================================================
     SAVED JOBS
     ======================================================= */
 
  function saveCurrentJob() {
    const jobs =
      getSavedJobsRaw();
 
    const snapshot =
      deepClone(job);
 
    snapshot.savedAt =
      new Date().toISOString();
 
    const index =
      jobs.findIndex(
        (j) =>
          j.id ===
            snapshot.id ||
          j?.client
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
 
    toast('Job saved');
 
    renderSavedJobs();
  }
 
  function renderSavedJobs() {
    const root =
      $('#saved-jobs-list');
 
    const jobs =
      getSavedJobsRaw()
        .sort(
          (a, b) =>
            String(
              b.updatedAt ||
              b.savedAt
            ).localeCompare(
              String(
                a.updatedAt ||
                a.savedAt
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
        (j) =>
          j.id === jobId
      );
 
    if (!found) {
      return;
    }
 
    job =
      hydrateJob(found);
 
    undoStack = [];
 
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
          (j) =>
            j.id !==
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
 
  /* =======================================================
     TOAST / DIALOG / CLIPBOARD
     ======================================================= */
 
  function toast(message) {
    const el =
      $('#toast');
 
    if (!el) {
      return;
    }
 
    el.textContent =
      message;
 
    el.classList.add(
      'show'
    );
 
    clearTimeout(
      toastTimer
    );
 
    toastTimer =
      setTimeout(
        () =>
          el.classList.remove(
            'show'
          ),
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
      const area =
        document.createElement(
          'textarea'
        );
 
      area.value =
        text;
 
      document.body
        .appendChild(area);
 
      area.select();
 
      document.execCommand(
        'copy'
      );
 
      area.remove();
 
      toast(
        successMessage
      );
    }
  }
 
  /* =======================================================
     EVENT HELPERS
     ======================================================= */
 
  function inferValue(el) {
    if (
      el.type ===
      'number'
    ) {
      return (
        el.value === ''
          ? 0
          : Number(
              el.value
            )
      );
    }
 
    if (
      el.type ===
      'checkbox'
    ) {
      return el.checked;
    }
 
    if (
      el.dataset
        .claddingNested ===
      'custom.priceIncludesGST'
    ) {
      return (
        el.value ===
        'true'
      );
    }
 
    return el.value;
  }
 
  function isPricingPath(path) {
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
 
  function handleStateInput(el) {
    const path =
      el.dataset
        .statePath;
 
    if (!path) {
      return false;
    }
 
    let value =
      inferValue(el);
 
    if (path === 'site.oneWayTravelKm') {
      value = Math.max(0, Math.round(num(value)));
      el.value = value || '';
    }
 
    if (
      path ===
        'client.name' ||
      path ===
        'client.address'
    ) {
      value =
        titleCase(value);
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
 
      el.value =
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
 
      el.value =
        value;
    }
 
    /*
      Cladding material changed:
      clear old material-specific finish values.
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
            costingMode: 'total',
            totalCost: 0,
            quantity: 1,
            unitCost: 0,
            priceIncludesGST: true,
            labourRatePerM2: 0
          };
 
          job.cladding.colorbond = {
            labourRatePerM2: 0
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
      () =>
        setPath(
          job,
          path,
          value
        ),
      {
        pricing:
          isPricingPath(path)
      }
    );
 
    return true;
  }
 
 
  function sliderPostByKey(slider, key) {
    if (key === 'catchPost') return slider.catchPost;
    if (key === 'rollerGuide.leftPost') return slider.rollerGuide.leftPost;
    if (key === 'rollerGuide.rightPost') return slider.rollerGuide.rightPost;
    return null;
  }
 
  function handleSliderField(el) {
    const id = el.dataset.componentId;
    const slider = job.components.find(c => c.id === id && c.type === 'slider');
    if (!slider) return false;
 
    if (el.dataset.sliderField) {
      const field = el.dataset.sliderField;
      const numeric = ['manualOpeningWidthMm', 'overhangMm', 'wheelQty', 'guideRollerQty', 'manualTrackLengthM'];
      const value = numeric.includes(field) ? num(el.value) : el.value;
      mutate(() => { slider[field] = value; }, { pricing: true });
      return true;
    }
 
    if (el.dataset.sliderGuideField) {
      const field = el.dataset.sliderGuideField;
      mutate(() => { slider.rollerGuide[field] = num(el.value); }, { pricing: true });
      return true;
    }
 
    if (el.dataset.sliderPostField) {
      const post = sliderPostByKey(slider, el.dataset.sliderPostKey);
      if (!post) return true;
      const field = el.dataset.sliderPostField;
      mutate(() => { post[field] = el.value; }, { pricing: true });
      return true;
    }
 
    if (el.dataset.sliderRailField) {
      const rail = (slider.internalRails || []).find(r => r.id === el.dataset.railId);
      if (!rail) return true;
      const field = el.dataset.sliderRailField;
      const value = field === 'manualLengthMm' ? num(el.value) : el.value;
      mutate(() => { rail[field] = value; }, { pricing: true });
      return true;
    }
 
    return false;
  }
 
  function handlePanelRailField(el) {
    if (!el.dataset.panelRailField) return false;
    const panel = job.components.find(c => c.id === el.dataset.componentId && c.type === 'fixedPanel');
    if (!panel) return true;
    const rail = (panel.internalRails || []).find(r => r.id === el.dataset.railId);
    if (!rail) return true;
    const field = el.dataset.panelRailField;
    const value = field === 'manualLengthMm' ? num(el.value) : el.value;
    mutate(() => {
      panel.railMode = 'manual';
      rail[field] = value;
    }, { pricing: true });
    return true;
  }
 
  function handleCatchField(el) {
    if (!el.dataset.catchField) return false;
 
    const component = job.components.find(c => c.id === el.dataset.componentId);
 
    if (!component || !['post', 'fixedPanel'].includes(component.type)) {
      return true;
    }
 
    const field = el.dataset.catchField;
 
    mutate(() => {
      component[field] = el.value;
 
      if (field === 'catchForSliderId' && el.value) {
        const targetSlider = job.components.find(
          c => c.type === 'slider' && c.id === el.value
        );
 
        if (targetSlider) {
          targetSlider.includeCatchPost = false;
        }
      }
 
      if (
        field === 'catchForSliderId' &&
        !el.value &&
        component.type === 'fixedPanel'
      ) {
        component.catchPostSide = 'right';
      }
    }, { pricing: true });
 
    return true;
  }
 
  function handleComponentField(el) {
    const id =
      el.dataset
        .componentId;
 
    const field =
      el.dataset
        .componentField;
 
    if (
      !id ||
      !field
    ) {
      return false;
    }
 
    const c =
      job.components.find(
        (x) =>
          x.id === id
      );
 
    if (!c) {
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
        ? num(el.value)
        : el.value;
 
    mutate(
      () => {
        const oldPairId =
          c.doublePairId;
 
        c[field] =
          value;
 
        /*
          Turning a paired gate back into Single
          also releases the other linked leaf.
        */
 
        if (
          field ===
            'relationship' &&
          value ===
            'single'
        ) {
          if (
            oldPairId
          ) {
            job.components.forEach(
              (other) => {
                if (
                  other.type ===
                    'gate' &&
                  other.id !==
                    c.id &&
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
 
          c.doublePairId =
            '';
        }
 
        /*
          Selecting Double Gate automatically creates
          the second gate leaf immediately beside it.
 
          Each gate is a real Gate component, so both
          leaves are included in steel, hardware and labour.
        */
 
        if (
          field ===
            'relationship' &&
          value ===
            'double'
        ) {
          if (
            !c.doublePairId
          ) {
            c.doublePairId =
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
                  c.id &&
                other.relationship ===
                  'double' &&
                other.doublePairId ===
                  c.doublePairId
            );
 
          if (
            !pairMembers.length
          ) {
            const partner =
              newGate();
 
            partner.relationship =
              'double';
 
            partner.doublePairId =
              c.doublePairId;
 
            partner.frameType =
              c.frameType;
 
            partner.openDirection =
              c.openDirection;
 
            partner.widthMode =
              c.widthMode;
 
            partner.manualWidthMm =
              c.manualWidthMm;
 
            partner.internalRailCount =
              c.internalRailCount;
 
            partner.latchType =
              c.latchType;
 
            partner.hingeSide =
              c.hingeSide ===
              'left'
                ? 'right'
                : 'left';
 
            const index =
              job.components.findIndex(
                (x) =>
                  x.id ===
                  c.id
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
    el
  ) {
    const id =
      el.dataset
        .componentId;
 
    const side =
      el.dataset
        .panelSide;
 
    const field =
      el.dataset
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
        (x) =>
          x.id === id &&
          x.type ===
            'fixedPanel'
      );
 
    if (!panel) {
      return true;
    }
 
    const p =
      side ===
      'left'
        ? panel.leftPost
        : panel.rightPost;
 
    const value =
      field ===
      'manualFinishedHeightMm'
        ? num(el.value)
        : el.value;
 
    mutate(
      () => {
        p[field] =
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
    el
  ) {
    if (
      el.dataset
        .claddingField
    ) {
      const field =
        el.dataset
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
              el.value === ''
                ? ''
                : num(
                    el.value
                  )
            )
          : el.value;
 
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
      el.dataset
        .claddingNested
    ) {
      const path =
        `cladding.${el.dataset.claddingNested}`;
 
      let value =
        inferValue(el);
 
      if (
        [
          'custom.totalCost',
          'custom.quantity',
          'custom.unitCost',
          'custom.labourRatePerM2',
          'colorbond.labourRatePerM2'
        ].some(
          (x) =>
            el.dataset
              .claddingNested ===
            x
        )
      ) {
        value =
          num(el.value);
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
 
  /* =======================================================
     CHANGE EVENTS
     ======================================================= */
 
  document.addEventListener(
    'change',
    (event) => {
      const el =
        event.target;
 
      if (
        !(
          el instanceof
          HTMLElement
        )
      ) {
        return;
      }
 
      if (
        el.dataset
          .actionChange ===
        'set-double-pair'
      ) {
        const c =
          job.components.find(
            (x) =>
              x.id ===
                el.dataset
                  .componentId &&
              x.type ===
                'gate'
          );
 
        if (!c) {
          return;
        }
 
        mutate(
          () => {
            c.doublePairId =
              el.value ===
              '__new__'
                ? `Pair ${Date.now()
                    .toString()
                    .slice(-4)}`
                : el.value;
          },
          {
            pricing:
              true
          }
        );
 
        return;
      }
 
      if (handleSliderField(el)) {
        return;
      }
 
      if (handlePanelRailField(el)) {
        return;
      }
 
      if (handleCatchField(el)) {
        return;
      }
 
      if (
        handleComponentField(
          el
        )
      ) {
        return;
      }
 
      if (
        handlePanelPostField(
          el
        )
      ) {
        return;
      }
 
      if (
        handleCladdingField(
          el
        )
      ) {
        return;
      }
 
      handleStateInput(el);
    }
  );
 
  /* =======================================================
     INPUT EVENTS
     ======================================================= */
 
  document.addEventListener(
    'input',
    (event) => {
      const el =
        event.target;
 
      if (
        !(
          el instanceof
          HTMLElement
        )
      ) {
        return;
      }
 
      if (el.dataset.claddingNested === 'custom.name') {
        job.cladding.custom.name = el.value;
        job.updatedAt = new Date().toISOString();
        autosave();
        calculation = calculateJob();
        renderCladding();
        renderQuote();
        return;
      }
 
      if (
        el.dataset
          .statePath ===
          'client.name' ||
        el.dataset
          .statePath ===
          'client.mobile' ||
        el.dataset
          .statePath ===
          'client.notes'
      ) {
        let value =
          el.value;
 
        if (
          el.dataset
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
 
            el.value =
              value;
          }
        }
 
        setPath(
          job,
          el.dataset
            .statePath,
          value
        );
 
        autosave();
        renderHeader();
      }
    }
  );
 
  /* =======================================================
     CLICK EVENTS
     ======================================================= */
 
  document.addEventListener(
    'click',
    (event) => {
      const btn =
        event.target.closest(
          '[data-action], .nav-tab, #undo-btn'
        );
 
      if (!btn) {
        return;
      }
 
      if (
        btn.classList.contains(
          'nav-tab'
        )
      ) {
        navigate(
          btn.dataset
            .sectionTarget
        );
 
        return;
      }
 
      if (
        btn.id ===
        'undo-btn'
      ) {
        undo();
 
        return;
      }
 
      const action =
        btn.dataset.action;
 
      if (
        action ===
        'add-component'
      ) {
        const type =
          btn.dataset
            .componentType;
 
        mutate(
          () => {
            let c;
 
            if (
              type === 'post'
            ) {
              c =
                newPost();
            }
 
            if (
              type === 'gate'
            ) {
              c =
                newGate();
            }
 
            if (
              type ===
              'fixedPanel'
            ) {
              c =
                newFixedPanel();
            }
 
            if (type === 'slider') {
              c = newSlider();
            }
 
            if (type === 'catchPost') {
              c = newPost();
              c.catchForSliderId = defaultCatchSliderId();
 
              const targetSlider = job.components.find(
                item => item.type === 'slider' && item.id === c.catchForSliderId
              );
 
              if (targetSlider) {
                targetSlider.includeCatchPost = false;
              }
            }
 
            if (type === 'catchFixedPanel') {
              c = newFixedPanel();
              c.catchForSliderId = defaultCatchSliderId();
              c.catchPostSide = 'right';
 
              const targetSlider = job.components.find(
                item => item.type === 'slider' && item.id === c.catchForSliderId
              );
 
              if (targetSlider) {
                targetSlider.includeCatchPost = false;
              }
            }
 
            if (!c) {
              return;
            }
 
            job.components.push(
              c
            );
 
            /*
              Do not jump to the new component.
              Build the full left-to-right layout first,
              then work through the cards in order.
            */
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
 
      if (
        action ===
        'select-component'
      ) {
        job.selectedComponentId =
          btn.dataset
            .componentId;
 
        autosave();
 
        renderMudMap();
        renderSite();
        renderComponentEditor();
 
        setTimeout(
          () => {
            $(
              `#component-card-${CSS.escape(job.selectedComponentId)}`
            )?.scrollIntoView({
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
 
      if (
        action ===
          'move-component-left' ||
        action ===
          'move-component-right'
      ) {
        const id =
          btn.dataset
            .componentId;
 
        const index =
          job.components
            .findIndex(
              (c) =>
                c.id === id
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
            ] = [
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
 
      if (
        action ===
        'delete-component'
      ) {
        const id =
          btn.dataset
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
                    (c) =>
                      c.id === id
                  );
 
                /*
                  If one leaf of a linked double gate
                  is deleted, remove both leaves.
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
                      (c) =>
                        !(
                          c.type ===
                            'gate' &&
                          c.relationship ===
                            'double' &&
                          c.doublePairId ===
                            target.doublePairId
                        )
                    );
                } else {
                  job.components =
                    job.components.filter(
                      (c) =>
                        c.id !== id
                    );
                }
 
                if (
                  !job.components.some(
                    (c) =>
                      c.id ===
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
 
      if (
        action ===
        'set-post-height-mode'
      ) {
        const c =
          job.components.find(
            (x) =>
              x.id ===
                btn.dataset
                  .componentId &&
              x.type ===
                'post'
          );
 
        if (!c) {
          return;
        }
 
        mutate(
          () => {
            c.heightMode =
              btn.dataset.value;
          },
          {
            pricing:
              true
          }
        );
 
        return;
      }
 
      if (
        action ===
        'set-panel-post-height-mode'
      ) {
        const panel =
          job.components.find(
            (x) =>
              x.id ===
                btn.dataset
                  .componentId &&
              x.type ===
                'fixedPanel'
          );
 
        if (!panel) {
          return;
        }
 
        const p =
          btn.dataset
            .panelSide ===
          'left'
            ? panel.leftPost
            : panel.rightPost;
 
        mutate(
          () => {
            p.heightMode =
              btn.dataset.value;
          },
          {
            pricing:
              true
          }
        );
 
        return;
      }
 
      if (
        action ===
        'set-gate-width-mode'
      ) {
        const c =
          job.components.find(
            (x) =>
              x.id ===
                btn.dataset
                  .componentId &&
              x.type ===
                'gate'
          );
 
        if (!c) {
          return;
        }
 
        mutate(
          () => {
            c.widthMode =
              btn.dataset.value;
 
            if (
              c.widthMode ===
                'manual' &&
              (
                !c.manualWidthMm ||
                c.manualWidthMm <=
                  0
              )
            ) {
              c.manualWidthMm =
                calculation
                  .gateWidths[
                    c.id
                  ] ||
                1000;
            }
 
            /*
              Keep paired double-gate leaf width mode
              matched unless deliberately edited later.
            */
 
            if (
              c.relationship ===
                'double' &&
              c.doublePairId
            ) {
              const partner =
                job.components.find(
                  (g) =>
                    g.type ===
                      'gate' &&
                    g.id !==
                      c.id &&
                    g.relationship ===
                      'double' &&
                    g.doublePairId ===
                      c.doublePairId
                );
 
              if (partner) {
                partner.widthMode =
                  c.widthMode;
 
                if (
                  c.widthMode ===
                  'manual'
                ) {
                  partner.manualWidthMm =
                    c.manualWidthMm;
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
 
      if (
        action ===
        'add-hole'
      ) {
        const id =
          btn.dataset
            .componentId;
 
        const side =
          btn.dataset
            .panelSide ||
          '';
 
        const input =
          $(
            `#hole-input-${CSS.escape(id)}-${CSS.escape(side || 'main')}`
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
 
        let p;
 
        const comp =
          job.components.find(
            (c) =>
              c.id === id
          );
 
        if (
          comp?.type ===
          'post'
        ) {
          p =
            comp;
        }
 
        if (
          comp?.type ===
          'fixedPanel'
        ) {
          p =
            side ===
            'left'
              ? comp.leftPost
              : comp.rightPost;
        }
 
        if (comp?.type === 'slider' && side.startsWith('slider:')) {
          p = sliderPostByKey(comp, side.slice(7));
        }
 
        if (!p) {
          return;
        }
 
        if (
          (
            p.holePositionsMm ||
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
            p.holePositionsMm =
              [
                ...(p.holePositionsMm || []),
                value
              ].sort(
                (a, b) =>
                  a - b
              );
          },
          {
            pricing:
              true
          }
        );
 
        return;
      }
 
      if (
        action ===
        'delete-hole'
      ) {
        const id =
          btn.dataset
            .componentId;
 
        const side =
          btn.dataset
            .panelSide ||
          '';
 
        const hole =
          num(
            btn.dataset.hole
          );
 
        const comp =
          job.components.find(
            (c) =>
              c.id === id
          );
 
        let p;
 
        if (
          comp?.type ===
          'post'
        ) {
          p =
            comp;
        }
 
        if (
          comp?.type ===
          'fixedPanel'
        ) {
          p =
            side ===
            'left'
              ? comp.leftPost
              : comp.rightPost;
        }
 
        if (comp?.type === 'slider' && side.startsWith('slider:')) {
          p = sliderPostByKey(comp, side.slice(7));
        }
 
        if (!p) {
          return;
        }
 
        mutate(
          () => {
            p.holePositionsMm =
              (
                p.holePositionsMm ||
                []
              ).filter(
                (v) =>
                  num(v) !==
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
 
      if (action === 'add-panel-rail') {
        const panel = job.components.find(c => c.id === btn.dataset.componentId && c.type === 'fixedPanel');
        if (!panel) return;
        mutate(() => {
          panel.railMode = 'manual';
          panel.internalRails = Array.isArray(panel.internalRails) ? panel.internalRails : [];
          panel.internalRails.push(newPanelRail(btn.dataset.orientation || 'horizontal', CFG.defaults.frameType, 'extra'));
        }, { pricing: true, undoable: true });
        return;
      }
 
      if (action === 'delete-panel-rail') {
        const panel = job.components.find(c => c.id === btn.dataset.componentId && c.type === 'fixedPanel');
        if (!panel) return;
        mutate(() => {
          panel.railMode = 'manual';
          panel.internalRails = (panel.internalRails || []).filter(r => r.id !== btn.dataset.railId);
        }, { pricing: true, undoable: true });
        return;
      }
 
      if (action === 'reset-panel-rails-auto') {
        const panel = job.components.find(c => c.id === btn.dataset.componentId && c.type === 'fixedPanel');
        if (!panel) return;
        mutate(() => {
          panel.railMode = 'auto';
          panel.internalRails = [newPanelRail('horizontal', CFG.defaults.frameType, 'top'), newPanelRail('horizontal', CFG.defaults.frameType, 'mid'), newPanelRail('horizontal', CFG.defaults.frameType, 'bottom')];
        }, { pricing: true, undoable: true });
        return;
      }
 
      if (action === 'add-slider-rail') {
        const slider = job.components.find(c => c.id === btn.dataset.componentId && c.type === 'slider');
        if (!slider) return;
        mutate(() => {
          slider.internalRails.push(newSliderRail(btn.dataset.orientation || 'horizontal'));
        }, { pricing: true, undoable: true });
        return;
      }
 
      if (action === 'delete-slider-rail') {
        const slider = job.components.find(c => c.id === btn.dataset.componentId && c.type === 'slider');
        if (!slider) return;
        mutate(() => {
          slider.internalRails = slider.internalRails.filter(r => r.id !== btn.dataset.railId);
        }, { pricing: true, undoable: true });
        return;
      }
 
      if (action === 'toggle-slider-item') {
        const slider = job.components.find(c => c.id === btn.dataset.componentId && c.type === 'slider');
        if (!slider) return;
        mutate(() => {
          slider[btn.dataset.field] = !slider[btn.dataset.field];
        }, { pricing: true });
        return;
      }
 
      if (action === 'reset-slider-auto') {
        const index = job.components.findIndex(c => c.id === btn.dataset.componentId && c.type === 'slider');
        if (index < 0) return;
        mutate(() => {
          const fresh = newSlider();
          fresh.id = job.components[index].id;
          job.components[index] = fresh;
        }, { pricing: true, undoable: true });
        return;
      }
 
      if (
        action ===
        'toggle-cladding'
      ) {
        const field =
          btn.dataset.field;
 
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
 
      if (
        action ===
        'set-accessory-length-mode'
      ) {
        mutate(
          () => {
            job.cladding
              .accessoryLengthMode =
              btn.dataset.value;
 
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
 
      if (
        action ===
        'set-powder'
      ) {
        mutate(
          () => {
            job.powder.enabled =
              btn.dataset.value ===
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
 
      if (
        action ===
        'copy-email'
      ) {
        sendEmailToClient();
 
        return;
      }
 
      if (
        action ===
        'copy-sms'
      ) {
        sendSmsToClient();
 
        return;
      }
 
      if (
        action ===
        'save-job'
      ) {
        saveCurrentJob();
 
        return;
      }
 
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
 
      if (
        action ===
        'open-saved-job'
      ) {
        const id =
          btn.dataset
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
 
      if (
        action ===
        'delete-saved-job'
      ) {
        const id =
          btn.dataset
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
 
  /* =======================================================
     MANUAL QUOTE
     ======================================================= */
 
  $('#quote-final-amount')
    ?.addEventListener(
      'change',
      (event) => {
        const value =
          Math.max(
            0,
            num(
              event.target
                .value
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
 
  /* =======================================================
     CONFIRM DIALOG
     ======================================================= */
 
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
          const fn =
            dialogAction;
 
          dialogAction =
            null;
 
          fn();
        } else {
          dialogAction =
            null;
        }
      }
    );
 
  /* =======================================================
     UNDO BUTTON
     ======================================================= */
 
  function updateUndoButton() {
    const btn =
      $('#undo-btn');
 
    if (btn) {
      btn.disabled =
        undoStack.length ===
        0;
    }
  }
 
  /* =======================================================
     INITIALISE
     ======================================================= */
 
  renderAll();
 
})();
