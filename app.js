/* ==========================================================
   JTLA GATE QUOTER
   V1.4
   style.css
========================================================== */


/* ==========================================================
   BASE
========================================================== */

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  padding: 0;

  font-family:
    Arial,
    Helvetica,
    sans-serif;

  background: #f3f4f3;
  color: #222;

  line-height: 1.45;
}

button,
input,
select,
textarea {
  font: inherit;
}


/* ==========================================================
   HEADER
========================================================== */

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  gap: 16px;

  padding: 14px 18px;

  background: white;

  border-bottom: 1px solid #d7d7d7;
}

.header-brand {
  display: flex;
  align-items: center;

  gap: 14px;

  min-width: 0;
}

.header-logo {
  display: block;

  width: 72px;
  height: auto;

  object-fit: contain;
}

.app-header h1 {
  margin: 0;

  font-size: 22px;
  line-height: 1.15;

  color: #315c3b;
}

.app-header p {
  margin: 4px 0 0;

  color: #666;

  font-size: 13px;
}


/* ==========================================================
   STICKY CUSTOMER
========================================================== */

.customer-sticky {
  position: sticky;
  top: 0;
  z-index: 100;

  display: flex;
  justify-content: space-between;
  align-items: center;

  gap: 16px;

  padding: 9px 18px;

  background: #315c3b;
  color: white;

  box-shadow:
    0 2px 6px rgba(0, 0, 0, 0.18);
}

.customer-sticky span {
  font-size: 12px;

  text-transform: uppercase;
  letter-spacing: 0.06em;

  opacity: 0.85;
}

.customer-sticky strong {
  font-size: 17px;

  text-align: right;

  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}


/* ==========================================================
   MAIN
========================================================== */

.app-shell {
  width: min(100%, 980px);

  margin: 0 auto;

  padding: 16px;
}


/* ==========================================================
   CARDS
========================================================== */

.card {
  margin-bottom: 16px;

  padding: 18px;

  background: white;

  border: 1px solid #ddd;

  border-radius: 10px;

  box-shadow:
    0 2px 7px rgba(0, 0, 0, 0.06);
}

.card h2 {
  margin: 0 0 16px;

  font-size: 22px;

  color: #315c3b;
}

.card h3 {
  margin: 26px 0 12px;

  padding-bottom: 6px;

  border-bottom: 1px solid #e1e1e1;

  font-size: 18px;

  color: #333;
}

.card h3:first-child {
  margin-top: 0;
}

.card h4 {
  margin: 0 0 12px;

  font-size: 15px;
}


/* ==========================================================
   COLLAPSIBLE SECTIONS
========================================================== */

.section-card {
  padding: 0;

  overflow: hidden;
}

.section-card > summary {
  position: relative;

  cursor: pointer;

  padding:
    18px 48px
    18px 18px;

  list-style: none;

  font-size: 22px;
  font-weight: 700;

  color: #315c3b;

  user-select: none;
}

.section-card > summary::-webkit-details-marker {
  display: none;
}

.section-card > summary::after {
  content: "＋";

  position: absolute;

  right: 18px;
  top: 50%;

  transform: translateY(-50%);

  font-size: 23px;
  font-weight: 400;

  color: #777;
}

.section-card[open] > summary::after {
  content: "−";
}

.section-card[open] > summary {
  border-bottom: 1px solid #ddd;
}

.section-content {
  padding: 18px;
}


/* ==========================================================
   LABELS
========================================================== */

label {
  display: block;

  margin-bottom: 16px;

  font-size: 16px;
  font-weight: 700;

  color: #333;
}

label input,
label select {
  margin-top: 7px;
}


/* ==========================================================
   INPUTS
========================================================== */

input,
select,
textarea {
  display: block;

  width: 100%;

  min-height: 48px;

  padding: 10px 12px;

  border: 2px solid #b9b9b9;

  border-radius: 7px;

  background: white;

  color: #222;

  font-size: 16px;

  outline: none;

  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    box-shadow 0.15s ease;
}

input:focus,
select:focus,
textarea:focus {
  border-color: #315c3b;

  box-shadow:
    0 0 0 3px rgba(49, 92, 59, 0.12);
}


/* ==========================================================
   REQUIRED FIELDS
========================================================== */

.required-field {
  color: #a51d1d;
}

.required-field input {
  border-color: #c23a3a;

  background: #fff8f8;
}

.required-field input.field-incomplete {
  border-color: #c23a3a;

  background: #fff8f8;
}

.required-field input.field-complete {
  border-color: #347a46;

  background: #f4fbf5;
}

.required-field:has(
  input.field-complete
) {
  color: #276838;
}


/* ==========================================================
   GRIDS
========================================================== */

.grid {
  display: grid;

  gap: 14px;
}

.grid.two {
  grid-template-columns:
    repeat(2, minmax(0, 1fr));
}

.grid.three {
  grid-template-columns:
    repeat(3, minmax(0, 1fr));
}


/* ==========================================================
   GATE TYPE TABS
========================================================== */

.tabs {
  display: grid;

  grid-template-columns:
    repeat(3, 1fr);

  gap: 8px;
}

.tab {
  min-height: 52px;

  padding: 10px 8px;

  border: 2px solid #b52b2b;

  border-radius: 8px;

  background: white;

  color: #a51d1d;

  font-size: 16px;
  font-weight: 700;

  cursor: pointer;
}

.tab:hover {
  background: #fff6f6;
}

.tab.active {
  border-color: #315c3b;

  background: #315c3b;

  color: white;
}


/* ==========================================================
   INCLUDE SWITCHES
========================================================== */

.include-grid {
  display: grid;

  grid-template-columns:
    repeat(3, 1fr);

  gap: 10px;

  margin-bottom: 10px;
}

.toggle-card {
  position: relative;

  display: flex;
  justify-content: center;
  align-items: center;

  min-height: 56px;

  margin: 0;

  padding: 10px;

  border: 2px solid #cfcfcf;

  border-radius: 8px;

  background: #fafafa;

  cursor: pointer;

  text-align: center;
}

.toggle-card input {
  position: absolute;

  opacity: 0;

  pointer-events: none;
}

.toggle-card span {
  font-size: 16px;
  font-weight: 700;

  color: #666;
}

.toggle-card:has(input:checked) {
  border-color: #315c3b;

  background: #eef5ef;
}

.toggle-card:has(input:checked) span {
  color: #315c3b;
}


/* ==========================================================
   BUTTONS
========================================================== */

button {
  min-height: 44px;

  padding: 10px 16px;

  border: 1px solid #aaa;

  border-radius: 7px;

  background: #f4f4f4;

  color: #222;

  font-weight: 700;

  cursor: pointer;
}

button:hover {
  filter: brightness(0.97);
}

button:active {
  transform: translateY(1px);
}

button.primary {
  border-color: #315c3b;

  background: #315c3b;

  color: white;
}

button.secondary {
  border-color: #315c3b;

  background: white;

  color: #315c3b;
}

button.danger {
  border-color: #b52b2b;

  background: white;

  color: #a51d1d;
}

button.small {
  min-height: 36px;

  padding: 7px 11px;

  font-size: 13px;
}

button.big {
  width: 100%;

  min-height: 58px;

  font-size: 19px;
}

.full-width {
  width: 100%;
}


/* ==========================================================
   POST CONTAINER
========================================================== */

.posts-container {
  display: grid;

  gap: 14px;

  margin-bottom: 14px;
}


/* ==========================================================
   POST CARDS
========================================================== */

.post-card {
  padding: 16px;

  border: 2px solid #d4d4d4;

  border-radius: 10px;

  background: #fafafa;
}

.post-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  gap: 12px;

  margin-bottom: 14px;

  padding-bottom: 10px;

  border-bottom: 1px solid #ddd;
}

.post-card-header strong {
  font-size: 18px;

  color: #315c3b;
}

.post-card
.remove-post-btn {
  min-width: 80px;
}


/* ==========================================================
   POST FIXING OPTIONS
========================================================== */

.post-concrete-options,
.post-brick-options {
  margin-top: 6px;

  padding: 14px;

  border-radius: 8px;

  background: #f1f5f2;

  border-left: 4px solid #315c3b;
}

.post-brick-options {
  background: #f7f4ef;

  border-left-color: #946b22;
}


/* ==========================================================
   DYNABOLT HOLE SECTION
========================================================== */

.hole-section {
  margin-top: 12px;
}

.hole-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;

  gap: 12px;

  margin-bottom: 10px;
}

.hole-heading strong {
  font-size: 15px;

  color: #444;
}

.hole-list {
  display: grid;

  gap: 8px;
}

.hole-row {
  display: grid;

  grid-template-columns:
    minmax(0, 1fr)
    auto;

  align-items: end;

  gap: 10px;

  padding: 10px;

  border: 1px solid #ddd;

  border-radius: 7px;

  background: white;
}

.hole-row label {
  margin: 0;
}

.hole-row button {
  margin-bottom: 0;
}


/* ==========================================================
   SUB CARDS
========================================================== */

.sub-card {
  margin: 10px 0 18px;

  padding: 15px;

  border: 1px solid #d6d6d6;

  border-radius: 8px;

  background: #fafafa;
}


/* ==========================================================
   CHECKBOX ROW
========================================================== */

.check-row {
  display: flex;
  align-items: center;

  gap: 12px;

  padding: 10px 0;
}

.check-row input {
  width: 22px;
  height: 22px;

  min-height: auto;

  margin: 0;

  flex: 0 0 auto;
}


/* ==========================================================
   NOTES
========================================================== */

.calculation-note {
  margin: 8px 0 20px;

  padding: 12px 14px;

  border-left: 4px solid #315c3b;

  background: #f3f7f4;

  font-size: 14px;
}

.notice {
  margin: 8px 0 16px;

  padding: 12px 14px;

  border-left: 4px solid #c58c19;

  background: #fff9eb;

  font-size: 14px;
}

.muted {
  color: #777;

  font-size: 13px;
}


/* ==========================================================
   INFO LINE
========================================================== */

.info-line {
  display: flex;
  justify-content: space-between;
  align-items: center;

  gap: 12px;

  margin: 4px 0 18px;

  padding: 12px 14px;

  border-radius: 7px;

  background: #f4f4f4;
}

.info-line span {
  color: #666;
}

.info-line strong {
  font-size: 17px;

  color: #315c3b;
}


/* ==========================================================
   MEASUREMENT BREAKDOWN
========================================================== */

.measurement-breakdown {
  display: grid;

  gap: 6px;

  margin-top: 12px;
}

.measurement-breakdown > div {
  display: flex;
  justify-content: space-between;

  gap: 12px;

  padding: 8px 10px;

  border-bottom: 1px solid #eee;
}

.measurement-breakdown span {
  color: #666;
}

.measurement-breakdown strong {
  text-align: right;
}

.measurement-breakdown
.measurement-total {
  margin-top: 4px;

  border: 0;

  border-radius: 6px;

  background: #eef5ef;
}

.measurement-breakdown
.measurement-total span,
.measurement-breakdown
.measurement-total strong {
  color: #315c3b;

  font-weight: 700;
}


/* ==========================================================
   SUMMARY GRID
========================================================== */

.summary-grid {
  display: grid;

  grid-template-columns:
    repeat(2, minmax(0, 1fr));

  gap: 10px;
}

.summary-grid > div {
  display: flex;
  flex-direction: column;

  gap: 4px;

  min-height: 74px;

  padding: 12px;

  border: 1px solid #ddd;

  border-radius: 7px;

  background: #fafafa;
}

.summary-grid span {
  color: #666;

  font-size: 13px;
}

.summary-grid strong {
  font-size: 17px;

  color: #222;
}


/* ==========================================================
   POST CUT LIST
========================================================== */

.cut-list {
  display: grid;

  gap: 8px;

  margin-top: 14px;
}

.cut-list > div {
  display: grid;

  gap: 3px;

  padding: 11px;

  border: 1px solid #ddd;

  border-radius: 7px;

  background: #fafafa;
}

.cut-list strong {
  color: #315c3b;
}

.cut-list span {
  font-size: 13px;

  color: #555;
}


/* ==========================================================
   INTERNAL COSTING
========================================================== */

.result-card {
  border-top: 5px solid #315c3b;
}

.result-card hr {
  margin: 20px 0;

  border: 0;

  border-top: 1px solid #ddd;
}

#finalPrice {
  min-height: 58px;

  border-color: #315c3b;

  background: #f5faf6;

  font-size: 23px;
  font-weight: 700;
}


/* ==========================================================
   PROFIT
========================================================== */

.profit-box {
  display: flex;
  justify-content: space-between;
  align-items: center;

  gap: 15px;

  margin: 18px 0;

  padding: 15px;

  border-radius: 8px;

  background: #eef5ef;
}

.profit-box span {
  font-weight: 700;

  color: #315c3b;
}

.profit-box strong {
  font-size: 21px;

  color: #315c3b;
}


/* ==========================================================
   BREAKDOWN
========================================================== */

.breakdown {
  margin-top: 12px;
}

.breakdown p {
  display: flex;
  justify-content: space-between;
  align-items: center;

  gap: 20px;

  margin: 0;

  padding: 9px 2px;

  border-bottom: 1px solid #e4e4e4;
}

.breakdown p:last-child {
  border-bottom: 0;
}

.breakdown span {
  color: #555;
}

.breakdown strong {
  text-align: right;
}


/* ==========================================================
   FINISHED QUOTE
========================================================== */

.quote-preview {
  width: 100%;

  overflow: visible;

  padding: 22px;

  border: 1px solid #cfcfcf;

  border-radius: 8px;

  background: white;

  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.05);
}

.quote-preview-header {
  display: flex;
  align-items: center;

  gap: 18px;

  padding-bottom: 16px;

  border-bottom: 3px solid #315c3b;
}

.quote-logo {
  display: block;

  width: 90px;
  height: auto;

  object-fit: contain;
}

.quote-preview-header > div {
  display: flex;
  flex-direction: column;

  gap: 2px;
}

.quote-preview-header strong {
  font-size: 22px;

  color: #315c3b;
}

.quote-preview-header span {
  color: #555;

  font-size: 14px;
}


/* ==========================================================
   QUOTE META
========================================================== */

.quote-meta {
  display: grid;

  grid-template-columns:
    0.7fr
    1fr
    1.5fr;

  gap: 10px;

  margin: 18px 0;
}

.quote-meta > div {
  display: flex;
  flex-direction: column;

  gap: 3px;

  padding: 10px;

  border-radius: 5px;

  background: #f5f5f5;
}

.quote-meta span {
  color: #777;

  font-size: 11px;

  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.quote-meta strong {
  font-size: 14px;
}


/* ==========================================================
   QUOTE DESCRIPTION
========================================================== */

.quote-description {
  padding: 4px 0 16px;
}

.quote-description p {
  margin: 9px 0;

  font-size: 15px;
}

.quote-description strong {
  color: #333;
}


/* ==========================================================
   QUOTE PRICE
========================================================== */

.quote-price-summary {
  margin-top: 18px;

  border-top: 1px solid #ccc;
}

.quote-price-summary > div {
  display: flex;
  justify-content: space-between;

  gap: 20px;

  padding: 9px 2px;

  border-bottom: 1px solid #eee;
}

.quote-price-summary span {
  color: #555;
}

.quote-price-summary strong {
  text-align: right;
}

.quote-price-summary
.quote-grand-total {
  margin-top: 5px;

  padding: 14px 12px;

  border: 0;

  border-radius: 6px;

  background: #315c3b;

  color: white;
}

.quote-grand-total span {
  color: white;

  font-weight: 700;
}

.quote-grand-total strong {
  color: white;

  font-size: 22px;
}


/* ==========================================================
   ACTIONS
========================================================== */

.actions {
  display: grid;

  grid-template-columns:
    repeat(4, 1fr);

  gap: 10px;
}

.actions button {
  width: 100%;
}


/* ==========================================================
   SAVED QUOTES
========================================================== */

.saved-row {
  display: flex;
  justify-content: space-between;
  align-items: center;

  gap: 16px;

  padding: 12px 0;

  border-bottom: 1px solid #ddd;
}

.saved-row:last-child {
  border-bottom: 0;
}

.saved-row > div:first-child {
  display: flex;
  flex-direction: column;

  gap: 2px;
}

.saved-row span {
  font-size: 14px;
}

.saved-row small {
  color: #777;
}

.saved-actions {
  display: flex;
  align-items: center;

  gap: 8px;
}


/* ==========================================================
   HIDDEN
========================================================== */

.hidden {
  display: none !important;
}


/* ==========================================================
   TABLET / PHONE
========================================================== */

@media (max-width: 700px) {

  .app-header {
    padding: 11px 12px;
  }

  .header-logo {
    width: 55px;
  }

  .app-header h1 {
    font-size: 18px;
  }

  .app-header p {
    display: none;
  }

  .app-shell {
    padding: 10px;
  }

  .card {
    margin-bottom: 11px;

    padding: 14px;

    border-radius: 8px;
  }

  .section-card {
    padding: 0;
  }

  .section-card > summary {
    padding:
      15px 42px
      15px 14px;

    font-size: 19px;
  }

  .section-content {
    padding: 14px;
  }

  .grid.two,
  .grid.three {
    grid-template-columns: 1fr;
  }

  .include-grid {
    grid-template-columns:
      repeat(3, 1fr);

    gap: 6px;
  }

  .toggle-card {
    min-height: 52px;

    padding: 8px 5px;
  }

  .toggle-card span {
    font-size: 14px;
  }

  label {
    font-size: 16px;

    margin-bottom: 15px;
  }

  input,
  select {
    min-height: 50px;

    font-size: 16px;
  }

  .tabs {
    gap: 5px;
  }

  .tab {
    padding: 8px 4px;

    font-size: 15px;
  }

  .summary-grid {
    grid-template-columns:
      repeat(2, minmax(0, 1fr));

    gap: 7px;
  }

  .summary-grid > div {
    min-height: 68px;

    padding: 10px;
  }

  .summary-grid span {
    font-size: 12px;
  }

  .summary-grid strong {
    font-size: 16px;
  }

  .post-card {
    padding: 13px;
  }

  .post-card-header strong {
    font-size: 17px;
  }

  .hole-row {
    grid-template-columns: 1fr;
  }

  .hole-row button {
    width: 100%;
  }

  .actions {
    grid-template-columns:
      repeat(2, 1fr);
  }

  .quote-preview {
    padding: 15px;
  }

  .quote-preview-header {
    gap: 12px;
  }

  .quote-logo {
    width: 65px;
  }

  .quote-preview-header strong {
    font-size: 19px;
  }

  .quote-meta {
    grid-template-columns: 1fr;

    gap: 6px;
  }

  .quote-meta > div {
    padding: 8px 10px;
  }

  .saved-row {
    align-items: flex-start;

    flex-direction: column;
  }

  .saved-actions {
    width: 100%;

    justify-content: space-between;
  }

}


/* ==========================================================
   VERY SMALL PHONE
========================================================== */

@media (max-width: 390px) {

  .customer-sticky {
    padding: 8px 11px;
  }

  .customer-sticky strong {
    font-size: 15px;
  }

  .include-grid {
    grid-template-columns: 1fr;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .quote-preview-header {
    align-items: flex-start;
  }

  .quote-logo {
    width: 55px;
  }

}


/* ==========================================================
   PRINT / PDF
========================================================== */

@media print {

  body {
    background: white;
  }

  body * {
    visibility: hidden;
  }

  .quote-preview,
  .quote-preview * {
    visibility: visible;
  }

  .quote-preview {
    position: absolute;

    left: 0;
    top: 0;

    width: 100%;

    padding: 20px;

    border: 0;

    box-shadow: none;
  }

}
