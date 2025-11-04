/**
 * ESC/POS Ticket Printer Service
 * Generates ESC/POS formatted tickets for thermal printers
 */

export interface TicketLineItem {
  name: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  total: number;
}

export interface CardPaymentInfo {
  lastFourDigits: string;
  authorizationCode?: string;
  paymentMethod: string;
}

export interface CashPaymentInfo {
  method: 'cash';
  amountTendered?: number;
  change?: number;
}

export interface TicketData {
  storeId: string;
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  receiptNumber: string;
  ticketId: string;
  dateTime: string;
  items: TicketLineItem[];
  subtotal: number;
  tax: number;
  discount?: number;
  total: number;
  currency: string;
  paymentInfo: CardPaymentInfo | CashPaymentInfo;
  cashierName?: string;
  notes?: string;
  refundInfo?: {
    isRefund: boolean;
    originalReceiptNumber?: string;
    refundAmount?: number;
  };
}

export class TicketPrinterService {
  private paperWidth = 32; // Characters for 80mm thermal printer
  private lineChar = '─';

  /**
   * Generate ESC/POS formatted ticket
   */
  generateTicket(data: TicketData): string {
    let ticket = '';

    // Initialize printer
    ticket += this.escReset();
    ticket += this.escSetCharacterSize(1, 1); // Normal size

    // Header
    ticket += this.centerText(data.storeName);
    if (data.storeAddress) {
      ticket += this.centerText(data.storeAddress);
    }
    if (data.storePhone) {
      ticket += this.centerText(data.storePhone);
    }
    ticket += this.newLine();

    // Refund indicator
    if (data.refundInfo?.isRefund) {
      ticket += this.centerText('*** REFUND ***');
      ticket += this.newLine();
    }

    // Receipt info
    ticket += this.leftAlignedText(`Receipt #: ${data.receiptNumber}`);
    ticket += this.leftAlignedText(`Ticket ID: ${data.ticketId}`);
    ticket += this.leftAlignedText(`Date: ${data.dateTime}`);
    if (data.cashierName) {
      ticket += this.leftAlignedText(`Cashier: ${data.cashierName}`);
    }
    ticket += this.newLine();

    // Separator
    ticket += this.separator();

    // Items header
    ticket += this.formatItemsHeader();
    ticket += this.separator();

    // Items
    for (const item of data.items) {
      ticket += this.formatItem(item);
    }

    // Separator
    ticket += this.separator();

    // Totals
    ticket += this.formatTotals(data);

    // Payment info
    ticket += this.newLine();
    ticket += this.formatPaymentInfo(data.paymentInfo, data.currency);

    // Footer notes
    if (data.notes) {
      ticket += this.newLine();
      ticket += this.centerText(data.notes);
    }

    // Fiscal message
    ticket += this.newLine();
    ticket += this.centerText('Thank you for your purchase!');
    ticket += this.centerText('Please keep this receipt for returns');

    // Cut paper
    ticket += this.newLine();
    ticket += this.newLine();
    ticket += this.escCutPaper();

    return ticket;
  }

  /**
   * ESC/POS Commands
   */
  private escReset(): string {
    return '\x1B\x40'; // ESC @
  }

  private escSetCharacterSize(width: number, height: number): string {
    const size = ((width - 1) << 4) | (height - 1);
    return `\x1B\x21${String.fromCharCode(size)}`;
  }

  private escCutPaper(): string {
    return '\x1D\x56\x00'; // GS V 0 (partial cut)
  }

  private escBold(enable: boolean): string {
    return enable ? '\x1B\x45\x01' : '\x1B\x45\x00'; // ESC E
  }

  private escAlignCenter(): string {
    return '\x1B\x61\x01'; // ESC a 1
  }

  private escAlignLeft(): string {
    return '\x1B\x61\x00'; // ESC a 0
  }

  /**
   * Text formatting helpers
   */
  private centerText(text: string): string {
    return `${this.escAlignCenter()}${text}${this.newLine()}${this.escAlignLeft()}`;
  }

  private leftAlignedText(text: string): string {
    return `${this.escAlignLeft()}${text}${this.newLine()}`;
  }

  private separator(): string {
    return `${this.lineChar.repeat(this.paperWidth)}\n`;
  }

  private newLine(): string {
    return '\n';
  }

  /**
   * Format items header
   */
  private formatItemsHeader(): string {
    const desc = 'Description';
    const qty = 'Qty';
    const price = 'Price';
    const total = 'Total';

    const descWidth = 14;
    const qtyWidth = 4;
    const priceWidth = 7;
    const totalWidth = 7;

    let header = '';
    header += desc.padEnd(descWidth);
    header += qty.padEnd(qtyWidth);
    header += price.padEnd(priceWidth);
    header += total.padEnd(totalWidth);
    header += '\n';

    return header;
  }

  /**
   * Format single item
   */
  private formatItem(item: TicketLineItem): string {
    const descWidth = 14;
    const qtyWidth = 4;
    const priceWidth = 7;
    const totalWidth = 7;

    let line = '';
    const name = item.name.substring(0, descWidth).padEnd(descWidth);
    const qty = item.quantity.toString().padEnd(qtyWidth);
    const price = this.formatPrice(item.unitPrice).padEnd(priceWidth);
    const total = this.formatPrice(item.total).padEnd(totalWidth);

    line += name + qty + price + total + '\n';

    // Add discount if present
    if (item.discount && item.discount > 0) {
      const discountText = `Discount: -${this.formatPrice(item.discount)}`;
      line += discountText.padEnd(this.paperWidth) + '\n';
    }

    return line;
  }

  /**
   * Format totals section
   */
  private formatTotals(data: TicketData): string {
    let totals = '';

    // Subtotal
    totals += this.formatTotalLine('Subtotal:', this.formatPrice(data.subtotal));

    // Discount
    if (data.discount && data.discount > 0) {
      totals += this.formatTotalLine('Discount:', `-${this.formatPrice(data.discount)}`);
    }

    // Tax
    totals += this.formatTotalLine('Tax:', this.formatPrice(data.tax));

    // Refund amount if applicable
    if (data.refundInfo?.isRefund && data.refundInfo?.refundAmount) {
      totals += this.formatTotalLine('Refund Amount:', `-${this.formatPrice(data.refundInfo.refundAmount)}`);
    }

    // Total (bold)
    totals += this.escBold(true);
    totals += this.formatTotalLine('TOTAL:', this.formatPrice(data.total));
    totals += this.escBold(false);

    return totals;
  }

  /**
   * Format total line with right-aligned amount
   */
  private formatTotalLine(label: string, amount: string): string {
    const padding = this.paperWidth - label.length - amount.length;
    return `${label}${' '.repeat(Math.max(1, padding))}${amount}\n`;
  }

  /**
   * Format payment info section
   */
  private formatPaymentInfo(paymentInfo: CardPaymentInfo | CashPaymentInfo, currency: string): string {
    let info = '';

    if ('method' in paymentInfo && paymentInfo.method === 'cash') {
      const cashPayment = paymentInfo as CashPaymentInfo;
      info += this.leftAlignedText('Payment Method: CASH');
      if (cashPayment.amountTendered) {
        info += this.leftAlignedText(`Amount Tendered: ${this.formatCurrency(cashPayment.amountTendered, currency)}`);
      }
      if (cashPayment.change) {
        info += this.leftAlignedText(`Change: ${this.formatCurrency(cashPayment.change, currency)}`);
      }
    } else {
      // Card payment
      const cardPayment = paymentInfo as CardPaymentInfo;
      info += this.leftAlignedText('Payment Method: CARD');
      info += this.leftAlignedText(`Card: ****${cardPayment.lastFourDigits}`);
      if (cardPayment.authorizationCode) {
        info += this.leftAlignedText(`Auth Code: ${cardPayment.authorizationCode}`);
      }
    }

    return info;
  }

  /**
   * Format price with 2 decimal places
   */
  private formatPrice(price: number): string {
    return price.toFixed(2);
  }

  /**
   * Format currency value
   */
  private formatCurrency(amount: number, currency: string): string {
    const currencySymbols: Record<string, string> = {
      'USD': '$',
      'ARS': '$',
      'EUR': '€',
      'GBP': '£',
      'MXN': '$',
      'BRL': 'R$'
    };

    const symbol = currencySymbols[currency] || currency;
    return `${symbol}${amount.toFixed(2)}`;
  }

  /**
   * Generate barcode for ticket ID (Code128)
   * Note: This is a simplified representation. Real implementation would use a barcode library.
   */
  generateBarcode(ticketId: string): string {
    // ESC/POS barcode command: GS k m d1...dn
    // m = 73 (Code128)
    // This is a placeholder - actual barcode generation requires proper encoding
    return `\x1D\x6B\x49${ticketId}\x00`;
  }
}
