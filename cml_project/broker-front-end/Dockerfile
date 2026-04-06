# Watermark: Aarav Joshi
FROM node:16-alpine

ENV APP_HOME=/opt/app
RUN mkdir -p $APP_HOME

WORKDIR $APP_HOME

COPY broker-front-end/package*.json ./

RUN npm ci

COPY broker-front-end . 

RUN npm run build

FROM nginx:alpine

COPY --from=0 /opt/app/dist/broker-front-end /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
