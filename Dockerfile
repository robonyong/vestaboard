FROM golang:1.19-alpine AS build
RUN apk --no-cache add tzdata build-base

WORKDIR /go/src/app

COPY *.go go.* ./
RUN CGO_ENABLED=0 go build -v -tags vestaboard

FROM node:16-bullseye-slim AS fe-build
ENV NEXT_TELEMETRY_DISABLED 1
RUN apt-get update && \
  apt-get upgrade -y && \
  apt-get install -y build-essential openssl

WORKDIR /usr/app

COPY ./vb-settings/package* ./vb-settings/.npmrc ./
RUN npm ci

COPY ./vb-settings/ .

RUN npm run prisma:gen
RUN npm run build

FROM node:16-bullseye-slim AS prod
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
RUN apt-get update && \
  apt-get upgrade -y && \
  apt-get install -y build-essential openssl ca-certificates

WORKDIR /usr/app

COPY --from=build /go/src/app/vestaboard /usr/local/bin/vestaboard
COPY --from=build /usr/share/zoneinfo /usr/local/share/zoneinfo
COPY --from=fe-build /usr/app/public ./public
COPY --from=fe-build /usr/app/.next/standalone ./
COPY --from=fe-build /usr/app/.next/static ./.next/static

COPY entrypoint.sh ./

ENV TZ=America/Los_Angeles
ENV PORT=$BE_PORT

ENTRYPOINT ["sh", "./entrypoint.sh"]
