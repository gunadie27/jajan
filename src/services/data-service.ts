/**
 * @fileoverview
 * This is the data service layer for the Maujajan POS application.
 *
 * **Purpose:**
 * To abstract all data fetching and manipulation logic away from the UI components.
 * This file is the **ONLY** place that communicates with the database.
 *
 * **How it Works (Current State):**
 * - It uses Prisma Client to interact with the PostgreSQL database.
 * - All data operations (CRUD) for products, users, transactions, etc., are
 *   handled by the functions in this file.
 * - UI components call these service functions to get data, without knowing
 *   the underlying database implementation.
 */
'use server';

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import type { 
    Product, 
    Transaction, 
    Expense, 
    User, 
    Customer, 
    OrderChannel, 
    PaymentMethod, 
    PlatformSettings, 
    Outlet, 
    CashierSession, 
    ProductVariant,
    OrderItem
} from "@/lib/types";
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Zod schema untuk validasi user
const userSchema = z.object({
  name: z.string().min(2).max(50),
  username: z.string().min(4).max(32).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['owner', 'cashier']),
  outletId: z.string().optional(),
});

// Zod schema untuk validasi produk
const productSchema = z.object({
  name: z.string().min(2).max(100),
  categoryId: z.string().min(1),
  imageUrl: z.string().url().optional(),
  outletId: z.string(),
  variants: z.array(z.object({
    name: z.string().min(1).max(50),
    price: z.number().min(0),
    cogs: z.number().min(0),
    stock: z.number().min(0),
    trackStock: z.boolean().optional(),
  }))
});

// --- Product Service ---
export async function getProducts(): Promise<Product[]> {
    const products = await prisma.product.findMany({
        include: {
            variants: true,
            category: true, // Tambahkan relasi kategori
        },
        orderBy: {
            createdAt: 'asc'
        }
    });
    return products as any;
}

export async function getProductCategories(): Promise<{ id: string; name: string }[]> {
  const categories = await prisma.productCategory.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  });
  return categories.map(cat => ({ id: String(cat.id), name: cat.name }));
}

export async function addProductCategory(name: string): Promise<{ id: string; name: string }> {
  const newCategory = await prisma.productCategory.create({
    data: { name }
  });
  return { id: String(newCategory.id), name: newCategory.name };
}

export async function addProduct(productData: Omit<Product, 'id'> & { categoryId: string }, currentUser: User): Promise<Product> {
    productSchema.parse(productData);
    if (currentUser.role !== 'owner' && currentUser.role !== 'cashier') {
        throw new Error('Forbidden: Only owner or cashier can add product');
    }
    if (currentUser.role === 'cashier' && productData.outletId !== currentUser.outletId) {
        throw new Error('Forbidden: Cashier can only add product for their own outlet');
    }
    const { name, imageUrl, variants, outletId, categoryId } = productData;
    const categoryIdNum = Number(categoryId);
    if (!categoryId || isNaN(categoryIdNum)) {
        throw new Error('Kategori produk tidak valid. Silakan pilih ulang kategori.');
    }
    const data: any = {
        name,
        imageUrl,
        outletId,
        categoryId: categoryIdNum,
        variants: {
            create: variants.map(v => ({
                name: v.name,
                price: v.price,
                cogs: v.cogs,
                stock: v.stock,
                trackStock: v.trackStock
            }))
        }
    };
    const newProduct = await prisma.product.create({
        data,
        include: {
            variants: true,
            category: true
        }
    });
    return newProduct as any;
}

export async function updateProduct(productId: string, productData: Omit<Product, 'id'>): Promise<Product> {
    const { name, category, imageUrl, variants } = productData;

    // Ambil data produk lama
    const oldProduct = await prisma.product.findUnique({ where: { id: productId } });
    // Prisma doesn't support direct upsert on nested relations with a custom ID.
    // So we manage variants manually: delete old ones, create new ones.
    const updatedProduct = await prisma.$transaction(async (tx) => {
        await tx.productVariant.deleteMany({ where: { productId }});
        return tx.product.update({
            where: { id: productId },
            data: {
                name,
                categoryId: Number(category),
                imageUrl,
                variants: {
                    create: variants.map(v => ({
                        name: v.name,
                        price: v.price,
                        cogs: v.cogs,
                        stock: v.stock,
                        trackStock: v.trackStock
                    }))
                }
            },
            include: { variants: true, category: true }
        });
    });

    // Hapus file gambar lama jika diganti dan tidak dipakai produk lain
    if (oldProduct && oldProduct.imageUrl && oldProduct.imageUrl !== imageUrl) {
        const count = await prisma.product.count({ where: { imageUrl: oldProduct.imageUrl } });
        if (count === 1) {
            const filePath = path.join(process.cwd(), 'public', oldProduct.imageUrl);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
    }
    return updatedProduct as any;
}

export async function deleteProduct(productId: string): Promise<void> {
    await prisma.product.delete({ where: { id: productId } });
}

export async function updateProductStock(productId: string, variantId: string, quantityChange: number): Promise<ProductVariant> {
    const updatedVariant = await prisma.productVariant.update({
        where: { id: variantId },
        data: {
            stock: {
                increment: quantityChange
            }
        }
    });
    return updatedVariant as any;
}


// --- Transaction & Expense Service ---
export async function getTransactions(outletId?: string): Promise<Transaction[]> {
    const whereClause = outletId && outletId !== 'all' ? { outletId } : {};
    const transactions = await prisma.transaction.findMany({
        where: whereClause,
        orderBy: { date: 'desc' },
        include: {
            items: {
                include: {
                    product: true,
                    variant: true,
                }
            }
        }
    });
    
    return transactions.map(t => ({
      ...t,
      outlet: t.outletName,
      items: t.items.map(item => ({
        ...item,
        product: { ...item.product, variants: [] }, // Avoid circular reference
      }))
    })) as any;
}

export async function addTransaction(transactionData: Omit<Transaction, 'id'>, currentUser: User): Promise<Transaction> {
    // Hanya owner dan kasir yang boleh menambah transaksi
    if (currentUser.role !== 'owner' && currentUser.role !== 'cashier') {
        throw new Error('Forbidden: Only owner or cashier can add transaction');
    }
    // Jika kasir, pastikan hanya untuk outlet-nya sendiri
    if (currentUser.role === 'cashier') {
        const outletRecord = await prisma.outlet.findUnique({ where: { name: transactionData.outlet } });
        if (!outletRecord || outletRecord.id !== currentUser.outletId) {
            throw new Error('Forbidden: Cashier can only add transaction for their own outlet');
        }
    }
    const { items, total, date, outlet, orderChannel, paymentMethod, cashReceived, change, customerId, customerName, cashierSessionId } = transactionData;

    const outletRecord = await prisma.outlet.findUnique({ where: { name: outlet } });
    if (!outletRecord) throw new Error("Outlet not found");

    // Generate kode outlet otomatis dari nama outlet (ambil huruf pertama tiap kata, max 4 huruf, uppercase)
    const outletCode = outletRecord.name.split(' ').map(k => k[0]).join('').toUpperCase().slice(0, 4);
    
    // Tanggal transaksi (pakai date dari transaksi, fallback ke now)
    const trxDate = date ? new Date(date) : new Date();
    const yy = String(trxDate.getFullYear()).slice(-2);
    const mm = String(trxDate.getMonth() + 1).padStart(2, '0');
    const dd = String(trxDate.getDate()).padStart(2, '0');
    const dateStr = `${yy}${mm}${dd}`;
    
    // Retry logic untuk handle race condition
    let retryCount = 0;
    const maxRetries = 5;
    
    while (retryCount < maxRetries) {
        try {
            // Hitung nomor urut transaksi pada hari itu untuk outlet tsb
            const trxCount = await prisma.transaction.count({
                where: {
                    outletId: outletRecord.id,
                    date: {
                        gte: new Date(`${trxDate.getFullYear()}-${mm}-${dd}T00:00:00.000Z`),
                        lt: new Date(`${trxDate.getFullYear()}-${mm}-${dd}T23:59:59.999Z`)
                    }
                }
            });
            
            // Tambahkan timestamp untuk memastikan keunikan
            const timestamp = Date.now().toString().slice(-6);
            const urut = String(trxCount + 1).padStart(5, '0');
            const transactionNumber = `TRX-${dateStr}-${outletCode}-${urut}-${timestamp}`;

            const newTransaction = await prisma.transaction.create({
                data: {
                    transactionNumber,
                    total,
                    date,
                    outletName: outlet,
                    outletId: outletRecord.id,
                    orderChannel,
                    paymentMethod,
                    cashReceived,
                    change,
                    customerId,
                    customerName,
                    cashierSessionId,
                    items: {
                        create: items.map((item: OrderItem) => ({
                            quantity: item.quantity,
                            price: item.price,
                            productId: item.product.id,
                            variantId: item.variant.id,
                        }))
                    }
                } as any,
                include: {
                    items: { include: { product: true, variant: true } }
                }
            });
            return newTransaction as any;
        } catch (error: any) {
            if (error.code === 'P2002' && error.meta?.target?.includes('transactionNumber')) {
                // Unique constraint violation, retry
                retryCount++;
                if (retryCount >= maxRetries) {
                    throw new Error('Gagal membuat transaksi setelah beberapa percobaan. Silakan coba lagi.');
                }
                // Tunggu sebentar sebelum retry
                await new Promise(resolve => setTimeout(resolve, 100));
            } else {
                throw error;
            }
        }
    }
    
    throw new Error('Gagal membuat transaksi setelah beberapa percobaan. Silakan coba lagi.');
}

export async function updateTransaction(transactionId: string, updateData: Partial<Omit<Transaction, 'id'>>): Promise<Transaction> {
    const updatedTransaction = await prisma.transaction.update({
        where: { id: transactionId },
        data: updateData as any,
        include: {
            items: { include: { product: true, variant: true } }
        }
    });
    return updatedTransaction as any;
}

export async function getExpenses(outletId?: string): Promise<Expense[]> {
    const whereClause = outletId && outletId !== 'all' ? { outletId } : {};
    const expenses = await prisma.expense.findMany({
        where: whereClause,
        orderBy: { date: 'desc' }
    });
    return expenses.map(e => ({...e, outlet: e.outletName})) as any;
}

// Zod schema untuk validasi expense
const expenseSchema = z.object({
  description: z.string().min(2).max(100),
  amount: z.number().min(1),
  category: z.string().min(2).max(50),
  date: z.date(),
  outlet: z.string().min(2),
  cashierSessionId: z.string().optional(),
});

export async function addExpense(expenseData: Omit<Expense, 'id'>, currentUser: User): Promise<Expense> {
    expenseSchema.parse(expenseData);
    // Hanya owner dan kasir yang boleh tambah expense
    if (currentUser.role !== 'owner' && currentUser.role !== 'cashier') {
        throw new Error('Forbidden: Only owner or cashier can add expense');
    }
    // Jika kasir, hanya boleh untuk outlet sendiri
    const outletRecord = await prisma.outlet.findUnique({ where: { name: expenseData.outlet } });
    if (!outletRecord) throw new Error("Outlet not found");
    if (currentUser.role === 'cashier' && outletRecord.id !== currentUser.outletId) {
        throw new Error('Forbidden: Cashier can only add expense for their own outlet');
    }
    const { description, amount, category, date, outlet, cashierSessionId } = expenseData;
    const newExpense = await prisma.expense.create({
        data: {
            description,
            amount,
            category,
            date,
            outletName: outlet,
            cashierSessionId,
            outletId: outletRecord.id,
        }
    });
    return {...newExpense, outlet: newExpense.outletName} as any;
}

export async function updateExpense(expenseId: string, expenseData: Omit<Expense, 'id'>): Promise<Expense> {
    const { description, amount, category, date, outlet } = expenseData;
    const outletRecord = await prisma.outlet.findUnique({ where: { name: outlet } });
    if (!outletRecord) throw new Error("Outlet not found");

    const updatedExpense = await prisma.expense.update({
        where: { id: expenseId },
        data: {
            description,
            amount,
            category,
            date,
            outletName: outlet,
            outletId: outletRecord.id,
        }
    });
    return {...updatedExpense, outlet: updatedExpense.outletName} as any;
}

export async function deleteExpense(expenseId: string): Promise<void> {
    await prisma.expense.delete({ where: { id: expenseId } });
}

// --- User Service ---
export async function getUsers(): Promise<User[]> {
    const users = await prisma.user.findMany({
        select: { id: true, username: true, email: true, role: true, outletId: true }
    });
    return users as any;
}

export async function verifyUserPassword(username: string, passwordAttempt: string): Promise<User | null> {
    console.log(`[LOGIN] Attempt for username: ${username}`);
    const user = await prisma.user.findUnique({ where: { username } });
    if (user && user.password) {
        const isMatch = await bcrypt.compare(passwordAttempt, user.password);
        if (isMatch) {
            console.log(`[LOGIN] Success for username: ${username}`);
            const { password, ...userToReturn } = user;
            return userToReturn as any;
        }
    }
    console.warn(`[LOGIN] Failed for username: ${username}`);
    return null;
}

export async function addUser(userData: Omit<User, 'id' | 'password'> & { password?: string }, currentUser: User): Promise<User> {
    // Hanya owner yang boleh menambah user
    if (currentUser.role !== 'owner') {
        throw new Error('Forbidden: Only owner can add user');
    }
    // Validasi input dengan zod
    userSchema.parse(userData);
    if (!userData.password) throw new Error("Password is required for new user");
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);
    
    const userDataForPrisma: any = {
        name: userData.name,
        username: userData.username,
        email: userData.email,
        password: hashedPassword,
        role: userData.role,
    };
    if (userData.role === 'cashier' && userData.outletId) {
        userDataForPrisma.outletId = userData.outletId;
    }
    const newUser = await prisma.user.create({
        data: userDataForPrisma
    });
    const { password, ...userToReturn } = newUser;
    return userToReturn as any;
}

export async function updateUser(userId: string, userData: Partial<Omit<User, 'id'>>, currentUser: User): Promise<User> {
    // Hanya owner yang boleh update user
    if (currentUser.role !== 'owner') {
        console.warn(`[USER] Forbidden update attempt by ${currentUser.username}`);
        throw new Error('Forbidden: Only owner can update user');
    }
    let dataToUpdate: any = {
        name: userData.name,
        username: userData.username,
        email: userData.email,
        role: userData.role,
    };
    if (userData.role === 'cashier' && userData.outletId) {
        dataToUpdate.outletId = userData.outletId;
    }
    
    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: dataToUpdate
    });
    const { password, ...userToReturn } = updatedUser;
    console.log(`[USER] User updated: ${userId} by ${currentUser.username}`);
    return userToReturn as any;
}

export async function deleteUser(userId: string): Promise<void> {
    await prisma.user.delete({ where: { id: userId } });
}

// --- Customer Service ---
export async function getCustomers(): Promise<Customer[]> {
    return await prisma.customer.findMany({ orderBy: { lastTransactionDate: 'desc' } }) as any;
}

export async function getCustomerByPhone(phoneNumber: string): Promise<Customer | null> {
  const customer = await prisma.customer.findUnique({ where: { phoneNumber } });
  return customer as any;
}

// Zod schema untuk validasi customer
const customerSchema = z.object({
  name: z.string().min(2).max(50),
  phoneNumber: z.string().min(8).max(20),
  firstTransactionDate: z.date(),
  lastTransactionDate: z.date(),
  totalSpent: z.number().min(0),
  transactionIds: z.array(z.string()),
  outletId: z.string(),
});

export async function addCustomer(customerData: Omit<Customer, 'id'>, currentUser: User): Promise<Customer> {
    if (!customerData.outletId) throw new Error('outletId is required');
    
    try {
        // Coba buat customer baru
        const { outletId, ...rest } = customerData;
        const newCustomer = await prisma.customer.create({
            data: {
                ...rest,
                outlet: { connect: { id: outletId } }
            },
        });
        return newCustomer as any;
    } catch (error: any) {
        // Jika error karena phoneNumber sudah ada, coba update customer yang sudah ada
        if (error.code === 'P2002' && error.meta?.target?.includes('phoneNumber')) {
            console.log(`[CUSTOMER] Phone number ${customerData.phoneNumber} already exists, updating existing customer`);
            
            // Cari customer yang sudah ada berdasarkan phoneNumber
            const existingCustomer = await prisma.customer.findUnique({
                where: { phoneNumber: customerData.phoneNumber }
            });
            
            if (existingCustomer) {
                // Update customer yang sudah ada dengan data baru
                const updatedCustomer = await prisma.customer.update({
                    where: { id: existingCustomer.id },
                    data: {
                        name: customerData.name,
                        lastTransactionDate: customerData.lastTransactionDate,
                        totalSpent: existingCustomer.totalSpent + customerData.totalSpent,
                        transactionIds: [...existingCustomer.transactionIds, ...customerData.transactionIds],
                        outletId: customerData.outletId
                    }
                });
                return updatedCustomer as any;
            }
        }
        
        // Jika bukan error duplicate atau customer tidak ditemukan, throw error asli
        throw error;
    }
}

export async function updateCustomer(customerId: string, customerData: Partial<Omit<Customer, 'id'>>): Promise<Customer> {
    try {
        const updatedCustomer = await prisma.customer.update({
            where: { id: customerId },
            data: customerData
        });
        return updatedCustomer as any;
    } catch (error) {
        console.error(`Error updating customer ${customerId}:`, error);
        throw error;
    }
}

export async function deleteCustomer(customerId: string): Promise<void> {
    await prisma.customer.delete({ where: { id: customerId } });
}

// --- Outlet Service ---
export async function getOutlets(): Promise<Outlet[]> {
    return await prisma.outlet.findMany({ orderBy: { name: 'asc' }});
}

export async function addOutlet(outletData: Omit<Outlet, 'id'>): Promise<Outlet> {
    return await prisma.outlet.create({ data: outletData });
}

export async function updateOutlet(outletId: string, outletData: Partial<Omit<Outlet, 'id'>>): Promise<Outlet> {
    return await prisma.outlet.update({ where: { id: outletId }, data: outletData });
}

export async function deleteOutlet(outletId: string): Promise<void> {
    await prisma.outlet.delete({ where: { id: outletId } });
}


// --- Static & Config Data Service ---
export async function getOrderChannels(): Promise<OrderChannel[]> {
    const settings = await prisma.platformSetting.findMany();
    // Assuming 'store' is a default channel not in the settings table
    const channels = ['store', 'GoFood', 'GrabFood', 'ShopeeFood', 'others', ...settings.map(s => s.channel)];
    return [...new Set(channels)] as OrderChannel[];
}

export async function getExpenseCategories(): Promise<string[]> {
    const categories = await prisma.expenseCategory.findMany({ orderBy: { name: 'asc' }});
    return categories.map(c => c.name);
}

export async function addExpenseCategory(categoryName: string): Promise<string> {
    const newCategory = await prisma.expenseCategory.create({ data: { name: categoryName } });
    return newCategory.name;
}

export async function updateExpenseCategory(oldName: string, newName: string): Promise<string> {
    const updated = await prisma.expenseCategory.update({ where: { name: oldName }, data: { name: newName } });
    return updated.name;
}

export async function deleteExpenseCategory(categoryName: string): Promise<void> {
    await prisma.expenseCategory.delete({ where: { name: categoryName } });
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
    const settings = await prisma.platformSetting.findMany();
    const platformSettings: PlatformSettings = {};
    settings.forEach(s => {
        platformSettings[s.channel] = { markup: s.markup };
    });
    return platformSettings;
}

export async function updatePlatformSettings(newSettings: PlatformSettings): Promise<PlatformSettings> {
    for (const channel in newSettings) {
        const setting = newSettings[channel as OrderChannel];
        if (setting) {
             await prisma.platformSetting.upsert({
                where: { channel: channel as OrderChannel },
                update: { markup: setting.markup },
                create: { channel: channel as OrderChannel, markup: setting.markup }
            });
        }
    }
    return newSettings;
}

// --- Cashier Session Service ---
export async function getCashierSessions(): Promise<CashierSession[]> {
    const sessions = await prisma.cashierSession.findMany({
        orderBy: { startTime: 'desc' },
        include: { transactions: true, expenses: true }
    });
    return sessions as any;
}

export async function addCashierSession(sessionData: Omit<CashierSession, 'id' | 'transactions' | 'expenses'>): Promise<CashierSession> {
    const newSession = await prisma.cashierSession.create({
        data: {
          ...sessionData,
          status: 'active'
        }
    });
    return { ...newSession, transactions: [], expenses: [] } as any;
}

export async function updateCashierSession(sessionId: string, sessionData: Partial<CashierSession>): Promise<CashierSession> {
    const updatedSession = await prisma.cashierSession.update({
        where: { id: sessionId },
        data: {
          endTime: sessionData.endTime,
          status: 'closed',
          finalCash: sessionData.finalCash,
          calculatedCash: sessionData.calculatedCash,
          difference: sessionData.difference,
        },
        include: { transactions: true, expenses: true }
    });
    return updatedSession as any;
}
