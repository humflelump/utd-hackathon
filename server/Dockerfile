FROM eogdtr.eogresources.com/uni-fac/eognode:12-slim

WORKDIR /server

COPY . /server
RUN yarn install

CMD [ "yarn", "start:prod" ]