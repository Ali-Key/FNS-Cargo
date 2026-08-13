import JsBarcode from 'jsbarcode'

/**
 * Renders a Code128 barcode to a PNG data URL. Code128 is used because it
 * handles the alphanumeric + dash waybill format (FSN-CC-######) natively,
 * unlike numeric-only symbologies (EAN/UPC). react-pdf can't render arbitrary
 * SVG/canvas, but it renders data-URI images natively, hence the canvas roundtrip.
 */
export function generateBarcodeDataUrl(value: string): string {
  const canvas = document.createElement('canvas')
  JsBarcode(canvas, value, {
    format: 'CODE128',
    displayValue: false,
    margin: 0,
    height: 60,
  })
  return canvas.toDataURL('image/png')
}
