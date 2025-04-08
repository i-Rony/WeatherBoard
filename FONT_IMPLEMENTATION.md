# Font Implementation - Poppins

This document outlines how Poppins font is implemented throughout the WeatherBoard app.

## Font Files

The Poppins font files are stored in the `assets/fonts` directory:
- `Poppins-Light.ttf`
- `Poppins-Regular.ttf`
- `Poppins-Medium.ttf`
- `Poppins-Bold.ttf`

## Configuration

### 1. App.json Config Plugin

The fonts are registered using the expo-font config plugin in `app.json`:

```json
"plugins": [
  [
    "expo-font",
    {
      "fonts": [
        "./assets/fonts/Poppins-Light.ttf",
        "./assets/fonts/Poppins-Regular.ttf",
        "./assets/fonts/Poppins-Medium.ttf",
        "./assets/fonts/Poppins-Bold.ttf"
      ]
    }
  ]
]
```

This embeds the fonts at build time for better performance.

### 2. Font Loading

Fonts are loaded at runtime using the `useFonts` hook defined in `src/utils/FontUtils.ts`. This ensures the fonts are available before rendering the app.

```typescript
// Inside App.tsx
const { fontsLoaded, fontsError } = useFonts();

// Show loading indicator while fonts are loading
if (!fontsLoaded && !fontsError) {
  return <LoadingScreen />;
}
```

## Custom UI Components

### 1. Text Component

A custom Text component (`src/components/ui/Text.tsx`) has been created that uses Poppins font by default. It supports different variants and weights:

```jsx
<Text variant="h1">Heading 1</Text>
<Text variant="body" weight="bold">Bold body text</Text>
```

### 2. TextInput Component

A custom TextInput component (`src/components/ui/TextInput.tsx`) ensures consistent font usage in all input fields:

```jsx
<TextInput 
  variant="filled"
  placeholder="Enter text" 
  value={value}
  onChangeText={setValue}
/>
```

## Theme System

A theme system has been created in `src/utils/Theme.ts` that exports:

1. Font family constants:
```typescript
export const FONTS = {
  POPPINS_LIGHT: 'Poppins-Light',
  POPPINS_REGULAR: 'Poppins-Regular',
  POPPINS_MEDIUM: 'Poppins-Medium',
  POPPINS_BOLD: 'Poppins-Bold',
};
```

2. Text style presets:
```typescript
export const TEXT_STYLES = {
  h1: {
    fontFamily: FONTS.POPPINS_BOLD,
    fontSize: 28,
  },
  body: {
    fontFamily: FONTS.POPPINS_REGULAR,
    fontSize: 16,
  },
  // etc.
};
```

## Usage

To ensure consistent font usage:

1. Use the custom `<Text>` component instead of the React Native one
2. Use the custom `<TextInput>` component for input fields
3. Import font family constants when needed:
   ```typescript
   import { FONTS } from '../utils/FontUtils';
   
   const styles = StyleSheet.create({
     container: {
       fontFamily: FONTS.POPPINS_REGULAR,
     }
   });
   ```