FROM golang:1.22 AS build
WORKDIR /src
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/customer-api ./cmd/customer-api

FROM alpine:3.20
WORKDIR /app
COPY --from=build /out/customer-api /app/customer-api
COPY configs /app/configs
EXPOSE 8080
CMD ["/app/customer-api"]
