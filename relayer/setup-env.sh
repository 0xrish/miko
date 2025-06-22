#!/bin/bash

# Miko Relayer Environment Setup Script
# =====================================

set -e  # Exit on any error

echo "🚀 Miko Relayer Environment Setup"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Not in relayer directory. Please run this script from the relayer folder."
    exit 1
fi

# Check for existing .env file
if [ -f ".env" ]; then
    print_warning "Existing .env file found."
    echo ""
    echo "Choose an option:"
    echo "1) Backup existing .env and create new one"
    echo "2) Keep existing .env file"
    echo "3) Exit"
    echo ""
    read -p "Enter your choice (1-3): " choice
    
    case $choice in
        1)
            timestamp=$(date +%Y%m%d_%H%M%S)
            mv .env .env.backup_$timestamp
            print_status "Existing .env backed up to .env.backup_$timestamp"
            ;;
        2)
            print_info "Keeping existing .env file. You can manually update it if needed."
            exit 0
            ;;
        3)
            print_info "Exiting setup."
            exit 0
            ;;
        *)
            print_error "Invalid choice. Exiting."
            exit 1
            ;;
    esac
fi

echo ""
echo "Select your environment:"
echo "1) Development (Devnet)"
echo "2) Mainnet Testing" 
echo "3) Production"
echo ""
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        cp .env.development .env
        echo "✅ Development environment configured!"
        ;;
    2)
        cp .env.example .env
        echo "✅ Mainnet testing environment configured!"
        echo "⚠️  Update SOLANA_RPC with your endpoint"
        ;;
    3)
        cp .env.production .env
        echo "✅ Production environment configured!"
        echo "⚠️  Update production values before starting"
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

# Create secrets directory
mkdir -p secrets
chmod 700 secrets

echo ""
echo "🎉 Setup complete!"
echo "Next: npm start"

# Check for required dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    print_status "Dependencies installed!"
else
    print_info "Dependencies already installed."
fi

echo ""
echo "🎯 Next Steps:"
echo ""

case $choice in
    1)
        echo "1. Get devnet SOL: https://faucet.solana.com/"
        echo "2. Start the server: npm start"
        echo "3. Test the API: npm run test"
        echo "4. View API docs: http://localhost:3000/api-docs"
        ;;
    2)
        echo "1. Edit .env file and update:"
        echo "   - SOLANA_RPC (your RPC endpoint)"
        echo "   - Other settings as needed"
        echo "2. Fund your wallet with SOL"
        echo "3. Start the server: npm start"
        echo "4. Test with small amounts first"
        ;;
    3)
        echo "1. ⚠️  CRITICAL: Update .env with production values:"
        echo "   - SOLANA_RPC=https://your-premium-rpc.com"
        echo "   - CORS_ORIGINS=https://yourdomain.com"
        echo "   - API_KEY=your-secure-key"
        echo "   - MONITORING_WEBHOOK_URL=https://your-monitoring.com"
        echo "2. Set up SSL certificates"
        echo "3. Configure monitoring and alerting"
        echo "4. Run security audit: npm audit"
        echo "5. Start server: npm start"
        ;;
esac

echo ""
echo "📚 Documentation:"
echo "   - Environment guide: ENV_SETUP.md"
echo "   - Main documentation: README.md"
echo "   - API testing: npm run test"
echo ""

# Offer to open the .env file for editing
if command -v nano >/dev/null 2>&1; then
    echo ""
    read -p "📝 Do you want to edit the .env file now? (y/n): " edit_choice
    if [ "$edit_choice" = "y" ] || [ "$edit_choice" = "Y" ]; then
        nano .env
    fi
elif command -v vim >/dev/null 2>&1; then
    echo ""
    read -p "📝 Do you want to edit the .env file now? (y/n): " edit_choice
    if [ "$edit_choice" = "y" ] || [ "$edit_choice" = "Y" ]; then
        vim .env
    fi
fi

print_status "Setup complete! 🎉"
echo ""
echo "Start your relayer with: npm start" 