import { create } from 'zustand';
import { getCustomers, addCustomer as addCustomerApi, updateCustomer as updateCustomerApi } from '@/services/data-service';
import type { Customer, User } from '@/lib/types';

interface CustomerStore {
  customers: Customer[];
  fetchCustomers: () => Promise<void>;
  addCustomer: (customerData: Omit<Customer, 'id'>) => Promise<Customer>;
  updateCustomer: (id: string, customerData: Partial<Omit<Customer, 'id'>>) => Promise<Customer>;
}

export const useCustomerStore = create<CustomerStore>((set, get) => ({
  customers: [],
  fetchCustomers: async () => {
    const data = await getCustomers();
    set({ customers: data });
  },
  addCustomer: async (customerData) => {
    const newCustomer = await addCustomerApi(customerData);
    set(state => ({ customers: [...state.customers, newCustomer] }));
    return newCustomer;
  },
  updateCustomer: async (id, customerData) => {
    const updated = await updateCustomerApi(id, customerData);
    set(state => ({
      customers: state.customers.map((c: Customer) => c.id === id ? updated : c)
    }));
    return updated;
  }
})); 