#!/bin/bash

# Quick OpenAI Setup Script
# 快速配置 OpenAI API Key

set -e

echo "============================================"
echo "🤖 Web-Reel OpenAI 快速配置工具"
echo "============================================"
echo ""

# Check if .env.local already exists
if [ -f ".env.local" ]; then
    echo "⚠️  发现已存在的 .env.local 文件"
    echo ""
    echo "当前配置："
    cat .env.local
    echo ""
    read -p "是否要覆盖现有配置？(y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ 取消配置"
        exit 0
    fi
fi

echo ""
echo "📝 请输入你的 OpenAI API Key"
echo "   (获取地址: https://platform.openai.com/api-keys)"
echo ""
read -p "API Key: " -s API_KEY
echo ""

# Validate API key format
if [[ ! $API_KEY =~ ^sk- ]]; then
    echo "❌ 错误：API Key 格式不正确（应该以 'sk-' 开头）"
    exit 1
fi

if [ ${#API_KEY} -lt 20 ]; then
    echo "❌ 错误：API Key 太短，请检查是否完整"
    exit 1
fi

# Optional: API Base URL
echo ""
read -p "是否使用自定义 API Base URL？(N/y): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "API Base URL (默认: https://api.openai.com/v1): " API_BASE
    if [ -z "$API_BASE" ]; then
        API_BASE="https://api.openai.com/v1"
    fi
else
    API_BASE="https://api.openai.com/v1"
fi

# Optional: Model selection
echo ""
echo "选择模型："
echo "  1) gpt-4o-mini (推荐，性价比高)"
echo "  2) gpt-4 (质量更好，成本更高)"
echo "  3) gpt-3.5-turbo (速度快，成本低)"
read -p "选择 (1-3, 默认 1): " MODEL_CHOICE

case $MODEL_CHOICE in
    2)
        MODEL="gpt-4"
        ;;
    3)
        MODEL="gpt-3.5-turbo"
        ;;
    *)
        MODEL="gpt-4o-mini"
        ;;
esac

# Create .env.local file
cat > .env.local << EOF
# OpenAI API Configuration
# This file is ignored by git for security

# API Key (required)
VITE_OPENAI_API_KEY=$API_KEY

# API Base URL (optional)
VITE_OPENAI_API_BASE=$API_BASE

# Model (optional)
VITE_OPENAI_MODEL=$MODEL
EOF

echo ""
echo "✅ 配置已保存到 .env.local"
echo ""
echo "📋 配置摘要："
echo "   - API Key: ${API_KEY:0:10}...${API_KEY: -4} (已隐藏)"
echo "   - API Base: $API_BASE"
echo "   - Model: $MODEL"
echo ""
echo "🔒 安全提示："
echo "   - .env.local 已被 .gitignore 忽略，不会被提交"
echo "   - 请勿将此文件分享给他人"
echo ""
echo "🚀 下一步："
echo "   1. 重启开发服务器: npm run dev"
echo "   2. 访问应用并测试 AI 分析功能"
echo ""
echo "💡 提示："
echo "   - 配置存储在: $(pwd)/.env.local"
echo "   - 修改配置: 重新运行此脚本或直接编辑 .env.local"
echo "   - 删除配置: rm .env.local"
echo ""

