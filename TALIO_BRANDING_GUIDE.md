# 🦊 Talio HRMS Branding Integration Guide

## 📋 Overview
This guide will help you integrate your Talio branding (fox logo and Talio text logo) into your HRMS application.

---

## 🎨 Step 1: Generate PWA Icons

1. **Open the Icon Generator:**
   - Navigate to: `http://localhost:3000/talio-icon-generator.html`
   - Or open the file: `public/talio-icon-generator.html` in your browser

2. **Upload Your Fox Logo:**
   - Drag and drop your fox icon image (the teal/turquoise fox logo)
   - Or click to browse and select the file
   - **Recommended:** Use a PNG with transparent background, square format (e.g., 512x512px or 1024x1024px)

3. **Download All Icons:**
   - Click the "📦 Download All Icons as ZIP" button
   - This will download a file called `talio-pwa-icons.zip`

4. **Extract and Replace:**
   - Extract the ZIP file
   - Copy all files from the `icons` folder to `public/icons/` (replace existing files)
   - Copy `favicon.png` to `public/favicon.png` (replace existing file)

---

## 📁 Step 2: Save Your Logo Files

Save your logo images in the `public` folder with these exact names:

### Required Files:

1. **`public/talio-logo.png`**
   - The "Talio" text logo (your first image with teal/turquoise text)
   - Recommended size: 800x200px or similar wide format
   - Transparent background preferred

2. **`public/fox-icon.png`**
   - The fox/wolf icon logo (your second/third image)
   - Recommended size: 512x512px (square)
   - Transparent background preferred

3. **`public/favicon.ico`** (Optional)
   - Convert your fox icon to .ico format
   - Size: 32x32px or 16x16px
   - You can use online tools like https://favicon.io/favicon-converter/

---

## 🔧 Step 3: Update Application Code

Once you've saved the logo files, I'll update the following files to use your Talio branding:

### Files to Update:

1. ✅ **`components/Sidebar.js`**
   - Replace "HR" icon with fox logo
   - Keep "Tailo" text branding

2. ✅ **`app/login/page.js`**
   - Replace "HR" icon with fox logo
   - Update title to "Talio HRMS"

3. ✅ **`app/layout.js`**
   - Update page title to "Talio HRMS"
   - Update favicon references

4. ✅ **`public/manifest.json`**
   - Update app name to "Talio HRMS"
   - Update description

---

## 🎯 Step 4: Verify Integration

After updating the code, verify the branding appears correctly:

### Desktop/Browser:
- ✅ Browser tab shows fox favicon
- ✅ Sidebar shows fox icon + "Tailo" text
- ✅ Login page shows fox icon + "Talio HRMS" title

### Mobile/PWA:
- ✅ App icon shows fox logo when installed
- ✅ Splash screen shows fox logo
- ✅ App name shows "Talio HRMS" or "Talio"

---

## 🚀 Step 5: Deploy

After verifying locally:

1. **Commit Changes:**
   ```bash
   git add .
   git commit -m "Add Talio branding and fox logo"
   git push
   ```

2. **Deploy to Vercel:**
   - Vercel will automatically deploy your changes
   - Or manually trigger deployment from Vercel dashboard

3. **Clear Cache:**
   - Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
   - Clear PWA cache if needed
   - Reinstall PWA on mobile to see new icon

---

## 📊 Branding Color Scheme

Based on your logos, here are the Talio brand colors:

- **Primary Teal:** `#5F9EA0` (Cadet Blue)
- **Light Teal:** `#7FCDCD` (Medium Turquoise)
- **Dark Teal:** `#4A7C7E` (Darker shade)

You can optionally update the theme colors in:
- `app/layout.js` - Change `themeColor: '#3b82f6'` to `themeColor: '#5F9EA0'`
- `public/manifest.json` - Change `"theme_color": "#3b82f6"` to `"theme_color": "#5F9EA0"`
- `tailwind.config.js` - Add custom Talio colors

---

## 🎨 Optional: Update Theme Colors

If you want to match the entire app theme to your Talio branding colors:

### Update `tailwind.config.js`:
```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        talio: {
          50: '#f0fffe',
          100: '#ccfffe',
          200: '#99fffe',
          300: '#5dfffd',
          400: '#2df0f0',
          500: '#7FCDCD', // Light Teal
          600: '#5F9EA0', // Primary Teal
          700: '#4A7C7E', // Dark Teal
          800: '#3d6466',
          900: '#355254',
        },
      },
    },
  },
}
```

Then replace `bg-blue-500`, `text-blue-600`, etc. with `bg-talio-600`, `text-talio-600`, etc.

---

## ✅ Checklist

Before you tell me you're ready, make sure you have:

- [ ] Saved fox icon as `public/fox-icon.png`
- [ ] Saved Talio text logo as `public/talio-logo.png`
- [ ] Generated and replaced all PWA icons in `public/icons/`
- [ ] Replaced `public/favicon.png`
- [ ] (Optional) Created `public/favicon.ico`

Once you've completed these steps, let me know and I'll update all the code files to integrate your Talio branding! 🎉

---

## 📞 Need Help?

If you encounter any issues:
1. Make sure all image files are in the correct locations
2. Check that image files are named exactly as specified (case-sensitive)
3. Verify images are in PNG format (except favicon.ico)
4. Hard refresh your browser after changes (Ctrl+Shift+R)

---

**Ready to proceed?** Let me know when you've saved the logo files and I'll update the code! 🚀

