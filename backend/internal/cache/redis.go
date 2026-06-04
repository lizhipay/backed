package cache

import (
	"context"

	"github.com/backed/backend/internal/config"
	"github.com/redis/go-redis/v9"
)

// Connect opens a Redis client and verifies it with PING.
func Connect(ctx context.Context, cfg *config.Config) (*redis.Client, error) {
	client := redis.NewClient(&redis.Options{
		Addr:     cfg.RedisAddr,
		Password: cfg.RedisPassword,
		DB:       cfg.RedisDB,
	})
	if err := client.Ping(ctx).Err(); err != nil {
		_ = client.Close()
		return nil, err
	}
	return client, nil
}
