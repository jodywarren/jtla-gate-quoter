# JTLA Gate Quoter V1.1

Changes in this version:

- Automation removed.
- Three quote types: Single, Drive/Double, Slider.
- Collapsible Customer Details, Gate Measurements, Gate Details, Materials, Fixings, Labour and Saved Quotes sections.
- Customer name remains fixed near the top while scrolling.
- Required fields start red and change to green when completed.
- Six-digit project number validation.
- Original cavity measurements plus left/right/bottom gaps and proposed gate dimensions.
- Frame/post lengths calculated from proposed gate size.
- Steel is calculated against 8 metre stock lengths with waste shown.
- Cladding lineal metres calculated for vertical board products.
- Ekodeck colours: Greystone, Alpine Ash, Leatherwood, Riverbank Red.
- JTLA logo included.
- Finished quote preview includes company details, customer, project number, scope and final price.

## Pricing

Edit `prices.js` to enter your actual material prices.

Any material rate still shown as `0` is deliberately waiting for your real price.

## Updating GitHub

Upload/replace these files in the root of your existing `jtla-gate-quoter` repository:

- index.html
- style.css
- app.js
- prices.js
- manifest.json
- README.md
- jtla-logo.png

Keep your existing `.nojekyll` file in GitHub.
