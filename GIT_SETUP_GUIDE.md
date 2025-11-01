# Git Setup Guide for Private Repository

## Current Status
- ✅ Git repository initialized
- ✅ All files committed locally
- ✅ Remote added: https://github.com/avirajsharma-ops/Tailo.git
- ⏳ Need authentication to push to private repository

## Option 1: Personal Access Token (Recommended)

### Step 1: Create a Personal Access Token on GitHub

1. Go to GitHub.com and log in
2. Click your profile picture (top right) → **Settings**
3. Scroll down and click **Developer settings** (bottom left)
4. Click **Personal access tokens** → **Tokens (classic)**
5. Click **Generate new token** → **Generate new token (classic)**
6. Give it a name: `Talio Project`
7. Set expiration: Choose your preference (e.g., 90 days or No expiration)
8. Select scopes:
   - ✅ **repo** (Full control of private repositories)
   - ✅ **workflow** (if you plan to use GitHub Actions)
9. Click **Generate token**
10. **IMPORTANT**: Copy the token immediately (you won't see it again!)

### Step 2: Update Git Remote with Token

Once you have your token, run this command (replace `YOUR_TOKEN` with your actual token):

```bash
git remote set-url origin https://YOUR_TOKEN@github.com/avirajsharma-ops/Tailo.git
```

### Step 3: Push to GitHub

```bash
git push -u origin main
```

---

## Option 2: Use SSH (Alternative)

### Step 1: Generate SSH Key (if you don't have one)

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

Press Enter to accept default location, and optionally set a passphrase.

### Step 2: Add SSH Key to GitHub

1. Copy your public key:
```bash
cat ~/.ssh/id_ed25519.pub
```

2. Go to GitHub.com → Settings → SSH and GPG keys
3. Click **New SSH key**
4. Paste your public key and save

### Step 3: Update Remote to Use SSH

```bash
git remote set-url origin git@github.com:avirajsharma-ops/Tailo.git
```

### Step 4: Push to GitHub

```bash
git push -u origin main
```

---

## Option 3: GitHub CLI (gh)

If you have GitHub CLI installed:

```bash
gh auth login
git push -u origin main
```

---

## After Successful Push

Once you've successfully pushed, you can verify by:

1. Visiting: https://github.com/avirajsharma-ops/Tailo
2. You should see all your files and the commit message

---

## Future Commits

After the initial setup, making future commits is simple:

```bash
# Make your changes, then:
git add .
git commit -m "Your commit message"
git push
```

---

## Quick Commands Reference

```bash
# Check status
git status

# View commit history
git log --oneline

# View remote
git remote -v

# Pull latest changes
git pull

# Create a new branch
git checkout -b feature-name

# Switch branches
git checkout main
```

---

## Troubleshooting

### If you get "Authentication failed"
- Double-check your token is correct
- Make sure the token has `repo` scope
- Token might have expired

### If you get "Permission denied"
- Check if you're the owner/collaborator of the repository
- Verify the repository name is correct

### If you want to change the token later
```bash
git remote set-url origin https://NEW_TOKEN@github.com/avirajsharma-ops/Tailo.git
```

---

## Security Note

⚠️ **Never commit your Personal Access Token to the repository!**
- Tokens should be kept secret
- If accidentally committed, revoke it immediately and generate a new one

