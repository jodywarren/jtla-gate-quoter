'use strict'; (() => { const CFG = window.PRICES; if (!CFG) { console.error('JTLA Gates: PRICES configuration was not loaded.'); return; } const $ = (selector, root = document) => root.querySelector(selector); const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector)); const money = (value) => { const n = Number(value) || 0; return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n); }; const num = (value, fallback = 0) => { const n = Number(value); return Number.isFinite(n) ? n : fallback; }; const round = (value, digits = 2) => { const f = 10 ** digits; return Math.round((num(value) + Number.EPSILON) * f) / f; }; const clamp = (value, min, max) => Math.min(max, Math.max(min, value)); const deepClone = (value) => JSON.parse(JSON.stringify(value)); const uid = (prefix = 'id') => { if (window.crypto && crypto.randomUUID) { return `${prefix}_${crypto.randomUUID()}`; } return `${prefix}_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 9)}`; }; const titleCase = (value) => { return String(value || '') .toLowerCase() .replace(/\b([a-z])/g, (m) => m.toUpperCase()) .replace(/\b(Mc)([a-z])/g, (_, a, b) => a + b.toUpperCase()) .replace(/\b(O')([a-z])/g, (_, a, b) => a + b.toUpperCase());
  };
  const safe = (value) =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;'); const gstExclusive = (amount, priceIncludesGST) => { const v = num(amount); return priceIncludesGST ? v / (1 + CFG.business.gst) : v; }; const gstInclusive = (amount, priceIncludesGST) => { const v = num(amount); return priceIncludesGST ? v : v * (1 + CFG.business.gst); }; const ceilTo = (value, increment) => { const inc = num(increment, 1); if (inc <= 0) { return value; } return Math.ceil(num(value) / inc) * inc; }; const formatHours = (hours) => `${round(hours, 2).toFixed(2)} hr`; const mm = (value) => `${Math.round(num(value))} mm`; const sqm = (value) => `${round(value, 2).toFixed(2)} m²`; const lm = (value) => `${round(value, 2).toFixed(2)} m`; const getPath = (obj, path) => { return String(path) .split('.') .reduce((acc, key) => acc?.[key], obj); }; const setPath = (obj, path, value) => { const parts = String(path).split('.'); let ref = obj; parts.forEach((key, index) => { if (index === parts.length - 1) { ref[key] = value; } else { if (!ref[key] || typeof ref[key] !== 'object') { ref[key] = {}; } ref = ref[key]; } }); }; function getSavedJobsRaw() { try { const raw = localStorage.getItem(CFG.storage.savedJobsKey); const parsed = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? parsed : []; } catch { return []; } } function projectDigits(value) { return String( Math.max(0, parseInt(value, 10) || 0) ).padStart(CFG.projects.numberDigits, '0'); } function formatProjectNumber(value) { return `${CFG.projects.prefix}${projectDigits(value)}`; } function parseProjectNumber(value) { const digits = String(value || '').replace(/\D/g, ''); if (!digits) { return CFG.projects.startingProjectNumber; } const tail = digits.slice(-CFG.projects.numberDigits); return ( parseInt(tail, 10) || CFG.projects.startingProjectNumber ); } function nextProjectNumber() { const saved = getSavedJobsRaw(); const nums = saved .map((job) => parseProjectNumber( job?.client?.projectNumber || job?.projectNumber ) ) .filter(Number.isFinite); const activeRaw = localStorage.getItem(CFG.storage.activeJobKey); if (activeRaw) { try { const active = JSON.parse(activeRaw); nums.push( parseProjectNumber( active?.client?.projectNumber ) ); } catch { } } const highest = nums.length ? Math.max( ...nums, CFG.projects.startingProjectNumber - 1 ) : CFG.projects.startingProjectNumber - 1; return highest + 1; } function defaultCladding() { return { type: CFG.defaults.claddingType, direction: CFG.defaults.claddingDirection, colour: '', finish: '', profile: '', gapMm: CFG.defaults.claddingGapMm, palingLengthMm: '', palingWidthMm: '', accessoryLengthMode: 'auto', accessoryLengthM: 0, capping: true, plinth: true, custom: { name: '', costingMode: 'total', totalCost: 0, quantity: 1, unitCost: 0, priceIncludesGST: true, labourRatePerM2: 0 }, colorbond: { labourRatePerM2: 0 } }; } function createNewJob(projectNumber = nextProjectNumber()) { return { schemaVersion: CFG.version.schema, id: uid('job'), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), site: { cavityWidthMm: 0, finishedHeightMm: CFG.defaults.finishedHeightMm, oneWayTravelKm: 0, referenceDirection: CFG.defaults.referenceDirection, referenceCustom: '' }, components: [], selectedComponentId: null, cladding: defaultCladding(), powder: { enabled: CFG.defaults.powderCoating, colour: CFG.defaults.powderColour }, labour: { additionalFabricationHours: 0, additionalInstallHours: 0 }, client: { name: '', address: '', projectNumber: formatProjectNumber(projectNumber), mobile: CFG.clientFields.mobile.defaultValue, email: '', notes: '', includeNotesInQuote: false }, quote: { mode: 'auto', manualIncGST: null }, ui: { activeSection: 'site' } }; } function hydrateJob(raw) { const base = createNewJob( parseProjectNumber(raw?.client?.projectNumber) ); const merged = { ...base, ...raw, site: { ...base.site, ...(raw?.site || {}) }, cladding: { ...base.cladding, ...(raw?.cladding || {}), custom: { ...base.cladding.custom, ...(raw?.cladding?.custom || {}) }, colorbond: { ...base.cladding.colorbond, ...(raw?.cladding?.colorbond || {}) } }, powder: { ...base.powder, ...(raw?.powder || {}) }, labour: { ...base.labour, ...(raw?.labour || {}) }, client: { ...base.client, ...(raw?.client || {}) }, quote: { ...base.quote, ...(raw?.quote || {}) }, ui: { ...base.ui, ...(raw?.ui || {}) }, components: Array.isArray(raw?.components) ? raw.components : [] }; merged.components = merged.components.map(hydrateComponent); if ( !merged.selectedComponentId || !merged.components.some( (c) => c.id === merged.selectedComponentId ) ) { merged.selectedComponentId = merged.components[0]?.id || null; } return merged; } function hydrateComponent(c) { if (c?.type === 'post') { return { ...newPost(), ...c }; } if (c?.type === 'gate') { return { ...newGate(), ...c }; } if (c?.type === 'fixedPanel') { const d = newFixedPanel(); return { ...d, ...c, leftPost: { ...d.leftPost, ...(c.leftPost || {}) }, rightPost: { ...d.rightPost, ...(c.rightPost || {}) } }; } return c; } function loadActiveJob() { try { const raw = localStorage.getItem( CFG.storage.activeJobKey ); if (!raw) { return createNewJob(); } return hydrateJob( JSON.parse(raw) ); } catch { return createNewJob(); } } let job = loadActiveJob(); let calculation = null; let undoStack = []; let toastTimer = null; let dialogAction = null; function newPost() { return { id: uid('post'), type: 'post', postType: CFG.defaults.postType, fixing: 'fixed_brick', heightMode: 'auto', manualFinishedHeightMm: CFG.defaults.finishedHeightMm, holePositionsMm: [] }; } function newGate() { return { id: uid('gate'), type: 'gate', frameType: CFG.defaults.frameType, hingeSide: CFG.defaults.hingeSide, openDirection: CFG.defaults.openDirection, widthMode: 'auto', manualWidthMm: 1000, relationship: 'single', doublePairId: '', internalRailCount: CFG.defaults.gateInternalRailCount, latchType: 'ddDualKey' }; } function newPanelPost(side) { return { id: uid(`fp_${side}`), postType: CFG.defaults.postType, fixing: side === 'left' ? CFG.defaults.fixedPanelLeftPostFixing : CFG.defaults.fixedPanelRightPostFixing, heightMode: 'auto', manualFinishedHeightMm: CFG.defaults.finishedHeightMm, holePositionsMm: [] }; } function newFixedPanel() { return { id: uid('panel'), type: 'fixedPanel', widthMm: 700, leftPost: newPanelPost('left'), rightPost: newPanelPost('right'), verticalRailCount: CFG.defaults.fixedPanelVerticalRailCount }; } function pushUndo() { undoStack.push( deepClone(job) ); if ( undoStack.length > CFG.storage.undoHistoryLimit ) { undoStack.shift(); } updateUndoButton(); } function undo() { if (!undoStack.length) { return; } job = undoStack.pop(); autosave(); renderAll(); toast('Undone'); } function markPricingChanged() { if ( job.quote.mode === 'manual' ) { job.quote.mode = 'auto'; job.quote.manualIncGST = null; toast( 'Pricing changed. Quote returned to Auto.' ); } } function mutate( fn, { pricing = false, undoable = false } = {} ) { if (undoable) { pushUndo(); } fn(); if (pricing) { markPricingChanged(); } job.updatedAt = new Date().toISOString(); autosave(); renderAll(); } function autosave() { if ( !CFG.storage .autosaveActiveJob ) { return; } try { localStorage.setItem( CFG.storage.activeJobKey, JSON.stringify(job) ); const status = $('#autosave-status'); if (status) { status.textContent = 'Autosaved'; } } catch (err) { console.error(err); const status = $('#autosave-status'); if (status) { status.textContent = 'Save error'; } } } function componentDisplayLabels() { const counts = { post: job.components.filter( (c) => c.type === 'post' ).length, gate: job.components.filter( (c) => c.type === 'gate' ).length, fixedPanel: job.components.filter( (c) => c.type === 'fixedPanel' ).length }; const seen = { post: 0, gate: 0, fixedPanel: 0 }; const labels = {}; job.components.forEach( (c) => { seen[c.type] += 1; if ( c.type === 'post' ) { labels[c.id] = `Post ${seen.post}`; } if ( c.type === 'gate' ) { labels[c.id] = counts.gate === 1 ? 'Gate' : `Gate ${seen.gate}`; } if ( c.type === 'fixedPanel' ) { labels[c.id] = counts.fixedPanel === 1 ? 'Fixed Panel' : `Fixed Panel ${seen.fixedPanel}`; } } ); return labels; } function selectedComponent() { return ( job.components.find( (c) => c.id === job.selectedComponentId ) || null ); } function postConfig(postType) { return ( CFG.steel.posts[ postType ] || CFG.steel.posts[ CFG.defaults.postType ] ); } function frameConfig(frameType) { return ( CFG.steel.frame[ frameType ] || CFG.steel.frame[ CFG.defaults.frameType ] ); } function postFinishedHeight(post) { if ( post.heightMode === 'manual' ) { return Math.max( 0, num( post.manualFinishedHeightMm ) ); } return Math.max( 0, num( job.site.finishedHeightMm ) ); } function postCutLengthMm(post) { const finished = postFinishedHeight(post); if ( post.fixing === 'existing_structure' ) { return 0; } if ( post.fixing === 'baseplate' ) { return Math.max( 0, finished - CFG.fabrication .baseplateHeightAllowanceMm ); } if ( post.fixing === 'concrete_house' || post.fixing === 'concrete_floating' ) { return ( finished + CFG.fabrication .concreteEmbedmentMm ); } return finished; } function gateFrameHeightMm() { return Math.max( 0, num( job.site.finishedHeightMm ) - CFG.fabrication .gateGroundGapMm ); } function panelWidthMm(panel) { return Math.max( 0, num(panel.widthMm) ); } function componentOccupiedWidthMm( component ) { if ( component.type === 'post' ) { if ( component.fixing === 'existing_structure' ) { return 0; } return postConfig( component.postType ).widthMm; } if ( component.type === 'fixedPanel' ) { return panelWidthMm( component ); } return 0; } function pairMap() { const gates = job.components.filter( (c) => c.type === 'gate' ); const pairs = new Map(); gates.forEach( (g) => { if ( g.relationship !== 'double' || !g.doublePairId ) { return; } if ( !pairs.has( g.doublePairId ) ) { pairs.set( g.doublePairId, [] ); } pairs .get(g.doublePairId) .push(g); } ); return pairs; } function gateGapTotalMm() { let total = 0; const comps = job.components; for ( let i = 0; i < comps.length - 1; i += 1 ) { const a = comps[i]; const b = comps[i + 1]; if ( a.type === 'gate' && b.type === 'gate' && a.relationship === 'double' && b.relationship === 'double' && a.doublePairId && a.doublePairId === b.doublePairId ) { total += CFG.fabrication .doubleGateCentreGapMm; } else if ( a.type === 'gate' || b.type === 'gate' ) { total += CFG.fabrication .gateSideGapMm; } } return total; } function calculateGateWidths() { const result = {}; const gates = job.components.filter( (c) => c.type === 'gate' ); if (!gates.length) { return result; } const cavity = Math.max( 0, num( job.site .cavityWidthMm ) ); const nonGateWidth = job.components .filter( (c) => c.type !== 'gate' ) .reduce( (sum, c) => sum + componentOccupiedWidthMm( c ), 0 ); const gapTotal = gateGapTotalMm(); const manualGates = gates.filter( (g) => g.widthMode === 'manual' ); const autoGates = gates.filter( (g) => g.widthMode !== 'manual' ); const manualTotal = manualGates.reduce( (sum, g) => sum + Math.max( 0, num( g.manualWidthMm ) ), 0 ); manualGates.forEach( (g) => { result[g.id] = Math.max( 0, num( g.manualWidthMm ) ); } ); let available = cavity - nonGateWidth - gapTotal - manualTotal; available = Math.max( 0, available ); if ( autoGates.length === 1 ) { result[ autoGates[0].id ] = available; return result; } if ( autoGates.length > 1 ) { const doubleGroups = new Map(); const unpaired = []; autoGates.forEach( (g) => { if ( g.relationship === 'double' && g.doublePairId ) { if ( !doubleGroups.has( g.doublePairId ) ) { doubleGroups.set( g.doublePairId, [] ); } doubleGroups .get(g.doublePairId) .push(g); } else { unpaired.push(g); } } ); const completeDoubleGroups = [ ...doubleGroups.values() ].filter( (group) => group.length === 2 ); const invalidDoubleGates = [ ...doubleGroups.values() ] .filter( (group) => group.length !== 2 ) .flat(); unpaired.push( ...invalidDoubleGates ); if ( completeDoubleGroups.length === 1 && unpaired.length === 0 && autoGates.length === 2 ) { const each = available / 2; completeDoubleGroups[0] .forEach( (g) => { result[g.id] = each; } ); } else { const each = autoGates.length ? available / autoGates.length : 0; autoGates.forEach( (g) => { result[g.id] = each; } ); } } return result; } function railCutLengthForGate( gate, gateWidth, gateHeight ) { const frame = frameConfig( gate.frameType ); if ( job.cladding.direction === 'horizontal' ) { return Math.max( 0, gateHeight - frame.widthMm * 2 ); } return Math.max( 0, gateWidth - frame.widthMm * 2 ); } function stockLengthCost( totalLengthM, stockLengthM, stockPrice, includesGST ) { const qty = totalLengthM > 0 ? Math.ceil( totalLengthM / stockLengthM ) : 0; return { qty, costExGST: qty * gstExclusive( stockPrice, includesGST ) }; } function latchCostExGST( latchType ) { const item = CFG.hardware.latches[ latchType ] || CFG.hardware.latches .ddDualKey; if ( 'priceExGST' in item ) { return num( item.priceExGST ); } return gstExclusive( item.price, item.priceIncludesGST ); } function cladSurfaces( gateWidths ) { const surfaces = []; const gateHeight = gateFrameHeightMm(); job.components.forEach( (c) => { if ( c.type === 'gate' ) { const steelWidth = Math.max( 0, num( gateWidths[ c.id ] ) ); const cladWidth = steelWidth + CFG.fabrication .gateCladdingOverhangMm * 2; surfaces.push({ componentId: c.id, type: 'gate', widthMm: cladWidth, heightMm: gateHeight, steelWidthMm: steelWidth, steelHeightMm: gateHeight }); } if ( c.type === 'fixedPanel' ) { surfaces.push({ componentId: c.id, type: 'fixedPanel', widthMm: panelWidthMm(c), heightMm: Math.max( 0, num( job.site .finishedHeightMm ) ), steelWidthMm: panelWidthMm(c), steelHeightMm: Math.max( 0, num( job.site .finishedHeightMm ) ) }); } } ); return surfaces; } function claddingAreaM2( surfaces ) { return surfaces.reduce( (sum, s) => sum + ( s.widthMm / 1000 ) * ( s.heightMm / 1000 ), 0 ); } function calculateBoardCladding( cfg, surfaces ) { const direction = job.cladding.direction; const gap = Math.max( 0, num( job.cladding.gapMm, CFG.fabrication .claddingGapMm ) ); let pieces = 0; let cutLengthTotalM = 0; let rawLinealM = 0; surfaces.forEach( (s) => { const acrossMm = direction === 'vertical' ? s.widthMm : s.heightMm; const cutBaseMm = direction === 'vertical' ? s.heightMm : s.widthMm; const boardWidth = num( cfg.boardWidthMm ); const pitch = Math.max( 1, boardWidth + gap ); const qty = Math.max( 1, Math.ceil( ( acrossMm + gap ) / pitch ) ); const processing = cfg.processingAllowanceMode === 'add_standard' ? CFG.fabrication .claddingProcessingAllowanceMm : 0; const cutMm = cutBaseMm + processing; pieces += qty; cutLengthTotalM += ( qty * cutMm ) / 1000; rawLinealM += ( qty * cutBaseMm ) / 1000; } ); let materialCostExGST = 0; let orderText = ''; if ( cfg.stockLengthM && cfg.pricePerStockLength != null ) { const order = stockLengthCost( cutLengthTotalM, cfg.stockLengthM, cfg.pricePerStockLength, cfg.priceIncludesGST ); materialCostExGST = order.costExGST; orderText = `${order.qty} × ${cfg.stockLengthM}m lengths`; } else if ( cfg.pricePerLinealM != null ) { materialCostExGST = cutLengthTotalM * gstExclusive( cfg.pricePerLinealM, cfg.priceIncludesGST ); orderText = `${round(cutLengthTotalM, 2)} lm`; } return { pieces, cutLengthTotalM, rawLinealM, materialCostExGST, orderText }; } function calculatePine( surfaces ) { const cfg = CFG.cladding .treatedPinePalings; const width = num( job.cladding .palingWidthMm ); const length = num( job.cladding .palingLengthMm ); let qty = 0; if ( width && length ) { surfaces.forEach( (s) => { const metresWide = s.widthMm / 1000; if ( width === 150 ) { qty += Math.ceil( s.widthMm / 100 ); } else { const base = Math.ceil( s.widthMm / width ); const extra = Math.ceil( metresWide * 3 ); qty += base + extra; } } ); } const materialCostExGST = qty * gstExclusive( cfg.priceEach, cfg.priceIncludesGST ); const autoAccessoryLengthM = surfaces.reduce( (sum, s) => sum + s.widthMm / 1000, 0 ); const accessoryLengthM = job.cladding .accessoryLengthMode === 'manual' ? Math.max( 0, num( job.cladding .accessoryLengthM ) ) : autoAccessoryLengthM; const cappingCost = job.cladding.capping ? accessoryLengthM * gstExclusive( cfg.capping .pricePerM, cfg.capping .priceIncludesGST ) : 0; const plinthCost = job.cladding.plinth ? accessoryLengthM * gstExclusive( cfg.plinth .pricePerM, cfg.plinth .priceIncludesGST ) : 0; return { qty, palingWidthMm: width, palingLengthMm: length, materialCostExGST: materialCostExGST + cappingCost + plinthCost, palingCostExGST: materialCostExGST, cappingCostExGST: cappingCost, plinthCostExGST: plinthCost, accessoryLengthM, autoAccessoryLengthM, orderText: width && length ? `${qty} × ${width}×${length}mm palings` : 'Select paling width and length' }; } function meshPieces( surfaces ) { const pieces = []; surfaces.forEach( (s) => { const comp = job.components.find( (c) => c.id === s.componentId ); if (!comp) { return; } if ( comp.type === 'gate' ) { const frame = frameConfig( comp.frameType ); pieces.push({ widthMm: Math.max( 0, s.steelWidthMm - frame.widthMm * 2 ), heightMm: Math.max( 0, s.steelHeightMm - frame.widthMm * 2 ), componentId: comp.id }); } else if ( comp.type === 'fixedPanel' ) { const leftW = comp.leftPost .fixing === 'existing_structure' ? 0 : postConfig( comp.leftPost .postType ).widthMm; const rightW = comp.rightPost .fixing === 'existing_structure' ? 0 : postConfig( comp.rightPost .postType ).widthMm; pieces.push({ widthMm: Math.max( 0, panelWidthMm( comp ) - leftW - rightW ), heightMm: Math.max( 0, num( job.site .finishedHeightMm ) ), componentId: comp.id }); } } ); return pieces; } function fitCountInSheet( sheet, piece ) { const a = Math.floor( sheet.lengthMm / piece.widthMm ) * Math.floor( sheet.widthMm / piece.heightMm ); const b = Math.floor( sheet.lengthMm / piece.heightMm ) * Math.floor( sheet.widthMm / piece.widthMm ); return Math.max( a, b, 0 ); } function calculateMesh( surfaces ) { const cfg = CFG.cladding.galvMesh50; const pieces = meshPieces(surfaces) .filter( (p) => p.widthMm > 0 && p.heightMm > 0 ); const areaM2 = pieces.reduce( (sum, p) => sum + ( p.widthMm / 1000 ) * ( p.heightMm / 1000 ), 0 ); const materialCostExGST = areaM2 * cfg.pricePerM2; const order = []; pieces.forEach( (piece) => { let best = null; cfg.sheets.forEach( (sheet) => { const capacity = fitCountInSheet( sheet, piece ); if ( capacity < 1 ) { return; } const sheetArea = sheet.lengthMm * sheet.widthMm; const effectiveArea = sheetArea / capacity; if ( !best || effectiveArea < best.effectiveArea ) { best = { sheet, capacity, effectiveArea }; } } ); if (best) { const existing = order.find( (o) => o.key === best.sheet.key ); if (existing) { existing.pieces += 1; } else { order.push({ key: best.sheet.key, label: best.sheet.label, pieces: 1, capacity: best.capacity }); } } } ); const orderText = order.length ? order .map( (o) => `${Math.ceil(
                  o.pieces /
                  o.capacity
                )} × ${o.label}` ) .join(', ') : 'Check sheet size manually'; return { pieces, areaM2, materialCostExGST, orderText }; } function calculateCustomCladding( areaM2 ) { const c = job.cladding.custom; let materialCost = 0; if ( c.costingMode === 'quantity_unit' ) { materialCost = Math.max( 0, num(c.quantity) ) * Math.max( 0, num(c.unitCost) ); } else { materialCost = Math.max( 0, num(c.totalCost) ); } return { materialCostExGST: gstExclusive( materialCost, c.priceIncludesGST ), labourRatePerM2: Math.max( 0, num( c.labourRatePerM2 ) ), orderText: c.name || 'Custom material' }; } function calculateCladding( surfaces ) { const type = job.cladding.type; const cfg = CFG.cladding[type]; const areaM2 = claddingAreaM2( surfaces ); let detail = {}; let materialCostExGST = 0; let labourRatePerM2 = num( cfg?.labourRatePerM2 ); if ( [ 'ekodeck', 'cypressPickets', 'losp90', 'losp140', 'merbau90', 'merbau140' ].includes(type) ) { detail = calculateBoardCladding( cfg, surfaces ); materialCostExGST = detail.materialCostExGST; } else if ( type === 'treatedPinePalings' ) { detail = calculatePine( surfaces ); materialCostExGST = detail.materialCostExGST; } else if ( type === 'galvMesh50' ) { detail = calculateMesh( surfaces ); materialCostExGST = detail.materialCostExGST; } else if ( type === 'colorbond' ) { materialCostExGST = areaM2 * gstExclusive( cfg.pricePerM2, cfg.priceIncludesGST ); labourRatePerM2 = Math.max( 0, num( job.cladding .colorbond .labourRatePerM2 ) ); detail = { orderText: `${round(
            areaM2,
            2
          )} m² ${job.cladding.profile || 'Colorbond'}` }; } else if ( type === 'custom' ) { detail = calculateCustomCladding( areaM2 ); materialCostExGST = detail.materialCostExGST; labourRatePerM2 = detail.labourRatePerM2; } return { type, config: cfg, areaM2, materialCostExGST, labourRatePerM2, labourCostExGST: areaM2 * labourRatePerM2, detail }; } function collectPhysicalPosts() { const posts = []; const labels = componentDisplayLabels(); job.components.forEach( (c) => { if ( c.type === 'post' ) { posts.push({ ownerId: c.id, ownerLabel: labels[c.id], side: '', post: c }); } if ( c.type === 'fixedPanel' ) { posts.push({ ownerId: c.id, ownerLabel: labels[c.id], side: 'Left', post: c.leftPost }); posts.push({ ownerId: c.id, ownerLabel: labels[c.id], side: 'Right', post: c.rightPost }); } } ); return posts; } function postLabour(post) { if ( post.fixing === 'existing_structure' ) { return { fabrication: 0, installation: 0, drilling: 0 }; } const holes = Array.isArray( post.holePositionsMm ) ? post.holePositionsMm.length : 0; if ( post.fixing === 'baseplate' ) { return { fabrication: 0, drilling: holes * CFG.labour .baseplateHoleHoursEach, installation: CFG.labour .baseplatePostInstallHoursEach }; } let fabrication = CFG.labour .postFabricationHoursEach; let drilling = 0; if ( post.fixing === 'fixed_brick' ) { const combined = Math.max( CFG.labour .brickFixedMinimumHours, holes * CFG.labour .drilledHoleHoursEach ); fabrication = combined; } let installation = 0; if ( post.fixing === 'concrete_house' || post.fixing === 'concrete_floating' ) { installation = CFG.labour .concretePostInstallHoursEach; } return { fabrication, installation, drilling }; } function calculatePosts() { const physicalPosts = collectPhysicalPosts(); const byTypeLengths = {}; let fabricationHours = 0; let installationHours = 0; let dynabolts = 0; let concretePosts = 0; let baseplates = 0; let baseplateAllowanceExGST = 0; const cutList = []; physicalPosts.forEach( (item) => { const p = item.post; const cutMm = postCutLengthMm(p); const holes = Array.isArray( p.holePositionsMm ) ? p.holePositionsMm.length : 0; const labour = postLabour(p); fabricationHours += labour.fabrication + labour.drilling; installationHours += labour.installation; dynabolts += holes; if ( p.fixing === 'concrete_house' || p.fixing === 'concrete_floating' ) { concretePosts += 1; } if ( p.fixing === 'baseplate' ) { baseplates += 1; baseplateAllowanceExGST += CFG.fixings .baseplate .fabricationAllowanceExGST; } if ( p.fixing !== 'existing_structure' && cutMm > 0 ) { byTypeLengths[ p.postType ] = ( byTypeLengths[ p.postType ] || 0 ) + cutMm / 1000; } cutList.push({ label: `${item.ownerLabel}${item.side ? ` ${item.side} Post` : ''}`, postType: p.postType, cutLengthMm: cutMm, fixing: p.fixing, holes: [ ...(p.holePositionsMm || []) ].sort( (a, b) => a - b ) }); } ); let steelCostExGST = 0; const steelOrders = []; Object.entries( byTypeLengths ).forEach( ([type, lengthM]) => { const cfg = postConfig(type); const order = stockLengthCost( lengthM, cfg.stockLengthM, cfg.pricePerStockLength, cfg.priceIncludesGST ); steelCostExGST += order.costExGST; steelOrders.push({ type, label: cfg.label, lengthM, stockQty: order.qty, stockLengthM: cfg.stockLengthM, costExGST: order.costExGST }); } ); const dynaboltCostExGST = dynabolts * gstExclusive( CFG.fixings .dynabolt .priceEach, CFG.fixings .dynabolt .priceIncludesGST ); const concreteBags = concretePosts * CFG.concrete .defaultBagsPerPost; const concreteCostExGST = concreteBags * gstExclusive( CFG.concrete .pricePerBag, CFG.concrete .priceIncludesGST ); return { physicalPosts, fabricationHours, installationHours, dynabolts, dynaboltCostExGST, concretePosts, concreteBags, concreteCostExGST, baseplates, baseplateAllowanceExGST, steelCostExGST, steelOrders, cutList }; } function calculateFrames( gateWidths ) { const lengthsByType = {}; const cutList = []; let gateFabricationHours = 0; let gateInstallHours = 0; let panelFabricationHours = 0; let panelInstallHours = 0; let hingeSets = 0; let latchCostExGSTTotal = 0; let screwItems = 0; const labels = componentDisplayLabels(); const gateHeight = gateFrameHeightMm(); job.components.forEach( (c) => { if ( c.type === 'gate' ) { const width = Math.max( 0, num( gateWidths[ c.id ] ) ); const frame = frameConfig( c.frameType ); const railCount = clamp( parseInt( c.internalRailCount, 10 ) || 0, 0, CFG.rails.gate .maximumInternalRailCount ); const railLength = railCutLengthForGate( c, width, gateHeight ); const perimeterM = ( width * 2 + gateHeight * 2 ) / 1000; const railM = ( railCount * railLength ) / 1000; lengthsByType[ c.frameType ] = ( lengthsByType[ c.frameType ] || 0 ) + perimeterM + railM; gateFabricationHours += CFG.labour .gateFabricationHoursEach; gateInstallHours += CFG.labour .hangGateHoursEach; hingeSets += 1; latchCostExGSTTotal += latchCostExGST( c.latchType ); screwItems += 1; cutList.push({ label: labels[c.id], type: 'gate', frameType: c.frameType, widthMm: width, heightMm: gateHeight, railCount, railLengthMm: railLength, railOrientation: job.cladding .direction === 'horizontal' ? 'vertical' : 'horizontal', hingeSide: c.hingeSide }); } if ( c.type === 'fixedPanel' ) { const width = panelWidthMm(c); const height = Math.max( 0, num( job.site .finishedHeightMm ) ); const frameType = CFG.defaults .frameType; let railCount = 0; let railLength = 0; if ( job.cladding .direction === 'vertical' ) { railCount = clamp( parseInt( c.verticalRailCount, 10 ) || CFG.rails .fixedPanel .verticalDefaultRailCount, CFG.rails .fixedPanel .verticalMinimumRailCount, CFG.rails .fixedPanel .verticalMaximumRailCount ); const leftW = c.leftPost .fixing === 'existing_structure' ? 0 : postConfig( c.leftPost .postType ).widthMm; const rightW = c.rightPost .fixing === 'existing_structure' ? 0 : postConfig( c.rightPost .postType ).widthMm; railLength = Math.max( 0, width - leftW - rightW ); const totalM = ( railCount * railLength ) / 1000; lengthsByType[ frameType ] = ( lengthsByType[ frameType ] || 0 ) + totalM; } panelFabricationHours += CFG.labour .fixedPanelFabricationHoursEach; panelInstallHours += CFG.labour .fixedPanelInstallHoursEach; screwItems += 1; cutList.push({ label: labels[c.id], type: 'fixedPanel', frameType, widthMm: width, heightMm: height, railCount, railLengthMm: railLength, railOrientation: 'horizontal' }); } } ); let steelCostExGST = 0; const steelOrders = []; Object.entries( lengthsByType ).forEach( ([type, lengthM]) => { const cfg = frameConfig(type); const order = stockLengthCost( lengthM, cfg.stockLengthM, cfg.pricePerStockLength, cfg.priceIncludesGST ); steelCostExGST += order.costExGST; steelOrders.push({ type, label: cfg.label, lengthM, stockQty: order.qty, stockLengthM: cfg.stockLengthM, costExGST: order.costExGST }); } ); const hingeCostExGST = hingeSets * gstExclusive( CFG.hardware .hinges .lockout .pricePerSet, CFG.hardware .hinges .lockout .priceIncludesGST ); const screwCostExGST = screwItems * gstExclusive( CFG.fixings .screws .defaultPerItem, CFG.fixings .screws .priceIncludesGST ); return { lengthsByType, steelCostExGST, steelOrders, gateFabricationHours, gateInstallHours, panelFabricationHours, panelInstallHours, hingeSets, hingeCostExGST, latchCostExGST: latchCostExGSTTotal, screwItems, screwCostExGST, cutList }; } function calculatePowder( posts, frames ) { if ( !job.powder.enabled ) { let areaM2 = 0; posts.physicalPosts .forEach( ({ post }) => { if ( post.fixing === 'existing_structure' ) { return; } const cfg = postConfig( post.postType ); const l = postCutLengthMm( post ) / 1000; areaM2 += l * ( ( cfg.widthMm + cfg.depthMm ) * 2 / 1000 ); } ); frames.cutList .forEach( (item) => { if ( item.type === 'gate' ) { const cfg = frameConfig( item.frameType ); const perimeterM = ( item.widthMm * 2 + item.heightMm * 2 + item.railCount * item.railLengthMm ) / 1000; areaM2 += perimeterM * ( ( cfg.widthMm + cfg.depthMm ) * 2 / 1000 ); } if ( item.type === 'fixedPanel' && item.railCount > 0 ) { const cfg = frameConfig( item.frameType ); const lengthM = ( item.railCount * item.railLengthMm ) / 1000; areaM2 += lengthM * ( ( cfg.widthMm + cfg.depthMm ) * 2 / 1000 ); } } ); const costExGST = areaM2 * gstExclusive( CFG.finishing .duragalvTouchUp .ratePerM2, CFG.finishing .duragalvTouchUp .priceIncludesGST ); return { enabled: false, postsExGST: 0, framesExGST: 0, travelExGST: 0, touchUpExGST: costExGST, totalExGST: costExGST, areaM2 }; } let postCost = 0; posts.physicalPosts .forEach( ({ post }) => { if ( post.fixing === 'existing_structure' ) { return; } const rate = num( CFG.powderCoating .postRatePerLm[ post.postType ] ); postCost += ( postCutLengthMm( post ) / 1000 ) * rate; } ); let frameArea = 0; frames.cutList.forEach( (item) => { if ( item.type === 'gate' ) { frameArea += ( item.widthMm / 1000 ) * ( item.heightMm / 1000 ); } if ( item.type === 'fixedPanel' && item.railCount > 0 ) { frameArea += ( item.widthMm / 1000 ) * ( item.heightMm / 1000 ); } } ); const framesExGST = frameArea * CFG.powderCoating .openFrameRatePerM2; const travelExGST = CFG.powderCoating .jobTravelAllowanceExGST; return { enabled: true, postsExGST: postCost, framesExGST, travelExGST, touchUpExGST: 0, totalExGST: postCost + framesExGST + travelExGST, frameAreaM2: frameArea }; } function calculateTravel() { const oneWay = Math.max( 0, num( job.site .oneWayTravelKm ) ); const roundTrip = oneWay * 2; const chargeableKm = Math.max( 0, roundTrip - CFG.business .includedTravelKm ); return { oneWayKm: oneWay, roundTripKm: roundTrip, chargeableKm, costExGST: chargeableKm * CFG.business .travelRatePerKm }; } function calculateJob() { const gateWidths = calculateGateWidths(); const surfaces = cladSurfaces( gateWidths ); const posts = calculatePosts(); const frames = calculateFrames( gateWidths ); const cladding = calculateCladding( surfaces ); const powder = calculatePowder( posts, frames ); const travel = calculateTravel(); const fabricationAutoHours = frames.gateFabricationHours + frames.panelFabricationHours + posts.fabricationHours; const installationAutoHours = frames.gateInstallHours + frames.panelInstallHours + posts.installationHours; const fabricationTotalHours = fabricationAutoHours + Math.max( 0, num( job.labour .additionalFabricationHours ) ); const installationTotalHours = installationAutoHours + Math.max( 0, num( job.labour .additionalInstallHours ) ); const coreLabourHours = fabricationTotalHours + installationTotalHours; const coreLabourCostExGST = coreLabourHours * CFG.business .labourRate; const claddingLabourCostExGST = cladding .labourCostExGST; const labourCostExGST = coreLabourCostExGST + claddingLabourCostExGST; const materialsBeforeMarkupExGST = posts.steelCostExGST + frames.steelCostExGST + posts.dynaboltCostExGST + posts.concreteCostExGST + posts.baseplateAllowanceExGST + frames.hingeCostExGST + frames.latchCostExGST + frames.screwCostExGST + cladding.materialCostExGST; const materialMarkupExGST = materialsBeforeMarkupExGST * CFG.business.materialMarkup; const sellExGST = materialsBeforeMarkupExGST + materialMarkupExGST + labourCostExGST + travel.costExGST + powder.totalExGST; const autoIncGSTUnrounded = sellExGST * ( 1 + CFG.business.gst ); const autoIncGST = ceilTo( autoIncGSTUnrounded, CFG.business.roundTo ); const finalIncGST = job.quote.mode === 'manual' && Number.isFinite( Number( job.quote .manualIncGST ) ) ? Math.max( 0, num( job.quote .manualIncGST ) ) : autoIncGST; const finalExGST = finalIncGST / ( 1 + CFG.business.gst ); const finalGST = finalIncGST - finalExGST; const actualCostExGST = materialsBeforeMarkupExGST + labourCostExGST + travel.costExGST + powder.totalExGST; const profitExGST = finalExGST - actualCostExGST; const cavityAreaM2 = ( Math.max( 0, num( job.site .cavityWidthMm ) ) / 1000 ) * ( Math.max( 0, num( job.site .finishedHeightMm ) ) / 1000 ); const effectiveRate = cavityAreaM2 > 0 ? finalIncGST / cavityAreaM2 : 0; const layout = calculateLayoutStatus( gateWidths ); return { gateWidths, surfaces, posts, frames, cladding, powder, travel, labour: { fabricationAutoHours, installationAutoHours, fabricationTotalHours, installationTotalHours, coreLabourHours, coreLabourCostExGST, claddingLabourCostExGST, totalCostExGST: labourCostExGST }, costing: { materialsBeforeMarkupExGST, materialMarkupExGST, labourCostExGST, travelExGST: travel.costExGST, finishExGST: powder.totalExGST, sellExGST, autoIncGST, autoIncGSTUnrounded, finalIncGST, finalExGST, finalGST, actualCostExGST, profitExGST, cavityAreaM2, effectiveRate }, layout }; } function calculateLayoutStatus( gateWidths ) { const cavity = Math.max( 0, num( job.site .cavityWidthMm ) ); const nonGateWidth = job.components .filter( (c) => c.type !== 'gate' ) .reduce( (sum, c) => sum + componentOccupiedWidthMm( c ), 0 ); const gateWidth = job.components .filter( (c) => c.type === 'gate' ) .reduce( (sum, c) => sum + Math.max( 0, num( gateWidths[ c.id ] ) ), 0 ); const gaps = gateGapTotalMm(); const total = nonGateWidth + gateWidth + gaps; const difference = cavity - total; const autoGates = job.components.filter( (c) => c.type === 'gate' && c.widthMode !== 'manual' ); const unrelatedAutoAmbiguous = autoGates.length > 1 && !( autoGates.length === 2 && autoGates[0] .relationship === 'double' && autoGates[1] .relationship === 'double' && autoGates[0] .doublePairId && autoGates[0] .doublePairId === autoGates[1] .doublePairId ); return { cavity, nonGateWidth, gateWidth, gaps, total, difference, unrelatedAutoAmbiguous, valid: cavity > 0 && Math.abs( difference ) < 1 && !unrelatedAutoAmbiguous }; } function componentComplete(c) { if ( c.type === 'post' ) { if ( !c.postType || !c.fixing ) { return false; } if ( c.heightMode === 'manual' && num( c.manualFinishedHeightMm ) <= 0 ) { return false; } return true; } if ( c.type === 'gate' ) { if ( !c.frameType || !c.hingeSide || !c.openDirection ) { return false; } if ( c.widthMode === 'manual' && num( c.manualWidthMm ) <= 0 ) { return false; } if ( c.relationship === 'double' && !c.doublePairId ) { return false; } return true; } if ( c.type === 'fixedPanel' ) { if ( num(c.widthMm) <= 0 ) { return false; } if ( !c.leftPost ?.postType || !c.leftPost ?.fixing || !c.rightPost ?.postType || !c.rightPost ?.fixing ) { return false; } return true; } return false; } function renderAll() { calculation = calculateJob(); renderHeader(); renderNavigation(); renderSite(); renderMudMap(); renderComponentEditor(); renderLayoutSummary(); renderCladding(); renderPowder(); renderMaterials(); renderLabour(); renderCosting(); renderClient(); renderQuote(); renderSavedJobs(); updateUndoButton(); } function renderHeader() { $('#header-client-name') .textContent = job.client.name || 'New Job'; $('#header-client-mobile') .textContent = job.client.mobile || '04'; $('#project-number-display') .textContent = job.client .projectNumber; $('#quote-mode-header') .textContent = job.quote.mode === 'manual' ? 'Manual' : 'Auto'; } function renderNavigation() { const active = job.ui.activeSection || 'site'; $$('.nav-tab') .forEach( (btn) => btn.classList.toggle( 'active', btn.dataset .sectionTarget === active ) ); $$('.app-section') .forEach( (section) => section.classList.toggle( 'active', section.dataset .section === active ) ); } function navigate(section) { job.ui.activeSection = section; autosave(); renderNavigation(); window.scrollTo({ top: 0, behavior: 'instant' }); } function setInputValue( selector, value ) { const el = $(selector); if ( el && document.activeElement !== el ) { el.value = value ?? ''; } } function renderSite() { setInputValue( '#site-cavity-width', job.site .cavityWidthMm || '' ); setInputValue( '#site-finished-height', job.site .finishedHeightMm || '' ); setInputValue( '#site-travel-km', job.site .oneWayTravelKm || '' ); setInputValue( '#site-reference-direction', job.site .referenceDirection ); setInputValue( '#site-reference-custom', job.site .referenceCustom ); $('#site-ground-gap-display') .textContent = mm( CFG.fabrication .gateGroundGapMm ); $('#site-gate-gap-display') .textContent = mm( CFG.fabrication .gateSideGapMm * 2 ); $('#custom-reference-wrap') .classList.toggle( 'hidden', job.site .referenceDirection !== 'other' ); const cavityGroup = $('#site-cavity-width') ?.closest( '.required-field' ); if (cavityGroup) { cavityGroup .classList.toggle( 'complete', num( job.site .cavityWidthMm ) > 0 ); } const heightGroup = $('#site-finished-height') ?.closest( '.required-field' ); if (heightGroup) { heightGroup .classList.toggle( 'complete', num( job.site .finishedHeightMm ) > 0 ); } } function renderMudMap() { const root = $('#mud-map'); const labels = componentDisplayLabels(); if ( !job.components.length ) { root.innerHTML = '<div class="empty-state">Add a Post, Gate or Fixed Panel below.</div>'; return; } root.innerHTML = job.components .map((c) => { const selected = c.id === job.selectedComponentId ? ' selected' : ''; const complete = componentComplete(c); const cls = c.type === 'fixedPanel' ? 'fixed-panel' : c.type; let dims = ''; let hinge = ''; let extraClass = ''; let relationship = ''; if ( c.type === 'post' ) { dims = c.fixing === 'existing_structure' ? 'Existing' : `${Math.round(
                    postCutLengthMm(c)
                  )}mm cut`; } if ( c.type === 'gate' ) { const w = calculation .gateWidths[c.id] || 0; const h = gateFrameHeightMm(); dims = `${Math.round(w)} × ${Math.round(h)}mm`; hinge = `<span class="mud-map-hinge ${c.hingeSide}">H</span>`; extraClass = c.hingeSide === 'right' ? ' hinge-right' : ''; if ( c.relationship === 'double' && c.doublePairId ) { relationship = '<span class="mud-map-double">DOUBLE</span>'; } } if ( c.type === 'fixedPanel' ) { dims = `${Math.round(panelWidthMm(c))} × ${Math.round(num(job.site.finishedHeightMm))}mm`; } return `
            <div
              class="mud-map-item ${cls}${selected}${extraClass}"
              data-action="select-component"
              data-component-id="${safe(c.id)}"
              role="button"
              tabindex="0"
            >
              ${hinge}
              <button
                type="button"
                class="mud-map-delete"
                data-action="delete-component"
                data-component-id="${safe(c.id)}"
                aria-label="Delete ${safe(labels[c.id])}"
                title="Delete ${safe(labels[c.id])}"
              >
                ×
              </button>
              <span
                class="mud-map-status${complete ? ' complete' : ''}"
              ></span>
              <span class="mud-map-name">
                ${safe(labels[c.id])}
              </span>
              ${relationship}
              <span class="mud-map-dimensions">
                ${safe(dims)}
              </span>
            </div>
          `; }) .join(''); } function optionsFromObject( obj, selected ) { return Object.entries(obj) .map( ([key, cfg]) => `<option value="${safe(key)}" ${key === selected ? 'selected' : ''}>${safe(cfg.label)}</option>` ) .join(''); } function fixingOptions( selected ) { return Object.entries( CFG.postFixings ) .map( ([key, cfg]) => `<option value="${safe(key)}" ${key === selected ? 'selected' : ''}>${safe(cfg.label)}</option>` ) .join(''); } function renderHoleEditor( ownerId, side, post ) { const positions = [ ...(post.holePositionsMm || []) ].sort( (a, b) => a - b ); const sideAttr = side ? ` data-panel-side="${side}"` : ''; return `
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
                    (p) => ` <div class="required-material-row"> <span> ${Math.round(p)} mm from top </span> <button type="button" class="secondary-btn" data-action="delete-hole" data-component-id="${safe(ownerId)}" data-hole="${p}" ${sideAttr} > Remove </button> </div> `
                  )
                  .join('')
              : '<div class="empty-state">No holes entered.</div>'
          }
        </div>
      </div>
    `; } function componentToolbar(c) { const index = job.components.findIndex( (x) => x.id === c.id ); return `
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
    `; } function renderPostEditor( c, label ) { const needsHoles = c.fixing === 'fixed_brick' || c.fixing === 'baseplate'; return `
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
              ? ` <div class="field-group" style="margin-top:10px;" > <label> Finished Height </label> <div class="input-with-unit"> <input type="number" inputmode="numeric" min="0" step="1" value="${num(c.manualFinishedHeightMm)}" data-component-field="manualFinishedHeightMm" data-component-id="${safe(c.id)}" > <span class="input-unit"> mm </span> </div> </div> `
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
      </div>
    `; } function availableDoublePairOptions( currentGate ) { const pairs = new Map(); job.components .filter( (g) => g.type === 'gate' && g.id !== currentGate.id && g.relationship === 'double' && g.doublePairId ) .forEach( (g) => pairs.set( g.doublePairId, g.doublePairId ) ); const current = currentGate.doublePairId; if (current) { pairs.set( current, current ); } const options = [...pairs.keys()] .map( (id) => `<option value="${safe(id)}" ${id === current ? 'selected' : ''}>${safe(id)}</option>` ) .join(''); return `
      <option value="">
        Select / create pair
      </option>
      ${options}
      <option value="__new__">
        Create new pair
      </option>
    `; } function renderGateEditor( c, label ) { const w = calculation .gateWidths[ c.id ] || 0; return `
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
              ? ` <div class="field-group" style="margin-top:10px;" > <label> Manual Steel Frame Width </label> <div class="input-with-unit"> <input type="number" inputmode="numeric" min="0" step="1" value="${num(c.manualWidthMm)}" data-component-field="manualWidthMm" data-component-id="${safe(c.id)}" > <span class="input-unit"> mm </span> </div> </div> `
              : ` <div class="compact-feature-summary"> Auto steel frame width: ${mm(w)} </div> `
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
                ? ` <div class="field-group required-field complete"> <label> Double Pair </label> <select data-action-change="set-double-pair" data-component-id="${safe(c.id)}" > ${availableDoublePairOptions(c)} </select> </div> `
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
    `; } function renderPanelPostEditor( panel, side, post ) { const sideName = side === 'left' ? 'Left' : 'Right'; const needsHoles = post.fixing === 'fixed_brick' || post.fixing === 'baseplate'; return `
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
              ? ` <div class="field-group" style="margin-top:10px;" > <label> Finished Height </label> <div class="input-with-unit"> <input type="number" min="0" step="1" value="${num(post.manualFinishedHeightMm)}" data-panel-post-field="manualFinishedHeightMm" data-component-id="${safe(panel.id)}" data-panel-side="${side}" > <span class="input-unit"> mm </span> </div> </div> `
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
    `; } function renderFixedPanelEditor( c, label ) { return `
      <div
        id="component-card-${safe(c.id)}"
        class="card component-card fixed-panel${c.id === job.selectedComponentId ? ' component-selected' : ''}"
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
          ${componentToolbar(c)}
        </div>
        <div
          class="field-group required-field ${num(c.widthMm) > 0 ? 'complete' : ''}"
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
              value="${num(c.widthMm)}"
              data-component-field="widthMm"
              data-component-id="${safe(c.id)}"
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
              c,
              'left',
              c.leftPost
            )}
            ${renderPanelPostEditor(
              c,
              'right',
              c.rightPost
            )}
          </div>
        </div>
        ${
          job.cladding.direction ===
          'vertical'
            ? ` <div class="component-subsection"> <div class="component-subsection-title"> Vertical Cladding Rails </div> <div class="field-group"> <label> Total Rail Count </label> <input type="number" min="${CFG.rails.fixedPanel.verticalMinimumRailCount}" max="${CFG.rails.fixedPanel.verticalMaximumRailCount}" step="1" value="${num(c.verticalRailCount)}" data-component-field="verticalRailCount" data-component-id="${safe(c.id)}" > <small class="field-help"> Default is top, middle and bottom. Increase where required. </small> </div> </div> `
            : ` <div class="compact-feature-summary"> Horizontal cladding: no fixed-panel rails. Cladding spans between the two posts. </div> `
        }
      </div>
    `; } function renderComponentEditor() { const root = $('#component-editor'); if ( !job.components.length ) { root.innerHTML = '<div class="card"><div class="empty-state large">Add a Post, Gate or Fixed Panel to begin.</div></div>'; return; } const labels = componentDisplayLabels(); root.innerHTML = job.components .map( (c) => { if ( c.type === 'post' ) { return renderPostEditor( c, labels[c.id] ); } if ( c.type === 'gate' ) { return renderGateEditor( c, labels[c.id] ); } if ( c.type === 'fixedPanel' ) { return renderFixedPanelEditor( c, labels[c.id] ); } return ''; } ) .join(''); } function renderLayoutSummary() { const l = calculation.layout; const status = $('#layout-width-status'); if ( !job.components.length ) { status.textContent = 'Not Confirmed'; status.className = 'compact-status error'; } else if ( l.unrelatedAutoAmbiguous ) { status.textContent = 'Not Confirmed'; status.className = 'compact-status error'; } else if ( l.valid ) { status.textContent = 'Measurements Confirmed'; status.className = 'compact-status success'; } else { status.textContent = 'Not Confirmed'; status.className = 'compact-status error'; } $('#layout-calculation-summary') .innerHTML = `
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
            ? ` <div class="compact-status error" style="margin-top:8px;" > Multiple unrelated Auto gates are ambiguous. Set at least one gate width to Manual. </div> `
            : ''
        }
      `; } function claddingSummaryText() { const type = job.cladding.type; const cfg = CFG.cladding[type]; if (!cfg) { return 'Select material'; } if ( type === 'galvMesh50' ) { return 'Mesh, 50x50, 4mm'; } if ( type === 'treatedPinePalings' ) { return [ 'Treated Pine', job.cladding.direction === 'vertical' ? 'Vert' : 'Hori' ].join(', '); } if ( type === 'custom' ) { return [ job.cladding.custom.name || 'Custom', job.cladding.direction === 'vertical' ? 'Vert' : 'Hori' ].join(', '); } const finish = job.cladding.colour || job.cladding.finish || job.cladding.profile || ''; return [ cfg.shortLabel || cfg.label, finish, cfg.allowDirection === false ? '' : ( job.cladding.direction === 'vertical' ? 'Vert' : 'Hori' ) ] .filter(Boolean) .join(', '); } function renderDirectionControl() { return `
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
    `; } function renderCladdingOptions() { const type = job.cladding.type; const cfg = CFG.cladding[type]; if (!cfg) { return ''; } let html = ''; if ( cfg.allowDirection !== false ) { html += renderDirectionControl(); } if ( type === 'ekodeck' ) { html += `
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
      `; } if ( [ 'cypressPickets', 'losp90', 'losp140', 'merbau90', 'merbau140' ].includes(type) ) { html += `
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
      `; } if ( type === 'colorbond' ) { html += `
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
              cfg.profiles
                .map(
                  (v) =>
                    `<option value="${safe(v)}" ${v === job.cladding.profile ? 'selected' : ''}>${safe(v)}</option>`
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
      `; } if ( type === 'treatedPinePalings' ) { html += `
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
              ? ` <div class="field-group" style="margin-top:10px;" > <label> Shared Capping / Plinth Length </label> <div class="input-with-unit"> <input type="number" min="0" step="0.1" value="${num(job.cladding.accessoryLengthM)}" data-cladding-field="accessoryLengthM" > <span class="input-unit"> m </span> </div> </div> `
              : ` <div class="compact-feature-summary"> Shared calculated length: ${lm(calculation.cladding.detail.autoAccessoryLengthM || 0)} </div> `
          }
        </div>
      `; } if ( type === 'custom' ) { const c = job.cladding.custom; html += `
        <div class="field-group">
          <label>
            Material Name
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
            ? ` <div class="field-group"> <label> Total Material Cost </label> <div class="input-with-unit"> <input type="number" min="0" step="0.01" value="${num(c.totalCost)}" data-cladding-nested="custom.totalCost" > <span class="input-unit"> $ </span> </div> </div> `
            : ` <div class="form-grid two-column"> <div class="field-group"> <label> Quantity </label> <input type="number" min="0" step="0.01" value="${num(c.quantity)}" data-cladding-nested="custom.quantity" > </div> <div class="field-group"> <label> Unit Cost </label> <div class="input-with-unit"> <input type="number" min="0" step="0.01" value="${num(c.unitCost)}" data-cladding-nested="custom.unitCost" > <span class="input-unit"> $ </span> </div> </div> </div> `
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
      `; } return html; } function renderCladding() { setInputValue( '#cladding-type', job.cladding.type ); $('#cladding-summary') .textContent = claddingSummaryText(); $('#cladding-options') .innerHTML = renderCladdingOptions(); const materialField = $('#cladding-material-field'); if (materialField) { materialField .classList.toggle( 'complete', !!job.cladding.type ); } const c = calculation.cladding; let detail = ''; if ( c.detail?.orderText ) { detail += `
        <div class="summary-row">
          <span>
            Order
          </span>
          <strong>
            ${safe(c.detail.orderText)}
          </strong>
        </div>
      `; } if ( c.type === 'treatedPinePalings' && ( job.cladding.capping || job.cladding.plinth ) ) { detail += `
        <div class="summary-row">
          <span>
            Capping / Plinth Length
          </span>
          <strong>
            ${lm(c.detail.accessoryLengthM)}
          </strong>
        </div>
      `; } $('#cladding-calculation') .innerHTML = `
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
      `; } function renderPowder() { $('#powder-yes-btn') .classList.toggle( 'active', job.powder.enabled ); $('#powder-no-btn') .classList.toggle( 'active', !job.powder.enabled ); $('#powder-options') .classList.toggle( 'hidden', !job.powder.enabled ); const select = $('#powder-colour'); if ( select && select.options.length <= 1 ) { select.innerHTML = '<option value="">Select colour</option>' + CFG.colours .map( (c) => `<option value="${safe(c)}">${safe(c)}</option>` ) .join(''); } setInputValue( '#powder-colour', job.powder.colour ); const group = select?.closest( '.required-field' ); if (group) { group.classList.toggle( 'complete', !!job.powder.colour ); } const p = calculation.powder; $('#powder-summary') .textContent = job.powder.enabled ? `PC, ${job.powder.colour || 'Select colour'}, ${money(p.totalExGST)}` : `No powder coating, touch-up ${money(p.touchUpExGST)}`; $('#powder-calculation') .innerHTML = job.powder.enabled ? `
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
        ` : `
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
        `; } function renderMaterials() { const steelItems = [ ...calculation.posts .steelOrders .map( (o) => ({ title: o.label, value: `${o.stockQty} × ${o.stockLengthM}m stock (${round(o.lengthM, 2)}m required)` }) ), ...calculation.frames .steelOrders .map( (o) => ({ title: o.label, value: `${o.stockQty} × ${o.stockLengthM}m stock (${round(o.lengthM, 2)}m required)` }) ) ]; $('#steel-materials-list') .innerHTML = steelItems.length ? steelItems .map( (i) => `
                <div class="material-item">
                  <div class="material-item-title">
                    ${safe(i.title)}
                  </div>
                  <div class="material-item-value">
                    ${safe(i.value)}
                  </div>
                </div>
              ` ) .join('') : '<div class="empty-state">No steel calculated yet.</div>'; const clad = calculation.cladding; const cladItems = [ { title: clad.config?.label || 'Cladding', value: clad.detail?.orderText || `${round(clad.areaM2, 2)} m²` }, { title: 'Clad Area', value: sqm(clad.areaM2) } ]; $('#cladding-materials-list') .innerHTML = cladItems .map( (i) => `
            <div class="material-item">
              <div class="material-item-title">
                ${safe(i.title)}
              </div>
              <div class="material-item-value">
                ${safe(i.value)}
              </div>
            </div>
          ` ) .join(''); const req = []; calculation.posts .steelOrders .forEach( (o) => req.push([ o.label, `${o.stockQty} × ${o.stockLengthM}m` ]) ); calculation.frames .steelOrders .forEach( (o) => req.push([ o.label, `${o.stockQty} × ${o.stockLengthM}m` ]) ); if ( clad.detail?.orderText ) { req.push([ clad.config?.label || 'Cladding', clad.detail .orderText ]); } if ( calculation.posts .dynabolts ) { req.push([ CFG.fixings .dynabolt .label, `${calculation.posts.dynabolts}` ]); } if ( calculation.frames .hingeSets ) { req.push([ CFG.hardware .hinges .lockout .label, `${calculation.frames.hingeSets} set${calculation.frames.hingeSets === 1 ? '' : 's'}` ]); } if ( calculation.frames .hingeSets ) { req.push([ 'Gate latch', `${calculation.frames.hingeSets}` ]); } if ( calculation.posts .concreteBags ) { req.push([ 'Concrete', `${calculation.posts.concreteBags} bags` ]); } if ( calculation.posts .concretePosts && CFG.concrete .addSpoilRemovalRequirement ) { req.push([ 'Spoil removal', `${calculation.posts.concretePosts} concreted post${calculation.posts.concretePosts === 1 ? '' : 's'}` ]); } if ( calculation.posts .baseplates ) { req.push([ 'Baseplated post allowance', `${calculation.posts.baseplates}` ]); } if ( clad.type === 'treatedPinePalings' ) { if ( job.cladding.capping ) { req.push([ 'Capping', lm( clad.detail .accessoryLengthM ) ]); } if ( job.cladding.plinth ) { req.push([ 'Plinth', lm( clad.detail .accessoryLengthM ) ]); } } if ( clad.type === 'galvMesh50' ) { req.push([ 'Mesh sheets', clad.detail .orderText ]); } $('#required-materials-list') .innerHTML = req.length ? req .map( ([name, qty]) => `
                <div class="required-material-row">
                  <span>
                    ${safe(name)}
                  </span>
                  <strong>
                    ${safe(qty)}
                  </strong>
                </div>
              ` ) .join('') : '<div class="empty-state">Required materials will appear here.</div>'; const cuts = []; calculation.posts .cutList .forEach( (i) => { cuts.push([ i.label, i.cutLengthMm ? `${postConfig(i.postType).label}: ${Math.round(i.cutLengthMm)}mm${i.holes.length ? ` | Holes: ${i.holes.join(', ')}mm` : ''}` : 'Existing structure / no new post' ]); } ); calculation.frames .cutList .forEach( (i) => { if ( i.type === 'gate' ) { cuts.push([ `${i.label} (${i.hingeSide === 'left' ? 'L' : 'R'})`, `${Math.round(i.widthMm)} × ${Math.round(i.heightMm)}mm | ${i.railCount} ${i.railOrientation} rail${i.railCount === 1 ? '' : 's'} @ ${Math.round(i.railLengthMm)}mm` ]); } else { cuts.push([ i.label, `${Math.round(i.widthMm)} × ${Math.round(i.heightMm)}mm | ${i.railCount ? `${i.railCount} rails @ ${Math.round(i.railLengthMm)}mm` : 'No rails'}` ]); } } ); $('#fabrication-cut-list') .innerHTML = cuts.length ? cuts .map( ([name, detail]) => `
                <div class="cut-list-row">
                  <span>
                    ${safe(name)}
                  </span>
                  <strong>
                    ${safe(detail)}
                  </strong>
                </div>
              ` ) .join('') : '<div class="empty-state">Fabrication dimensions will appear here.</div>'; } function renderLabour() { const l = calculation.labour; $('#labour-fabrication-auto') .textContent = formatHours( l.fabricationAutoHours ); setInputValue( '#labour-fabrication-additional', job.labour .additionalFabricationHours ); $('#labour-fabrication-total') .textContent = formatHours( l.fabricationTotalHours ); $('#labour-install-auto') .textContent = formatHours( l.installationAutoHours ); setInputValue( '#labour-install-additional', job.labour .additionalInstallHours ); $('#labour-install-total') .textContent = formatHours( l.installationTotalHours ); $('#fabrication-labour-breakdown') .innerHTML = `
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
      `; $('#installation-labour-breakdown') .innerHTML = `
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
      `; $('#cladding-labour-summary') .innerHTML = `
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
      `; const totalHoursEquivalent = l.fabricationTotalHours + l.installationTotalHours + ( calculation.cladding .labourCostExGST / CFG.business .labourRate ); $('#total-labour-hours') .textContent = `${round(totalHoursEquivalent, 2).toFixed(2)} hours equivalent`; $('#total-labour-cost') .textContent = money( l.totalCostExGST ); } function renderCosting() { const c = calculation.costing; $('#cost-materials') .textContent = money( c.materialsBeforeMarkupExGST ); $('#cost-labour') .textContent = money( c.labourCostExGST ); $('#cost-travel') .textContent = money( c.travelExGST ); $('#cost-finish') .textContent = money( c.finishExGST ); $('#cost-markup') .textContent = money( c.materialMarkupExGST ); $('#cost-ex-gst') .textContent = money( c.sellExGST ); $('#cost-gst') .textContent = money( c.autoIncGSTUnrounded - c.sellExGST ); const roundingAmount = c.autoIncGST - c.autoIncGSTUnrounded; const roundingEl = $('#cost-rounding'); if (roundingEl) { roundingEl.textContent = money( roundingAmount ); } $('#cost-auto-quote') .textContent = money( c.autoIncGST ); $('#costing-quote-mode') .textContent = job.quote.mode === 'manual' ? 'Manual' : 'Auto'; $('#costing-profit') .textContent = money( c.profitExGST ); $('#costing-effective-rate') .textContent = money( c.effectiveRate ); $('#costing-cavity-area') .textContent = sqm( c.cavityAreaM2 ); } function renderClient() { setInputValue( '#client-name', job.client.name ); setInputValue( '#client-address', job.client.address ); setInputValue( '#client-project-number', job.client .projectNumber ); setInputValue( '#client-mobile', job.client.mobile ); setInputValue( '#client-email', job.client.email ); ensureClientNotesField(); setInputValue( '#client-notes', job.client.notes || '' ); const includeNotes = $('#client-notes-include'); if (includeNotes) { includeNotes.checked = Boolean( job.client.includeNotesInQuote ); } } function ensureClientNotesField() { if ($('#client-notes-wrap')) { return; } const email = $('#client-email'); if (!email) { return; } const anchor = email.closest( '.field, .form-field, label, .input-group' ) || email.parentElement; const wrap = document.createElement('div'); wrap.id = 'client-notes-wrap'; wrap.style.cssText = 'margin-top:12px;grid-column:1/-1;'; wrap.innerHTML = `
      <label for="client-notes" style="display:block;font-weight:700;margin-bottom:6px;">Notes</label>
      <textarea
        id="client-notes"
        data-state-path="client.notes"
        rows="1"
        placeholder="Add job note..."
        style="width:100%;min-height:42px;resize:none;overflow:hidden;box-sizing:border-box;"
      ></textarea>
      <label style="display:flex;align-items:center;gap:8px;margin-top:8px;cursor:pointer;font-weight:600;">
        <input
          id="client-notes-include"
          type="checkbox"
          data-state-path="client.includeNotesInQuote"
        >
        Include in client quote
      </label>
    `; anchor.insertAdjacentElement( 'afterend', wrap ); const notes = $('#client-notes'); const expand = () => { notes.rows = 3; notes.style.resize = 'vertical'; notes.style.overflow = 'auto'; }; const collapse = () => { if (!notes.matches(':focus')) { notes.rows = 1; notes.style.resize = 'none'; notes.style.overflow = 'hidden'; } }; notes.addEventListener( 'focus', expand ); notes.addEventListener( 'blur', collapse ); } function fullDirectionWord() { return ( job.cladding.direction === 'vertical' ? 'vertically' : 'horizontally' ); } function claddingClientDescription() { const type = job.cladding.type; const cfg = CFG.cladding[type]; if (!cfg) { return 'selected cladding'; } if (type === 'galvMesh50') { return '50×50mm galvanised mesh with 4.0mm wire'; } if (type === 'treatedPinePalings') { const size = job.cladding.palingWidthMm && job.cladding.palingLengthMm ? ` ${job.cladding.palingWidthMm}×${job.cladding.palingLengthMm}mm` : ''; return `treated pine${size} palings`; } if (type === 'custom') { return ( job.cladding.custom.name || 'custom cladding' ); } if (type === 'colorbond') { const profile = job.cladding.profile || 'Colorbond'; const colour = job.cladding.colour ? ` in ${job.cladding.colour}` : ''; return `${profile}${colour}`; } const extras = []; if (job.cladding.colour) { extras.push(job.cladding.colour); } if (job.cladding.finish) { extras.push(job.cladding.finish); } return `${cfg.label}${
      extras.length
        ? `, ${extras.join(', ')}`
        : ''
    }`; } function referenceText() { if ( job.site.referenceDirection === 'other' ) { return ( job.site.referenceCustom || 'the nominated viewing direction' ); } return ( CFG.referenceDirections[ job.site.referenceDirection ] || CFG.referenceDirections .streetToProperty ); } function postFixingClientText(post) { const cfg = CFG.postFixings[ post.fixing ]; if (cfg?.label) { return String(cfg.label) .replace(/\.$/, '') .toLowerCase(); } const fallback = { fixed_brick: 'fixed to existing brickwork', concrete_house: 'concreted into the ground beside the house', concrete_floating: 'concreted into the ground', baseplate: 'baseplate fixed', existing_structure: 'existing structure' }; return fallback[post.fixing] || 'installed to suit the existing structure'; } function postClientLines() { return collectPhysicalPosts() .filter( (item) => item.post.fixing !== 'existing_structure' ) .map((item) => { const label = item.side ? `${item.ownerLabel} ${item.side.toLowerCase()} post` : item.ownerLabel; return `${label}: ${postFixingClientText(item.post)}.`; }); } function latchClientText(latchType) { const item = CFG.hardware.latches[ latchType ] || CFG.hardware.latches .ddDualKey; if (latchType === 'ddDualKey') { return 'D&D dual-way key-lockable latch, supplied with 2 keys'; } return String( item?.label || 'gate latch' ).replace(/\.$/, ''); } function gateClientLines() { const labels = componentDisplayLabels(); return job.components .filter( (c) => c.type === 'gate' ) .flatMap((g) => { const hinge = g.hingeSide === 'left' ? 'left' : 'right'; const latch = hinge === 'left' ? 'right' : 'left'; const open = g.openDirection === 'in' ? 'inward' : 'outward'; return [ `${labels[g.id]}: hinged on the ${hinge}, latch on the ${latch}, opening ${open}.`, `Fit ${latchClientText(g.latchType)}.` ]; }); } function claddingFabricationText() { const clad = claddingClientDescription(); if ( job.cladding.type === 'galvMesh50' ) { return `Fit ${clad} to the steel frame.`; } if ( job.cladding.type === 'colorbond' ) { return `Install ${clad} ${fullDirectionWord()} to suit the project.`; } return `Install ${clad} ${fullDirectionWord()}.`; } function quoteTexts() { const gates = job.components.filter( (c) => c.type === 'gate' ); const panels = job.components.filter( (c) => c.type === 'fixedPanel' ); const cavityW = Math.round( num(job.site.cavityWidthMm) ); const height = Math.round( num(job.site.finishedHeightMm) ); const clad = claddingClientDescription(); const pairIds = new Set( gates .filter( (g) => g.relationship === 'double' && g.doublePairId ) .map( (g) => g.doublePairId ) ); const isOneDoubleGate = gates.length === 2 && pairIds.size === 1 && gates.every( (g) => g.relationship === 'double' ); let projectType = 'gate project'; if (isOneDoubleGate) { projectType = 'double gate'; } else if ( gates.length === 1 && !panels.length ) { projectType = 'gate'; } else if ( !gates.length && panels.length === 1 ) { projectType = 'fixed panel'; } else if ( !gates.length && panels.length > 1 ) { projectType = 'fixed panel project'; } const project = `Supply, fabricate and install a custom steel-framed ${projectType} for the measured cavity approximately ${cavityW}mm wide × ${height}mm high, with ${clad}.`; const fabricationLines = []; if (gates.length) { fabricationLines.push( gates.length === 1 ? `Fabricate custom steel gate frame to suit the ${cavityW}mm wide opening.` : `Fabricate ${gates.length} custom steel gate frames to suit the ${cavityW}mm wide opening.` ); } if (panels.length) { fabricationLines.push( panels.length === 1 ? 'Fabricate fixed panel to suit the measured opening.' : `Fabricate ${panels.length} fixed panels to suit the measured opening.` ); } fabricationLines.push( ...postClientLines() ); fabricationLines.push( claddingFabricationText() ); const installationLines = [ `As viewed from ${referenceText()}:` ]; installationLines.push( ...gateClientLines() ); if (gates.length) { installationLines.push( gates.length === 1 ? 'Fit and adjust heavy-duty galvanised lock-out hinges.' : 'Fit and adjust heavy-duty galvanised lock-out hinges to each gate.' ); } if (panels.length) { installationLines.push( panels.length === 1 ? 'Install fixed panel to the nominated post arrangement.' : 'Install fixed panels to the nominated post arrangements.' ); } const finish = job.powder.enabled ? `Steel posts and gate/fixed-panel steelwork powder coated in ${job.powder.colour || 'the selected colour'}.\nAllow up to 2 weeks for powder-coating.` : ''; return { project, fabrication: fabricationLines.join('\n'), installation: installationLines.join('\n'), finish }; } function emailContent(texts) { const ref = job.client.projectNumber; const firstName = job.client.name ? job.client.name .trim() .split(/\s+/)[0] : ''; const greeting = firstName ? `Hi ${firstName},` : 'Hi,'; const amount = money( calculation.costing .finalIncGST ); const subject = `JTLA Gates Quote ${ref}`; const finishSection = texts.finish ? `\nFINISH\n${texts.finish}\n` : ''; const notes = String( job.client.notes || '' ).trim(); const notesSection = job.client.includeNotesInQuote && notes ? `\nNOTES\n${notes}\n` : ''; const body = `${greeting}

Thank you for the opportunity to quote your gate project.

PROJECT DESCRIPTION
${texts.project}

FABRICATION
${texts.fabrication}

INSTALLATION
${texts.installation}
${finishSection}
PRICE
Total ex GST    ${money(calculation.costing.finalExGST)}
GST             ${money(calculation.costing.finalGST)}
Total inc GST   ${amount}
${notesSection}
TERMS
${CFG.quote.depositText}
${CFG.quote.acceptanceText}

BANK TRANSFER
Account Name: ${CFG.bank.accountName}
BSB: ${CFG.bank.bsb}
Account Number: ${CFG.bank.accountNumber}

Thank you,
Jody`; return { subject, body }; } function emailHtml(texts) { const email = emailContent(texts); const escLines = (value) => safe(value).replace(/\n/g, '<br>'); const notes = String( job.client.notes || '' ).trim(); const finishHtml = texts.finish ? `<p><strong>FINISH</strong><br>${escLines(texts.finish)}</p>` : ''; const notesHtml = job.client.includeNotesInQuote && notes ? `<p><strong>NOTES</strong><br>${escLines(notes)}</p>` : ''; const firstName = job.client.name ? job.client.name .trim() .split(/\s+/)[0] : ''; const greeting = firstName ? `Hi ${safe(firstName)},` : 'Hi,'; return `
      <div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.45;color:#111;">
        <p>${greeting}</p>
        <p>Thank you for the opportunity to quote your gate project.</p>
        <p><strong>PROJECT DESCRIPTION</strong><br>${escLines(texts.project)}</p>
        <p><strong>FABRICATION</strong><br>${escLines(texts.fabrication)}</p>
        <p><strong>INSTALLATION</strong><br>${escLines(texts.installation)}</p>
        ${finishHtml}
        <p><strong>PRICE</strong></p>
        <table style="border-collapse:collapse;min-width:310px;">
          <tr><td style="padding:3px 18px 3px 0;">Total ex GST</td><td style="padding:3px 0;text-align:right;">${safe(money(calculation.costing.finalExGST))}</td></tr>
          <tr><td style="padding:3px 18px 3px 0;">GST</td><td style="padding:3px 0;text-align:right;">${safe(money(calculation.costing.finalGST))}</td></tr>
          <tr><td style="padding:5px 18px 3px 0;border-top:1px solid #777;"><strong>Total inc GST</strong></td><td style="padding:5px 0 3px;border-top:1px solid #777;text-align:right;"><strong>${safe(money(calculation.costing.finalIncGST))}</strong></td></tr>
        </table>
        ${notesHtml}
        <p><strong>TERMS</strong><br>${escLines(CFG.quote.depositText)}<br>${escLines(CFG.quote.acceptanceText)}</p>
        <p><strong>BANK TRANSFER</strong><br>Account Name: ${safe(CFG.bank.accountName)}<br>BSB: ${safe(CFG.bank.bsb)}<br>Account Number: ${safe(CFG.bank.accountNumber)}</p>
        <p>Thank you,<br>Jody</p>
      </div>
    `; } async function copyEmailRich() { const texts = quoteTexts(); const email = emailContent(texts); const plain = `${email.subject}\n\n${email.body}`; try { if ( navigator.clipboard?.write && window.ClipboardItem ) { const html = `<div><strong>${safe(email.subject)}</strong></div><br>${emailHtml(texts)}`; await navigator.clipboard.write([ new ClipboardItem({ 'text/plain': new Blob( [plain], { type: 'text/plain' } ), 'text/html': new Blob( [html], { type: 'text/html' } ) }) ]); toast('Email copied'); return; } } catch (err) { console.warn( 'Rich email copy unavailable; using plain text.', err ); } await copyText( plain, 'Email copied' ); } function smsContent() { const ref = job.client .projectNumber; const amount = money( calculation.costing .finalIncGST ); const firstName = job.client.name ? job.client.name .trim() .split(/\s+/)[0] : ''; const greeting = firstName ? `Hi ${firstName},` : 'Hi,'; const cavity = Math.round( num( job.site .cavityWidthMm ) ); const height = Math.round( num( job.site .finishedHeightMm ) ); const gates = job.components .filter( (c) => c.type === 'gate' ) .length; const panels = job.components .filter( (c) => c.type === 'fixedPanel' ) .length; let work = 'custom gate'; if ( gates > 1 ) { work = 'custom gates'; } if ( !gates && panels === 1 ) { work = 'custom fixed panel'; } if ( !gates && panels > 1 ) { work = 'custom fixed panels'; } if ( gates && panels ) { work = 'custom gate and fixed panel works'; } let claddingName = claddingClientDescription(); if ( job.cladding.type === 'treatedPinePalings' ) { claddingName = 'treated pine'; } if ( job.cladding.type === 'ekodeck' ) { claddingName = 'Ekodeck screening'; } if ( job.cladding.type === 'galvMesh50' ) { claddingName = 'galvanised mesh'; } return `${greeting}

JTLA Gates quote ${ref}:
Supply and install ${work} with ${claddingName}.
${cavity}mm wide cavity, finished height ${height}mm.
Total ${amount} inc. GST.

Thank you,
Jody`; } 

 function renderQuote() {
  const c = calculation.costing;
  const manual = job.quote.mode === 'manual';

  $('#quote-mode-display').textContent =
    manual ? 'Manual' : 'Auto';

  $('#quote-reset-auto-btn').classList.toggle(
    'hidden',
    !manual
  );

  setInputValue(
    '#quote-final-amount',
    round(c.finalIncGST, 2)
  );

  $('#quote-profit').textContent =
    money(c.profitExGST);

  $('#quote-effective-rate').textContent =
    money(c.effectiveRate);

  const texts = quoteTexts();

  $('#finished-quote-reference').textContent =
    `Quote ${job.client.projectNumber}`;

  $('#finished-quote-client').textContent =
    job.client.name || 'Client';

  $('#quote-project-description').textContent =
    texts.project;

  $('#quote-fabrication').textContent =
    texts.fabrication;

  $('#quote-installation').textContent =
    texts.installation;


  /* =========================================
     FINISH SECTION

     Only hide the individual FINISH block.
     Never hide the whole Quote page.
     ========================================= */

  const quoteFinish =
    $('#quote-finish');

  if (quoteFinish) {
    quoteFinish.textContent =
      texts.finish || '';

    const finishBlock =
      quoteFinish.closest('.quote-section');

    if (finishBlock) {
      finishBlock.classList.toggle(
        'hidden',
        !texts.finish
      );
    }
  }


  /* =========================================
     PRICE
     ========================================= */

  $('#quote-price-ex-gst').textContent =
    money(c.finalExGST);

  $('#quote-price-gst').textContent =
    money(c.finalGST);

  $('#quote-price-inc-gst').textContent =
    money(c.finalIncGST);


  /* =========================================
     TERMS
     ========================================= */

  $('#quote-terms').textContent =
    CFG.quote.depositText;


  /* =========================================
     BANK DETAILS
     ========================================= */

  $('#quote-bank-details').innerHTML = `
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


  /* =========================================
     EMAIL
     ========================================= */

  const email =
    emailContent(texts);

  $('#email-subject').value =
    email.subject;

  $('#email-body').value =
    email.body;


  /* =========================================
     SMS

     SMS remains unchanged.
     ========================================= */

  $('#sms-body').value =
    smsContent();
}              
