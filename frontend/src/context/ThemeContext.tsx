import { createContext, useContext, useState, ReactNode } from 'react';
import { getTheme, Theme } from '../utils/themes';

interface ThemeContextType {
    activeCategory: string;
    activeTheme?: string;
    setActiveCategory: (category: string, themeSlug?: string) => void;
    currentTheme: Theme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [activeCategory, setActiveCategoryState] = useState('all');
    const [activeTheme, setActiveTheme] = useState('all');

    const setActiveCategory = (category: string, themeSlug?: string) => {
        setActiveCategoryState(category);
        if (themeSlug) {
            setActiveTheme(themeSlug);
        } else {
            setActiveTheme(category);
        }
    };

    const currentTheme = getTheme(activeTheme);

    return (
        <ThemeContext.Provider value={{ activeCategory, activeTheme, setActiveCategory, currentTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useThemeContext() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useThemeContext must be used within a ThemeProvider');
    }
    return context;
}
