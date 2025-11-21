import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { useAuth } from '../context/AuthContext'; // Import Auth to get User ID

// 🔑 PASTE YOUR API KEY HERE
const GEMINI_API_KEY = "AIzaSyDPb3WvTm5ZCuMcE3sX3aFne3eD0ouyBEg";

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    vendorId?: string;
    vendorName?: string;
}

export default function AIChatScreen() {
    const { user } = useAuth(); // Get current user
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', text: "Hi! I'm your Food AI. 🍔\nI know what you like! Ask me for recommendations.", sender: 'ai' }
    ]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);

    // Context Data
    const [menuContext, setMenuContext] = useState('');
    const [historyContext, setHistoryContext] = useState(''); // New: Stores User History
    const [vendorMap, setVendorMap] = useState<Record<string, string>>({});

    const flatListRef = useRef<FlatList>(null);

    // 1. Load Menus AND User History
    useEffect(() => {
        const loadData = async () => {
            try {
                // A. Load Vendors & Menus
                const vendorsSnap = await getDocs(collection(db, 'vendors'));
                let menuString = "RESTAURANT DATABASE (Available now):\n";
                const vMap: Record<string, string> = {};

                for (const vendorDoc of vendorsSnap.docs) {
                    const v = vendorDoc.data();
                    const vName = v.restaurantName || "Unknown";
                    vMap[vName.toLowerCase()] = vendorDoc.id;

                    menuString += `\n--- RESTAURANT: ${vName} ---\n`;
                    menuString += `Description: ${v.description}\n`;

                    const menuSnap = await getDocs(collection(db, 'vendors', vendorDoc.id, 'menuItems'));
                    const items = menuSnap.docs.map(d => {
                        const i = d.data();
                        return `- ${i.name} (${i.price} INR)`;
                    }).join('\n');

                    menuString += `MENU ITEMS:\n${items}\n`;
                }
                setMenuContext(menuString);
                setVendorMap(vMap);

                // B. Load User History (Last 5 Orders)
                if (user?.uid) {
                    const q = query(
                        collection(db, 'orders'),
                        where('studentId', '==', user.uid),
                        // orderBy('createdAt', 'desc'), // Requires composite index, removing for safety if index missing
                        limit(5)
                    );

                    const historySnap = await getDocs(q);
                    if (!historySnap.empty) {
                        let hString = "USER'S PAST ORDERS (Use this to recommend):\n";
                        historySnap.forEach(doc => {
                            const data = doc.data();
                            const items = data.items.map((i: any) => i.name).join(', ');
                            hString += `- Ordered from ${data.vendorName}: ${items} (Status: ${data.status})\n`;
                        });
                        setHistoryContext(hString);
                        console.log("History loaded for AI");
                    } else {
                        setHistoryContext("USER HISTORY: No past orders yet.");
                    }
                }

            } catch (error) {
                console.error("Error loading AI context:", error);
            }
        };
        loadData();
    }, [user]);

    // 2. Call Gemini API
    const generateResponse = async (query: string) => {
        setLoading(true);

        try {
            const prompt = `You are a smart food delivery assistant for a university campus.
      
      --- DATA SOURCE ---
      
      ${menuContext}

      ${historyContext}

      --- END DATA SOURCE ---

      USER QUESTION: "${query}"

      INSTRUCTIONS:
      1. If the user asks for recommendations (e.g., "What should I eat?"), prioritize restaurants/foods they have ordered before based on the USER'S PAST ORDERS section.
      2. If they ask for something new, suggest items they HAVEN'T ordered yet.
      3. If the user asks "how to order", explain: "Browse the home screen, select a restaurant, and checkout!"
      4. When mentioning a restaurant, use its EXACT name from the database.
      5. Keep it friendly and personalized.

      RESPONSE:`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Link Logic
            let foundVendorId = undefined;
            let foundVendorName = undefined;

            const lowerText = text.toLowerCase();
            Object.keys(vendorMap).forEach((vName) => {
                if (lowerText.includes(vName)) {
                    foundVendorId = vendorMap[vName];
                    foundVendorName = vName.charAt(0).toUpperCase() + vName.slice(1);
                }
            });

            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                text: text,
                sender: 'ai',
                vendorId: foundVendorId,
                vendorName: foundVendorName
            }]);

        } catch (error) {
            console.error("Gemini API Error:", error);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                text: "I'm having trouble connecting. Please check your internet.",
                sender: 'ai'
            }]);
        } finally {
            setLoading(false);
        }
    };

    const sendMessage = () => {
        if (!inputText.trim()) return;

        const userMsg: Message = { id: Date.now().toString(), text: inputText, sender: 'user' };
        setMessages(prev => [...prev, userMsg]);

        const query = inputText;
        setInputText('');

        if (!menuContext) {
            setTimeout(() => generateResponse(query), 2000); // Wait longer for history to load
        } else {
            generateResponse(query);
        }
    };

    useEffect(() => {
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }, [messages]);

    const handleVendorLink = (vendorId: string) => {
        router.push(`/vendor/${vendorId}`);
    };

    const renderMessage = ({ item }: { item: Message }) => (
        <View style={[styles.msgBubble, item.sender === 'user' ? styles.userBubble : styles.aiBubble]}>
            <Text style={[styles.msgText, item.sender === 'user' ? styles.userText : styles.aiText]}>
                {item.text}
            </Text>

            {item.vendorId && item.vendorName && (
                <TouchableOpacity
                    style={styles.linkButton}
                    onPress={() => handleVendorLink(item.vendorId!)}
                >
                    <Text style={styles.linkText}>View {item.vendorName}</Text>
                    <Ionicons name="arrow-forward" size={12} color="#000" />
                </TouchableOpacity>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <LinearGradient colors={['#0F1C15', '#050806']} style={StyleSheet.absoluteFill} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-down" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerTitleBox}>
                    <Ionicons name="sparkles" size={16} color="#25D366" />
                    <Text style={styles.headerTitle}>Food AI Assistant</Text>
                </View>
                <View style={{ width: 24 }} />
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={item => item.id}
                    renderItem={renderMessage}
                    contentContainerStyle={styles.chatContent}
                    showsVerticalScrollIndicator={false}
                />

                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Ask for recommendations..."
                        placeholderTextColor="#666"
                        value={inputText}
                        onChangeText={setInputText}
                        onSubmitEditing={sendMessage}
                        returnKeyType="send"
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, !inputText.trim() && styles.sendDisabled]}
                        onPress={sendMessage}
                        disabled={!inputText.trim()}
                    >
                        {loading ? (
                            <ActivityIndicator color="#000" size="small" />
                        ) : (
                            <Ionicons name="arrow-up" size={20} color="#000" />
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050806' },

    header: {
        paddingTop: 50, paddingBottom: 16, paddingHorizontal: 20,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        borderBottomWidth: 1, borderBottomColor: '#1A2E22', backgroundColor: '#050806',
        zIndex: 10
    },
    backBtn: { padding: 4 },
    headerTitleBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff' },

    chatContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },

    msgBubble: {
        maxWidth: '80%', padding: 14, borderRadius: 18, marginBottom: 16
    },
    aiBubble: {
        alignSelf: 'flex-start', backgroundColor: '#1A2E22', borderBottomLeftRadius: 4
    },
    userBubble: {
        alignSelf: 'flex-end', backgroundColor: '#25D366', borderBottomRightRadius: 4
    },

    msgText: { fontSize: 15, lineHeight: 22 },
    aiText: { color: '#E0E0E0' },
    userText: { color: '#000', fontWeight: '600' },

    linkButton: {
        marginTop: 12, backgroundColor: 'rgba(37, 211, 102, 0.2)',
        flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12,
        borderRadius: 8, alignSelf: 'flex-start', gap: 6,
        borderWidth: 1, borderColor: '#25D366'
    },
    linkText: { fontSize: 12, fontWeight: 'bold', color: '#25D366' },

    inputContainer: {
        flexDirection: 'row', alignItems: 'center', padding: 16,
        backgroundColor: '#0A0A0A', borderTopWidth: 1, borderTopColor: '#1A1A1A'
    },
    input: {
        flex: 1, backgroundColor: '#1A1A1A', color: '#fff',
        borderRadius: 24, paddingHorizontal: 16, paddingVertical: 12,
        fontSize: 15, marginRight: 12, borderWidth: 1, borderColor: '#333'
    },
    sendButton: {
        width: 44, height: 44, borderRadius: 22, backgroundColor: '#25D366',
        justifyContent: 'center', alignItems: 'center'
    },
    sendDisabled: { backgroundColor: '#333', opacity: 0.7 }
});
