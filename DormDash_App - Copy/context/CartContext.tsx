import React, { createContext, useContext, useState, useEffect } from 'react';

// Define types for Cart Item
export interface CartItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    vendorId: string;     // Critical for grouping orders by vendor
    vendorName: string;   // Display vendor name in cart
    isVeg?: boolean;      // Optional: for display
}

interface CartContextType {
    cartItems: CartItem[];
    addToCart: (item: Omit<CartItem, 'quantity'>) => void;
    removeFromCart: (itemId: string) => void;
    updateQuantity: (itemId: string, quantity: number) => void;
    clearCart: () => void;
    getCartTotal: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [cartItems, setCartItems] = useState<CartItem[]>([]);

    // Add item to cart
    const addToCart = (item: Omit<CartItem, 'quantity'>) => {
        setCartItems((prevItems) => {
            // Check if item from DIFFERENT vendor exists (optional: restrict multi-vendor orders)
            // For now, we allow mixed or assume single vendor per order logic elsewhere.

            const existingItem = prevItems.find((i) => i.id === item.id);
            if (existingItem) {
                return prevItems.map((i) =>
                    i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
                );
            }
            return [...prevItems, { ...item, quantity: 1 }];
        });
    };

    // Remove item completely
    const removeFromCart = (itemId: string) => {
        setCartItems((prevItems) => prevItems.filter((i) => i.id !== itemId));
    };

    // Update Quantity (Increment/Decrement)
    const updateQuantity = (itemId: string, quantity: number) => {
        if (quantity <= 0) {
            removeFromCart(itemId);
            return;
        }
        setCartItems((prevItems) =>
            prevItems.map((i) => (i.id === itemId ? { ...i, quantity } : i))
        );
    };

    // Clear all items
    const clearCart = () => {
        setCartItems([]);
    };

    // Calculate Total Price
    const getCartTotal = () => {
        return cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
    };

    return (
        <CartContext.Provider
            value={{
                cartItems,
                addToCart,
                removeFromCart,
                updateQuantity,
                clearCart,
                getCartTotal,
            }}
        >
            {children}
        </CartContext.Provider>
    );
};

// Custom Hook to use Cart
export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};
