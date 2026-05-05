#!/usr/bin/env bash
# deploy.sh — Build GymApp and prepare for HostGator upload
# Usage: ./deploy.sh
# Requires: Node.js, npm
# Target: gym.joekyy.com.br (subdomain on HostGator)

set -e

echo "🏋 GymApp Deploy Script"
echo "========================"

# 1. Build static export
echo ""
echo "📦 Building static export..."
npm run build

# 2. Remove videos from out/ — too large for shared hosting (4.6GB)
# ExerciseMedia automatically falls back to JPEG when video is unavailable.
echo ""
echo "🗑  Removing videos from out/ (4.6GB — not needed on HostGator)..."
rm -rf out/data/media/videos/

# 3. Verify key files
echo ""
echo "✅ Verifying output..."
[ -f out/index.html ]        && echo "   ✓ index.html"
[ -f out/manifest.json ]     && echo "   ✓ manifest.json"
[ -f out/.htaccess ]         && echo "   ✓ .htaccess"
[ -d out/icons ]             && echo "   ✓ icons/"
[ -d out/data/media/images ] && echo "   ✓ data/media/images/ (JPEGs)"
[ ! -d out/data/media/videos ] && echo "   ✓ videos excluded (not uploaded)"

# 4. Show size summary
echo ""
echo "📊 Output size (without videos):"
du -sh out/

echo ""
echo "🚀 Ready to deploy!"
echo ""
echo "Upload instructions:"
echo "  1. Open HostGator cPanel → File Manager"
echo "  2. Navigate to the subdomain root for gym.joekyy.com.br"
echo "     (usually ~/public_html/ if subdomain root, or ~/public_html/gym/)"
echo "  3. Upload all contents of ./out/ to that folder"
echo "     OR use SFTP:"
echo "     rsync -avz --progress out/ user@joekyy.com.br:public_html/"
echo ""
echo "  After upload, visit: https://gym.joekyy.com.br"
echo "  On iPhone Safari: Share → Adicionar à Tela de Início"
