FROM node:24.1-alpine AS builder

RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    pango-dev \
    libjpeg-turbo-dev \
    giflib-dev \
    pixman-dev

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build


FROM node:24.1-alpine

RUN apk add --no-cache \
    cairo \
    pango \
    libjpeg-turbo \
    giflib \
    pixman

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

CMD ["npm", "start"]
