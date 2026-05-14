package app

import (
	"net/http"

	"github.com/amir-zouerami/campfire/server/api"
	"github.com/amir-zouerami/campfire/server/logger"
	"github.com/amir-zouerami/campfire/server/mattermost"
	"github.com/mattermost/mattermost/server/public/plugin"
)

/*
Config contains external dependencies provided by the Mattermost plugin runtime.
*/
type Config struct {
	API plugin.API
}

/*
App is the Campfire application container.

It wires infrastructure, services, stores, and routes while keeping business
logic out of the Mattermost plugin lifecycle layer.
*/
type App struct {
	Router     http.Handler
	Logger     logger.Logger
	Mattermost mattermost.Client
}

/*
New constructs the Campfire application dependency graph.

This is intentionally small in Phase 0. Future phases will add:
  - SQL store
  - services
  - scheduler
  - migrations
*/
func New(config Config) (*App, error) {
	appLogger := logger.NewMattermostLogger(config.API)
	mattermostClient := mattermost.NewPluginClient(config.API)

	router := api.NewRouter(api.RouterConfig{
		Logger:     appLogger,
		Mattermost: mattermostClient,
	})

	return &App{
		Router:     router,
		Logger:     appLogger,
		Mattermost: mattermostClient,
	}, nil
}

/*
Shutdown releases resources owned by the application container.

This is a no-op in Phase 0 and will stop scheduler/database resources later.
*/
func (a *App) Shutdown() {
	a.Logger.Info("Campfire application shutdown")
}
