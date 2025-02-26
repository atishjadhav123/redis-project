import Redis from "ioredis"

const redisClient = new Redis({
    host: "127.0.0.1",
    port: 6379,
    retryStrategy: (times) => Math.min(1000 * Math.pow(2, times), 3600000),
    maxRetriesPerRequest: null,
})

redisClient.on("connect", () => console.log("Connected to Redis"))
redisClient.on("error", (err) => console.error("Redis connection error:", err))

export { redisClient }
