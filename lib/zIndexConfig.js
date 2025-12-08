/**
 * Centralized Z-Index Configuration for Talio
 * 
 * This ensures consistent layering across the application.
 * Higher z-index values appear on top of lower values.
 */

export const Z_INDEX = {
    // Base layers (0-99)
    BASE: 0,
    BELOW_CONTENT: 10,

    // Content layers (100-999)
    CONTENT: 100,
    DROPDOWN: 200,
    STICKY: 300,

    // Navigation (1000-1999)
    BOTTOM_NAV: 40,
    SIDEBAR: 50,
    HEADER: 60,

    // Overlays (2000-8999)
    TOOLTIP: 2000,
    POPOVER: 3000,

    // Modals (9000-9899)
    MODAL_BACKDROP: 9000,
    MODAL: 9100,
    MODAL_NESTED: 9200,

    // Critical UI (9900-9999)
    ACTIVITY_SESSION: 9900,
    OVERTIME_PROMPT: 9950,
    OUT_OF_PREMISES: 9950,

    // Top layer (10000+)
    TOAST: 10000,
    FLOATING_CHAT: 9999,
}

/**
 * Tailwind CSS class names for z-index values
 */
export const Z_INDEX_CLASSES = {
    BASE: 'z-0',
    BELOW_CONTENT: 'z-10',

    CONTENT: 'z-[100]',
    DROPDOWN: 'z-[200]',
    STICKY: 'z-[300]',

    BOTTOM_NAV: 'z-[40]',
    SIDEBAR: 'z-50',
    HEADER: 'z-[60]',

    TOOLTIP: 'z-[2000]',
    POPOVER: 'z-[3000]',

    MODAL_BACKDROP: 'z-[9000]',
    MODAL: 'z-[9100]',
    MODAL_NESTED: 'z-[9200]',

    ACTIVITY_SESSION: 'z-[9900]',
    OVERTIME_PROMPT: 'z-[9950]',
    OUT_OF_PREMISES: 'z-[9950]',

    TOAST: 'z-[10000]',
    FLOATING_CHAT: 'z-[9999]',
}

export default Z_INDEX
