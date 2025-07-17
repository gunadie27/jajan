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

const prisma = new PrismaClient();

// --- Product Service ---
export async function getProducts(): Promise<Product[]> {
    const products = await prisma.product.findMany({
        include: {
            variants: true,
        },
        orderBy: {
            createdAt: 'asc'
        }
    });
    return products as any;
}

export async function addProduct(productData: Omit<Product, 'id'>): Promise<Product> {
    const { name, category, imageUrl, variants } = productData;
    const newProduct = await prisma.product.create({
        data: {
            name,
            category,
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
        include: {
            variants: true
        }
    });
    return newProduct as any;
}

export async function updateProduct(productId: string, productData: Omit<Product, 'id'>): Promise<Product> {
    const { name, category, imageUrl, variants } = productData;
    
    // Prisma doesn't support direct upsert on nested relations with a custom ID.
    // So we manage variants manually: delete old ones, create new ones.
    const updatedProduct = await prisma.$transaction(async (tx) => {
        await tx.productVariant.deleteMany({ where: { productId }});

        return tx.product.update({
            where: { id: productId },
            data: {
                name,
                category,
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
            include: { variants: true }
        });
    });

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

export async function addTransaction(transactionData: Omit<Transaction, 'id'>): Promise<Transaction> {
    const { items, total, date, outlet, orderChannel, paymentMethod, cashReceived, change, customerId, customerName, cashierSessionId } = transactionData;

    const outletRecord = await prisma.outlet.findUnique({ where: { name: outlet } });
    if (!outletRecord) throw new Error("Outlet not found");

    const newTransaction = await prisma.transaction.create({
        data: {
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
        },
        include: {
            items: { include: { product: true, variant: true } }
        }
    });
    return newTransaction as any;
}

export async function updateTransaction(transactionId: string, updateData: Partial<Omit<Transaction, 'id'>>): Promise<Transaction> {
    const updatedTransaction = await prisma.transaction.update({
        where: { id: transactionId },
        data: updateData,
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

export async function addExpense(expenseData: Omit<Expense, 'id'>): Promise<Expense> {
    const { description, amount, category, date, outlet, cashierSessionId } = expenseData;
    const outletRecord = await prisma.outlet.findUnique({ where: { name: outlet } });
    if (!outletRecord) throw new Error("Outlet not found");

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
    console.log(`[DEBUG] Attempting login for username: ${username}`);
    const user = await prisma.user.findUnique({ where: { username } });
    console.log(`[DEBUG] Result of findUnique for ${username}:`, user ? 'User found' : 'User not found');
    if (user && user.password) {
        console.log(`[DEBUG] User found. Comparing password for username: ${username}`);
        console.log(`[DEBUG] Password Attempt: ${passwordAttempt}`);
        console.log(`[DEBUG] Stored Hash: ${user.password}`);
        const isMatch = await bcrypt.compare(passwordAttempt, user.password);
        console.log(`[DEBUG] bcrypt.compare result: ${isMatch}`);
        if (isMatch) {
            const { password, ...userToReturn } = user;
            console.log(`[DEBUG] Login successful for username: ${username}`);
            return userToReturn as any;
        }
    }
    console.log(`[DEBUG] Login failed for username: ${username}`);
    return null;
}

export async function addUser(userData: Omit<User, 'id' | 'password'> & { password?: string }): Promise<User> {
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

export async function updateUser(userId: string, userData: Partial<Omit<User, 'id'>>): Promise<User> {
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
    return userToReturn as any;
}

export async function deleteUser(userId: string): Promise<void> {
    await prisma.user.delete({ where: { id: userId } });
}

// --- Customer Service ---
export async function getCustomers(): Promise<Customer[]> {
    return await prisma.customer.findMany({ orderBy: { lastTransactionDate: 'desc' } }) as any;
}

export async function addCustomer(customerData: Omit<Customer, 'id'>): Promise<Customer> {
    try {
        const newCustomer = await prisma.customer.create({ data: customerData });
        return newCustomer as any;
    } catch (error) {
        console.error("Error adding customer:", error);
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
