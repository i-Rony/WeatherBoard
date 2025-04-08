# WeatherBoard - A Performance Optimized Weather App

A React Native weather application with optimized network requests, caching, and performance enhancements.

## Features

- **Current Weather**: View detailed information about current weather conditions including temperature, humidity, wind speed, and descriptive information.
- **5-Day Forecast**: See weather predictions for the next five days.
- **Location Search**: Search for cities worldwide using the optimized GeoService.
- **Favorites Management**: Save favorite locations for quick access.
- **Beautiful UI**: Modern interface with custom typography using Poppins font family.
- **Offline Support**: Access previously loaded weather data even without an internet connection.
- **Recent Searches**: Quickly access your recently searched locations.
- **Authentication**: Secure login system backed by AWS Cognito.
- **Map Support**: Showcasing openweathermap's weather layers.
- **Automatic Favorites Sync**: Favorites are automatically updated with fresh weather data on app startup, when returning to the Favorites screen, and during manual refresh.

## Setup Instructions

### Prerequisites
- Node.js (latest LTS version recommended)
- Yarn or npm package manager
- Expo CLI (`npm install -g expo-cli`)
- OpenWeather API key (register at [OpenWeather](https://openweathermap.org/api))
- (Optional) AWS Cognito setup for authentication

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd WeatherBoard
   ```

2. **Install dependencies**
   ```bash
   yarn install
   # or using npm
   npm install
   ```

3. **Configure environment variables**
   - Copy the `.env.example` file to `.env`
   - Add your API keys and endpoints:
     ```
     # OpenWeather API
     EXPO_PUBLIC_OPENWEATHER_API_KEY=your_openweather_api_key_here
     EXPO_PUBLIC_OPENWEATHER_BASE_URL=https://api.openweathermap.org/data/2.5
     EXPO_PUBLIC_OPENWEATHER_GEO_URL=https://api.openweathermap.org/geo/1.0

     # GraphQL API (optional if using)
     EXPO_PUBLIC_GRAPHQL_ENDPOINT=your_graphql_endpoint_here 

     # AWS Cognito (optional for authentication)
     EXPO_PUBLIC_COGNITO_CLIENT_ID=your_cognito_client_id_here
     EXPO_PUBLIC_COGNITO_REGION=your_cognito_region_here
     ```

4. **Start the development server**
   ```bash
   yarn start
   # or using npm
   npm start
   ```

5. **Run on a device or emulator**
   - Press `i` to run on iOS simulator
   - Press `a` to run on Android emulator
   - Scan the QR code using the Expo Go app on your physical device

### Building for Production

**iOS**
```bash
yarn ios
# or
npm run ios
```

**Android**
```bash
yarn android
# or
npm run android
```

**Create a production build**
```bash
yarn prebuild
# followed by
yarn ios
# or
yarn android
```

## Technology Stack

- **React Native**: Core framework for cross-platform mobile development
- **Expo**: Development toolkit and platform
- **Apollo Client**: GraphQL client for data fetching
- **React Navigation**: Navigation library
- **AsyncStorage**: Local storage solution
- **Custom UI Components**: Typography system with Poppins font
- **Expo Vector Icons**: Icon library
- **React Native Maps**: Map integration

## Performance Optimizations

This app implements several performance optimization techniques to ensure fast loading times and responsive UI:

### Network Request Optimizations

1. **Parallel API Requests** - Using `Promise.all` to run multiple API requests in parallel instead of serially.
2. **Request Deduplication** - Preventing duplicate API calls for the same data using an in-flight request cache.
3. **Batched Processing** - Processing API requests in batches to avoid overwhelming the server.
4. **HTTP Caching** - Implementing local caching to minimize network requests.
5. **Offline Support** - Storing requests when offline and syncing when connectivity is restored.

### UI Rendering Optimizations

1. **Memoization** - Using `useMemo` and `React.memo` to prevent unnecessary re-renders of components.
2. **Callback Optimization** - Implementing `useCallback` to ensure function references remain stable across renders.
3. **Component Splitting** - Breaking down large components into smaller, more focused ones.
4. **Virtualization** - Implementing efficient list rendering for large data sets.

### Performance Utilities

1. **Debounce** - Using debounce for search inputs to prevent excessive API calls.
2. **Throttle** - Throttling expensive operations to limit execution frequency.
3. **Conditional Logging** - Disabling console logs in production for better performance.

### Favorites Synchronization Mechanism

The app includes a sophisticated background synchronization system for favorite locations:

1. **App Initialization Sync** - On app startup, the `AppInitService` automatically updates all favorites with fresh weather data if the user is logged in and has an internet connection.
2. **Screen Focus Updates** - When users navigate to the Favorites screen, data is automatically refreshed to ensure up-to-date weather information.
3. **Pull-to-Refresh** - Users can manually trigger updates by pulling down on the Favorites screen.
4. **Batch Processing** - Favorite updates are processed in small batches (3 cities at a time) to prevent API rate limiting and optimize network usage.
5. **Parallel Requests** - Within each batch, API requests run in parallel using `Promise.allSettled` for maximum efficiency.
6. **Smart Caching** - Weather data for favorite cities is stored with timestamps, allowing the app to determine when updates are needed.
7. **Error Handling** - Failed update attempts are gracefully handled and don't prevent other cities from being updated.
8. **Deduplication** - The system identifies and resolves duplicate favorite entries to prevent unnecessary API calls.

## Architecture

The app is structured with clear separation of concerns:

- **Services** - Handle API calls and data processing
- **Components** - Focused UI elements
- **Utilities** - Reusable helper functions
- **Screens** - Main application views
- **Navigation** - Handles routes between screens

## API Services

### WeatherService

Responsible for fetching weather data with optimized loading:

- Parallel requests for current weather and forecast
- Caching for offline use
- Batch processing of queued requests
- Error handling with fallback to cached data

### GeoService

Handles location-based functionality:

- City search with debouncing
- Recent searches cache
- Offline fallback to cached data

## Font System

This app uses Poppins as the primary font throughout the application. The font implementation is documented in [FONT_IMPLEMENTATION.md](./FONT_IMPLEMENTATION.md).

### Using Typography in Components

When creating new components or screens, use the custom `Text` component from our UI library:

```jsx
import { Text } from '../components/ui';

// Usage
<Text variant="h1">Heading 1</Text>
<Text variant="body">Regular body text</Text>
<Text variant="body" weight="bold">Bold body text</Text>
```

Available variants:
- `h1`: Large heading (Poppins Bold, 28px)
- `h2`: Medium heading (Poppins Bold, 24px)
- `h3`: Small heading (Poppins Medium, 20px)
- `body`: Standard body text (Poppins Regular, 16px)
- `bodySmall`: Smaller body text (Poppins Regular, 14px)
- `caption`: Caption text (Poppins Light, 12px)

Available weights:
- `light`
- `regular`
- `medium`
- `bold`

### Using Custom TextInput

For text inputs, use the custom `TextInput` component:

```jsx
import { TextInput } from '../components/ui';

// Usage
<TextInput
  variant="filled" 
  placeholder="Enter text"
  value={value}
  onChangeText={setValue}
/>
```

Available variants:
- `default`: Default styling
- `filled`: Filled background style
- `outlined`: Outlined style with border
