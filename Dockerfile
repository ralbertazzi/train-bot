FROM node:12

COPY package.json yarn.lock ./
RUN yarn --pure-lockfile

COPY src src
COPY index.js ./

CMD ["npm", "start"]
