#!/bin/bash

# Check OpenAI Configuration
# 检查 OpenAI 配置状态

echo "============================================"
echo "🔍 OpenAI 配置检查"
echo "============================================"
echo ""

# Check .env.local
if [ -f ".env.local" ]; then
    echo "✅ 找到 .env.local 文件"
    echo ""
    echo "配置内容："
    echo "---"
    
    # Read and mask API key
    while IFS= read -r line; do
        if [[ $line =~ ^OPENAI_API_KEY=(.+)$ ]]; then
            key="${BASH_REMATCH[1]}"
            echo "OPENAI_API_KEY=${key:0:10}...${key: -4} (已隐藏)"
        elif [[ $line =~ ^# ]] || [[ -z $line ]]; then
            # Skip comments and empty lines
            :
        else
            echo "$line"
        fi
    done < .env.local
    
    echo "---"
    echo ""
    echo "📍 文件位置: $(pwd)/.env.local"
else
    echo "❌ 未找到 .env.local 文件"
    echo ""
    echo "💡 快速配置："
    echo "   ./scripts/setup-openai.sh"
fi

echo ""
echo "🌐 浏览器配置（localStorage）："

# Check if there's a running dev server
if lsof -i:3000 > /dev/null 2>&1; then
    echo "✅ 开发服务器正在运行 (http://localhost:3000)"
    echo ""
    echo "检查浏览器 localStorage："
    echo "   1. 打开浏览器开发者工具 (F12)"
    echo "   2. 切换到 Console 标签"
    echo "   3. 输入: localStorage.getItem('web-reel-openai-config')"
    echo "   4. 查看配置内容"
else
    echo "⚠️  开发服务器未运行"
    echo "   启动命令: npm run dev"
fi

echo ""
echo "============================================"
echo "📝 配置优先级："
echo "   1. localStorage（浏览器运行时配置）"
echo "   2. .env.local（环境变量配置）"
echo ""
echo "如果两者都配置，localStorage 会覆盖 .env.local"
echo "============================================"
echo ""

