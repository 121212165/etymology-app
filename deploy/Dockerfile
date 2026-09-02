# etymology-app 生产镜像：构建与运行同容器（服务器 4C3.6G 可承受一次构建）
# npm 用腾讯内网镜像源，国内服务器拉依赖快且稳
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
# 锁文件里的 npmmirror 直链存在同步缺口（特定版本 404），统一重写回官方源
RUN sed -i 's#https://registry.npmmirror.com#https://registry.npmjs.org#g' package-lock.json \
 && npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["npm", "start"]
