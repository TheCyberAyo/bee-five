#!/bin/bash

# Script to generate a release keystore for Bee Five app
# Run this from the android/app directory

echo "=========================================="
echo "Bee Five Release Keystore Generator"
echo "=========================================="
echo ""
echo "This script will help you generate a keystore for signing your release builds."
echo "IMPORTANT: Keep your keystore file and passwords secure!"
echo ""

# Check if keystore already exists
if [ -f "release.keystore" ]; then
    echo "⚠️  WARNING: release.keystore already exists!"
    read -p "Do you want to overwrite it? (yes/no): " overwrite
    if [ "$overwrite" != "yes" ]; then
        echo "Aborted."
        exit 1
    fi
    rm -f release.keystore
fi

echo "Please provide the following information:"
echo ""

# Get keystore details
read -p "Keystore password (save this securely!): " -s store_password
echo ""
read -p "Re-enter keystore password: " -s store_password_confirm
echo ""

if [ "$store_password" != "$store_password_confirm" ]; then
    echo "❌ Passwords don't match. Aborted."
    exit 1
fi

read -p "Key alias [beefive-release-key]: " key_alias
key_alias=${key_alias:-beefive-release-key}

read -p "Key password (can be same as keystore): " -s key_password
echo ""

read -p "Validity in days [10000]: " validity
validity=${validity:-10000}

read -p "Your name [MindGrind]: " name
name=${name:-MindGrind}

read -p "Organization [MindGrind]: " org
org=${org:-MindGrind}

read -p "City: " city
read -p "State/Province: " state
read -p "Country code (2 letters) [ZA]: " country
country=${country:-ZA}

echo ""
echo "Generating keystore..."

# Generate keystore
keytool -genkeypair -v \
    -storetype PKCS12 \
    -keystore release.keystore \
    -alias "$key_alias" \
    -keyalg RSA \
    -keysize 2048 \
    -validity "$validity" \
    -storepass "$store_password" \
    -keypass "$key_password" \
    -dname "CN=$name, OU=Development, O=$org, L=$city, ST=$state, C=$country"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Keystore generated successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Create android/keystore.properties file"
    echo "2. Add the following content:"
    echo ""
    echo "MYAPP_RELEASE_STORE_FILE=app/release.keystore"
    echo "MYAPP_RELEASE_KEY_ALIAS=$key_alias"
    echo "MYAPP_RELEASE_STORE_PASSWORD=$store_password"
    echo "MYAPP_RELEASE_KEY_PASSWORD=$key_password"
    echo ""
    echo "3. Add keystore.properties to .gitignore"
    echo "4. Keep your keystore and passwords secure!"
else
    echo ""
    echo "❌ Failed to generate keystore. Please check the errors above."
    exit 1
fi



















