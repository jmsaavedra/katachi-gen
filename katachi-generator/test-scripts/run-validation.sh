#!/bin/bash

# Template Validation Runner
# This script should be run AFTER webpack build completes

echo "🚀 Starting Template Validation Process..."
echo "=============================================="

# Check if validation script exists
if [ ! -f "./validate-template.js" ]; then
    echo "❌ Error: validate-template.js not found"
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed or not in PATH"
    exit 1
fi

# Check if backup exists
if [ ! -f "./dist/template-original-backup.html" ]; then
    echo "❌ Error: Original template backup not found at ./dist/template-original-backup.html"
    echo "💡 Please run the backup creation first or ensure the backup file exists"
    exit 1
fi

# Check if new template exists
if [ ! -f "./dist/template.html" ]; then
    echo "❌ Error: New template.html not found at ./dist/template.html"
    echo "💡 Please run the webpack build first to generate the template"
    exit 1
fi

echo "📂 Files found:"
echo "   ✅ Original: ./dist/template-original-backup.html"
echo "   ✅ New: ./dist/template.html" 
echo "   ✅ Validator: ./validate-template.js"
echo ""

# Run validation
echo "🔍 Running validation..."
node ./validate-template.js

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 VALIDATION COMPLETED SUCCESSFULLY!"
    echo "✅ EJS modularization is working correctly"
    echo "✅ Template produces identical output"
    echo ""
    echo "📋 Next steps:"
    echo "   - Deploy the new modularized template"
    echo "   - Update build process to use EJS templates" 
    echo "   - Consider cleaning up backup files after deployment"
    echo ""
    exit 0
else
    echo ""
    echo "⚠️  VALIDATION FOUND ISSUES"
    echo "❌ Please review the validation report and fix issues before deployment"
    echo ""
    echo "📋 Troubleshooting steps:"
    echo "   1. Check the validation report (validation-report.json)"
    echo "   2. Review differences in critical sections"
    echo "   3. Verify EJS template includes all required components"
    echo "   4. Re-run webpack build if changes are made"
    echo "   5. Run validation again until all issues are resolved"
    echo ""
    exit 1
fi