import { writable } from 'svelte/store';

type ConfirmationOptions = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
  cancelButtonClass?: string;
  onConfirm: () => void;
  onCancel?: () => void;
};

// Default options
const defaultOptions: ConfirmationOptions = {
  title: 'Confirm Action',
  message: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  confirmButtonClass: 'bg-purple hover:bg-purple/90',
  cancelButtonClass: 'bg-surface hover:bg-surface/80',
  onConfirm: () => {},
  onCancel: () => {}
};

// Create the store
const createConfirmationStore = () => {
  const { subscribe, set, update } = writable<{
    isOpen: boolean;
    options: ConfirmationOptions;
  }>({
    isOpen: false,
    options: defaultOptions
  });

  return {
    subscribe,
    
    // Show confirmation dialog
    confirm: (options: ConfirmationOptions) => {
      return new Promise<boolean>((resolve) => {
        const originalOnConfirm = options.onConfirm;
        const originalOnCancel = options.onCancel;
        
        const onConfirm = () => {
          originalOnConfirm?.();
          resolve(true);
          set({ isOpen: false, options: defaultOptions });
        };
        
        const onCancel = () => {
          originalOnCancel?.();
          resolve(false);
          set({ isOpen: false, options: defaultOptions });
        };
        
        set({
          isOpen: true,
          options: { 
            ...defaultOptions, 
            ...options, 
            onConfirm,
            onCancel
          }
        });
      });
    },
    
    // Close the dialog
    close: () => {
      set({
        isOpen: false,
        options: defaultOptions
      });
    }
  };
};

// Export a singleton instance
export const confirmationStore = createConfirmationStore();