#!/bin/bash
# switch-env.sh — Chuyển đổi giữa local và production
# Dùng: bash switch-env.sh local
#       bash switch-env.sh prod

case "$1" in
  local|dev)
    echo "🔧 Chuyển sang LOCAL backend (localhost:3000)"
    cp .env.local .env
    echo "✅ Done! File .env đã được cập nhật."
    echo "→ Chạy: npx expo start"
    ;;
  prod|production|render)
    echo "🌐 Chuyển sang PRODUCTION backend (Render)"
    cp .env.production .env
    echo "✅ Done! File .env đã được cập nhật."
    echo "→ Chạy: npx expo start"
    ;;
  *)
    echo "Cách dùng: bash switch-env.sh {local|prod}"
    echo ""
    echo "  local  → dùng http://localhost:3000/api"
    echo "  prod   → dùng https://expense-tracker-app-ee14.onrender.com/api"
    ;;
esac
