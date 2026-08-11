const $ = id => document.getElementById(id);

let quoteType = "single";
let lastCalculation = null;

const money = value =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD"
  }).format(Number(value || 0));

function roundUp(value, increment) {
  return Math.ceil(value / increment) * increment;
}

function uid() {
  return "Q-" + Date.now().toString(36).toUpperCase();
}

function populateSelect(selectId, object) {
  const el = $(selectId);
  el.innerHTML = "";
  Object.entries(object).forEach(([value, data]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = data.label;
    el.appendChild(option);
  });
}

function setupPriceDrivenFields() {
  populateSelect("frameSize", PRICES.steel.frame);
  populateSelect("postSize", PRICES.steel.posts);
  populateSelect("hinges", PRICES.hardware.hinges);
  populateSelect("latch", PRICES.hardware.latches);

  const colours = $("ekodeckColour");
  colours.innerHTML = "";
  PRICES.cladding.ekodeck.colours.forEach(colour => {
    const option = document.createElement("option");
    option.textContent = colour;
    option.value = colour;
    colours.appendChild(option);
  });

  $("powderCost").value = PRICES.finishing.powderCoatTypical;
}

function setQuoteType(type) {
  quoteType = type;

  document.querySelectorAll(".tab").forEach(tab => {
    tab.classList.toggle("active", tab.dataset.type === type);
  });

  $("sliderSection").classList.toggle("hidden", type !== "slider");
  $("automationSection").classList.toggle("hidden", type !== "automation");

  if (PRICES.defaults.fabricationHours[type] !== undefined) {
    $("fabricationHours").value = PRICES.defaults.fabricationHours[type];
  }

  if (PRICES.defaults.installationHours[type] !== undefined) {
    $("installationHours").value = PRICES.defaults.installationHours[type];
  }

  createDescription();
}

function updateConditionalSections() {
  const cladding = $("claddingType").value;
  $("ekodeckOptions").classList.toggle("hidden", cladding !== "ekodeck");
  $("cypressOptions").classList.toggle("hidden", cladding !== "cypress");
  $("picketOptions").classList.toggle("hidden", cladding !== "cypressPickets");
  $("colorbondOptions").classList.toggle("hidden", cladding !== "colorbond");
  $("customCladdingOptions").classList.toggle("hidden", cladding !== "custom");

  const fixing = $("fixingType").value;
  const hasConcrete = fixing === "concreted" || fixing === "concreteBrick";
  const hasBolts = fixing === "brick" || fixing === "concreteBrick";

  $("concreteOptions").classList.toggle("hidden", !hasConcrete);
  $("boltOptions").classList.toggle("hidden", !hasBolts);

  $("powderOptions").classList.toggle("hidden", !$("powderCoat").checked);
  $("paintOptions").classList.toggle("hidden", !$("paintTimber").checked);
}

function getSteelRate(kind) {
  if (kind === "frame") {
    const selected = $("frameSize").value;
    if (selected === "custom") return Number($("customFrameRate").value || 0);
    return PRICES.steel.frame[selected].ratePerM;
  }

  const selected = $("postSize").value;
  if (selected === "custom") return Number($("customPostRate").value || 0);
  return PRICES.steel.posts[selected].ratePerM;
}

function getFrameLabel() {
  const selected = $("frameSize").value;
  if (selected === "custom") return $("customFrameSize").value || "Custom frame";
  return PRICES.steel.frame[selected].label;
}

function getPostLabel() {
  const selected = $("postSize").value;
  if (selected === "custom") return $("customPostSize").value || "Custom posts";
  return PRICES.steel.posts[selected].label;
}

function calculateCladding(area) {
  const type = $("claddingType").value;
  const wasteMultiplier = 1 + Number($("claddingWaste").value || 0) / 100;
  const adjustedArea = area * wasteMultiplier;

  let rate = 0;
  let description = "No cladding";

  if (type === "ekodeck") {
    rate = PRICES.cladding.ekodeck.ratePerM2;
    description = `${PRICES.cladding.ekodeck.label}, ${$("ekodeckColour").value}`;
  }

  if (type === "cypress") {
    rate = PRICES.cladding.cypress.rawRatePerM2;
    description = `Cypress boards, ${$("cypressFinish").value}`;
  }

  if (type === "cypressPickets") {
    rate = PRICES.cladding.cypressPickets.ratePerM2;
    description = `Cypress pickets, ${$("picketLength").value}mm`;
  }

  if (type === "merbau90") {
    rate = PRICES.cladding.merbau90.ratePerM2;
    description = PRICES.cladding.merbau90.label;
  }

  if (type === "merbau140") {
    rate = PRICES.cladding.merbau140.ratePerM2;
    description = PRICES.cladding.merbau140.label;
  }

  if (type === "colorbond") {
    const profile = $("colorbondProfile").value;
    rate = PRICES.cladding.colorbond.profiles[profile].ratePerM2;
    description = `Colorbond ${PRICES.cladding.colorbond.profiles[profile].label}`;
    if ($("colorbondNotes").value.trim()) {
      description += `, ${$("colorbondNotes").value.trim()}`;
    }
  }

  if (type === "custom") {
    rate = Number($("customCladdingRate").value || 0);
    description = $("customCladdingName").value || "Custom cladding";
  }

  if (type === "none") {
    rate = 0;
    description = "No cladding";
  }

  return {
    cost: adjustedArea * rate,
    adjustedArea,
    description
  };
}

function calculateQuote() {
  const widthM = Number($("gateWidth").value || 0) / 1000;
  const heightM = Number($("gateHeight").value || 0) / 1000;
  const area = widthM * heightM;
  $("gateArea").textContent = `${area.toFixed(2)} m²`;

  let leaves = quoteType === "double" ? 2 : 1;
  let frameLength = ((widthM * 2) + (heightM * 2)) * leaves;

  if (quoteType === "double") {
    frameLength = (widthM * 2) + (heightM * 4);
  }

  const frameCost = frameLength * getSteelRate("frame") + Number($("extraSteel").value || 0);

  const postCount = Number($("postCount").value || 0);
  const postLength = heightM + Number($("postEmbed").value || 0) / 1000;
  const postCost = postCount * postLength * getSteelRate("post");

  const cladding = calculateCladding(area);

  const hingeData = PRICES.hardware.hinges[$("hinges").value];
  const latchData = PRICES.hardware.latches[$("latch").value];
  const hardwareCost =
    hingeData.price +
    latchData.price +
    Number($("extraHardware").value || 0);

  const fixingType = $("fixingType").value;
  const hasConcrete = fixingType === "concreted" || fixingType === "concreteBrick";
  const hasBolts = fixingType === "brick" || fixingType === "concreteBrick";

  const concreteCost = hasConcrete
    ? Number($("concreteBags").value || 0) * PRICES.fixings.concreteBag
    : 0;

  const boltCost = hasBolts
    ? Number($("boltCount").value || 0) * PRICES.fixings.boltEach
    : 0;

  const fixingExtra = Number($("extraFixingCost").value || 0);
  const disposalCost = hasConcrete ? Number($("soilDisposalCost").value || 0) : 0;

  const powderCost = $("powderCoat").checked
    ? Number($("powderCost").value || 0)
    : 0;

  const paintMaterialCost = $("paintTimber").checked
    ? Number($("paintMaterialCost").value || 0)
    : 0;

  const sliderCosts = quoteType === "slider"
    ? Number($("sliderTrackCost").value || 0) + Number($("sliderHardwareCost").value || 0)
    : 0;

  const automationEquipment = quoteType === "automation"
    ? Number($("automationEquipmentCost").value || 0)
    : 0;

  const materialBoughtInCosts =
    frameCost +
    postCost +
    cladding.cost +
    hardwareCost +
    concreteCost +
    boltCost +
    fixingExtra +
    disposalCost +
    powderCost +
    paintMaterialCost +
    sliderCosts +
    automationEquipment;

  const fabricationHours = Number($("fabricationHours").value || 0);
  const installationHours = Number($("installationHours").value || 0);
  const otherLabourHours = Number($("otherLabourHours").value || 0);
  const holeDigHours = hasConcrete ? Number($("holeDigHours").value || 0) : 0;
  const soilRemovalHours = hasConcrete ? Number($("soilRemovalHours").value || 0) : 0;
  const paintHours = $("paintTimber").checked ? Number($("paintHours").value || 0) : 0;
  const automationHours = quoteType === "automation"
    ? Number($("automationHours").value || 0)
    : 0;

  const totalHours =
    fabricationHours +
    installationHours +
    otherLabourHours +
    holeDigHours +
    soilRemovalHours +
    paintHours +
    automationHours;

  const labourCost = totalHours * PRICES.business.labourRate;

  const totalTravelKm = Number($("travelKm").value || 0);
  const chargeableTravelKm = Math.max(0, totalTravelKm - PRICES.business.includedTravelKm);
  const travelCost = chargeableTravelKm * PRICES.business.travelRatePerKm;

  const otherDirectCosts = Number($("otherCosts").value || 0);

  const markup = materialBoughtInCosts * PRICES.business.materialMarkup;

  const exGst = materialBoughtInCosts + labourCost + travelCost + otherDirectCosts + markup;
  const gst = exGst * PRICES.business.gst;
  const incGst = exGst + gst;
  const roundedFinal = roundUp(incGst, PRICES.business.roundTo);

  $("materialsTotal").textContent = money(materialBoughtInCosts);
  $("labourTotal").textContent = money(labourCost);
  $("travelTotal").textContent = money(travelCost);
  $("directOtherTotal").textContent = money(otherDirectCosts);
  $("markupTotal").textContent = money(markup);
  $("exGstTotal").textContent = money(exGst);
  $("gstTotal").textContent = money(gst);
  $("incGstTotal").textContent = money(incGst);
  $("finalPrice").value = roundedFinal;

  lastCalculation = {
    area,
    frameLength,
    frameCost,
    postCost,
    claddingCost: cladding.cost,
    claddingDescription: cladding.description,
    hardwareCost,
    concreteCost,
    boltCost,
    fixingExtra,
    disposalCost,
    powderCost,
    paintMaterialCost,
    sliderCosts,
    automationEquipment,
    materialBoughtInCosts,
    fabricationHours,
    installationHours,
    holeDigHours,
    soilRemovalHours,
    paintHours,
    automationHours,
    totalHours,
    labourCost,
    totalTravelKm,
    chargeableTravelKm,
    travelCost,
    otherDirectCosts,
    markup,
    exGst,
    gst,
    incGst
  };

  updateProfit();
  createBreakdown();
  createDescription();
}

function updateProfit() {
  if (!lastCalculation) return;

  const finalInc = Number($("finalPrice").value || 0);
  const finalEx = finalInc / (1 + PRICES.business.gst);

  const realCosts =
    lastCalculation.materialBoughtInCosts +
    lastCalculation.labourCost +
    lastCalculation.travelCost +
    lastCalculation.otherDirectCosts;

  const profit = finalEx - realCosts;
  $("profitTotal").textContent = money(profit);
}

function createBreakdown() {
  if (!lastCalculation) return;

  const c = lastCalculation;
  $("costBreakdown").innerHTML = `
    <p><span>Frame steel</span><strong>${money(c.frameCost)}</strong></p>
    <p><span>Posts</span><strong>${money(c.postCost)}</strong></p>
    <p><span>Cladding</span><strong>${money(c.claddingCost)}</strong></p>
    <p><span>Hardware</span><strong>${money(c.hardwareCost)}</strong></p>
    <p><span>Concrete</span><strong>${money(c.concreteCost)}</strong></p>
    <p><span>Bolts</span><strong>${money(c.boltCost)}</strong></p>
    <p><span>Fixing extras</span><strong>${money(c.fixingExtra)}</strong></p>
    <p><span>Disposal</span><strong>${money(c.disposalCost)}</strong></p>
    <p><span>Powder coating</span><strong>${money(c.powderCost)}</strong></p>
    <p><span>Paint materials</span><strong>${money(c.paintMaterialCost)}</strong></p>
    <p><span>Slider equipment</span><strong>${money(c.sliderCosts)}</strong></p>
    <p><span>Automation equipment</span><strong>${money(c.automationEquipment)}</strong></p>
    <p><span>Total labour hours</span><strong>${c.totalHours.toFixed(2)} hrs</strong></p>
    <p><span>Labour @ ${money(PRICES.business.labourRate)}/hr</span><strong>${money(c.labourCost)}</strong></p>
    <p><span>Chargeable travel</span><strong>${c.chargeableTravelKm.toFixed(0)} km</strong></p>
    <p><span>Travel cost</span><strong>${money(c.travelCost)}</strong></p>
    <p><span>Other direct costs</span><strong>${money(c.otherDirectCosts)}</strong></p>
    <p><span>Markup on materials</span><strong>${money(c.markup)}</strong></p>
  `;
}

function installationDescription() {
  const fixing = $("fixingType").value;

  if (fixing === "concreted") {
    return `Posts concreted into ground using ${$("concreteBags").value} bag(s) of concrete.`;
  }

  if (fixing === "brick") {
    return `Fixed to existing brickwork using ${$("boltCount").value} x ${$("boltType").selectedOptions[0].text}.`;
  }

  if (fixing === "concreteBrick") {
    return `Posts concreted into ground and additionally fixed to brickwork using ${$("boltCount").value} x ${$("boltType").selectedOptions[0].text}.`;
  }

  if (fixing === "existing") {
    return "Gate fitted to existing posts / structure.";
  }

  return "Custom installation method.";
}

function createDescription() {
  const typeNames = {
    single: "single pedestrian gate",
    double: "double / driveway gate",
    slider: "sliding gate",
    automation: "gate automation"
  };

  const width = $("gateWidth").value;
  const height = $("gateHeight").value;

  let description = `Supply and install ${typeNames[quoteType]}.

Gate size:
${width}mm wide x ${height}mm high

Steel:
${getFrameLabel()} gate frame`;

  if ($("postSize").value !== "none") {
    description += `
${$("postCount").value} x ${getPostLabel()} post(s)`;
  }

  if (lastCalculation) {
    description += `

Cladding:
${lastCalculation.claddingDescription}`;
  }

  description += `

Hardware:
${PRICES.hardware.hinges[$("hinges").value].label}
${PRICES.hardware.latches[$("latch").value].label}

Installation:
${installationDescription()}`;

  if ($("powderCoat").checked) {
    description += `

Steel finish:
Powder coated${$("powderColour").value.trim() ? ` in ${$("powderColour").value.trim()}` : ""}.`;
  }

  if ($("paintTimber").checked) {
    description += `

Timber finish:
Painted${$("paintColour").value.trim() ? ` ${$("paintColour").value.trim()}` : ""}.`;
  } else if ($("claddingType").value === "cypress") {
    description += `

Timber finish:
${$("cypressFinish").value === "raw" ? "Raw / unpainted." : "Painted."}`;
  }

  if (quoteType === "slider") {
    description += `

Sliding gate:
Track / rail and sliding gate hardware included as selected.`;
  }

  if (quoteType === "automation") {
    description += `

Automation:
${$("automationDescription").value || "Automation equipment and installation as selected."}`;
  }

  $("quoteDescription").value = description;
}

function collectQuoteData() {
  return {
    id: $("quoteNumber").value || uid(),
    savedAt: new Date().toISOString(),
    quoteType,
    customerName: $("customerName").value,
    customerPhone: $("customerPhone").value,
    customerEmail: $("customerEmail").value,
    siteAddress: $("siteAddress").value,
    quoteDescription: $("quoteDescription").value,
    finalPrice: Number($("finalPrice").value || 0),
    form: Object.fromEntries(
      [...document.querySelectorAll("input, select, textarea")]
        .filter(el => el.id)
        .map(el => [
          el.id,
          el.type === "checkbox" ? el.checked : el.value
        ])
    )
  };
}

function saveQuote() {
  calculateQuote();

  const quote = collectQuoteData();
  const quotes = JSON.parse(localStorage.getItem("jtlaGateQuotes") || "[]");

  const existingIndex = quotes.findIndex(q => q.id === quote.id);
  if (existingIndex >= 0) quotes[existingIndex] = quote;
  else quotes.unshift(quote);

  localStorage.setItem("jtlaGateQuotes", JSON.stringify(quotes));
  renderSavedQuotes();
}

function renderSavedQuotes() {
  const quotes = JSON.parse(localStorage.getItem("jtlaGateQuotes") || "[]");
  const container = $("savedQuotes");

  if (!quotes.length) {
    container.innerHTML = `<p class="muted">No saved quotes yet.</p>`;
    return;
  }

  container.innerHTML = quotes.map(q => `
    <div class="saved-row">
      <div>
        <strong>${q.id}</strong>
        <span>${q.customerName || "Unnamed customer"}</span>
        <small>${q.siteAddress || ""}</small>
      </div>
      <div class="saved-actions">
        <strong>${money(q.finalPrice)}</strong>
        <button data-load="${q.id}" class="small">Open</button>
        <button data-delete="${q.id}" class="small danger">Delete</button>
      </div>
    </div>
  `).join("");

  container.querySelectorAll("[data-load]").forEach(btn => {
    btn.addEventListener("click", () => loadQuote(btn.dataset.load));
  });

  container.querySelectorAll("[data-delete]").forEach(btn => {
    btn.addEventListener("click", () => deleteQuote(btn.dataset.delete));
  });
}

function loadQuote(id) {
  const quotes = JSON.parse(localStorage.getItem("jtlaGateQuotes") || "[]");
  const q = quotes.find(item => item.id === id);
  if (!q) return;

  setQuoteType(q.quoteType || "single");

  Object.entries(q.form || {}).forEach(([id, value]) => {
    const el = $(id);
    if (!el) return;
    if (el.type === "checkbox") el.checked = Boolean(value);
    else el.value = value;
  });

  updateConditionalSections();
  calculateQuote();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function deleteQuote(id) {
  const quotes = JSON.parse(localStorage.getItem("jtlaGateQuotes") || "[]");
  const filtered = quotes.filter(q => q.id !== id);
  localStorage.setItem("jtlaGateQuotes", JSON.stringify(filtered));
  renderSavedQuotes();
}

function newQuote() {
  document.querySelectorAll("input, textarea").forEach(el => {
    if (el.type === "checkbox") el.checked = false;
  });

  $("customerName").value = "";
  $("customerPhone").value = "";
  $("customerEmail").value = "";
  $("siteAddress").value = "";
  $("quoteNumber").value = uid();

  $("gateWidth").value = 1000;
  $("gateHeight").value = 1800;
  $("postCount").value = 2;
  $("postEmbed").value = 600;
  $("concreteBags").value = 2;
  $("holeDigHours").value = 1;
  $("soilRemovalHours").value = 0.5;
  $("powderCost").value = PRICES.finishing.powderCoatTypical;
  $("claddingWaste").value = 10;
  $("travelKm").value = 0;

  setQuoteType("single");
  updateConditionalSections();
  calculateQuote();
}

function sendSMS() {
  calculateQuote();

  const phone = $("customerPhone").value.trim();
  const name = $("customerName").value.trim() || "there";
  const quoteNo = $("quoteNumber").value.trim();
  const price = money(Number($("finalPrice").value || 0));

  const text =
`Hi ${name},

Thanks for the opportunity to quote your gate.

JTLA Quote ${quoteNo}
Total: ${price} including GST.

Please contact me if you have any questions.

Regards,
Jody
JT Landscape Architect`;

  window.location.href = `sms:${phone}?body=${encodeURIComponent(text)}`;
}

function sendEmail() {
  calculateQuote();

  const email = $("customerEmail").value.trim();
  const name = $("customerName").value.trim() || "there";
  const quoteNo = $("quoteNumber").value.trim();
  const price = money(Number($("finalPrice").value || 0));

  const subject = `JTLA Gate Quote ${quoteNo}`;

  const body =
`Hi ${name},

Thank you for the opportunity to provide a quote.

Quote ${quoteNo}

${$("quoteDescription").value}

Total price: ${price} including GST.

Regards,

Jody
JT Landscape Architect`;

  window.location.href =
    `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function printQuote() {
  calculateQuote();
  window.print();
}

document.addEventListener("DOMContentLoaded", () => {
  setupPriceDrivenFields();

  $("quoteNumber").value = uid();

  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => setQuoteType(tab.dataset.type));
  });

  [
    "claddingType",
    "fixingType",
    "powderCoat",
    "paintTimber",
    "cypressFinish",
    "colorbondProfile"
  ].forEach(id => {
    $(id).addEventListener("change", () => {
      updateConditionalSections();
      createDescription();
    });
  });

  document.querySelectorAll("input, select, textarea").forEach(el => {
    el.addEventListener("input", () => {
      if (el.id !== "quoteDescription" && el.id !== "finalPrice") {
        createDescription();
      }
    });
  });

  $("calculateBtn").addEventListener("click", calculateQuote);
  $("finalPrice").addEventListener("input", updateProfit);
  $("saveBtn").addEventListener("click", saveQuote);
  $("smsBtn").addEventListener("click", sendSMS);
  $("emailBtn").addEventListener("click", sendEmail);
  $("printBtn").addEventListener("click", printQuote);
  $("newQuoteBtn").addEventListener("click", newQuote);

  updateConditionalSections();
  setQuoteType("single");
  calculateQuote();
  renderSavedQuotes();
});
