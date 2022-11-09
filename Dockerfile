FROM golang:1.19-alpine AS build
RUN apk --no-cache add tzdata build-base

WORKDIR /go/src/app

COPY *.go go.* ./
RUN go build -v -tags vestaboard

FROM node:16-alpine AS fe-build
WORKDIR /usr/app
COPY ./vb-settings/package* ./vb-settings/.npmrc ./

RUN npm ci

COPY ./vb-settings/ .
RUN npm run prisma:gen
RUN npm run build

FROM node:16-alpine AS prod
ENV NODE_ENV production

WORKDIR /usr/app
COPY ./vb-settings/package* ./vb-settings/.npmrc ./

RUN npm ci

COPY --from=build /go/src/app/vestaboard /bin/vestaboard
COPY --from=build /usr/share/zoneinfo /usr/share/zoneinfo
COPY --from=fe-build /usr/app/public ./public
COPY --from=fe-build /usr/app/node_modules/.prisma/ ./node_modules/.prisma/
COPY --from=fe-build /usr/app/.next/ ./.next/

COPY entrypoint.sh ./

ENV TZ=America/Los_Angeles
ENV PORT=$BE_PORT

ENTRYPOINT ["sh", "./entrypoint.sh"]
