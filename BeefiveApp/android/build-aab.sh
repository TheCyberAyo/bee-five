#!/bin/bash

# Build script for generating Android App Bundle (AAB) for Google Play Store
# Usage: ./build-aab.sh

set -e

echo "=========================================="
echo "Building Bee-Five AAB for Play Store"
echo "=========================================="
echo ""

# Check if keystore.properties exists
if [ ! -f "keystore.properties" ]; then
    echo "⚠️  WARNING: keystore.properties not found!"
    echo "   Release builds require a keystore for signing."
    echo "   Run generate-keystore.sh first, or create keystore.properties manually."
    echo ""
    read -p "Continue with debug signing? (yes/no): " continue
    if [ "$continue" != "yes" ]; then
        echo "Aborted. Please set up keystore first."
        exit 1
    fi
fi

# Navigate to android directory
cd "$(dirname "$0")"

echo "Step 1: Cleaning previous builds..."
./gradlew clean

echo ""
echo "Step 2: Building AAB..."
./gradlew bundleRelease

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ AAB built successfully!"
    echo ""
    echo "Location: app/build/outputs/bundle/release/app-release.aab"
    echo ""
    echo "Next steps:"
    echo "1. Upload the AAB to Google Play Console"
    echo "2. Complete the Data Safety form"
    echo "3. Complete the store listing"
    echo "4. Submit for review"
    echo ""
else
    echo ""
    echo "❌ Build failed. Please check the errors above."
    exit 1
fi










