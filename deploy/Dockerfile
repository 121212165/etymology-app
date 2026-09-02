# etymology-app 生产镜像：构建与运行同容器（服务器 4C3.6G 可承受一次构建）
# 用 slim（glibc）而非 alpine：better-sqlite3 官方预编译产物只发 glibc，免编译直用
FROM node:20-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
# 锁文件里的 npmmirror 直链存在同步缺口（特定版本 404），统一重写回官方源
RUN sed -i 's#https://registry.npmmirror.com#https://registry.npmjs.org#g' package-lock.json \
 && npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
# SQLite 数据目录（compose 卷挂到 /data）
RUN mkdir -p /data
ENV DB_PATH=/data/etymology.db
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["npm", "start"]
