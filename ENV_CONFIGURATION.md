# Environment Configuration

## ⚠️ IMPORTANT: Single .env File Policy

**This project now uses ONLY `.env` for all environment configurations.**

### What Changed

- **Before**: Used both `.env` and `.env.local` files
- **After**: Only `.env` is used across all environments (development, production, server)

### Why This Change?

1. **Consistency**: Same configuration file everywhere prevents confusion
2. **Simplicity**: No need to manage multiple env files
3. **Production Issues**: `.env.local` was causing issues on production servers
4. **Standard Practice**: `.env` is the industry standard (not `.env.local`)

### File Structure

```
.env                    ✅ ONLY file used - NOT tracked in git (contains secrets)
.env.local             ❌ IGNORED - do not create
.env.example           ✅ Template for reference - tracked in git
.gitignore             ✅ Updated to ignore both .env and .env.local
```

### Configuration Sections in .env

The `.env` file contains all necessary configuration:

1. **Database Configuration** - MongoDB connection
2. **Authentication & Security** - NextAuth, JWT secrets
3. **Application Configuration** - App name, URLs
4. **Email Configuration** - SMTP settings
5. **File Upload Configuration** - Upload limits and directories
6. **Firebase Cloud Messaging** - FCM service account
7. **Maya AI Assistant** - OpenAI API configuration
8. **ElevenLabs Voice** - Voice synthesis API
9. **Google OAuth** - OAuth client credentials
10. **Optional Configurations** - Node env, rate limits, etc.

### For Developers

#### Initial Setup
```bash
# Copy the example file to create your .env
cp .env.example .env

# Edit .env with your actual values
nano .env  # or use your preferred editor
```

#### Local Development
```bash
# Just use .env - no need to create .env.local
npm run dev
```

#### Production Deployment
```bash
# The same .env file is used
# Update values for production URLs and credentials
npm run build
npm start
```

#### Server Deployment
```bash
# Deploy script uses .env
./deploy-server.sh
```

### Migration from .env.local

If you have an existing `.env.local` file:

1. **Backup**: Copy any custom values from `.env.local`
2. **Merge**: Add those values to `.env`
3. **Delete**: Remove `.env.local` file
4. **Verify**: Ensure `.env` is in `.gitignore` (it should be)

### Scripts Updated

The following scripts have been updated to use `.env` instead of `.env.local`:

- `scripts/setup-local-env.js` - Now backs up and modifies `.env`
- `scripts/restore-atlas-env.js` - Now restores `.env`
- All deployment scripts - Use `.env` only

### Security Note

⚠️ **Important**: `.env` contains secrets and is NOT tracked in git:

1. **Never commit `.env` to git** - it's in `.gitignore` for security
2. Each developer/server should have their own `.env` file
3. Use `.env.example` as a template for what variables are needed
4. For production, create `.env` on the server with production values
5. For team sharing, use secure secret management tools (not git)

### Troubleshooting

**Issue**: Application not reading environment variables

**Solution**: 
1. Ensure `.env` file exists in project root
2. Restart the development server
3. Check that `.env.local` does NOT exist (it takes precedence if present)

**Issue**: Different behavior in production

**Solution**:
1. Verify `.env` file is present on production server
2. Check that values are correct for production environment
3. Ensure no `.env.local` file exists on server

### Support

For questions or issues related to environment configuration:
1. Check this document first
2. Review `.env.example` for reference
3. Contact the development team

