import PDFDocument from 'pdfkit';
import { Sale, SaleItem } from '../types/sale';
import bwipjs from 'bwip-js';

export class ReceiptService {
  async generateReceiptPdf(
    sale: Sale,
    items: SaleItem[],
    store: { name: string; address?: string; phone?: string; currency?: string; timezone?: string; date_format?: string; time_format?: string }
  ): Promise<Buffer> {
    // Generate barcode before creating the PDF document
    let barcodeBuffer: Buffer | null = null;
    try {
      barcodeBuffer = await bwipjs.toBuffer({
        bcid: 'code128',       // Barcode type
        text: sale.id,         // Sale ID as barcode data
        scale: 3,              // 3x scaling factor
        height: 10,            // Bar height, in millimeters
        includetext: true,     // Show human-readable text
        textxalign: 'center'   // Always good to set this
      });
    } catch (barcodeError) {
      console.error('Error generating barcode:', barcodeError);
      // Continue without barcode if generation fails
    }

    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `Recibo ${sale.receipt_number}`,
        Author: store.name || 'Flowence',
        Subject: 'Recibo de Venta'
      }
    });
    
    const chunks: Buffer[] = [];
    return await new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Page dimensions
      const pageWidth = doc.page.width;
      const margin = 50;
      const contentWidth = pageWidth - (margin * 2);

      // Header Section (only main title: Store Name)
      doc.fontSize(24).font('Helvetica-Bold');
      doc.text(store.name || 'Flowence', { align: 'center' });
      
      // Add separator line after header
      doc.moveDown(1);
      doc.moveTo(margin, doc.y).lineTo(pageWidth - margin, doc.y).stroke();
      doc.moveDown(1);

      // Receipt Information Section
      doc.fontSize(14).font('Helvetica-Bold').text('INFORMACIÓN DEL RECIBO', { align: 'center' });
      doc.moveDown(0.5);
      
      doc.fontSize(11).font('Helvetica');
      const created = new Date(sale.created_at);
      const dateSettings: { timezone?: string; date_format?: string; time_format?: string } = {
        ...(store.timezone ? { timezone: store.timezone } : {}),
        ...(store.date_format ? { date_format: store.date_format } : {}),
        ...(store.time_format ? { time_format: store.time_format } : {})
      };
      const { fecha, horario } = formatWithStoreSettings(created, dateSettings);
      const receiptInfo = [
        `Recibo: ${sale.receipt_number}`,
        `Fecha: ${fecha}`,
        `Horario: ${horario}`,
        `Método de Pago: ${sale.payment_method.charAt(0).toUpperCase() + sale.payment_method.slice(1)}`,
        `Estado: ${sale.payment_status.charAt(0).toUpperCase() + sale.payment_status.slice(1)}`,
        ...(store.address ? [`Dirección: ${store.address}`] : []),
        ...(store.phone ? [`Teléfono: ${store.phone}`] : [])
      ];
      
      receiptInfo.forEach(info => {
        doc.text(info);
      });
      
      doc.moveDown(0.5);

      // Barcode Section - Add barcode for sale ID
      if (barcodeBuffer) {
        // Center the barcode
        const barcodeWidth = 200;
        const barcodeX = (pageWidth - barcodeWidth) / 2;
        doc.image(barcodeBuffer, barcodeX, doc.y, { width: barcodeWidth });
        doc.moveDown(1);
      }

      doc.moveDown(1);

      // Items Section
      doc.fontSize(14).font('Helvetica-Bold').text('DETALLE DE PRODUCTOS', { align: 'center' });
      doc.moveDown(0.5);
      
      // Table setup
      const tableTop = doc.y;
      const itemHeight = 20;
      const colWidths = {
        product: contentWidth * 0.45,    // 45% for product name
        quantity: contentWidth * 0.15,   // 15% for quantity
        unitPrice: contentWidth * 0.15,  // 15% for unit price
        discount: contentWidth * 0.10,   // 10% for discount
        total: contentWidth * 0.15       // 15% for total
      };
      
      const colPositions = {
        product: margin,
        quantity: margin + colWidths.product,
        unitPrice: margin + colWidths.product + colWidths.quantity,
        discount: margin + colWidths.product + colWidths.quantity + colWidths.unitPrice,
        total: margin + colWidths.product + colWidths.quantity + colWidths.unitPrice + colWidths.discount
      };

      // Table header
      doc.fontSize(10).font('Helvetica-Bold');
      doc.rect(colPositions.product, tableTop, colWidths.product, itemHeight).stroke();
      doc.text('PRODUCTO', colPositions.product + 5, tableTop + 7, { width: colWidths.product - 10, align: 'left' });
      
      doc.rect(colPositions.quantity, tableTop, colWidths.quantity, itemHeight).stroke();
      doc.text('CANT.', colPositions.quantity + 5, tableTop + 7, { width: colWidths.quantity - 10, align: 'center' });
      
      doc.rect(colPositions.unitPrice, tableTop, colWidths.unitPrice, itemHeight).stroke();
      doc.text('P.UNIT', colPositions.unitPrice + 5, tableTop + 7, { width: colWidths.unitPrice - 10, align: 'right' });
      
      doc.rect(colPositions.discount, tableTop, colWidths.discount, itemHeight).stroke();
      doc.text('DESC.', colPositions.discount + 5, tableTop + 7, { width: colWidths.discount - 10, align: 'right' });
      
      doc.rect(colPositions.total, tableTop, colWidths.total, itemHeight).stroke();
      doc.text('TOTAL', colPositions.total + 5, tableTop + 7, { width: colWidths.total - 10, align: 'right' });

      // Table rows
      doc.fontSize(9).font('Helvetica');
      const currentY = tableTop + itemHeight;
      
      items.forEach((item, index) => {
        const rowY = currentY + (index * itemHeight);
        
        // Product name (with word wrapping)
        doc.rect(colPositions.product, rowY, colWidths.product, itemHeight).stroke();
        doc.text(item.product_name, colPositions.product + 5, rowY + 7, { 
          width: colWidths.product - 10, 
          align: 'left',
          lineGap: 2
        });
        
        // Quantity
        doc.rect(colPositions.quantity, rowY, colWidths.quantity, itemHeight).stroke();
        doc.text(String(item.quantity), colPositions.quantity + 5, rowY + 7, { 
          width: colWidths.quantity - 10, 
          align: 'center' 
        });
        
        // Unit Price
        doc.rect(colPositions.unitPrice, rowY, colWidths.unitPrice, itemHeight).stroke();
        doc.text(formatMoney(item.unit_price, store.currency), colPositions.unitPrice + 5, rowY + 7, { 
          width: colWidths.unitPrice - 10, 
          align: 'right' 
        });
        
        // Discount
        doc.rect(colPositions.discount, rowY, colWidths.discount, itemHeight).stroke();
        doc.text(formatMoney(item.discount, store.currency), colPositions.discount + 5, rowY + 7, { 
          width: colWidths.discount - 10, 
          align: 'right' 
        });
        
        // Total
        doc.rect(colPositions.total, rowY, colWidths.total, itemHeight).stroke();
        doc.text(formatMoney(item.total, store.currency), colPositions.total + 5, rowY + 7, { 
          width: colWidths.total - 10, 
          align: 'right' 
        });
      });

      doc.moveDown(1.5);

      // Totals Section
      doc.fontSize(14).font('Helvetica-Bold').text('RESUMEN DE TOTALES', { align: 'center' });
      doc.moveDown(0.5);
      
      // Create a right-aligned totals box
      const totalsBoxWidth = 200;
      const totalsBoxX = pageWidth - margin - totalsBoxWidth;
      const totalsBoxY = doc.y;
      
      doc.fontSize(11).font('Helvetica');
      let totalsY = totalsBoxY;
      
      // Subtotal
      doc.text('Subtotal:', totalsBoxX, totalsY, { width: 120, align: 'left' });
      doc.text(formatMoney(sale.subtotal, store.currency), totalsBoxX + 120, totalsY, { width: 80, align: 'right' });
      totalsY += 15;
      
      // Tax
      doc.text('Impuestos:', totalsBoxX, totalsY, { width: 120, align: 'left' });
      doc.text(formatMoney(sale.tax, store.currency), totalsBoxX + 120, totalsY, { width: 80, align: 'right' });
      totalsY += 15;
      
      // Discount (if any)
      if (sale.discount && sale.discount > 0) {
        doc.text('Descuento:', totalsBoxX, totalsY, { width: 120, align: 'left' });
        doc.text(`-${formatMoney(sale.discount, store.currency)}`, totalsBoxX + 120, totalsY, { width: 80, align: 'right' });
        totalsY += 15;
      }
      
      // Total line
      doc.moveTo(totalsBoxX, totalsY).lineTo(totalsBoxX + totalsBoxWidth, totalsY).stroke();
      totalsY += 5;
      
      // Grand Total
      doc.fontSize(14).font('Helvetica-Bold');
      doc.text('TOTAL:', totalsBoxX, totalsY, { width: 120, align: 'left' });
      doc.text(formatMoney(sale.total, store.currency), totalsBoxX + 120, totalsY, { width: 80, align: 'right' });

      doc.moveDown(2);

      // Footer removed per requirements

      doc.end();
    });
  }
}

function formatMoney(amount: number, currency?: string): string {
  try {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: currency || 'USD' }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function formatWithStoreSettings(
  date: Date,
  settings: { timezone?: string; date_format?: string; time_format?: string }
): { fecha: string; horario: string } {
  const tz = settings.timezone || 'UTC';
  const time12 = (settings.time_format || '12h') === '12h';
  const parts = new Intl.DateTimeFormat('es-ES', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: time12,
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)?.value || '';
  const yyyy = get('year');
  const MM = get('month');
  const DD = get('day');
  const hh = get('hour');
  const mm = get('minute');
  const ss = get('second');
  const ampm = get('dayPeriod');

  const fecha = (settings.date_format || 'MM/DD/YYYY')
    .replace('YYYY', yyyy)
    .replace('MM', MM)
    .replace('DD', DD);

  const horario = time12 ? `${hh}:${mm}:${ss} ${ampm}`.trim() : `${hh}:${mm}:${ss}`;
  return { fecha, horario };
}


