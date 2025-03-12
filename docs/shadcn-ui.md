# Shadcn/UI Integration Guide

This document provides information on how to use and extend the shadcn/ui components in the Dictation App.

## Overview

The Dictation App uses [shadcn/ui](https://ui.shadcn.com/) components with Tailwind CSS for styling. This provides a consistent, accessible, and customizable UI system.

## Theme

The app supports both light and dark themes through the `ThemeProvider` component. The theme can be toggled using the `ThemeToggle` component in the header.

## Available Components

The following shadcn/ui components are available in the app:

- Button (`src/renderer/components/ui/button.tsx`)
- Card (`src/renderer/components/ui/card.tsx`)
- Input (`src/renderer/components/ui/input.tsx`)
- Label (`src/renderer/components/ui/label.tsx`)
- Select (`src/renderer/components/ui/select.tsx`)
- Switch (`src/renderer/components/ui/switch.tsx`)
- Toggle (`src/renderer/components/ui/toggle.tsx`)

## Adding New Components

To add a new shadcn/ui component:

1. Create a new file in `src/renderer/components/ui/` with the component name
2. Implement the component following the shadcn/ui pattern
3. Import and use the component in your application

## Styling

All styling is done using Tailwind CSS classes. The theme colors and variables are defined in:

- `tailwind.config.js` - Tailwind configuration
- `src/renderer/styles/globals.css` - CSS variables and global styles

## Utility Functions

The `cn` utility function from `src/renderer/lib/utils.ts` is used to merge Tailwind classes conditionally:

```typescript
import { cn } from "../../lib/utils"

// Example usage
<div className={cn("base-class", condition && "conditional-class")}>
  Content
</div>
```

## Best Practices

1. Use the provided components instead of creating new ones when possible
2. Follow the component patterns for consistency
3. Use the theme variables for colors instead of hardcoding values
4. Use the `cn` utility for conditional class names
5. Wrap async components with Suspense for better loading states 