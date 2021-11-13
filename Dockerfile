FROM node:12 as dep
ENV NODE_ENV production

COPY . /app
WORKDIR /app/client

RUN yarn install --frozen-lockfile --production=false
RUN yarn build
RUN cp -r /app/client/build /app/server/src/dist

WORKDIR /app/server

RUN yarn install --frozen-lockfile --production=false

CMD [ "yarn", "start:prod" ]