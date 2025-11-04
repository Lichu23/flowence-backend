import { ProductModel } from '../models/ProductModel';
import { SaleModel } from '../models/SaleModel';

interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  updated_at: Date;
}

interface ConversionResult {
  success: boolean;
  converted_count: number;
  failed_count: number;
  errors?: string[];
}

export class CurrencyConversionService {
  private productModel: ProductModel;
  private saleModel: SaleModel;
  private exchangeRates: Map<string, ExchangeRate> = new Map();

  constructor(productModel: ProductModel, saleModel: SaleModel) {
    this.productModel = productModel;
    this.saleModel = saleModel;
  }

  /**
   * Get current exchange rate between two currencies
   * In production, this would integrate with a real API like:
   * - ExchangeRate-API
   * - Open Exchange Rates
   * - Central Bank APIs
   */
  private async getExchangeRate(from: string, to: string): Promise<number> {
    // Check cache first (rates cached for 1 hour)
    const cacheKey = `${from}_${to}`;
    const cached = this.exchangeRates.get(cacheKey);
    
    if (cached && (Date.now() - cached.updated_at.getTime()) < 3600000) {
      return cached.rate;
    }

    try {
      // For demo purposes, using mock rates
      // In production, replace with real API call
      const mockRates: Record<string, Record<string, number>> = {
        'ARS': { 'USD': 0.0011, 'EUR': 0.0010, 'GBP': 0.0009, 'MXN': 0.059 },
        'USD': { 'ARS': 909.09, 'EUR': 0.92, 'GBP': 0.79, 'MXN': 53.57 },
        'EUR': { 'ARS': 1000.00, 'USD': 1.09, 'GBP': 0.86, 'MXN': 58.24 },
        'GBP': { 'ARS': 1111.11, 'USD': 1.27, 'EUR': 1.16, 'MXN': 67.73 },
        'MXN': { 'ARS': 16.90, 'USD': 0.019, 'EUR': 0.017, 'GBP': 0.015 },
        'CAD': { 'ARS': 666.67, 'USD': 0.73, 'EUR': 0.67, 'GBP': 0.58, 'MXN': 40.00 },
        'AUD': { 'ARS': 588.24, 'USD': 0.65, 'EUR': 0.59, 'GBP': 0.51, 'MXN': 35.29 },
        'JPY': { 'ARS': 6.06, 'USD': 0.0067, 'EUR': 0.0061, 'GBP': 0.0053, 'MXN': 0.36 }
      };

      const rate = mockRates[from]?.[to];
      
      if (!rate) {
        throw new Error(`Exchange rate not available for ${from} to ${to}`);
      }

      // Cache the rate
      this.exchangeRates.set(cacheKey, {
        from,
        to,
        rate,
        updated_at: new Date()
      });

      return rate;
    } catch (error) {
      console.error('Failed to fetch exchange rate:', error);
      throw new Error(`Unable to get exchange rate for ${from} to ${to}`);
    }
  }

  /**
   * Convert all sales when store changes currency
   */
  async convertStoreSales(
    storeId: string,
    fromCurrency: string,
    toCurrency: string
  ): Promise<ConversionResult> {
    const result: ConversionResult = {
      success: true,
      converted_count: 0,
      failed_count: 0,
      errors: []
    };

    try {
      // Get exchange rate
      const exchangeRate = await this.getExchangeRate(fromCurrency, toCurrency);
      console.log(`Converting sales from ${fromCurrency} to ${toCurrency} at rate: ${exchangeRate}`);

      // Get all sales in the store (batch processing for large datasets)
      let page = 1;
      const limit = 100;
      let hasMoreSales = true;

      while (hasMoreSales) {
        const salesResult = await this.saleModel.list({
          store_id: storeId,
          page: page,
          limit: limit
        });

        if (!salesResult.sales || salesResult.sales.length === 0) {
          hasMoreSales = false;
          break;
        }

        // Convert each sale
        for (const sale of salesResult.sales) {
          try {
            const convertedSubtotal = Math.round(sale.subtotal * exchangeRate * 100) / 100;
            const convertedTax = Math.round(sale.tax * exchangeRate * 100) / 100;
            const convertedDiscount = Math.round(sale.discount * exchangeRate * 100) / 100;
            const convertedTotal = Math.round(sale.total * exchangeRate * 100) / 100;

            // Update sale with converted amounts
            await this.saleModel.updateSale(sale.id, storeId, {
              subtotal: convertedSubtotal,
              tax: convertedTax,
              discount: convertedDiscount,
              total: convertedTotal
            });

            // Update sale items as well
            await this.updateSaleItems(sale.id, storeId, exchangeRate);

            result.converted_count++;
            console.log(`Converted sale ${sale.receipt_number}: ${sale.total} ${fromCurrency} → ${convertedTotal} ${toCurrency}`);
          } catch (error) {
            result.failed_count++;
            const errorMsg = `Failed to convert sale ${sale.receipt_number}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            result.errors!.push(errorMsg);
            console.error(errorMsg);
          }
        }

        // Check if there are more sales to process
        hasMoreSales = salesResult.sales.length === limit;
        page++;
      }

      result.success = result.failed_count === 0;
      return result;
    } catch (error) {
      result.success = false;
      result.errors!.push(error instanceof Error ? error.message : 'Unknown conversion error');
      return result;
    }
  }

  /**
   * Update sale items with new currency
   */
  private async updateSaleItems(saleId: string, storeId: string, exchangeRate: number): Promise<void> {
    // Get sale items
    const sale = await this.saleModel.findById(saleId, storeId);
    if (!sale) return;

    // Update each sale item
    for (const item of sale.items) {
      const convertedUnitPrice = Math.round(item.unit_price * exchangeRate * 100) / 100;
      const convertedSubtotal = Math.round(item.subtotal * exchangeRate * 100) / 100;
      const convertedDiscount = Math.round(item.discount * exchangeRate * 100) / 100;
      const convertedTotal = Math.round(item.total * exchangeRate * 100) / 100;

      await this.saleModel.updateSaleItem(item.id, {
        unit_price: convertedUnitPrice,
        subtotal: convertedSubtotal,
        discount: convertedDiscount,
        total: convertedTotal
      });
    }
  }

  /**
   * Convert all product prices when store changes currency
   */
  async convertStoreProducts(
    storeId: string,
    fromCurrency: string,
    toCurrency: string
  ): Promise<ConversionResult> {
    const result: ConversionResult = {
      success: true,
      converted_count: 0,
      failed_count: 0,
      errors: []
    };

    try {
      // Get exchange rate
      const exchangeRate = await this.getExchangeRate(fromCurrency, toCurrency);
      console.log(`Converting products from ${fromCurrency} to ${toCurrency} at rate: ${exchangeRate}`);

      // Get all products in the store
      const products = await this.productModel.findByStore({
        store_id: storeId,
        page: 1,
        limit: 1000
      });
      
      if (!products.products || products.products.length === 0) {
        console.log('No products found to convert');
        return result;
      }

      // Convert each product
      for (const product of products.products) {
        try {
          const convertedPrice = Math.round(product.price * exchangeRate * 100) / 100;
          const convertedCost = Math.round(product.cost * exchangeRate * 100) / 100;

          await this.productModel.update(product.id, storeId, {
            price: convertedPrice,
            cost: convertedCost
          });

          result.converted_count++;
          console.log(`Converted product ${product.name}: ${product.price} ${fromCurrency} → ${convertedPrice} ${toCurrency}`);
        } catch (error) {
          result.failed_count++;
          const errorMsg = `Failed to convert product ${product.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors!.push(errorMsg);
          console.error(errorMsg);
        }
      }

      result.success = result.failed_count === 0;
      return result;
    } catch (error) {
      result.success = false;
      result.errors!.push(error instanceof Error ? error.message : 'Unknown conversion error');
      return result;
    }
  }

  /**
   * Convert a single amount
   */
  async convertAmount(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<number> {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    const exchangeRate = await this.getExchangeRate(fromCurrency, toCurrency);
    return Math.round(amount * exchangeRate * 100) / 100;
  }

  /**
   * Get all supported currencies
   */
  getSupportedCurrencies(): string[] {
    return ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'MXN', 'ARS'];
  }

  /**
   * Validate currency code
   */
  isValidCurrency(currency: string): boolean {
    return this.getSupportedCurrencies().includes(currency.toUpperCase());
  }

  /**
   * Clear exchange rate cache
   */
  clearCache(): void {
    this.exchangeRates.clear();
  }

  /**
   * Get cached exchange rates
   */
  getCachedRates(): ExchangeRate[] {
    return Array.from(this.exchangeRates.values());
  }
}
