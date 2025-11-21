import { Slot, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext'; // ✅ Import CartProvider
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';

function InitialLayout() {
    const { user, isLoading } = useAuth();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) return;

        const inAuthGroup = segments[0] === '(auth)';
        // No need to explicitly check inVendorPage, logic handles it:
        // If NO user & NOT in auth -> go to login.
        // If YES user & IS in auth -> go to home.

        if (user && inAuthGroup) {
            router.replace('/(tabs)');
        } else if (!user && !inAuthGroup) {
            router.replace('/(auth)');
        }
    }, [user, isLoading, segments]);

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#050806' }}>
                <ActivityIndicator size="large" color="#25D366" />
            </View>
        );
    }

    // ✅ Wrap the Slot with CartProvider so all screens get access
    return (
        <CartProvider>
            <Slot />
        </CartProvider>
    );
}

export default function RootLayout() {
    return (
        <AuthProvider>
            <InitialLayout />
        </AuthProvider>
    );
}
