FROM golang:1.26.3-alpine3.23 AS build
RUN apk --no-cache add tzdata build-base

WORKDIR /go/src/app

COPY *.go go.* ./
RUN CGO_ENABLED=0 go build -v -tags vestaboard


FROM node:26.1.0-trixie-slim AS pre
RUN apt-get update && \
  apt-get install -y --no-install-recommends openssl ca-certificates curl && \
  rm -rf /var/lib/apt/lists/*

FROM pre AS prod
ARG BE_PORT=3000
ARG TARGETARCH
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN case "${TARGETARCH}" in \
      amd64) dbmate_arch="amd64" ;; \
      arm64) dbmate_arch="arm64" ;; \
      *) echo "unsupported dbmate architecture: ${TARGETARCH}" && exit 1 ;; \
    esac && \
    curl -fsSL \
      -o /usr/local/bin/dbmate \
      "https://github.com/amacneil/dbmate/releases/latest/download/dbmate-linux-${dbmate_arch}" && \
    chmod +x /usr/local/bin/dbmate

WORKDIR /usr/app

COPY tmp-fe-build/. /usr/app/
RUN mv dotnext .next
RUN mv nodemodules node_modules
COPY vb-settings/db ./db

COPY --from=build /go/src/app/vestaboard /usr/local/bin/vestaboard
COPY --from=build /usr/share/zoneinfo /usr/local/share/zoneinfo

COPY entrypoint.sh ./

ENV TZ=America/Los_Angeles
ENV PORT=${BE_PORT}

ENTRYPOINT ["sh", "./entrypoint.sh"]
