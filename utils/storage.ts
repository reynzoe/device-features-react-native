import AsyncStorage from '@react-native-async-storage/async-storage';
import { TravelEntry } from '../types';

const ENTRIES_KEY = '@travel_diary_entries';

export async function loadEntries(): Promise<TravelEntry[]> {
    try {
        const raw = await AsyncStorage.getItem(ENTRIES_KEY);
        if (!raw) return [];
        return JSON.parse(raw) as TravelEntry[];
    } catch (e) {
        console.error('[storage] loadEntries failed:', e);
        return [];
    }
}

export async function addEntry(entry: TravelEntry): Promise<TravelEntry[]> {
    const current = await loadEntries();
    const updated = [entry, ...current];
    await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(updated));
    return updated;
}

export async function removeEntry(id: string): Promise<TravelEntry[]> {
    const current = await loadEntries();
    const updated = current.filter((e) => e.id !== id);
    await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(updated));
    return updated;
}

export async function updateEntry(
    id: string,
    updates: Partial<Pick<TravelEntry, 'title' | 'description'>>
): Promise<TravelEntry[]> {
    const current = await loadEntries();
    const updated = current.map((entry) =>
        entry.id === id
            ? {
                ...entry,
                ...updates,
            }
            : entry
    );

    await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(updated));
    return updated;
}
