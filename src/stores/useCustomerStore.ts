/**
 * 客户档案 Zustand Store
 */
import { create } from 'zustand';
import { Customer } from '../types/customer.types';
import * as customerService from '../services/apiCustomerService';

interface CustomerState {
  customers: Customer[];
  isLoading: boolean;
  fetchCustomers: (params?: { search?: string }) => Promise<void>;
  addCustomer: (data: Omit<Customer, 'id' | 'createTime' | 'updateTime'>) => Promise<Customer>;
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<boolean>;
  deleteCustomer: (id: string) => Promise<boolean>;
}

export const useCustomerStore = create<CustomerState>((set, get) => ({
  customers: [],
  isLoading: false,

  fetchCustomers: async (params) => {
    set({ isLoading: true });
    try {
      const data = await customerService.getCustomers(params);
      set({ customers: data || [], isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addCustomer: async (data) => {
    const newCustomer = await customerService.createCustomer(data);
    set((state) => ({ customers: [newCustomer, ...state.customers] }));
    return newCustomer;
  },

  updateCustomer: async (id, data) => {
    const success = await customerService.updateCustomer(id, data);
    if (success) {
      set((state) => ({
        customers: state.customers.map((c) => (c.id === id ? { ...c, ...data } : c)),
      }));
    }
    return success;
  },

  deleteCustomer: async (id) => {
    const success = await customerService.deleteCustomer(id);
    if (success) {
      set((state) => ({ customers: state.customers.filter((c) => c.id !== id) }));
    }
    return success;
  },
}));
