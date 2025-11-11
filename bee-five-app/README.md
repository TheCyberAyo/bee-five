# Bee-Five Mobile App

A React Native mobile app for the Bee-Five Connect Five game.

## Project Structure

This project is organized with separation of concerns to enable team collaboration:

```
bee-five-app/
├── assets/              # Images, fonts, and other static assets
├── components/          # React components organized by feature
│   ├── Header/         # Header components (Profile, Level Indicator, Logo)
│   ├── Bees/           # Flying bee animation components
│   ├── Buttons/        # Game mode button components
│   ├── Footer/         # Footer component
│   └── Title/          # Title and subtitle components
├── constants/          # Shared constants (colors, dimensions)
├── hooks/              # Custom React hooks (animations, state management)
├── utils/              # Utility functions
└── App.js              # Main app entry point
```

## Component Organization

### Header Components (`components/Header/`)
- **Header.js** - Main header container
- **ProfileButton.js** - User profile button
- **LevelIndicator.js** - Level display with staircase visualization

### Bee Components (`components/Bees/`)
- **FlyingBees.js** - Container for all flying bee animations

### Button Components (`components/Buttons/`)
- **GameModeButtons.js** - Game mode selection buttons

### Other Components
- **Footer/Footer.js** - App footer
- **Title/Title.js** - Main title and subtitle

## Constants

### `constants/colors.js`
Centralized color definitions for consistent theming across the app.

### `constants/dimensions.js`
All size and spacing constants for responsive design.

## Hooks

### `hooks/useBeeAnimations.js`
Custom hook that manages all bee animation logic, positions, and scales.
This separates animation concerns from UI components.

## Development Guidelines

1. **Component Separation**: Each component should have a single responsibility
2. **Constants First**: Use constants from `constants/` folder instead of hardcoding values
3. **Reusable Hooks**: Extract complex logic into custom hooks
4. **Feature Folders**: Group related components in feature folders (e.g., `Header/`, `Bees/`)
5. **Props Interface**: Keep component props clear and documented

## Adding New Features

1. Create a new folder in `components/` for your feature
2. Add any new constants to `constants/`
3. Create custom hooks in `hooks/` for complex logic
4. Import and use in the main component

## Team Collaboration

- **Header Team**: Work in `components/Header/`
- **Animation Team**: Work in `components/Bees/` and `hooks/useBeeAnimations.js`
- **UI Team**: Work in `components/Buttons/`, `components/Title/`, `components/Footer/`
- **Styling Team**: Update `constants/colors.js` and `constants/dimensions.js`
