# Watermark: Aarav Joshi
FROM node:16-alpine

ENV APP_HOME=/opt/app
RUN mkdir -p $APP_HOME

WORKDIR $APP_HOME

COPY exchange-front-end/package*.json ./

RUN npm ci

COPY exchange-front-end . 

RUN npm run build

FROM nginx:alpine

COPY --from=0 /opt/app/dist/exchange-front-end /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
