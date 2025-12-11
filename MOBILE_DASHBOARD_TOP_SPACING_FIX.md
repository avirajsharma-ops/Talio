# Mobile Dashboard Top Spacing Fix

## Issue
The user reported an unwanted gap ("margin out of nowhere") between the header and the dashboard content on mobile devices.

## Root Cause
The dashboard content wrapper in `app/dashboard/layout.js` had `py-6` (24px vertical padding) applied for all screen sizes.
```javascript
'px-0 sm:px-6 lg:px-8 py-6'
```
This 24px top padding created a noticeable gap between the header and the content on mobile screens, which the user found undesirable.

## Fix
Modified the padding classes in `app/dashboard/layout.js` to reduce the top padding on mobile while maintaining it on larger screens.
Changed:
```javascript
'px-0 sm:px-6 lg:px-8 py-6'
```
To:
```javascript
'px-0 sm:px-6 lg:px-8 pt-2 pb-6 sm:py-6'
```
- **Mobile**: `pt-2` (8px top padding) - significantly reduced from 24px. `pb-6` (24px bottom padding) - kept for bottom spacing.
- **Desktop (sm+)**: `sm:py-6` - maintains the original 24px top and bottom padding.

Also re-applied `min-h-full` to the wrapper to ensure proper bottom spacing behavior for scrolling content.

## Files Modified
- `app/dashboard/layout.js`
