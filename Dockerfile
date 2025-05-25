FROM node:18-alpine

# Install ffmpeg
RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm install

COPY . .

RUN mkdir outputs uploads

EXPOSE 3000

CMD ["npm", "start"]
