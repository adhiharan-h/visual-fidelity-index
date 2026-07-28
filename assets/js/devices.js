/**
 * devices.js — VFI Device Database
 *
 * A curated list of real display products with their specifications.
 * Each entry includes the native resolution, physical screen size,
 * and a sensible default viewing distance for that product category.
 *
 * Contributing: To add a device, append an object following the same
 * schema and open a pull request. Please verify specs against the
 * manufacturer's official product page.
 *
 * Schema:
 *   name        {string}  — Display name shown in the UI
 *   cat         {string}  — Category: 'monitor' | 'laptop' | 'phone' | 'tv'
 *   w           {number}  — Native horizontal resolution (pixels)
 *   h           {number}  — Native vertical resolution (pixels)
 *   size        {number}  — Diagonal screen size (inches)
 *   typicalDist {number}  — Typical viewing distance for this category (inches)
 */

export const DEVICES = [
    // ---- Monitors ----
    { name: 'Dell U2723QE 27" 4K',              cat: 'monitor', w: 3840, h: 2160, size: 27,   typicalDist: 24 },
    { name: 'LG 27GN800 27" 1440p 144Hz',       cat: 'monitor', w: 2560, h: 1440, size: 27,   typicalDist: 24 },
    { name: 'ASUS PA278QV 27" 1440p',           cat: 'monitor', w: 2560, h: 1440, size: 27,   typicalDist: 24 },
    { name: 'BenQ EW2480 24" 1080p',            cat: 'monitor', w: 1920, h: 1080, size: 24,   typicalDist: 22 },
    { name: 'Generic 27" 1080p',                cat: 'monitor', w: 1920, h: 1080, size: 27,   typicalDist: 24 },
    { name: 'Samsung Odyssey G7 32" 1440p',     cat: 'monitor', w: 2560, h: 1440, size: 32,   typicalDist: 26 },
    { name: 'LG 32UN880 32" 4K',                cat: 'monitor', w: 3840, h: 2160, size: 32,   typicalDist: 26 },
    { name: 'ASUS ROG PG279QM 27" 1440p',       cat: 'monitor', w: 2560, h: 1440, size: 27,   typicalDist: 24 },
    { name: 'AOC U28G2X 28" 4K',               cat: 'monitor', w: 3840, h: 2160, size: 28,   typicalDist: 24 },
    { name: 'Alienware AW3423DW 34" QD-OLED',  cat: 'monitor', w: 3440, h: 1440, size: 34,   typicalDist: 28 },
    { name: 'LG 34WP85C 34" UltraWide 1440p',  cat: 'monitor', w: 3440, h: 1440, size: 34,   typicalDist: 28 },
    { name: 'LG 27GP850 27" 1440p 165Hz',      cat: 'monitor', w: 2560, h: 1440, size: 27,   typicalDist: 24 },

    // ---- Laptops ----
    { name: 'MacBook Pro 14" M3 Pro',           cat: 'laptop',  w: 3024, h: 1964, size: 14.2, typicalDist: 18 },
    { name: 'MacBook Pro 16" M3 Pro',           cat: 'laptop',  w: 3456, h: 2234, size: 16.2, typicalDist: 20 },
    { name: 'MacBook Air 13" M2',               cat: 'laptop',  w: 2560, h: 1664, size: 13.6, typicalDist: 18 },
    { name: 'Dell XPS 13 OLED',                cat: 'laptop',  w: 3456, h: 2160, size: 13.4, typicalDist: 18 },
    { name: 'ThinkPad X1 Carbon Gen 11',        cat: 'laptop',  w: 2880, h: 1800, size: 14,   typicalDist: 18 },
    { name: 'Surface Laptop 5 13.5"',           cat: 'laptop',  w: 2256, h: 1504, size: 13.5, typicalDist: 18 },
    { name: 'ASUS ZenBook 14 OLED',             cat: 'laptop',  w: 2880, h: 1800, size: 14,   typicalDist: 18 },
    { name: 'Budget Laptop 15" 768p',           cat: 'laptop',  w: 1366, h: 768,  size: 15.6, typicalDist: 20 },
    { name: 'HP Spectre x360 14"',              cat: 'laptop',  w: 2560, h: 1600, size: 14,   typicalDist: 18 },

    // ---- Phones ----
    { name: 'iPhone 15 Pro Max',               cat: 'phone',   w: 2796, h: 1290, size: 6.7,  typicalDist: 14 },
    { name: 'iPhone 15',                       cat: 'phone',   w: 2556, h: 1179, size: 6.1,  typicalDist: 14 },
    { name: 'Samsung Galaxy S24 Ultra',        cat: 'phone',   w: 3088, h: 1440, size: 6.8,  typicalDist: 14 },
    { name: 'Google Pixel 8 Pro',              cat: 'phone',   w: 2992, h: 1344, size: 6.7,  typicalDist: 14 },
    { name: 'OnePlus 12 6.82"',                cat: 'phone',   w: 3168, h: 1440, size: 6.82, typicalDist: 14 },
    { name: 'Samsung Galaxy A54',              cat: 'phone',   w: 2340, h: 1080, size: 6.4,  typicalDist: 14 },

    // ---- TVs ----
    { name: 'LG C3 55" OLED 4K',               cat: 'tv',      w: 3840, h: 2160, size: 55,   typicalDist: 72  },
    { name: 'LG C3 65" OLED 4K',               cat: 'tv',      w: 3840, h: 2160, size: 65,   typicalDist: 84  },
    { name: 'Sony Bravia XR 55" 4K',           cat: 'tv',      w: 3840, h: 2160, size: 55,   typicalDist: 72  },
    { name: 'Samsung QN90C 65" 4K',            cat: 'tv',      w: 3840, h: 2160, size: 65,   typicalDist: 84  },
    { name: 'Generic 55" 1080p TV',            cat: 'tv',      w: 1920, h: 1080, size: 55,   typicalDist: 72  },
    { name: 'TCL 65" 4K Roku TV',              cat: 'tv',      w: 3840, h: 2160, size: 65,   typicalDist: 84  },
    { name: 'LG 75" 4K NanoCell',              cat: 'tv',      w: 3840, h: 2160, size: 75,   typicalDist: 96  },
    { name: 'Samsung 32" Full HD (bedroom)',    cat: 'tv',      w: 1920, h: 1080, size: 32,   typicalDist: 48  },
];
