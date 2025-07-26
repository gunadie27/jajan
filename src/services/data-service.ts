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

import { prisma } from '@/lib/db'; // Ganti impor PrismaClient
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

// const prisma = new PrismaClient(); // Hapus baris ini

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
  outletId: z.string().optional(), // Optional untuk produk global
  variants: z.array(z.object({
    id: z.string().optional(), // Optional untuk update
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
            outlet: true, // Tambahkan relasi outlet
        },
        orderBy: {
            createdAt: 'asc'
        }
    });
    
    // Transform data to match Product type
    return products.map(product => ({
        ...product,
        category: product.category?.name || 'Unknown Category', // Extract category name
        categoryId: product.categoryId?.toString(), // Ensure categoryId is string
        outlet: product.outlet?.name || null // Extract outlet name
    })) as Product[];
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
    
    // Hanya owner yang boleh menambah produk
    if (currentUser.role !== 'owner') {
        throw new Error('Forbidden: Only owner can add product');
    }
    
    const { name, imageUrl, variants, outletId, categoryId } = productData;
    
    // Validasi outletId jika ada (untuk produk outlet-specific)
    if (outletId) {
        const outletExists = await prisma.outlet.findUnique({ where: { id: outletId } });
        if (!outletExists) {
            throw new Error('Outlet yang dipilih tidak ditemukan di database. Silakan pilih outlet lain.');
        }
    }
    
    const categoryIdNum = Number(categoryId);
    console.log('DEBUG - categoryIdNum after Number():', categoryIdNum, 'isNaN:', isNaN(categoryIdNum));
    
    if (!categoryId || isNaN(categoryIdNum)) {
        console.log('DEBUG - Validation failed: categoryId is invalid');
        throw new Error('Kategori produk tidak valid. Silakan pilih ulang kategori.');
    }
    const data: any = {
        name,
        imageUrl,
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
    
    // Hanya tambahkan outletId jika ada (untuk produk outlet-specific)
    if (outletId) {
        data.outletId = outletId;
    }
    const newProduct = await prisma.product.create({
        data,
        include: {
            variants: true,
            category: true
        }
    });
    
    // Transform data to match Product type
    return {
        ...newProduct,
        category: newProduct.category?.name || 'Unknown Category',
        categoryId: newProduct.categoryId?.toString(),
        outlet: newProduct.outlet?.name || null
    } as Product;
}

export async function updateProduct(productId: string, productData: Omit<Product, 'id'>): Promise<Product> {
    const { name, category, categoryId, imageUrl, variants, outletId } = productData;

    // Ambil data produk lama
    const oldProduct = await prisma.product.findUnique({ where: { id: productId } });
    
    // Handle both category and categoryId fields from frontend
    let finalCategoryId: number;
    if (categoryId) {
        // If categoryId is provided, use it
        finalCategoryId = typeof categoryId === 'string' ? parseInt(categoryId) : categoryId;
    } else if (category) {
        // If category is provided, use it
        finalCategoryId = typeof category === 'string' ? parseInt(category) : category;
    } else {
        throw new Error('Kategori produk tidak valid. Silakan pilih ulang kategori.');
    }
    
    if (isNaN(finalCategoryId)) {
        throw new Error('Kategori produk tidak valid. Silakan pilih ulang kategori.');
    }
    
    // Validasi outletId jika ada
    if (outletId) {
        const outletExists = await prisma.outlet.findUnique({ where: { id: outletId } });
        if (!outletExists) {
            throw new Error('Outlet yang dipilih tidak ditemukan di database. Silakan pilih outlet lain.');
        }
    }
    
    const updatedProduct = await prisma.$transaction(async (tx) => {
        // Ambil semua variant lama
        const oldVariants = await tx.productVariant.findMany({ where: { productId } });
        const oldVariantIds = oldVariants.map(v => v.id);

        // Ambil semua variantId dari data baru (frontend)
        const newVariantIds = variants.filter(v => v.id).map(v => v.id);

        // Variant yang akan dihapus = variant lama yang tidak ada di data baru
        const toDelete = oldVariantIds.filter(id => !newVariantIds.includes(id));

        // Cari variant yang masih dipakai di OrderItem
        let usedVariantIds: string[] = [];
        if (toDelete.length > 0) {
          const usedVariants = await tx.orderItem.findMany({
            where: { variantId: { in: toDelete } },
            select: { variantId: true }
          });
          usedVariantIds = usedVariants.map(v => v.variantId);
        }

        // Hanya hapus variant yang tidak dipakai
        const safeToDelete = toDelete.filter(id => !usedVariantIds.includes(id));
        if (safeToDelete.length > 0) {
          await tx.productVariant.deleteMany({ where: { id: { in: safeToDelete } } });
        }
        // Jika ada variant yang tidak bisa dihapus, beri warning ke user
        if (usedVariantIds.length > 0) {
          throw new Error('Tidak bisa menghapus variant yang sudah pernah dipakai di transaksi. Silakan nonaktifkan atau ubah nama saja.');
        }
        return tx.product.update({
            where: { id: productId },
            data: {
                name,
                categoryId: finalCategoryId,
                imageUrl,
                outletId: outletId || null, // Bisa null untuk produk global
                variants: {
                    // Update existing variants dan create baru
                    upsert: variants.map(v => v.id ? {
                        where: { id: v.id },
                        update: {
                          name: v.name,
                          price: v.price,
                          cogs: v.cogs,
                          stock: v.stock,
                          trackStock: v.trackStock
                        },
                        create: {
                          name: v.name,
                          price: v.price,
                          cogs: v.cogs,
                          stock: v.stock,
                          trackStock: v.trackStock
                        }
                    } : {
                        create: {
                          name: v.name,
                          price: v.price,
                          cogs: v.cogs,
                          stock: v.stock,
                          trackStock: v.trackStock
                        }
                    })
                }
            },
            include: { variants: true, category: true, outlet: true }
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
    // Transform data to match Product type
    return {
        ...updatedProduct,
        category: updatedProduct.category?.name || 'Unknown Category',
        categoryId: updatedProduct.categoryId?.toString(),
        outlet: updatedProduct.outlet?.name || null
    } as Product;
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
        // Gunakan outletId yang sudah ada di user, tidak perlu mencari berdasarkan name
        if (currentUser.outletId) {
            const outletRecord = await prisma.outlet.findUnique({ where: { id: currentUser.outletId } });
            if (!outletRecord) {
                throw new Error('Forbidden: Cashier outlet not found');
            }
            // Override outlet name dengan outlet milik kasir
            transactionData.outlet = outletRecord.name;
        } else {
            throw new Error('Forbidden: Cashier must have assigned outlet');
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
            
            // Format ID transaksi yang lebih simpel: YYMMDD-OUTLET-URUT
            const urut = String(trxCount + 1).padStart(3, '0');
            const transactionNumber = `${dateStr}-${outletCode}-${urut}`;

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

            // Update customer data if customerId is provided
            if (customerId) {
                await prisma.customer.update({
                    where: { id: customerId },
                    data: {
                        totalSpent: {
                            increment: total
                        },
                        lastTransactionDate: date,
                        transactionIds: {
                            push: newTransaction.id
                        }
                    }
                });
            }

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
    const user = await prisma.user.findUnique({ 
        where: { username },
        include: { outlet: true }
    });
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
    } else if (userData.role === 'owner') {
        // Owner tidak terikat outlet
        userDataForPrisma.outletId = null;
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
    } else if (userData.role === 'owner') {
        // Owner tidak terikat outlet
        dataToUpdate.outletId = null;
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
    const customers = await prisma.customer.findMany({ 
        orderBy: { lastTransactionDate: 'desc' } 
    });
    
    // Transform data to match Customer type
    return customers as Customer[];
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
});

export async function addCustomer(customerData: Omit<Customer, 'id' | 'isMember' | 'memberId' | 'lastUsedDiscount'>): Promise<Customer> {
    
    try {
        // Coba buat customer baru
        const newCustomer = await prisma.customer.create({
            data: customerData,
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

/**
 * Validasi apakah member bisa menggunakan diskon hari ini
 * Member hanya bisa menggunakan diskon 1x sehari
 */
export async function canMemberUseDiscount(memberId: string): Promise<boolean> {
    try {
        const customer = await prisma.customer.findUnique({
            where: { memberId },
            select: { lastDiscountDate: true }
        });

        if (!customer) {
            return false; // Member tidak ditemukan
        }

        if (!customer.lastDiscountDate) {
            return true; // Belum pernah menggunakan diskon
        }

        // Cek apakah sudah menggunakan diskon hari ini
        const today = new Date();
        const lastDiscountDate = new Date(customer.lastDiscountDate);
        
        // Bandingkan tanggal saja (abaikan waktu)
        const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const lastDiscountDateOnly = new Date(lastDiscountDate.getFullYear(), lastDiscountDate.getMonth(), lastDiscountDate.getDate());
        
        return todayDate.getTime() !== lastDiscountDateOnly.getTime();
    } catch (error) {
        console.error('Error checking member discount eligibility:', error);
        return false;
    }
}

/**
 * Update tanggal terakhir member menggunakan diskon
 */
export async function updateMemberDiscountUsage(memberId: string): Promise<void> {
    try {
        await prisma.customer.update({
            where: { memberId },
            data: { 
                lastDiscountDate: new Date(),
                lastUsedDiscount: new Date()
            }
        });
    } catch (error) {
        console.error('Error updating member discount usage:', error);
        throw error;
    }
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

// --- Discount Service ---
export async function getDiscounts(): Promise<any[]> { // Ganti any dengan tipe DiscountRule nanti
    const discounts = await prisma.discountRule.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            product: true,
            category: true,
        }
    });
    console.log('=== GET DISCOUNTS DEBUG ===');
    console.log('Found discounts:', discounts.length);
    console.log('Sample discount:', discounts[0]);
    return discounts;
}

export async function addDiscount(data: any, currentUser: { role: string }): Promise<any> {
    if (currentUser.role !== 'owner') {
        throw new Error('Forbidden: Only owner can add discounts.');
    }

    const { name, isActive, discountType, discountValue, appliesTo, minPurchase, validFrom, validUntil, scope, productId, categoryId, maxDiscountAmount, bundledProductIds } = data;
    
    // Konversi categoryId ke integer jika ada
    const categoryIdNum = categoryId ? parseInt(categoryId, 10) : undefined;

    const newDiscount = await prisma.discountRule.create({
        data: {
            name,
            isActive,
            discountType,
            discountValue,
            appliesTo,
            minPurchase,
            validFrom,
            validUntil,
            scope,
            productId,
            categoryId: categoryIdNum,
            maxDiscountAmount,
            bundledProductIds: bundledProductIds || [],
        }
    });

    return newDiscount;
}

export async function updateDiscount(id: string, data: any, currentUser: { role: string }): Promise<any> {
    if (currentUser.role !== 'owner') {
        throw new Error('Forbidden: Only owner can update discounts.');
    }

    console.log('=== UPDATE DISCOUNT DEBUG ===');
    console.log('ID:', id);
    console.log('Raw data:', data);

    const { name, isActive, discountType, discountValue, appliesTo, minPurchase, validFrom, validUntil, scope, productId, categoryId, maxDiscountAmount, bundledProductIds } = data;
    
    // Konversi categoryId ke integer jika ada
    const categoryIdNum = categoryId ? parseInt(categoryId, 10) : undefined;

    // Pastikan tanggal dalam format yang benar
    const processedValidFrom = validFrom ? new Date(validFrom) : null;
    const processedValidUntil = validUntil ? new Date(validUntil) : null;

    console.log('Processed data:', {
        name,
        isActive,
        discountType,
        discountValue,
        appliesTo,
        minPurchase,
        validFrom: processedValidFrom,
        validUntil: processedValidUntil,
        scope,
        productId,
        categoryId: categoryIdNum,
        maxDiscountAmount,
        bundledProductIds: bundledProductIds || [],
    });

    const updatedDiscount = await prisma.discountRule.update({
        where: { id },
        data: {
            name,
            isActive,
            discountType,
            discountValue,
            appliesTo,
            minPurchase,
            validFrom: processedValidFrom,
            validUntil: processedValidUntil,
            scope,
            productId,
            categoryId: categoryIdNum,
            maxDiscountAmount,
            bundledProductIds: bundledProductIds || [],
        }
    });

    console.log('Update successful:', updatedDiscount);
    return updatedDiscount;
}

export async function deleteDiscount(id: string, currentUser: { role: string }): Promise<void> {
    if (currentUser.role !== 'owner') {
        throw new Error('Forbidden: Only owner can delete discounts.');
    }
    await prisma.discountRule.delete({ where: { id } });
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
export async function getCashierSessions(outletId?: string): Promise<CashierSession[]> {
    const whereClause = outletId && outletId !== 'all' ? { outletId } : {};
    const sessions = await prisma.cashierSession.findMany({
        where: whereClause,
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
