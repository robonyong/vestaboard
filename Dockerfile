FROM golang:1.26.3-alpine3.23 AS go-build
RUN apk --no-cache add tzdata build-base

WORKDIR /go/src/app

COPY *.go go.* ./
RUN CGO_ENABLED=0 go build -v -tags vestaboard


FROM --platform=$BUILDPLATFORM node:26.1.0-trixie-slim AS fe-build
WORKDIR /usr/src/app/vb-settings
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm install -g pnpm@11.1.0

COPY vb-settings/package.json vb-settings/pnpm-lock.yaml vb-settings/pnpm-workspace.yaml vb-settings/.npmrc ./
COPY vb-settings/prisma ./prisma
COPY vb-settings/prisma.config.ts ./
RUN pnpm install --frozen-lockfile

COPY vb-settings/components ./components
COPY vb-settings/lib ./lib
COPY vb-settings/pages ./pages
COPY vb-settings/providers ./providers
COPY vb-settings/public ./public
COPY vb-settings/styles ./styles
COPY vb-settings/next-env.d.ts vb-settings/next.config.js vb-settings/tsconfig.json ./
RUN pnpm run prisma:gen && pnpm run build


FROM node:26.1.0-trixie-slim AS prod
ARG BE_PORT=3000
ARG TARGETARCH
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN apt-get update && \
  apt-get install -y --no-install-recommends openssl ca-certificates curl && \
  rm -rf /var/lib/apt/lists/*

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

COPY --from=fe-build /usr/src/app/vb-settings/.next/standalone ./
COPY --from=fe-build /usr/src/app/vb-settings/.next/static ./.next/static
COPY --from=fe-build /usr/src/app/vb-settings/public ./public
COPY vb-settings/db ./db

COPY --from=go-build /go/src/app/vestaboard /usr/local/bin/vestaboard
COPY --from=go-build /usr/share/zoneinfo /usr/local/share/zoneinfo

COPY entrypoint.sh ./

ENV TZ=America/Los_Angeles
ENV PORT=${BE_PORT}

ENTRYPOINT ["sh", "./entrypoint.sh"]
