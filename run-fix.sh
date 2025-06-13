#!/bin/bash

# Auto-fix all ESLint issues
npm run lint:fix

# Check if there are still any remaining issues
npm run lint

echo "If no errors are shown above, all ESLint issues have been fixed!"
