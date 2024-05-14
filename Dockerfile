FROM golang:1.19-alpine AS build
RUN apk --no-cache add tzdata build-base

WORKDIR /go/src/app

COPY *.go go.* ./
RUN CGO_ENABLED=0 go build -v -tags vestaboard


FROM node:20-bullseye-slim AS pre
RUN apt-get update && \
  apt-get upgrade -y && \
  apt-get install -y openssl ca-certificates

FROM pre AS prod
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

WORKDIR /usr/app

COPY tmp-fe-build/. /usr/app/
RUN mv dotnext .next
RUN mv nodemodules node_modules

COPY --from=build /go/src/app/vestaboard /usr/local/bin/vestaboard
COPY --from=build /usr/share/zoneinfo /usr/local/share/zoneinfo

COPY entrypoint.sh ./

ENV TZ=America/Los_Angeles
ENV PORT=$BE_PORT

ENTRYPOINT ["sh", "./entrypoint.sh"]
