FROM golang:1.16-alpine AS build
RUN apk --no-cache add tzdata

WORKDIR /go/src/app

COPY *.go go.* ./
RUN go install -v -tags vestaboard

FROM alpine:latest AS prod

COPY --from=build /go/bin/vestaboard /bin/vestaboard
COPY --from=build /usr/share/zoneinfo /usr/share/zoneinfo
ENV TZ=America/Los_Angeles

ENTRYPOINT ["vestaboard"]