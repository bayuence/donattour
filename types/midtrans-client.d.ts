/**
 * Type declarations for midtrans-client
 * 
 * Since midtrans-client doesn't have official TypeScript types,
 * we declare the basic types we need for our integration.
 */

declare module 'midtrans-client' {
  export interface MidtransConfig {
    isProduction: boolean;
    serverKey: string;
    clientKey: string;
  }

  export interface TransactionDetails {
    order_id: string;
    gross_amount: number;
  }

  export interface ItemDetail {
    id: string;
    name: string;
    price: number;
    quantity: number;
    category?: string;
  }

  export interface CustomerDetails {
    first_name: string;
    last_name?: string;
    email?: string;
    phone?: string;
  }

  export interface SnapParameter {
    transaction_details: TransactionDetails;
    item_details?: ItemDetail[];
    customer_details?: CustomerDetails;
    enabled_payments?: string[];
    callbacks?: {
      finish?: string;
      error?: string;
      pending?: string;
    };
    expiry?: {
      unit: string;
      duration: number;
    };
  }

  export interface SnapTransaction {
    token: string;
    redirect_url: string;
  }

  export interface TransactionStatus {
    transaction_id: string;
    order_id: string;
    gross_amount: string;
    payment_type: string;
    transaction_time: string;
    transaction_status: string;
    fraud_status?: string;
    settlement_time?: string;
    status_code: string;
    status_message: string;
  }

  export class Snap {
    constructor(config: MidtransConfig);
    createTransaction(parameter: SnapParameter): Promise<SnapTransaction>;
    transaction: {
      status(orderId: string): Promise<TransactionStatus>;
      cancel(orderId: string): Promise<any>;
      approve(orderId: string): Promise<any>;
      deny(orderId: string): Promise<any>;
      expire(orderId: string): Promise<any>;
      refund(orderId: string, parameter?: any): Promise<any>;
    };
  }

  export class CoreApi {
    constructor(config: MidtransConfig);
    charge(parameter: any): Promise<any>;
    capture(parameter: any): Promise<any>;
    cardRegister(parameter: any): Promise<any>;
    cardToken(parameter: any): Promise<any>;
    cardPointInquiry(tokenId: string): Promise<any>;
  }

  const midtransClient: {
    Snap: typeof Snap;
    CoreApi: typeof CoreApi;
  };

  export default midtransClient;
}
