/**
 * Stock Service
 * Handles dual-stock operations with role-based permissions
 */

import { ProductModel } from '../models/ProductModel';
import { 
  Product, 
  RestockOperation, 
  StockAdjustment, 
  StockMovement, 
  StockOperationResult 
} from '../types/product';
import { BaseModel } from '../models/BaseModel';

export class StockService extends BaseModel {
  private productModel: ProductModel;
  private movementsTable = 'stock_movements';

  constructor() {
    super();
    this.productModel = new ProductModel();
  }

  /**
   * Restock operation: Move stock from warehouse to sales floor
   * Available to all roles (employee, owner)
   */
  async restockProduct(
    productId: string,
    storeId: string,
    operation: RestockOperation
  ): Promise<StockOperationResult> {
    try {
      // Get current product
      const product = await this.productModel.findById(productId, storeId);
      if (!product) {
        throw new Error('Product not found');
      }

      // Validate quantity is positive
      if (operation.quantity <= 0) {
        return {
          success: false,
          updated_product: product,
          message: 'La cantidad debe ser mayor a cero'
        };
      }

      // Validate warehouse has enough stock
      if (product.stock_deposito < operation.quantity) {
        return {
          success: false,
          updated_product: product,
          message: `Stock insuficiente en depósito. Disponible: ${product.stock_deposito}, Necesario: ${operation.quantity}`
        };
      }

      // Calculate new stock values
      const newStockDeposito = product.stock_deposito - operation.quantity;
      const newStockVenta = product.stock_venta + operation.quantity;
      const newTotalStock = newStockDeposito + newStockVenta;

      // Update product stock
      const updatedProduct = await this.productModel.update(productId, storeId, {
        stock_deposito: newStockDeposito,
        stock_venta: newStockVenta,
        stock: newTotalStock // Update legacy field
      });

      // Record stock movement
      const movementData: Omit<StockMovement, 'id' | 'created_at'> = {
        product_id: productId,
        store_id: storeId,
        movement_type: 'restock',
        stock_type: 'venta',
        quantity_change: operation.quantity,
        quantity_before: product.stock_venta,
        quantity_after: newStockVenta,
        reason: `Restocked from warehouse`,
        performed_by: operation.performed_by,
        ...(operation.notes && { notes: operation.notes })
      };
      const movementId = await this.recordStockMovement(movementData);

      // Also record the warehouse decrease
      const warehouseMovementData: Omit<StockMovement, 'id' | 'created_at'> = {
        product_id: productId,
        store_id: storeId,
        movement_type: 'restock',
        stock_type: 'deposito',
        quantity_change: -operation.quantity,
        quantity_before: product.stock_deposito,
        quantity_after: newStockDeposito,
        reason: `Stock moved to sales floor`,
        performed_by: operation.performed_by,
        ...(operation.notes && { notes: operation.notes })
      };
      await this.recordStockMovement(warehouseMovementData);

      return {
        success: true,
        movement_id: movementId,
        updated_product: updatedProduct,
        message: `Successfully restocked ${operation.quantity} units`
      };

    } catch (error) {
      console.error('StockService.restockProduct error:', error);
      throw error;
    }
  }

  /**
   * Adjust warehouse stock: Increase, decrease, or set warehouse stock
   * Only available to owner role
   */
  async adjustWarehouseStock(
    productId: string,
    storeId: string,
    adjustment: StockAdjustment,
    userRole: string
  ): Promise<StockOperationResult> {
    try {
      // Check permissions - only owner can adjust warehouse stock
      if (userRole === 'employee') {
        throw new Error('Employees cannot adjust warehouse stock directly');
      }

      // Get current product
      const product = await this.productModel.findById(productId, storeId);
      if (!product) {
        throw new Error('Product not found');
      }

      let newStockDeposito: number;
      let quantityChange: number;

      // Validate quantity is non-negative
      if (adjustment.quantity < 0) {
        throw new Error('La cantidad no puede ser negativa');
      }

      // Calculate new warehouse stock based on adjustment type
      switch (adjustment.adjustment_type) {
        case 'increase':
          newStockDeposito = product.stock_deposito + adjustment.quantity;
          quantityChange = adjustment.quantity;
          break;
        
        case 'decrease':
          // Validate that decrease won't make stock negative
          if (product.stock_deposito < adjustment.quantity) {
            throw new Error(`No se puede disminuir ${adjustment.quantity} unidades. Stock actual: ${product.stock_deposito}`);
          }
          newStockDeposito = product.stock_deposito - adjustment.quantity;
          quantityChange = -adjustment.quantity;
          break;
        
        case 'set':
          // Ensure the new value is non-negative
          if (adjustment.quantity < 0) {
            throw new Error('El nuevo valor de stock no puede ser negativo');
          }
          newStockDeposito = adjustment.quantity;
          quantityChange = newStockDeposito - product.stock_deposito;
          break;
        
        default:
          throw new Error('Tipo de ajuste inválido. Use: increase, decrease, o set');
      }

      // Update legacy total stock
      const newTotalStock = newStockDeposito + product.stock_venta;

      // Update product stock
      const updatedProduct = await this.productModel.update(productId, storeId, {
        stock_deposito: newStockDeposito,
        stock: newTotalStock // Update legacy field
      });

      // Record stock movement
      const adjustmentData: Omit<StockMovement, 'id' | 'created_at'> = {
        product_id: productId,
        store_id: storeId,
        movement_type: 'adjustment',
        stock_type: 'deposito',
        quantity_change: quantityChange,
        quantity_before: product.stock_deposito,
        quantity_after: newStockDeposito,
        reason: adjustment.reason,
        performed_by: adjustment.performed_by,
        ...(adjustment.notes && { notes: adjustment.notes })
      };
      const movementId = await this.recordStockMovement(adjustmentData);

      return {
        success: true,
        movement_id: movementId,
        updated_product: updatedProduct,
        message: `Warehouse stock ${adjustment.adjustment_type}d successfully`
      };

    } catch (error) {
      console.error('StockService.adjustWarehouseStock error:', error);
      throw error;
    }
  }

  /**
   * Adjust sales floor stock: Increase, decrease, or set sales floor stock
   * Available to owner role only
   */
  async adjustSalesStock(
    productId: string,
    storeId: string,
    adjustment: StockAdjustment,
    userRole: string
  ): Promise<StockOperationResult> {
    try {
      // Check permissions - only owner can adjust sales stock directly
      if (userRole === 'employee') {
        throw new Error('Employees cannot adjust sales floor stock directly. Use restock operation instead.');
      }

      // Get current product
      const product = await this.productModel.findById(productId, storeId);
      if (!product) {
        throw new Error('Product not found');
      }

      let newStockVenta: number;
      let quantityChange: number;

      // Validate quantity is non-negative
      if (adjustment.quantity < 0) {
        throw new Error('La cantidad no puede ser negativa');
      }

      // Calculate new sales stock based on adjustment type
      switch (adjustment.adjustment_type) {
        case 'increase':
          newStockVenta = product.stock_venta + adjustment.quantity;
          quantityChange = adjustment.quantity;
          break;
        
        case 'decrease':
          // Validate that decrease won't make stock negative
          if (product.stock_venta < adjustment.quantity) {
            throw new Error(`No se puede disminuir ${adjustment.quantity} unidades. Stock actual: ${product.stock_venta}`);
          }
          newStockVenta = product.stock_venta - adjustment.quantity;
          quantityChange = -adjustment.quantity;
          break;
        
        case 'set':
          // Ensure the new value is non-negative
          if (adjustment.quantity < 0) {
            throw new Error('El nuevo valor de stock no puede ser negativo');
          }
          newStockVenta = adjustment.quantity;
          quantityChange = newStockVenta - product.stock_venta;
          break;
        
        default:
          throw new Error('Tipo de ajuste inválido. Use: increase, decrease, o set');
      }

      // Update legacy total stock
      const newTotalStock = product.stock_deposito + newStockVenta;

      // Update product stock
      const updatedProduct = await this.productModel.update(productId, storeId, {
        stock_venta: newStockVenta,
        stock: newTotalStock // Update legacy field
      });

      // Record stock movement
      const salesAdjustmentData: Omit<StockMovement, 'id' | 'created_at'> = {
        product_id: productId,
        store_id: storeId,
        movement_type: 'adjustment',
        stock_type: 'venta',
        quantity_change: quantityChange,
        quantity_before: product.stock_venta,
        quantity_after: newStockVenta,
        reason: adjustment.reason,
        performed_by: adjustment.performed_by,
        ...(adjustment.notes && { notes: adjustment.notes })
      };
      const movementId = await this.recordStockMovement(salesAdjustmentData);

      return {
        success: true,
        movement_id: movementId,
        updated_product: updatedProduct,
        message: `Sales floor stock ${adjustment.adjustment_type}d successfully`
      };

    } catch (error) {
      console.error('StockService.adjustSalesStock error:', error);
      throw error;
    }
  }

  /**
   * Get stock movement history for a product
   */
  async getStockMovements(
    productId: string,
    storeId: string,
    limit: number = 50
  ): Promise<StockMovement[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.movementsTable)
        .select('*')
        .eq('product_id', productId)
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching stock movements:', error);
        throw new Error(`Failed to fetch stock movements: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('StockService.getStockMovements error:', error);
      throw error;
    }
  }

  /**
   * Get low stock alerts for a store
   */
  async getLowStockAlerts(storeId: string): Promise<Product[]> {
    try {
      // Get all products with low stock (either warehouse or sales floor)
      const productsResult = await this.productModel.findByStore({
        store_id: storeId,
        page: 1,
        limit: 1000,
        is_active: true,
        low_stock: true
      });

      return productsResult.products;
    } catch (error) {
      console.error('StockService.getLowStockAlerts error:', error);
      throw error;
    }
  }

  /**
   * Record a stock movement in the audit trail
   */
  private async recordStockMovement(movement: Omit<StockMovement, 'id' | 'created_at'>): Promise<string> {
    try {
      const { data, error } = await this.supabase
        .from(this.movementsTable)
        .insert({
          ...movement,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error recording stock movement:', error);
        throw new Error(`Failed to record stock movement: ${error.message}`);
      }

      return data.id;
    } catch (error) {
      console.error('StockService.recordStockMovement error:', error);
      throw error;
    }
  }

  /**
   * Fill warehouse stock: Simple method for owners to add stock to warehouse
   * Available to owners only
   */
  async fillWarehouseStock(
    productId: string,
    storeId: string,
    quantity: number,
    reason: string,
    performedBy: string,
    notes?: string
  ): Promise<StockOperationResult> {
    try {
      // Get current product
      const product = await this.productModel.findById(productId, storeId);
      if (!product) {
        throw new Error('Product not found');
      }

      // Validate quantity is positive
      if (quantity <= 0) {
        return {
          success: false,
          updated_product: product,
          message: 'La cantidad debe ser mayor a cero'
        };
      }

      // Calculate new warehouse stock
      const newStockDeposito = product.stock_deposito + quantity;
      const newTotalStock = newStockDeposito + product.stock_venta;

      // Update product stock
      const updatedProduct = await this.productModel.update(productId, storeId, {
        stock_deposito: newStockDeposito,
        stock: newTotalStock
      });

      // Record stock movement
      const fillData: Omit<StockMovement, 'id' | 'created_at'> = {
        product_id: productId,
        store_id: storeId,
        movement_type: 'adjustment',
        stock_type: 'deposito',
        quantity_change: quantity,
        quantity_before: product.stock_deposito,
        quantity_after: newStockDeposito,
        reason,
        performed_by: performedBy,
        ...(notes && { notes })
      };
      const movementId = await this.recordStockMovement(fillData);

      return {
        success: true,
        movement_id: movementId,
        updated_product: updatedProduct,
        message: `Successfully added ${quantity} units to warehouse`
      };
    } catch (error) {
      console.error('StockService.fillWarehouseStock error:', error);
      throw error;
    }
  }

  /**
   * Update sales floor stock: For employees to adjust only sales floor stock
   * IMPORTANT: Stock changes automatically affect warehouse stock
   * - If increasing sales stock → decreases warehouse stock
   * - If decreasing sales stock → increases warehouse stock
   * Available to employees and owners
   */
  async updateSalesFloorStock(
    productId: string,
    storeId: string,
    newQuantity: number,
    reason: string,
    performedBy: string,
    notes?: string
  ): Promise<StockOperationResult> {
    try {
      // Get current product
      const product = await this.productModel.findById(productId, storeId);
      if (!product) {
        throw new Error('Product not found');
      }

      // Validate quantity is non-negative
      if (newQuantity < 0) {
        return {
          success: false,
          updated_product: product,
          message: 'La cantidad no puede ser negativa'
        };
      }

      // Calculate the difference
      const quantityChange = newQuantity - product.stock_venta;
      
      // If increasing sales stock, check if warehouse has enough stock
      if (quantityChange > 0) {
        if (product.stock_deposito < quantityChange) {
          return {
            success: false,
            updated_product: product,
            message: `Stock insuficiente en depósito. Disponible: ${product.stock_deposito}, Necesario: ${quantityChange}`
          };
        }
      }

      // Calculate new stock values
      // If quantityChange is positive: reduce warehouse, increase sales
      // If quantityChange is negative: increase warehouse, decrease sales
      const newStockDeposito = product.stock_deposito - quantityChange;
      const newStockVenta = newQuantity;

      // Validate that warehouse stock won't go negative
      if (newStockDeposito < 0) {
        return {
          success: false,
          updated_product: product,
          message: 'Operación resultaría en stock negativo en depósito'
        };
      }

      // Calculate total stock
      const newTotalStock = newStockDeposito + newStockVenta;

      // Update product stock (both sales and warehouse)
      const updatedProduct = await this.productModel.update(productId, storeId, {
        stock_venta: newStockVenta,
        stock_deposito: newStockDeposito,
        stock: newTotalStock
      });

      // Record sales floor stock movement
      const salesUpdateData: Omit<StockMovement, 'id' | 'created_at'> = {
        product_id: productId,
        store_id: storeId,
        movement_type: 'adjustment',
        stock_type: 'venta',
        quantity_change: quantityChange,
        quantity_before: product.stock_venta,
        quantity_after: newStockVenta,
        reason,
        performed_by: performedBy,
        ...(notes && { notes })
      };
      const movementId = await this.recordStockMovement(salesUpdateData);

      // Record warehouse stock movement (opposite change)
      if (quantityChange !== 0) {
        const warehouseUpdateData: Omit<StockMovement, 'id' | 'created_at'> = {
          product_id: productId,
          store_id: storeId,
          movement_type: 'adjustment',
          stock_type: 'deposito',
          quantity_change: -quantityChange,
          quantity_before: product.stock_deposito,
          quantity_after: newStockDeposito,
          reason: `Auto-ajuste por cambio en stock de venta`,
          performed_by: performedBy,
          ...(notes && { notes: `Relacionado: ${notes || reason}` })
        };
        await this.recordStockMovement(warehouseUpdateData);
      }

      return {
        success: true,
        movement_id: movementId,
        updated_product: updatedProduct,
        message: quantityChange > 0 
          ? `Stock de venta actualizado a ${newQuantity} unidades (${quantityChange} descontadas del depósito)`
          : quantityChange < 0
          ? `Stock de venta actualizado a ${newQuantity} unidades (${Math.abs(quantityChange)} devueltas al depósito)`
          : `Stock de venta mantenido en ${newQuantity} unidades`
      };
    } catch (error) {
      console.error('StockService.updateSalesFloorStock error:', error);
      throw error;
    }
  }

  /**
   * Validate user role for stock operations
   */
  static validateStockPermissions(userRole: string, operation: 'restock' | 'adjust_warehouse' | 'adjust_sales' | 'fill_warehouse' | 'update_sales'): boolean {
    switch (operation) {
      case 'restock':
        // All roles can restock (move from warehouse to sales floor)
        return ['employee', 'admin', 'manager', 'owner'].includes(userRole);
      
      case 'adjust_warehouse':
      case 'adjust_sales':
      case 'fill_warehouse':
        // Only admin, manager, and owner can directly adjust warehouse
        return ['admin', 'manager', 'owner'].includes(userRole);
      
      case 'update_sales':
        // Employees and owners can update sales floor stock
        return ['employee', 'admin', 'manager', 'owner'].includes(userRole);
      
      default:
        return false;
    }
  }
}
