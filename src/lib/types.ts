
export type OrderChannel = 'store' | 'GoFood' | 'GrabFood' | 'ShopeeFood' | 'others';
export type OrderChannelFilter = OrderChannel | 'all' | 'merchants';

export type ProductVariant = {
  id: string;
  name: string;
  price: number; // Base price for in-store
  trackStock: boolean;
  stock: number;
  cogs: number; // Cost of Goods Sold / HPP
};

export type Product = {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  variants: ProductVariant[];
  outletId?: string;
  "data-ai-hint"?: string;
};

export type OrderItem = {
  product: Product;
  variant: ProductVariant;
  quantity: number;
  price: number; // The actual price at the time of transaction
};

export type Customer = {
    id: string;
    name: string;
    phoneNumber: string;
    firstTransactionDate: Date;
    lastTransactionDate: Date;
    totalSpent: number;
    transactionIds: string[];
    outletId: string;
}

export type PaymentMethod = 'cash' | 'qris' | 'platform_balance';

export type Transaction = {
  id: string;
  transactionNumber?: string;
  items: OrderItem[];
  total: number;
  date: Date;
  outlet: string;
  orderChannel: OrderChannel;
  paymentMethod: PaymentMethod;
  cashReceived?: number;
  change?: number;
  customerId?: string;
  customerName?: string;
  cashierSessionId?: string; // Link to cashier session
};

export type Expense = {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: Date;
  outlet: string;
  cashierSessionId?: string; // Link to cashier session
};

export type UserRole = "owner" | "cashier";

export type Outlet = {
  id:string;
  name: string;
  address: string;
};

export type User = {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  email: string;
  password?: string;
  outletId?: string;
};

export type CashierSession = {
  id: string;
  userId: string;
  userName: string;
  outletId: string;
  outletName: string;
  startTime: Date;
  endTime?: Date;
  initialCash: number;
  finalCash?: number;
  calculatedCash?: number;
  difference?: number;
  status: 'active' | 'closed';
  transactions: Transaction[];
  expenses: Expense[];
}

export type PlatformSettings = {
  [key: string]: { markup: number };
};
