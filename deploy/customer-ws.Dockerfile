FROM golang:1.22 AS build
WORKDIR /src
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/customer-ws ./cmd/customer-ws

FROM alpine:3.20
WORKDIR /app
COPY --from=build /out/customer-ws /app/customer-ws
COPY configs /app/configs
EXPOSE 8081
CMD ["/app/customer-ws"]
