# JTLA Gate Quoter

Version 1 mobile-first gate quoting app.

## Files

- `index.html` - app layout
- `style.css` - phone-friendly styling
- `app.js` - quote calculations, saving, SMS/email/print
- `prices.js` - editable business rates and material prices
- `manifest.json` - installable web app settings

## IMPORTANT: EDIT PRICES FIRST

Open `prices.js`.

Any price currently set to `0` is a placeholder for you to fill in.

Business rules already entered:

- Labour: $60/hour
- Material / bought-in markup: 20%
- GST: 10%
- Travel: first 20 km included, then $1.50/km
- Concrete: $8/bag
- Bolts: $2 each
- Typical powder coating allowance: $250
- Final price rounds UP to next $10

## GitHub Pages

1. Create a new GitHub repository.
2. Upload all five app files to the root of the repository.
3. Go to Settings > Pages.
4. Under Build and deployment choose Deploy from a branch.
5. Select `main` and `/ (root)`.
6. Save.
7. Open the GitHub Pages URL on your phone.

## Saved Quotes

Quotes save in the browser's local storage on the device you are using.

They are not yet synced between phone and computer.

## PDF

The PDF / Print button opens the browser print system. On Android/iPhone/desktop you can choose Save as PDF or share the result.

## Next logical upgrades

- JTLA logo and matching Libre quote appearance
- Proper PDF quote layout
- Client-visible product colour swatches
- Quote numbering rules
- Import/export saved quotes
- Link to your LibreOffice invoice workflow
