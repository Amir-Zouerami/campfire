package app

import (
	"net/http"

	"github.com/amir-zouerami/campfire/server/api"
	"github.com/amir-zouerami/campfire/server/logger"
	"github.com/amir-zouerami/campfire/server/mattermost"
	"github.com/amir-zouerami/campfire/server/service"
	"github.com/amir-zouerami/campfire/server/store"
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
	Router           http.Handler
	Logger           logger.Logger
	Mattermost       mattermost.Client
	WorkspaceService *service.WorkspaceService
}

/*
New constructs the Campfire application dependency graph.

This is intentionally small until the SQL runtime connection strategy is
selected. The service/store boundaries are already real.
*/
func New(config Config) (*App, error) {
	appLogger := logger.NewMattermostLogger(config.API)
	mattermostClient := mattermost.NewPluginClient(config.API)
	workspaceStore := store.NewUnavailableWorkspaceStore()
	workspaceService := service.NewWorkspaceService(workspaceStore)

	router := api.NewRouter(api.RouterConfig{
		Logger:           appLogger,
		Mattermost:       mattermostClient,
		WorkspaceService: workspaceService,
	})

	return &App{
		Router:           router,
		Logger:           appLogger,
		Mattermost:       mattermostClient,
		WorkspaceService: workspaceService,
	}, nil
}

/*
Shutdown releases resources owned by the application container.

This is a no-op in Phase 0 and will stop scheduler/database resources later.
*/
func (a *App) Shutdown() {
	a.Logger.Info("Campfire application shutdown")
}
