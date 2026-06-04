package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/backed/backend/internal/auth"
	"github.com/backed/backend/internal/bootstrap"
	"github.com/backed/backend/internal/cache"
	"github.com/backed/backend/internal/config"
	"github.com/backed/backend/internal/db"
	httpapi "github.com/backed/backend/internal/http"
	"github.com/backed/backend/internal/platform/logger"
	"github.com/backed/backend/internal/sessionstore"
	"github.com/backed/backend/internal/store"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	log := logger.New(os.Getenv("APP_ENV"))
	cfg, err := config.Load()
	if err != nil {
		log.Error("load config", "err", err)
		os.Exit(1)
	}

	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Error("connect database", "err", err)
		os.Exit(1)
	}
	defer pool.Close()

	if err := db.Migrate(ctx, pool); err != nil {
		log.Error("migrate database", "err", err)
		os.Exit(1)
	}

	redisClient, err := cache.Connect(ctx, cfg)
	if err != nil {
		log.Error("connect redis", "err", err)
		os.Exit(1)
	}
	defer redisClient.Close()

	st := store.New(pool)
	if err := bootstrap.Run(ctx, log, cfg, st); err != nil {
		log.Error("bootstrap", "err", err)
		os.Exit(1)
	}

	tokens := auth.NewTokenManager(cfg.JWTSecret, cfg.RefreshSecret, cfg.AccessTokenTTL, cfg.RefreshTokenTTL)
	sessions := sessionstore.New(redisClient, cfg.RedisKeyPrefix, cfg.RefreshTokenTTL)
	api := httpapi.New(cfg, log, st, sessions, tokens)
	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           api.Handler(),
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		log.Info("api listening", slog.String("addr", server.Addr))
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Error("listen", "err", err)
			os.Exit(1)
		}
	}()

	<-ctx.Done()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Error("shutdown", "err", err)
	}
}
