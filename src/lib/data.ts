// This file is being kept for archival purposes but is no longer used by the application's data service.
// The application now fetches data from the database via Prisma, as defined in `src/services/data-service.ts`.
// You can safely delete this file once your database migration is complete and stable.

import type { Product, Transaction, Expense, User, Customer, OrderChannel, PaymentMethod, PlatformSettings, Outlet } from "@/lib/types";

export const outlets: Outlet[] = [
    { id: 'outlet-1', name: 'Maujajan Kemang', address: 'Jl. Kemang Raya No. 1' },
    { id: 'outlet-2', name: 'Maujajan SCBD', address: 'Jl. Jend. Sudirman Kav. 52-53' },
];

export const users: User[] = [
    {
        id: 'user-1',
        name: 'Admin Owner',
        email: 'owner@maujajan.com',
        username: 'owner',
        password: 'password', // Plain text for mock data
        role: 'owner',
    },
    {
        id: 'user-2',
        name: 'Budi (Kasir Kemang)',
        email: 'cashier@maujajan.com',
        username: 'budi',
        password: 'password', // Plain text for mock data
        role: 'cashier',
        outletId: 'outlet-1'
    },
];

export const products: Product[] = [
    {
        "id": "prod-1",
        "name": "Kopi Susu Gula Aren",
        "category": "Coffee",
        "imageUrl": "https://placehold.co/300x300.png",
        "data-ai-hint": "coffee drink",
        "variants": [
            { "id": "var-1a", "name": "Regular", "price": 18000, "stock": 50, "cogs": 8000, "trackStock": true },
            { "id": "var-1b", "name": "Large", "price": 22000, "stock": 30, "cogs": 10000, "trackStock": true }
        ]
    },
    {
        "id": "prod-2",
        "name": "Americano",
        "category": "Coffee",
        "imageUrl": "https://placehold.co/300x300.png",
        "data-ai-hint": "black coffee",
        "variants": [
            { "id": "var-2a", "name": "Hot", "price": 15000, "stock": 100, "cogs": 5000, "trackStock": true },
            { "id": "var-2b", "name": "Ice", "price": 16000, "stock": 100, "cogs": 5500, "trackStock": true }
        ]
    },
    {
        "id": "prod-3",
        "name": "Croissant",
        "category": "Pastry",
        "imageUrl": "https://placehold.co/300x300.png",
        "data-ai-hint": "croissant pastry",
        "variants": [
            { "id": "var-3a", "name": "Original", "price": 20000, "stock": 45, "cogs": 9000, "trackStock": true },
            { "id": "var-3b", "name": "Chocolate", "price": 23000, "stock": 35, "cogs": 11000, "trackStock": true }
        ]
    }
];

export let customers: Customer[] = [];
export const orderChannels: OrderChannel[] = ['store', 'GoFood', 'GrabFood', 'ShopeeFood'];
export let transactions: Transaction[] = [];
export let expenses: Expense[] = [];
export const expenseCategories: string[] = ['Operasional', 'Bahan Baku', 'Utilitas', 'Gaji', 'Sewa'];
export const platformSettings: PlatformSettings = {
    'GoFood': { markup: 20 },
    'GrabFood': { markup: 22 },
    'ShopeeFood': { markup: 20 }
};
